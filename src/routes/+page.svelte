<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tracker } from '$lib/stores/tracker.svelte';
	import NavBar from '$lib/components/NavBar.svelte';
	import TimerPanel from '$lib/components/TimerPanel.svelte';
	import LogsPanel from '$lib/components/LogsPanel.svelte';
	import ReportsPanel from '$lib/components/ReportsPanel.svelte';
	import GithubIssuesPanel from '$lib/components/GithubIssuesPanel.svelte';

	let activeTab = $state('timer');

	onMount(() => {
		// Initialize the tracker state (loads from localStorage)
		tracker.init();
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
