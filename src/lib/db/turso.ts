import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

// Database client for Turso or local SQLite
const getDbConfig = () => {
  const url = env.TURSO_DATABASE_URL || 'file:local.db';
  const token = env.TURSO_AUTH_TOKEN;
  return { url, token };
};

const config = getDbConfig();

export const turso = createClient({
  url: config.url,
  authToken: config.token
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
    // 1. Run core schema creation
    for (const statement of schemaStatements) {
      await turso.execute(statement);
    }

    // 2. Run migrations for older schemas (idempotent via try-catch)
    const migrations = [
      "ALTER TABLE users ADD COLUMN google_id TEXT",
      "ALTER TABLE users ADD COLUMN password_hash TEXT",
      "ALTER TABLE users ADD COLUMN avatar_url TEXT",
      "ALTER TABLE users ADD COLUMN github_repo TEXT"
    ];

    for (const migration of migrations) {
      try {
        await turso.execute(migration);
      } catch (e) {
        // Ignore "duplicate column name" errors
      }
    }

    console.log('[Turso] Database initialized and migrated successfully');
  } catch (error) {
    console.error('[Turso] Failed to initialize database:', error);
    throw error;
  }
}
