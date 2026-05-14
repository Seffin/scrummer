import { turso } from '$lib/db/turso';

export interface User {
  id: number;
  github_id?: string;
  github_username?: string;
  github_token?: string;
  google_id?: string;
  username: string;
  email?: string;
  password_hash?: string;
  avatar_url?: string;
  github_repo?: string;
  created_at: string;
  updated_at: string;
}

export interface TimerSession {
  id: number;
  user_id: number;
  client: string;
  project: string;
  task: string;
  status: 'active' | 'paused' | 'completed' | 'queued';
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  device_info: string;
  created_at: string;
  updated_at: string;
}

export interface TimerEvent {
  id: number;
  session_id: number;
  event_type: 'start' | 'pause' | 'resume' | 'complete' | 'discard';
  timestamp: string;
  device_info: string;
  metadata?: string;
}

export class DatabaseService {
  constructor() {
    // In serverless environments, we avoid pinging the database on initialization
    // to prevent cold-start delays and build-time timeout errors.
    // The @libsql/client automatically connects when the first query is executed.
  }

  /**
   * Ensure all values are SQL-compatible (convert undefined to null, objects to strings)
   */
  private sanitizeValue(val: any): any {
    if (val === undefined || val === null) return null;
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return String(val);
      }
    }
    return val;
  }

  private sanitizeArgs(args: any[]): any[] {
    const sanitized = args.map(v => this.sanitizeValue(v));
    console.log('[DatabaseService] Sanitized Args:', JSON.stringify(sanitized));
    return sanitized;
  }

  // User methods
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    console.log('[DatabaseService] Creating user:', userData.username);
    await turso.execute({
      sql: `
        INSERT INTO users (github_id, github_username, github_token, google_id, username, email, password_hash, avatar_url, github_repo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: this.sanitizeArgs([
        userData.github_id || null,
        userData.github_username || null,
        userData.github_token || null,
        userData.google_id || null,
        userData.username,
        userData.email || null,
        userData.password_hash || null,
        userData.avatar_url || null,
        userData.github_repo || null,
        now,
        now
      ])
    });

    // Fetch the created user
    const user = await this.getUserByUsername(userData.username);
    if (!user) throw new Error('Failed to retrieve created user');
    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE username = ? ORDER BY created_at DESC LIMIT 1',
      args: this.sanitizeArgs([username])
    });
    return result.rows[0] as User || null;
  }

  async getUserById(id: number | undefined | null): Promise<User | null> {
    if (id === undefined || id === null || typeof id !== 'number') {
      return null;
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: this.sanitizeArgs([id])
    });

    return result.rows[0] as User || null;
  }

  async getUserByGithubId(githubId: string): Promise<User | null> {
    if (!githubId) {
      return null;
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE github_id = ?',
      args: this.sanitizeArgs([githubId])
    });

    return result.rows[0] as User || null;
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    if (!googleId) {
      return null;
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE google_id = ?',
      args: this.sanitizeArgs([googleId])
    });

    return result.rows[0] as User || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) {
      return null;
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: this.sanitizeArgs([email])
    });

    return result.rows[0] as User || null;
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User | null> {
    if (id === undefined || id === null) {
      return null;
    }
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(key => `${key} = ?`).join(', ');
    const values = fields.map(key => updates[key as keyof typeof updates]);

    console.log('[DatabaseService] Updating user:', id);
    await turso.execute({
      sql: `UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`,
      args: this.sanitizeArgs([...values, new Date().toISOString(), id])
    });

    return await this.getUserById(id);
  }

  // Timer session methods
  async createTimerSession(sessionData: Omit<TimerSession, 'id' | 'created_at' | 'updated_at'>): Promise<TimerSession> {
    const now = new Date().toISOString();
    console.log('[DatabaseService] Creating timer session for user:', sessionData.user_id);
    const result = await turso.execute({
      sql: `
        INSERT INTO timer_sessions (user_id, client, project, task, status, start_time, end_time, duration_seconds, device_info, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: this.sanitizeArgs([
        sessionData.user_id,
        sessionData.client,
        sessionData.project,
        sessionData.task,
        sessionData.status,
        sessionData.start_time,
        sessionData.end_time || null,
        sessionData.duration_seconds,
        sessionData.device_info,
        now,
        now
      ])
    });

    // In SQLite, last_insert_rowid() is the way to get the ID if RETURNING is not used
    const lastId = Number(result.lastInsertRowid);
    const session = await this.getTimerSession(lastId);
    if (!session) throw new Error('Failed to retrieve created timer session');
    return session;
  }

  async getTimerSession(id: number): Promise<TimerSession | null> {
    if (id === undefined || id === null) {
      return null;
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM timer_sessions WHERE id = ?',
      args: this.sanitizeArgs([id])
    });

    return result.rows[0] as TimerSession || null;
  }

  async getActiveTimerForUser(userId: number | undefined | null): Promise<TimerSession | null> {
    if (userId === undefined || userId === null || typeof userId !== 'number') {
      return null;
    }
    const result = await turso.execute({
      sql: "SELECT * FROM timer_sessions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      args: this.sanitizeArgs([userId])
    });

    return result.rows[0] as TimerSession || null;
  }

  async getTimerSessionsForUser(userId: number, limit = 50): Promise<TimerSession[]> {
    if (userId === undefined || userId === null) {
      return [];
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM timer_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      args: this.sanitizeArgs([userId, limit])
    });

    return result.rows as TimerSession[];
  }

  async updateTimerSession(id: number, updates: Partial<Omit<TimerSession, 'id' | 'created_at' | 'updated_at'>>): Promise<TimerSession | null> {
    if (id === undefined || id === null) {
      return null;
    }
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = Object.values(updates);
    
    if (fields.length === 0) return null;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const now = new Date().toISOString();

    console.log('[DatabaseService] Updating timer session:', id);
    await turso.execute({
      sql: `
        UPDATE timer_sessions 
        SET ${setClause}, updated_at = ?
        WHERE id = ?
      `,
      args: this.sanitizeArgs([...values, now, id])
    });

    return await this.getTimerSession(id);
  }

  // Timer event methods
  async createTimerEvent(eventData: Omit<TimerEvent, 'id'>): Promise<TimerEvent> {
    console.log('[DatabaseService] Creating timer event for session:', eventData.session_id);
    const result = await turso.execute({
      sql: `
        INSERT INTO timer_events (session_id, event_type, timestamp, device_info, metadata)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: this.sanitizeArgs([
        eventData.session_id,
        eventData.event_type,
        eventData.timestamp,
        eventData.device_info,
        eventData.metadata || null
      ])
    });

    const lastId = Number(result.lastInsertRowid);
    const result2 = await turso.execute({
      sql: 'SELECT * FROM timer_events WHERE id = ?',
      args: this.sanitizeArgs([lastId])
    });
    return result2.rows[0] as TimerEvent;
  }

  async getTimerEventsForSession(sessionId: number): Promise<TimerEvent[]> {
    if (sessionId === undefined || sessionId === null) {
      return [];
    }
    const result = await turso.execute({
      sql: 'SELECT * FROM timer_events WHERE session_id = ? ORDER BY timestamp ASC',
      args: this.sanitizeArgs([sessionId])
    });

    return result.rows as TimerEvent[];
  }

  // Migration helper
  async migrateFromJson(jsonData: any): Promise<void> {
    console.log('[DatabaseService] Starting migration from JSON...');
    
    try {
      // Migrate users
      if (jsonData.users && Array.isArray(jsonData.users)) {
        for (const user of jsonData.users) {
          await this.createUser(user);
        }
        console.log(`[DatabaseService] Migrated ${jsonData.users.length} users`);
      }

      // Migrate timer sessions
      if (jsonData.timer_sessions && Array.isArray(jsonData.timer_sessions)) {
        for (const session of jsonData.timer_sessions) {
          await this.createTimerSession(session);
        }
        console.log(`[DatabaseService] Migrated ${jsonData.timer_sessions.length} timer sessions`);
      }

      // Migrate timer events
      if (jsonData.timer_events && Array.isArray(jsonData.timer_events)) {
        for (const event of jsonData.timer_events) {
          await this.createTimerEvent(event);
        }
        console.log(`[DatabaseService] Migrated ${jsonData.timer_events.length} timer events`);
      }

      console.log('[DatabaseService] Migration completed successfully');
    } catch (error) {
      console.error('[DatabaseService] Migration failed:', error);
      throw error;
    }
  }
}
