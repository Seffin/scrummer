import { listGithubRepos } from '$lib/server/github/options';
import { json } from '@sveltejs/kit';

export async function GET(event: { url: URL }) {
	const owner = event.url.searchParams.get('owner')?.trim();
	if (!owner) {
		return json({ error: 'owner is required' }, { status: 400 });
	}

	try {
		const repos = await listGithubRepos(owner);
		return json({ repos });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to load repos' }, { status: 502 });
	}
}
