import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

// Database client for Turso or local SQLite
const getDbConfig = () => {
  const url = env.TURSO_DATABASE_URL;
  const token = env.TURSO_AUTH_TOKEN;
  
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('❌ FATAL: TURSO_DATABASE_URL is missing in production environment!');
  }
  
  return { 
    url: url || 'file:local.db', 
    token 
  };
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
      status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
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
  console.log('[Turso] Database initialized and migrated successfully');
}
