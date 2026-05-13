import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    return json({ user: authService.toPublicUser(user) });
  } catch (error) {
    console.error('Auth me error:', error);
    return json({ error: 'Failed to get user info' }, { status: 500 });
  }
};
