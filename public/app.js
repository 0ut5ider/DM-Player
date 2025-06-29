// Global state
let currentUser = null;
let sessionId = null;
let currentProject = null;
let currentTrack = null;
let cueColors = {};
let draggingCueId = null;
let upcomingCuePoints = [];
let isPlaying = false;
let isTrackSwitching = false;
let isDragging = false;
let currentView = 'public-browse';
let currentProjectId = null;
let isPublicProject = false;
let currentBrowsePlayingProjectId = null; // Track which project is playing in browse view

// Project context state management
let currentPlayingProjectId = null;  // Which project's audio is currently playing
let currentViewingProjectId = null;  // Which project page we're currently viewing
let playingProjectData = null;       // Store the project data that's currently playing

// Router state
let isNavigating = false;

// DOM Elements
const publicBrowseView = document.getElementById('public-browse-view');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const userDashboardView = document.getElementById('user-dashboard-view');
const projectDetailView = document.getElementById('project-detail-view');
const backButton = document.getElementById('back-button');

// Dashboard tab elements
const projectsTab = document.getElementById('projects-tab');
const profileTab = document.getElementById('profile-tab');
const projectsTabContent = document.getElementById('projects-tab-content');
const profileTabContent = document.getElementById('profile-tab-content');

// Profile form elements
const profileForm = document.getElementById('profile-form');
const artistNameInput = document.getElementById('artist-name-input');
const bioInput = document.getElementById('bio-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const socialLinksContainer = document.getElementById('social-links-container');
const addSocialLinkBtn = document.getElementById('add-social-link-btn');

// Social link modal elements
const socialLinkModal = document.getElementById('social-link-modal');
const socialLinkForm = document.getElementById('social-link-form');
const socialLinkModalTitle = document.getElementById('social-link-modal-title');
const socialLinkIdInput = document.getElementById('social-link-id');
const socialLinkLabelInput = document.getElementById('social-link-label');
const socialLinkUrlInput = document.getElementById('social-link-url');

// Navigation elements
const anonymousNav = document.getElementById('anonymous-nav');
const authenticatedNav = document.getElementById('authenticated-nav');
const usernameDisplay = document.getElementById('username-display');

// Container elements
const publicProjectsContainer = document.getElementById('public-projects-container');
const userProjectsContainer = document.getElementById('user-projects-container');
const tracksContainer = document.getElementById('tracks-container');
const cuesContainer = document.getElementById('cues-container');

// Audio player elements
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
const cueTimeline = document.getElementById('cue-timeline');
const cuePlaybackIndicator = document.getElementById('cue-playback-indicator');
const cuePointsContainer = document.getElementById('cue-points-container');

// Project detail elements
const projectNameElement = document.getElementById('project-name');
const creatorNameElement = document.getElementById('creator-name');
const projectStatusElement = document.getElementById('project-status');
const projectControlsElement = document.getElementById('project-controls');
const uploadTrackBtn = document.getElementById('upload-track-btn');
const addCueBtn = document.getElementById('add-cue-btn');
const trackUploadInput = document.getElementById('track-upload-input');

// Modal elements
const overlay = document.getElementById('overlay');
const createProjectModal = document.getElementById('create-project-modal');
const editProjectModal = document.getElementById('edit-project-modal');
const addCueModal = document.getElementById('add-cue-modal');
const editCueModal = document.getElementById('edit-cue-modal');
const confirmModal = document.getElementById('confirm-modal');
const messageContainer = document.getElementById('message-container');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupRouter();
  checkAuthStatus();
  handleInitialRoute();
});

// Setup all event listeners
function setupEventListeners() {
  // Navigation
  document.getElementById('browse-public-btn').addEventListener('click', () => showPublicBrowse());
  document.getElementById('browse-public-auth-btn').addEventListener('click', () => showPublicBrowse());
  
  document.getElementById('show-login-btn').addEventListener('click', () => showLogin());
  document.getElementById('show-register-btn').addEventListener('click', () => showRegister());
  
  document.getElementById('my-projects-btn').addEventListener('click', () => showUserDashboard());
  document.getElementById('logout-btn').addEventListener('click', () => logout());
  
  // Auth form switches
  document.getElementById('switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
  });
  document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
  });
  
  // Auth forms
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  
  // Project management
  document.getElementById('create-project-btn').addEventListener('click', showCreateProjectModal);
  document.getElementById('create-project-form').addEventListener('submit', createProject);
  document.getElementById('edit-project-form').addEventListener('submit', updateProject);
  document.getElementById('edit-project-btn').addEventListener('click', showEditProjectModal);
  document.getElementById('toggle-status-btn').addEventListener('click', toggleProjectStatus);
  document.getElementById('delete-project-btn').addEventListener('click', deleteCurrentProject);
  
  // Track management
  uploadTrackBtn.addEventListener('click', () => trackUploadInput.click());
  trackUploadInput.addEventListener('change', uploadTracks);
  
  // Cue point management
  addCueBtn.addEventListener('click', showAddCueModal);
  document.getElementById('add-cue-form').addEventListener('submit', createCuePoint);
  document.getElementById('edit-cue-form').addEventListener('submit', updateCuePoint);
  
  // Player controls
  playButton.addEventListener('click', playAudio);
  pauseButton.addEventListener('click', pauseAudio);
  stopButton.addEventListener('click', stopAudio);
  progressBar.addEventListener('click', seekAudio);
  
  // Progress bar dragging
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
  
  // Back button
  backButton.addEventListener('click', handleBackButton);
  
  // Modal close buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Confirm modal
  document.getElementById('confirm-cancel').addEventListener('click', closeAllModals);
  
  overlay.addEventListener('click', closeAllModals);
  
  // Cue point dragging
  document.addEventListener('mousemove', handleCueDrag);
  document.addEventListener('mouseup', handleCueDragEnd);
  
  // Dashboard tabs
  if (projectsTab) projectsTab.addEventListener('click', () => showProjectsTab());
  if (profileTab) profileTab.addEventListener('click', () => showProfileTab());
  
  // Profile management
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
  if (addSocialLinkBtn) addSocialLinkBtn.addEventListener('click', () => showSocialLinkModal());
  if (socialLinkForm) socialLinkForm.addEventListener('submit', saveSocialLink);
  
  // Mini player controls (add event listeners after DOM is loaded)
  setTimeout(() => {
    const miniPlayBtn = document.getElementById('mini-play-btn');
    const miniPauseBtn = document.getElementById('mini-pause-btn');
    const miniStopBtn = document.getElementById('mini-stop-btn');
    const returnToProjectBtn = document.getElementById('return-to-project-btn');
    
    if (miniPlayBtn) miniPlayBtn.addEventListener('click', playAudio);
    if (miniPauseBtn) miniPauseBtn.addEventListener('click', pauseAudio);
    if (miniStopBtn) miniStopBtn.addEventListener('click', () => {
      stopAudio();
      hideMiniPlayer();
    });
    if (returnToProjectBtn) returnToProjectBtn.addEventListener('click', returnToProject);
  }, 100);
}

// Router Functions

function setupRouter() {
  // Handle browser back/forward navigation
  window.addEventListener('popstate', (event) => {
    if (!isNavigating) {
      handleRoute(window.location.pathname, false);
    }
  });
}

