export type GithubIssueState = 'OPEN' | 'CLOSED';

export interface GithubIssue {
	number: number;
	title: string;
	state: GithubIssueState;
	labels: string[];
	assignees: string[];
	milestone: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	url: string;
}

export interface GithubIssueListResponse {
	issues: GithubIssue[];
}
