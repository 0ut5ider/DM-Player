# System Patterns

## Architecture Overview

### Multi-User Three-Tier Architecture
```
Frontend (Browser) ←→ Authentication Layer ←→ Backend (Express/Node.js) ←→ Database (SQLite)
                                                        ↓
                                                File System (MP3 Storage)
```

### Core Components
1. **Express Server** (`server.js`): RESTful API with authentication and authorization
2. **SQLite Database** (`database.js`): Multi-user persistent storage with user management
3. **Frontend SPA** (`public/`): Multi-view single-page application with authentication
4. **Authentication System**: Session-based auth with bcrypt password hashing
5. **File Storage**: Organized project directories with access control

## Database Design

### Multi-User Schema Structure
```sql
users (id, username, email, password_hash, created_at)
    ↓ (1:many)
sessions (id, user_id, expires_at)

users (id, username, email, password_hash, created_at)
    ↓ (1:many)
projects (id, name, user_id, status, created_at, published_at)
    ↓ (1:many)
tracks (id, project_id, original_name, path, duration)
    ↓ (1:many) 
cue_points (id, project_id, time)
```

### Key Patterns
- **UUID Primary Keys**: All entities use UUID v4 for unique identification
- **User Ownership**: All projects belong to specific users
- **Session Management**: Token-based authentication with expiration
- **Publication Status**: Projects can be draft (private) or published (public)
- **Foreign Key Constraints**: CASCADE DELETE ensures data integrity
- **Timestamp Tracking**: ISO string format for creation and publication dates
- **Path Storage**: Relative paths within project directories
- **Access Control**: File serving respects ownership and publication status

## API Design Patterns

### RESTful Endpoints with Authentication
```
# Authentication Routes
POST   /api/auth/register         # User registration
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
GET    /api/auth/me              # Get current user

# User Project Management (Authenticated)
GET    /api/my/projects          # List user's own projects
POST   /api/my/projects          # Create new project
GET    /api/my/projects/:id      # Get user's project details
PUT    /api/my/projects/:id      # Update project name/status
DELETE /api/my/projects/:id      # Delete user's project

POST   /api/my/projects/:id/tracks        # Upload tracks (multipart)
DELETE /api/my/projects/:id/tracks/:trackId  # Delete track

GET    /api/my/projects/:id/cues          # List cue points
POST   /api/my/projects/:id/cues          # Create cue point
PUT    /api/my/projects/:id/cues/:cueId   # Update cue point
DELETE /api/my/projects/:id/cues/:cueId   # Delete cue point

# Public Library (No Authentication)
GET    /api/public/projects       # List published projects by user
GET    /api/public/users          # List users with published projects
GET    /api/public/users/:username/projects  # Get user's published projects
GET    /api/public/projects/:id   # Get published project details
GET    /api/public/projects/:id/cues  # Get published project cue points

# File Serving (Access Controlled)
GET    /projects/:id/audio/:trackId  # Serve audio files with access control
```

### Response Patterns
- **Consistent Error Format**: `{ error: "message", details: "specifics" }`
- **Authentication Errors**: 401 for missing/invalid tokens, 403 for access denied
- **Resource Return**: Operations return the affected resource
- **Status Codes**: Proper HTTP status codes for all scenarios
- **Sorted Results**: Cue points always returned sorted by time
- **User Context**: Responses include user information where relevant

## File System Organization

### Directory Structure
```
projects/
├── {projectId}/
│   └── audio/
│       ├── {trackId}.mp3
│       ├── {trackId}.mp3
│       └── ...
├── {projectId}/
│   └── audio/
│       └── ...
```

### File Handling Patterns
- **UUID Filenames**: Prevent conflicts and maintain uniqueness
- **Atomic Operations**: File and database operations coordinated
- **Cleanup on Delete**: Orphaned files removed when entities deleted
- **Directory Creation**: Automatic creation of required directories

## Frontend Architecture

### Multi-View Single Page Application Pattern
- **Authentication State**: User login status and session management
- **View State Management**: JavaScript controls visibility of multiple main views
- **Modal System**: Reusable modal components for user input
- **Event-Driven Updates**: DOM updates triggered by user actions
- **API Integration**: Fetch-based communication with authentication headers

