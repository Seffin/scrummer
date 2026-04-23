import { describe, expect, it } from 'vitest';
import { createGithubStore } from './github.svelte';

describe('github store', () => {
	it('filters issues by free-text query', () => {
		const store = createGithubStore();
		store.setIssues([
			{
				number: 1,
				title: 'Fix timer start',
				state: 'OPEN',
				labels: [],
				assignees: [],
				milestone: null,
				createdAt: null,
				updatedAt: null,
				url: 'u1'
			},
			{
				number: 2,
				title: 'Improve reports',
				state: 'OPEN',
				labels: [],
				assignees: [],
				milestone: null,
				createdAt: null,
				updatedAt: null,
				url: 'u2'
			}
		]);
		store.setQuery('timer');

		expect(store.filteredIssues.length).toBe(1);
		expect(store.filteredIssues[0].number).toBe(1);
	});

	it('tracks loading and error state transitions', () => {
		const store = createGithubStore();
		store.startLoading();

		expect(store.loading).toBe(true);

		store.setError('failed');
		expect(store.loading).toBe(false);
		expect(store.error).toBe('failed');
	});
});
