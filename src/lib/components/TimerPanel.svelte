<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import UserTimeChart from './UserTimeChart.svelte';
	import { formatDuration } from '$lib/utils/timeUtils';

	let clientInput = $state('');
	let projectInput = $state('');
	let taskInput = $state('');

	// Reactive derived list of projects for the autocomplete/datalist based on current client
	let availableProjects = $derived(timerStore.getProjects(clientInput));
	let availableTasks = $derived(timerStore.getTasks(clientInput, projectInput));

	let showNewTaskForm = $state(false);

	async function handleAddPending() {
		if (!clientInput.trim() || !projectInput.trim() || !taskInput.trim()) return;
		await timerStore.start(clientInput, projectInput, taskInput);
		clientInput = '';
		projectInput = '';
		taskInput = '';
		showNewTaskForm = false;
	}

	async function handleStart() {
		const task = taskInput.trim();
		if (!task) return;
		
		const client = clientInput.trim() || 'General';
		const project = projectInput.trim() || 'General';
		
		await timerStore.start(client, project, task);
		clientInput = '';
		projectInput = '';
		taskInput = '';
		showNewTaskForm = false;
	}

	function handlePauseResume(timer: any) {
		if (timer.status === 'active' || timer.status === 'In Progress') {
			timerStore.pause();
		} else {
			timerStore.resume();
		}
	}

	function handleComplete() {
		timerStore.complete();
		clientInput = '';
		projectInput = '';
		taskInput = '';
	}

	function handleDiscard() {
		timerStore.discard();
		clientInput = '';
		projectInput = '';
		taskInput = '';
	}

	// Timezone display
	const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
	let currentTime = $state(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));

	$effect(() => {
		const id = setInterval(() => {
			currentTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		}, 60000); // update every minute
		return () => clearInterval(id);
	});
</script>

