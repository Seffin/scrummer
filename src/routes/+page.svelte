<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { timerStore } from '$lib/stores/timer.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { navStore } from '$lib/stores/nav.svelte';
	import NavBar from '$lib/components/NavBar.svelte';

	import TimerPanel from '$lib/components/TimerPanel.svelte';
	import LogsPanel from '$lib/components/LogsPanel.svelte';
	import ReportsPanel from '$lib/components/ReportsPanel.svelte';
	import GithubIssuesPanel from '$lib/components/GithubIssuesPanel.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import DashboardLayout from '$lib/components/dashboard/DashboardLayout.svelte';

	onMount(() => {
		timerStore.init();
		if (authStore.isAuthenticated) {
			timerStore.sync();
		}
	});

	onDestroy(() => {
		timerStore.destroy();
	});
</script>

<svelte:head>
	<title>WorkTrack - {navStore.activeTab === 'home' ? 'Home' : navStore.activeTab.charAt(0).toUpperCase() + navStore.activeTab.slice(1)}</title>
	<meta name="description" content="Manage your time and tasks efficiently with WorkTrack." />
</svelte:head>

<!-- Main App UI -->
<div class="flex h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
	<!-- Navigation Sidebar/Top/Bottom -->
	<NavBar />

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto pb-24 pt-4 lg:pb-8 lg:pt-0 w-full">
		<!-- Dynamic Panel Content -->
		{#if navStore.activeTab === 'home'}
			<DashboardLayout />
		{:else if navStore.activeTab === 'timer'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Timer</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Track your time across clients and projects.</p>
				</div>
				<TimerPanel />
			</div>
		{:else if navStore.activeTab === 'logs'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Work History</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Review your completed work sessions.</p>
				</div>
				<LogsPanel />
			</div>
		{:else if navStore.activeTab === 'reports'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Analytics</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Analyze your time distribution.</p>
				</div>
				<ReportsPanel />
			</div>
		{:else if navStore.activeTab === 'github'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">GitHub Tracking</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Load GitHub issues, start timers from issues, and create new backlog items.</p>
				</div>
				<GithubIssuesPanel />
			</div>
		{:else if navStore.activeTab === 'settings'}
			<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				<div class="mb-8">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure your preferences and manage your account.</p>
				</div>
				<SettingsPanel />
			</div>
		{/if}
	</div>
</div>
