import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runGhJson } from './ghClient';

const execFileAsync = promisify(execFile);

interface GithubRemoteRef {
	owner: string;
	repo: string;
}

function parseGithubRemote(url: string): GithubRemoteRef | null {
	const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
	if (sshMatch) {
		return { owner: sshMatch[1], repo: sshMatch[2] };
	}

	const httpsMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
	if (httpsMatch) {
		return { owner: httpsMatch[1], repo: httpsMatch[2] };
	}

	const sshUrlMatch = url.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
	if (sshUrlMatch) {
		return { owner: sshUrlMatch[1], repo: sshUrlMatch[2] };
	}

	return null;
}

async function listGitRemoteRefs(): Promise<GithubRemoteRef[]> {
	try {
		const { stdout } = await execFileAsync('git', ['remote', '-v']);
		const refs = stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => line.split(/\s+/)[1])
			.filter(Boolean)
			.map(parseGithubRemote)
			.filter((v): v is GithubRemoteRef => v !== null);

		const unique = new Map<string, GithubRemoteRef>();
		for (const ref of refs) {
			unique.set(`${ref.owner}/${ref.repo}`, ref);
		}
		return [...unique.values()];
	} catch {
		return [];
	}
}

export async function listGithubOwners(): Promise<string[]> {
	const owners = new Set<string>();

	try {
		const me = (await runGhJson(['api', 'user'])) as { login?: string };
		if (me?.login) owners.add(me.login);
	} catch {
		// ignore gh failures and keep fallback to git remotes
	}

	try {
		const orgs = (await runGhJson(['api', 'user/orgs'])) as Array<{ login?: string }>;
		for (const org of orgs) {
			if (org?.login) owners.add(org.login);
		}
	} catch {
		// ignore gh failures and keep fallback to git remotes
	}

	const remotes = await listGitRemoteRefs();
	for (const ref of remotes) owners.add(ref.owner);

	return [...owners].sort((a, b) => a.localeCompare(b));
}

export async function listGithubRepos(owner: string): Promise<string[]> {
	const repos = new Set<string>();
	const trimmedOwner = owner.trim();
	if (!trimmedOwner) return [];

	try {
		const remoteRepos = (await runGhJson([
			'repo',
			'list',
			trimmedOwner,
			'--json',
			'name',
			'--limit',
			'100'
		])) as Array<{ name?: string }>;
		for (const repo of remoteRepos) {
			if (repo?.name) repos.add(repo.name);
		}
	} catch {
		// ignore gh failures and keep fallback to git remotes
	}

	const gitRefs = await listGitRemoteRefs();
	for (const ref of gitRefs) {
		if (ref.owner.toLowerCase() === trimmedOwner.toLowerCase()) {
			repos.add(ref.repo);
		}
	}

	return [...repos].sort((a, b) => a.localeCompare(b));
}

export { parseGithubRemote };
