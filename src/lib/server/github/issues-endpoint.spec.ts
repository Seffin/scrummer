import { beforeEach, describe, expect, it, vi } from 'vitest';

const runGhJsonMock = vi.fn();

vi.mock('$lib/server/github/ghClient', () => ({
	runGhJson: runGhJsonMock
}));

describe('GET /api/github/issues', () => {
	beforeEach(() => {
		runGhJsonMock.mockReset();
	});

	it('returns normalized issues', async () => {
		runGhJsonMock.mockResolvedValue([
			{
				number: 12,
				title: 'Track timer bug',
				state: 'OPEN',
				labels: [{ name: 'bug' }],
				assignees: [{ login: 'tom' }],
				milestone: null,
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-02T00:00:00Z',
				url: 'https://github.com/acme/repo/issues/12'
			}
		]);

		const { GET } = await import('../../../routes/api/github/issues/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/issues?owner=acme&repo=repo')
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.issues).toHaveLength(1);
		expect(body.issues[0].number).toBe(12);
		expect(body.issues[0].labels).toEqual(['bug']);
	});

	it('returns 400 when owner/repo are missing', async () => {
		const { GET } = await import('../../../routes/api/github/issues/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/issues')
		});

		expect(response.status).toBe(400);
	});

	it('returns 502 on upstream failure', async () => {
		runGhJsonMock.mockRejectedValue(new Error('gh unavailable'));

		const { GET } = await import('../../../routes/api/github/issues/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/issues?owner=acme&repo=repo')
		});

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toContain('gh unavailable');
	});
});
