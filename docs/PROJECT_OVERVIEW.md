# WorkTrack - Project Overview

## Project Identity

**WorkTrack** is an advanced time and task management application for tracking work across clients, projects, and GitHub issues. Built as a single-page application with tab-based navigation.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Svelte 5 (with Runes: `$state`, `$derived`, `$effect`) |
| **Build Tool** | Vite 8.x |
| **Language** | TypeScript 6.x |
| **Runtime** | Bun |
| **Styling** | Tailwind CSS 4.x (with Typography & Forms plugins) |
| **Testing** | Vitest (unit/component) + Playwright (E2E) |
| **Storage** | localStorage (client-side persistence) |

---

## Architecture

### Single-Page Tab Architecture
```
+page.svelte (Root)
├── NavBar (Tab navigation)
├── TimerPanel (Active timers + new task)
├── LogsPanel (Work history table)
├── ReportsPanel (Aggregated summaries)
└── GithubIssuesPanel (GitHub integration)
```

### State Management (Svelte 5 Runes)

| Store | Purpose | File |
|-------|---------|------|
| `tracker` | Core time tracking, sessions, timers | `src/lib/stores/tracker.svelte.ts` |
| `auth` | GitHub authentication state | `src/lib/stores/auth.svelte.ts` |
| `github` | GitHub issues data | `src/lib/stores/github.svelte.ts` |
| `tasks` | Task management | `src/lib/stores/tasks.svelte.ts` |
| `theme` | Dark/light mode | `src/lib/stores/theme.svelte.ts` |

### Data Model

```typescript
// WorkSession - Completed time entries
interface WorkSession {
  id: string;
  user: string;
  client: string;
  project: string;
  task: string;
  status: 'Pending' | 'In Progress' | 'On Hold' | 'Completed';
  startTime: string; // ISO
  endTime: string;   // ISO
  durationSeconds: number;
}

// ActiveTimer - Running or paused timers
interface ActiveTimer {
  id: string;
  user: string;
  client: string;
  project: string;
  task: string;
  status: TaskStatus;
  startTime: string;
  elapsedSeconds: number;
  running: boolean;
}

// GithubIssueRef - Linked GitHub issues
interface GithubIssueRef {
  number: number;
  title: string;
  url?: string;
}
```

---

## Feature Status (19 Documented)

### ✅ Implemented (10)

| Feature | Status | Notes |
|---------|--------|-------|
| GitHub Issues Metadata Listing | ✅ Complete | Full issue listing with labels, assignees, milestones |
| Start Timer from Issue | ✅ Complete | `startTimerFromGithubIssue()` in tracker store |
| Create Issue from WorkTrack | ✅ Complete | Modal with owner/repo/title/body + project linking |
| GitHub Auth in Panel Only | ✅ Complete | Auth isolated to GitHub tab, no global blocker |
| Device Flow Authentication | ✅ Complete | `DeviceAuthModal.svelte` with 8-digit device codes |
| GitHub Panel Timer Status | ✅ Complete | Shows Running/Paused/Start on issue rows |
| Timer Persistence Timestamp | ✅ Complete | Timestamp-based, survives tab close/refresh |
| Mobile Responsive UI | ⚠️ Partial | Tailwind responsive classes, no bottom nav/swipe gestures |
| GitHub OAuth Refactor | ⚠️ Partial | Device flow done, some CLI remnants may exist |
| Fix GitHub Panel UI | ✅ Complete | Dark mode, dropdowns, glassmorphism styling |

### ❌ Not Implemented (9)

| Feature | Priority | Blocker |
|---------|----------|---------|
| Background Sync Data | High | Needs Service Worker + Background Sync API |
| Home Panel Dashboard | Medium | Root route shows tabs, no dashboard view |
| Keyboard Shortcuts & Command Palette | Medium | No implementation |
| Logs Advanced Filters & Search | Medium | `LogsPanel.svelte` has no search/filters |
| Reports Export CSV/PDF | Medium | No export buttons or serialization |
| Offline Support (IndexedDB) | High | Uses localStorage, no IndexedDB schema |
| GitHub Optional Write-Back | Medium | No comment/status sync UI |
| GitHub Project Selection | Low | Manual project ID entry only |
| Fix Workflow | N/A | Dev workflow feature, not app functionality |

---

## Project Structure

