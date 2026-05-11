<script lang="ts">
	import { onMount } from 'svelte';
	import { getUserProfile, getUserOrgs, githubGet, githubPost } from '$lib/github/api';
	let {
		open = false,
		onClose,
		onCreated
	}: {
		open?: boolean;
		onClose?: () => void;
		onCreated?: () => void;
	} = $props();

	let owner = $state('');
	let repo = $state('');
	let showOwnersDropdown = $state(false);
	let showReposDropdown = $state(false);
	let owners = $state<string[]>([]);
	let repos = $state<string[]>([]);
	let loadingOwners = $state(false);
	let loadingRepos = $state(false);
	let errorSource = $state<'owners' | 'repos' | 'create' | null>(null);
	let repoRequestSeq = 0;
	let title = $state('');
	let body = $state('');
	let mode = $state<'issue-only' | 'issue-and-project'>('issue-only');
	let projectId = $state('');
	let projects = $state<Array<{ number: number; title: string; url: string }>>([]);
	let loadingProjects = $state(false);
	let showProjectsDropdown = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let warning = $state<string | null>(null);
	const isRepoSelectionReady = $derived(!!owner.trim() && !loadingRepos && repos.length > 0);

	async function loadOwners() {
		loadingOwners = true;
		errorSource = null;
		try {
			const [profile, orgs] = await Promise.all([
				getUserProfile() as any,
				getUserOrgs() as any[]
			]);
			
			const ownerLogins = new Set([profile.login]);
			if (orgs && Array.isArray(orgs)) {
				orgs.forEach(org => ownerLogins.add(org.login));
			}

			// Also try to get options from the local workspace
			try {
				const response = await fetch('/api/github/options/owners');
				if (response.ok) {
					const data = await response.json();
					if (data.owners && Array.isArray(data.owners)) {
						data.owners.forEach((o: string) => ownerLogins.add(o));
					}
				}
			} catch (e) {
				console.log('Local server owners not available', e);
			}

			owners = Array.from(ownerLogins).filter(Boolean);
		} catch (e: any) {
			errorSource = 'owners';
			error = e?.message ?? 'Failed to load owner options';
		} finally {
			loadingOwners = false;
		}
	}

	async function loadRepos(nextOwner = owner) {
		const requestId = ++repoRequestSeq;
		if (!nextOwner) {
			repos = [];
			repo = '';
			return;
		}
		// Disable repo selection until options load for the selected owner.
		repos = [];
		repo = '';
		showReposDropdown = false;
		loadingRepos = true;
		try {
			let repoList = [];
			try {
				repoList = await githubGet(`/users/${encodeURIComponent(nextOwner)}/repos?per_page=100`) as any[];
			} catch {
				repoList = await githubGet(`/orgs/${encodeURIComponent(nextOwner)}/repos?per_page=100`) as any[];
			}
			if (requestId !== repoRequestSeq) return;
			repos = repoList.map((item: any) => item.name || item).filter(Boolean);
			errorSource = null;
		} catch (e: any) {
			if (requestId !== repoRequestSeq) return;
			errorSource = 'repos';
			error = e?.message ?? 'Failed to load repo options';
		} finally {
			if (requestId === repoRequestSeq) {
				loadingRepos = false;
			}
		}
	}

	async function loadProjects(nextOwner = owner) {
		if (!nextOwner || mode !== 'issue-and-project') {
			projects = [];
			return;
		}
		loadingProjects = true;
		try {
			const response = await fetch(`/api/github/options/projects?owner=${encodeURIComponent(nextOwner)}`);
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load projects');
			projects = payload.projects ?? [];
		} catch (e: any) {
			console.error('Failed to load projects:', e);
		} finally {
			loadingProjects = false;
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
	}

	onMount(() => {
		void loadOwners();
	});

	$effect(() => {
		if (open) {
			void loadRepos(owner);
			void loadProjects(owner);
		}
	});

	async function handleCreate() {
		if (!owner.trim() || !repo.trim() || !title.trim()) return;
		submitting = true;
		error = null;
		success = null;
		warning = null;
		errorSource = null;
		try {
			const issuePayload: any = {
				title: title.trim()
			};
			
			if (body.trim()) {
				issuePayload.body = body.trim();
			}
			
			const createdIssue = await githubPost(`/repos/${owner.trim()}/${repo.trim()}/issues`, issuePayload) as any;
			
			success = `Created Issue #${createdIssue.number} successfully! You can find it at ${createdIssue.html_url}`;
			
			if (mode === 'issue-and-project' && projectId) {
				warning = "Note: Project assignment requires GitHub CLI or GraphQL API and isn't fully supported via REST. Issue was created but might not be on the project board.";
			}
			
			onCreated?.();
			// We intentionally do not call onClose() here so the user can see the success message.
		} catch (e: any) {
			errorSource ??= 'create';
			error = e?.message ?? 'Failed to create issue';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all" role="dialog" aria-modal="true">
		<div class="w-full max-w-xl animate-fade-up overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:bg-black">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-black/20">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl dark:bg-indigo-500/20">
						📝
					</div>
					<div>
						<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Create GitHub Task</h3>
						<p class="text-xs text-slate-500 dark:text-slate-400">Open a new issue on GitHub</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => onClose?.()}
					class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
				>
					<span class="text-xl">✕</span>
				</button>
			</div>

			<div class="p-6">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5 relative">
						<label for="gh-owner" class="text-xs font-medium text-slate-500 dark:text-slate-400">Owner / Organization</label>
						<div class="relative">
							<input
								id="gh-owner"
								bind:value={owner}
								onfocus={() => {
									if (owners.length > 0) showOwnersDropdown = true;
								}}
								onblur={() => setTimeout(() => (showOwnersDropdown = false), 200)}
								class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
								placeholder={loadingOwners ? 'Loading...' : 'Select owner'}
							/>
							{#if showOwnersDropdown && owners.length > 0}
								{@const filteredOwners = owners.filter(o => o.toLowerCase().includes(owner.toLowerCase()))}
								{#if filteredOwners.length > 0}
									<div class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
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
					</div>
					<div class="flex flex-col gap-1.5 relative">
						<label for="gh-repo" class="text-xs font-medium text-slate-500 dark:text-slate-400">Repository</label>
						<div class="relative">
							<input
								id="gh-repo"
								bind:value={repo}
								onfocus={() => {
									if (repos.length > 0) showReposDropdown = true;
								}}
								onblur={() => setTimeout(() => (showReposDropdown = false), 200)}
								class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
								placeholder={loadingRepos ? 'Loading repositories...' : (!owner ? 'Select owner first' : repos.length === 0 ? 'No repositories found' : 'e.g. react')}
								disabled={!isRepoSelectionReady}
							/>
							{#if showReposDropdown && repos.length > 0}
								{@const filteredRepos = repos.filter(r => r.toLowerCase().includes(repo.toLowerCase()))}
								{#if filteredRepos.length > 0}
									<div class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
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
				</div>


				<div class="mt-4 flex flex-col gap-1.5">
					<label for="gh-title" class="text-xs font-medium text-slate-500 dark:text-slate-400">Title</label>
					<input
						id="gh-title"
						bind:value={title}
						placeholder="What needs to be done?"
						class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
					/>
				</div>

				<div class="mt-4 flex flex-col gap-1.5">
					<label for="gh-body" class="text-xs font-medium text-slate-500 dark:text-slate-400">Description (Optional)</label>
					<textarea
						id="gh-body"
						bind:value={body}
						placeholder="Add more details..."
						class="h-28 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
					></textarea>
				</div>

				<div class="mt-4 flex flex-col gap-1.5">
					<label for="create-mode" class="text-xs font-medium text-slate-500 dark:text-slate-400">Creation Mode</label>
					<select
						id="create-mode"
						bind:value={mode}
						class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
					>
						<option value="issue-only">GitHub Issue Only</option>
						<option value="issue-and-project">Issue + Project Board</option>
					</select>
				</div>

				{#if mode === 'issue-and-project'}
					<div class="mt-4 animate-fade-down flex flex-col gap-1.5 relative">
						<label for="project-id" class="text-xs font-medium text-slate-500 dark:text-slate-400">Project Selection</label>
						<div class="relative">
							<input
								id="project-id"
								bind:value={projectId}
								onfocus={() => {
									if (projects.length > 0) showProjectsDropdown = true;
								}}
								onblur={() => setTimeout(() => (showProjectsDropdown = false), 200)}
								placeholder={loadingProjects ? 'Loading projects...' : 'Select or type project number'}
								class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
							
							{#if projects.length > 0}
								{@const selectedProject = projects.find(p => String(p.number) === projectId.trim())}
								{#if selectedProject}
									<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
										<span>✓</span> {selectedProject.title}
									</div>
								{/if}
								
								{#if showProjectsDropdown}
									{@const filteredProjects = projects.filter(p => 
										p.title.toLowerCase().includes(projectId.toLowerCase()) || 
										String(p.number).includes(projectId)
									)}
									{#if filteredProjects.length > 0}
										<div class="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
											{#each filteredProjects as project}
												<button
													type="button"
													class="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/20 dark:text-slate-200 flex items-center justify-between"
													onclick={() => {
														projectId = String(project.number);
														showProjectsDropdown = false;
													}}
												>
													<span class="font-medium">{project.title}</span>
													<span class="text-xs text-slate-400">#{project.number}</span>
												</button>
											{/each}
										</div>
									{/if}
								{/if}
							{/if}
						</div>
						{#if !loadingProjects && projects.length === 0 && owner}
							<p class="text-[10px] text-amber-600 dark:text-amber-400">No ProjectV2 boards found for this owner.</p>
						{/if}
					</div>
				{/if}

				{#if error}
					<div class="mt-4 flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
						<div class="flex items-center gap-2">
							<span>⚠️</span>
							{error}
						</div>
						{#if errorSource === 'owners' || errorSource === 'repos'}
							<button class="font-bold underline underline-offset-2" type="button" onclick={retryCurrentError}>Retry</button>
						{/if}
					</div>
				{/if}

				{#if success}
					<div class="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
						<span>✅</span>
						{success}
					</div>
				{/if}

				{#if warning}
					<div class="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
						<span>💡</span>
						{warning}
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-black/20">
				{#if success}
					<button
						type="button"
						onclick={() => onClose?.()}
						class="rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					>
						Done
					</button>
				{:else}
					<button
						type="button"
						onclick={() => onClose?.()}
						class="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
					>
						Cancel
					</button>
					<button
						aria-label="Create"
						type="button"
						onclick={handleCreate}
						disabled={submitting || !isRepoSelectionReady || !repo || !title.trim()}
						class="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
					>
						{#if submitting}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							Creating...
						{:else}
							Create Issue
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

