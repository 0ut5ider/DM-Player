const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure projects directory exists
if (!fs.existsSync('./projects')) {
  fs.mkdirSync('./projects', { recursive: true });
}

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const sql = `
    SELECT u.id, u.username, u.email 
    FROM users u 
    JOIN sessions s ON u.id = s.user_id 
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `;
  
  db.get(sql, [sessionId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error', details: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.user = user;
    next();
  });
};

// Project ownership middleware
const checkProjectOwnership = (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user.id;
  
  const sql = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(sql, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking project ownership', details: err.message });
    }
    if (!project) {
      return res.status(403).json({ error: 'Project not found or access denied' });
    }
    next();
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.params.projectId;
    const audioDir = path.join(__dirname, 'projects', projectId, 'audio');
    
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    cb(null, audioDir);
  },
  filename: function (req, file, cb) {
    const fileId = uuidv4();
    // Always save MP3 files with .mp3 extension for consistency
    cb(null, `${fileId}.mp3`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'audio/mpeg') {
      return cb(new Error('Only MP3 files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Authentication Routes

// Register new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const createdAt = new Date().toISOString();
    
    const sql = 'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [userId, username, email, passwordHash, createdAt], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user', details: err.message });
      }
      
      res.status(201).json({ 
        id: userId, 
        username, 
        email, 
        created_at: createdAt 
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to hash password', details: err.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.get(sql, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Login error', details: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Create session
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      
      const sessionSql = 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)';
      db.run(sessionSql, [sessionId, user.id, expiresAt], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create session', details: err.message });
        }
        
        res.json({
          sessionId,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      });
    } catch (err) {
      res.status(500).json({ error: 'Password verification error', details: err.message });
    }
  });
});

// Logout user
app.post('/api/auth/logout', authenticateUser, (req, res) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  const sql = 'DELETE FROM sessions WHERE id = ?';
  db.run(sql, [sessionId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Logout error', details: err.message });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.json(req.user);
});

// User Project Management Routes (Authenticated)

// Get user's own projects
app.get('/api/my/projects', authenticateUser, (req, res) => {
  const sql = 'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC';
  db.all(sql, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve projects', details: err.message });
    }
    res.json(rows);
  });
});

// Create new project
app.post('/api/my/projects', authenticateUser, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const newProject = {
    id: uuidv4(),
    name,
    user_id: req.user.id,
    status: 'draft',
    created_at: new Date().toISOString(),
    published_at: null
  };

  const sql = 'INSERT INTO projects (id, name, user_id, status, created_at, published_at) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(sql, [newProject.id, newProject.name, newProject.user_id, newProject.status, newProject.created_at, newProject.published_at], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create project', details: err.message });
    }
    
    // Create project directory
    const projectDir = path.join(__dirname, 'projects', newProject.id);
    fs.mkdirSync(projectDir, { recursive: true });

    res.status(201).json(newProject);
  });
});

// Get user's own project details
app.get('/api/my/projects/:projectId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId } = req.params;
  const projectSql = 'SELECT * FROM projects WHERE id = ?';
  const tracksSql = 'SELECT * FROM tracks WHERE project_id = ?';
  const cuesSql = 'SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC';

  db.get(projectSql, [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve project', details: err.message });
    }

    db.all(tracksSql, [projectId], (err, tracks) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve tracks', details: err.message });
      }
      
      db.all(cuesSql, [projectId], (err, cuePoints) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve cue points', details: err.message });
        }
        
        res.json({ ...project, tracks: tracks || [], cuePoints: cuePoints || [] });
      });
    });
  });
});

// Update user's own project
app.put('/api/my/projects/:projectId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId } = req.params;
  const { name, status } = req.body;

  if (!name && !status) {
    return res.status(400).json({ error: 'Project name or status is required' });
  }

  let sql = 'UPDATE projects SET ';
  let params = [];
  let updates = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (status) {
    if (status !== 'draft' && status !== 'published') {
      return res.status(400).json({ error: 'Status must be either "draft" or "published"' });
    }
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'published') {
      updates.push('published_at = ?');
      params.push(new Date().toISOString());
    } else {
      updates.push('published_at = ?');
      params.push(null);
    }
  }

  sql += updates.join(', ') + ' WHERE id = ?';
  params.push(projectId);

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update project', details: err.message });
    }
    
    // Fetch updated project
    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve updated project', details: err.message });
      }
      res.json(row);
    });
  });
});

// Delete user's own project
app.delete('/api/my/projects/:projectId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId } = req.params;
  
  db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding project', details: err.message });
    }

    const sql = 'DELETE FROM projects WHERE id = ?';
    db.run(sql, [projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete project', details: err.message });
      }

      // Delete project directory
      const projectDir = path.join(__dirname, 'projects', projectId);
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
      
      res.json(project);
    });
  });
});

