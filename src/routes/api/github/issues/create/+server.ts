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
	let payload: CreatePayload;
	try {
		payload = (await event.request.json()) as CreatePayload;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const owner = payload.owner?.trim() ?? '';
	const repo = payload.repo?.trim() ?? '';
	const title = payload.title?.trim() ?? '';
	const mode = payload.mode;
	const projectId = payload.projectId?.trim();

	if (!owner || !repo || !title || !mode) {
		return json({ error: 'owner, repo, title, and mode are required' }, { status: 400 });
	}

	if (mode !== 'issue-only' && mode !== 'issue-and-project') {
		return json({ error: 'mode must be issue-only or issue-and-project' }, { status: 400 });
	}

	if (mode === 'issue-and-project' && !projectId) {
		return json({ error: 'projectId is required when mode is issue-and-project' }, { status: 400 });
	}

	try {
		const result = await createGithubIssue({
			owner,
			repo,
			title,
			body: payload.body,
			mode,
			projectId
		});
		return json(result, { status: 201 });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to create issue' }, { status: 502 });
	}
}
