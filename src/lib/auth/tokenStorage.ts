/**
 * Secure token storage utilities for GitHub PAT (Personal Access Token)
 * All tokens are stored in browser's localStorage per device/browser session
 */

const TOKEN_KEY = 'github_pat_token';
const TOKEN_EXPIRY_KEY = 'github_pat_token_expiry';

/**
 * Stores a GitHub PAT in localStorage
 * @param token GitHub Personal Access Token
 * @param expiryHours Optional expiry time in hours (default: never expires in this implementation)
 */
export function storeToken(token: string, expiryHours?: number): void {
	if (!token?.trim()) {
		throw new Error('Token cannot be empty');
	}

	try {
		localStorage.setItem(TOKEN_KEY, token);

		if (expiryHours) {
			const expiryTime = Date.now() + expiryHours * 60 * 60 * 1000;
			localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
		} else {
			localStorage.removeItem(TOKEN_EXPIRY_KEY);
		}
	} catch (error) {
		throw new Error(`Failed to store token: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Retrieves the stored GitHub PAT from localStorage
 * @returns Token string or null if not found or expired
 */
export function getToken(): string | null {
	try {
		const token = localStorage.getItem(TOKEN_KEY);

		if (!token) {
			return null;
		}

		// Check expiry
		const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
		if (expiryTime) {
			const expiry = parseInt(expiryTime, 10);
			// Only clear token if expiry is a valid number AND has passed
			if (!isNaN(expiry) && Date.now() > expiry) {
				clearToken();
				return null;
			}
		}

		return token;
	} catch (error) {
		console.error(`Failed to retrieve token: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

/**
 * Checks if a valid token exists in localStorage
 * @returns true if token exists and is not expired
 */
export function hasToken(): boolean {
	return getToken() !== null;
}

/**
 * Clears the stored token from localStorage
 */
export function clearToken(): void {
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
	} catch (error) {
		console.error(`Failed to clear token: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Validates a token by attempting to fetch the authenticated user's info
 * @param token Token to validate
 * @returns true if token is valid, false otherwise
 */
export async function validateToken(token: string): Promise<boolean> {
	try {
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		return response.ok;
	} catch (error) {
		console.error(`Token validation failed: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}


// =============================================================================
// HTTP-ONLY COOKIE STORAGE (Server-side secure storage)
// =============================================================================

const COOKIE_TOKEN_NAME = 'github_token';
const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: import.meta.env.PROD
};

/**
 * Store GitHub token in httpOnly cookie (server-side)
 * This function should be called from server routes only
 * @param token GitHub access token
 * @param cookies SvelteKit cookies object
 * @param maxAge Token max age in seconds (default: 30 days)
 */
export function storeGitHubTokenCookie(token: string, cookies: { set: Function }, maxAge = 30 * 24 * 60 * 60): void {
	if (!token?.trim()) {
		throw new Error('Token cannot be empty');
	}

	try {
		// Encode token to handle special characters
		const encodedToken = btoa(token);
		
		cookies.set(COOKIE_TOKEN_NAME, encodedToken, {
			...COOKIE_OPTIONS,
			maxAge
		});

		console.log('🔐 [TokenStorage] Token stored in httpOnly cookie');
	} catch (error) {
		console.error(`🔐 [TokenStorage] Failed to store token in cookie: ${error instanceof Error ? error.message : String(error)}`);
		throw new Error('Failed to store token securely');
	}
}

/**
 * Clear GitHub token from cookie (server-side)
 * @param cookies SvelteKit cookies object
 */
export function clearGitHubTokenCookie(cookies: { delete: Function }): void {
	try {
		cookies.delete(COOKIE_TOKEN_NAME, { path: '/' });
		console.log('🔐 [TokenStorage] Token cleared from cookie');
	} catch (error) {
		console.error(`🔐 [TokenStorage] Failed to clear token from cookie: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Get GitHub token from cookie (client-side)
 * Note: This reads a non-httpOnly companion cookie for client access
 * The actual token is in httpOnly cookie, but we also set a read-only version
 */
export function getGitHubTokenFromCookie(): string | null {
	if (typeof document === 'undefined') {
		return null;
	}

	try {
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === 'github_token_readable') {
				return decodeURIComponent(value);
			}
		}
		return null;
	} catch (error) {
		console.error(`🔐 [TokenStorage] Failed to get token from cookie: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

/**
 * Store GitHub token as readable cookie (client-side access)
 * This is a companion to the httpOnly cookie for client-side token access
 * @param token GitHub access token
 * @param maxAge Max age in seconds (default: 30 days)
 */
export function storeGitHubTokenReadableCookie(token: string, maxAge = 30 * 24 * 60 * 60): void {
	if (typeof document === 'undefined') return;

	try {
		const expiry = new Date();
		expiry.setSeconds(expiry.getSeconds() + maxAge);
		
		document.cookie = `github_token_readable=${encodeURIComponent(token)}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
		console.log('🔐 [TokenStorage] Readable token cookie stored');
	} catch (error) {
		console.error(`🔐 [TokenStorage] Failed to store readable cookie: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Clear readable token cookie
 */
export function clearGitHubTokenReadableCookie(): void {
	if (typeof document === 'undefined') return;

	try {
		document.cookie = 'github_token_readable=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
		console.log('🔐 [TokenStorage] Readable token cookie cleared');
	} catch (error) {
		console.error(`🔐 [TokenStorage] Failed to clear readable cookie: ${error instanceof Error ? error.message : String(error)}`);
	}
}
