<script lang="ts">
	import TimeframeSelector from './TimeframeSelector.svelte';
	import HeroMetricsWidget from './HeroMetricsWidget.svelte';
	import ChartsWidget from './ChartsWidget.svelte';
	import QuickAccessWidget from './QuickAccessWidget.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	let timeframe = $state<'day' | 'week' | 'month' | 'year'>('day');

	function handleTimeframeChange(newTimeframe: 'day' | 'week' | 'month' | 'year') {
		timeframe = newTimeframe;
	}
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950">
	<!-- Header -->
	<header class="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
		<div class="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-4">
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Welcome back, {authStore.user?.username || 'User'}
					</p>
				</div>
				{#if authStore.isAuthenticated}
					<button 
						onclick={() => authStore.logout()}
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-red-500/10 lg:hidden"
						title="Logout"
					>
						<span>🚪</span>
					</button>
				{/if}
			</div>
			<TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl p-4 sm:p-6">
		<!-- Hero Metrics -->
		<section class="mb-8">
			<HeroMetricsWidget {timeframe} />
		</section>

		<!-- Charts -->
		<section class="mb-8">
			<ChartsWidget {timeframe} />
		</section>

		<!-- Quick Access -->
		<section>
			<QuickAccessWidget />
		</section>
	</main>
</div>
