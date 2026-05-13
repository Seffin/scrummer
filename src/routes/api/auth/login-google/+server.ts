import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { user, tokens } = await authService.authenticateGoogleUser(body);
    return json({ user: authService.toPublicUser(user), ...tokens });
  } catch (error) {
    console.error('Google login error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Google authentication failed',
      details: String(error)
    }, { status: 400 });
  }
};
