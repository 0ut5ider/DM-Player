// Global state
const appVersion = "1.0.11"; // Will be updated later if needed
let currentProject = null;
let cueColors = {};
let draggingCueId = null;
let currentTrack = null;
let upcomingCuePoints = [];
let isPlaying = false;
let isTrackSwitching = false; // Flag to prevent multiple track switches at once
let isDragging = false;

// Auth state
let currentUser = null; // { id, artistName, email }
let currentView = 'login'; // Possible views: 'login', 'register', 'gallery', 'my-projects', 'project-detail'

// DOM Elements
// Auth & Main Views
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const galleryView = document.getElementById('gallery-view');
const myProjectsView = document.getElementById('my-projects-view');
const projectDetailView = document.getElementById('project-detail-view');

// Navigation
const authNavigation = document.getElementById('auth-navigation');
const galleryNavBtn = document.getElementById('gallery-nav-btn');
const myProjectsNavBtn = document.getElementById('my-projects-nav-btn');
const backButton = document.getElementById('back-button'); // Existing, will be adapted

// Forms & Links
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');

// Project Containers (My Projects and Gallery)
const myProjectsContainer = document.getElementById('my-projects-container');
const galleryProjectsContainer = document.getElementById('gallery-projects-container');

// Existing DOM Elements (Project Detail, Player, etc.)
const globalPlayerControls = document.getElementById('global-player-controls'); // New global player
const tracksContainer = document.getElementById('tracks-container');
const cuesContainer = document.getElementById('cues-container');
// backButton is already defined above
const projectNameElement = document.getElementById('project-name'); // This is in project-detail-view
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
  checkAuthStatus(); // Check auth status first
  setupEventListeners();
  displayAppVersion();
  // Initialize routing based on URL hash
  if (location.hash) {
    const view = location.hash.replace('#/', '');
    showView(view);
  } else {
    showView('gallery');
  }
});

// Handle hash changes
window.addEventListener('hashchange', () => {
  const view = location.hash.replace('#/', '');
  showView(view);
});

// Display App Version
function displayAppVersion() {
  const versionElement = document.getElementById('app-version');
  if (versionElement) {
    versionElement.textContent = `v${appVersion}`;
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Auth navigation & View Switching
  showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); location.hash = '#/register'; });
  showLoginLink.addEventListener('click', (e) => { e.preventDefault(); location.hash = '#/login'; });
  galleryNavBtn.addEventListener('click', () => { location.hash = '#/gallery'; });
  myProjectsNavBtn.addEventListener('click', () => { location.hash = '#/my-projects'; });
  backButton.addEventListener('click', handleBackButton); // Updated handler

  // Auth forms
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  // Project actions (My Projects view)
  document.getElementById('create-project-btn').addEventListener('click', showCreateProjectModal);
  document.getElementById('create-project-form').addEventListener('submit', createProject);
  document.getElementById('edit-project-form').addEventListener('submit', updateProject);
  
  // Track actions (Project Detail view)
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

// API Functions

// --- Auth API Functions ---
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();
    if (data.loggedIn) {
      currentUser = data.user;
      updateAuthNavigation();
      showView('gallery'); // Default to gallery if logged in
      loadGalleryProjects(); // Load gallery projects
      loadMyProjects(); // Also load user's projects for "My Projects" view
    } else {
      currentUser = null;
      updateAuthNavigation();
      showView('gallery'); // Default to gallery if not logged in
      loadGalleryProjects(); // Load gallery projects for non-logged-in users
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    currentUser = null;
    updateAuthNavigation();
    showView('gallery'); // Fallback to gallery on error
    loadGalleryProjects(); // Load gallery projects on error
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    currentUser = data.user;
    updateAuthNavigation();
    showView('gallery'); // Go to gallery after login
    loadGalleryProjects();
    loadMyProjects();
    loginForm.reset();
  } catch (error) {
    console.error('Login error:', error);
    showError(error.message || 'Login failed. Please check your credentials.');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const artistName = document.getElementById('register-artist-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const description = document.getElementById('register-description').value;
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistName, email, password, description })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    currentUser = data.user; // User is auto-logged in by backend
    updateAuthNavigation();
    showView('gallery'); // Go to gallery after registration
    loadGalleryProjects();
    loadMyProjects();
    registerForm.reset();
  } catch (error) {
    console.error('Registration error:', error);
    showError(error.message || 'Registration failed. Please try again.');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    currentProject = null; // Clear current project on logout
    stopAudio(); // Stop any playing audio
    updateAuthNavigation();
    showView('gallery'); // Show gallery after logout
    loadGalleryProjects(); // Load gallery projects after logout
    // Clear project containers (gallery will be repopulated by loadGalleryProjects)
    if(myProjectsContainer) myProjectsContainer.innerHTML = '<div class="empty-message">Login to see your projects.</div>';
    if(tracksContainer) tracksContainer.innerHTML = '';
    if(cuesContainer) cuesContainer.innerHTML = '';


  } catch (error) {
    console.error('Logout error:', error);
    showError('Logout failed. Please try again.');
  }
}


