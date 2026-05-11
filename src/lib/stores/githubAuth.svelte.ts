import { browser } from '$app/environment';
import { removeGitHubToken, authenticateWithToken as apiAuthenticate } from '$lib/github/auth';
import { authStore } from './auth.svelte';

export function createGithubAuthStore() {
	let isAuthenticated = $derived(!!authStore.user?.github_connected && !authStore.githubDisconnected);

	if (browser) {
		// Keep this listener for backwards compatibility with older tabs.
		window.addEventListener('storage', () => {});
	}

	function logout() {
		removeGitHubToken();
	}

	function authenticate(newToken: string) {
		apiAuthenticate(newToken);
	}

	function refresh() {
		// State is derived from authStore.user.github_connected
	}

	return {
		get token() { return null; },
		get isAuthenticated() { return isAuthenticated; },
		refresh,
		logout,
		authenticate
	};
}

export const githubAuthStore = createGithubAuthStore();