function handleInitialRoute() {
  const path = window.location.pathname;
  handleRoute(path, false);
}

function handleRoute(path, pushState = true) {
  if (isNavigating) return;
  
  isNavigating = true;
  
  // Update URL if needed
  if (pushState && window.location.pathname !== path) {
    window.history.pushState(null, '', path);
  }
  
  // Route to appropriate view
  if (path === '/') {
    routeToPublicBrowse();
  } else if (path === '/login') {
    routeToLogin();
  } else if (path === '/register') {
    routeToRegister();
  } else if (path === '/my-projects') {
    routeToUserDashboard();
  } else if (path.startsWith('/project/')) {
    const projectId = path.split('/')[2];
    if (projectId) {
      routeToProject(projectId);
    } else {
      routeToPublicBrowse(); // Fallback
    }
  } else {
    // Unknown route, redirect to home
    routeToPublicBrowse();
  }
  
  isNavigating = false;
}

function routeToPublicBrowse() {
  // Show mini-player when leaving project context with active audio
  if (currentView === 'project-detail' && isPlaying && currentProject && currentTrack) {
    showMiniPlayer();
  }
  
  hideAllViews();
  publicBrowseView.classList.remove('hidden');
  currentView = 'public-browse';
  updateNavButtons();
  updatePageTitle('Browse Music');
  loadPublicProjects();
}

function routeToLogin() {
  // Show mini-player when leaving project context with active audio
  if (currentView === 'project-detail' && isPlaying && currentProject && currentTrack) {
    showMiniPlayer();
  }
  
  hideAllViews();
  loginView.classList.remove('hidden');
  currentView = 'login';
  updateNavButtons();
  updatePageTitle('Login');
}

function routeToRegister() {
  // Show mini-player when leaving project context with active audio
  if (currentView === 'project-detail' && isPlaying && currentProject && currentTrack) {
    showMiniPlayer();
  }
  
  hideAllViews();
  registerView.classList.remove('hidden');
  currentView = 'register';
  updateNavButtons();
  updatePageTitle('Register');
}

function routeToUserDashboard() {
  if (!currentUser) {
    navigateTo('/login');
    return;
  }
  
  // Show mini-player when leaving project context with active audio
  if (currentView === 'project-detail' && isPlaying && currentProject && currentTrack) {
    showMiniPlayer();
  }
  
  hideAllViews();
  userDashboardView.classList.remove('hidden');
  currentView = 'user-dashboard';
  updateNavButtons();
  updatePageTitle('My Projects');
  loadUserProjects();
}

async function routeToProject(projectId) {
  try {
    currentProjectId = projectId;
    
    // Try to load as user's project first
    let endpoint = `/api/my/projects/${projectId}`;
    let response = await apiRequest(endpoint);
    let isPublic = false;
    
    // If not found or not authorized, try as public project
    if (!response.ok) {
      endpoint = `/api/public/projects/${projectId}`;
      response = await apiRequest(endpoint);
      isPublic = true;
    }
    
    if (!response.ok) {
      showMessage('Project not found.', 'error');
      navigateTo('/');
      return;
    }
    
    const projectData = await response.json();
    currentProject = projectData;
    isPublicProject = isPublic;
    
    // Only hide mini-player if returning to the currently playing project
    if (currentPlayingProjectId === projectId) {
      hideMiniPlayer();
    } else if (currentPlayingProjectId && isPlaying) {
      // Show mini-player when viewing a different project while audio is playing
      showMiniPlayer();
    }
    
    hideAllViews();
    projectDetailView.classList.remove('hidden');
    backButton.classList.remove('hidden');
    currentView = 'project-detail';
    updateNavButtons();
    updatePageTitle(projectData.name);
    
    // Update project context state
    updateProjectContextState();
    
    renderProjectDetails(projectData, isPublic);
    renderTracks(projectData.tracks || [], !isPublic);
    renderCuePoints(projectData.cuePoints || [], !isPublic);
  } catch (error) {
    console.error('Error loading project:', error);
    showMessage('Failed to load project.', 'error');
    navigateTo('/');
  }
}

function navigateTo(path) {
  if (window.location.pathname !== path) {
    handleRoute(path, true);
  }
}

function updatePageTitle(title) {
  document.title = title ? `${title} - DM Player` : 'DM Player - Open Music Library';
}

// Authentication Functions

