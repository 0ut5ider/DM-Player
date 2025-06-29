# Changelog
All notable changes to DM Player will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.12] - 2025-06-29
### Added
- Memory Bank documentation system for project context and development history
- Comprehensive project documentation including product context, system patterns, and technical details

## [1.0.11] - 2025-06-29
### Added
- User authentication system with registration and login
- URL routing for different application views
- Session management for authenticated users
- Public gallery for browsing and playing all user projects
- Project ownership model with authorization middleware
- Multi-view navigation system (login, register, gallery, my-projects, project-detail)
- Global player controls that persist across views

### Changed
- Enhanced user authentication with complete multi-user support
- Updated .gitignore to exclude SQLite database files

## [1.0.10] - 2025-06-29
### Added
- User authentication foundation

## [1.0.9] - 2025-06-29
### Changed
- Switched from JSON files to SQLite database for persistent data storage

## [1.0.8] - 2025-06-29
### Changed
- Display 2 decimal points in cue point editors for better precision

## [1.0.7] - 2025-06-29
### Added
- Version number display in the application

## [1.0.6] - 2025-06-29
### Added
- New cue-point timeline above the main progress bar
- Visual dots indicating cue point positions on the timeline

## [1.0.5] - 2025-06-29
### Added
- Cue-point-aware scrubbing functionality
- Seeking via dragging the circular handle or clicking the progress bar
- Automatic random track switching when seeking past cue points
- Synchronized indicator, handle, and time display during scrubbing

## [1.0.4] - 2025-06-29
### Changed
- Reorganized the user interface layout
- Moved player controls to the top of the interface
- Placed tracks and cue points side by side for better organization
- Modified add buttons to use + symbols with tooltips

## [1.0.3] - 2025-06-29
### Added
- Two decimal places precision for cue point values

## [1.0.2] - 2025-06-29
### Fixed
- Problem where reaching the first cue point caused rapid cycling through tracks

## [1.0.1] - 2025-06-29
### Fixed
- Audio playback stopping at the first cue point

## [1.0.0] - 2025-06-29
### Added
- Initial release of DM Player
- Project management functionality
- Track upload and management
- Dynamic playback with automatic random track switching
- Cue point system for track transitions
- HTML5 audio playback
- Basic user interface
