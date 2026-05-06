import { browser } from '$app/environment';
import { getGitHubToken, removeGitHubToken, authenticateWithToken as apiAuthenticate } from '$lib/github/auth';
import { authStore } from './auth.svelte';

export function createGithubAuthStore() {
	let token = $state<string | null>(null);
	let isAuthenticated = $derived(!!token && token !== 'local_cli_authenticated');

	if (browser) {
		// Initialize
		token = getGitHubToken();

		// Listen for storage changes (for multi-tab support)
		window.addEventListener('storage', (e) => {
			if (e.key === 'worktrack_user_session') {
				console.log('[GithubAuthStore] Session changed in another tab');
				token = getGitHubToken();
			}
		});
	}

	function logout() {
		removeGitHubToken();
		token = null;
	}

	function authenticate(newToken: string) {
		apiAuthenticate(newToken);
		token = newToken;
	}

	function refresh() {
		token = getGitHubToken();
	}

	return {
		get token() { return token; },
		get isAuthenticated() { return isAuthenticated; },
		refresh,
		logout,
		authenticate
	};
}

export const githubAuthStore = createGithubAuthStore();