### Component Organization
```
index.html (structure)
├── Public Browse View (no auth required)
├── Login/Register Views
├── User Dashboard View (authenticated)
├── Project Detail View
│   ├── Player Controls
│   ├── Tracks Section
│   └── Cue Points Section
└── Modal System
    ├── Create Project
    ├── Edit Project
    ├── Add Cue Point
    ├── Edit Cue Point
    └── Confirm Actions
```

### State Management Patterns
- **Authentication State**: Current user, session token, login status
- **Global State**: Current project, playback state, UI state, current view
- **Local Storage**: Session token persistence for authentication
- **Real-time Updates**: Immediate UI updates after successful API calls
- **Error Handling**: User-friendly error messages for all failure scenarios
- **Navigation State**: Track current view and handle back button functionality

## Audio Processing Patterns

### Advanced Playback Management
- **HTML5 Audio Element**: Single audio element for all playback
- **Source Switching**: Dynamic src changes for track transitions with access control
- **Event Listeners**: Progress tracking and cue point detection
- **Metadata Extraction**: Server-side duration calculation using music-metadata
- **Access Control**: Audio file serving respects project ownership and publication

### Advanced Cue Point System
- **Time-based Triggers**: Continuous monitoring of playback position
- **Random Selection**: Algorithm excludes current track from random selection
- **Seamless Transitions**: Immediate switching without playback interruption
- **Visual Timeline**: Interactive timeline representation with drag-and-drop editing
- **Color-coded Cues**: Visual distinction between different cue points
- **Real-time Updates**: Timeline synchronization with audio progress
- **Drag-and-Drop Editing**: Direct manipulation of cue point positions

## Security Patterns

### Authentication Security
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Session Management**: UUID-based session tokens with expiration
- **Token Validation**: Middleware validates session tokens on protected routes
- **Session Cleanup**: Automatic cleanup of expired sessions

### Authorization Security
- **Ownership Verification**: Middleware checks project ownership before operations
- **Access Control**: File serving respects ownership and publication status
- **Route Protection**: Authentication required for user-specific operations
- **Public/Private Model**: Clear separation between public and private content

### File Upload Security
- **MIME Type Validation**: Only audio/mpeg files accepted
- **File Extension Checking**: .mp3 extension required
- **Directory Traversal Prevention**: UUID-based paths prevent malicious access
- **Size Limits**: Multer configuration prevents oversized uploads
- **Access Control**: File serving validates ownership or publication status

### API Security
- **Input Validation**: Required field checking and type validation
- **SQL Injection Prevention**: Parameterized queries throughout
- **Path Sanitization**: Safe file path construction
- **Error Information Limiting**: Generic error messages to prevent information leakage
- **Authentication Headers**: Bearer token validation on protected endpoints
- **User Context**: All operations performed in context of authenticated user

## Error Handling Patterns

### Authentication Error Handling
- **Session Validation**: Graceful handling of expired or invalid sessions
- **Login Failures**: Clear error messages for authentication failures
- **Registration Conflicts**: Proper handling of duplicate usernames/emails
- **Token Refresh**: Automatic session cleanup and clear error responses

### Database Operations
- **Transaction Safety**: Rollback capabilities for multi-step operations
- **Constraint Validation**: Foreign key and unique constraint handling
- **Connection Management**: Proper database connection lifecycle
- **Graceful Degradation**: Fallback behaviors for database failures
- **User Context**: All operations performed with proper user authorization

### File Operations
- **Existence Checking**: Verify files exist before operations
- **Permission Handling**: Graceful handling of file system permissions
- **Cleanup on Failure**: Remove partial uploads on error
- **Atomic File Operations**: Prevent corrupted file states
- **Access Control**: File operations respect ownership and publication status

## Performance Patterns

### Database Optimization
- **Efficient Queries**: Minimal database round trips with user context
- **Index Usage**: Primary keys and foreign keys properly indexed
- **Batch Operations**: Multiple file uploads handled efficiently
- **Connection Reuse**: Single database connection throughout application lifecycle
- **Session Queries**: Efficient session validation with user data joins

### File Serving with Access Control
- **Conditional File Serving**: Access control checks before serving files
- **Streaming Support**: Proper HTTP headers for audio streaming
- **Caching Headers**: Browser caching for static assets with security considerations
- **Efficient Path Resolution**: Minimal file system operations
- **Ownership Validation**: Database queries to verify access rights before serving
- **Public/Private Routing**: Different serving logic for public vs. private content