// --- Project API Functions ---

// Fetch user's projects (My Projects)
async function loadMyProjects() {
  if (!currentUser) return; // Should not happen if called correctly
  try {
    const response = await fetch('/api/projects'); // This now fetches user's projects
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to load your projects');
    }
    const projects = await response.json();
    renderMyProjects(projects);
  } catch (error) {
    console.error('Error loading my projects:', error);
    showError(error.message || 'Failed to load your projects.');
    renderMyProjects([]); // Show empty state on error
  }
}

// Fetch all projects for the gallery
async function loadGalleryProjects() {
  try {
    const response = await fetch('/api/gallery/projects');
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to load gallery projects');
    }
    const projects = await response.json();
    renderGalleryProjects(projects);
  } catch (error) {
    console.error('Error loading gallery projects:', error);
    showError(error.message || 'Failed to load gallery projects.');
    renderGalleryProjects([]); // Show empty state on error
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
    
    // Reload user's projects and gallery projects
    loadMyProjects();
    loadGalleryProjects(); // Add this line
  } catch (error) {
    console.error('Error creating project:', error);
    // Check if error is due to unauthorized (e.g. session expired)
    if (error.message.toLowerCase().includes('unauthorized') || (error.response && error.response.status === 401)) {
        showError('Your session may have expired. Please login again.');
        handleLogout(); // Force logout
    } else {
    showError('Failed to create project. Please try again.');
    }
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
    
    // Reload user's projects
    loadMyProjects();
    // If the project was updated from the gallery view, reload gallery too
    if (currentView === 'gallery') {
        loadGalleryProjects();
    }
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.message.toLowerCase().includes('unauthorized') || (error.response && error.response.status === 401) ||
        error.message.toLowerCase().includes('forbidden') || (error.response && error.response.status === 403)) {
        showError('You are not authorized to perform this action or your session expired.');
        checkAuthStatus(); // Re-check auth, might log out
    } else {
        showError('Failed to update project. Please try again.');
    }
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
    
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete project');
    }
    
    // If the deleted project is the current one, go back to the previous view
    if (currentProject && currentProject.id === projectId) {
      handleBackButton(); // Go back to My Projects or Gallery
    }
    
    // Reload user's projects and gallery projects
    loadMyProjects();
    loadGalleryProjects();
  } catch (error) {
    console.error('Error deleting project:', error);
     if (error.message.toLowerCase().includes('unauthorized') || (error.response && error.response.status === 401) ||
        error.message.toLowerCase().includes('forbidden') || (error.response && error.response.status === 403)) {
        showError('You are not authorized to perform this action or your session expired.');
        checkAuthStatus();
    } else {
        showError('Failed to delete project. Please try again.');
    }
  }
}

