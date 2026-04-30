<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import TimeframeSelector from './TimeframeSelector.svelte';
	import HeroMetricsWidget from './HeroMetricsWidget.svelte';
	import ChartsWidget from './ChartsWidget.svelte';
	import QuickAccessWidget from './QuickAccessWidget.svelte';

	let timeframe = $state<'day' | 'week' | 'month' | 'year'>('day');

	function handleTimeframeChange(newTimeframe: 'day' | 'week' | 'month' | 'year') {
		timeframe = newTimeframe;
	}
</script>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950">
	<!-- Header -->
	<header class="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
		<div class="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Welcome back, {tracker.state.currentUser}
				</p>
			</div>
			<TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl p-6">
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
