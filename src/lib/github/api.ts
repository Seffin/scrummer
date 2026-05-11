/**
 * GitHub REST API utilities
 * Browser calls backend proxy endpoints; GitHub token stays server-side.
 */

import { apiFetch } from '$lib/api/client';
import { dualApi } from './dual-api';

export interface GitHubFetchOptions extends RequestInit {
	/** Whether to throw on non-OK responses (default: true) */
	throwOnError?: boolean;
	/** Custom headers to merge with defaults */
	headers?: Record<string, string>;
}

export interface GitHubErrorResponse {
	message: string;
	documentation_url?: string;
	errors?: Array<{ message: string; resource?: string; field?: string; code?: string }>;
}

export class GitHubAuthError extends Error {
	constructor(message: string, public statusCode: number) {
		super(message);
		this.name = 'GitHubAuthError';
	}
}

export class GitHubNotFoundError extends Error {
	constructor(message: string, public statusCode: number = 404) {
		super(message);
		this.name = 'GitHubNotFoundError';
	}
}

/**
 * Generic GitHub API fetch wrapper
 * Calls local authenticated proxy endpoints and handles errors
 *
 * @param endpoint API endpoint path (e.g., '/user/repos')
 * @param options Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws {GitHubAuthError} If token is missing or invalid
 * @throws {GitHubNotFoundError} If endpoint returns 404
 * @throws {Error} For other HTTP errors (unless throwOnError is false)
 */