async function checkAuthStatus() {
  const storedSessionId = localStorage.getItem('sessionId');
  if (!storedSessionId) {
    showAnonymousNav();
    return;
  }

  try {
    const response = await apiRequest('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${storedSessionId}` }
    });
    
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      sessionId = storedSessionId;
      showAuthenticatedNav();
    } else {
      localStorage.removeItem('sessionId');
      showAnonymousNav();
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem('sessionId');
    showAnonymousNav();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      sessionId = data.sessionId;
      localStorage.setItem('sessionId', sessionId);
      
      showAuthenticatedNav();
      showMessage('Login successful!', 'success');
      showUserDashboard();
    } else {
      const error = await response.json();
      showMessage(error.error || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Login failed. Please try again.', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  try {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    if (response.ok) {
      showMessage('Registration successful! Please login.', 'success');
      showLogin();
    } else {
      const error = await response.json();
      showMessage(error.error || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('Registration failed. Please try again.', 'error');
  }
}

async function logout() {
  try {
    if (sessionId) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  currentUser = null;
  sessionId = null;
  localStorage.removeItem('sessionId');
  showAnonymousNav();
  showPublicBrowse();
  showMessage('Logged out successfully', 'success');
}

// Navigation Functions

function showAnonymousNav() {
  anonymousNav.classList.remove('hidden');
  authenticatedNav.classList.add('hidden');
}

function showAuthenticatedNav() {
  anonymousNav.classList.add('hidden');
  authenticatedNav.classList.remove('hidden');
  usernameDisplay.textContent = currentUser.username;
}

function showPublicBrowse() {
  navigateTo('/');
}

function showLogin() {
  navigateTo('/login');
}

function showRegister() {
  navigateTo('/register');
}

function showUserDashboard() {
  navigateTo('/my-projects');
}

function showProjectDetail() {
  hideAllViews();
  projectDetailView.classList.remove('hidden');
  backButton.classList.remove('hidden');
  currentView = 'project-detail';
  updateNavButtons();
}

function hideAllViews() {
  publicBrowseView.classList.add('hidden');
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  userDashboardView.classList.add('hidden');
  projectDetailView.classList.add('hidden');
  backButton.classList.add('hidden');
}

function updateNavButtons() {
  // Remove active class from all nav buttons
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
  
  // Add active class to current view button
  if (currentView === 'public-browse') {
    document.getElementById('browse-public-btn').classList.add('active');
    document.getElementById('browse-public-auth-btn').classList.add('active');
  } else if (currentView === 'user-dashboard') {
    document.getElementById('my-projects-btn').classList.add('active');
  }
}

function handleBackButton() {
  // Show mini-player when navigating back from project detail with active audio
  if (currentView === 'project-detail' && isPlaying && currentProject && currentTrack) {
    showMiniPlayer();
  }
  
  if (currentUser) {
    showUserDashboard();
  } else {
    showPublicBrowse();
  }
}

// Mini Player Functions
function showMiniPlayer() {
  if (!currentProject || !currentTrack) return;
  
  const miniPlayer = document.getElementById('mini-player');
  if (!miniPlayer) return;
  
  // Update mini player content - show project name with track name styling
  const trackName = document.getElementById('mini-track-name');
  const projectName = document.getElementById('mini-project-name');
  
  // Use the track name element to display the project name (keeps the prominent styling)
  if (trackName) trackName.textContent = currentProject.name;
  // Hide the project name element since we're using the track name element instead
  if (projectName) projectName.style.display = 'none';
  
  miniPlayer.classList.remove('hidden');
}

function hideMiniPlayer() {
  const miniPlayer = document.getElementById('mini-player');
  if (miniPlayer) {
    miniPlayer.classList.add('hidden');
  }
}

function returnToProject() {
  if (playingProjectData) {
    navigateTo(`/project/${playingProjectData.id}`);
  }
}

function updateMiniPlayerControls() {
  const miniPlayBtn = document.getElementById('mini-play-btn');
  const miniPauseBtn = document.getElementById('mini-pause-btn');
  
  if (!miniPlayBtn || !miniPauseBtn) return;
  
  if (isPlaying) {
    miniPlayBtn.classList.add('hidden');
    miniPauseBtn.classList.remove('hidden');
    
    // Show mini player if not on project detail view and audio is playing
    if (currentView !== 'project-detail' && currentProject && currentTrack) {
      showMiniPlayer();
    }
  } else {
    miniPlayBtn.classList.remove('hidden');
    miniPauseBtn.classList.add('hidden');
  }
}

// API Functions

async function apiRequest(url, options = {}) {
  if (sessionId && !options.headers) {
    options.headers = {};
  }
  if (sessionId) {
    options.headers['Authorization'] = `Bearer ${sessionId}`;
  }
  
  return fetch(url, options);
}

async function loadPublicProjects() {
  try {
    const response = await apiRequest('/api/public/projects');
    if (!response.ok) throw new Error('Failed to load public projects');
    
    const groupedProjects = await response.json();
    renderPublicProjects(groupedProjects);
  } catch (error) {
    console.error('Error loading public projects:', error);
    publicProjectsContainer.innerHTML = '<div class="error-message">Failed to load public projects.</div>';
  }
}

async function loadUserProjects() {
  if (!currentUser) return;
  
  try {
    const response = await apiRequest('/api/my/projects');
    if (!response.ok) throw new Error('Failed to load user projects');
    
    const projects = await response.json();
    renderUserProjects(projects);
  } catch (error) {
    console.error('Error loading user projects:', error);
    userProjectsContainer.innerHTML = '<div class="error-message">Failed to load your projects.</div>';
  }
}

async function loadProjectDetails(projectId, isPublic = false) {
  try {
    const endpoint = isPublic ? `/api/public/projects/${projectId}` : `/api/my/projects/${projectId}`;
    const response = await apiRequest(endpoint);
    
    if (!response.ok) throw new Error('Failed to load project details');
    
    const projectData = await response.json();
    currentProject = projectData;
    
    showProjectDetail();
    renderProjectDetails(projectData, isPublic);
    renderTracks(projectData.tracks || [], !isPublic);
    renderCuePoints(projectData.cuePoints || [], !isPublic);
  } catch (error) {
    console.error('Error loading project details:', error);
    showMessage('Failed to load project details.', 'error');
  }
}

async function createProject(event) {
  event.preventDefault();
  
  const nameInput = document.getElementById('project-name-input');
  const name = nameInput.value.trim();
  
  if (!name) return;
  
  try {
    const response = await apiRequest('/api/my/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to create project');
    
    const newProject = await response.json();
    closeAllModals();
    nameInput.value = '';
    showMessage('Project created successfully!', 'success');
    loadUserProjects();
  } catch (error) {
    console.error('Error creating project:', error);
    showMessage('Failed to create project.', 'error');
  }
}

async function updateProject(event) {
  event.preventDefault();
  
  const projectId = document.getElementById('edit-project-id').value;
  const nameInput = document.getElementById('edit-project-name-input');
  const name = nameInput.value.trim();
  
  if (!name || !projectId) return;
  
  try {
    const response = await apiRequest(`/api/my/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (!response.ok) throw new Error('Failed to update project');
    
    const updatedProject = await response.json();
    closeAllModals();
    
    if (currentProject && currentProject.id === projectId) {
      currentProject.name = name;
      projectNameElement.textContent = name;
    }
    
    showMessage('Project updated successfully!', 'success');
    loadUserProjects();
  } catch (error) {
    console.error('Error updating project:', error);
    showMessage('Failed to update project.', 'error');
  }
}

async function toggleProjectStatus() {
  if (!currentProject) return;
  
  const newStatus = currentProject.status === 'draft' ? 'published' : 'draft';
  
  try {
    const response = await apiRequest(`/api/my/projects/${currentProject.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Failed to update project status');
    
    const updatedProject = await response.json();
    currentProject.status = updatedProject.status;
    currentProject.published_at = updatedProject.published_at;
    
    updateProjectStatusDisplay();
    showMessage(`Project ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!`, 'success');
  } catch (error) {
    console.error('Error updating project status:', error);
    showMessage('Failed to update project status.', 'error');
  }
}

async function deleteCurrentProject() {
  if (!currentProject) return;
  
  showConfirmModal(
    'Delete Project',
    `Are you sure you want to delete "${currentProject.name}"? This action cannot be undone.`,
    async () => {
      try {
        const response = await apiRequest(`/api/my/projects/${currentProject.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete project');
        
        showMessage('Project deleted successfully!', 'success');
        showUserDashboard();
      } catch (error) {
        console.error('Error deleting project:', error);
        showMessage('Failed to delete project.', 'error');
      }
    }
  );
}

async function uploadTracks() {
  if (!currentProject || !trackUploadInput.files.length) return;
  
  const formData = new FormData();
  for (let i = 0; i < trackUploadInput.files.length; i++) {
    formData.append('tracks', trackUploadInput.files[i]);
  }
  
  try {
    const response = await apiRequest(`/api/my/projects/${currentProject.id}/tracks`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Failed to upload tracks');
    
    const uploadedTracks = await response.json();
    currentProject.tracks = [...(currentProject.tracks || []), ...uploadedTracks];
    
    renderTracks(currentProject.tracks, true);
    trackUploadInput.value = '';
    showMessage('Tracks uploaded successfully!', 'success');
  } catch (error) {
    console.error('Error uploading tracks:', error);
    showMessage('Failed to upload tracks.', 'error');
  }
}

async function deleteTrack(trackId) {
  if (!currentProject) return;
  
  showConfirmModal(
    'Delete Track',
    'Are you sure you want to delete this track?',
    async () => {
      try {
        const response = await apiRequest(`/api/my/projects/${currentProject.id}/tracks/${trackId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete track');
        
        currentProject.tracks = currentProject.tracks.filter(t => t.id !== trackId);
        
        if (currentTrack && currentTrack.id === trackId) {
          stopAudio();
          currentTrack = null;
        }
        
        renderTracks(currentProject.tracks, true);
        showMessage('Track deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting track:', error);
        showMessage('Failed to delete track.', 'error');
      }
    }
  );
}

async function createCuePoint(event) {
  event.preventDefault();
  
  if (!currentProject) return;
  
  const timeInput = document.getElementById('cue-time-input');
  const time = parseFloat(timeInput.value);
  
  if (isNaN(time) || time < 0) return;
  
  try {
    const response = await apiRequest(`/api/my/projects/${currentProject.id}/cues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time })
    });
    
    if (!response.ok) throw new Error('Failed to create cue point');
    
    const newCuePoint = await response.json();
    closeAllModals();
    timeInput.value = '';
    
    currentProject.cuePoints = currentProject.cuePoints || [];
    currentProject.cuePoints.push(newCuePoint);
    currentProject.cuePoints.sort((a, b) => a.time - b.time);
    
    renderCuePoints(currentProject.cuePoints, true);
    
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
    
    showMessage('Cue point added successfully!', 'success');
  } catch (error) {
    console.error('Error creating cue point:', error);
    showMessage('Failed to create cue point.', 'error');
  }
}

async function updateCuePoint(event) {
  event.preventDefault();
  
  if (!currentProject) return;
  
  const cueId = document.getElementById('edit-cue-id').value;
  const timeInput = document.getElementById('edit-cue-time-input');
  const time = parseFloat(timeInput.value);
  
  if (!cueId || isNaN(time) || time < 0) return;
  
  try {
    const response = await apiRequest(`/api/my/projects/${currentProject.id}/cues/${cueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time })
    });
    
    if (!response.ok) throw new Error('Failed to update cue point');
    
    const updatedCuePoint = await response.json();
    closeAllModals();
    
    const index = currentProject.cuePoints.findIndex(c => c.id === cueId);
    if (index !== -1) {
      currentProject.cuePoints[index] = updatedCuePoint;
    }
    
    currentProject.cuePoints.sort((a, b) => a.time - b.time);
    renderCuePoints(currentProject.cuePoints, true);
    
    if (isPlaying) {
      updateUpcomingCuePoints();
    }
    
    showMessage('Cue point updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating cue point:', error);
    showMessage('Failed to update cue point.', 'error');
  }
}

async function deleteCuePoint(cueId) {
  if (!currentProject) return;
  
  showConfirmModal(
    'Delete Cue Point',
    'Are you sure you want to delete this cue point?',
    async () => {
      try {
        const response = await apiRequest(`/api/my/projects/${currentProject.id}/cues/${cueId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete cue point');
        
        currentProject.cuePoints = currentProject.cuePoints.filter(c => c.id !== cueId);
        renderCuePoints(currentProject.cuePoints, true);
        
        if (isPlaying) {
          updateUpcomingCuePoints();
        }
        
        showMessage('Cue point deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting cue point:', error);
        showMessage('Failed to delete cue point.', 'error');
      }
    }
  );
}

// Rendering Functions

function renderPublicProjects(groupedProjects) {
  publicProjectsContainer.innerHTML = '';
  
  const usernames = Object.keys(groupedProjects);
  if (usernames.length === 0) {
    publicProjectsContainer.innerHTML = '<div class="empty-message">No public projects available yet.</div>';
    return;
  }
  
  usernames.sort().forEach(username => {
    const userData = groupedProjects[username];
    const profile = userData.profile;
    const projects = userData.projects;
    
    const userSection = document.createElement('div');
    userSection.className = 'user-section';
    
    // Enhanced user header with profile information
    const userHeader = document.createElement('div');
    userHeader.className = 'user-header';
    
    const userTitle = document.createElement('div');
    userTitle.className = 'user-title';
    
    const artistName = profile.artist_name || username;
    const displayTitle = profile.artist_name ? 
      `Music by ${artistName}` : 
      `Music by ${username}`;
    
    userTitle.innerHTML = `
      <h3>${escapeHtml(displayTitle)}</h3>
      ${profile.artist_name ? `<span class="username-badge">@${escapeHtml(username)}</span>` : ''}
    `;
    
    userHeader.appendChild(userTitle);
    
    // Add bio excerpt if available
    if (profile.bio) {
      const bioExcerpt = profile.bio.length > 150 ? 
        profile.bio.substring(0, 150) + '...' : 
        profile.bio;
      
      const bioElement = document.createElement('div');
      bioElement.className = 'user-bio-excerpt';
      bioElement.textContent = bioExcerpt;
      userHeader.appendChild(bioElement);
    }
    
    // Add social links if available
    loadUserSocialLinks(username, userHeader);
    
    userSection.appendChild(userHeader);
    
    const projectsGrid = document.createElement('div');
    projectsGrid.className = 'projects-grid';
    
    projects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.className = 'project-card';
      
      const publishedDate = new Date(project.published_at).toLocaleDateString();
      const isCurrentlyPlaying = currentBrowsePlayingProjectId === project.id && isPlaying;
      
      projectCard.innerHTML = `
        <div class="project-card-header">
          <h4 class="project-title-link" style="cursor: pointer; color: #007bff; text-decoration: underline;">${escapeHtml(project.name)}</h4>
          <span class="published-date">Published ${publishedDate}</span>
        </div>
        <div class="project-card-actions">
          <button class="play-project-btn" data-project-id="${project.id}">
            <i class="fas fa-${isCurrentlyPlaying ? 'stop' : 'play'}"></i> ${isCurrentlyPlaying ? 'Stop Listen' : 'Listen'}
          </button>
        </div>
      `;
      
      // Make project title clickable - navigates to project page
      projectCard.querySelector('.project-title-link').addEventListener('click', () => {
        navigateTo(`/project/${project.id}`);
      });
      
      // Listen button - direct play/stop control
      projectCard.querySelector('.play-project-btn').addEventListener('click', () => {
        handleBrowsePlayControl(project);
      });
      
      projectsGrid.appendChild(projectCard);
    });
    
    userSection.appendChild(projectsGrid);
    publicProjectsContainer.appendChild(userSection);
  });
}

// Helper function to load and display social links for a user
async function loadUserSocialLinks(username, headerElement) {
  try {
    const response = await apiRequest(`/api/users/${username}/profile`);
    if (!response.ok) return;
    
    const data = await response.json();
    const socialLinks = data.socialLinks || [];
    
    if (socialLinks.length > 0) {
      const socialLinksContainer = document.createElement('div');
      socialLinksContainer.className = 'user-social-links';
      
      socialLinks.slice(0, 4).forEach(link => { // Limit to 4 links for space
        const linkElement = document.createElement('a');
        linkElement.className = 'user-social-link';
        linkElement.href = link.url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.textContent = link.label;
        
        socialLinksContainer.appendChild(linkElement);
      });
      
      headerElement.appendChild(socialLinksContainer);
    }
  } catch (error) {
    console.error('Error loading social links for user:', username, error);
    // Silently fail - social links are optional
  }
}

function renderUserProjects(projects) {
  userProjectsContainer.innerHTML = '';
  
  if (projects.length === 0) {
    userProjectsContainer.innerHTML = '<div class="empty-message">No projects yet. Create one to get started!</div>';
    return;
  }
  
  projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  projects.forEach(project => {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    
    const createdDate = new Date(project.created_at).toLocaleDateString();
    const statusClass = project.status === 'published' ? 'published' : 'draft';
    
    projectItem.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-meta">
          <span class="project-date">Created: ${createdDate}</span>
          <span class="status-badge ${statusClass}">${project.status}</span>
        </div>
      </div>
      <div class="project-actions">
        <button class="edit-btn" title="Edit Project"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" title="Delete Project"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    projectItem.addEventListener('click', (e) => {
      if (e.target.closest('.project-actions')) return;
      navigateTo(`/project/${project.id}`);
    });
    
    projectItem.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showEditProjectModal(project);
    });
    
    projectItem.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProjectById(project.id);
    });
    
    userProjectsContainer.appendChild(projectItem);
  });
}

function renderProjectDetails(project, isPublic) {
  projectNameElement.textContent = project.name;
  
  if (project.username) {
    creatorNameElement.textContent = project.username;
    document.getElementById('project-creator').classList.remove('hidden');
  } else {
    document.getElementById('project-creator').classList.add('hidden');
  }
  
  updateProjectStatusDisplay();
  
  // Show/hide controls based on ownership
  if (isPublic || !currentUser || (currentUser && project.user_id !== currentUser.id)) {
    projectControlsElement.classList.add('hidden');
    uploadTrackBtn.classList.add('hidden');
    addCueBtn.classList.add('hidden');
  } else {
    projectControlsElement.classList.remove('hidden');
    uploadTrackBtn.classList.remove('hidden');
    addCueBtn.classList.remove('hidden');
  }
}

function updateProjectStatusDisplay() {
  if (!currentProject) return;
  
  const statusClass = currentProject.status === 'published' ? 'published' : 'draft';
  projectStatusElement.className = `status-badge ${statusClass}`;
  projectStatusElement.textContent = currentProject.status;
  
  const toggleBtn = document.getElementById('toggle-status-btn');
  const toggleText = document.getElementById('status-toggle-text');
  
  if (currentProject.status === 'published') {
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> <span id="status-toggle-text">Unpublish</span>';
  } else {
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i> <span id="status-toggle-text">Publish</span>';
  }
}

function renderTracks(tracks, canEdit) {
  tracksContainer.innerHTML = '';
  const uploadBtnContainer = document.getElementById('upload-track-btn').parentNode; // Get header of tracks section

  if (canEdit) {
    uploadBtnContainer.classList.remove('hidden');
  } else {
    uploadBtnContainer.classList.add('hidden');
  }

  if (!tracks || tracks.length === 0) {
    tracksContainer.innerHTML = '<div class="empty-message">No tracks yet.</div>';
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
          <div class="track-name">${escapeHtml(track.original_name)}</div>
          <div class="track-duration">${duration}</div>
        </div>
      </div>
      ${canEdit ? `
        <div class="track-actions">
          <button class="delete-btn" title="Delete Track"><i class="fas fa-trash"></i></button>
        </div>
      ` : ''}
    `;
    
    trackItem.querySelector('.track-play-btn').addEventListener('click', () => {
      playTrack(track);
    });
    
    if (canEdit) {
      trackItem.querySelector('.delete-btn').addEventListener('click', () => {
        deleteTrack(track.id);
      });
    }
    
    tracksContainer.appendChild(trackItem);
  });
}

function renderCuePoints(cuePoints, canEdit) {
  cuesContainer.innerHTML = '';
  const addCueBtnContainer = document.getElementById('add-cue-btn').parentNode;

  if (canEdit) {
    addCueBtnContainer.classList.remove('hidden');
  } else {
    addCueBtnContainer.classList.add('hidden');
  }

  if (!cuePoints || cuePoints.length === 0) {
    cuesContainer.innerHTML = '<div class="empty-message">No cue points yet.</div>';
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
      ${canEdit ? `
        <div class="cue-actions">
          <button class="edit-btn" title="Edit Cue Point"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" title="Delete Cue Point"><i class="fas fa-trash"></i></button>
        </div>
      ` : ''}
    `;
    
    if (canEdit) {
      cueItem.querySelector('.edit-btn').addEventListener('click', () => {
        showEditCueModal(cue);
      });
      
      cueItem.querySelector('.delete-btn').addEventListener('click', () => {
        deleteCuePoint(cue.id);
      });
    }
    
    cuesContainer.appendChild(cueItem);
  });
  updateCueTimeline();
}

// Modal Functions

function showCreateProjectModal() {
  createProjectModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.getElementById('project-name-input').focus();
}

function showEditProjectModal(project) {
  if (!project && currentProject) {
    project = currentProject;
  }
  
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

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  
  const confirmBtn = document.getElementById('confirm-ok');
  confirmBtn.onclick = () => {
    closeAllModals();
    onConfirm();
  };
  
  confirmModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeAllModals() {
  createProjectModal.classList.add('hidden');
  editProjectModal.classList.add('hidden');
  addCueModal.classList.add('hidden');
  editCueModal.classList.add('hidden');
  confirmModal.classList.add('hidden');
  socialLinkModal.classList.add('hidden');
  overlay.classList.add('hidden');
}

// Audio Player Functions

function setAudioSource(track) {
  if (!track || !currentProject) return;
  
  // Include session token as query parameter if user is logged in
  let audioUrl = `/projects/${currentProject.id}/audio/${track.id}.mp3`;
  if (sessionId) {
    audioUrl += `?session=${sessionId}`;
  }
  
  audioPlayer.src = audioUrl;
  currentTrackNameElement.textContent = track.original_name;
  
  // Add error handling for audio loading
  audioPlayer.addEventListener('error', function onAudioError(e) {
    console.error('Audio loading error:', audioPlayer.error);
    let errorMessage = 'Failed to load audio file. ';
    
    if (audioPlayer.error) {
      switch (audioPlayer.error.code) {
        case audioPlayer.error.MEDIA_ERR_ABORTED:
          errorMessage += 'Loading was aborted.';
          break;
        case audioPlayer.error.MEDIA_ERR_NETWORK:
          errorMessage += 'Network error occurred.';
          break;
        case audioPlayer.error.MEDIA_ERR_DECODE:
          errorMessage += 'Audio file is corrupted or unsupported.';
          break;
        case audioPlayer.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage += 'Audio format not supported.';
          break;
        default:
          errorMessage += 'Unknown error occurred.';
      }
    }
    
    showMessage(errorMessage, 'error');
    audioPlayer.removeEventListener('error', onAudioError);
  }, { once: true });
}

function playTrack(track) {
  if (!track) return;
  
  currentTrack = track;
  setAudioSource(track);
  
  // Set playing project context
  if (currentProject) {
    setPlayingProjectContext(currentProject.id, currentProject);
  }
  
  playAudio();
}

function playAudio() {
  // If we're viewing a different project than what's currently playing, start this project's audio
  if (currentPlayingProjectId && currentProject && currentPlayingProjectId !== currentProject.id) {
    // Stop current audio and start new project
    stopAudio();
    // Clear the playing project context
    clearPlayingProjectContext();
  }
  
  if (!currentProject || !currentProject.tracks || !currentProject.tracks.length) {
    showMessage('No tracks available to play.', 'error');
    return;
  }
  
  if (!currentTrack) {
    const randomIndex = Math.floor(Math.random() * currentProject.tracks.length);
    currentTrack = currentProject.tracks[randomIndex];
    setAudioSource(currentTrack);
  }
  
  // Set playing project context
  if (currentProject) {
    setPlayingProjectContext(currentProject.id, currentProject);
  }
  
  // Add loading state
  playButton.disabled = true;
  playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      playButton.classList.add('hidden');
      pauseButton.classList.remove('hidden');
      playButton.disabled = false;
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      updateUpcomingCuePoints();
      updateMiniPlayerControls();
    })
    .catch(error => {
      console.error('Error playing audio:', error);
      playButton.disabled = false;
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      
      // Provide more specific error messages
      let errorMessage = 'Failed to play audio. ';
      if (error.name === 'NotSupportedError') {
        errorMessage += 'The audio file format is not supported or the file is corrupted.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage += 'Audio playback was blocked. Please interact with the page first.';
      } else if (error.name === 'AbortError') {
        errorMessage += 'Audio loading was interrupted.';
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      showMessage(errorMessage, 'error');
      
      // Try to load a different track if available
      if (currentProject.tracks.length > 1) {
        setTimeout(() => {
          const otherTracks = currentProject.tracks.filter(t => t.id !== currentTrack.id);
          if (otherTracks.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherTracks.length);
            currentTrack = otherTracks[randomIndex];
            setAudioSource(currentTrack);
            showMessage('Trying alternative track...', 'info');
          }
        }, 1000);
      }
    });
}

function pauseAudio() {
  audioPlayer.pause();
  isPlaying = false;
  pauseButton.classList.add('hidden');
  playButton.classList.remove('hidden');
  updateMiniPlayerControls();
  
  // Update browse view button states
  updateBrowseButtonStates();
}

function stopAudio() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  isPlaying = false;
  pauseButton.classList.add('hidden');
  playButton.classList.remove('hidden');
  progressIndicator.style.width = '0%';
  currentTimeElement.textContent = '0:00';
  updateMiniPlayerControls();
  
  // Clear playing project context when stopping audio
  clearPlayingProjectContext();
  
  // Update browse view button states if we're stopping browse audio
  if (currentBrowsePlayingProjectId) {
    currentBrowsePlayingProjectId = null;
    updateBrowseButtonStates();
  }
}

function seekAudio(event) {
  if (!audioPlayer.duration) return;
  
  const rect = progressBar.getBoundingClientRect();
  const pos = (event.clientX - rect.left) / rect.width;
  const newTime = Math.max(0, Math.min(1, pos)) * audioPlayer.duration;
  audioPlayer.currentTime = newTime;
  
  if (currentProject && currentProject.cuePoints && currentProject.cuePoints.length) {
    const sorted = currentProject.cuePoints.slice().sort((a, b) => a.time - b.time);
    if (newTime >= sorted[0].time) {
      switchToRandomTrack();
      return;
    }
  }
  
  if (isPlaying) {
    updateUpcomingCuePoints();
    updateCueTimeline();
  }
}

function updateProgress() {
  if (isDragging) return;
  if (!audioPlayer.duration) return;
  
  const currentTime = audioPlayer.currentTime;
  const duration = audioPlayer.duration;
  
  // Only update progress UI when viewing the playing project or in browse view
  const shouldUpdateProgress = isViewingPlayingProject() || currentView === 'public-browse';
  
  if (shouldUpdateProgress && isPlaying) {
    const progress = (currentTime / duration) * 100;
    progressIndicator.style.width = `${progress}%`;
    progressHandle.style.left = `${progress}%`;
    cuePlaybackIndicator.style.width = `${progress}%`;
    
    currentTimeElement.textContent = formatTime(currentTime);
  }
  
  // Always check cue points regardless of view (for track switching logic)
  checkCuePoints();
  
  // Update UI visibility
  updateAudioUIVisibility();
}

function updateTotalTime() {
  if (!audioPlayer.duration) return;
  totalTimeElement.textContent = formatTime(audioPlayer.duration);
}

function handleTrackEnd() {
  switchToRandomTrack();
}

function updateUpcomingCuePoints() {
  if (!currentProject || !currentProject.cuePoints || !currentProject.cuePoints.length || !isPlaying) {
    upcomingCuePoints = [];
    return;
  }
  
  const currentTime = audioPlayer.currentTime;
  upcomingCuePoints = currentProject.cuePoints
    .filter(cue => cue.time > currentTime)
    .sort((a, b) => a.time - b.time);
}

function checkCuePoints() {
  if (!isPlaying || !upcomingCuePoints.length || isTrackSwitching || audioPlayer.readyState === 0) return;

  const currentTime = audioPlayer.currentTime;

  if (currentTime >= upcomingCuePoints[0].time) {
    const passedCuePoint = upcomingCuePoints.shift();
    console.log(`Passed cue point at ${passedCuePoint.time}s`);
    switchToRandomTrack();
  }
}

function switchToRandomTrack() {
  if (isTrackSwitching) {
    console.log('Track switch already in progress, skipping.');
    return;
  }
  if (!currentProject || !currentProject.tracks || !currentProject.tracks.length) {
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
      updateUpcomingCuePoints();
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const newTrack = availableTracks[randomIndex];
    const previousTime = audioPlayer.currentTime;

    console.log(`Switching from ${currentTrack?.original_name || 'None'} to track: ${newTrack.original_name} at time ${previousTime.toFixed(2)}s`);

    currentTrack = newTrack;
    
    // Include session token as query parameter if user is logged in
    let audioUrl = `/projects/${currentProject.id}/audio/${newTrack.id}.mp3`;
    if (sessionId) {
      audioUrl += `?session=${sessionId}`;
    }
    
    audioPlayer.src = audioUrl;
    currentTrackNameElement.textContent = newTrack.original_name;

    audioPlayer.addEventListener('loadedmetadata', function onMetadataLoaded() {
      console.log(`Metadata loaded for ${newTrack.original_name}. Duration: ${audioPlayer.duration.toFixed(2)}s`);
      try {
        const seekTime = Math.min(previousTime, audioPlayer.duration);
        console.log(`Seeking ${newTrack.original_name} to: ${seekTime.toFixed(2)}s`);
        
        if (audioPlayer.readyState >= 1) {
          audioPlayer.currentTime = seekTime;
        } else {
          console.warn('Audio not ready for seeking, playback might start from 0.');
        }

        if (!isPlaying) {
          console.log('Playback was stopped during track switch. Aborting play.');
          updateUpcomingCuePoints();
          isTrackSwitching = false;
          return;
        }

        audioPlayer.play()
          .then(() => {
            console.log(`Playback started for ${newTrack.original_name} at ${audioPlayer.currentTime.toFixed(2)}s`);
            updateUpcomingCuePoints();
            isTrackSwitching = false;
            
            // Update mini-player if it's visible
            if (currentView !== 'project-detail') {
              showMiniPlayer();
            }
            
            console.log('Track switch complete.');
          })
          .catch(error => {
            console.error('Error playing audio after switch:', error);
            updateUpcomingCuePoints();
            isTrackSwitching = false;
          });
      } catch (error) {
        console.error('Error during loadedmetadata handling:', error);
        updateUpcomingCuePoints();
        isTrackSwitching = false;
      }
    }, { once: true });

    audioPlayer.addEventListener('error', function onError(e) {
      console.error(`Error loading audio source ${audioPlayer.src}:`, audioPlayer.error, e);
      updateUpcomingCuePoints();
      isTrackSwitching = false;
    }, { once: true });

  } catch (error) {
    console.error('Error during track switch setup:', error);
    updateUpcomingCuePoints();
    isTrackSwitching = false;
  }
}

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
  
  // Always show cue points when viewing a project detail page
  if (currentView === 'project-detail' || currentView === 'public-browse') {
    cuePointsContainer.innerHTML = '';
    
    // Check if project has cue points and they exist as an array with length
    if (currentProject.cuePoints && Array.isArray(currentProject.cuePoints) && currentProject.cuePoints.length > 0) {
      currentProject.cuePoints.forEach(cue => {
        if (!cueColors[cue.id]) cueColors[cue.id] = getRandomColor();
        const dot = document.createElement('div');
        dot.className = 'cue-point';
        dot.style.left = (cue.time / duration * 100) + '%';
        dot.style.backgroundColor = cueColors[cue.id];
        
        // Only allow dragging if user can edit (owns the project)
        if (!isPublicProject && currentUser) {
          dot.addEventListener('mousedown', (e) => {
            draggingCueId = cue.id;
            e.preventDefault();
          });
        }
        
        cuePointsContainer.appendChild(dot);
      });
    }
    // If no cue points exist, the container remains empty (already cleared above)
    
    // Only show progress indicator when viewing the playing project AND audio is playing
    const shouldShowProgress = isViewingPlayingProject() || currentView === 'public-browse';
    if (shouldShowProgress && isPlaying && isViewingPlayingProject()) {
      const progress = (audioPlayer.currentTime / duration) * 100;
      cuePlaybackIndicator.style.width = progress + '%';
    } else {
      cuePlaybackIndicator.style.width = '0%';
    }
  } else {
    // Clear cue timeline when not in project context
    cuePointsContainer.innerHTML = '';
    cuePlaybackIndicator.style.width = '0%';
  }
}

function handleCueDrag(e) {
  if (!draggingCueId) return;
  const rect = cueTimeline.getBoundingClientRect();
  let pos = (e.clientX - rect.left) / rect.width;
  pos = Math.max(0, Math.min(1, pos));
  const duration = audioPlayer.duration || (currentProject && currentProject.tracks && currentProject.tracks.length > 0 ? currentProject.tracks[0].duration : 0);
  if (!duration) return;
  const newTime = pos * duration;
  const cue = currentProject.cuePoints.find(c => c.id === draggingCueId);
  if (cue) cue.time = newTime;
  updateCueTimeline();
}

function handleCueDragEnd() {
  if (!draggingCueId) return;
  const id = draggingCueId;
  draggingCueId = null;
  
  apiRequest(`/api/my/projects/${currentProject.id}/cues/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ time: currentProject.cuePoints.find(c => c.id === id).time })
  }).catch(err => console.error('Cue drag update failed', err));
  
  renderCuePoints(currentProject.cuePoints, true);
}

// Browse View Audio Control Functions

async function handleBrowsePlayControl(project) {
  const isCurrentlyPlaying = currentBrowsePlayingProjectId === project.id && isPlaying;
  
  if (isCurrentlyPlaying) {
    // Stop current audio
    stopBrowseAudio();
  } else {
    // Start playing this project
    await playBrowseProject(project);
  }
}

async function playBrowseProject(project) {
  try {
    // Stop any currently playing audio
    if (isPlaying) {
      stopBrowseAudio();
    }
    
    // Load project data
    const response = await apiRequest(`/api/public/projects/${project.id}`);
    if (!response.ok) {
      showMessage('Failed to load project for playback.', 'error');
      return;
    }
    
    const projectData = await response.json();
    
    if (!projectData.tracks || projectData.tracks.length === 0) {
      showMessage('No tracks available in this project.', 'error');
      return;
    }
    
    // Set up the project for playback
    currentProject = projectData;
    currentBrowsePlayingProjectId = project.id;
    
    // Select a random track to start with
    const randomIndex = Math.floor(Math.random() * projectData.tracks.length);
    currentTrack = projectData.tracks[randomIndex];
    
    // Set audio source and play
    setAudioSource(currentTrack);
    
    // Add loading state to the button
    const playBtn = document.querySelector(`[data-project-id="${project.id}"]`);
    if (playBtn) {
      playBtn.disabled = true;
      playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }
    
    audioPlayer.play()
      .then(() => {
        isPlaying = true;
        
        // Set playing project context
        setPlayingProjectContext(project.id, projectData);
        
        updateUpcomingCuePoints();
        updateBrowseButtonStates();
        showMessage(`Now playing: ${currentTrack.original_name}`, 'success');
      })
      .catch(error => {
        console.error('Error playing audio:', error);
        showMessage('Failed to play audio. Please try again.', 'error');
        currentBrowsePlayingProjectId = null;
        updateBrowseButtonStates();
      });
      
  } catch (error) {
    console.error('Error loading project for playback:', error);
    showMessage('Failed to load project for playback.', 'error');
    currentBrowsePlayingProjectId = null;
    updateBrowseButtonStates();
  }
}

function stopBrowseAudio() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  isPlaying = false;
  currentBrowsePlayingProjectId = null;
  updateBrowseButtonStates();
  showMessage('Audio stopped.', 'info');
}

function updateBrowseButtonStates() {
  // Update all project card buttons in the browse view
  const playButtons = document.querySelectorAll('.play-project-btn[data-project-id]');
  
  playButtons.forEach(button => {
    const projectId = button.getAttribute('data-project-id');
    const isCurrentlyPlaying = currentBrowsePlayingProjectId === projectId && isPlaying;
    
    button.disabled = false;
    if (isCurrentlyPlaying) {
      button.innerHTML = '<i class="fas fa-stop"></i> Stop Listen';
    } else {
      button.innerHTML = '<i class="fas fa-play"></i> Listen';
    }
  });
}

// Project Context Helper Functions

function isViewingPlayingProject() {
  return currentPlayingProjectId && currentViewingProjectId && 
         currentPlayingProjectId === currentViewingProjectId;
}

function shouldShowAudioControls() {
  return isViewingPlayingProject() || currentView === 'public-browse';
}

function updateProjectContextState() {
  // Update viewing project ID based on current view and project
  if (currentView === 'project-detail' && currentProject) {
    currentViewingProjectId = currentProject.id;
  } else {
    currentViewingProjectId = null;
  }
  
  // Update UI based on context match
  updateAudioUIVisibility();
}

function updateAudioUIVisibility() {
  const isContextMatch = isViewingPlayingProject();
  const showControls = shouldShowAudioControls();
  
  // Progress bar elements
  const progressElements = [
    progressIndicator,
    progressHandle,
    currentTimeElement,
    totalTimeElement
  ];
  
  // Cue timeline elements
  const cueElements = [
    cueTimeline,
    cuePlaybackIndicator,
    cuePointsContainer
  ];
  
  // Show/hide progress elements based on context
  progressElements.forEach(element => {
    if (element) {
      if (showControls && isPlaying) {
        element.style.visibility = isContextMatch ? 'visible' : 'hidden';
      } else {
        element.style.visibility = 'visible';
      }
    }
  });
  
  // Show/hide cue elements based on context
  cueElements.forEach(element => {
    if (element) {
      if (showControls && isPlaying) {
        element.style.visibility = isContextMatch ? 'visible' : 'hidden';
      } else {
        element.style.visibility = 'visible';
      }
    }
  });
  
  // Update track name display
  if (currentTrackNameElement) {
    if (isPlaying && !isContextMatch && currentView === 'project-detail') {
      currentTrackNameElement.textContent = 'Audio playing from different project';
      currentTrackNameElement.style.fontStyle = 'italic';
      currentTrackNameElement.style.opacity = '0.7';
    } else if (currentTrack) {
      currentTrackNameElement.textContent = currentTrack.original_name;
      currentTrackNameElement.style.fontStyle = 'normal';
      currentTrackNameElement.style.opacity = '1';
    }
  }
}

function setPlayingProjectContext(projectId, projectData) {
  currentPlayingProjectId = projectId;
  playingProjectData = projectData;
  updateProjectContextState();
}

function clearPlayingProjectContext() {
  currentPlayingProjectId = null;
  playingProjectData = null;
  updateProjectContextState();
  hideMiniPlayer();
}

// Helper Functions

async function deleteProjectById(projectId) {
  showConfirmModal(
    'Delete Project',
    'Are you sure you want to delete this project? This action cannot be undone.',
    async () => {
      try {
        const response = await apiRequest(`/api/my/projects/${projectId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete project');
        
        showMessage('Project deleted successfully!', 'success');
        loadUserProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        showMessage('Failed to delete project.', 'error');
      }
    }
  );
}

function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  messageContainer.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.classList.add('fade-out');
    setTimeout(() => {
      if (messageContainer.contains(messageDiv)) {
        messageContainer.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');

  return `${minutes}:${paddedSeconds}`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// Dashboard Tab Functions

function showProjectsTab() {
  // Update tab buttons
  projectsTab.classList.add('active');
  profileTab.classList.remove('active');
  
  // Update tab content
  projectsTabContent.classList.remove('hidden');
  profileTabContent.classList.add('hidden');
}

function showProfileTab() {
  // Update tab buttons
  profileTab.classList.add('active');
  projectsTab.classList.remove('active');
  
  // Update tab content
  profileTabContent.classList.remove('hidden');
  projectsTabContent.classList.add('hidden');
  
  // Load profile data when switching to profile tab
  loadUserProfile();
}

// Profile Management Functions

async function loadUserProfile() {
  if (!currentUser) return;
  
  try {
    const response = await apiRequest('/api/my/profile');
    if (!response.ok) throw new Error('Failed to load profile');
    
    const data = await response.json();
    populateProfileForm(data.profile, data.socialLinks);
  } catch (error) {
    console.error('Error loading profile:', error);
    showMessage('Failed to load profile data.', 'error');
  }
}

function populateProfileForm(profile, socialLinks) {
  // Populate form fields
  if (artistNameInput) {
    artistNameInput.value = profile.artist_name || '';
  }
  if (bioInput) {
    bioInput.value = profile.bio || '';
  }
  
  // Render social links
  renderSocialLinks(socialLinks || []);
}

function renderSocialLinks(socialLinks) {
  if (!socialLinksContainer) return;
  
  socialLinksContainer.innerHTML = '';
  
  if (socialLinks.length === 0) {
    socialLinksContainer.innerHTML = '<div class="empty-message">No social links yet. Add some to help people find you!</div>';
    return;
  }
  
  socialLinks.forEach(link => {
    const linkItem = document.createElement('div');
    linkItem.className = 'social-link-item';
    
    linkItem.innerHTML = `
      <div class="social-link-info">
        <div class="social-link-label">${escapeHtml(link.label)}</div>
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="social-link-url">
          ${escapeHtml(link.url)}
        </a>
      </div>
      <div class="social-link-actions">
        <button class="edit-btn" title="Edit Link">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn" title="Delete Link">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    // Add event listeners
    linkItem.querySelector('.edit-btn').addEventListener('click', () => {
      showSocialLinkModal(link);
    });
    
    linkItem.querySelector('.delete-btn').addEventListener('click', () => {
      deleteSocialLink(link.id);
    });
    
    socialLinksContainer.appendChild(linkItem);
  });
}

async function saveProfile() {
  if (!currentUser) return;
  
  const artistName = artistNameInput.value.trim();
  const bio = bioInput.value.trim();
  
  try {
    const response = await apiRequest('/api/my/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_name: artistName || null,
        bio: bio || null
      })
    });
    
    if (!response.ok) throw new Error('Failed to save profile');
    
    showMessage('Profile saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showMessage('Failed to save profile.', 'error');
  }
}

// Social Link Modal Functions

function showSocialLinkModal(link = null) {
  if (!socialLinkModal) return;
  
  // Reset form
  socialLinkForm.reset();
  
  if (link) {
    // Edit mode
    socialLinkModalTitle.textContent = 'Edit Social Link';
    socialLinkIdInput.value = link.id;
    socialLinkLabelInput.value = link.label;
    socialLinkUrlInput.value = link.url;
  } else {
    // Add mode
    socialLinkModalTitle.textContent = 'Add Social Link';
    socialLinkIdInput.value = '';
  }
  
  socialLinkModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  socialLinkLabelInput.focus();
}

async function saveSocialLink(event) {
  event.preventDefault();
  
  if (!currentUser) return;
  
  const linkId = socialLinkIdInput.value;
  const label = socialLinkLabelInput.value.trim();
  const url = socialLinkUrlInput.value.trim();
  
  if (!label || !url) {
    showMessage('Label and URL are required.', 'error');
    return;
  }
  
  try {
    let response;
    
    if (linkId) {
      // Update existing link
      response = await apiRequest(`/api/my/profile/social-links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url, display_order: 0 })
      });
    } else {
      // Create new link
      response = await apiRequest('/api/my/profile/social-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url, display_order: 0 })
      });
    }
    
    if (!response.ok) throw new Error('Failed to save social link');
    
    closeAllModals();
    showMessage('Social link saved successfully!', 'success');
    loadUserProfile(); // Reload to refresh the list
  } catch (error) {
    console.error('Error saving social link:', error);
    showMessage('Failed to save social link.', 'error');
  }
}

async function deleteSocialLink(linkId) {
  if (!currentUser || !linkId) return;
  
  showConfirmModal(
    'Delete Social Link',
    'Are you sure you want to delete this social link?',
    async () => {
      try {
        const response = await apiRequest(`/api/my/profile/social-links/${linkId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete social link');
        
        showMessage('Social link deleted successfully!', 'success');
        loadUserProfile(); // Reload to refresh the list
      } catch (error) {
        console.error('Error deleting social link:', error);
        showMessage('Failed to delete social link.', 'error');
      }
    }
  );
}
