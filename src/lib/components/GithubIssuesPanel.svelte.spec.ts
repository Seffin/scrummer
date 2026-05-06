import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { vi } from 'vitest';
import GithubIssuesPanel from './GithubIssuesPanel.svelte';

// Mock the auth store to be authenticated by default in tests
vi.mock('$lib/stores/githubAuth.svelte', () => ({
	githubAuthStore: {
		isAuthenticated: true,
		token: 'mock-token',
		logout: vi.fn(),
		authenticate: vi.fn(),
		refresh: vi.fn()
	}
}));

// Mock the github store to avoid real API calls
vi.mock('$lib/stores/github.svelte', () => ({
	githubStore: {
		owners: [],
		repos: [],
		issues: [],
		loading: false,
		error: null,
		filteredIssues: [],
		loadOwners: vi.fn(),
		loadRepos: vi.fn(),
		loadIssues: vi.fn(),
		setError: vi.fn()
	}
}));

describe('GithubIssuesPanel', () => {
	it('renders issue metadata and start button', async () => {
		render(GithubIssuesPanel, {
			issues: [
				{
					number: 7,
					title: 'Track issue',
					state: 'OPEN',
					labels: ['feature'],
					assignees: ['tom'],
					milestone: 'v1',
					createdAt: '2026-01-01T00:00:00Z',
					updatedAt: '2026-01-02T00:00:00Z',
					url: 'https://github.com/x/y/issues/7'
				}
			]
		});

		await expect.element(page.getByText('#7')).toBeInTheDocument();
		await expect.element(page.getByText('Track issue')).toBeInTheDocument();
		await expect.element(page.getByText('tom')).toBeInTheDocument();
		await expect.element(page.getByText('2026-01-01')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /start/i })).toBeInTheDocument();
	});

	it('loads and displays owners from API', async () => {
		// Mock fetch for owners
		const owners = ['owner1', 'owner2'];
		globalThis.fetch = (async (url: string) => {
			if (url === '/api/github/options/owners') {
				return {
					ok: true,
					json: async () => ({ owners })
				};
			}
			return { ok: true, json: async () => ({}) };
		}) as any;

		render(GithubIssuesPanel);

		// Wait for loadOwners to finish
		await new Promise(resolve => setTimeout(resolve, 200));

		const ownerInput = page.getByPlaceholder('e.g. facebook');
		await expect.element(ownerInput).toBeInTheDocument();
		
		// Focus input to show dropdown
		await ownerInput.click();
		await new Promise(resolve => setTimeout(resolve, 100));
		
		await expect.element(page.getByText('owner1')).toBeInTheDocument();
		await expect.element(page.getByText('owner2')).toBeInTheDocument();
	});

	it('loads and displays repos when owner is selected', async () => {
		// Mock fetch for owners and repos
		globalThis.fetch = (async (url: string) => {
			if (url === '/api/github/options/owners') {
				return { ok: true, json: async () => ({ owners: ['owner1'] }) };
			}
			if (url.includes('/api/github/options/repos')) {
				return { ok: true, json: async () => ({ repos: ['repo1', 'repo2'] }) };
			}
			return { ok: true, json: async () => ({}) };
		}) as any;

		render(GithubIssuesPanel);

		// Wait for loadOwners and subsequent loadRepos
		await new Promise(resolve => setTimeout(resolve, 300));

		const repoInput = page.getByPlaceholder('e.g. react');
		await repoInput.click();
		await new Promise(resolve => setTimeout(resolve, 100));

		await expect.element(page.getByText('repo1')).toBeInTheDocument();
		await expect.element(page.getByText('repo2')).toBeInTheDocument();
	});




});