export async function githubFetch<T>(
	endpoint: string,
	options: GitHubFetchOptions = {}
): Promise<T> {
	const { throwOnError = true, headers: customHeaders, method = 'GET', body } = options;

	try {
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
		let proxyPath = '';
		switch (normalizedEndpoint) {
			case '/user':
				proxyPath = '/github/user';
				break;
			case '/user/orgs?per_page=100':
				proxyPath = '/github/orgs';
				break;
			case '/user/repos?per_page=100':
				proxyPath = '/github/repos';
				break;
			default:
				if (normalizedEndpoint.includes('/issues?')) {
					const match = normalizedEndpoint.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\?/);
					if (!match) throw new Error(`Unsupported GitHub endpoint: ${normalizedEndpoint}`);
					const owner = decodeURIComponent(match[1]);
					const repo = decodeURIComponent(match[2]);
					proxyPath = `/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
				} else if (normalizedEndpoint.startsWith('/users/') && normalizedEndpoint.endsWith('/repos?per_page=100')) {
					const match = normalizedEndpoint.match(/^\/users\/([^/]+)\/repos\?per_page=100$/);
					if (!match) throw new Error(`Unsupported GitHub endpoint: ${normalizedEndpoint}`);
					const owner = decodeURIComponent(match[1]);
					proxyPath = `/github/repos?owner=${encodeURIComponent(owner)}`;
				} else if (normalizedEndpoint.startsWith('/orgs/') && normalizedEndpoint.endsWith('/repos?per_page=100')) {
					const match = normalizedEndpoint.match(/^\/orgs\/([^/]+)\/repos\?per_page=100$/);
					if (!match) throw new Error(`Unsupported GitHub endpoint: ${normalizedEndpoint}`);
					const owner = decodeURIComponent(match[1]);
					proxyPath = `/github/repos?owner=${encodeURIComponent(owner)}`;
				} else if (normalizedEndpoint.endsWith('/issues') && method === 'POST') {
					const match = normalizedEndpoint.match(/^\/repos\/([^/]+)\/([^/]+)\/issues$/);
					if (!match) throw new Error(`Unsupported GitHub endpoint: ${normalizedEndpoint}`);
					const owner = decodeURIComponent(match[1]);
					const repo = decodeURIComponent(match[2]);
					proxyPath = '/github/issues/create';
					const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
					const createPayload = {
						...(parsedBody as Record<string, unknown>),
						owner,
						repo,
					};
					const data = await apiFetch<T>(proxyPath, {
						method,
						headers: customHeaders,
						body: JSON.stringify(createPayload),
					});
					return data;
				} else {
					throw new Error(`Unsupported GitHub endpoint: ${normalizedEndpoint}`);
				}
		}

		const payload = typeof body === 'string' ? JSON.parse(body) : body;
		const data = await apiFetch<T>(proxyPath, {
			method,
			headers: customHeaders,
			...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
		});
		return data;
	} catch (error) {
		const status = (error as { status?: number })?.status;
		const message = error instanceof Error ? error.message : String(error);
		if (status === 401) {
			throw new GitHubAuthError('Unauthorized: Your GitHub connection is missing or expired', 401);
		}
		if (status === 404) {
			throw new GitHubNotFoundError(message || 'Resource not found', 404);
		}
		if (error instanceof GitHubAuthError || error instanceof GitHubNotFoundError) {
			throw error;
		}
		if (error instanceof Error) {
			if (!throwOnError) {
				return { message: error.message } as unknown as T;
			}
			throw error;
		}
		throw new Error(
			`GitHub API request failed: ${String(error)}`,
			{ cause: error }
		);
	}
}

/**
 * GET request to GitHub API
 * @param endpoint API endpoint
 * @param options Fetch options
 */
export async function githubGet<T>(
	endpoint: string,
	options: GitHubFetchOptions = {}
): Promise<T> {
	return githubFetch<T>(endpoint, {
		...options,
		method: 'GET'
	});
}

/**
 * POST request to GitHub API
 * @param endpoint API endpoint
 * @param body Request body
 * @param options Fetch options
 */
export async function githubPost<T>(
	endpoint: string,
	body: unknown,
	options: GitHubFetchOptions = {}
): Promise<T> {
	return githubFetch<T>(endpoint, {
		...options,
		method: 'POST',
		body: JSON.stringify(body)
	});
}

/**
 * PATCH request to GitHub API
 * @param endpoint API endpoint
 * @param body Request body
 * @param options Fetch options
 */
export async function githubPatch<T>(
	endpoint: string,
	body: unknown,
	options: GitHubFetchOptions = {}
): Promise<T> {
	return githubFetch<T>(endpoint, {
		...options,
		method: 'PATCH',
		body: JSON.stringify(body)
	});
}

/**
 * PUT request to GitHub API
 * @param endpoint API endpoint
 * @param body Request body
 * @param options Fetch options
 */
export async function githubPut<T>(
	endpoint: string,
	body: unknown,
	options: GitHubFetchOptions = {}
): Promise<T> {
	return githubFetch<T>(endpoint, {
		...options,
		method: 'PUT',
		body: JSON.stringify(body)
	});
}

/**
 * DELETE request to GitHub API
 * @param endpoint API endpoint
 * @param options Fetch options
 */
export async function githubDelete<T>(
	endpoint: string,
	options: GitHubFetchOptions = {}
): Promise<T> {
	return githubFetch<T>(endpoint, {
		...options,
		method: 'DELETE'
	});
}

// Convenience methods for common endpoints

/**
 * Get authenticated user's repositories
 */
export async function getUserRepos() {
	return githubGet('/user/repos?per_page=100');
}

/**
 * Get authenticated user's organizations
 */
export async function getUserOrgs() {
	return githubGet('/user/orgs?per_page=100');
}

/**
 * Get authenticated user's profile
 */
export async function getUserProfile() {
	return githubGet('/user');
}

/**
 * Get issues for a specific repository
 * @param owner Repository owner
 * @param repo Repository name
 */
export async function getRepoIssues(owner: string, repo: string) {
	return githubGet(
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?per_page=100&state=all`
	);
}

/**
 * Dual API helpers (local GitHub CLI + remote fallback)
 */
export async function checkGitHubCliAvailability() {
	const response = await dualApi.checkGitHubCli();
	if (response.error || !response.data) {
		return { available: false };
	}
	return response.data;
}

export async function getGitHubTokenFromCli(): Promise<string> {
	const response = await dualApi.getGitHubToken();
	if (response.error || !response.data) {
		throw new Error(response.error || 'Failed to get GitHub token from CLI');
	}
	return response.data.token;
}

export async function getGitHubUserFromCli() {
	const response = await dualApi.getGitHubUser();
	if (response.error || !response.data) {
		throw new Error(response.error || 'Failed to get GitHub user');
	}
	return response.data.user;
}

export async function getOrgsFromCli() {
	const response = await dualApi.getOrganizations();
	if (response.error || !response.data) {
		throw new Error(response.error || 'Failed to get organizations');
	}
	return response.data.orgs;
}

export async function getReposFromCli(owner?: string) {
	if (owner) {
		const response = await fetch(`/api/github/options/repos?owner=${encodeURIComponent(owner)}`);
		const data = await response.json();
		if (!response.ok) {
			throw new Error(data?.error || 'Failed to get repositories');
		}
		return data.repos;
	}

	const response = await dualApi.getRepositories();
	if (response.error || !response.data) {
		throw new Error(response.error || 'Failed to get repositories');
	}
	return response.data.repos;
}

export async function getIssuesFromCli(owner: string, repo: string) {
	const response = await dualApi.getIssues(owner, repo);
	if (response.error || !response.data) {
		throw new Error(response.error || 'Failed to get issues');
	}
	return response.data.issues;
}

export async function getServerStatus() {
	return dualApi.getServerStatus();
}
