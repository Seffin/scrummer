import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GithubIssuesPanel from './GithubIssuesPanel.svelte';

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

		await expect.element(page.getByText('#7 Track issue')).toBeInTheDocument();
		await expect.element(page.getByText('Assignees: tom')).toBeInTheDocument();
		await expect.element(page.getByText('Milestone: v1')).toBeInTheDocument();
		await expect.element(page.getByText('Created: 2026-01-01')).toBeInTheDocument();
		await expect.element(page.getByText('Updated: 2026-01-02')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: /start/i })).toBeInTheDocument();
	});
});
