import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService, type TimerConflictError } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, request, params }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const sessionId = parseInt(params.id);
    const body = await request.json();
    const timer = await timerService.resumeTimer(user, sessionId, body.device_info || {});
    return json({ timer });
  } catch (error) {
    console.error('Resume timer error:', error);
    if (error instanceof Error && 'type' in error && error.type === 'CONFLICT') {
      const conflictError = error as TimerConflictError;
      return json({
        error: 'Timer conflict',
        message: 'You already have another active timer',
        conflicting_timer: conflictError.conflictingSession
      }, { status: 409 });
    }
    return json({ error: error instanceof Error ? error.message : 'Failed to resume timer' }, { status: 500 });
  }
};
