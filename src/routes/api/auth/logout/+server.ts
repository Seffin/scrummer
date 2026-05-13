import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('[API] Logout request received');
    const token = authService.extractTokenFromHeader(authHeader || undefined);
    const user = authService.getCurrentUser(locals as App.Locals);

    if (token && user) {
      await authService.logoutWithGitHubRevoke(token, user);
      console.log('[API] Token and GitHub token revoked successfully');
    }

    return json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Auth logout error:', error);
    return json({
      error: 'Failed to logout',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};
