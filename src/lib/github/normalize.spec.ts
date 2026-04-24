import { describe, expect, it } from 'vitest';
import { normalizeIssue } from './normalize';

describe('normalizeIssue', () => {
	it('maps gh JSON issue to app model with metadata', () => {
		const raw = {
			number: 42,
			title: 'Add sync',
			state: 'OPEN',
			labels: [{ name: 'feature' }],
			assignees: [{ login: 'tom' }],
			milestone: { title: 'v1' },
			createdAt: '2026-04-20T10:00:00Z',
			updatedAt: '2026-04-21T10:00:00Z',
			url: 'https://github.com/acme/repo/issues/42'
		};

		const issue = normalizeIssue(raw);

		expect(issue.number).toBe(42);
		expect(issue.labels).toEqual(['feature']);
		expect(issue.assignees).toEqual(['tom']);
		expect(issue.milestone).toBe('v1');
	});

	it('handles optional metadata as empty values', () => {
		const issue = normalizeIssue({ number: 1, title: 'A', state: 'OPEN', labels: [], assignees: [] });
		expect(issue.milestone).toBeNull();
		expect(issue.labels).toEqual([]);
		expect(issue.assignees).toEqual([]);
	});
});
