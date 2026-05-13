import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email, password } = await request.json();
    const { user, tokens } = await authService.login(email, password);
    return json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Email login error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Login failed',
      details: String(error)
    }, { status: 401 });
  }
};
