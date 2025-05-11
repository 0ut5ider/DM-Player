const express = require('express');
const multer = require('multer');
const fs = require('fs'); // Still needed for file system operations (audio files, project dirs)
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./database'); // Import the database connection
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  store: new SQLiteStore({
    db: 'dm_player.sqlite', // Use the same database file
    dir: __dirname, // Location of the database file
    table: 'sessions' // Name of the sessions table
  }),
  secret: process.env.SESSION_SECRET || 'your_very_secret_key_12345', // Replace with a strong secret, ideally from env
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true in production for HTTPS
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: You must be logged in.' });
  }
};

const isProjectOwner = (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  if (!userId) { // Should be caught by isAuthenticated first, but good for direct use
    return res.status(401).json({ error: 'Unauthorized: You must be logged in.' });
  }

  db.get("SELECT userId FROM projects WHERE id = ?", [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking project ownership', details: err.message });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    if (project.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not the owner of this project.' });
    }
    next();
  });
};

// Ensure projects directory exists (still needed for storing project-specific audio folders)
if (!fs.existsSync('./projects')) {
  fs.mkdirSync('./projects', { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.params.projectId; // projectId should be available from isProjectOwner
    const audioDir = path.join(__dirname, 'projects', projectId, 'audio');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(audioDir)){
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    cb(null, audioDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename using UUID
    const fileId = uuidv4();
    cb(null, `${fileId}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only mp3 files
    if (file.mimetype !== 'audio/mpeg') {
      return cb(new Error('Only MP3 files are allowed!'), false);
    }
    cb(null, true);
  }
});


// API Routes

// --- Authentication Routes ---

// Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { artistName, email, password, description } = req.body;

  if (!artistName || !email || !password) {
    return res.status(400).json({ error: 'Artist name, email, and password are required.' });
  }

  // Basic email validation
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
  }

  // Basic password length
  if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT email FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const insertSql = `INSERT INTO users (id, artistName, email, passwordHash, description, createdAt, updatedAt) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
      db.run(insertSql, [userId, artistName, email, passwordHash, description || null, now, now], function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });

    // Automatically log in user after registration
    req.session.userId = userId;
    req.session.artistName = artistName; // Store for convenience

    res.status(201).json({ 
      message: 'User registered successfully.',
      user: { id: userId, artistName, email } 
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: 'Server error during registration.', details: err.message });
  }
});

// Login an existing user
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' }); // User not found
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' }); // Password incorrect
    }

    req.session.userId = user.id;
    req.session.artistName = user.artistName;

    res.json({ 
      message: 'Login successful.',
      user: { id: user.id, artistName: user.artistName, email: user.email }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Server error during login.', details: err.message });
  }
});

// Logout a user
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout.' });
    }
    res.clearCookie('connect.sid'); // Default cookie name for express-session
    res.json({ message: 'Logout successful.' });
  });
});

// Get authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        artistName: req.session.artistName,
        // You might want to fetch email from DB if needed, or store it in session too
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// --- End Authentication Routes ---


// --- Gallery Route ---

