import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = [
	'.local/features/github-issues-metadata-listing.md',
	'.local/features/github-start-timer-from-issue.md',
	'.local/features/github-create-issue-from-worktrack.md',
	'.local/features/github-optional-writeback-actions.md',
	'.local/features/logs-advanced-filters-and-search.md',
	'.local/features/reports-export-csv-pdf.md',
	'.local/features/keyboard-shortcuts-and-command-palette.md'
];

describe('feature docs template compliance', () => {
	for (const file of files) {
		it(`${file} has required sections and mermaid blocks`, () => {
			const text = readFileSync(file, 'utf8');
			expect(text).toContain('## Brief Description');
			expect(text).toContain('## User Story');
			expect(text).toContain('## User Benefits');
			expect(text).toContain('## Acceptance Criteria');
			expect(text).toContain('## Rough Complexity Estimate');
			expect(text).toContain('## TDD Test Cases');
			expect(text).toContain('## Mermaid: User Journey');
			expect(text).toContain('## Mermaid: System Placement');
			expect(text).toContain('## Mermaid: Module Structure');
			expect((text.match(/```mermaid/g) ?? []).length).toBeGreaterThanOrEqual(3);
		});
	}
});
