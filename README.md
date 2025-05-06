# DM-Player

A dynamic music player application that allows users to upload MP3 files, create projects, and set cue points for random track switching during playback.

## Features

- Create and manage multiple music projects
- Upload and organize MP3 files within projects
- Add, edit, and delete cue points for dynamic track switching
- Master playback controls (play/pause/stop)
- Random track selection at cue points
- Clean, modern, and responsive user interface

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/0ut5ider/DM-Player.git
   cd DM-Player
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Using the application:
   - Create a new project by clicking the "New Project" button
   - Select a project to view its details
   - Upload MP3 files using the "Add Track" button
   - Add cue points using the "Add Cue Point" button
   - Use the player controls to play, pause, and stop the audio
   - At each cue point, the player will automatically switch to a random track

## Project Structure

- `public/` - Frontend files (HTML, CSS, JavaScript)
- `projects/` - Data storage for projects and uploaded MP3 files
- `server.js` - Node.js/Express backend server

## Technical Details

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **Data Storage**: JSON files
- **File Storage**: MP3 files stored in project-specific folders
- **Audio Playback**: HTML5 Audio API

## License

ISC
