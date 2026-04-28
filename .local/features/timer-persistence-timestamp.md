# Feature: Timer Persistence with Timestamp

## Description
Refactor timer persistence to use localStorage + timestamp approach instead of setInterval. This ensures timers continue accurately even when the app is in the background or the browser kills background processes.

## User Story
As a user, I want my timer to continue tracking time accurately even when I switch apps or the browser goes into background, so that my time tracking remains reliable and I don't lose any tracked time.

## User Benefits
- Accurate time tracking across app backgrounding
- No lost time when browser kills background processes
- Better battery performance (no constant setInterval)
- Reliable timer restoration on app resume
- Consistent time tracking across device reboots

## Acceptance Criteria
- [ ] Timer uses timestamp-based calculation instead of setInterval counting
- [ ] Timer persists session start time and elapsed time to localStorage
- [ ] Timer calculates elapsed time based on timestamps on resume
- [ ] Timer handles app backgrounding/resume gracefully
- [ ] Timer survives browser tab closure and reopening
- [ ] Timer remains accurate across device time changes
- [ ] Performance improvements with reduced CPU usage

## Rough Complexity Estimate
Medium

## TDD Test Cases
1. **Timestamp Calculation**: Verify timer calculates elapsed time correctly from timestamps
2. **Background Resume**: Verify timer accuracy after app backgrounding
3. **Tab Closure**: Verify timer persists and restores correctly after tab closure
4. **Time Accuracy**: Verify timer remains accurate across different time scenarios
5. **Performance**: Verify reduced CPU usage compared to setInterval approach

## Mermaid Diagrams

### Timer Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running: Start Timer
    Running --> Paused: Pause
    Running --> Completed: Complete
    Paused --> Running: Resume
    Paused --> Completed: Complete
    Completed --> Idle
    Running --> Background: App Backgrounded
    Background --> Running: App Resumed
    Background --> Paused: Manual Pause
```

### Data Flow
```mermaid
graph TD
    A[Timer Start] --> B[Store Start Timestamp]
    B --> C[Calculate Elapsed Time]
    C --> D[Persist to localStorage]
    D --> E[Update Display]
    E --> F{App Backgrounded?}
    F -- Yes --> G[Pause Polling]
    F -- No --> C
    G --> H{App Resumed?}
    H -- Yes --> I[Calculate Time Difference]
    I --> C
```

### Module Structure
```mermaid
classDiagram
    class TimerStore {
        +startTime: number
        +lastPauseTime: number
        +totalElapsed: number
        +isRunning: boolean
        +startTimer()
        +pauseTimer()
        +resumeTimer()
        +calculateElapsed()
        +persistState()
    }
    class TimestampService {
        +getCurrentTimestamp()
        +calculateElapsed()
        +formatDuration()
    }
    class PersistenceService {
        +saveTimerState()
        +loadTimerState()
        +clearTimerState()
    }
    TimerStore --> TimestampService
    TimerStore --> PersistenceService
```
