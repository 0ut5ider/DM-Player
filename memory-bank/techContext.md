# Technical Context

## Technology Stack

### Backend Technologies
- **Node.js**: Runtime environment for server-side JavaScript
- **Express.js v5.1.0**: Web framework for RESTful API
- **SQLite3 v5.1.7**: Embedded database for data persistence
- **bcrypt**: Password hashing library for secure authentication
- **Multer v1.4.5-lts.2**: Middleware for handling multipart/form-data (file uploads)
- **music-metadata v11.2.1**: Library for extracting audio file metadata
- **UUID v11.1.0**: Library for generating unique identifiers

### Frontend Technologies
- **Vanilla HTML5**: Semantic markup structure
- **CSS3**: Styling with modern features (flexbox, grid)
- **Vanilla JavaScript (ES6+)**: Client-side logic without frameworks
- **Font Awesome 6.0.0**: Icon library for UI elements
- **HTML5 Audio API**: Native audio playback capabilities

### Development Environment
- **Package Manager**: npm (Node Package Manager)
- **Version Control**: Git (GitHub repository)
- **Server Port**: 3001 (configurable via PORT environment variable)
- **File System**: Local storage for MP3 files and SQLite database

## Dependencies Analysis

### Production Dependencies
```json
{
  "bcrypt": "^5.1.1",           // Password hashing for authentication
  "express": "^5.1.0",          // Web server framework
  "multer": "^1.4.5-lts.2",     // File upload handling
  "music-metadata": "^11.2.1",  // Audio metadata extraction
  "sqlite3": "^5.1.7",          // Database engine
  "uuid": "^11.1.0"             // Unique ID generation
}
```

### Key Dependency Purposes
- **bcrypt**: Secure password hashing and verification for user authentication
- **Express**: Handles HTTP routing, middleware, static file serving
- **Multer**: Processes MP3 file uploads with validation and storage
- **music-metadata**: Extracts duration and other metadata from audio files
- **SQLite3**: Provides embedded database without external server requirements
- **UUID**: Generates unique identifiers for users, projects, tracks, and cue points

## Development Setup

### Prerequisites
- Node.js (version compatible with dependencies)
- npm (comes with Node.js)
- Modern web browser with HTML5 audio support

### Installation Process
```bash
git clone https://github.com/0ut5ider/DM-Player.git
cd DM-Player
npm install
npm start
```

### Project Structure
```
DM-Player/
├── package.json              # Project configuration and dependencies
├── package-lock.json         # Locked dependency versions
├── server.js                 # Main server application
├── database.js               # Database connection and schema
├── README.md                 # Project documentation
├── changelog.md              # Version history
├── plan.md                   # Development planning
├── .gitignore               # Git ignore rules
├── public/                   # Frontend assets
│   ├── index.html           # Main HTML structure
│   ├── style.css            # Application styling
│   └── app.js               # Client-side JavaScript
└── projects/                # Runtime data storage
    └── {projectId}/         # Project-specific directories
        └── audio/           # MP3 file storage
```

## Technical Constraints

### Browser Compatibility
- **HTML5 Audio Support**: Required for playback functionality
- **ES6+ JavaScript**: Modern browser features used throughout
- **Fetch API**: Used for HTTP requests to backend
- **File API**: Required for file upload functionality
- **Local Storage**: Used for session token persistence

### System Requirements
- **File System Access**: Local storage for MP3 files and database
- **Network Access**: HTTP server on localhost
- **Audio Codecs**: MP3 playback support in browser
- **Memory**: Sufficient RAM for audio buffering and metadata processing
- **Session Storage**: Browser local storage for authentication tokens

### Performance Considerations
- **File Size Limits**: Multer configuration may limit upload sizes
- **Concurrent Users**: Multi-user application with session management
- **Database Size**: SQLite suitable for moderate multi-user data volumes
- **Audio Streaming**: Browser handles audio buffering and streaming
- **Session Management**: 7-day session expiration with automatic cleanup

## Configuration Patterns

### Environment Variables
- **PORT**: Server port (default: 3001)
- **NODE_ENV**: Environment mode (development/production)

### Authentication Configuration
```javascript
// Password hashing
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Session management
const sessionId = uuidv4();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  // Validate session against database
};
```

### File Upload Configuration
```javascript
// Multer storage configuration
const storage = multer.diskStorage({
  destination: './projects/{projectId}/audio/',
  filename: '{uuid}.mp3'
});

// File filtering with security
fileFilter: (req, file, cb) => {
  if (file.mimetype !== 'audio/mpeg') {
    return cb(new Error('Only MP3 files allowed'), false);
  }
  cb(null, true);
}
```

### Database Configuration
```javascript
// SQLite connection with multi-user schema
const dbPath = path.resolve(__dirname, 'dm_player.sqlite');
const db = new sqlite3.Database(dbPath);

// Schema initialization with user tables
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  // Create users, sessions, projects, tracks, cue_points tables
});
```

## Development Workflow

### Server Development
1. **Express Routes**: RESTful API endpoints in server.js
2. **Database Operations**: SQL queries with parameterized statements
3. **File Handling**: Multer middleware for uploads, fs for file operations
4. **Error Handling**: Consistent error responses and logging

### Frontend Development
1. **DOM Manipulation**: Vanilla JavaScript for UI updates
2. **Event Handling**: User interaction and audio event listeners
3. **API Communication**: Fetch requests to backend endpoints
4. **State Management**: JavaScript variables for application state

### Testing Approach
- **Manual Testing**: Browser-based testing of functionality
- **API Testing**: Direct endpoint testing during development
- **File Upload Testing**: Various MP3 files and edge cases
- **Audio Playback Testing**: Cross-browser compatibility verification

## Deployment Considerations

### Local Deployment
- **Single Machine**: Designed for local use with multi-user support
- **No External Dependencies**: Self-contained with embedded database
- **Port Configuration**: Configurable port for multiple instances
- **Data Persistence**: Local file system and SQLite database
- **User Management**: Complete authentication system included

### Scaling Characteristics
- **Multi-User Support**: Full authentication and authorization system
- **Local Storage**: Files stored on local file system with access control
- **Database**: SQLite suitable for moderate multi-user data volumes
- **Concurrent Access**: Designed for multiple simultaneous users with session management
- **Session Management**: Token-based authentication with expiration

## Security Considerations

### Input Validation
- **File Type Validation**: MIME type and extension checking
- **SQL Injection Prevention**: Parameterized queries throughout
- **Path Traversal Prevention**: UUID-based file naming
- **Input Sanitization**: Required field validation
- **Authentication Validation**: Session token verification
- **Password Security**: bcrypt hashing with salt rounds

### File System Security
- **Restricted File Types**: Only MP3 files accepted
- **Isolated Storage**: Project-specific directories
- **UUID Naming**: Prevents predictable file paths
- **Cleanup on Delete**: Orphaned files removed
- **Access Control**: File serving based on ownership and publication status

### Network Security
- **Local Binding**: Server binds to localhost by default
- **Authentication Required**: Session-based authentication for protected routes
- **Authorization**: Middleware-based ownership verification
- **Session Security**: Token-based sessions with expiration
- **Password Security**: bcrypt hashing prevents rainbow table attacks
- **CORS**: Not configured (local application)
- **HTTPS**: Not required for local deployment but recommended for production
