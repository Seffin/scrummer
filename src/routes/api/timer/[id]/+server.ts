import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const DELETE: RequestHandler = async ({ locals, request, params }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const sessionId = parseInt(params.id);
    const body = await request.json();
    await timerService.discardTimer(user, sessionId, body.device_info || {});
    return json({ message: 'Timer discarded successfully' });
  } catch (error) {
    console.error('Discard timer error:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to discard timer' }, { status: 500 });
  }
};
