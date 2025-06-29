# DM Player - Product Context

## Why This Project Exists

DM Player solves the problem of creating dynamic, non-linear music experiences. Traditional music players follow predictable patterns - tracks play in sequence or shuffle randomly. DM Player introduces **cue-point-based dynamic switching**, allowing creators to design musical experiences where tracks can seamlessly transition at specific time points, creating unique listening experiences every time.

## Problems It Solves

### For Music Creators/DJs
- **Creative Control**: Set precise moments where track transitions should occur
- **Dynamic Performances**: Create performances that are different each time they're played
- **Easy Experimentation**: Quickly test different track combinations and transition points
- **Project Organization**: Keep related tracks and cue points organized in projects

### For Listeners
- **Unique Experiences**: Every playback session is different due to random track selection at cue points
- **Discovery**: Browse and play projects created by other users in the public gallery
- **Seamless Playback**: Transitions happen automatically without interrupting the listening experience

### Technical Problems
- **File Management**: Organized storage of MP3 files in project-specific directories
- **Precise Timing**: Accurate cue point detection and seamless track switching
- **Multi-User Support**: Secure user authentication and project ownership
- **Data Persistence**: Reliable storage of projects, tracks, and cue points

## How It Should Work

### User Journey - Creator
1. **Account Creation**: Register with artist name, email, and optional description
2. **Project Creation**: Create a new project with a descriptive name
3. **Track Upload**: Upload multiple MP3 files to the project
4. **Cue Point Setup**: Add time-based cue points where track switches should occur
5. **Testing**: Use the player controls to test the dynamic switching behavior
6. **Sharing**: Project automatically appears in the public gallery for others to discover

### User Journey - Listener
1. **Gallery Browsing**: View all projects in the public gallery with creator information
2. **Instant Playback**: Click play on any project to start listening immediately
3. **Seamless Experience**: Enjoy dynamic track switching without manual intervention
4. **Discovery**: Explore different creators and their musical projects

### Core Playback Behavior
- **Initial Play**: Randomly selects a track from the project to start playback
- **Cue Point Detection**: Monitors playback time and detects when cue points are reached
- **Dynamic Switching**: At each cue point, randomly selects a different track and continues from the same time position
- **Continuous Experience**: Maintains the illusion that all tracks are playing simultaneously, with only one audible at a time

## User Experience Goals

### Simplicity
- Clean, intuitive interface that doesn't overwhelm users
- Minimal clicks required to create projects and add content
- Clear visual feedback for all actions

### Reliability
- Consistent playback behavior across different browsers
- Robust error handling for file uploads and network issues
- Automatic session management for authenticated users

### Discoverability
- Public gallery makes all projects easily accessible
- Clear project information including creator and dates
- Visual cue point timeline for understanding project structure

### Performance
- Fast loading of projects and tracks
- Smooth audio transitions without gaps or glitches
- Responsive UI that works well on different screen sizes

## Success Metrics
- Users can successfully create and play projects with dynamic switching
- Gallery provides engaging discovery experience for listeners
- Audio transitions are seamless and maintain musical flow
- Interface is intuitive enough to use without documentation
