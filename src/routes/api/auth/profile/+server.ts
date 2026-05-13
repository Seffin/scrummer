import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const PUT: RequestHandler = async ({ locals, request }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const body = await request.json();
    const updatedUser = await authService.updateUserProfile(user, body);
    const publicUser = authService.toPublicUser(updatedUser);
    if (!publicUser) {
      return json({ error: 'Failed to update profile' }, { status: 500 });
    }
    return json({ user: publicUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 500 });
  }
};
