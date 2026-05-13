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

	onMount(() => {
		// Load local metadata
		timerStore.init();

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

	// Keep GitHub auth state reactive to server profile changes.
	$effect(() => {
		const user = authStore.user;
		if (user) {
			githubAuthStore.refresh();
		}
	});

	// Keep githubAuthStore reactive to account changes
	$effect(() => {
		const connected = authStore.user?.github_connected;
		if (connected !== undefined) {
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
