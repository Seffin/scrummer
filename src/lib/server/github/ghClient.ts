import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type ExecLike = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

export async function runGhJson(args: string[], execLike?: ExecLike) {
	const runner = execLike ?? ((a: string[]) => execFileAsync('gh', a));
	const { stdout, stderr } = await runner(args);

	if (stderr?.trim()) {
		throw new Error(stderr.trim());
	}

	try {
		return JSON.parse(stdout);
	} catch {
		throw new Error('Invalid gh JSON response');
	}
}

interface CreateGithubIssuePayload {
	owner: string;
	repo: string;
	title: string;
	body?: string;
	mode: 'issue-only' | 'issue-and-project';
	projectId?: string;
}

export async function createGithubIssue(payload: CreateGithubIssuePayload) {
	const created = await runGhJson([
		'issue',
		'create',
		'--repo',
		`${payload.owner}/${payload.repo}`,
		'--title',
		payload.title,
		'--body',
		payload.body ?? '',
		'--json',
		'number,title,url'
	]);

	let projectLinked = false;
	if (payload.mode === 'issue-and-project' && payload.projectId) {
		await runGhJson([
			'project',
			'item-add',
			'--id',
			payload.projectId,
			'--url',
			created.url,
			'--format',
			'json'
		]);
		projectLinked = true;
	}

	return {
		number: created.number,
		title: created.title,
		url: created.url,
		mode: payload.mode,
		projectLinked
	};
}
