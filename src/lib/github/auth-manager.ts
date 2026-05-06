/**
 * Authentication Manager
 * Handles authentication state checking and initialization flow
 */

import { getAuthState, removeGitHubToken } from './auth';
import { getUserProfile, GitHubAuthError } from './api';

export interface AuthInitResult {
  isAuthenticated: boolean;
  needsLogin: boolean;
  error?: string;
  userProfile?: any;
}

/**
 * Check authentication state on application load
 * @returns Authentication initialization result
 */
export async function checkAuthentication(): Promise<AuthInitResult> {
  console.log('🔐 Checking authentication state...');
  const authState = getAuthState();
  console.log('🔐 Auth state:', authState);
  
  if (!authState.isAuthenticated) {
    console.log('🔐 No token found, login required');
    return {
      isAuthenticated: false,
      needsLogin: true
    };
  }

  // Validate token by making a test API call
  try {
    console.log('🔐 Token found, validating with GitHub API...');
    const userProfile = await getUserProfile();
    console.log('🔐 User profile retrieved successfully:', userProfile);
    return {
      isAuthenticated: true,
      needsLogin: false,
      userProfile
    };
  } catch (error) {
    console.error('🔐 Token validation failed:', error);
    if (error instanceof GitHubAuthError) {
      // Token is invalid or expired, remove it
      removeGitHubToken();
      return {
        isAuthenticated: false,
        needsLogin: true,
        error: 'Your GitHub token has expired or is invalid. Please authenticate again.'
      };
    }
    
    // Other error (network, etc.)
    return {
      isAuthenticated: false,
      needsLogin: true,
      error: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Initialize authentication flow
 * Call this on application startup
 */
export async function initializeAuth(): Promise<AuthInitResult> {
  return await checkAuthentication();
}

/**
 * Handle authentication errors and determine if re-authentication is needed
 * @param error - Error from API call
 * @returns true if user needs to re-authenticate
 */
export function shouldReAuthenticate(error: unknown): boolean {
  if (error instanceof GitHubAuthError) {
    return true;
  }
  
  if (error instanceof Error && error.message.includes('401')) {
    return true;
  }
  
  return false;
}

import { authStore } from '$lib/stores/auth.svelte';

/**
 * Clear authentication state
 * Call this when user explicitly logs out
 */
export function logout(): void {
  removeGitHubToken();
  // Also clear from server account
  authStore.syncGithubToken(null);
}
