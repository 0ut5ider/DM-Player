# DM Player - Technical Context

## Technology Stack

### Frontend Technologies
- **HTML5**: Semantic markup with modern web standards
- **CSS3**: Flexbox/Grid layouts, responsive design, custom properties
- **Vanilla JavaScript**: ES6+ features, no external frameworks
- **Font Awesome**: Icon library for UI elements
- **HTML5 Audio API**: Core audio playback functionality

### Backend Technologies
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **SQLite3**: Embedded database with node-sqlite3 driver
- **Multer**: Middleware for handling multipart/form-data (file uploads)
- **bcryptjs**: Password hashing library
- **express-session**: Session middleware for authentication
- **connect-sqlite3**: SQLite session store for express-session
- **music-metadata**: Library for extracting MP3 metadata
- **uuid**: UUID generation for unique identifiers

### Development Tools
- **npm**: Package management
- **Git**: Version control
- **VSCode**: Development environment

## Dependencies

### Production Dependencies (package.json)
```json
{
  "express": "^5.1.0",
  "multer": "^1.4.5-lts.2",
  "music-metadata": "^11.2.1",
  "sqlite3": "^5.1.7",
  "uuid": "^11.1.0",
  "bcryptjs": "^2.4.3",
  "express-session": "^1.17.3",
  "connect-sqlite3": "^0.9.13"
}
```

### Key Library Usage Patterns

#### Express.js Configuration
- **Static File Serving**: `app.use(express.static('public'))`
- **JSON Parsing**: `app.use(express.json())`
- **Session Management**: SQLite-backed sessions with secure cookies
- **Middleware Chain**: Authentication → Authorization → Route Handler

#### SQLite3 Integration
- **Connection Management**: Single database connection in `database.js`
- **Schema Initialization**: Tables created on startup if not exists
- **Query Patterns**: Parameterized queries for security
- **Transaction Handling**: Implicit transactions for single operations

#### File Upload (Multer)
- **Storage Configuration**: Custom destination and filename functions
- **File Filtering**: MIME type validation for MP3 files only
- **Error Handling**: Graceful handling of upload failures
- **Path Management**: UUID-based filenames in project directories

## Development Setup

### Environment Configuration
- **Port**: Default 3001, configurable via `process.env.PORT`
- **Host Binding**: `0.0.0.0` for LAN accessibility
- **Session Secret**: Configurable via `process.env.SESSION_SECRET`
- **Database Path**: `dm_player.sqlite` in project root

### File Structure
```
/home/outsider/Coding Projects/DM-Player/
├── public/                 # Frontend assets
│   ├── index.html         # Main HTML file
│   ├── app.js            # Frontend JavaScript
│   └── style.css         # Styling
├── projects/             # User data storage
│   ├── [project-id]/     # Project directories
│   │   └── audio/        # MP3 files
│   └── dm_player.sqlite  # Database file
├── memory-bank/          # Documentation
├── server.js            # Main server file
├── database.js          # Database configuration
└── package.json         # Dependencies
```

### Build & Run Process
1. **Install Dependencies**: `npm install`
2. **Start Server**: `npm start` (runs `node server.js`)
3. **Access Application**: `http://localhost:3001`
4. **Database Initialization**: Automatic on first run

## Technical Constraints

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (recent versions)
- **HTML5 Audio**: Required for core functionality
- **ES6+ JavaScript**: Arrow functions, async/await, destructuring
- **CSS Grid/Flexbox**: For responsive layouts

### Performance Considerations
- **File Size Limits**: Multer configuration can be adjusted for max file size
- **Concurrent Users**: SQLite suitable for moderate concurrent access
- **Memory Usage**: Audio files streamed, not loaded into memory
- **Database Queries**: Optimized with proper indexing on foreign keys

### Security Constraints
- **Session Storage**: SQLite-based, suitable for single-server deployment
- **File Access**: Controlled through API endpoints, no direct file serving
- **Input Validation**: Server-side validation for all user inputs
- **Authentication**: Session-based, not suitable for distributed systems

## API Design

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

### Project Management
- `GET /api/projects` - List user's projects (authenticated)
- `POST /api/projects` - Create new project (authenticated)
- `GET /api/projects/:id` - Get project details (owner only)
- `PUT /api/projects/:id` - Update project (owner only)
- `DELETE /api/projects/:id` - Delete project (owner only)

### Track Management
- `POST /api/projects/:id/tracks` - Upload tracks (owner only)
- `DELETE /api/projects/:id/tracks/:trackId` - Delete track (owner only)

### Cue Point Management
- `GET /api/projects/:id/cues` - List cue points (public)
- `POST /api/projects/:id/cues` - Create cue point (owner only)
- `PUT /api/projects/:id/cues/:cueId` - Update cue point (owner only)
- `DELETE /api/projects/:id/cues/:cueId` - Delete cue point (owner only)

### Gallery & File Serving
- `GET /api/gallery/projects` - Public gallery (all projects with tracks/cues)
- `GET /projects/:id/audio/:trackId` - Serve audio files (public)

## Tool Usage Patterns

### UUID Generation
- **Projects**: Unique project identifiers
- **Tracks**: Unique track identifiers (also used as filenames)
- **Users**: Unique user identifiers
- **Cue Points**: Unique cue point identifiers

### Music Metadata Extraction
- **Duration Calculation**: Extracted during upload for UI display
- **File Validation**: Ensures uploaded files are valid MP3s
- **Error Handling**: Graceful fallback if metadata extraction fails

### Session Management
- **Cookie Configuration**: HTTP-only, secure in production
- **Session Store**: SQLite table for persistence
- **Cleanup**: Automatic session expiration (24 hours)

### Error Handling Patterns
- **API Errors**: Consistent JSON error responses with status codes
- **File Errors**: Graceful handling of upload/deletion failures
- **Database Errors**: Transaction rollback and error logging
- **Frontend Errors**: User-friendly error messages via alerts

## Deployment Considerations

### Local Development
- **Database**: SQLite file created automatically
- **File Storage**: Local filesystem in `projects/` directory
- **Session Storage**: SQLite table in same database
- **Port Configuration**: Default 3001, LAN accessible

### Production Readiness
- **Environment Variables**: Session secrets, port configuration
- **HTTPS**: Required for secure session cookies
- **File Permissions**: Proper permissions for upload directories
- **Database Backup**: Regular SQLite database backups recommended
