const express = require('express');
const multer = require('multer');
const fs = require('fs'); // Still needed for file system operations (audio files, project dirs)
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./database'); // Import the database connection

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure projects directory exists (still needed for storing project-specific audio folders)
if (!fs.existsSync('./projects')) {
  fs.mkdirSync('./projects', { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectId = req.params.projectId;
    const audioDir = path.join(__dirname, 'projects', projectId, 'audio');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(audioDir)) {
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

// Get all projects
app.get('/api/projects', (req, res) => {
  db.all("SELECT * FROM projects ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to retrieve projects', details: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create a new project
app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const newProject = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString()
  };

  const sql = `INSERT INTO projects (id, name, createdAt) VALUES (?, ?, ?)`;
  db.run(sql, [newProject.id, newProject.name, newProject.createdAt], function(err) {
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

// Get a specific project (details including tracks and cues)
app.get('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const projectSql = "SELECT * FROM projects WHERE id = ?";
  const tracksSql = "SELECT * FROM tracks WHERE projectId = ?";
  const cuesSql = "SELECT * FROM cue_points WHERE projectId = ? ORDER BY time ASC";

  db.get(projectSql, [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve project details', details: err.message });
    }
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
app.put('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const sql = `UPDATE projects SET name = ? WHERE id = ?`;
  db.run(sql, [name, projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update project', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
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
app.delete('/api/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const sql = "DELETE FROM projects WHERE id = ?";

  // First, get project details to return, and to know which folder to delete
   db.get("SELECT * FROM projects WHERE id = ?", [projectId], (err, projectToDelete) => {
    if (err) {
      return res.status(500).json({ error: 'Error finding project to delete', details: err.message });
    }
    if (!projectToDelete) {
      return res.status(404).json({ error: 'Project not found' });
    }

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
app.post('/api/projects/:projectId/tracks', upload.array('tracks'), async (req, res) => {
  const { projectId } = req.params;

  // Check if project exists
  db.get("SELECT id FROM projects WHERE id = ?", [projectId], async (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking project existence', details: err.message });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const uploadedTracks = [];
    const insertSql = `INSERT INTO tracks (id, projectId, originalName, path, duration) VALUES (?, ?, ?, ?, ?)`;

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
              reject(err);
            } else {
              uploadedTracks.push(track);
              resolve();
            }
          });
        });
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        // Optionally, delete the file if DB insert fails or metadata fails
        // fs.unlinkSync(file.path); 
      }
    }
    res.status(201).json(uploadedTracks);
  });
});

// Delete a track
app.delete('/api/projects/:projectId/tracks/:trackId', (req, res) => {
  const { projectId, trackId } = req.params;
  const selectSql = "SELECT * FROM tracks WHERE id = ? AND projectId = ?";
  const deleteSql = "DELETE FROM tracks WHERE id = ? AND projectId = ?";

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
        return res.status(404).json({ error: 'Track not found for deletion' });
      }

      // Delete track file
      const trackPath = path.join(__dirname, 'projects', projectId, track.path);
      if (fs.existsSync(trackPath)) {
        fs.unlinkSync(trackPath);
      }
      res.json(track); // Return the track that was deleted
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
app.post('/api/projects/:projectId/cues', (req, res) => {
  const { projectId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null) {
    return res.status(400).json({ error: 'Cue point time is required' });
  }
  
  // Check if project exists
  db.get("SELECT id FROM projects WHERE id = ?", [projectId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking project existence', details: err.message });
    }
    if (!project) {
      return res.status(404).json({ error: 'Project not found, cannot add cue point' });
    }

    const newCuePoint = {
      id: uuidv4(),
      projectId,
      time: parseFloat(time)
    };

    const insertSql = `INSERT INTO cue_points (id, projectId, time) VALUES (?, ?, ?)`;
    db.run(insertSql, [newCuePoint.id, newCuePoint.projectId, newCuePoint.time], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create cue point', details: err.message });
      }
      // Return the full cue point object including the generated ID
      db.get("SELECT * FROM cue_points WHERE id = ?", [newCuePoint.id], (err, createdCue) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve created cue point', details: err.message });
        }
         // Re-fetch all cue points to return them sorted
        db.all("SELECT * FROM cue_points WHERE projectId = ? ORDER BY time ASC", [projectId], (err, allCues) => {
            if (err) {
                 return res.status(500).json({ error: 'Failed to retrieve sorted cue points', details: err.message });
            }
            // Find the newly created cue in the sorted list to return it, or just return the one we have if an error occurs
            const newlyInsertedCue = allCues.find(c => c.id === newCuePoint.id) || createdCue;
            res.status(201).json(newlyInsertedCue);
        });
      });
    });
  });
});

// Update a cue point
app.put('/api/projects/:projectId/cues/:cueId', (req, res) => {
  const { projectId, cueId } = req.params;
  const { time } = req.body;

  if (time === undefined || time === null) {
    return res.status(400).json({ error: 'Cue point time is required' });
  }

  const sql = `UPDATE cue_points SET time = ? WHERE id = ? AND projectId = ?`;
  db.run(sql, [parseFloat(time), cueId, projectId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update cue point', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cue point not found or not part of this project' });
    }
    // Fetch the updated cue point to return it
    db.get("SELECT * FROM cue_points WHERE id = ? AND projectId = ?", [cueId, projectId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve updated cue point', details: err.message });
        }
        // Re-fetch all cue points to return them sorted, and then find the updated one
        db.all("SELECT * FROM cue_points WHERE projectId = ? ORDER BY time ASC", [projectId], (err, allCues) => {
            if (err) {
                 return res.status(500).json({ error: 'Failed to retrieve sorted cue points', details: err.message });
            }
            const updatedCue = allCues.find(c => c.id === cueId) || row; // Fallback to 'row' if not found in sorted
            res.json(updatedCue);
        });
    });
  });
});

// Delete a cue point
app.delete('/api/projects/:projectId/cues/:cueId', (req, res) => {
  const { projectId, cueId } = req.params;
  const selectSql = "SELECT * FROM cue_points WHERE id = ? AND projectId = ?";
  const deleteSql = "DELETE FROM cue_points WHERE id = ? AND projectId = ?";

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
        return res.status(404).json({ error: 'Cue point not found for deletion' });
      }
      res.json(cue); // Return the cue point that was deleted
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
