# Product Context

## Why DM-Player Exists

### The Problem
Dungeon Masters and content creators face significant challenges when managing audio during live sessions:

1. **Manual Track Management**: Constantly switching between tracks manually disrupts flow and immersion
2. **Timing Precision**: Need for precise audio cues that align with specific moments in content
3. **Randomization Needs**: Desire for unpredictable audio variety while maintaining control over when changes occur
4. **Session Flow**: Audio management shouldn't interrupt the primary activity (storytelling, content creation)
5. **Project Organization**: Different sessions/campaigns need separate audio collections and cue configurations

### The Solution
DM-Player provides automated, cue-based audio management that allows creators to:
- Pre-configure audio switching points before sessions
- Focus on content delivery while audio manages itself
- Maintain variety through randomization within controlled parameters
- Organize audio assets by project/campaign/session

## How It Should Work

### User Experience Flow
1. **Project Setup**: User creates a new project for their session/campaign
2. **Content Preparation**: Upload relevant MP3 tracks for the project
3. **Cue Configuration**: Set specific time points where track switching should occur
4. **Live Session**: Start playback and let the system handle automatic switching
5. **Manual Override**: Retain control with standard playback controls when needed

### Core Interactions
- **Intuitive Project Management**: Simple creation, selection, and organization of projects
- **Drag-and-Drop Upload**: Easy MP3 file addition to projects
- **Visual Cue Timeline**: Clear representation of when switches will occur
- **Responsive Controls**: Immediate feedback for all user actions
- **Seamless Playback**: Smooth transitions that don't disrupt the experience

### Key Behaviors
- **Automatic Switching**: When playback reaches a cue point, randomly select and switch to a different track
- **Continuous Playback**: No gaps or interruptions during track transitions
- **Visual Feedback**: Clear indication of current track, progress, and upcoming cue points
- **Persistent State**: Projects and configurations survive application restarts

## User Experience Goals

### Primary Objectives
1. **Minimal Cognitive Load**: Users shouldn't need to think about audio management during sessions
2. **Reliable Automation**: Cue points must trigger consistently and precisely
3. **Quick Setup**: Project configuration should be fast and straightforward
4. **Flexible Control**: Balance automation with manual override capabilities
5. **Clear Feedback**: Users always know what's playing and what's coming next

### Success Metrics
- Users can set up a complete project in under 5 minutes
- Cue point accuracy within 100ms of specified time
- Zero audio dropouts during track transitions
- Intuitive interface requiring no documentation for basic use
- Stable performance during extended sessions (2+ hours)

### User Scenarios
1. **D&D Session**: DM sets ambient music with combat cues for automatic battle music switching
2. **Podcast Recording**: Creator uses timed cues for segment transitions and background changes
3. **Live Streaming**: Streamer pre-configures music changes aligned with planned content segments
4. **Presentation**: Speaker uses audio cues to enhance storytelling with automatic mood changes

## Design Principles
- **Simplicity First**: Every feature should have clear, immediate value
- **Reliability Over Features**: Core functionality must be rock-solid before adding complexity
- **Visual Clarity**: Interface should communicate state and actions clearly
- **Responsive Feedback**: All user actions should have immediate, obvious results
- **Graceful Degradation**: System should handle edge cases without breaking the experience
