/**
 * GitHub Authentication Utilities
 * Manages per-session GitHub Personal Access Tokens
 */

import { storeSessionToken, getSessionToken, removeSessionToken } from '$lib/auth/session';

export interface GitHubAuthState {
  isAuthenticated: boolean;
  token: string | null;
}

/**
 * Store GitHub Personal Access Token in current session
 * @param token - GitHub token to store
 */
export function storeGitHubToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid GitHub token provided');
  }
  storeSessionToken(token);
}

import { authStore } from '$lib/stores/auth.svelte';

/**
 * Retrieve GitHub Personal Access Token from current session or shared account
 * @returns GitHub token or null if not found
 */
export function getGitHubToken(): string | null {
  // If user explicitly disconnected GitHub, don't auto-reconnect
  if (authStore.githubDisconnected) {
    return null;
  }

  // Priority 1: Current session token (manual login on this device)
  const sessionToken = getSessionToken();

  if (sessionToken) {
    // If we have a local session token, make sure it's synced to the server account
    if (authStore.user && authStore.user.github_token !== sessionToken) {
      authStore.syncGithubToken(sessionToken);
    }
    return sessionToken;
  }

  // Priority 2: Shared token from account sync
  if (authStore.user?.github_token) {
    console.log('🔄 Using shared GitHub token from account');
    return authStore.user.github_token;
  }

  return null;
}

/**
 * Remove GitHub Personal Access Token from current session
 */
export function removeGitHubToken(): void {
  removeSessionToken();
}

/**
 * Get current authentication state
 * @returns Authentication state with token
 */
export function getAuthState(): GitHubAuthState {
  const token = getGitHubToken();
  const isAuthenticated = !!token && token !== 'local_cli_authenticated';
  
  return {
    isAuthenticated,
    token: isAuthenticated ? token : null
  };
}

/**
 * Validate GitHub token format (basic validation)
 * @param token - GitHub token to validate
 * @returns true if token appears valid
 */
export function validateGitHubTokenFormat(token: string): boolean {
  // GitHub PATs are typically 40+ characters and start with 'ghp_' for classic tokens
  // or 'github_pat_' for fine-grained tokens
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  return (
    token.startsWith('ghp_') && token.length >= 40 ||
    token.startsWith('gho_') && token.length >= 40 ||
    token.startsWith('github_pat_') && token.length >= 60
  );
}

/**
 * Validate GitHub token by making a test API call to /user
 * Following the mobile approach: validate token before using it
 */
export async function validateGitHubTokenAPI(token: string): Promise<boolean> {
  try {
    console.log('🔐 Validating token with GitHub API...');
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (response.ok) {
      console.log('🔐 Token validation successful');
      return true;
    } else if (response.status === 401) {
      console.log('🔐 Token validation failed: 401 Unauthorized');
      return false;
    } else {
      console.log('🔐 Token validation failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('🔐 Token validation error:', error);
    return false;
  }
}

/**
 * Validate current stored token and clear if invalid
 * Following the mobile approach: check token validity on initialization
 */
export async function validateAndCleanStoredToken(): Promise<boolean> {
  const token = getGitHubToken();
  if (!token) {
    console.log('🔐 No token found in storage');
    return false;
  }

  const isValid = await validateGitHubTokenAPI(token);
  if (!isValid) {
    console.log('🔐 Stored token is invalid, clearing it');
    removeGitHubToken();
    return false;
  }

  console.log('🔐 Stored token is valid');
  return true;
}

/**
 * Store validated GitHub token
 * @param token - GitHub token to validate and store
 * @throws Error if token is invalid
 */
export function authenticateWithToken(token: string): void {
  if (!validateGitHubTokenFormat(token)) {
    throw new Error('Invalid GitHub token format');
  }
  
  storeGitHubToken(token);
  
  // Immediately sync to server account
  authStore.syncGithubToken(token);
}
