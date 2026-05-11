/**
 * GitHub Authentication Utilities
 * GitHub tokens are server-side only. The browser only tracks connection state.
 */

import { authStore } from '$lib/stores/auth.svelte';

export interface GitHubAuthState {
  isAuthenticated: boolean;
  token: string | null;
}

/**
 * For compatibility, this now always returns null:
 * token values are never exposed to browser code.
 */
export function getGitHubToken(): string | null {
  return null;
}

/**
 * Client no longer stores GitHub tokens.
 */
export function removeGitHubToken(): void {
  // no-op by design
}

/**
 * Get current authentication state from server-derived user profile.
 */
export function getAuthState(): GitHubAuthState {
  const isAuthenticated = !!authStore.user?.github_connected && !authStore.githubDisconnected;
  return { isAuthenticated, token: null };
}

export function validateGitHubTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  return (
    (token.startsWith('ghp_') && token.length >= 40) ||
    (token.startsWith('gho_') && token.length >= 40) ||
    (token.startsWith('github_pat_') && token.length >= 60)
  );
}

/**
 * Validation is now performed server-side while persisting the token.
 */
export async function validateGitHubTokenAPI(token: string): Promise<boolean> {
  if (!validateGitHubTokenFormat(token)) {
    return false;
  }
  return true;
}

export async function validateAndCleanStoredToken(): Promise<boolean> {
  return !!authStore.user?.github_connected && !authStore.githubDisconnected;
}

/**
 * Sends token to server for secure storage; never persisted in browser.
 */
export function authenticateWithToken(token: string): void {
  if (!validateGitHubTokenFormat(token)) {
    throw new Error('Invalid GitHub token format');
  }
  void authStore.syncGithubToken(token);
}
