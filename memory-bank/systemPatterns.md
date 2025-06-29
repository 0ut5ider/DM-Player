# System Patterns

## Architecture Overview

### Three-Tier Architecture
```
Frontend (Browser) ←→ Backend (Express/Node.js) ←→ Database (SQLite)
                                ↓
                        File System (MP3 Storage)
```

### Core Components
1. **Express Server** (`server.js`): RESTful API handling all business logic
2. **SQLite Database** (`database.js`): Persistent storage for projects, tracks, and cue points
3. **Frontend SPA** (`public/`): Single-page application with vanilla JavaScript
4. **File Storage**: Organized project directories for MP3 files

## Database Design

### Schema Structure
```sql
projects (id, name, createdAt)
    ↓ (1:many)
tracks (id, projectId, originalName, path, duration)
    ↓ (1:many) 
cue_points (id, projectId, time)
```

### Key Patterns
- **UUID Primary Keys**: All entities use UUID v4 for unique identification
- **Foreign Key Constraints**: CASCADE DELETE ensures data integrity
- **Timestamp Tracking**: ISO string format for creation dates
- **Path Storage**: Relative paths within project directories

## API Design Patterns

### RESTful Endpoints
```
GET    /api/projects              # List all projects
POST   /api/projects              # Create new project
GET    /api/projects/:id          # Get project with tracks and cues
PUT    /api/projects/:id          # Update project name
DELETE /api/projects/:id          # Delete project and all data

POST   /api/projects/:id/tracks   # Upload tracks (multipart)
DELETE /api/projects/:id/tracks/:trackId  # Delete track

GET    /api/projects/:id/cues     # List cue points
POST   /api/projects/:id/cues     # Create cue point
PUT    /api/projects/:id/cues/:cueId     # Update cue point
DELETE /api/projects/:id/cues/:cueId     # Delete cue point

GET    /projects/:id/audio/:trackId      # Serve audio files
```

### Response Patterns
- **Consistent Error Format**: `{ error: "message", details: "specifics" }`
- **Resource Return**: Operations return the affected resource
- **Status Codes**: Proper HTTP status codes for all scenarios
- **Sorted Results**: Cue points always returned sorted by time

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

### Single Page Application Pattern
- **View State Management**: JavaScript controls visibility of main views
- **Modal System**: Reusable modal components for user input
- **Event-Driven Updates**: DOM updates triggered by user actions
- **API Integration**: Fetch-based communication with backend

### Component Organization
```
index.html (structure)
├── Project List View
├── Project Detail View
│   ├── Player Controls
│   ├── Tracks Section
│   └── Cue Points Section
└── Modal System
    ├── Create Project
    ├── Add Cue Point
    ├── Edit Cue Point
    └── Edit Project
```

### State Management Patterns
- **Global State**: Current project, playback state, UI state
- **Local Storage**: None currently (server-side persistence only)
- **Real-time Updates**: Immediate UI updates after successful API calls
- **Error Handling**: User-friendly error messages for all failure scenarios

## Audio Processing Patterns

### Playback Management
- **HTML5 Audio Element**: Single audio element for all playback
- **Source Switching**: Dynamic src changes for track transitions
- **Event Listeners**: Progress tracking and cue point detection
- **Metadata Extraction**: Server-side duration calculation using music-metadata

### Cue Point System
- **Time-based Triggers**: Continuous monitoring of playback position
- **Random Selection**: Algorithm excludes current track from random selection
- **Seamless Transitions**: Immediate switching without playback interruption
- **Visual Feedback**: Timeline representation of cue points and progress

## Security Patterns

### File Upload Security
- **MIME Type Validation**: Only audio/mpeg files accepted
- **File Extension Checking**: .mp3 extension required
- **Directory Traversal Prevention**: UUID-based paths prevent malicious access
- **Size Limits**: Multer configuration prevents oversized uploads

### API Security
- **Input Validation**: Required field checking and type validation
- **SQL Injection Prevention**: Parameterized queries throughout
- **Path Sanitization**: Safe file path construction
- **Error Information Limiting**: Generic error messages to prevent information leakage

## Error Handling Patterns

### Database Operations
- **Transaction Safety**: Rollback capabilities for multi-step operations
- **Constraint Validation**: Foreign key and unique constraint handling
- **Connection Management**: Proper database connection lifecycle
- **Graceful Degradation**: Fallback behaviors for database failures

### File Operations
- **Existence Checking**: Verify files exist before operations
- **Permission Handling**: Graceful handling of file system permissions
- **Cleanup on Failure**: Remove partial uploads on error
- **Atomic File Operations**: Prevent corrupted file states

## Performance Patterns

### Database Optimization
- **Efficient Queries**: Minimal database round trips
- **Index Usage**: Primary keys and foreign keys properly indexed
- **Batch Operations**: Multiple file uploads handled efficiently
- **Connection Reuse**: Single database connection throughout application lifecycle

### File Serving
- **Direct File Serving**: Express static file serving for audio
- **Streaming Support**: Proper HTTP headers for audio streaming
- **Caching Headers**: Browser caching for static assets
- **Efficient Path Resolution**: Minimal file system operations
