import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, request, params }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const sessionId = parseInt(params.id);
    const body = await request.json();
    const timer = await timerService.pauseTimer(user, sessionId, body.device_info || {});
    return json({ timer });
  } catch (error) {
    console.error('Pause timer error:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to pause timer' }, { status: 500 });
  }
};