// Get all projects for the public gallery
app.get('/api/gallery/projects', async (req, res) => {
  try {
    // Select project details and join with users table to get artistName
    const projectsSql = `
      SELECT p.id, p.name, p.createdAt, p.updatedAt, u.artistName as ownerArtistName, p.userId
      FROM projects p
      JOIN users u ON p.userId = u.id
      ORDER BY p.updatedAt DESC
    `;
    const projects = await new Promise((resolve, reject) => {
      db.all(projectsSql, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    // For each project, fetch its tracks
    const projectsWithTracks = await Promise.all(projects.map(async (project) => {
      const tracksSql = "SELECT id, originalName, path, duration FROM tracks WHERE projectId = ?";
      const tracks = await new Promise((resolve, reject) => {
        db.all(tracksSql, [project.id], (err, trackRows) => {
          if (err) reject(err);
          resolve(trackRows || []);
        });
      });
      // We might also need cue points if the gallery player uses them directly
      const cuesSql = "SELECT id, time FROM cue_points WHERE projectId = ? ORDER BY time ASC";
      const cuePoints = await new Promise((resolve, reject) => {
          db.all(cuesSql, [project.id], (err, cueRows) => {
              if(err) reject(err);
              resolve(cueRows || []);
          });
      });
      return { ...project, tracks, cuePoints };
    }));

    res.json(projectsWithTracks);
  } catch (err) {
    console.error("Gallery projects error:", err);
    res.status(500).json({ error: 'Failed to retrieve gallery projects', details: err.message });
  }
});

// --- End Gallery Route ---


// --- Project and Related Routes (for authenticated users/owners) ---

// Get all projects for the logged-in user (My Projects)
app.get('/api/projects', isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  db.all("SELECT * FROM projects WHERE userId = ? ORDER BY updatedAt DESC", [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to retrieve your projects', details: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create a new project
app.post('/api/projects', isAuthenticated, (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const now = new Date().toISOString();
  const newProject = {
    id: uuidv4(),
    userId,
    name,
    createdAt: now,
    updatedAt: now
  };

  const sql = `INSERT INTO projects (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [newProject.id, newProject.userId, newProject.name, newProject.createdAt, newProject.updatedAt], function(err) {
    if (err) {
      res.status(500).json({ error: 'Failed to create project', details: err.message });
      return;
    }
    // Create project directory for audio files (project_data.json is no longer needed)
    const projectDir = path.join(__dirname, 'projects', newProject.id);
    fs.mkdirSync(projectDir, { recursive: true }); // Audio subfolder will be created by multer

    res.status(201).json(newProject);
  });
});

// Get a specific project (details including tracks and cues) - For owner
app.get('/api/projects/:projectId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId } = req.params;
  // Project details are already verified by isProjectOwner, but we fetch again to get all fields
  const projectSql = "SELECT * FROM projects WHERE id = ?";
  const tracksSql = "SELECT * FROM tracks WHERE projectId = ?";
  const cuesSql = "SELECT * FROM cue_points WHERE projectId = ? ORDER BY time ASC";

  db.get(projectSql, [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve project details', details: err.message });
    }
    // isProjectOwner should have caught if project is null, but as a safeguard
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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

// Update a project name
app.put('/api/projects/:projectId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const updatedAt = new Date().toISOString();
  const sql = `UPDATE projects SET name = ?, updatedAt = ? WHERE id = ?`;
  db.run(sql, [name, updatedAt, projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update project', details: err.message });
    }
    // isProjectOwner ensures project exists, so this.changes should be 1
    if (this.changes === 0) {
      // This case should ideally not be reached if isProjectOwner works correctly
      return res.status(404).json({ error: 'Project not found or no changes made' });
    }
    // Fetch the updated project to return it
    db.get("SELECT * FROM projects WHERE id = ?", [projectId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve updated project', details: err.message });
        }
        res.json(row);
    });
  });
});

// Delete a project
app.delete('/api/projects/:projectId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId } = req.params;
  
  // isProjectOwner has already verified ownership and existence.
  // We need to fetch the project details to return them, as per original logic.
  db.get("SELECT * FROM projects WHERE id = ?", [projectId], (err, projectToDelete) => {
    if (err) {
      // This might happen if DB connection fails between isProjectOwner and here
      return res.status(500).json({ error: 'Error finding project to delete', details: err.message });
    }
    if (!projectToDelete) {
      // Should be caught by isProjectOwner
      return res.status(404).json({ error: 'Project not found for deletion (safeguard).' });
    }

    const sql = "DELETE FROM projects WHERE id = ?";
    db.run(sql, [projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete project from database', details: err.message });
      }
      if (this.changes === 0) {
        // Should have been caught by the get above, but as a safeguard
        return res.status(404).json({ error: 'Project not found for deletion' });
      }

      // Delete project directory (ON DELETE CASCADE handles tracks and cues in DB)
      const projectDir = path.join(__dirname, 'projects', projectId);
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
      res.json(projectToDelete); // Return the project that was deleted
    });
  });
});

// Upload tracks
app.post('/api/projects/:projectId/tracks', isAuthenticated, isProjectOwner, upload.array('tracks'), async (req, res) => {
  const { projectId } = req.params;
  // isProjectOwner has already verified the project exists and user is the owner.

  const uploadedTracks = [];
  const insertSql = `INSERT INTO tracks (id, projectId, originalName, path, duration) VALUES (?, ?, ?, ?, ?)`;
  const projectUpdateSql = `UPDATE projects SET updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();

  try { // Wrap the main logic in try-catch for better error handling at this level
    for (const file of req.files) {
      try {
        const { parseFile } = await import('music-metadata');
        const metadata = await parseFile(file.path);
        const duration = metadata.format.duration || 0;
        const trackId = path.parse(file.filename).name; // UUID from filename

        const track = {
          id: trackId,
          projectId,
          originalName: file.originalname,
          path: `audio/${file.filename}`, // Relative path within the project's audio folder
          duration
        };
        
        await new Promise((resolve, reject) => {
          db.run(insertSql, [track.id, track.projectId, track.originalName, track.path, track.duration], function(err) {
            if (err) {
              console.error(`Error inserting track ${file.originalname} into DB:`, err);
              reject(err); // Propagate error
            } else {
              uploadedTracks.push(track);
              resolve();
            }
          });
        });
      } catch (err) { // Catch errors from file processing or DB insert for a single file
        console.error(`Error processing file ${file.originalname}:`, err.message);
        // Optionally, delete the file if DB insert fails or metadata fails
        // fs.unlinkSync(file.path); 
        // We might want to inform the client about partial success/failure here
        // For now, we continue processing other files.
      }
    }

    if (uploadedTracks.length > 0) {
      // Update project's updatedAt timestamp only if tracks were successfully added
      await new Promise((resolve, reject) => {
        db.run(projectUpdateSql, [now, projectId], function(err) {
          if (err) {
            console.error(`Error updating project ${projectId} updatedAt timestamp:`, err.message);
            // Don't reject here, as tracks were uploaded. Log and continue.
          }
          resolve();
        });
      });
    }
    res.status(201).json(uploadedTracks);

  } catch (outerErr) { // Catch any unexpected errors in the overall try block
    console.error(`Overall error in track upload for project ${projectId}:`, outerErr.message);
    res.status(500).json({ error: 'Server error during track upload.', details: outerErr.message });
  }
});

// Delete a track
app.delete('/api/projects/:projectId/tracks/:trackId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId, trackId } = req.params;
  // isProjectOwner has verified project and ownership
  const selectSql = "SELECT * FROM tracks WHERE id = ? AND projectId = ?";
  const deleteSql = "DELETE FROM tracks WHERE id = ? AND projectId = ?";
  const projectUpdateSql = `UPDATE projects SET updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();

  db.get(selectSql, [trackId, projectId], (err, track) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding track', details: err.message });
    }
    if (!track) {
      return res.status(404).json({ error: 'Track not found in this project' });
    }

    db.run(deleteSql, [trackId, projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete track from database', details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Track not found for deletion (safeguard)' });
      }

      // Delete track file
      const trackFilePath = path.join(__dirname, 'projects', projectId, track.path);
      if (fs.existsSync(trackFilePath)) {
        fs.unlinkSync(trackFilePath);
      }
      
      // Update project's updatedAt timestamp
      db.run(projectUpdateSql, [now, projectId], (updateErr) => {
        if (updateErr) {
          console.error(`Error updating project ${projectId} updatedAt after track deletion:`, updateErr.message);
          // Don't fail the whole request, track is deleted. Log and respond.
        }
        res.json(track); // Return the track that was deleted
      });
    });
  });
});

// Get all cue points for a project
app.get('/api/projects/:projectId/cues', (req, res) => {
  const { projectId } = req.params;
  const sql = "SELECT * FROM cue_points WHERE projectId = ? ORDER BY time ASC";

  db.all(sql, [projectId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve cue points', details: err.message });
    }
    res.json(rows);
  });
});

// Create a new cue point
app.post('/api/projects/:projectId/cues', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null || isNaN(parseFloat(time))) {
    return res.status(400).json({ error: 'Valid cue point time is required' });
  }
  // isProjectOwner has verified project existence and ownership

  const newCuePoint = {
    id: uuidv4(),
    projectId,
    time: parseFloat(time)
  };

  const insertSql = `INSERT INTO cue_points (id, projectId, time) VALUES (?, ?, ?)`;
  const projectUpdateSql = `UPDATE projects SET updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();

  db.run(insertSql, [newCuePoint.id, newCuePoint.projectId, newCuePoint.time], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create cue point', details: err.message });
    }
    const createdCueId = this.lastID; // SQLite specific way to get ID, but we use UUID

    // Update project's updatedAt timestamp
    db.run(projectUpdateSql, [now, projectId], (updateErr) => {
      if (updateErr) {
        console.error(`Error updating project ${projectId} updatedAt after cue creation:`, updateErr.message);
        // Log error but proceed, cue point is created.
      }
      // Fetch the created cue point to return it (as the original code did for consistency)
      // Although newCuePoint already has all info.
      db.get("SELECT * FROM cue_points WHERE id = ?", [newCuePoint.id], (err, createdCueDetails) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve created cue point', details: err.message });
        }
        res.status(201).json(createdCueDetails || newCuePoint); // Fallback to newCuePoint if somehow not found
      });
    });
  });
});

// Update a cue point
app.put('/api/projects/:projectId/cues/:cueId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId, cueId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null || isNaN(parseFloat(time))) {
    return res.status(400).json({ error: 'Valid cue point time is required' });
  }
  // isProjectOwner has verified project existence and ownership

  const newTime = parseFloat(time);
  const projectUpdateSql = `UPDATE projects SET updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();
  const cueUpdateSql = `UPDATE cue_points SET time = ? WHERE id = ? AND projectId = ?`;

  db.run(cueUpdateSql, [newTime, cueId, projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update cue point', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cue point not found or not part of this project' });
    }

    // Update project's updatedAt timestamp
    db.run(projectUpdateSql, [now, projectId], (updateErr) => {
      if (updateErr) {
        console.error(`Error updating project ${projectId} updatedAt after cue update:`, updateErr.message);
      }
      // Fetch the updated cue point to return it
      db.get("SELECT * FROM cue_points WHERE id = ? AND projectId = ?", [cueId, projectId], (err, updatedCue) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve updated cue point', details: err.message });
        }
        res.json(updatedCue);
      });
    });
  });
});

// Delete a cue point
app.delete('/api/projects/:projectId/cues/:cueId', isAuthenticated, isProjectOwner, (req, res) => {
  const { projectId, cueId } = req.params;
  // isProjectOwner has verified project existence and ownership

  const selectSql = "SELECT * FROM cue_points WHERE id = ? AND projectId = ?";
  const deleteSql = "DELETE FROM cue_points WHERE id = ? AND projectId = ?";
  const projectUpdateSql = `UPDATE projects SET updatedAt = ? WHERE id = ?`;
  const now = new Date().toISOString();

  db.get(selectSql, [cueId, projectId], (err, cue) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding cue point', details: err.message });
    }
    if (!cue) {
      return res.status(404).json({ error: 'Cue point not found in this project' });
    }

    db.run(deleteSql, [cueId, projectId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete cue point from database', details: err.message });
      }
      if (this.changes === 0) {
        // Should be caught by the get above, but as a safeguard
        return res.status(404).json({ error: 'Cue point not found for deletion' });
      }
      
      // Update project's updatedAt timestamp
      db.run(projectUpdateSql, [now, projectId], (updateErr) => {
        if (updateErr) {
          console.error(`Error updating project ${projectId} updatedAt after cue deletion:`, updateErr.message);
        }
        res.json(cue); // Return the cue point that was deleted
      });
    });
  });
});

// Serve audio files
app.get('/projects/:projectId/audio/:trackId', (req, res) => {
  try {
    const { projectId, trackId } = req.params;
    const audioPath = path.join(__dirname, 'projects', projectId, 'audio', trackId);
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.sendFile(audioPath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
