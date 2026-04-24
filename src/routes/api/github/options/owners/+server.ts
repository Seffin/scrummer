import { listGithubOwners } from '$lib/server/github/options';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const owners = await listGithubOwners();
		return json({ owners });
	} catch (error: any) {
		return json({ error: error?.message ?? 'Failed to load owners' }, { status: 502 });
	}
}
