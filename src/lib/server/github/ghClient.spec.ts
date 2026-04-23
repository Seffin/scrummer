import { describe, expect, it, vi } from 'vitest';
import { runGhJson } from './ghClient';

describe('runGhJson', () => {
	it('parses stdout as JSON', async () => {
		const exec = vi.fn().mockResolvedValue({ stdout: '[{"number":1}]', stderr: '' });
		const result = await runGhJson(['issue', 'list'], exec);
		expect(result).toEqual([{ number: 1 }]);
	});

	it('throws readable error for invalid JSON', async () => {
		const exec = vi.fn().mockResolvedValue({ stdout: 'not-json', stderr: '' });
		await expect(runGhJson(['issue', 'list'], exec)).rejects.toThrow('Invalid gh JSON response');
	});
});
