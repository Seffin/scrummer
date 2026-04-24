import { beforeEach, describe, expect, it, vi } from 'vitest';

const createGithubIssueMock = vi.fn();

vi.mock('$lib/server/github/ghClient', () => ({
	createGithubIssue: createGithubIssueMock
}));

describe('POST /api/github/issues/create', () => {
	beforeEach(() => {
		createGithubIssueMock.mockReset();
	});

	it('creates issue only', async () => {
		createGithubIssueMock.mockResolvedValue({
			number: 30,
			title: 'New task',
			url: 'https://github.com/acme/repo/issues/30',
			mode: 'issue-only',
			projectLinked: false
		});

		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({ owner: 'acme', repo: 'repo', title: 'New task', mode: 'issue-only' })
		});

		const response = await POST({ request });
		expect(response.status).toBe(201);
	});

	it('creates issue and adds to project', async () => {
		createGithubIssueMock.mockResolvedValue({
			number: 31,
			title: 'New task',
			url: 'https://github.com/acme/repo/issues/31',
			mode: 'issue-and-project',
			projectLinked: true
		});

		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({
				owner: 'acme',
				repo: 'repo',
				title: 'New task',
				mode: 'issue-and-project',
				projectId: 'PVT_xxx'
			})
		});

		const response = await POST({ request });
		expect(response.status).toBe(201);
	});

	it('returns partial-success payload when project link fails', async () => {
		createGithubIssueMock.mockResolvedValue({
			number: 32,
			title: 'New task',
			url: 'https://github.com/acme/repo/issues/32',
			mode: 'issue-and-project',
			projectLinked: false,
			warning: 'Issue created, but project link failed: project not found'
		});

		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({
				owner: 'acme',
				repo: 'repo',
				title: 'New task',
				mode: 'issue-and-project',
				projectId: 'PVT_xxx'
			})
		});

		const response = await POST({ request });
		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.projectLinked).toBe(false);
		expect(body.warning).toContain('Issue created, but project link failed');
	});

	it('returns 400 when required fields are missing', async () => {
		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({ owner: 'acme', title: 'Missing repo and mode' })
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});

	it('returns 400 for invalid mode', async () => {
		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({
				owner: 'acme',
				repo: 'repo',
				title: 'Task',
				mode: 'invalid-mode'
			})
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});

	it('returns 400 for whitespace-only required fields', async () => {
		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({
				owner: '   ',
				repo: 'repo',
				title: 'Task',
				mode: 'issue-only'
			})
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});

	it('returns 400 for invalid JSON body', async () => {
		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{invalid-json'
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});

	it('returns 400 when mode is issue-and-project and projectId is missing', async () => {
		const { POST } = await import('../../../routes/api/github/issues/create/+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({
				owner: 'acme',
				repo: 'repo',
				title: 'Missing project id',
				mode: 'issue-and-project'
			})
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});
});
