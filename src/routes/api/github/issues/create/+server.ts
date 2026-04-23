import { createGithubIssue } from '$lib/server/github/ghClient';
import { json } from '@sveltejs/kit';

interface CreatePayload {
	owner?: string;
	repo?: string;
	title?: string;
	body?: string;
	mode?: 'issue-only' | 'issue-and-project';
	projectId?: string;
}

export async function POST(event: { request: Request }) {
	const payload = (await event.request.json()) as CreatePayload;

	if (!payload.owner || !payload.repo || !payload.title || !payload.mode) {
		return json({ error: 'owner, repo, title, and mode are required' }, { status: 400 });
	}

	try {
		const result = await createGithubIssue({
			owner: payload.owner,
			repo: payload.repo,
			title: payload.title,
			body: payload.body,
			mode: payload.mode,
			projectId: payload.projectId
		});
		return json(result, { status: 201 });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to create issue' }, { status: 502 });
	}
}
