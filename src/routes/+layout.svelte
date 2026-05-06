<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authStore } from '$lib/stores/auth.svelte';
	import { timerStore } from '$lib/stores/timer.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();
	let initializing = $state(true);

	// Load local metadata
	timerStore.init();

	onMount(() => {
		let pollInterval: any;

		async function init() {
			// Restore session
			if (authStore.token && !authStore.user) {
				try {
					await authStore.fetchMe();
				} catch (e) {
					console.error('[Layout] Session restore failed:', e);
				}
			}
			
			// Initial sync
			if (authStore.isAuthenticated) {
				await timerStore.sync();
			}
			initializing = false;

			// Start 5s polling for multi-device sync
			pollInterval = setInterval(() => {
				if (authStore.isAuthenticated && !timerStore.isLoading) {
					timerStore.sync();
				}
			}, 5000);
		}

		init();

		return () => {
			clearInterval(pollInterval);
			timerStore.destroy();
		};
	});

	import { githubAuthStore } from '$lib/stores/githubAuth.svelte';

	// Redirect logic
	$effect(() => {
		if (initializing || authStore.loading) return;

		const isLoginPage = page.url.pathname === '/login';
		const authenticated = authStore.isAuthenticated;

		if (!authenticated && !isLoginPage) {
			goto('/login');
		} else if (authenticated && isLoginPage) {
			goto('/');
		}
	});

	// Auto-sync GitHub token (Server is source of truth)
	$effect(() => {
		const user = authStore.user;
		const token = authStore.token;
		
		if (token && user) {
			void (async () => {
				const { getSessionToken, storeSessionToken, removeSessionToken } = await import('$lib/auth/session');
				const sessionToken = getSessionToken();
				
				if (user.github_token) {
					// Server has a token, ensure local matches
					if (sessionToken !== user.github_token) {
						console.log('[Layout] Syncing GitHub token DOWN from account...');
						storeSessionToken(user.github_token);
						githubAuthStore.refresh();
					}
				} else if (sessionToken) {
					// Server is empty but local has a token, this means a logout happened elsewhere
					console.log('[Layout] Clearing local GitHub session (synced from server logout)');
					removeSessionToken();
					githubAuthStore.refresh();
				}
			})();
		}
	});

	// Keep githubAuthStore reactive to account changes
	$effect(() => {
		const serverToken = authStore.user?.github_token;
		if (serverToken !== undefined) {
			githubAuthStore.refresh();
		}
	});
</script>

<svelte:head>
	<title>WorkTrack | Premium Time Management</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-200">
	{@render children()}
</div>
