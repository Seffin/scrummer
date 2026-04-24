import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AGENTS policy', () => {
	it('includes branch, gh, tdd, and feature-doc rules', () => {
		const text = readFileSync('AGENTS.md', 'utf8');
		expect(text).toContain('.local/features');
		expect(text).toContain('feature branch workflow');
		expect(text).toContain('TDD');
		expect(text).toContain('gh');
		expect(text).toContain('No requests for secrets in chat');
		expect(text).toContain('ask me to issue the command on the terminal');
		expect(text).toContain('Mermaid');
	});
});
