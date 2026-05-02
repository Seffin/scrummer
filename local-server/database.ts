import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: number;
  github_id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TimerSession {
  id: number;
  user_id: number;
  client: string;
  project: string;
  task: string;
  status: 'active' | 'paused' | 'completed';
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  device_info: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface TimerEvent {
  id: number;
  session_id: number;
  event_type: 'start' | 'pause' | 'resume' | 'complete' | 'discard';
  timestamp: string;
  device_info: string; // JSON string
  metadata?: string; // JSON string
}

interface DatabaseData {
  users: User[];
  timer_sessions: TimerSession[];
  timer_events: TimerEvent[];
  nextIds: {
    users: number;
    timer_sessions: number;
    timer_events: number;
  };
}

export class DatabaseService {
  private dataPath: string;
  private data: DatabaseData;

  constructor() {
    this.dataPath = path.join(__dirname, 'worktrack-data.json');
    this.data = this.loadData();
  }

  private loadData(): DatabaseData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading database:', error);
    }

    // Return default empty data structure
    return {
      users: [],
      timer_sessions: [],
      timer_events: [],
      nextIds: {
        users: 1,
        timer_sessions: 1,
        timer_events: 1,
      },
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
      throw new Error('Failed to save data');
    }
  }

  // User methods
  createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const now = new Date().toISOString();
    const user: User = {
      id: this.data.nextIds.users++,
      ...userData,
      created_at: now,
      updated_at: now,
    };

    this.data.users.push(user);
    this.saveData();
    return user;
  }

  getUserById(id: number): User | null {
    return this.data.users.find(user => user.id === id) || null;
  }

  getUserByGithubId(githubId: string): User | null {
    return this.data.users.find(user => user.github_id === githubId) || null;
  }

  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): User | null {
    const userIndex = this.data.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.saveData();
    return this.data.users[userIndex];
  }

  // Timer session methods
  createTimerSession(sessionData: Omit<TimerSession, 'id' | 'created_at' | 'updated_at'>): TimerSession {
    const now = new Date().toISOString();
    const session: TimerSession = {
      id: this.data.nextIds.timer_sessions++,
      ...sessionData,
      created_at: now,
      updated_at: now,
    };

    this.data.timer_sessions.push(session);
    this.saveData();
    return session;
  }

  getTimerSessionById(id: number): TimerSession | null {
    return this.data.timer_sessions.find(session => session.id === id) || null;
  }

  getActiveTimerForUser(userId: number): TimerSession | null {
    return this.data.timer_sessions.find(session =>
      session.user_id === userId && session.status === 'active'
    ) || null;
  }

  getTimerSessionsForUser(userId: number, limit = 50): TimerSession[] {
    return this.data.timer_sessions
      .filter(session => session.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  updateTimerSession(id: number, updates: Partial<Omit<TimerSession, 'id' | 'created_at' | 'updated_at'>>): TimerSession | null {
    const sessionIndex = this.data.timer_sessions.findIndex(session => session.id === id);
    if (sessionIndex === -1) return null;

    this.data.timer_sessions[sessionIndex] = {
      ...this.data.timer_sessions[sessionIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.saveData();
    return this.data.timer_sessions[sessionIndex];
  }

  // Timer event methods
  createTimerEvent(eventData: Omit<TimerEvent, 'id' | 'timestamp'>): TimerEvent {
    const event: TimerEvent = {
      id: this.data.nextIds.timer_events++,
      ...eventData,
      timestamp: new Date().toISOString(),
    };

    this.data.timer_events.push(event);
    this.saveData();
    return event;
  }

  getTimerEventById(id: number): TimerEvent | null {
    return this.data.timer_events.find(event => event.id === id) || null;
  }

  getTimerEventsForSession(sessionId: number): TimerEvent[] {
    return this.data.timer_events
      .filter(event => event.session_id === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  close() {
    // No-op for file-based storage
  }
}

// Singleton instance
export const db = new DatabaseService();