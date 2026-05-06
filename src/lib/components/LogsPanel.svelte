<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import { formatDate, formatTime, formatDuration } from '$lib/utils/timeUtils';

	async function handleDelete(id: string) {
		if (confirm('Delete this log? (Note: Discard is currently handled on server for active timers, sessions are view-only for now)')) {
			// In the new architecture, we'll implement a proper session deletion soon
			// For now, let's keep the UI consistent
			// timerStore.deleteSession(id); 
		}
	}
</script>

<div class="animate-fade-up max-w-5xl mx-auto">
	<div class="mb-6 flex items-center justify-between px-2">
		<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">Work Logs</h2>
		{#if timerStore.sessions.length > 0}
			<p class="text-sm text-slate-500 dark:text-slate-400">
				{timerStore.sessions.length} session{timerStore.sessions.length === 1 ? '' : 's'}
			</p>
		{/if}
	</div>

	{#if timerStore.sessions.length === 0}
		<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-24 text-center dark:border-slate-700/50">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/50">
				<span class="text-xl">📋</span>
			</div>
			<h3 class="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">No logs yet</h3>
			<p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
				Your completed work sessions will appear here. Start a timer to get tracking.
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl dark:bg-slate-900/50">
			<!-- Desktop / Tablet Table -->
			<div class="hidden overflow-x-auto lg:block">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700/50 dark:bg-black/20 dark:text-slate-400">
						<tr>
							<th class="px-6 py-4">User</th>
							<th class="px-6 py-4">Client / Project</th>
							<th class="px-6 py-4">Task</th>
							<th class="px-6 py-4">Status</th>
							<th class="px-6 py-4">Date & Time</th>
							<th class="px-6 py-4 text-right">Duration</th>
							<th class="px-6 py-4"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
						{#each timerStore.sessions as session (session.id)}
							<tr class="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
								<td class="px-6 py-4">
									<div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
										👤 {session.user}
									</div>
								</td>
								<td class="px-6 py-4">
									<p class="font-medium text-slate-800 dark:text-slate-200">{session.client}</p>
									<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{session.project}</p>
								</td>
								<td class="px-6 py-4">
									<p class="font-medium text-slate-700 dark:text-slate-300">{session.task}</p>
								</td>
								<td class="px-6 py-4">
									<StatusBadge status={session.status} />
								</td>
								<td class="px-6 py-4">
									<p class="text-slate-700 dark:text-slate-300">{formatDate(session.startTime)}</p>
									<p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
										{formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Running...'}
									</p>
								</td>
								<td class="px-6 py-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
									{formatDuration(session.durationSeconds)}
								</td>
								<td class="px-6 py-4 text-right">
									<button
										onclick={() => handleDelete(session.id)}
										class="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
										title="Delete log"
									>
										🗑️
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile List -->
			<div class="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50 lg:hidden">
				{#each timerStore.sessions as session (session.id)}
					<div class="flex flex-col p-4">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-400">
									<span class="mr-1 text-slate-500 dark:text-slate-400">👤 {session.user} •</span> {session.client} <span class="font-normal text-slate-400">/</span> {session.project}
								</p>
								<h4 class="mt-1 text-base font-medium text-slate-800 dark:text-slate-200">{session.task}</h4>
							</div>
							<button
								onclick={() => handleDelete(session.id)}
								class="text-xs text-slate-400 transition-colors hover:text-red-500"
							>
								🗑️
							</button>
						</div>

						<div class="mt-3 flex items-center justify-between">
							<StatusBadge status={session.status} />
							<p class="font-mono text-lg font-medium text-slate-800 dark:text-slate-200">
								{formatDuration(session.durationSeconds)}
							</p>
						</div>

						<div class="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
							<span>📅 {formatDate(session.startTime)}</span>
							<span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
							<span>{formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : '...'}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
