/**
 * User Session Management
 * Handles per-browser session identification and isolation
 */

export interface UserSession {
	id: string;
	createdAt: number;
	lastActive: number;
	githubUsername?: string;
	githubToken?: string;
}

const SESSION_KEY = 'worktrack_user_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate browser fingerprint for unique identification
 */
function generateBrowserFingerprint(): string {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.textBaseline = 'top';
		ctx.font = '14px Arial';
		ctx.fillText('Browser fingerprint', 2, 2);
	}
	
	const fingerprint = [
		navigator.userAgent,
		navigator.language,
		screen.width + 'x' + screen.height,
		new Date().getTimezoneOffset(),
		canvas.toDataURL()
	].join('|');
	
	return btoa(fingerprint).slice(0, 16);
}

/**
 * Generate a unique session ID for this browser
 */
function generateSessionId(): string {
	const fingerprint = generateBrowserFingerprint();
	return `session_${fingerprint}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate if session belongs to current browser
 */
function validateSessionBrowser(session: UserSession): boolean {
	const currentFingerprint = generateBrowserFingerprint();
	return session.id.includes(currentFingerprint);
}

/**
 * Get current user session or create a new one
 */
export function getCurrentSession(): UserSession {
	const stored = localStorage.getItem(SESSION_KEY);
	
	if (stored) {
		try {
			const session = JSON.parse(stored) as UserSession;
			
			// Check if session is still valid and belongs to current browser
			if (Date.now() - session.lastActive < SESSION_DURATION && validateSessionBrowser(session)) {
				// Update last active time
				session.lastActive = Date.now();
				localStorage.setItem(SESSION_KEY, JSON.stringify(session));
				return session;
			} else {
				// Session is expired or from different browser, clear it
				console.log('🔄 Clearing stale session from different browser/device');
				localStorage.removeItem(SESSION_KEY);
			}
		} catch {
			// Invalid session, create new one
			localStorage.removeItem(SESSION_KEY);
		}
	}
	
	// Create new session
	const newSession: UserSession = {
		id: generateSessionId(),
		createdAt: Date.now(),
		lastActive: Date.now()
	};
	
	localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
	return newSession;
}

/**
 * Update session with GitHub user info
 */
export function updateSessionWithGithubAuth(username: string, token: string): void {
	const session = getCurrentSession();
	session.githubUsername = username;
	session.githubToken = token;
	session.lastActive = Date.now();
	
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Clear GitHub authentication from current session
 */
export function clearSessionGithubAuth(): void {
	const session = getCurrentSession();
	delete session.githubUsername;
	delete session.githubToken;
	session.lastActive = Date.now();
	
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Get GitHub token from current session
 */
export function getSessionToken(): string | null {
	const session = getCurrentSession();
	return session.githubToken || null;
}

/**
 * Store GitHub token in current session
 */
export function storeSessionToken(token: string): void {
	const session = getCurrentSession();
	session.githubToken = token;
	session.lastActive = Date.now();
	
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Remove GitHub token from current session
 */
export function removeSessionToken(): void {
	const session = getCurrentSession();
	delete session.githubToken;
	session.lastActive = Date.now();
	
	localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Check if current session has GitHub authentication
 */
export function hasSessionAuth(): boolean {
	const session = getCurrentSession();
	return !!session.githubToken;
}

/**
 * Get session display info
 */
export function getSessionDisplayInfo(): { sessionId: string; username?: string } {
	const session = getCurrentSession();
	return {
		sessionId: session.id,
		username: session.githubUsername
	};
}

/**
 * Force clear all authentication and session data
 * Useful for testing and ensuring clean state
 */
export function clearAllAuthData(): void {
	console.log('🧹 Clearing all authentication and session data');
	localStorage.removeItem(SESSION_KEY);
	// Also clear any old GitHub token keys that might exist
	localStorage.removeItem('github_token');
	localStorage.removeItem('github_pat');
}
