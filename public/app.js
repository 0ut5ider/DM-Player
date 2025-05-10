// Global state
let currentProject = null;
let cueColors = {};
let draggingCueId = null;
let currentTrack = null;
let upcomingCuePoints = [];
let isPlaying = false;
let isTrackSwitching = false; // Flag to prevent multiple track switches at once
let isDragging = false;

// DOM Elements
const projectListView = document.getElementById('project-list-view');
const projectDetailView = document.getElementById('project-detail-view');
const projectsContainer = document.getElementById('projects-container');
const tracksContainer = document.getElementById('tracks-container');
const cuesContainer = document.getElementById('cues-container');
const backButton = document.getElementById('back-button');
const projectNameElement = document.getElementById('project-name');
const audioPlayer = document.getElementById('audio-player');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const progressIndicator = document.getElementById('progress-indicator');
const progressBar = document.getElementById('progress-bar');
const progressHandle = document.getElementById('progress-handle');
const playButton = document.getElementById('play-btn');
const pauseButton = document.getElementById('pause-btn');
const stopButton = document.getElementById('stop-btn');
const currentTrackNameElement = document.getElementById('current-track-name');
const trackUploadInput = document.getElementById('track-upload-input');
const cueTimeline = document.getElementById('cue-timeline');
const cuePlaybackIndicator = document.getElementById('cue-playback-indicator');
const cuePointsContainer = document.getElementById('cue-points-container');

// Modal Elements
const overlay = document.getElementById('overlay');
const createProjectModal = document.getElementById('create-project-modal');
const editProjectModal = document.getElementById('edit-project-modal');
const addCueModal = document.getElementById('add-cue-modal');
const editCueModal = document.getElementById('edit-cue-modal');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Load projects on startup
  loadProjects();
  
  // Set up event listeners
  setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
  // Project navigation
  backButton.addEventListener('click', showProjectList);
  
  // Project actions
  document.getElementById('create-project-btn').addEventListener('click', showCreateProjectModal);
  document.getElementById('create-project-form').addEventListener('submit', createProject);
  document.getElementById('edit-project-form').addEventListener('submit', updateProject);
  
  // Track actions
  document.getElementById('upload-track-btn').addEventListener('click', () => {
    trackUploadInput.click();
  });
  trackUploadInput.addEventListener('change', uploadTracks);
  
  // Cue point actions
  document.getElementById('add-cue-btn').addEventListener('click', showAddCueModal);
  document.getElementById('add-cue-form').addEventListener('submit', createCuePoint);
  document.getElementById('edit-cue-form').addEventListener('submit', updateCuePoint);
  
  // Player controls
  playButton.addEventListener('click', playAudio);
  pauseButton.addEventListener('click', pauseAudio);
  stopButton.addEventListener('click', stopAudio);
  progressBar.addEventListener('click', seekAudio);
  // Scrubber drag events
  progressHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !audioPlayer.duration) return;
    const rect = progressBar.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    const newTime = pos * audioPlayer.duration;
    // Cue-point-aware drag
    if (currentProject && currentProject.cuePoints && currentProject.cuePoints.length) {
      audioPlayer.currentTime = newTime;
      const sorted = currentProject.cuePoints.slice().sort((a, b) => a.time - b.time);
      if (newTime >= sorted[0].time) {
        isDragging = false;
        switchToRandomTrack();
        return;
      }
    }
    progressIndicator.style.width = `${pos * 100}%`;
    progressHandle.style.left = `${pos * 100}%`;
    currentTimeElement.textContent = formatTime(newTime);
  });
  document.addEventListener('mouseup', (e) => {
    if (!isDragging || !audioPlayer.duration) return;
    const rect = progressBar.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    const newTime = pos * audioPlayer.duration;
    audioPlayer.currentTime = newTime;
    isDragging = false;

    // Cue-point-aware drag end
    if (currentProject && currentProject.cuePoints && currentProject.cuePoints.length) {
      const sorted = currentProject.cuePoints.slice().sort((a, b) => a.time - b.time);
      if (newTime >= sorted[0].time) {
        switchToRandomTrack();
        return;
      }
    }
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
  });
  
  // Audio player events
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('ended', handleTrackEnd);
  audioPlayer.addEventListener('loadedmetadata', () => {
    updateTotalTime();
    updateCueTimeline();
  });
  
  // Modal close buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  overlay.addEventListener('click', closeAllModals);
}

