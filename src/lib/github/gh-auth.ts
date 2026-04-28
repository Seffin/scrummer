/**
 * GitHub CLI Authentication Service
 * Integrates with `gh auth login` for seamless authentication
 */

import { getGitHubToken, storeGitHubToken, removeGitHubToken } from './auth';

export interface GhAuthStatus {
	isAuthenticated: boolean;
	hasGhCli: boolean;
	token: string | null;
	error?: string;
}

/**
 * Check if GitHub CLI is available
 */
export async function checkGhCliAvailability(): Promise<boolean> {
	try {
		const response = await fetch('/api/github/gh-cli/check', {
			method: 'POST',
		});
		const result = await response.json();
		return result.available;
	} catch {
		return false;
	}
}

/**
 * Get token from GitHub CLI
 * This calls a server endpoint that runs `gh auth token`
 */
export async function getGhCliToken(): Promise<string> {
	try {
		const response = await fetch('/api/github/gh-cli/token', {
			method: 'POST',
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Failed to get token from GitHub CLI');
		}
		
		const result = await response.json();
		return result.token;
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to get token from GitHub CLI');
	}
}

/**
 * Authenticate using GitHub CLI
 * This will prompt the user to run `gh auth login` if not authenticated
 */
export async function authenticateWithGhCli(): Promise<GhAuthStatus> {
	try {
		// Check if GitHub CLI is available
		const hasGhCli = await checkGhCliAvailability();
		if (!hasGhCli) {
			return {
				isAuthenticated: false,
				hasGhCli: false,
				token: null,
				error: 'GitHub CLI is not installed. Please install GitHub CLI first: https://cli.github.com/'
			};
		}

		// Try to get token from GitHub CLI
		const token = await getGhCliToken();
		
		if (!token) {
			return {
				isAuthenticated: false,
				hasGhCli: true,
				token: null,
				error: 'No GitHub authentication found. Please run `gh auth login` in your terminal.'
			};
		}

		// Store the token
		storeGitHubToken(token);
		
		return {
			isAuthenticated: true,
			hasGhCli: true,
			token,
		};
	} catch (error) {
		return {
			isAuthenticated: false,
			hasGhCli: true,
			token: null,
			error: error instanceof Error ? error.message : 'Authentication failed'
		};
	}
}

/**
 * Check current authentication status
 */
export async function getGhAuthStatus(): Promise<GhAuthStatus> {
	const token = getGitHubToken();
	const hasGhCli = await checkGhCliAvailability();
	
	return {
		isAuthenticated: !!token,
		hasGhCli,
		token,
	};
}

/**
 * Logout and clear authentication
 */
export function logoutGhAuth(): void {
	removeGitHubToken();
}
