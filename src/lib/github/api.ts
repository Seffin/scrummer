/**
 * GitHub REST API fetch utilities with automatic token injection
 * All requests automatically include the user's PAT from localStorage
 */

import { getGitHubToken } from './auth';
import { dualApi } from './dual-api';

const GITHUB_API_BASE = 'https://api.github.com';

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
 * Builds authentication headers with user's token
 * @throws {Error} If no token is available
 */
function buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
	const token = getGitHubToken();

	if (!token) {
		throw new Error('No GitHub token found. Please authenticate first.');
	}

	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github.v3+json',
		'Content-Type': 'application/json',
		...(customHeaders || {})
	};
}

/**
 * Generic GitHub API fetch wrapper
 * Automatically injects token and handles errors
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
	const { throwOnError = true, headers: customHeaders, ...fetchOptions } = options;

	try {
		const url = `${GITHUB_API_BASE}${endpoint}`;
		const response = await fetch(url, {
			...fetchOptions,
			headers: buildHeaders(customHeaders)
		});

		// Handle 401 Unauthorized
		if (response.status === 401) {
			throw new GitHubAuthError('Unauthorized: Your GitHub token is invalid or expired', 401);
		}

		// Handle 404 Not Found
		if (response.status === 404) {
			const data = (await response.json()) as GitHubErrorResponse;
			throw new GitHubNotFoundError(data.message || 'Resource not found', 404);
		}

		// Handle other non-OK responses
		if (!response.ok) {
			const data = (await response.json()) as GitHubErrorResponse;
			const errorMessage = data.message || `GitHub API Error: ${response.status} ${response.statusText}`;

			if (throwOnError) {
				throw new Error(errorMessage);
			}
		}

		// Parse and return JSON
		const json = (await response.json()) as T;
		return json;
	} catch (error) {
		// Re-throw our custom errors
		if (error instanceof GitHubAuthError || error instanceof GitHubNotFoundError) {
			throw error;
		}

		// Re-throw our thrown errors
		if (error instanceof Error) {
			throw error;
		}

		// Wrap unknown errors
		throw new Error(`GitHub API request failed: ${String(error)}`);
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
