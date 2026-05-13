import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const sessionId = parseInt(params.id);
    const events = await timerService.getTimerEvents(user, sessionId);
    return json({ events });
  } catch (error) {
    console.error('Get timer events error:', error);
    return json({ error: 'Failed to get timer events' }, { status: 500 });
  }
};
