import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { githubProxyFetch } from '$lib/server/githubProxy';

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    const user = authService.getCurrentUser(locals as App.Locals);
    if (!user.github_token || user.github_token === 'local_cli_authenticated') {
      return json({ error: 'GitHub is not connected for this account' }, { status: 409 });
    }
    const owner = url.searchParams.get('owner');
    if (!owner) {
      const { response, data } = await githubProxyFetch(
        '/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated',
        user.github_token
      );
      return json(data, { status: response.status });
    }

    const userReposPath = `/users/${encodeURIComponent(owner)}/repos?per_page=100`;
    const userReposResult = await githubProxyFetch(userReposPath, user.github_token);
    if (userReposResult.response.ok) {
      return json(userReposResult.data, { status: userReposResult.response.status });
    }

    const orgReposPath = `/orgs/${encodeURIComponent(owner)}/repos?per_page=100`;
    const orgReposResult = await githubProxyFetch(orgReposPath, user.github_token);
    return json(orgReposResult.data, { status: orgReposResult.response.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'GitHub proxy failed' }, { status: 500 });
  }
};
