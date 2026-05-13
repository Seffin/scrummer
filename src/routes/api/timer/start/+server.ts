import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService, type TimerConflictError } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const body = await request.json();
    const timer = await timerService.startTimer(user, body);
    return json({ timer });
  } catch (error) {
    console.error('Start timer error:', error);
    if (error instanceof Error && 'type' in error && error.type === 'CONFLICT') {
      const conflictError = error as TimerConflictError;
      return json({
        error: 'Timer conflict',
        message: 'You already have an active timer',
        conflicting_timer: conflictError.conflictingSession
      }, { status: 409 });
    }
    return json({ error: error instanceof Error ? error.message : 'Failed to start timer' }, { status: 500 });
  }
};
