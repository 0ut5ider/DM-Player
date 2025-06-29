# DM-Player Project Brief

## Project Overview
DM-Player is a dynamic music player application designed for Dungeon Masters and content creators who need sophisticated audio control during live sessions. The application features a complete multi-user system where users can create accounts, manage their own projects, upload MP3 files, set cue points for automatic random track switching, and share their projects publicly for others to discover and use.

## Core Requirements

### Primary Features
1. **User Authentication System**
   - User registration with username, email, and secure password
   - Login/logout functionality with session management
   - 7-day session persistence with automatic cleanup
   - Secure password hashing using bcrypt

2. **Multi-User Project Management**
   - Create, edit, and delete music projects (user-owned)
   - Each project contains its own collection of tracks and cue points
   - Projects can be draft (private) or published (public)
   - Project ownership and access control

3. **Public Project Sharing**
   - Browse published projects from other users
   - Play and interact with public projects
   - Organized by creator username
   - Public library for discovering new content

4. **Audio File Management**
   - Upload MP3 files to user's own projects
   - Store files in project-specific directories with access control
   - Extract and display audio metadata (duration, original filename)
   - Delete tracks from owned projects
   - Secure file serving based on ownership and publication status

5. **Advanced Cue Point System**
   - Add, edit, and delete cue points at specific timestamps
   - Automatic random track switching when playback reaches cue points
   - Interactive visual timeline with drag-and-drop editing
   - Color-coded cue point representation
   - Precise time-based control (supports decimal seconds)

6. **Advanced Audio Playback Controls**
   - Standard play/pause/stop functionality
   - Progress bar with scrubbing capability and cue-point awareness
   - Real-time time display (current/total)
   - Visual playback indicator on interactive timeline
   - Seamless track transitions with randomization

### Technical Requirements
- **Backend**: Node.js with Express framework and authentication middleware
- **Database**: SQLite for multi-user persistent data storage
- **Authentication**: bcrypt password hashing with session token management
- **Frontend**: Vanilla HTML/CSS/JavaScript multi-view single-page application
- **File Storage**: Local filesystem with organized project directories and access control
- **Audio Processing**: HTML5 Audio API with music-metadata for file analysis
- **Security**: Input validation, SQL injection prevention, file access control

## Success Criteria
1. ✅ Users can register accounts and authenticate securely
2. ✅ Users can create and manage multiple independent projects
3. ✅ Users can publish projects for others to discover and use
4. ✅ MP3 files upload successfully and play without issues
5. ✅ Cue points trigger automatic random track switching at precise times
6. ✅ Interactive timeline allows visual cue point management
7. ✅ Interface is responsive and intuitive for live session use
8. ✅ All data persists between application restarts
9. ✅ Audio playback is smooth and reliable
10. ✅ Multi-user system works without conflicts
11. ✅ Public/private project model functions correctly
12. ✅ File access control prevents unauthorized access

## Target Users
- **Dungeon Masters** running tabletop RPG sessions who want to share setups
- **Content creators** needing dynamic audio control with collaboration features
- **Community members** who want to discover and use others' audio setups
- **Anyone** requiring automated music switching based on timing cues
- **Groups and communities** sharing audio resources for campaigns and sessions

## Project Scope
This is a multi-user web application intended for local deployment with community features. It includes comprehensive user authentication, project sharing, and collaborative discovery while maintaining local storage for simplicity. The application has evolved beyond the original single-user scope to support a full community of users sharing and discovering audio content.

### Implemented Beyond Original Scope
- ✅ Complete user authentication and authorization system
- ✅ Multi-user project ownership and management
- ✅ Public project sharing and discovery
- ✅ Interactive visual timeline with drag-and-drop editing
- ✅ Advanced access control and security measures
- ✅ Professional multi-view user interface
- ✅ Session management with persistence
