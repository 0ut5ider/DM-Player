const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mm = require('music-metadata');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = '/dmplayer'; // Base path for cPanel deployment

// Middleware
app.use(express.json());
app.use(`${BASE_PATH}`, express.static('public'));

// Ensure projects directory exists
if (!fs.existsSync('./projects')) {
  fs.mkdirSync('./projects', { recursive: true });
}

// Initialize projects.json if it doesn't exist
const projectsFilePath = path.join(__dirname, 'projects', 'projects.json');
if (!fs.existsSync(projectsFilePath)) {
  fs.writeFileSync(projectsFilePath, JSON.stringify([], null, 2));
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
app.get(`${BASE_PATH}/api/projects`, (req, res) => {
  try {
    const projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));
    res.json(projects);
  } catch (error) {
    console.error('Error retrieving projects:', error);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Create a new project
app.post(`${BASE_PATH}/api/projects`, (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));
    
    const newProject = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString()
    };
    
    projects.push(newProject);
    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));
    
    // Create project directory and project_data.json
    const projectDir = path.join(__dirname, 'projects', newProject.id);
    fs.mkdirSync(projectDir, { recursive: true });
    
    const projectDataPath = path.join(projectDir, 'project_data.json');
    fs.writeFileSync(projectDataPath, JSON.stringify({
      tracks: [],
      cuePoints: []
    }, null, 2));
    
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get a specific project
app.get(`${BASE_PATH}/api/projects/:projectId`, (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    res.json(projectData);
  } catch (error) {
    console.error('Error retrieving project:', error);
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
});

// Update a project
app.put(`${BASE_PATH}/api/projects/:projectId`, (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    projects[projectIndex].name = name;
    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));
    
    res.json(projects[projectIndex]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
app.delete(`${BASE_PATH}/api/projects/:projectId`, (req, res) => {
  try {
    const { projectId } = req.params;
    const projects = JSON.parse(fs.readFileSync(projectsFilePath, 'utf8'));
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Remove from projects array
    const deletedProject = projects.splice(projectIndex, 1)[0];
    fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));
    
    // Delete project directory
    const projectDir = path.join(__dirname, 'projects', projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    
    res.json(deletedProject);
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Upload tracks
app.post(`${BASE_PATH}/api/projects/:projectId/tracks`, upload.array('tracks'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    const uploadedTracks = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Extract metadata to get duration
        const metadata = await mm.parseFile(file.path);
        const duration = metadata.format.duration || 0;
        
        const trackId = path.parse(file.filename).name; // UUID from filename
        const track = {
          id: trackId,
          originalName: file.originalname,
          path: `audio/${file.filename}`,
          duration
        };
        
        projectData.tracks.push(track);
        uploadedTracks.push(track);
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
      }
    }
    
    // Save updated project data
    fs.writeFileSync(projectDataPath, JSON.stringify(projectData, null, 2));
    
    res.status(201).json(uploadedTracks);
  } catch (error) {
    console.error('Error uploading tracks:', error);
    res.status(500).json({ error: 'Failed to upload tracks' });
  }
});

// Delete a track
app.delete(`${BASE_PATH}/api/projects/:projectId/tracks/:trackId`, (req, res) => {
  try {
    const { projectId, trackId } = req.params;
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    const trackIndex = projectData.tracks.findIndex(t => t.id === trackId);
    
    if (trackIndex === -1) {
      return res.status(404).json({ error: 'Track not found' });
    }
    
    // Get track info before removing
    const track = projectData.tracks[trackIndex];
    
    // Remove from tracks array
    projectData.tracks.splice(trackIndex, 1);
    fs.writeFileSync(projectDataPath, JSON.stringify(projectData, null, 2));
    
    // Delete track file
    const trackPath = path.join(__dirname, 'projects', projectId, track.path);
    if (fs.existsSync(trackPath)) {
      fs.unlinkSync(trackPath);
    }
    
    res.json(track);
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ error: 'Failed to delete track' });
  }
});

