<script lang="ts">
	import { onMount } from 'svelte';
	import type { GithubIssue } from '$lib/github/types';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { githubStore } from '$lib/stores/github.svelte';
	import GithubIssueCreateModal from './GithubIssueCreateModal.svelte';

	let { issues = [] }: { issues?: GithubIssue[] } = $props();

	let owner = $state('');
	let repo = $state('');
	let search = $state('');
	let showCreateModal = $state(false);
	let showOwnersDropdown = $state(false);
	let showReposDropdown = $state(false);
	let owners = $state<string[]>([]);
	let repos = $state<string[]>([]);
	let loadingOptions = $state(false);
	let errorSource = $state<'owners' | 'repos' | 'issues' | null>(null);
	let repoRequestSeq = 0;

	const displayedIssues = $derived(issues.length > 0 ? issues : githubStore.filteredIssues);

	$effect(() => {
		githubStore.setQuery(search);
	});

	function formatDisplayDate(iso: string | null): string {
		if (!iso) return 'n/a';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'n/a';
		return date.toISOString().slice(0, 10);
	}

	function startFromIssue(issue: GithubIssue) {
		tracker.startTimerFromGithubIssue(issue, tracker.state.currentUser);
	}

	async function loadOwners() {
		loadingOptions = true;
		errorSource = null;
		try {
			const response = await fetch('/api/github/options/owners');
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load owners');
			owners = payload.owners ?? [];
		} catch (e: any) {
			errorSource = 'owners';
			githubStore.setError(e?.message ?? 'Failed to load owner options');
		} finally {
			loadingOptions = false;
		}
	}

	async function loadRepos(nextOwner = owner) {
		const requestId = ++repoRequestSeq;
		if (!nextOwner) {
			repos = [];
			repo = '';
			return;
		}
		try {
			const response = await fetch(`/api/github/options/repos?owner=${encodeURIComponent(nextOwner)}`);
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load repos');
			if (requestId !== repoRequestSeq) return;
			repos = payload.repos ?? [];
			errorSource = null;
		} catch (e: any) {
			if (requestId !== repoRequestSeq) return;
			errorSource = 'repos';
			githubStore.setError(e?.message ?? 'Failed to load repo options');
		}
	}

	async function retryCurrentError() {
		if (errorSource === 'owners') {
			await loadOwners();
			return;
		}
		if (errorSource === 'repos') {
			await loadRepos(owner);
			return;
		}
		await loadIssues();
	}

	$effect(() => {
		void loadRepos(owner);
	});

	onMount(() => {
		void loadOwners();
	});

	async function loadIssues() {
		if (!owner.trim() || !repo.trim()) return;
		errorSource = null;
		githubStore.startLoading();
		try {
			const response = await fetch(`/api/github/issues?owner=${encodeURIComponent(owner.trim())}&repo=${encodeURIComponent(repo.trim())}`);
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load issues');
			githubStore.setIssues(payload.issues ?? []);
		} catch (e: any) {
			errorSource = 'issues';
			githubStore.setError(e?.message ?? 'Failed to load issues');
		} finally {
			githubStore.endLoading();
		}
	}
</script>