// Load project details (for both gallery and my projects)
async function loadProjectDetails(projectId, autoPlay = false) { 
  console.log(`loadProjectDetails called for projectId: ${projectId}, autoPlay: ${autoPlay}. Current view: ${currentView}`);
  try {
    // Determine which API endpoint to use based on context
    // For simplicity, gallery projects already fetch tracks/cues.
    // If coming from "My Projects" or if owner clicks their project in gallery, use the owner-specific endpoint.
    // The gallery data structure already includes tracks and cues.
    
    let projectData;
    let sourceView = currentView; // Remember where we came from

    // If we have full project data from a gallery item that was clicked, and it's the same project,
    // and currentProject is already populated from that click, we might reuse it.
    // However, for "My Projects", we always need to fetch full details.
    // The gallery items from /api/gallery/projects already include tracks and cues.
    
    // Check if the globally stored currentProject is the one we want and already has details (e.g., from a gallery click)
    if (sourceView === 'gallery' && currentProject && currentProject.id === projectId && currentProject.tracks && currentProject.cuePoints) {
        // This 'project' would be the one passed from createProjectListItem if we decide to pass it.
        // For now, the click handler in createProjectListItem for gallery items also calls loadProjectDetails(project.id)
        // which means currentProject might not be set yet from the list item.
        // The gallery endpoint /api/gallery/projects returns projects with tracks and cues.
        // The /api/projects (My Projects list) does not.
        // The /api/projects/:projectId (owner detail view) returns full details.

        // Let's simplify: if the project object passed to createProjectListItem (and thus available in its scope)
        // already has tracks and cues (i.e., it came from the gallery API), we can use it.
        // This requires `project` to be in scope or passed to `loadProjectDetails`.
        // The current `loadProjectDetails(projectId)` only gets ID.

        // So, we always fetch unless currentProject is already set AND matches projectId AND has tracks/cues.
        // This check is more for re-entry or if currentProject was set by gallery item click.
        if (currentProject && currentProject.id === projectId && currentProject.tracks && currentProject.cuePoints) {
            console.log('Using already loaded currentProject data for gallery item.');
            projectData = currentProject;
        } else {
             console.log(`Fetching project details for ${projectId} from /api/projects/${projectId}`);
            // Fetch full details, this endpoint is protected for owners
            const response = await fetch(`/api/projects/${projectId}`); 
            if (!response.ok) {
                const errData = await response.json();
                console.error(`Failed to fetch project details for ${projectId}. Status: ${response.status}`, errData);
                if (response.status === 403 || response.status === 401) {
                     showError("You don't have permission to view these project details for editing, or your session expired.");
                     checkAuthStatus(); 
                     return; 
                }
                throw new Error(errData.error || 'Failed to load project details');
            }
            projectData = await response.json();
            console.log('Fetched projectData:', projectData);
        }
    } else { // Not from gallery, or gallery item data wasn't sufficient/available, so fetch.
        console.log(`Fetching project details for ${projectId} from /api/projects/${projectId} (not gallery path or data incomplete)`);
        const response = await fetch(`/api/projects/${projectId}`); 
        if (!response.ok) {
            const errData = await response.json();
            console.error(`Failed to fetch project details for ${projectId}. Status: ${response.status}`, errData);
            if (response.status === 403 || response.status === 401) {
                 showError("You don't have permission to view these project details for editing, or your session expired.");
                 checkAuthStatus(); 
                 return; 
            }
            throw new Error(errData.error || 'Failed to load project details');
        }
        projectData = await response.json();
        console.log('Fetched projectData:', projectData);
    }
    
    currentProject = projectData; 
    currentProject.isOwner = currentUser && currentUser.id === projectData.userId;
    console.log(`Set currentProject.isOwner to: ${currentProject.isOwner}`);
    
    console.log(`Calling showView('project-detail') from loadProjectDetails. Came from: ${sourceView}`);
    showView('project-detail', { cameFrom: sourceView }); 
    
    projectNameElement.textContent = currentProject.name;
    renderTracks(currentProject.tracks, currentProject.isOwner);
    renderCuePoints(currentProject.cuePoints, currentProject.isOwner);
    updateCueTimeline(); // Initialize cue timeline with project data

    if (autoPlay) {
      console.log(`Auto-playing project ${currentProject.name}`);
      playAudio();
    }

  } catch (error) {
    console.error('Error loading project details:', error);
    showError(error.message || 'Failed to load project details.');
    showView(currentView === 'my-projects' ? 'my-projects' : 'gallery'); // Go back to previous list view
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
    
    // Render updated tracks (pass ownership for conditional rendering)
    renderTracks(currentProject.tracks, currentProject.isOwner);
    
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
    
    // Render updated tracks (pass ownership)
    renderTracks(currentProject.tracks, currentProject.isOwner);
  } catch (error) {
    console.error('Error deleting track:', error);
    if (error.message.toLowerCase().includes('unauthorized') || (error.response && error.response.status === 401) ||
        error.message.toLowerCase().includes('forbidden') || (error.response && error.response.status === 403)) {
        showError('You are not authorized to perform this action or your session expired.');
        checkAuthStatus();
    } else {
        showError('Failed to delete track. Please try again.');
    }
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
    
    // Render updated cue points (pass ownership)
    renderCuePoints(currentProject.cuePoints, currentProject.isOwner);
    
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
    
    // Render updated cue points (pass ownership)
    renderCuePoints(currentProject.cuePoints, currentProject.isOwner);
    
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
    
    // Render updated cue points (pass ownership)
    renderCuePoints(currentProject.cuePoints, currentProject.isOwner);
    
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

// UI Functions

function updateAuthNavigation() {
  authNavigation.innerHTML = ''; // Clear existing
  if (currentUser) {
    const welcomeMsg = document.createElement('span');
    welcomeMsg.className = 'nav-text';
    welcomeMsg.textContent = `Welcome, ${escapeHtml(currentUser.artistName)}!`;
    authNavigation.appendChild(welcomeMsg);

    const logoutButton = document.createElement('button');
    logoutButton.id = 'logout-btn';
    logoutButton.className = 'nav-button auth-button';
    logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    logoutButton.addEventListener('click', handleLogout);
    authNavigation.appendChild(logoutButton);

    galleryNavBtn.classList.remove('hidden');
    myProjectsNavBtn.classList.remove('hidden');
  } else {
    const loginButton = document.createElement('button');
    loginButton.id = 'login-nav-btn';
    loginButton.className = 'nav-button auth-button';
    loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    loginButton.addEventListener('click', () => showView('login'));
    authNavigation.appendChild(loginButton);

    const registerButton = document.createElement('button');
    registerButton.id = 'register-nav-btn';
    registerButton.className = 'nav-button auth-button';
    registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    registerButton.addEventListener('click', () => showView('register'));
    authNavigation.appendChild(registerButton);
    
    galleryNavBtn.classList.add('hidden'); // Hide main nav if not logged in
    myProjectsNavBtn.classList.add('hidden');
  }
}

function showView(viewName, options = {}) {
  // Hide all main views and auth views
  [loginView, registerView, galleryView, myProjectsView, projectDetailView].forEach(v => v.classList.add('hidden'));
  
  currentView = viewName; // Update global current view state

  switch (viewName) {
    case 'login':
      loginView.classList.remove('hidden');
      backButton.classList.add('hidden');
      galleryNavBtn.classList.add('hidden');
      myProjectsNavBtn.classList.add('hidden');
      break;
    case 'register':
      registerView.classList.remove('hidden');
      backButton.classList.add('hidden');
      galleryNavBtn.classList.add('hidden');
      myProjectsNavBtn.classList.add('hidden');
      break;
    case 'gallery':
      galleryView.classList.remove('hidden');
      backButton.classList.add('hidden'); // No back button from gallery main
      if(currentUser) {
        galleryNavBtn.classList.remove('hidden');
        myProjectsNavBtn.classList.remove('hidden');
      }
      // loadGalleryProjects(); // Data loading should be triggered by auth status or nav click
      break;
    case 'my-projects':
      myProjectsView.classList.remove('hidden');
      backButton.classList.add('hidden'); // No back button from my-projects main
      if(currentUser) {
        galleryNavBtn.classList.remove('hidden');
        myProjectsNavBtn.classList.remove('hidden');
      }
      // loadMyProjects(); // Data loading should be triggered by auth status or nav click
      break;
    case 'project-detail':
      projectDetailView.classList.remove('hidden');
      // backButton.classList.remove('hidden'); // Removed as per request
      backButton.dataset.cameFrom = options.cameFrom || (currentUser ? 'my-projects' : 'gallery'); // Store where we came from
      if(currentUser) {
        galleryNavBtn.classList.remove('hidden');
        myProjectsNavBtn.classList.remove('hidden');
      }
      break;
  }
  updateAuthNavigation(); // Ensure auth nav is always correct for the view

  // Manage global player visibility
  if (globalPlayerControls) {
    if (viewName === 'login' || viewName === 'register' || !currentProject) {
      globalPlayerControls.classList.add('hidden');
    } else {
      // Show player if on gallery, my-projects, or project-detail AND a project is loaded
      if (['gallery', 'my-projects', 'project-detail'].includes(viewName) && currentProject) {
        globalPlayerControls.classList.remove('hidden');
      } else {
        // This case might not be strictly necessary if !currentProject already hides it
        globalPlayerControls.classList.add('hidden');
      }
    }
  }
}

function handleBackButton() {
    stopAudio();
    history.back();
}


// Render user's projects list (My Projects)
function renderMyProjects(projects) {
  myProjectsContainer.innerHTML = '';
  if (!projects || projects.length === 0) {
    myProjectsContainer.innerHTML = '<div class="empty-message">You haven\'t created any projects yet.</div>';
    return;
  }
  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // Sort by last updated
  projects.forEach(project => {
    const projectItem = createProjectListItem(project, true); // true for isOwner
    myProjectsContainer.appendChild(projectItem);
  });
}

// Render gallery projects list
function renderGalleryProjects(projects) {
  galleryProjectsContainer.innerHTML = '';
  if (!projects || projects.length === 0) {
    galleryProjectsContainer.innerHTML = '<div class="empty-message">No projects in the gallery yet.</div>';
    return;
  }
  // Projects from gallery are already sorted by backend (updatedAt DESC)
  projects.forEach(project => {
    const isOwner = currentUser && currentUser.id === project.userId;
    const projectItem = createProjectListItem(project, isOwner, true); // true for isGalleryItem
    galleryProjectsContainer.appendChild(projectItem);
  });
}

// Helper to create a project list item (for My Projects or Gallery)
function createProjectListItem(project, isOwner, isGalleryItem = false) {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    projectItem.dataset.projectId = project.id;

    const createdDate = new Date(project.createdAt).toLocaleDateString();
    const updatedDate = new Date(project.updatedAt).toLocaleDateString();
    let ownerInfo = '';
    if (isGalleryItem) {
        ownerInfo = `<div class="project-owner">By: ${escapeHtml(project.ownerArtistName || 'Unknown')}</div>`;
    }

    projectItem.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escapeHtml(project.name)}</div>
        ${ownerInfo}
        <div class="project-date">Created: ${createdDate} | Updated: ${updatedDate}</div>
      </div>
      <div class="project-actions">
        <button class="gallery-item-play-btn action-icon-btn" title="Play Project"><i class="fas fa-play"></i></button>
        ${isOwner ? `<button class="edit-btn action-icon-btn" title="Edit Project"><i class="fas fa-edit"></i></button>` : ''}
        ${isOwner ? `<button class="delete-btn action-icon-btn" title="Delete Project"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `;

    // Click on the item (but not on action buttons) to view details without auto-play
    projectItem.addEventListener('click', (e) => {
        if (e.target.closest('.project-actions')) {
            return; // Click was on an action button, not the item itself
        }
        console.log(`Project item (area) clicked for project ID: ${project.id}, Name: ${project.name}`);
        loadProjectDetails(project.id, false); // autoPlay = false
    });

    // Click on the specific play button in the list item to play immediately
    projectItem.querySelector('.gallery-item-play-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent projectItem click listener (which navigates to detail view)
        console.log(`Gallery item PLAY button clicked for project ID: ${project.id}, Name: ${project.name}`);
        
        // Set currentProject with the data from the gallery item
        // Gallery items from /api/gallery/projects should have tracks and cuePoints
        currentProject = project; 
        currentProject.isOwner = currentUser && currentUser.id === project.userId;

        // Ensure player UI elements are updated for this project
        if (globalPlayerControls) {
            globalPlayerControls.classList.remove('hidden');
        }
        
        // Update player UI elements like "Now Playing", total time, cue timeline
        // This might involve selecting a default/first track if currentTrack is not set or from another project
        currentTrack = null; // Reset currentTrack to ensure playAudio picks one from the new project
        
        // Update total time and cue timeline based on the new currentProject
        // Need to ensure audioPlayer.duration is available or use project.tracks[0].duration as fallback
        // For now, playAudio will handle initial track selection and metadata loading.
        // We might need to explicitly update some UI elements here if playAudio doesn't cover them before playing.
        if (currentProject.tracks && currentProject.tracks.length > 0) {
            const tempTrack = currentProject.tracks[0];
            if(currentTrackNameElement) currentTrackNameElement.textContent = tempTrack.originalName; // Tentative name
            if(totalTimeElement) totalTimeElement.textContent = formatTime(tempTrack.duration); // Tentative duration
        } else {
            if(currentTrackNameElement) currentTrackNameElement.textContent = "None";
            if(totalTimeElement) totalTimeElement.textContent = formatTime(0);
        }
        updateCueTimeline(); // Update cue timeline for the new project

        playAudio(); // Start playback
    });
    
    if (isOwner) {
        projectItem.querySelector('.edit-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          showEditProjectModal(project);
        });
        projectItem.querySelector('.delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteProject(project.id);
        });
    }
    return projectItem;
}


