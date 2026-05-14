import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

// Database client for Turso or local SQLite
const getDbConfig = () => {
  const url = env.TURSO_DATABASE_URL;
  const token = env.TURSO_AUTH_TOKEN;
  
  if (!url) {
    throw new Error('❌ FATAL: TURSO_DATABASE_URL is missing! Please set it in your .env file to use the Cloud Database.');
  }
  
  return { url, token };
};

const config = getDbConfig();

export const turso = createClient({
  url: config.url,
  authToken: config.token
});

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  // Database schema statements
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
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
    `CREATE TABLE IF NOT EXISTS timer_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client TEXT NOT NULL,
      project TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'queued')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      device_info TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS timer_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'complete', 'discard')),
      timestamp TEXT NOT NULL,
      device_info TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (session_id) REFERENCES timer_sessions(id)
    )`,
    // Migration: Add columns if they don't exist
    `ALTER TABLE users ADD COLUMN google_id TEXT`,
    `ALTER TABLE users ADD COLUMN password_hash TEXT`
  ];

  console.log('[Turso] Database initialization started...');
  for (const statement of schemaStatements) {
    try {
      await turso.execute(statement);
    } catch (err) {
      // Ignore errors for existing columns
      if (!(err instanceof Error && err.message.includes('duplicate column name'))) {
        console.warn(`[Turso] Statement warning (might be safe): ${statement.substring(0, 50)}...`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Migration: Add 'queued' to timer_sessions status check if not present
  try {
    const result = await turso.execute("SELECT sql FROM sqlite_master WHERE name='timer_sessions'");
    const sql = result.rows[0]?.sql as string;
    if (sql && !sql.includes("'queued'")) {
      console.log('[Turso] Migrating timer_sessions to include "queued" status...');
      
      // We must run these in a specific order to avoid foreign key violations
      await turso.execute("PRAGMA foreign_keys=OFF");
      
      await turso.batch([
        `CREATE TABLE timer_sessions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          client TEXT NOT NULL,
          project TEXT NOT NULL,
          task TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'queued')),
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          device_info TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        "INSERT INTO timer_sessions_new (id, user_id, client, project, task, status, start_time, end_time, duration_seconds, device_info, created_at, updated_at) SELECT id, user_id, client, project, task, status, start_time, end_time, duration_seconds, device_info, created_at, updated_at FROM timer_sessions",
        "DROP TABLE timer_sessions",
        "ALTER TABLE timer_sessions_new RENAME TO timer_sessions",
        "CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status)"
      ], "write");
      
      await turso.execute("PRAGMA foreign_keys=ON");
      
      console.log('[Turso] Migration to "queued" status completed.');
    }
  } catch (err) {
    console.error('[Turso] Migration failed:', err);
    // Ensure foreign keys are back on even if it fails
    try { await turso.execute("PRAGMA foreign_keys=ON"); } catch(e) {}
  }

  console.log('[Turso] Database initialized and migrated successfully');
}