// Upload tracks to user's own project
app.post('/api/my/projects/:projectId/tracks', authenticateUser, checkProjectOwnership, upload.array('tracks'), async (req, res) => {
  const { projectId } = req.params;
  const uploadedTracks = [];
  const insertSql = 'INSERT INTO tracks (id, project_id, original_name, path, duration) VALUES (?, ?, ?, ?, ?)';

  for (const file of req.files) {
    try {
      const { parseFile } = await import('music-metadata');
      const metadata = await parseFile(file.path);
      const duration = metadata.format.duration || 0;
      const trackId = path.parse(file.filename).name;

      const track = {
        id: trackId,
        project_id: projectId,
        original_name: file.originalname,
        path: `audio/${file.filename}`,
        duration
      };
      
      await new Promise((resolve, reject) => {
        db.run(insertSql, [track.id, track.project_id, track.original_name, track.path, track.duration], function(err) {
          if (err) {
            reject(err);
          } else {
            uploadedTracks.push(track);
            resolve();
          }
        });
      });
    } catch (err) {
      console.error(`Error processing file ${file.originalname}:`, err);
    }
  }
  
  res.status(201).json(uploadedTracks);
});

// Delete track from user's own project
app.delete('/api/my/projects/:projectId/tracks/:trackId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId, trackId } = req.params;
  
  const selectSql = 'SELECT * FROM tracks WHERE id = ? AND project_id = ?';
  db.get(selectSql, [trackId, projectId], (err, track) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding track', details: err.message });
    }
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const deleteSql = 'DELETE FROM tracks WHERE id = ? AND project_id = ?';
    db.run(deleteSql, [trackId, projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete track', details: err.message });
      }

      // Delete track file
      const trackPath = path.join(__dirname, 'projects', projectId, track.path);
      if (fs.existsSync(trackPath)) {
        fs.unlinkSync(trackPath);
      }
      
      res.json(track);
    });
  });
});

// Cue point management for user's own projects
app.get('/api/my/projects/:projectId/cues', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId } = req.params;
  const sql = 'SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC';

  db.all(sql, [projectId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve cue points', details: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/my/projects/:projectId/cues', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null) {
    return res.status(400).json({ error: 'Cue point time is required' });
  }

  const newCuePoint = {
    id: uuidv4(),
    project_id: projectId,
    time: parseFloat(time)
  };

  const sql = 'INSERT INTO cue_points (id, project_id, time) VALUES (?, ?, ?)';
  db.run(sql, [newCuePoint.id, newCuePoint.project_id, newCuePoint.time], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create cue point', details: err.message });
    }
    
    db.all('SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC', [projectId], (err, allCues) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve sorted cue points', details: err.message });
      }
      
      const createdCue = allCues.find(c => c.id === newCuePoint.id);
      res.status(201).json(createdCue);
    });
  });
});

app.put('/api/my/projects/:projectId/cues/:cueId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId, cueId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null) {
    return res.status(400).json({ error: 'Cue point time is required' });
  }

  const sql = 'UPDATE cue_points SET time = ? WHERE id = ? AND project_id = ?';
  db.run(sql, [parseFloat(time), cueId, projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update cue point', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    db.all('SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC', [projectId], (err, allCues) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve sorted cue points', details: err.message });
      }
      
      const updatedCue = allCues.find(c => c.id === cueId);
      res.json(updatedCue);
    });
  });
});

app.delete('/api/my/projects/:projectId/cues/:cueId', authenticateUser, checkProjectOwnership, (req, res) => {
  const { projectId, cueId } = req.params;
  
  const selectSql = 'SELECT * FROM cue_points WHERE id = ? AND project_id = ?';
  db.get(selectSql, [cueId, projectId], (err, cue) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding cue point', details: err.message });
    }
    if (!cue) {
      return res.status(404).json({ error: 'Cue point not found' });
    }

    const deleteSql = 'DELETE FROM cue_points WHERE id = ? AND project_id = ?';
    db.run(deleteSql, [cueId, projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete cue point', details: err.message });
      }
      
      res.json(cue);
    });
  });
});

// Public Library Routes (No Authentication Required)

// Get all published projects grouped by user
app.get('/api/public/projects', (req, res) => {
  const sql = `
    SELECT p.*, u.username 
    FROM projects p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.status = 'published' 
    ORDER BY u.username, p.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve public projects', details: err.message });
    }
    
    // Group projects by username
    const groupedProjects = rows.reduce((acc, project) => {
      if (!acc[project.username]) {
        acc[project.username] = [];
      }
      acc[project.username].push(project);
      return acc;
    }, {});
    
    res.json(groupedProjects);
  });
});

// Get all users who have published projects
app.get('/api/public/users', (req, res) => {
  const sql = `
    SELECT DISTINCT u.id, u.username, u.created_at 
    FROM users u 
    JOIN projects p ON u.id = p.user_id 
    WHERE p.status = 'published' 
    ORDER BY u.username
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve users', details: err.message });
    }
    res.json(rows);
  });
});

