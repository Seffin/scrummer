import { DatabaseService, type TimerSession, type TimerEvent } from './database-turso.js';
import type { AuthUser } from './auth.js';

const db = new DatabaseService();

export interface CreateTimerRequest {
  client: string;
  project: string;
  task: string;
  device_info: Record<string, any>;
}

export interface TimerConflictError extends Error {
  type: 'CONFLICT';
  conflictingSession: TimerSession;
}

export class TimerService {
  private static instance: TimerService;

  static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService();
    }
    return TimerService.instance;
  }

  /**
   * Start a new timer session for a user
   */
  async startTimer(user: AuthUser, request: CreateTimerRequest): Promise<TimerSession> {
    // Check if user already has an active timer
    const activeTimer = await db.getActiveTimerForUser(user.id);
    if (activeTimer) {
      const error = new Error('User already has an active timer') as TimerConflictError;
      error.type = 'CONFLICT';
      error.conflictingSession = activeTimer;
      throw error;
    }

    const now = new Date().toISOString();

    // Create new timer session
    const session = await db.createTimerSession({
      user_id: user.id,
      client: request.client,
      project: request.project,
      task: request.task,
      status: 'active',
      start_time: now,
      duration_seconds: 0,
      device_info: JSON.stringify(request.device_info),
    });

    // Log the start event
    await db.createTimerEvent({
      session_id: session.id,
      event_type: 'start',
      timestamp: new Date().toISOString(),
      device_info: JSON.stringify(request.device_info),
      metadata: JSON.stringify({ action: 'start_timer' }),
    });

    return session;
  }

  /**
   * Pause an active timer
   */
  async pauseTimer(user: AuthUser, sessionId: number, deviceInfo: Record<string, any>): Promise<TimerSession> {
    const session = await db.getTimerSession(sessionId);

    if (!session || session.user_id !== user.id) {
      throw new Error('Timer session not found or access denied');
    }

    if (session.status !== 'active') {
      throw new Error('Timer is not active');
    }

    // Calculate duration
    const startTime = new Date(session.start_time);
    const now = new Date();
    const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const totalDuration = session.duration_seconds + additionalSeconds;

    // Update session
    const updatedSession = await db.updateTimerSession(sessionId, {
      status: 'paused',
      duration_seconds: totalDuration,
      end_time: now.toISOString(),
    });

    if (!updatedSession) {
      throw new Error('Failed to update timer session');
    }

    // Log the pause event
    await db.createTimerEvent({
      session_id: sessionId,
      event_type: 'pause',
      timestamp: new Date().toISOString(),
      device_info: JSON.stringify(deviceInfo),
      metadata: JSON.stringify({
        action: 'pause_timer',
        duration_added: additionalSeconds,
        total_duration: totalDuration,
      }),
    });

    return updatedSession;
  }

  /**
   * Resume a paused timer
   */
  async resumeTimer(user: AuthUser, sessionId: number, deviceInfo: Record<string, any>): Promise<TimerSession> {
    const session = await db.getTimerSession(sessionId);

    if (!session || session.user_id !== user.id) {
      throw new Error('Timer session not found or access denied');
    }

    if (session.status !== 'paused') {
      throw new Error('Timer is not paused');
    }

    // Check if user has another active timer
    const activeTimer = await db.getActiveTimerForUser(user.id);
    if (activeTimer && activeTimer.id !== sessionId) {
      const error = new Error('User already has another active timer') as TimerConflictError;
      error.type = 'CONFLICT';
      error.conflictingSession = activeTimer;
      throw error;
    }

    const now = new Date().toISOString();

    // Update session to active with new start time
    const updatedSession = await db.updateTimerSession(sessionId, {
      status: 'active',
      start_time: now, // Reset start time for new active period
      end_time: undefined,
    });

    if (!updatedSession) {
      throw new Error('Failed to update timer session');
    }

    // Log the resume event
    await db.createTimerEvent({
      session_id: sessionId,
      event_type: 'resume',
      timestamp: new Date().toISOString(),
      device_info: JSON.stringify(deviceInfo),
      metadata: JSON.stringify({ action: 'resume_timer' }),
    });

    return updatedSession;
  }

  /**
   * Complete a timer session
   */
  async completeTimer(user: AuthUser, sessionId: number, deviceInfo: Record<string, any>): Promise<TimerSession> {
    const session = await db.getTimerSession(sessionId);

    if (!session || session.user_id !== user.id) {
      throw new Error('Timer session not found or access denied');
    }

    if (session.status === 'completed') {
      throw new Error('Timer is already completed');
    }

    const now = new Date();

    // Calculate final duration
    let totalDuration = session.duration_seconds;
    if (session.status === 'active') {
      const startTime = new Date(session.start_time);
      const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      totalDuration += additionalSeconds;
    }

    // Update session
    const updatedSession = await db.updateTimerSession(sessionId, {
      status: 'completed',
      duration_seconds: totalDuration,
      end_time: now.toISOString(),
    });

    if (!updatedSession) {
      throw new Error('Failed to update timer session');
    }

    // Log the complete event
    await db.createTimerEvent({
      session_id: sessionId,
      event_type: 'complete',
      timestamp: new Date().toISOString(),
      device_info: JSON.stringify(deviceInfo),
      metadata: JSON.stringify({
        action: 'complete_timer',
        final_duration: totalDuration,
      }),
    });

    return updatedSession;
  }

  /**
   * Discard a timer session
   */
  async discardTimer(user: AuthUser, sessionId: number, deviceInfo: Record<string, any>): Promise<void> {
    const session = await db.getTimerSession(sessionId);

    if (!session || session.user_id !== user.id) {
      throw new Error('Timer session not found or access denied');
    }

    // Log the discard event before deletion
    await db.createTimerEvent({
      session_id: sessionId,
      event_type: 'discard',
      timestamp: new Date().toISOString(),
      device_info: JSON.stringify(deviceInfo),
      metadata: JSON.stringify({ action: 'discard_timer' }),
    });

    // Note: Timer events will be deleted automatically due to CASCADE constraint
    // We don't actually delete the session, just mark it as discarded in metadata
  }

  /**
   * Get active timer for user
   */
  async getActiveTimer(user: AuthUser): Promise<TimerSession | null> {
    return await db.getActiveTimerForUser(user.id);
  }

  /**
   * Get timer sessions for user
   */
  async getTimerSessions(user: AuthUser, limit = 50): Promise<TimerSession[]> {
    return await db.getTimerSessionsForUser(user.id, limit);
  }

  /**
   * Get timer session by ID (with ownership check)
   */
  async getTimerSession(user: AuthUser, sessionId: number): Promise<TimerSession | null> {
    const session = await db.getTimerSession(sessionId);
    return session && session.user_id === user.id ? session : null;
  }

  /**
   * Get timer events for a session
   */
  async getTimerEvents(user: AuthUser, sessionId: number): Promise<TimerEvent[]> {
    const session = await db.getTimerSession(sessionId);
    if (!session || session.user_id !== user.id) {
      return [];
    }
    return await db.getTimerEventsForSession(sessionId);
  }
}

export const timerService = TimerService.getInstance();