// API Functions

// Fetch all projects
async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Failed to load projects');
    
    const projects = await response.json();
    renderProjects(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
    showError('Failed to load projects. Please try again.');
  }
}

// Create a new project
async function createProject(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('project-name-input');
  const name = nameInput.value.trim();
  
  if (!name) return;
  
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to create project');
    
    const newProject = await response.json();
    closeAllModals();
    nameInput.value = '';
    
    // Reload projects or add the new one to the list
    loadProjects();
  } catch (error) {
    console.error('Error creating project:', error);
    showError('Failed to create project. Please try again.');
  }
}

// Update a project
async function updateProject(event) {
  event.preventDefault();
  
  const projectId = document.getElementById('edit-project-id').value;
  const nameInput = document.getElementById('edit-project-name-input');
  const name = nameInput.value.trim();
  
  if (!name || !projectId) return;
  
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to update project');
    
    const updatedProject = await response.json();
    closeAllModals();
    
    // Update project name if it's the current project
    if (currentProject && currentProject.id === projectId) {
      currentProject.name = name;
      projectNameElement.textContent = name;
    }
    
    // Reload projects
    loadProjects();
  } catch (error) {
    console.error('Error updating project:', error);
    showError('Failed to update project. Please try again.');
  }
}

// Delete a project
async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete project');
    
    // If the deleted project is the current one, go back to project list
    if (currentProject && currentProject.id === projectId) {
      showProjectList();
    }
    
    // Reload projects
    loadProjects();
  } catch (error) {
    console.error('Error deleting project:', error);
    showError('Failed to delete project. Please try again.');
  }
}

// Load project details
async function loadProjectDetails(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) throw new Error('Failed to load project details');
    
    const projectData = await response.json();
    
    // Find the project in the list to get its name
    const projectsResponse = await fetch('/api/projects');
    const projects = await projectsResponse.json();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) throw new Error('Project not found');
    
    // Set current project
    currentProject = {
      id: projectId,
      name: project.name,
      ...projectData
    };
    
    // Show project details view
    showProjectDetails();
    
    // Render tracks and cue points
    renderTracks(projectData.tracks);
    renderCuePoints(projectData.cuePoints);
  } catch (error) {
    console.error('Error loading project details:', error);
    showError('Failed to load project details. Please try again.');
  }
}

