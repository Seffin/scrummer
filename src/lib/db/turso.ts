import { createClient } from '@libsql/client/node';

// Database client for Turso or local SQLite
const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

if (process.env.VERCEL && databaseUrl === 'file:local.db') {
  throw new Error('FATAL: TURSO_DATABASE_URL must be set in Vercel. Using local.db in serverless will cause data loss.');
}

export const turso = createClient({
  url: databaseUrl,
  authToken: authToken
});

// Database schema statements
const schemaStatements = [
  `-- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id TEXT,
    github_username TEXT,
    github_token TEXT,
    google_id TEXT,
    username TEXT NOT NULL,
    email TEXT,
    password_hash TEXT,
    avatar_url TEXT,
    github_repo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `-- Timer sessions table
  CREATE TABLE IF NOT EXISTS timer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client TEXT NOT NULL,
    project TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    device_info TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `-- Timer events table
  CREATE TABLE IF NOT EXISTS timer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'complete', 'discard')),
    timestamp TEXT NOT NULL,
    device_info TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES timer_sessions(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_timer_events_session_id ON timer_events(session_id)`
];

// Initialize database schema
export async function initializeDatabase() {
  try {
    for (const statement of schemaStatements) {
      await turso.execute(statement);
    }
    console.log('[Turso] Database initialized successfully');
  } catch (error) {
    console.error('[Turso] Failed to initialize database:', error);
    throw error;
  }
}