// Get all cue points
app.get(`${BASE_PATH}/api/projects/:projectId/cues`, (req, res) => {
  try {
    const { projectId } = req.params;
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    res.json(projectData.cuePoints);
  } catch (error) {
    console.error('Error retrieving cue points:', error);
    res.status(500).json({ error: 'Failed to retrieve cue points' });
  }
});

// Create a new cue point
app.post(`${BASE_PATH}/api/projects/:projectId/cues`, (req, res) => {
  try {
    const { projectId } = req.params;
    const { time } = req.body;
    
    if (time === undefined || time === null) {
      return res.status(400).json({ error: 'Cue point time is required' });
    }
    
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    
    const newCuePoint = {
      id: uuidv4(),
      time: parseFloat(time)
    };
    
    projectData.cuePoints.push(newCuePoint);
    
    // Sort cue points by time
    projectData.cuePoints.sort((a, b) => a.time - b.time);
    
    fs.writeFileSync(projectDataPath, JSON.stringify(projectData, null, 2));
    
    res.status(201).json(newCuePoint);
  } catch (error) {
    console.error('Error creating cue point:', error);
    res.status(500).json({ error: 'Failed to create cue point' });
  }
});

// Update a cue point
app.put(`${BASE_PATH}/api/projects/:projectId/cues/:cueId`, (req, res) => {
  try {
    const { projectId, cueId } = req.params;
    const { time } = req.body;
    
    if (time === undefined || time === null) {
      return res.status(400).json({ error: 'Cue point time is required' });
    }
    
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    const cueIndex = projectData.cuePoints.findIndex(c => c.id === cueId);
    
    if (cueIndex === -1) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    projectData.cuePoints[cueIndex].time = parseFloat(time);
    
    // Sort cue points by time
    projectData.cuePoints.sort((a, b) => a.time - b.time);
    
    fs.writeFileSync(projectDataPath, JSON.stringify(projectData, null, 2));
    
    res.json(projectData.cuePoints[cueIndex]);
  } catch (error) {
    console.error('Error updating cue point:', error);
    res.status(500).json({ error: 'Failed to update cue point' });
  }
});

// Delete a cue point
app.delete(`${BASE_PATH}/api/projects/:projectId/cues/:cueId`, (req, res) => {
  try {
    const { projectId, cueId } = req.params;
    const projectDataPath = path.join(__dirname, 'projects', projectId, 'project_data.json');
    
    if (!fs.existsSync(projectDataPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectData = JSON.parse(fs.readFileSync(projectDataPath, 'utf8'));
    const cueIndex = projectData.cuePoints.findIndex(c => c.id === cueId);
    
    if (cueIndex === -1) {
      return res.status(404).json({ error: 'Cue point not found' });
    }
    
    // Remove from cue points array
    const deletedCue = projectData.cuePoints.splice(cueIndex, 1)[0];
    fs.writeFileSync(projectDataPath, JSON.stringify(projectData, null, 2));
    
    res.json(deletedCue);
  } catch (error) {
    console.error('Error deleting cue point:', error);
    res.status(500).json({ error: 'Failed to delete cue point' });
  }
});

// Serve audio files
app.get(`${BASE_PATH}/projects/:projectId/audio/:trackId`, (req, res) => {
  try {
    const { projectId, trackId } = req.params;
    const audioPath = path.join(__dirname, 'projects', projectId, 'audio', trackId);
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// Serve the main app at the base path
app.get(`${BASE_PATH}`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve a simple message at the root path
app.get('/', (req, res) => {
  res.send('DM Player is running. Please access the application at <a href="/dmplayer">/dmplayer</a>');
});

// Only start the server if we're not being required by another module
// This allows Passenger to handle the server startup
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Application available at http://localhost:${PORT}${BASE_PATH}`);
  });
}

// Export the app for cPanel/Passenger
module.exports = app;