// Upload tracks
async function uploadTracks() {
  if (!currentProject || !trackUploadInput.files.length) return;
  
  const formData = new FormData();
  
  // Add all selected files to the form data
  for (let i = 0; i < trackUploadInput.files.length; i++) {
    formData.append('tracks', trackUploadInput.files[i]);
  }
  
  try {
    const response = await fetch(`/api/projects/${currentProject.id}/tracks`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to upload tracks');
    
    const uploadedTracks = await response.json();
    
    // Add new tracks to the current project
    currentProject.tracks = [...currentProject.tracks, ...uploadedTracks];
    
    // Render updated tracks
    renderTracks(currentProject.tracks);
    
    // Reset file input
    trackUploadInput.value = '';
  } catch (error) {
    console.error('Error uploading tracks:', error);
    showError('Failed to upload tracks. Please try again.');
  }
}

// Delete a track
async function deleteTrack(trackId) {
  if (!currentProject) return;
  
  if (!confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/projects/${currentProject.id}/tracks/${trackId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete track');
    
    // Remove track from current project
    currentProject.tracks = currentProject.tracks.filter(t => t.id !== trackId);
    
    // If the deleted track is the current one, stop playback
    if (currentTrack && currentTrack.id === trackId) {
      stopAudio();
      currentTrack = null;
    }
    
    // Render updated tracks
    renderTracks(currentProject.tracks);
  } catch (error) {
    console.error('Error deleting track:', error);
    showError('Failed to delete track. Please try again.');
  }
}

// Create a cue point
async function createCuePoint(event) {
  event.preventDefault();
  
  if (!currentProject) return;
  
  const timeInput = document.getElementById('cue-time-input');
  const time = parseFloat(timeInput.value);
  
  if (isNaN(time) || time < 0) return;
  
  try {
    const response = await fetch(`/api/projects/${currentProject.id}/cues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ time })
    });
    
    if (!response.ok) throw new Error('Failed to create cue point');
    
    const newCuePoint = await response.json();
    closeAllModals();
    timeInput.value = '';
    
    // Add new cue point to the current project
    currentProject.cuePoints.push(newCuePoint);
    
    // Sort cue points by time
    currentProject.cuePoints.sort((a, b) => a.time - b.time);
    
    // Render updated cue points
    renderCuePoints(currentProject.cuePoints);
    
    // Update upcoming cue points if playing
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
  } catch (error) {
    console.error('Error creating cue point:', error);
    showError('Failed to create cue point. Please try again.');
  }
}

// Update a cue point
async function updateCuePoint(event) {
  event.preventDefault();
  
  if (!currentProject) return;
  
  const cueId = document.getElementById('edit-cue-id').value;
  const timeInput = document.getElementById('edit-cue-time-input');
  const time = parseFloat(timeInput.value);
  
  if (!cueId || isNaN(time) || time < 0) return;
  
  try {
    const response = await fetch(`/api/projects/${currentProject.id}/cues/${cueId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ time })
    });
    
    if (!response.ok) throw new Error('Failed to update cue point');
    
    const updatedCuePoint = await response.json();
    closeAllModals();
    
    // Update cue point in the current project
    const index = currentProject.cuePoints.findIndex(c => c.id === cueId);
    if (index !== -1) {
      currentProject.cuePoints[index] = updatedCuePoint;
    }
    
    // Sort cue points by time
    currentProject.cuePoints.sort((a, b) => a.time - b.time);
    
    // Render updated cue points
    renderCuePoints(currentProject.cuePoints);
    
    // Update upcoming cue points if playing
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
  } catch (error) {
    console.error('Error updating cue point:', error);
    showError('Failed to update cue point. Please try again.');
  }
}

// Delete a cue point
async function deleteCuePoint(cueId) {
  if (!currentProject) return;
  
  if (!confirm('Are you sure you want to delete this cue point?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/projects/${currentProject.id}/cues/${cueId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete cue point');
    
    // Remove cue point from current project
    currentProject.cuePoints = currentProject.cuePoints.filter(c => c.id !== cueId);
    
    // Render updated cue points
    renderCuePoints(currentProject.cuePoints);
    
    // Update upcoming cue points if playing
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
  } catch (error) {
    console.error('Error deleting cue point:', error);
    showError('Failed to delete cue point. Please try again.');
  }
}

// UI Functions

// Render projects list
function renderProjects(projects) {
  // Clear container
  projectsContainer.innerHTML = '';
  
  if (projects.length === 0) {
    projectsContainer.innerHTML = '<div class="empty-message">No projects yet. Create one to get started!</div>';
    return;
  }
  
  // Sort projects by creation date (newest first)
  projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Create project items
  projects.forEach(project => {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    
    const date = new Date(project.createdAt);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    projectItem.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-date">Created: ${formattedDate}</div>
      </div>
      <div class="project-actions">
        <button class="edit-btn" title="Edit Project"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" title="Delete Project"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Add click event to open project
    projectItem.addEventListener('click', (e) => {
      // Don't open if clicking on action buttons
      if (e.target.closest('.project-actions')) return;
      
      loadProjectDetails(project.id);
    });
    
    // Add edit button event
    projectItem.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showEditProjectModal(project);
    });
    
    // Add delete button event
    projectItem.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProject(project.id);
    });
    
    projectsContainer.appendChild(projectItem);
  });
}

