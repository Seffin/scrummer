import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const body = await request.json();
    const timer = await timerService.queueTimer(user, body);
    return json({ timer });
  } catch (error) {
    console.error('Queue task error:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to queue task' }, { status: 500 });
  }
};
