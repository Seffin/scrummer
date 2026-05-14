import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { githubProxyFetch } from '$lib/server/githubProxy';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');
    if (!owner || !repo) {
      return json({ error: 'owner and repo are required' }, { status: 400 });
    }
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return json({ error: 'GitHub is not connected for this account' }, { status: 409 });
    }
    const issuesPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?per_page=100&state=all`;
    const { response, data } = await githubProxyFetch(issuesPath, user.github_token);
    return json(data, { status: response.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, { status: 500 });
  }
};
