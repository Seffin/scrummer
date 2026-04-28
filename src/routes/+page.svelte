<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
		import { tracker } from '$lib/stores/tracker.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	import TimerPanel from '$lib/components/TimerPanel.svelte';
	import LogsPanel from '$lib/components/LogsPanel.svelte';
	import ReportsPanel from '$lib/components/ReportsPanel.svelte';
	import GithubIssuesPanel from '$lib/components/GithubIssuesPanel.svelte';

		let activeTab = $state('timer');
	const TAB_KEY = 'worktrack_active_tab';

	onMount(async () => {
		// Initialize the tracker state (loads from localStorage)
		tracker.init();
		
		if (authStore.token) {
			await authStore.fetchUser();
		}

		// Load persisted tab
		const savedTab = localStorage.getItem(TAB_KEY);
		if (savedTab) activeTab = savedTab;
	});

	async function handleLogin() {
		// Device Flow implementation
		const { githubOAuth } = await import('$lib/github/oauth-client');
		try {
			const { verification_uri, user_code } = await githubOAuth.initiateDeviceFlow();
			
			// Open GitHub verification page
			window.open(verification_uri, '_blank');
			
			// Show instructions to user (could be a modal)
			alert(`Please enter the code ${user_code} on GitHub to authorize.`);
			
			githubOAuth.startPolling(async (status, data) => {
				if (status === 'authorized' && data?.access_token) {
					authStore.setToken(data.access_token);
					await authStore.fetchUser();
				}
			});
		} catch (e) {
			alert('Failed to initiate login: ' + (e as Error).message);
		}
	}


	$effect(() => {
		// Persist tab on change
		localStorage.setItem(TAB_KEY, activeTab);
	});

	onDestroy(() => {
		// Clean up the interval when the component is destroyed
		tracker.destroy();
	});
</script>

<svelte:head>
	<title>WorkTrack - Advanced Time & Task Manager</title>
	<meta name="description" content="Manage your time and tasks efficiently with WorkTrack." />
</svelte:head>

{#if !authStore.isAuthenticated}
	<!-- Authentication Prompt -->
	<div class="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
		<div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
			<div class="mb-6 flex justify-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
					<span class="text-3xl">⚡</span>
				</div>
			</div>
			<h1 class="mb-2 text-center text-2xl font-bold text-slate-900 dark:text-white">Welcome to WorkTrack</h1>
			<p class="mb-8 text-center text-sm text-slate-600 dark:text-slate-400">
				Manage your time and tasks efficiently. Sign in with GitHub to sync your issues and start tracking.
			</p>
			
			{#if authStore.error}
				<div class="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
					{authStore.error}
				</div>
			{/if}

			<button
				onclick={handleLogin}
				disabled={authStore.loading}
				class="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
			>
				{#if authStore.loading}
					<span class="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-white"></span>
					Connecting...
				{:else}
					<span class="text-xl">🐙</span>
					Continue with GitHub
				{/if}
			</button>
		</div>
	</div>
{:else}

	<!-- Main App UI -->
	<div class="flex h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
		<!-- Navigation Sidebar/Top/Bottom -->
		<NavBar bind:activeTab />

		<!-- Main Content Area -->
		<div class="flex-1 overflow-y-auto pb-24 pt-4 lg:pb-8 lg:pt-8 w-full">
			<main class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<!-- Header logic -->
				<div class="mb-8 hidden lg:block">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						{#if activeTab === 'timer'}
							Dashboard
						{:else if activeTab === 'logs'}
							Work History
						{:else if activeTab === 'reports'}
							Analytics
						{:else if activeTab === 'github'}
							GitHub Tracking
						{/if}
					</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
						{#if activeTab === 'timer'}
							Track your time across clients and projects.
						{:else if activeTab === 'logs'}
							Review your completed work sessions.
						{:else if activeTab === 'reports'}
							Analyze your time distribution.
						{:else if activeTab === 'github'}
							Load GitHub issues, start timers from issues, and create new backlog items.
						{/if}
					</p>
				</div>

				<!-- Dynamic Panel Content -->
				{#if activeTab === 'timer'}
					<TimerPanel />
				{:else if activeTab === 'logs'}
					<LogsPanel />
				{:else if activeTab === 'reports'}
					<ReportsPanel />
				{:else if activeTab === 'github'}
					<GithubIssuesPanel />
				{/if}
			</main>
		</div>
	</div>
{/if}
