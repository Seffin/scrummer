import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authService } from '$lib/server/auth';
import { githubProxyFetch } from '$lib/server/githubProxy';

interface CreatePayload {
	owner?: string;
	repo?: string;
	title?: string;
	body?: string;
	mode?: 'issue-only' | 'issue-and-project';
	projectId?: string;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	let payload: CreatePayload;
	try {
		payload = (await request.json()) as CreatePayload;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const owner = payload.owner?.trim() ?? '';
	const repo = payload.repo?.trim() ?? '';
	const title = payload.title?.trim() ?? '';

	if (!owner || !repo || !title) {
		return json({ error: 'owner, repo and title are required' }, { status: 400 });
	}

	try {
		const user = authService.getCurrentUser(locals as App.Locals);
		if (!user.github_token || user.github_token === 'local_cli_authenticated') {
			return json({ error: 'GitHub is not connected for this account' }, { status: 409 });
		}
		const createPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
		const { response, data } = await githubProxyFetch(createPath, user.github_token, {
			method: 'POST',
			body: JSON.stringify({ title, body: payload.body }),
		});
		return json(data, { status: response.status });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to create issue' }, { status: 502 });
	}
};
