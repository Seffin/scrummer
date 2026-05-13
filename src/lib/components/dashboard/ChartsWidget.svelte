<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import {
		Chart as ChartJS,
		ArcElement,
		CategoryScale,
		LinearScale,
		BarElement,
		BarController,
		DoughnutController,
		Title,
		Tooltip,
		Legend,
		Filler,
		type ChartOptions
	} from 'chart.js';

	ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, BarController, DoughnutController, Title, Tooltip, Legend, Filler);

	interface Props {
		timeframe: 'day' | 'week' | 'month' | 'year';
	}

	let { timeframe }: Props = $props();

	// Time Allocation Data (Doughnut Chart)
	let timeAllocationData = $derived(() => {
		const now = new SvelteDate();
		const clientTimes = new Map<string, number>();

		// Aggregate by client
		for (const s of timerStore.sessions) {
			const sessionDate = new SvelteDate(s.startTime);
			if (isInTimeframe(sessionDate, timeframe, now)) {
				clientTimes.set(s.client, (clientTimes.get(s.client) ?? 0) + s.durationSeconds);
			}
		}

		const labels = Array.from(clientTimes.keys());
		const data = Array.from(clientTimes.values()).map(s => Math.round(s / 3600 * 10) / 10); // Convert to hours

		return {
			labels,
			datasets: [{
				data,
				backgroundColor: [
					'#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4'
				],
				borderWidth: 0,
				hoverOffset: 4
			}]
		};
	});

	// Activity Velocity Data (Bar Chart)
	let activityVelocityData = $derived(() => {
		const now = new SvelteDate();
		const dailyHours = new Map<string, number>();

		// Get last 7 days or 30 days based on timeframe
		const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;

		for (let i = days - 1; i >= 0; i--) {
			const d = new SvelteDate(now);
			d.setDate(d.getDate() - i);
			const dateKey = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
			dailyHours.set(dateKey, 0);
		}

		// Fill in actual data
		for (const s of timerStore.sessions) {
			const sessionDate = new SvelteDate(s.startTime);
			const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

			if (daysDiff >= 0 && daysDiff < days) {
				const dateKey = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
				if (dailyHours.has(dateKey)) {
					dailyHours.set(dateKey, (dailyHours.get(dateKey) ?? 0) + s.durationSeconds / 3600);
				}
			}
		}

		const labels = Array.from(dailyHours.keys());
		const data = Array.from(dailyHours.values()).map(h => Math.round(h * 10) / 10);

		return {
			labels,
			datasets: [{
				label: 'Hours Logged',
				data,
				backgroundColor: '#6366f1',
				borderRadius: 4,
				borderSkipped: false
			}]
		};
	});

	// Status Distribution Data
	let statusDistribution = $derived(() => {
		const counts: Record<string, number> = {
			'Pending': 0,
			'In Progress': 0,
			'On Hold': 0,
			'Completed': 0
		};

		for (const s of timerStore.sessions) {
			const status = s.status;
			if (counts[status] !== undefined) {
				counts[status]++;
			}
		}

		return {
			labels: Object.keys(counts),
			datasets: [{
				data: Object.values(counts),
				backgroundColor: ['#94a3b8', '#6366f1', '#f59e0b', '#10b981'],
				borderWidth: 0,
				borderRadius: 4,
				borderSkipped: false
			}]
		};
	});

	const chartOptions: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					usePointStyle: true,
					padding: 16,
					font: { size: 11 }
				}
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: 'rgba(148, 163, 184, 0.1)'
				}
			},
			x: {
				grid: {
					display: false
				}
			}
		}
	};

	const doughnutOptions: ChartOptions<'doughnut'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: {
					usePointStyle: true,
					padding: 12,
					font: { size: 11 }
				}
			}
		},
		cutout: '60%'
	};

	function isInTimeframe(date: SvelteDate, tf: 'day' | 'week' | 'month' | 'year', now: SvelteDate): boolean {
		switch (tf) {
			case 'day':
				return date.toDateString() === now.toDateString();
			case 'week': {
				const weekAgo = new SvelteDate(now);
				weekAgo.setDate(weekAgo.getDate() - 7);
				return date >= weekAgo;
			}
			case 'month': {
				const monthAgo = new SvelteDate(now);
				monthAgo.setMonth(monthAgo.getMonth() - 1);
				return date >= monthAgo;
			}
			case 'year': {
				const yearAgo = new SvelteDate(now);
				yearAgo.setFullYear(yearAgo.getFullYear() - 1);
				return date >= yearAgo;
			}
		}
	}

	function chartAction(node: HTMLCanvasElement, config: any) {
		let chartInstance = new ChartJS(node, config);
		return {
			update(newConfig: any) {
				chartInstance.data = newConfig.data;
				chartInstance.options = newConfig.options;
				chartInstance.update();
			},
			destroy() {
				chartInstance.destroy();
			}
		};
	}
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Time Allocation (Doughnut) -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Time Allocation</h3>
		<div class="h-48 relative">
			{#if timeAllocationData().labels.length > 0}
				<canvas use:chartAction={{ type: 'doughnut', data: timeAllocationData(), options: doughnutOptions }}></canvas>
			{:else}
				<div class="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
					<p class="text-sm">No data for this period</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Activity Velocity (Bar) -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Activity Velocity</h3>
		<div class="h-48 relative">
			{#if activityVelocityData().labels.length > 0}
				<canvas use:chartAction={{ type: 'bar', data: activityVelocityData(), options: chartOptions }}></canvas>
			{:else}
				<div class="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
					<p class="text-sm">No data for this period</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Status Distribution (Bar) -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Status Distribution</h3>
		<div class="h-48 relative">
			{#if statusDistribution().datasets[0].data.some(v => v > 0)}
				<canvas use:chartAction={{ type: 'bar', data: statusDistribution(), options: chartOptions }}></canvas>
			{:else}
				<div class="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
					<p class="text-sm">No sessions recorded</p>
				</div>
			{/if}
		</div>
	</div>
</div>