// Render tracks list
function renderTracks(tracks) {
  // Clear container
  tracksContainer.innerHTML = '';
  
  if (!tracks || tracks.length === 0) {
    tracksContainer.innerHTML = '<div class="empty-message">No tracks yet. Upload some to get started!</div>';
    return;
  }
  
  // Create track items
  tracks.forEach(track => {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item';
    trackItem.dataset.id = track.id;
    
    const duration = formatTime(track.duration);
    
    trackItem.innerHTML = `
      <div class="track-info">
        <button class="track-play-btn" title="Play Track">
          <i class="fas fa-play"></i>
        </button>
        <div>
          <div class="track-name">${escapeHtml(track.originalName)}</div>
          <div class="track-duration">${duration}</div>
        </div>
      </div>
      <div class="track-actions">
        <button class="delete-btn" title="Delete Track"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Add play button event
    trackItem.querySelector('.track-play-btn').addEventListener('click', () => {
      playTrack(track);
    });
    
    // Add delete button event
    trackItem.querySelector('.delete-btn').addEventListener('click', () => {
      deleteTrack(track.id);
    });
    
    tracksContainer.appendChild(trackItem);
  });
}

// Render cue points list
function renderCuePoints(cuePoints) {
  // Clear container
  cuesContainer.innerHTML = '';
  
  if (!cuePoints || cuePoints.length === 0) {
    cuesContainer.innerHTML = '<div class="empty-message">No cue points yet. Add some to enable track switching!</div>';
    return;
  }
  
  // Sort cue points by time
  cuePoints.sort((a, b) => a.time - b.time);
  
  // Create cue point items
  cuePoints.forEach(cue => {
    if (!cueColors[cue.id]) cueColors[cue.id] = getRandomColor();
    const cueItem = document.createElement('div');
    cueItem.className = 'cue-item';
    
    const formattedTime = formatTime(cue.time);
    
    cueItem.innerHTML = `
      <span class="cue-color" style="background-color: ${cueColors[cue.id]}"></span>
      <div class="cue-time">${formattedTime}</div>
      <div class="cue-actions">
        <button class="edit-btn" title="Edit Cue Point"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" title="Delete Cue Point"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    // Add edit button event
    cueItem.querySelector('.edit-btn').addEventListener('click', () => {
      showEditCueModal(cue);
    });
    
    // Add delete button event
    cueItem.querySelector('.delete-btn').addEventListener('click', () => {
      deleteCuePoint(cue.id);
    });
    
    cuesContainer.appendChild(cueItem);
  });
  updateCueTimeline();
}

// Show project list view
function showProjectList() {
  // Stop any playing audio
  stopAudio();
  
  // Reset current project
  currentProject = null;
  
  // Show project list, hide project details
  projectListView.classList.remove('hidden');
  projectDetailView.classList.add('hidden');
  backButton.classList.add('hidden');
}

// Show project details view
function showProjectDetails() {
  if (!currentProject) return;
  
  // Update project name
  projectNameElement.textContent = currentProject.name;
  
  // Hide project list, show project details
  projectListView.classList.add('hidden');
  projectDetailView.classList.remove('hidden');
  backButton.classList.remove('hidden');
}

// Modal functions
function showCreateProjectModal() {
  createProjectModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.getElementById('project-name-input').focus();
}

function showEditProjectModal(project) {
  document.getElementById('edit-project-id').value = project.id;
  document.getElementById('edit-project-name-input').value = project.name;
  
  editProjectModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.getElementById('edit-project-name-input').focus();
}

