# WorkTrack - Project Outline

## 1. Project Overview
WorkTrack is a time-tracking and productivity dashboard application designed to help users log work sessions, manage tasks, and seamlessly integrate with GitHub issues. It currently functions as a robust local-first application but is structured to be deployed to the cloud (e.g., Vercel).

## 2. Technology Stack
- **Framework**: Svelte 5 (with SvelteKit)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Package Manager / Runtime**: Bun
- **Current Local Backend**: Hono (running on Node.js/Bun) with a local file-based database (`worktrack-data.json`).

## 3. Core Features

### ⏱️ Time Tracking
- **Timer Store**: A global Svelte 5 store managing active timers, elapsed seconds, and queued (paused) tasks.
- **Actions**: Start, Pause, Resume, Complete & Save, and Discard.
- **Timer Events**: Logs granular actions (when a timer was started, paused, or completed) for accurate auditing.

### 🔐 Authentication & Identity
- **Multi-Tenant System**: Supports multiple distinct users on the same instance.
- **Login Methods**: Email & Password, GitHub OAuth, and Google OAuth.
- **Session Management**: Handled via JWT tokens (currently tracked in a local token store).

### 🐙 GitHub Integration
- **Issue Tracking**: Fetches open issues from a specified GitHub repository directly into the dashboard.
- **User-Specific Repositories**: Each user can configure their own default target repository (e.g., `owner/repo`) in the Settings panel, ensuring data isolation.
- **Action Links**: One-click to start a timer directly from a GitHub issue.

### 📊 Dashboard & UI
- **Mobile Responsive**: Fully responsive layout ensuring widgets like the Timeframe Selector and NavBar adapt gracefully to smaller screens.
- **Hero Metrics**: Displays high-level summaries (Total Time, Active Tasks).
- **Charts Widget**: Visualizes time spent over daily, weekly, monthly, or yearly timeframes.
- **Quick Access**: Allows rapid starting of timers based on recent clients, projects, or GitHub tasks.

## 4. Directory Structure

```text
h:\Seffin\Benjamin\Sample\
├── .local/
│   └── features/             # Feature documentation and proposals (e.g., user-repo-linking.md)
├── local-server/             # Local backend implementation
│   ├── auth.ts               # Authentication logic and JWT verification
│   ├── database.ts           # JSON file-based database adapter
│   ├── index.ts              # Hono API routing
│   ├── timer.ts              # Timer logic and conflict resolution
│   └── worktrack-data.json   # Local Database (Ignored in Git)
├── src/
│   ├── lib/
│   │   ├── api/              # API Client wrappers for Svelte to communicate with the server
│   │   ├── auth/             # Frontend auth utilities
│   │   ├── components/       # Svelte UI Components (NavBar, SettingsPanel, etc.)
│   │   │   └── dashboard/    # Dashboard-specific widgets (ChartsWidget, QuickAccessWidget)
│   │   ├── github/           # GitHub API functions and Types
│   │   ├── stores/           # Svelte 5 Global Stores (auth.svelte.ts, timer.svelte.ts, github.svelte.ts)
│   │   └── utils/            # Helper functions (timeUtils, formatters)
│   └── routes/               # SvelteKit Pages
└── package.json              # Dependencies and scripts (dev:all, build, check)
```

## 5. Data Models (Database Schema)

- **User**: `id`, `username`, `email`, `password_hash`, `github_token`, `github_repo`, `created_at`
- **TimerSession**: `id`, `user_id`, `client`, `project`, `task`, `status` (active/paused/completed), `start_time`, `end_time`, `duration_seconds`
- **TimerEvent**: `id`, `session_id`, `event_type` (start/pause/resume/complete), `timestamp`

## 6. Deployment Road Map (Vercel Migration)
To successfully deploy to Vercel, the local JSON storage model must be replaced since Vercel's Serverless Functions have a read-only filesystem.

- **Phase 1: Cloud Database Setup**: Provision a cloud database such as **Supabase (PostgreSQL)** or **Vercel Postgres**.
- **Phase 2: Backend Refactor**: Migrate the logic inside `local-server/index.ts` to SvelteKit Server API Routes (`src/routes/api/...`).
- **Phase 3: Database Adapter**: Replace `local-server/database.ts` with an ORM (like Prisma/Drizzle) or a direct SDK (like the Supabase client) to connect to the cloud database.
- **Phase 4: Security (RLS)**: Implement Row Level Security or robust API checks to ensure users can only access their own timers and profile data.
