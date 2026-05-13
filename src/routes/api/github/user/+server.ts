import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { githubProxyFetch } from '$lib/server/githubProxy';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return json({ error: 'GitHub is not connected for this account' }, { status: 409 });
    }
    const { response, data } = await githubProxyFetch('/user', user.github_token);
    return json(data, { status: response.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, { status: 500 });
  }
};