```
Sample/
├── src/
│   ├── lib/
│   │   ├── components/          # 12 Svelte components
│   │   │   ├── TimerPanel.svelte        # Timer UI + new task form
│   │   │   ├── GithubIssuesPanel.svelte  # GitHub integration panel
│   │   │   ├── DeviceAuthModal.svelte    # OAuth device flow UI
│   │   │   ├── GithubIssueCreateModal.svelte
│   │   │   ├── LogsPanel.svelte
│   │   │   ├── ReportsPanel.svelte
│   │   │   ├── NavBar.svelte
│   │   │   ├── UserTimeChart.svelte
│   │   │   ├── StatusBadge.svelte
│   │   │   ├── ThemeToggle.svelte
│   │   │   └── GhAuthModal.svelte
│   │   ├── stores/              # 8 reactive stores (Svelte 5)
│   │   │   ├── tracker.svelte.ts      # Core business logic (~16KB)
│   │   │   ├── auth.svelte.ts
│   │   │   ├── github.svelte.ts
│   │   │   ├── tasks.svelte.ts
│   │   │   ├── theme.svelte.ts
│   │   │   ├── timer.svelte.ts
│   │   │   └── *.spec.ts              # Unit tests
│   │   ├── github/                # GitHub integration layer
│   │   │   ├── api.ts             # API calls with OAuth
│   │   │   ├── device-flow.ts     # Device flow implementation
│   │   │   ├── auth.ts            # Token management
│   │   │   ├── types.ts           # GitHub type definitions
│   │   │   └── *.spec.ts          # API tests
│   │   ├── server/                # Server-side utilities
│   │   └── index.ts
│   ├── routes/
│   │   ├── +page.svelte           # Main app shell (tab router)
│   │   ├── +layout.svelte
│   │   ├── github-tracking.e2e.ts # E2E tests
│   │   └── api/                   # API endpoints
│   ├── app.html
│   ├── app.css
│   └── app.d.ts
├── .local/features/               # 19 feature documents
│   ├── github-oauth-refactor.md
│   ├── home-panel-dashboard.md
│   ├── offline-support-indexeddb.md
│   └── ...
├── docs/
│   ├── architecture/
│   │   ├── local-server-per-device.md
│   │   └── multi-tenant-auth-flow.md
│   └── PROJECT_OVERVIEW.md        # This file
├── local-server/                  # Companion local server
│   ├── index.ts
│   └── package.json
├── scripts/
│   └── mobile-dev.js
├── tests/                         # Playwright E2E tests
├── package.json
├── bun.lock
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## Key Capabilities

### Time Tracking

- **Start/pause/resume/complete** timers with state persistence
- **Multiple concurrent timers** (per user assignment)
- **Auto-suggest** clients, projects, tasks from history
- **GitHub issue linking** - Timers prefixed with `#123 Issue Title`
- **Timestamp-based calculation** - Accurate even across tab closure

### GitHub Integration

- **OAuth Device Flow** - 8-digit codes, no PAT copy-paste
- **Browse issues** by owner/repository with search/filter
- **Start timers** directly from issue rows
- **Create issues** from WorkTrack with optional project linking
- **Timer status** shown on each issue (Running/Paused/Start)

### Data Persistence

- **localStorage** for sessions, timers, settings
- **Tab state remembered** - Returns to last active tab
- **Dark mode preference** saved across sessions
- **User shift goals** configurable per user

---

## Development Workflow

| Aspect | Rule |
|--------|------|
| **Branching** | Feature branches: `feature/<feature-name>` |
| **Feature Docs** | `.local/features/<name>.md` with TDD test cases, diagrams |
| **Testing** | Unit (Vitest) + Component (Vitest browser) + E2E (Playwright) |
| **Package Manager** | Bun (`bun.lock`) |
| **GitHub Ops** | Use `gh` CLI for PRs, issues |
| **Commit Messages** | Conventional commits (`feat:`, `fix:`, etc.) |

---

## Scripts

```bash
# Development
bun run dev              # Start dev server
bun run dev:mobile       # Start with mobile tunnel

# Testing
bun run test:unit        # Vitest unit/component tests
bun run test:e2e         # Playwright E2E tests
bun run test             # Full test suite

# Quality
bun run check            # Svelte type checking
bun run lint             # ESLint + Prettier
bun run format           # Auto-format code

# Build
bun run build            # Production build
bun run preview          # Preview production build
```

---

## Current Branch

**`feature/home-panel-dashboard`** - Working on dashboard feature (currently root route shows tab panels, not a unified dashboard view)

---

## Next Priorities

1. **Home Panel Dashboard** - Centralized overview with charts/metrics
2. **Offline Support** - IndexedDB + Background Sync API
3. **Logs Filters** - Search, date range, status filtering
4. **Export Reports** - CSV/PDF download functionality
5. **Command Palette** - Keyboard shortcuts for power users

---

*Generated: April 30, 2026*
