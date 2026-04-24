import { createGithubIssue, runGhJson } from './ghClient';
import { describe, expect, it, vi } from 'vitest';

describe('runGhJson', () => {
	it('parses stdout as JSON', async () => {
		const exec = vi.fn().mockResolvedValue({ stdout: '[{"number":1}]', stderr: '' });
		const result = await runGhJson(['issue', 'list'], exec);
		expect(result).toEqual([{ number: 1 }]);
	});

	it('parses stdout even when stderr contains warnings', async () => {
		const exec = vi.fn().mockResolvedValue({
			stdout: '[{"number":2}]',
			stderr: 'warning: something non-fatal'
		});
		const result = await runGhJson(['issue', 'list'], exec);
		expect(result).toEqual([{ number: 2 }]);
	});

	it('throws readable error for invalid JSON', async () => {
		const exec = vi.fn().mockResolvedValue({ stdout: 'not-json', stderr: '' });
		await expect(runGhJson(['issue', 'list'], exec)).rejects.toThrow('Invalid gh JSON response');
	});
});

describe('createGithubIssue', () => {
	it('returns partial success when project link fails', async () => {
		const runJson = vi
			.fn()
			.mockResolvedValueOnce({ number: 81, title: 'Track deployment prep', url: 'https://github.com/acme/repo/issues/81' })
			.mockRejectedValueOnce(new Error('project not found'));

		const result = await createGithubIssue(
			{
				owner: 'acme',
				repo: 'repo',
				title: 'Track deployment prep',
				mode: 'issue-and-project',
				projectId: 'PVT_xxx'
			},
			runJson
		);

		expect(result.number).toBe(81);
		expect(result.projectLinked).toBe(false);
		expect(result.warning).toContain('Issue created, but project link failed');
	});
});
