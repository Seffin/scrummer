import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sessions = await timerService.getTimerSessions(user, limit);
    return json({ sessions });
  } catch (error) {
    console.error('Get timer sessions error:', error);
    return json({ error: 'Failed to get timer sessions' }, { status: 500 });
  }
};