function showAddCueModal() {
  addCueModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.getElementById('cue-time-input').focus();
}

function showEditCueModal(cue) {
  document.getElementById('edit-cue-id').value = cue.id;
  document.getElementById('edit-cue-time-input').value = cue.time;
  
  editCueModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.getElementById('edit-cue-time-input').focus();
}

function closeAllModals() {
  createProjectModal.classList.add('hidden');
  editProjectModal.classList.add('hidden');
  addCueModal.classList.add('hidden');
  editCueModal.classList.add('hidden');
  overlay.classList.add('hidden');
}

// Audio Player Functions

// Play a specific track
function playTrack(track) {
  if (!track) return;
  
  // Set current track
  currentTrack = track;
  
  // Update audio source
  audioPlayer.src = `/projects/${currentProject.id}/audio/${track.id}.mp3`;
  
  // Update UI
  currentTrackNameElement.textContent = track.originalName;
  
  // Play audio
  playAudio();
}

// Play audio
function playAudio() {
  if (!currentProject || !currentProject.tracks.length) {
    showError('No tracks available to play.');
    return;
  }
  
  // If no track is selected, pick a random one
  if (!currentTrack) {
    const randomIndex = Math.floor(Math.random() * currentProject.tracks.length);
    currentTrack = currentProject.tracks[randomIndex];
    audioPlayer.src = `/projects/${currentProject.id}/audio/${currentTrack.id}.mp3`;
    currentTrackNameElement.textContent = currentTrack.originalName;
  }
  
  // Play audio
  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      playButton.classList.add('hidden');
      pauseButton.classList.remove('hidden');
      
      // Update upcoming cue points
      updateUpcomingCuePoints();
    })
    .catch(error => {
      console.error('Error playing audio:', error);
      showError('Failed to play audio. Please try again.');
    });
}

// Pause audio
function pauseAudio() {
  audioPlayer.pause();
  isPlaying = false;
  pauseButton.classList.add('hidden');
  playButton.classList.remove('hidden');
}

// Stop audio
function stopAudio() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  isPlaying = false;
  pauseButton.classList.add('hidden');
  playButton.classList.remove('hidden');
  progressIndicator.style.width = '0%';
  currentTimeElement.textContent = '0:00';
}

 // Seek audio to a specific position
 function seekAudio(event) {
   if (!audioPlayer.duration) return;
   
   const rect = progressBar.getBoundingClientRect();
   const pos = (event.clientX - rect.left) / rect.width;
   const newTime = Math.max(0, Math.min(1, pos)) * audioPlayer.duration;
   audioPlayer.currentTime = newTime;
   
   // Cue-point-aware seek
   if (currentProject && currentProject.cuePoints && currentProject.cuePoints.length) {
     const sorted = currentProject.cuePoints.slice().sort((a, b) => a.time - b.time);
     if (newTime >= sorted[0].time) {
       switchToRandomTrack();
       return;
     }
   }
   // Update upcoming cue points after seeking
   if (isPlaying) {
     updateUpcomingCuePoints();
     updateCueTimeline();
   }
 }

// Update progress bar and time display
function updateProgress() {
  if (isDragging) return;
  if (!audioPlayer.duration) return;
  
  const currentTime = audioPlayer.currentTime;
  const duration = audioPlayer.duration;
  
  // Update progress bar
  const progress = (currentTime / duration) * 100;
  progressIndicator.style.width = `${progress}%`;
  progressHandle.style.left = `${progress}%`;
  // Update cue playback indicator
  cuePlaybackIndicator.style.width = `${progress}%`;
  
  // Update time display
  currentTimeElement.textContent = formatTime(currentTime);
  
  // Check for cue points
  checkCuePoints();
}

// Update total time display
function updateTotalTime() {
  if (!audioPlayer.duration) return;
  
  totalTimeElement.textContent = formatTime(audioPlayer.duration);
}

// Handle track end
function handleTrackEnd() {
  // Switch to a random track
  switchToRandomTrack();
}

