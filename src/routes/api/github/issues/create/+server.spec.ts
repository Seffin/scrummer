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

		const { POST } = await import('./+server');
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

		const { POST } = await import('./+server');
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

	it('returns 400 when required fields are missing', async () => {
		const { POST } = await import('./+server');
		const request = new Request('http://localhost/api/github/issues/create', {
			method: 'POST',
			body: JSON.stringify({ owner: 'acme', title: 'Missing repo and mode' })
		});

		const response = await POST({ request });
		expect(response.status).toBe(400);
	});
});
