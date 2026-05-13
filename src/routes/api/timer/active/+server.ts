import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timerService } from '$lib/server/timer';
import { authService } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const activeTimer = await timerService.getActiveTimer(user);
    return json({ timer: activeTimer });
  } catch (error) {
    console.error('Get active timer error:', error);
    return json({ error: 'Failed to get active timer' }, { status: 500 });
  }
};
