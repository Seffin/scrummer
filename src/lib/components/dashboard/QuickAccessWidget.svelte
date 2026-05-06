<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { githubStore } from '$lib/stores/github.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { formatDuration, formatDate } from '$lib/utils/timeUtils';

	// Now Tracking: Active and paused timers
	let activeTimers = $derived(() => {
		const list = [];
		if (timerStore.activeTimer) {
			list.push({ ...timerStore.activeTimer, isPaused: false, elapsed: timerStore.elapsedSeconds });
		}
		for (const pt of timerStore.pausedTimers) {
			list.push({ ...pt, isPaused: true, elapsed: pt.durationSeconds });
		}
		return list.slice(0, 5);
	});

	// Up Next: Open GitHub issues
	let upNextIssues = $derived(() => {
		return githubStore.filteredIssues
			.filter(i => i.state === 'OPEN')
			.slice(0, 5);
	});

	// Recent Sessions: Last 5 completed
	let recentSessions = $derived(() => {
		return [...timerStore.sessions]
			.filter(s => s.status === 'Completed' || s.status === 'completed')
			.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
			.slice(0, 5);
	});

	function handlePauseResume(timerId: string, isPaused: boolean) {
		if (isPaused) {
			timerStore.resume();
		} else {
			timerStore.pause();
		}
	}

	function handleComplete() {
		timerStore.complete();
	}

	function startFromIssue(issue: { number: number; title: string }) {
		timerStore.startFromGithubIssue(issue);
	}

	function formatWidgetDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
		}
		return `${minutes}m`;
	}
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Now Tracking -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Now Tracking</h3>
			{#if activeTimers().length > 0}
				<span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
					{activeTimers().length}
				</span>
			{/if}
		</div>

		{#if activeTimers().length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-slate-400 dark:text-slate-500">No active timers</p>
				<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Start a timer to track your work</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each activeTimers() as timer (timer.id)}
					<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-700/30">
						<div class="flex-1 min-0">
							<p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{timer.task}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{timer.client} / {timer.project}</p>
						</div>
						<div class="flex items-center gap-2">
							<span class="font-mono text-sm text-slate-700 dark:text-slate-300">
								{formatWidgetDuration(timer.elapsed)}
							</span>
							<button
								onclick={() => handlePauseResume(timer.id, timer.isPaused)}
								class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 hover:shadow-sm dark:hover:bg-slate-600"
								title={timer.isPaused ? 'Resume' : 'Pause'}
							>
								<span class="text-lg">{timer.isPaused ? '▶️' : '⏸️'}</span>
							</button>
							<button
								onclick={handleComplete}
								class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-emerald-600 hover:shadow-sm dark:hover:bg-slate-600"
								title="Complete"
							>
								<span class="text-lg">✅</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Up Next (GitHub Issues) -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Up Next</h3>
			{#if upNextIssues().length > 0}
				<span class="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
					{upNextIssues().length}
				</span>
			{/if}
		</div>

		{#if upNextIssues().length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-slate-400 dark:text-slate-500">No open issues</p>
				<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Select a repo in the GitHub tab</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each upNextIssues() as issue (issue.number)}
					<div class="group flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700/50 dark:bg-slate-700/30 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-xs font-medium text-violet-600 dark:text-violet-400">#{issue.number}</span>
								{#if issue.labels.length > 0}
									<span class="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
										{issue.labels[0]}
									</span>
									{/if}
							</div>
							<p class="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{issue.title}</p>
						</div>
						<button
							onclick={() => startFromIssue(issue)}
							class="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white hover:text-violet-600 hover:shadow-sm dark:hover:bg-slate-600"
							title="Start timer"
						>
							<span class="text-lg">▶️</span>
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Work Sessions -->
	<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Sessions</h3>
			{#if recentSessions().length > 0}
				<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
					{recentSessions().length}
				</span>
			{/if}
		</div>

		{#if recentSessions().length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-slate-400 dark:text-slate-500">No completed sessions</p>
				<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Complete a timer to see it here</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each recentSessions() as session (session.id)}
					<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/50 dark:bg-slate-700/30">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<StatusBadge status={session.status} />
								<span class="text-xs text-slate-400 dark:text-slate-500">{formatDate(session.startTime)}</span>
							</div>
							<p class="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{session.task}</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{session.client} / {session.project}</p>
						</div>
						<span class="font-mono text-sm text-slate-700 dark:text-slate-300">
							{formatWidgetDuration(session.durationSeconds)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
