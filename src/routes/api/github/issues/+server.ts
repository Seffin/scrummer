import { normalizeIssue } from '$lib/github/normalize';
import { runGhJson } from '$lib/server/github/ghClient';
import { json } from '@sveltejs/kit';

export async function GET(event: { url: URL }) {
	const owner = event.url.searchParams.get('owner')?.trim();
	const repo = event.url.searchParams.get('repo')?.trim();

	if (!owner || !repo) {
		return json({ error: 'owner and repo are required' }, { status: 400 });
	}

	try {
		const raw = await runGhJson([
			'issue',
			'list',
			'--repo',
			`${owner}/${repo}`,
			'--json',
			'number,title,state,labels,assignees,milestone,createdAt,updatedAt,url'
		]);
		const issues = Array.isArray(raw) ? raw.map(normalizeIssue) : [];
		return json({ issues });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to fetch issues' }, { status: 502 });
	}
}
