import type { GithubIssue } from '$lib/github/types';

function matchesQuery(issue: GithubIssue, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return `${issue.number} ${issue.title} ${issue.labels.join(' ')} ${issue.assignees.join(' ')}`
		.toLowerCase()
		.includes(q);
}

export function createGithubStore() {
	let issues = $state<GithubIssue[]>([]);
	let query = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	const filteredIssues = $derived.by(() => issues.filter((issue) => matchesQuery(issue, query)));

	return {
		get issues() {
			return issues;
		},
		get filteredIssues() {
			return filteredIssues;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		setIssues(next: GithubIssue[]) {
			issues = next;
			error = null;
		},
		setQuery(next: string) {
			query = next;
		},
		startLoading() {
			loading = true;
			error = null;
		},
		setError(message: string) {
			loading = false;
			error = message;
		},
		endLoading() {
			loading = false;
		}
	};
}

export const githubStore = createGithubStore();
