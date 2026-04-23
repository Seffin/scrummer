import type { GithubIssue } from './types';

export function normalizeIssue(raw: any): GithubIssue {
	return {
		number: Number(raw.number),
		title: String(raw.title ?? ''),
		state: raw.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
		labels: Array.isArray(raw.labels)
			? raw.labels.map((l: any) => String(l.name ?? '')).filter(Boolean)
			: [],
		assignees: Array.isArray(raw.assignees)
			? raw.assignees.map((a: any) => String(a.login ?? '')).filter(Boolean)
			: [],
		milestone: raw.milestone?.title ? String(raw.milestone.title) : null,
		createdAt: raw.createdAt ? String(raw.createdAt) : null,
		updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
		url: String(raw.url ?? '')
	};
}