// Get published projects by username
app.get('/api/public/users/:username/projects', (req, res) => {
  const { username } = req.params;
  
  const sql = `
    SELECT p.*, u.username 
    FROM projects p 
    JOIN users u ON p.user_id = u.id 
    WHERE u.username = ? AND p.status = 'published' 
    ORDER BY p.created_at DESC
  `;
  
  db.all(sql, [username], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve user projects', details: err.message });
    }
    res.json(rows);
  });
});

// Get published project details
app.get('/api/public/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  
  const projectSql = `
    SELECT p.*, u.username 
    FROM projects p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.id = ? AND p.status = 'published'
  `;
  
  db.get(projectSql, [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve project', details: err.message });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found or not published' });
    }

    const tracksSql = 'SELECT * FROM tracks WHERE project_id = ?';
    const cuesSql = 'SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC';

    db.all(tracksSql, [projectId], (err, tracks) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve tracks', details: err.message });
      }
      
      db.all(cuesSql, [projectId], (err, cuePoints) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve cue points', details: err.message });
        }
        
        res.json({ ...project, tracks: tracks || [], cuePoints: cuePoints || [] });
      });
    });
  });
});

// Get cue points for published project
app.get('/api/public/projects/:projectId/cues', (req, res) => {
  const { projectId } = req.params;
  
  // First check if project is published
  const checkSql = 'SELECT id FROM projects WHERE id = ? AND status = "published"';
  db.get(checkSql, [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking project', details: err.message });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found or not published' });
    }

    const sql = 'SELECT * FROM cue_points WHERE project_id = ? ORDER BY time ASC';
    db.all(sql, [projectId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve cue points', details: err.message });
      }
      res.json(rows);
    });
  });
});

// Serve audio files (with access control)
app.get('/projects/:projectId/audio/:trackId', (req, res) => {
  try {
    const { projectId, trackId } = req.params;
    // Ensure the trackId has .mp3 extension if it doesn't already
    const filename = trackId.endsWith('.mp3') ? trackId : `${trackId}.mp3`;
    const audioPath = path.join(__dirname, 'projects', projectId, 'audio', filename);
    
    console.log(`Audio request: ${audioPath}`);
    
    if (!fs.existsSync(audioPath)) {
      console.log(`Audio file not found: ${audioPath}`);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Function to serve the audio file with proper headers
    const serveAudioFile = () => {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      console.log(`Serving audio file: ${audioPath}`);
      res.sendFile(audioPath);
    };

    // Check if project is published OR user owns the project
    // Try to get session from header first, then from query parameter
    const sessionId = req.headers.authorization?.replace('Bearer ', '') || req.query.session;
    
    if (sessionId) {
      // User is logged in, check ownership first
      const userSql = `
        SELECT u.id 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.id = ? AND s.expires_at > datetime('now')
      `;
      
      db.get(userSql, [sessionId], (err, user) => {
        if (err) {
          console.error('Error checking user session:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          console.log('Invalid or expired session');
          // No valid session, check if project is published
          const publicSql = 'SELECT id FROM projects WHERE id = ? AND status = "published"';
          db.get(publicSql, [projectId], (err, publicProject) => {
            if (err) {
              console.error('Error checking public status:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            if (!publicProject) {
              console.log(`Access denied - project ${projectId} not public and no valid session`);
              return res.status(403).json({ error: 'Access denied' });
            }
            console.log(`Access granted - project ${projectId} is public (invalid session)`);
            serveAudioFile();
          });
          return;
        }
        
        // Valid user session, check if they own the project
        const ownershipSql = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
        db.get(ownershipSql, [projectId, user.id], (err, ownedProject) => {
          if (err) {
            console.error('Error checking ownership:', err);
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (ownedProject) {
            // User owns the project, allow access regardless of status
            console.log(`Access granted - user ${user.id} owns project ${projectId}`);
            return serveAudioFile();
          }
          
          // User doesn't own the project, check if it's published
          const publicSql = 'SELECT id FROM projects WHERE id = ? AND status = "published"';
          db.get(publicSql, [projectId], (err, publicProject) => {
            if (err) {
              console.error('Error checking public status:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            if (!publicProject) {
              console.log(`Access denied - project ${projectId} not public and not owned by user ${user.id}`);
              return res.status(403).json({ error: 'Access denied' });
            }
            console.log(`Access granted - project ${projectId} is public`);
            serveAudioFile();
          });
        });
      });
    } else {
      // No session, only allow if project is published
      const publicSql = 'SELECT id FROM projects WHERE id = ? AND status = "published"';
      db.get(publicSql, [projectId], (err, publicProject) => {
        if (err) {
          console.error('Error checking public status:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        if (!publicProject) {
          console.log(`Access denied - project ${projectId} not public and no session`);
          return res.status(403).json({ error: 'Access denied' });
        }
        console.log(`Access granted - project ${projectId} is public (no session)`);
        serveAudioFile();
      });
    }
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
