# DM-Player Project Brief

## Project Overview
DM-Player is a dynamic music player application designed for Dungeon Masters and content creators who need sophisticated audio control during live sessions. The application enables users to create projects, upload MP3 files, and set cue points for automatic random track switching during playback.

## Core Requirements

### Primary Features
1. **Project Management**
   - Create, edit, and delete music projects
   - Each project contains its own collection of tracks and cue points
   - Projects are stored with unique IDs and timestamps

2. **Audio File Management**
   - Upload MP3 files to specific projects
   - Store files in project-specific directories
   - Extract and display audio metadata (duration, original filename)
   - Delete tracks from projects

3. **Dynamic Cue Point System**
   - Add, edit, and delete cue points at specific timestamps
   - Automatic random track switching when playback reaches cue points
   - Visual timeline representation of cue points
   - Precise time-based control (supports decimal seconds)

4. **Audio Playback Controls**
   - Standard play/pause/stop functionality
   - Progress bar with scrubbing capability
   - Real-time time display (current/total)
   - Visual playback indicator on cue timeline

### Technical Requirements
- **Backend**: Node.js with Express framework
- **Database**: SQLite for persistent data storage
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **File Storage**: Local filesystem with organized project directories
- **Audio Processing**: HTML5 Audio API with music-metadata for file analysis

## Success Criteria
1. Users can create and manage multiple independent projects
2. MP3 files upload successfully and play without issues
3. Cue points trigger automatic random track switching at precise times
4. Interface is responsive and intuitive for live session use
5. All data persists between application restarts
6. Audio playback is smooth and reliable

## Target Users
- Dungeon Masters running tabletop RPG sessions
- Content creators needing dynamic audio control
- Anyone requiring automated music switching based on timing cues

## Project Scope
This is a standalone desktop web application intended for local use. It focuses on core functionality without advanced features like cloud storage, user authentication, or collaborative editing.