// Render tracks list (now accepts isOwner flag)
function renderTracks(tracks, isOwner = false) {
  tracksContainer.innerHTML = '';
  const uploadBtnContainer = document.getElementById('upload-track-btn').parentNode; // Get header of tracks section

  if (isOwner) {
    uploadBtnContainer.classList.remove('hidden');
  } else {
    uploadBtnContainer.classList.add('hidden');
  }

  if (!tracks || tracks.length === 0) {
    tracksContainer.innerHTML = `<div class="empty-message">No tracks yet. ${isOwner ? 'Upload some to get started!' : ''}</div>`;
    return;
  }
  
  tracks.forEach(track => {
    const trackItem = document.createElement('div');
    trackItem.className = 'track-item';
    trackItem.dataset.id = track.id;
    const duration = formatTime(track.duration);
    
    trackItem.innerHTML = `
      <div class="track-info">
        <button class="track-play-btn action-icon-btn" title="Play Track">
          <i class="fas fa-play"></i>
        </button>
        <div>
          <div class="track-name">${escapeHtml(track.originalName)}</div>
          <div class="track-duration">${duration}</div>
        </div>
      </div>
      <div class="track-actions">
        ${isOwner ? `<button class="delete-btn action-icon-btn" title="Delete Track"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `;
    
    trackItem.querySelector('.track-play-btn').addEventListener('click', () => playTrack(track));
    if (isOwner) {
      trackItem.querySelector('.delete-btn').addEventListener('click', () => deleteTrack(track.id));
    }
    tracksContainer.appendChild(trackItem);
  });
}

// Render cue points list (now accepts isOwner flag)
function renderCuePoints(cuePoints, isOwner = false) {
  cuesContainer.innerHTML = '';
  const addCueBtnContainer = document.getElementById('add-cue-btn').parentNode;

  if (isOwner) {
    addCueBtnContainer.classList.remove('hidden');
  } else {
    addCueBtnContainer.classList.add('hidden');
  }

  if (!cuePoints || cuePoints.length === 0) {
    cuesContainer.innerHTML = `<div class="empty-message">No cue points yet. ${isOwner ? 'Add some!' : ''}</div>`;
    updateCueTimeline(); // Still update timeline (it will clear if no cues)
    return;
  }
  
  cuePoints.sort((a, b) => a.time - b.time);
  cuePoints.forEach(cue => {
    if (!cueColors[cue.id]) cueColors[cue.id] = getRandomColor();
    const cueItem = document.createElement('div');
    cueItem.className = 'cue-item';
    const formattedTime = formatTime(cue.time);
    
    cueItem.innerHTML = `
      <span class="cue-color" style="background-color: ${cueColors[cue.id]}"></span>
      <div class="cue-time">${formattedTime}</div>
      <div class="cue-actions">
        ${isOwner ? `<button class="edit-btn action-icon-btn" title="Edit Cue Point"><i class="fas fa-edit"></i></button>` : ''}
        ${isOwner ? `<button class="delete-btn action-icon-btn" title="Delete Cue Point"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `;
    
    if (isOwner) {
      cueItem.querySelector('.edit-btn').addEventListener('click', () => showEditCueModal(cue));
      cueItem.querySelector('.delete-btn').addEventListener('click', () => deleteCuePoint(cue.id));
    }
    cuesContainer.appendChild(cueItem);
  });
  updateCueTimeline();
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
  document.getElementById('edit-cue-time-input').value = parseFloat(cue.time).toFixed(2);
  
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

    // Cue points are draggable only if the user is the owner AND is on the project detail view
    if (currentProject && currentProject.isOwner && currentView === 'project-detail') {
      dot.classList.add('draggable'); 
      dot.addEventListener('mousedown', (e) => {
        draggingCueId = cue.id;
        e.preventDefault();
      });
    } else {
      dot.classList.add('non-draggable'); 
    }
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
