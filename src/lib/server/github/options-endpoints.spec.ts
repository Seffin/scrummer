import { beforeEach, describe, expect, it, vi } from 'vitest';

const listGithubOwnersMock = vi.fn();
const listGithubReposMock = vi.fn();

vi.mock('$lib/server/github/options', () => ({
	listGithubOwners: listGithubOwnersMock,
	listGithubRepos: listGithubReposMock
}));

describe('GET /api/github/options/owners', () => {
	beforeEach(() => {
		listGithubOwnersMock.mockReset();
	});

	it('returns owners list', async () => {
		listGithubOwnersMock.mockResolvedValue(['acme', 'thebenVar']);
		const { GET } = await import('../../../routes/api/github/options/owners/+server');
		const response = await GET();
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.owners).toEqual(['acme', 'thebenVar']);
	});

	it('returns 502 when owners fetch fails', async () => {
		listGithubOwnersMock.mockRejectedValue(new Error('gh unavailable'));
		const { GET } = await import('../../../routes/api/github/options/owners/+server');
		const response = await GET();
		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toContain('gh unavailable');
	});
});

describe('GET /api/github/options/repos', () => {
	beforeEach(() => {
		listGithubReposMock.mockReset();
	});

	it('returns repos list for owner', async () => {
		listGithubReposMock.mockResolvedValue(['scrummer', 'ops']);
		const { GET } = await import('../../../routes/api/github/options/repos/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/options/repos?owner=acme')
		});
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.repos).toEqual(['scrummer', 'ops']);
	});

	it('returns 400 when owner missing', async () => {
		const { GET } = await import('../../../routes/api/github/options/repos/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/options/repos')
		});
		expect(response.status).toBe(400);
	});

	it('returns 502 when repos fetch fails', async () => {
		listGithubReposMock.mockRejectedValue(new Error('permission denied'));
		const { GET } = await import('../../../routes/api/github/options/repos/+server');
		const response = await GET({
			url: new URL('http://localhost/api/github/options/repos?owner=acme')
		});
		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toContain('permission denied');
	});
});
