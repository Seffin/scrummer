<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { githubStore } from '$lib/stores/github.svelte';
	import { SvelteDate } from 'svelte/reactivity';

	interface Props {
		timeframe: 'day' | 'week' | 'month' | 'year';
	}

	let { timeframe }: Props = $props();

	// Time Tracked: Total duration based on timeframe
	let timeTracked = $derived.by(() => {
		const now = new SvelteDate();
		const sessions = timerStore.sessions;
		let totalSeconds = 0;

		for (const s of sessions) {
			const sessionDate = new SvelteDate(s.startTime);
			if (isInTimeframe(sessionDate, timeframe, now)) {
				totalSeconds += s.durationSeconds;
			}
		}

		// Include active timer if it matches timeframe
		const active = timerStore.activeTimer;
		if (active) {
			const timerDate = new SvelteDate(active.start_time);
			if (isInTimeframe(timerDate, timeframe, now)) {
				totalSeconds += timerStore.elapsedSeconds;
			}
		}

		return totalSeconds;
	});

	// Shift Goal Progress
	let shiftGoalSeconds = $derived.by(() => {
		return timerStore.getShiftGoal(authStore.user?.username || 'User') * 3600;
	});

	let shiftProgress = $derived.by(() => {
		const goal = shiftGoalSeconds;
		if (goal === 0) return 0;
		return Math.min((timeTracked / goal) * 100, 100);
	});

	// Active Timers Count
	let activeTimersCount = $derived.by(() => {
		return timerStore.activeTimer ? 1 : 0;
	});

	// Pending GitHub Issues Count
	let pendingIssuesCount = $derived.by(() => {
		// Count open issues from the GitHub store
		return githubStore.filteredIssues.filter(i => i.state === 'OPEN').length;
	});

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

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	}
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<!-- Time Tracked -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
				<span class="text-xl">⏱️</span>
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Time Tracked</p>
				<p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatDuration(timeTracked)}</p>
			</div>
		</div>
	</div>

	<!-- Shift Goal Progress -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
				<span class="text-xl">🎯</span>
			</div>
			<div class="flex-1">
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Shift Goal</p>
				<div class="flex items-center gap-2">
					<p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{Math.round(shiftProgress)}%</p>
				</div>
			</div>
		</div>
		<div class="mt-3">
			<div class="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
				<div
					class="h-2 rounded-full bg-emerald-500 transition-all duration-500"
					style="width: {shiftProgress}%"
				></div>
			</div>
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				{formatDuration(timeTracked)} / {formatDuration(shiftGoalSeconds)}
			</p>
		</div>
	</div>

	<!-- Active Timers -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
				<span class="text-xl">⚡</span>
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Timers</p>
				<p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeTimersCount}</p>
			</div>
		</div>
	</div>

	<!-- Pending Issues -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
				<span class="text-xl">🐙</span>
			</div>
			<div>
				<p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Issues</p>
				<p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{pendingIssuesCount}</p>
			</div>
		</div>
	</div>
</div>
