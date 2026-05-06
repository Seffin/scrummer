<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { formatDuration } from '$lib/utils/timeUtils';

	let report = $derived(timerStore.getReport());

	// Local UI state for expanding/collapsing nodes
	// We'll store expanded project keys like `${user}-${client}-${project}`
	let expandedProjects = $state<Set<string>>(new Set());

	function toggleProject(user: string, client: string, project: string) {
		const key = `${user}-${client}-${project}`;
		const newSet = new Set(expandedProjects);
		if (newSet.has(key)) {
			newSet.delete(key);
		} else {
			newSet.add(key);
		}
		expandedProjects = newSet;
	}
</script>

<div class="animate-fade-up max-w-4xl mx-auto">
	<div class="mb-6 flex items-center justify-between px-2">
		<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">Summary Report</h2>
	</div>

	{#if report.length === 0}
		<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-24 text-center dark:border-slate-700/50">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/50">
				<span class="text-xl">📊</span>
			</div>
			<h3 class="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">No data available</h3>
			<p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
				Reports are generated automatically once you complete work sessions.
			</p>
		</div>
	{:else}
		<div class="flex flex-col gap-10">
			{#each report as rUser (rUser.user)}
				<div class="flex flex-col gap-4">
					<!-- User Header -->
					<div class="flex items-center gap-3 px-2">
						<span class="text-2xl">👤</span>
						<h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{rUser.user}</h2>
						<span class="ml-auto font-mono text-lg font-bold tracking-tight text-slate-600 dark:text-slate-400">
							{formatDuration(rUser.seconds)}
						</span>
					</div>

					<div class="flex flex-col gap-5">
						{#each rUser.clients as rClient (rClient.client)}
							<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl dark:bg-slate-900/50">
								<!-- Client Header -->
								<div class="flex items-center justify-between border-b border-indigo-100 bg-indigo-50/50 px-5 py-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
											<span class="text-sm font-bold">{rClient.client.charAt(0).toUpperCase()}</span>
										</div>
										<h3 class="text-lg font-bold text-indigo-950 dark:text-indigo-100">{rClient.client}</h3>
									</div>
									<div class="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400">
										{formatDuration(rClient.seconds)}
									</div>
								</div>

								<!-- Projects List -->
								<div class="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
									{#each rClient.projects as rProject (rProject.project)}
										{@const expansionKey = `${rUser.user}-${rClient.client}-${rProject.project}`}
										{@const isExpanded = expandedProjects.has(expansionKey)}

										<div class="flex flex-col">
											<!-- Project Row (Clickable to expand) -->
											<button
												onclick={() => toggleProject(rUser.user, rClient.client, rProject.project)}
									class="flex items-center justify-between px-6 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
								>
									<div class="flex items-center gap-3">
										<span class="text-xs text-slate-400 transition-transform {isExpanded ? 'rotate-90' : ''}">
											▶
										</span>
										<h4 class="font-semibold text-slate-800 dark:text-slate-200">{rProject.project}</h4>
									</div>
									<div class="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
										{formatDuration(rProject.seconds)}
									</div>
								</button>

								<!-- Tasks List (Expanded view) -->
								{#if isExpanded}
									<div class="animate-fade-up border-t border-slate-100 bg-slate-50/30 px-6 py-3 dark:border-slate-800/50 dark:bg-black/10">
										<ul class="flex flex-col space-y-2 pl-6">
											{#each rProject.tasks as rTask (rTask.task)}
												<li class="flex items-center justify-between text-sm">
													<div class="flex items-center gap-2">
														<span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
														<span class="text-slate-600 dark:text-slate-400">{rTask.task}</span>
													</div>
													<span class="font-mono text-xs font-medium text-slate-500 dark:text-slate-500">
														{formatDuration(rTask.seconds)}
													</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
