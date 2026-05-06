import { browser } from '$app/environment';

export interface User {
	id: number;
	github_id?: string;
	github_username?: string;
	github_token?: string;
	username: string;
	email?: string;
	avatar_url?: string;
	github_repo?: string;
}

const API_BASE = browser 
	? `http://${window.location.hostname}:3001/api` 
	: 'http://localhost:3001/api';

export function createAuthStore() {
	let token = $state<string | null>(null);
	let user = $state<User | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Initialize from localStorage
	token = localStorage.getItem('auth_token');
	const storedUser = localStorage.getItem('auth_user');
	if (storedUser) {
		try {
			user = JSON.parse(storedUser);
		} catch (e) {
			console.error('Failed to parse stored user', e);
		}
	}

	function setToken(newToken: string | null, newUser: User | null = null) {
		// Ensure we don't store 'undefined' as a string
		const actualToken = newToken || null;
		const actualUser = newUser || null;
		
		console.log('[AuthStore] Setting token:', { hasToken: !!actualToken, hasUser: !!actualUser });
		
		token = actualToken;
		user = actualUser;
		
		if (actualToken) {
			localStorage.setItem('auth_token', actualToken);
			if (actualUser) {
				localStorage.setItem('auth_user', JSON.stringify(actualUser));
			}
		} else {
			localStorage.removeItem('auth_token');
			localStorage.removeItem('auth_user');
		}
	}

	async function register(email: string, password: string, username: string) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`${API_BASE}/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, username })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Registration failed');
			setToken(data.access_token, data.user);
			return true;
		} catch (e) {
			error = (e as Error).message;
			return false;
		} finally {
			loading = false;
		}
	}

	async function loginEmail(email: string, password: string) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`${API_BASE}/auth/login-email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Login failed');
			setToken(data.access_token, data.user);
			return true;
		} catch (e) {
			error = (e as Error).message;
			return false;
		} finally {
			loading = false;
		}
	}

	async function loginGitHub(githubData: any) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`${API_BASE}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					github_id: githubData.id.toString(),
					username: githubData.login,
					email: githubData.email,
					avatar_url: githubData.avatar_url
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'GitHub login failed');
			setToken(data.access_token, data.user);
			return true;
		} catch (e) {
			error = (e as Error).message;
			return false;
		} finally {
			loading = false;
		}
	}

	async function loginGoogle(googleData: any) {
		loading = true;
		error = null;
		try {
			const res = await fetch(`${API_BASE}/auth/login-google`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					google_id: googleData.sub,
					username: googleData.name,
					email: googleData.email,
					avatar_url: googleData.picture
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Google login failed');
			setToken(data.access_token, data.user);
			return true;
		} catch (e) {
			error = (e as Error).message;
			return false;
		} finally {
			loading = false;
		}
	}

	async function fetchMe() {
		if (!token) return;
		loading = true;
		try {
			const res = await fetch(`${API_BASE}/auth/me`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.status === 401 || res.status === 403) {
				console.log('[AuthStore] Session expired, logging out');
				logout();
				return;
			}
			if (!res.ok) throw new Error('Session check failed');
			const data = await res.json();
			user = data.user;
			localStorage.setItem('auth_user', JSON.stringify(user));
		} catch (e) {
			console.error('[AuthStore] fetchMe error:', e);
			// Do not logout on network errors/timeouts
		} finally {
			loading = false;
		}
	}
	
	// Refresh user profile when window gains focus to catch updates from other devices
	if (browser) {
		window.addEventListener('focus', () => {
			if (token) {
				console.log('[AuthStore] Window focused, checking for profile updates...');
				void fetchMe();
			}
		});
	}

	function logout() {
		if (token) {
			fetch(`${API_BASE}/auth/logout`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` }
			}).catch(() => {});
		}
		setToken(null);
	}

	async function syncGithubToken(githubToken: string | null) {
		if (!token || !user) return;
		
		// If we are setting a token, check if it's already the same
		if (githubToken && user.github_token === githubToken) return;
		// If we are clearing, check if it's already empty
		if (!githubToken && !user.github_token) return;
		
		try {
			const { authApi } = await import('$lib/api/authApi');
			// Use null or empty string to clear on server
			const res = await authApi.updateProfile({ github_token: githubToken || '' });
			user = res.user;
			localStorage.setItem('auth_user', JSON.stringify(user));
			console.log(githubToken ? '🔄 GitHub token synced to WorkTrack account' : '🗑️ GitHub token removed from WorkTrack account');
		} catch (e) {
			console.error('Failed to sync GitHub token to server', e);
		}
	}

	return {
		get token() { return token; },
		get user() { return user; },
		get loading() { return loading; },
		get error() { return error; },
		get isAuthenticated() { return !!token; },
		register,
		loginEmail,
		loginGitHub,
		loginGoogle,
		fetchMe,
		setToken,
		syncGithubToken,
		logout
	};
}

export const authStore = createAuthStore();