<div class="mx-auto max-w-5xl">
	<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-white/10 bg-slate-100/50 px-6 py-4 dark:bg-black/20">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl dark:bg-indigo-500/20">
					🐙
				</div>
				<div>
					<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">GitHub Tracking</h2>
					<p class="text-xs text-slate-500 dark:text-slate-400">Search and track issues from your repositories</p>
				</div>
			</div>
			<button
				aria-label="Add GitHub Task"
				class="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
				onclick={() => (showCreateModal = true)}
			>
				<span>➕</span> Add GitHub Task
			</button>
		</div>

		<div class="p-6 sm:p-8">
			<!-- Filters Section -->
			<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
				<!-- Owner Selection -->
				<div class="relative flex flex-col gap-1.5">
					<label for="gh-owner-input" class="text-xs font-medium text-slate-500 dark:text-slate-400">Owner / Organization</label>
					<div class="relative">
						<input
							id="gh-owner-input"
							aria-label="Owner"
							bind:value={owner}
							onfocus={() => {
								if (owners.length > 0) showOwnersDropdown = true;
							}}
							onblur={() => setTimeout(() => (showOwnersDropdown = false), 200)}
							class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							placeholder={loadingOptions ? 'Loading...' : 'e.g. facebook'}
						/>
						{#if showOwnersDropdown && owners.length > 0}
							{@const filteredOwners = owners.filter(o => o.toLowerCase().includes(owner.toLowerCase()))}
							{#if filteredOwners.length > 0}
								<div class="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
									{#each filteredOwners as ownerOption}
										<button
											type="button"
											class="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:text-slate-200"
											onclick={() => {
												owner = ownerOption;
												showOwnersDropdown = false;
											}}
										>
											{ownerOption}
										</button>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
					{#if owners.length === 0 && !loadingOptions}
						<p class="text-[10px] text-amber-600 dark:text-amber-400">
							No owners found. Try <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">gh auth login</code>.
						</p>
					{/if}
				</div>

				<!-- Repo Selection -->
				<div class="relative flex flex-col gap-1.5">
					<label for="gh-repo-input" class="text-xs font-medium text-slate-500 dark:text-slate-400">Repository</label>
					<div class="relative">
						<input
							id="gh-repo-input"
							aria-label="Repo"
							bind:value={repo}
							onfocus={() => {
								if (repos.length > 0) showReposDropdown = true;
							}}
							onblur={() => setTimeout(() => (showReposDropdown = false), 200)}
							class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							placeholder={owner ? 'e.g. react' : 'Select owner first'}
						/>
						{#if showReposDropdown && repos.length > 0}
							{@const filteredRepos = repos.filter(r => r.toLowerCase().includes(repo.toLowerCase()))}
							{#if filteredRepos.length > 0}
								<div class="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
									{#each filteredRepos as repoOption}
										<button
											type="button"
											class="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:text-slate-200"
											onclick={() => {
												repo = repoOption;
												showReposDropdown = false;
											}}
										>
											{repoOption}
										</button>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				</div>



				<div class="flex flex-col gap-1.5">
					<label for="gh-search-input" class="text-xs font-medium text-slate-500 dark:text-slate-400">Search Title/Labels</label>
					<input
						id="gh-search-input"
						class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
						placeholder="Search locally..."
						bind:value={search}
					/>
				</div>

				<div class="flex items-end">
					<button
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
						onclick={loadIssues}
						disabled={!owner.trim() || !repo.trim() || githubStore.loading}
					>
						{#if githubStore.loading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
							Loading...
						{:else}
							<span>🔍</span> Load Issues
						{/if}
					</button>
				</div>
			</div>

			{#if githubStore.error}
				<div class="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
					<div class="flex items-center gap-3">
						<span>⚠️</span>
						{githubStore.error}
					</div>
					<button class="font-semibold underline underline-offset-4 hover:text-red-800 dark:hover:text-red-200" onclick={retryCurrentError}>
						Retry
					</button>
				</div>
			{/if}

			<!-- Issues List -->
			<div class="space-y-4">
				{#if displayedIssues.length === 0}
					<div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 dark:border-slate-800">
						<div class="mb-4 text-4xl">📥</div>
						<p class="text-sm font-medium text-slate-500 dark:text-slate-400">
							{owner && repo ? 'No issues found for this repository.' : 'Enter owner and repo to load issues.'}
						</p>
					</div>
				{:else}
					{#each displayedIssues as issue (issue.number)}
						<div class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-white/5 dark:bg-slate-800/50 dark:hover:border-white/20">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">#{issue.number}</span>
										<h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
											{issue.title}
										</h3>
									</div>
									
									<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
										<div class="flex items-center gap-1">
											<span class="h-1.5 w-1.5 rounded-full {issue.state === 'OPEN' ? 'bg-emerald-500' : 'bg-red-500'}"></span>
											{issue.state}
										</div>
										<div class="flex items-center gap-1">
											<span>👤</span>
											{issue.assignees.length ? issue.assignees.join(', ') : 'Unassigned'}
										</div>
										{#if issue.milestone}
											<div class="flex items-center gap-1">
												<span>🎯</span>
												{issue.milestone}
											</div>
										{/if}
										<div class="flex items-center gap-1">
											<span>📅</span>
											{formatDisplayDate(issue.createdAt)}
										</div>
									</div>

									{#if issue.labels.length > 0}
										<div class="mt-3 flex flex-wrap gap-1.5">
											{#each issue.labels as label}
												<span class="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
													{label}
												</span>
											{/each}
										</div>
									{/if}
								</div>

								<div class="flex items-center gap-2 sm:self-center">
									<a
										class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
										href={issue.url}
										target="_blank"
										rel="noreferrer"
									>
										<span>🔗</span> Open
									</a>
									<button
										aria-label={`Start #${issue.number}`}
										class="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
										onclick={() => startFromIssue(issue)}
									>
										<span>▶️</span> Start
									</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<GithubIssueCreateModal
	open={showCreateModal}
	onClose={() => (showCreateModal = false)}
	onCreated={async () => {
		await loadIssues();
	}}
/>