<div class="animate-fade-up mx-auto max-w-2xl">
	<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-slate-900/50">
		<!-- Header / Time Zone -->
		<div class="flex items-center justify-between border-b border-white/10 bg-slate-100/50 px-6 py-4 dark:bg-black/20">
			<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Timer</h2>
			<div class="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
				<span>🌍</span>
				<span>{tzName}</span>
				<span class="mx-1 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
				<span>{currentTime}</span>
			</div>
		</div>

		{#if timerStore.activeTimer}
			{@const activeTimer = timerStore.activeTimer}
			<div class="border-b border-slate-200/50 dark:border-white/10 last:border-0">
				<UserTimeChart user={authStore.user?.username || 'User'} />
				<div class="p-6 sm:p-8">
					<div class="flex flex-col items-center">
						<StatusBadge status={activeTimer.status} />

						<div class="mt-8 text-center">
							<p class="text-sm font-medium text-slate-500 dark:text-slate-400">
								{activeTimer.client} <span class="mx-1 text-slate-300 dark:text-slate-600">/</span> {activeTimer.project}
							</p>
							<h3 class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
								{activeTimer.task}
							</h3>
						</div>

						<div class="font-timer mt-10 text-6xl md:text-7xl font-light tracking-tight text-indigo-600 dark:text-indigo-400 {activeTimer.status === 'active' || activeTimer.status === 'In Progress' ? 'animate-pulse-ring rounded-full' : ''}">
							{formatDuration(timerStore.elapsedSeconds)}
						</div>

						<div class="mt-12 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
							<button
								type="button"
								onclick={() => handlePauseResume(activeTimer)}
								class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-slate-300 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:ring-slate-600"
							>
								{#if activeTimer.status === 'active' || activeTimer.status === 'In Progress'}
									⏸ Pause
								{:else}
									▶️ Resume
								{/if}
							</button>
							<button
								type="button"
								onclick={handleComplete}
								class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-medium text-white shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/40 active:translate-y-0"
							>
								✅ Complete & Save
							</button>
						</div>

						<button
							type="button"
							onclick={handleDiscard}
							class="mt-6 text-sm font-medium text-slate-400 underline decoration-slate-400/30 underline-offset-4 transition-colors hover:text-red-500 hover:decoration-red-500/50 dark:text-slate-500"
						>
							Discard session
						</button>
					</div>
				</div>
			</div>

			{#if !showNewTaskForm}
				<div class="flex justify-center border-t border-slate-200/50 py-6 dark:border-white/10">
					<button
						type="button"
						onclick={() => (showNewTaskForm = true)}
						class="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
					>
						➕ Add Another Task
					</button>
				</div>
			{/if}
		{/if}

		<div class="p-6 sm:p-8 {timerStore.activeTimer ? 'pt-0 sm:pt-0' : ''}">
			{#if timerStore.conflictError}
				<div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
					<div class="flex gap-3">
						<div class="text-xl">⚠️</div>
						<div class="flex-1">
							<p class="text-sm font-semibold text-red-900 dark:text-red-200">{timerStore.conflictError}</p>
							<p class="mt-1 text-xs text-red-800 dark:text-red-300">Stop the running timer in the other tab before starting a new one.</p>
							<button
								onclick={() => timerStore.complete(timerStore.conflictingSession?.id)}
								class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
							>
								Force Stop Active Timer
							</button>
						</div>
					</div>
				</div>
			{/if}
			{#if !timerStore.activeTimer || showNewTaskForm}
				<div class={timerStore.activeTimer ? "animate-fade-up border-t border-slate-200/50 pt-8 dark:border-white/10" : ""}>
					{#if timerStore.activeTimer}
						<div class="mb-5 flex items-center justify-between px-2">
							<h3 class="font-semibold text-slate-800 dark:text-slate-200">Start or Queue a Task</h3>
							<button
								onclick={() => (showNewTaskForm = false)}
								class="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
							>
								Cancel
							</button>
						</div>
					{/if}

					<!-- Input Form View -->
					<div class="flex flex-col gap-5">
					<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<!-- Client -->
						<div class="flex flex-col gap-1.5">
							<label for="client" class="text-sm font-medium text-slate-700 dark:text-slate-300">Client</label>
							<input
								id="client"
								type="text"
								list="clients-list"
								bind:value={clientInput}
								placeholder="e.g. Acme Corp"
								class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
							<datalist id="clients-list">
								{#each timerStore.clients as client}
									<option value={client}></option>
								{/each}
							</datalist>
						</div>

						<!-- Project -->
						<div class="flex flex-col gap-1.5">
							<label for="project" class="text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
							<input
								id="project"
								type="text"
								list="projects-list"
								bind:value={projectInput}
								placeholder="e.g. Website Redesign"
								class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
							<datalist id="projects-list">
								{#each availableProjects as project}
									<option value={project}></option>
								{/each}
							</datalist>
						</div>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="task" class="text-sm font-medium text-slate-700 dark:text-slate-300">Task Name</label>
						<input
							id="task"
							type="text"
							list="tasks-list"
							bind:value={taskInput}
							placeholder="What are you working on?"
							class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							onkeydown={(e) => {
								if (e.key === 'Enter') { e.preventDefault(); handleStart(); }
							}}
						/>
						<datalist id="tasks-list">
							{#each availableTasks as taskOption}
								<option value={taskOption}></option>
							{/each}
						</datalist>
					</div>

					<div class="mt-4 flex w-full flex-col gap-3 sm:flex-row">
						<button
							type="button"
							onclick={handleStart}
							disabled={!taskInput.trim()}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
						>
							▶️ Start Timer
						</button>
					</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Queued Tasks Section -->
		{#if timerStore.pausedTimers.length > 0}
			<div class="border-t border-slate-200/50 bg-slate-100/30 dark:border-white/5 dark:bg-black/10">
				<h3 class="px-6 sm:px-8 pt-5 pb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Queued Tasks</h3>
				<div class="flex flex-col gap-3 px-6 sm:px-8 py-3 pb-6">
					{#each timerStore.pausedTimers as taskItem (taskItem.id)}
						<div class="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/50 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-white/5 dark:bg-slate-800/80 dark:hover:border-white/10 sm:flex-row sm:items-center">
							<div class="flex flex-col">
								<div class="text-xs font-medium text-slate-500 dark:text-slate-400">
									{taskItem.client} <span class="mx-1 text-slate-300 dark:text-slate-600">/</span> {taskItem.project}
								</div>
								<div class="mt-0.5 flex items-center gap-2">
									<span class="text-sm font-semibold text-slate-800 dark:text-slate-100">{taskItem.task}</span>
									<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Paused</span>
								</div>
							</div>
							<div class="flex items-center justify-between gap-4 sm:justify-end">
								<div class="font-timer text-lg font-medium tracking-tight text-indigo-600 dark:text-indigo-400">
									{formatDuration(taskItem.durationSeconds)}
								</div>
								<div class="flex gap-2">
									<button
										onclick={() => timerStore.resume(taskItem.id)}
										class="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
									>
										<span>▶️</span> Resume
									</button>
									<button
										onclick={() => timerStore.complete(taskItem.id)}
										class="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
										title="Complete & Save"
									>
										<span>✅</span> Done
									</button>
									<button
										onclick={() => timerStore.discard(taskItem.id)}
										class="flex items-center justify-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
										title="Discard Session"
									>
										🗑️
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
