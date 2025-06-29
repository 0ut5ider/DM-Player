# DM Player - System Patterns & Architecture

## System Architecture

### High-Level Architecture
```
Frontend (Browser)
├── HTML5 Audio API
├── Vanilla JavaScript
├── CSS3 Styling
└── Responsive Design

Backend (Node.js/Express)
├── Authentication Middleware
├── File Upload (Multer)
├── Session Management
└── API Routes

Data Layer
├── SQLite Database
│   ├── users table
│   ├── projects table
│   ├── tracks table
│   └── cue_points table
└── File System
    └── projects/[project_id]/audio/[track_id].mp3
```

### Database Schema Design

#### Core Tables
- **users**: User authentication and profile data
  - `id` (TEXT, PRIMARY KEY) - UUID
  - `artistName`, `email`, `passwordHash`, `description`
  - `createdAt`, `updatedAt` timestamps

- **projects**: Project metadata with ownership
  - `id` (TEXT, PRIMARY KEY) - UUID
  - `userId` (FOREIGN KEY) - Links to users table
  - `name`, `createdAt`, `updatedAt`
  - ON DELETE CASCADE for user deletion

- **tracks**: Audio file metadata
  - `id` (TEXT, PRIMARY KEY) - UUID
  - `projectId` (FOREIGN KEY) - Links to projects table
  - `originalName`, `path`, `duration`
  - ON DELETE CASCADE for project deletion

- **cue_points**: Time-based switching points
  - `id` (TEXT, PRIMARY KEY) - UUID
  - `projectId` (FOREIGN KEY) - Links to projects table
  - `time` (REAL) - Time in seconds
  - ON DELETE CASCADE for project deletion

### Key Design Patterns

#### Authentication & Authorization
- **Session-based Authentication**: Uses express-session with SQLite store
- **Middleware Pattern**: `isAuthenticated` and `isProjectOwner` middleware
- **Role-based Access**: Project owners can edit, everyone can view gallery

#### File Management Pattern
- **UUID-based Naming**: Prevents filename conflicts and provides security
- **Hierarchical Storage**: `projects/[project_id]/audio/[track_id].mp3`
- **Metadata Extraction**: Uses music-metadata library for MP3 duration

#### API Design Pattern
- **RESTful Routes**: Standard CRUD operations for all resources
- **Nested Resources**: `/api/projects/:projectId/tracks` structure
- **Error Handling**: Consistent error responses with status codes
- **Data Validation**: Input validation at API layer

#### Frontend State Management
- **Global State Variables**: `currentUser`, `currentProject`, `currentView`
- **View Management**: Single-page application with view switching
- **Event-driven Updates**: DOM updates triggered by API responses

## Critical Implementation Paths

### Audio Playback Engine
```javascript
// Core playback flow
playAudio() → selectRandomTrack() → updateUpcomingCuePoints() → 
checkCuePoints() → switchToRandomTrack() → playAudio()
```

**Key Components:**
- **Track Selection**: Random selection excluding current track
- **Cue Point Detection**: Time-based monitoring with `timeupdate` event
- **Seamless Switching**: Preserves playback position across track changes
- **State Management**: Prevents multiple simultaneous switches

### Dynamic Cue Point System
- **Timeline Visualization**: Visual representation of cue points on progress bar
- **Drag-and-Drop Editing**: Real-time cue point adjustment (owner only)
- **Color Coding**: Unique colors for each cue point for visual distinction
- **Sorted Processing**: Cue points processed in chronological order

### Multi-View Navigation
- **Hash-based Routing**: URL fragments for view state management
- **Context-aware UI**: Different controls based on user authentication
- **Global Player**: Persistent player controls across views
- **Back Navigation**: Intelligent back button behavior

### File Upload Pipeline
```
File Selection → Multer Processing → Metadata Extraction → 
Database Storage → File System Storage → UI Update
```

## Component Relationships

### Frontend Components
- **View Manager**: Controls visibility of login, gallery, projects, detail views
- **Auth Manager**: Handles login state and navigation updates
- **Player Controller**: Manages audio playback and cue point logic
- **Project Manager**: Handles CRUD operations for projects and tracks
- **Modal System**: Reusable modal components for forms

### Backend Middleware Stack
- **Session Middleware**: Persistent user sessions with SQLite storage
- **Authentication Middleware**: Route protection and user verification
- **File Upload Middleware**: Multer configuration for MP3 processing
- **Static File Serving**: Express static middleware for frontend assets

### Data Flow Patterns
- **API-First Design**: All data operations go through REST API
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Error Boundaries**: Graceful error handling with user feedback
- **Session Persistence**: Automatic login state restoration

## Security Patterns

### Authentication Security
- **Password Hashing**: bcryptjs with salt for secure password storage
- **Session Security**: HTTP-only cookies with secure flags in production
- **Input Validation**: Server-side validation for all user inputs
- **CSRF Protection**: Session-based protection against cross-site requests

### File Security
- **UUID Filenames**: Prevents directory traversal and filename guessing
- **MIME Type Validation**: Only MP3 files accepted for upload
- **Path Sanitization**: Secure file path construction
- **Access Control**: File serving through controlled API endpoints

### Data Security
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Prevention**: HTML escaping for user-generated content
- **Authorization Checks**: Ownership verification for all write operations
- **Foreign Key Constraints**: Database-level referential integrity