// Update the list of upcoming cue points
function updateUpcomingCuePoints() {
  if (!currentProject || !currentProject.cuePoints.length || !isPlaying) {
    upcomingCuePoints = [];
    return;
  }
  
  const currentTime = audioPlayer.currentTime;
  
  // Filter cue points that are ahead of current time
  upcomingCuePoints = currentProject.cuePoints
    .filter(cue => cue.time > currentTime)
    .sort((a, b) => a.time - b.time);
}

// Check if we've reached a cue point
function checkCuePoints() {
  // Add check for audioPlayer readiness state > 0 to avoid checks before metadata is loaded
  // Also check if upcomingCuePoints actually has items before accessing index 0
  if (!isPlaying || !upcomingCuePoints.length || isTrackSwitching || audioPlayer.readyState === 0) return;

  const currentTime = audioPlayer.currentTime;

  // Check if we've passed the next cue point
  // Use >= comparison for robustness
  if (currentTime >= upcomingCuePoints[0].time) {
    const passedCuePoint = upcomingCuePoints.shift(); // Store the passed cue point for potential logging
    console.log(`Passed cue point at ${passedCuePoint.time}s`);

    // Switch to a random track
    switchToRandomTrack();

    // DO NOT updateUpcomingCuePoints() here. It will be updated after the switch completes.
  }
}


// Switch to a random track
function switchToRandomTrack() {
  // Ensure only one switch happens at a time
  if (isTrackSwitching) {
    console.log('Track switch already in progress, skipping.');
    return;
  }
  if (!currentProject || !currentProject.tracks.length) {
    console.log('No project or tracks available for switching.');
    return;
  }

  isTrackSwitching = true;
  console.log('Initiating track switch...');

  try {
    const availableTracks = currentProject.tracks.filter(t => t.id !== currentTrack?.id);

    if (!availableTracks.length) {
      console.log('No other tracks available, continuing current track.');
      isTrackSwitching = false;
      // If only one track, we might need to reset upcomingCuePoints if it's empty now
      // or if the loop should stop. Let's re-evaluate from current time.
      updateUpcomingCuePoints();
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const newTrack = availableTracks[randomIndex];
    const previousTime = audioPlayer.currentTime; // Store time *before* changing src

    console.log(`Switching from ${currentTrack?.originalName || 'None'} to track: ${newTrack.originalName} at time ${previousTime.toFixed(2)}s`);

    currentTrack = newTrack;
    audioPlayer.src = `/projects/${currentProject.id}/audio/${newTrack.id}.mp3`;
    currentTrackNameElement.textContent = newTrack.originalName;

    // Use { once: true } for safety to ensure listeners don't stack up
    audioPlayer.addEventListener('loadedmetadata', function onMetadataLoaded() {
      console.log(`Metadata loaded for ${newTrack.originalName}. Duration: ${audioPlayer.duration.toFixed(2)}s`);
      try {
        // Clamp seekTime to the new track's duration
        const seekTime = Math.min(previousTime, audioPlayer.duration);
        console.log(`Seeking ${newTrack.originalName} to: ${seekTime.toFixed(2)}s`);
        // Setting currentTime can sometimes throw an error if the state is wrong
        if (audioPlayer.readyState >= 1) { // HAVE_METADATA or higher
             audioPlayer.currentTime = seekTime;
        } else {
             console.warn('Audio not ready for seeking, playback might start from 0.');
        }


        // Ensure we are still supposed to be playing
        if (!isPlaying) {
           console.log('Playback was stopped during track switch. Aborting play.');
           updateUpcomingCuePoints(); // Update cues even if not playing now
           isTrackSwitching = false;
           return;
        }

        audioPlayer.play()
          .then(() => {
            console.log(`Playback started for ${newTrack.originalName} at ${audioPlayer.currentTime.toFixed(2)}s`);
            // Update upcoming cue points *after* successful playback start
            updateUpcomingCuePoints();
            // Reset the flag *after* everything is done
            isTrackSwitching = false;
            console.log('Track switch complete.');
          })
          .catch(error => {
            console.error('Error playing audio after switch:', error);
            // Still update cues and reset flag on error
            updateUpcomingCuePoints();
            isTrackSwitching = false;
          });
      } catch (error) {
        console.error('Error during loadedmetadata handling:', error);
        updateUpcomingCuePoints();
        isTrackSwitching = false;
      }
    }, { once: true }); // Use once: true

    audioPlayer.addEventListener('error', function onError(e) {
      console.error(`Error loading audio source ${audioPlayer.src}:`, audioPlayer.error, e);
      // Reset flag and update cues if loading fails
      updateUpcomingCuePoints();
      isTrackSwitching = false;
    }, { once: true }); // Use once: true

  } catch (error) {
    console.error('Error during track switch setup:', error);
    // Reset flag if setup fails
    updateUpcomingCuePoints(); // Try to update cues anyway
    isTrackSwitching = false;
  }
}

// Utility Functions

// Format time in seconds to MM:SS.ss format
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00.00';

  const totalSeconds = seconds; // Keep the original value with decimals
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60).toFixed(2); // Get seconds with 2 decimal places

  // Pad the whole seconds part if needed (e.g., 5.50 -> 05.50)
  const paddedSeconds = remainingSeconds.padStart(5, '0'); // 5 characters for "SS.ss" (e.g., "05.50")

  return `${minutes}:${paddedSeconds}`;
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Show error message
function showError(message) {
  alert(message);
}

