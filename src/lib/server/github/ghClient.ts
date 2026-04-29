import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type ExecLike = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

export async function runGhRaw(args: string[], execLike?: ExecLike) {
	const runner = execLike ?? ((a: string[]) => execFileAsync('gh', a));
	try {
		const { stdout } = await runner(args);
		return stdout.trim();
	} catch (error: any) {
		const message = error?.stderr || error?.message || 'gh command failed';
		throw new Error(String(message).trim());
	}
}

export async function runGhJson(args: string[], execLike?: ExecLike) {
	const runner = execLike ?? ((a: string[]) => execFileAsync('gh', a));
	let parsedStdout: string;
	try {
		({ stdout: parsedStdout } = await runner(args));
	} catch (error: any) {
		const message = error?.stderr || error?.message || 'gh command failed';
		throw new Error(String(message).trim());
	}

	try {
		return JSON.parse(parsedStdout);
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

interface CreateGithubIssueResult {
	number: number;
	title: string;
	url: string;
	mode: 'issue-only' | 'issue-and-project';
	projectLinked: boolean;
	warning?: string;
}

export async function createGithubIssue(
	payload: CreateGithubIssuePayload,
	runJson: typeof runGhJson = runGhJson,
	runRaw: typeof runGhRaw = runGhRaw
): Promise<CreateGithubIssueResult> {
	// gh issue create does not always support --json on all versions.
	// It returns the URL of the created issue to stdout.
	const url = await runRaw([
		'issue',
		'create',
		'--repo',
		`${payload.owner}/${payload.repo}`,
		'--title',
		payload.title,
		'--body',
		payload.body ?? ''
	]);

	// Now fetch the details using gh issue view which reliably supports --json
	const created = await runJson(['issue', 'view', url, '--json', 'number,title,url']);

	let projectLinked = false;
	let warning: string | undefined;
	if (payload.mode === 'issue-and-project' && payload.projectId) {
		try {
			await runJson([
				'project',
				'item-add',
				payload.projectId,
				'--owner',
				payload.owner,
				'--url',
				created.url,
				'--format',
				'json'
			]);
			projectLinked = true;
		} catch (error: any) {
			warning = error?.message
				? `Issue created, but project link failed: ${error.message}`
				: 'Issue created, but project link failed.';
		}
	}

	return {
		number: created.number,
		title: created.title,
		url: created.url,
		mode: payload.mode,
		projectLinked,
		warning
	};
}
