import { listGithubProjects } from '$lib/server/github/options';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
	const owner = url.searchParams.get('owner');
	if (!owner) return json({ error: 'Owner is required' }, { status: 400 });

	try {
		const projects = await listGithubProjects(owner);
		return json({ projects });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to load projects' }, { status: 502 });
	}
}