// Generate a random hex color
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// Update the cue point timeline display
function updateCueTimeline() {
  if (!currentProject) {
    cuePointsContainer.innerHTML = '';
    cuePlaybackIndicator.style.width = '0%';
    return;
  }
  let duration = audioPlayer.duration;
  if (!duration && currentProject.tracks && currentProject.tracks.length) {
    duration = currentProject.tracks[0].duration;
  }
  if (!duration) {
    cuePointsContainer.innerHTML = '';
    cuePlaybackIndicator.style.width = '0%';
    return;
  }
  cuePointsContainer.innerHTML = '';
  currentProject.cuePoints.forEach(cue => {
    if (!cueColors[cue.id]) cueColors[cue.id] = getRandomColor();
    const dot = document.createElement('div');
    dot.className = 'cue-point';
    dot.style.left = (cue.time / duration * 100) + '%';
    dot.style.backgroundColor = cueColors[cue.id];
    dot.addEventListener('mousedown', (e) => {
      draggingCueId = cue.id;
      e.preventDefault();
    });
    cuePointsContainer.appendChild(dot);
  });
  const progress = (audioPlayer.currentTime / duration) * 100;
  cuePlaybackIndicator.style.width = progress + '%';
}

// Global mouse events for dragging cue points
document.addEventListener('mousemove', (e) => {
  if (!draggingCueId) return;
  const rect = cueTimeline.getBoundingClientRect();
  let pos = (e.clientX - rect.left) / rect.width;
  pos = Math.max(0, Math.min(1, pos));
  const duration = audioPlayer.duration || (currentProject && currentProject.tracks && currentProject.tracks.length > 0 ? currentProject.tracks[0].duration : 0);
  if (!duration) return; // If no duration, can't calculate newTime
  const newTime = pos * duration;
  const cue = currentProject.cuePoints.find(c => c.id === draggingCueId);
  if (cue) cue.time = newTime;
  updateCueTimeline();
});

document.addEventListener('mouseup', () => {
  if (!draggingCueId) return;
  const id = draggingCueId;
  draggingCueId = null;
  fetch(`/api/projects/${currentProject.id}/cues/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ time: currentProject.cuePoints.find(c => c.id === id).time })
  }).catch(err => console.error('Cue drag update failed', err));
  renderCuePoints(currentProject.cuePoints);
});
