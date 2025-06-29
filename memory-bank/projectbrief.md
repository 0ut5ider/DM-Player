# DM Player - Project Brief

## Project Overview
DM Player is a dynamic music player web application that enables users to upload MP3 files, create projects, and set cue points for automatic random track switching during playback. The application supports multi-user functionality with authentication, project ownership, and a public gallery.

## Core Requirements

### Primary Features
- **Project Management**: Create, edit, delete, and organize music projects
- **Track Management**: Upload, organize, and manage MP3 files within projects
- **Dynamic Playback**: Automatic random track switching at user-defined cue points
- **User Authentication**: Registration, login, logout with session management
- **Public Gallery**: Browse and play projects from all users
- **Project Ownership**: Users can only edit/delete their own projects

### Technical Requirements
- **Frontend**: HTML, CSS, Vanilla JavaScript (no frameworks)
- **Backend**: Node.js with Express framework
- **Database**: SQLite for persistent data storage
- **File Storage**: MP3 files stored in project-specific directories
- **Audio Playback**: HTML5 Audio API
- **Authentication**: bcryptjs for password hashing, express-session for session management

### Key Constraints
- MVP approach - keep implementation simple
- No complex security features beyond basic authentication
- File-based storage for audio files
- Responsive, modern, clean UI design
- Support for multiple users without complex permissions

## Success Criteria
- Users can create accounts and manage their own projects
- Seamless audio playback with automatic track switching at cue points
- Public gallery allows discovery and playback of all projects
- Clean, intuitive user interface that works across devices
- Reliable data persistence and file management

## Current Status
- **Version**: 1.0.11
- **Status**: Fully functional with user authentication and gallery features
- **Architecture**: Multi-user web application with SQLite backend
- **Deployment**: Local development server (port 3001, accessible on LAN)
