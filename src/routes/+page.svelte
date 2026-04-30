<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tracker } from '$lib/stores/tracker.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	import TimerPanel from '$lib/components/TimerPanel.svelte';
	import LogsPanel from '$lib/components/LogsPanel.svelte';
	import ReportsPanel from '$lib/components/ReportsPanel.svelte';
	import GithubIssuesPanel from '$lib/components/GithubIssuesPanel.svelte';
	import DashboardLayout from '$lib/components/dashboard/DashboardLayout.svelte';

	let activeTab = $state('home');
	const TAB_KEY = 'worktrack_active_tab';

	onMount(async () => {
		// Initialize the tracker state (loads from localStorage)
		tracker.init();

		// Load persisted tab (default to home if none saved)
		const savedTab = localStorage.getItem(TAB_KEY);
		if (savedTab) activeTab = savedTab;
	});

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
	<title>WorkTrack - {activeTab === 'home' ? 'Home' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</title>
	<meta name="description" content="Manage your time and tasks efficiently with WorkTrack." />
</svelte:head>

<!-- Main App UI -->
<div class="flex h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
	<!-- Navigation Sidebar/Top/Bottom -->
	<NavBar bind:activeTab />

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto pb-24 pt-4 lg:pb-8 lg:pt-0 w-full">
		<!-- Dynamic Panel Content -->
		{#if activeTab === 'home'}
			<DashboardLayout />
		{:else if activeTab === 'timer'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Timer</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Track your time across clients and projects.</p>
				</div>
				<TimerPanel />
			</div>
		{:else if activeTab === 'logs'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Work History</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Review your completed work sessions.</p>
				</div>
				<LogsPanel />
			</div>
		{:else if activeTab === 'reports'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Analyze your time distribution.</p>
				</div>
				<ReportsPanel />
			</div>
		{:else if activeTab === 'github'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">GitHub Tracking</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Load GitHub issues, start timers from issues, and create new backlog items.</p>
				</div>
				<GithubIssuesPanel />
			</div>
		{:else if activeTab === 'settings'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure your preferences.</p>
				</div>
			</div>
		{/if}
	</div>
</div>
