# Changelog
All notable changes to DM-Player will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.9] - 2025-06-29
### Changed
- Switched from JSON files to SQLite database for storing persistent data

## [1.0.8] - 2025-06-29
### Changed
- Display 2 decimal points in cue point editors

## [1.0.7] - 2025-06-29
### Added
- Application now displays the version number

## [1.0.6] - 2025-06-29
### Added
- New cue-point timeline above the main progress bar
- Visual dots indicating cue point positions on timeline

## [1.0.5] - 2025-06-29
### Added
- Cue-point-aware scrubbing functionality
- Dragging the circular handle or clicking the progress bar now seeks audio
- Automatic random track switch when seek position passes next cue point
- Synchronized indicator, handle, and time display during scrubbing

## [1.0.4] - 2025-06-29
### Changed
- Reorganized the UI layout
- Moved player controls to the top
- Placed tracks and cue points side by side
- Modified buttons to add tracks and cue points to + symbols with tooltips

## [1.0.3] - 2025-06-29
### Added
- Two decimal places for cue point values

## [1.0.2] - 2025-06-29
### Fixed
- Problem when the first cue point is reached where playback was cycling through every track every second

## [1.0.1] - 2025-06-29
### Fixed
- Audio stopped playing at first cue point

## [1.0.0] - 2025-06-29
### Added
- Initial release of DM-Player
- Project management system for organizing music collections
- MP3 file upload and management
- Dynamic cue point system for automatic track switching
- Audio playback controls with progress bar
- SQLite database for persistent data storage
- Web-based interface for Dungeon Masters and content creators
