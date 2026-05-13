import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';

export const GET: RequestHandler = async ({ locals }) => {
  const user = authService.getCurrentUser(locals as App.Locals);
  const connected = !!user.github_token && user.github_token !== 'local_cli_authenticated';
  return json({ connected });
};
