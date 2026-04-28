/**
 * Login Flow Logic
 * Handles the authentication prompt and token submission flow
 */

import { authenticateWithToken, validateGitHubTokenFormat } from './auth';
import { initializeAuth, type AuthInitResult } from './auth-manager';

export interface LoginState {
  isShowing: boolean;
  error?: string;
  isLoading: boolean;
}

export interface LoginCredentials {
  token: string;
}

/**
 * Create and show login prompt
 * This function manages the UI state for authentication
 */
export function showLoginPrompt(): LoginState {
  return {
    isShowing: true,
    isLoading: false
  };
}

/**
 * Hide login prompt
 */
export function hideLoginPrompt(): LoginState {
  return {
    isShowing: false,
    isLoading: false
  };
}

/**
 * Handle login form submission
 * @param credentials - User submitted credentials
 * @returns Promise that resolves on successful authentication
 */
export async function handleLogin(credentials: LoginCredentials): Promise<AuthInitResult> {
  const loginState: LoginState = {
    isShowing: true,
    isLoading: true
  };

  try {
    // Validate token format
    if (!validateGitHubTokenFormat(credentials.token)) {
      throw new Error('Invalid GitHub token format. Tokens should start with "ghp_" or "github_pat_"');
    }

    // Store token
    authenticateWithToken(credentials.token);

    // Verify authentication with GitHub
    const authResult = await initializeAuth();

    if (!authResult.isAuthenticated) {
      throw new Error(authResult.error || 'Authentication failed');
    }

    return {
      isAuthenticated: true,
      needsLogin: false,
      userProfile: authResult.userProfile
    };

  } catch (error) {
    // Return error state for UI display
    throw new Error(
      error instanceof Error ? error.message : 'Authentication failed'
    );
  }
}

/**
 * Handle logout
 * Clears authentication state and shows login prompt
 */
export function handleLogout(): LoginState {
  // Clear authentication (implemented in auth-manager)
  const { logout } = require('./auth-manager');
  logout();

  // Show login prompt again
  return showLoginPrompt();
}

/**
 * Check if authentication is needed on app load
 * Call this in your application initialization
 */
export async function checkAuthOnInit(): Promise<{
  needsLogin: boolean;
  authResult?: AuthInitResult;
  error?: string;
}> {
  try {
    const authResult = await initializeAuth();
    
    return {
      needsLogin: authResult.needsLogin,
      authResult
    };
  } catch (error) {
    return {
      needsLogin: true,
      error: error instanceof Error ? error.message : 'Authentication check failed'
    };
  }
}

/**
 * Get GitHub token creation instructions
 * Returns helpful text for users who need to create a PAT
 */
export function getTokenCreationInstructions(): string {
  return `
To create a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "WorkTrack App")
4. Select the following scopes:
   • repo (access repositories)
   • read:org (read organizations)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)
7. Paste the token in the field above

Tokens starting with "ghp_" are classic tokens.
Tokens starting with "github_pat_" are fine-grained tokens.
  `.trim();
}
