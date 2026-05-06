# Feature: Authentication & Resilient Sync System

## Description
A premium, multi-tenant authentication and synchronization system that provides secure access via GitHub OAuth or traditional Email/Password. The system features a "Resilient Sync" engine that ensures data integrity across devices and browsers, even with intermittent internet or system clock changes, using a monotonic "Stopwatch" synchronization strategy and a NoSQL document-based backend.

## User Story
As a user working across multiple devices (Laptop, Phone, Tablet), I want a unique login that keeps my timers perfectly in sync. I want to be able to start work on one device and see it reflected on another instantly, and if I lose internet, I want my progress to be saved locally and "replayed" to the server accurately without worrying about my device's clock settings.

## User Benefits
- **Identity Flexibility**: Use GitHub for speed or Email for privacy/independence.
- **Data Continuity**: Your work sessions are never lost, even if you switch browsers or clear cache.
- **Reliable Accuracy**: Timers remain accurate even if you travel between timezones or change your system time.
- **Zero-Friction Sync**: Automatic merging of accounts based on verified email addresses.

## Acceptance Criteria
- [ ] Support for **GitHub OAuth** login.
- [ ] Support for **Email/Password** registration and login.
- [ ] **Account Merging**: Automatically link GitHub and Email profiles sharing the same verified email.
- [ ] **NoSQL Persistence**: Store all user and session data in a document-based JSON structure on the server.
- [ ] **Resilient Sync**: Use monotonic clock offsets (`performance.now()`) for offline actions to bypass system clock skew.
- [ ] **Conflict Detection**: Server-side enforcement of one active timer per user with a "Conflict Resolution" UI.
- [ ] **Heartbeat Sync**: Periodic background synchronization to keep multi-tab/multi-device states aligned.

## Rough Complexity Estimate
**High** (Due to the complexity of the monotonic sync logic and multi-provider auth handling).

## TDD Test Cases
1. **Auth Merging**: Register with Email `tom@example.com`, then login with GitHub using the same email. Verify both share the same User ID and data.
2. **Clock Skew Resilience**: Start a timer offline, change the laptop's system clock forward 2 hours, stop the timer 5 minutes later. Verify the server records exactly 5 minutes of duration.
3. **Multi-Device Conflict**: Start a timer on Device A. On Device B, attempt to start a different timer. Verify the server returns a 409 Conflict and Device B shows the "Active elsewhere" warning.
4. **Offline Replay**: Record 3 actions (Start, Pause, Resume) while offline. Reconnect and verify the server receives and processes them in the correct sequential order.

## Diagrams

### User Journey (Resilient Sync)
```mermaid
journey
    title Secure Sync Journey
    section Authentication
      User chooses GitHub or Email: 5: User
      System verifies & merges accounts: 5: System
    section Active Work
      User starts timer on Laptop: 5: User
      Internet drops in cafe: 3: Environment
      User completes task & starts new one: 5: User
    section Synchronization
      Internet returns: 5: Environment
      System replays "Stop" and "Start" events: 5: System
      User opens App on Phone: 5: User
      Phone shows the new task running: 5: System
```

### System Placement
```mermaid
graph TD
    Client[Svelte 5 App]
    Store[Tracker Store + Sync Queue]
    LS[(LocalStorage)]
    API[Hono REST API]
    Auth[Auth Service]
    Sync[Sync Service]
    DB[(NoSQL JSON DB)]

    Client --> Store
    Store --> LS
    Store --> API
    API --> Auth
    API --> Sync
    Auth --> DB
    Sync --> DB
```

### Module Structure
```mermaid
graph TD
    subgraph "Frontend"
        AuthUI[Login/Register Components]
        SyncEngine[SyncService.ts]
        TrackerStore[tracker.svelte.ts]
    end

    subgraph "Backend"
        AuthRouter[api/auth.ts]
        TimerRouter[api/timer.ts]
        Database[database.ts]
        AuthLogic[authService.ts]
    end

    AuthUI --> TrackerStore
    TrackerStore --> SyncEngine
    SyncEngine --> AuthRouter
    SyncEngine --> TimerRouter
    AuthRouter --> AuthLogic
    TimerRouter --> Database
    AuthLogic --> Database
```
