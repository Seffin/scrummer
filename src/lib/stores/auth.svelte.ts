import { browser } from '$app/environment';

export interface GitHubUser {
	login: string;
	avatar_url: string;
	name: string | null;
}

export function createAuthStore() {
	let token = $state<string | null>(null);
	let user = $state<GitHubUser | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Initialize from localStorage
	if (browser) {
		token = localStorage.getItem('github_token');
		const storedUser = localStorage.getItem('github_user');
		if (storedUser) {
			try {
				user = JSON.parse(storedUser);
			} catch (e) {
				console.error('Failed to parse stored user', e);
			}
		}
	}

	function setToken(newToken: string | null) {
		token = newToken;
		if (browser) {
			if (newToken) {
				localStorage.setItem('github_token', newToken);
			} else {
				localStorage.removeItem('github_token');
				localStorage.removeItem('github_user');
				user = null;
			}
		}
	}

	async function fetchUser() {
		if (!token) return;
		loading = true;
		error = null;
		try {
			const res = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `token ${token}`
				}
			});
			if (!res.ok) throw new Error('Failed to fetch user');
			const data = await res.json();
			user = {
				login: data.login,
				avatar_url: data.avatar_url,
				name: data.name
			};
			if (browser) {
				localStorage.setItem('github_user', JSON.stringify(user));
			}
		} catch (e) {
			error = (e as Error).message;
			setToken(null); // Clear invalid token
		} finally {
			loading = false;
		}
	}

	return {
		get token() { return token; },
		get user() { return user; },
		get loading() { return loading; },
		get error() { return error; },
		get isAuthenticated() { return !!token; },
		setToken,
		fetchUser,
		logout: () => setToken(null)
	};
}

export const authStore = createAuthStore();
