import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password, username } = await request.json();
    const { user, tokens } = await authService.register(email, password, username);
    return json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: error instanceof Error ? error.message : 'Registration failed' }, { status: 400 });
  }
};
