<script lang="ts">
	import { onMount } from 'svelte';
	import type { GithubIssue } from '$lib/github/types';
	import { timerStore } from '$lib/stores/timer.svelte';
	import { githubStore } from '$lib/stores/github.svelte';
	import { GitHubAuthError, getUserProfile, getUserOrgs, getUserRepos, getRepoIssues, githubGet } from '$lib/github/api';
	import { handleLogout, showLoginPrompt, type LoginState } from '$lib/github/login-flow';
	import { getAuthState } from '$lib/github/auth';
	import GithubIssueCreateModal from './GithubIssueCreateModal.svelte';
	import DeviceAuthModal from './DeviceAuthModal.svelte';
	import { formatDuration } from '$lib/utils/timeUtils';
	import { githubAuthStore } from '$lib/stores/githubAuth.svelte';
	import { authStore } from '$lib/stores/auth.svelte';

	let { issues = [] }: { issues?: GithubIssue[] } = $props();

	// Authentication state (derived from global store)
	const isAuthenticated = $derived(githubAuthStore.isAuthenticated);
	let loginState = $state<LoginState>({ isShowing: false, isLoading: false });
	let authError = $state('');
	let showDeviceAuthModal = $state(false);

	// GitHub data state
	let owner = $state('');
	let repo = $state('');
	let search = $state('');
	let showCreateModal = $state(false);
	let showOwnersDropdown = $state(false);
	let showReposDropdown = $state(false);
	let owners = $state<string[]>([]);
	let repos = $state<string[]>([]);
	let loadingOptions = $state(false);
	let loadingRepos = $state(false);
	let errorSource = $state<'owners' | 'repos' | 'issues' | null>(null);
	let repoRequestSeq = 0;

	const displayedIssues = $derived(issues.length > 0 ? issues : githubStore.filteredIssues);

	// Automatically load data when authenticated
	$effect(() => {
		if (isAuthenticated) {
			console.log('🚀 Authenticated, loading data...');
			loginState = { isShowing: false, isLoading: false };
			authError = '';
			loadOwners();
			loadUserRepos();
		} else {
			loginState = showLoginPrompt();
		}
	});

	async function handleDeviceAuthSuccess() {
		showDeviceAuthModal = false;
		githubAuthStore.refresh();
		await loadOwners();
		await loadUserRepos();
	}

	// Handle logout
	function handleLogoutClick() {
		if (!window.confirm('Are you sure you want to log out of GitHub? You will need to re-authenticate later.')) {
			return;
		}
		console.log('🚪 Logging out...');
		githubAuthStore.logout();
		owners = [];
		repos = [];
		owner = '';
		repo = '';
		githubStore.clearData();
	}

	$effect(() => {
		githubStore.setQuery(search);
	});

	// Monitor authentication state changes
	$effect(() => {
		console.log('🔄 Auth state changed:', { isAuthenticated, loginState, errorSource });
	});
		
	// Force logout if there are authentication errors
	$effect(() => {
		if (errorSource === 'owners' || errorSource === 'repos') {
			console.log('🔄 Authentication error detected, triggering logout');
			githubAuthStore.logout();
		}
	});

	function formatDisplayDate(iso: string | null): string {
		if (!iso) return 'n/a';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'n/a';
		return date.toISOString().slice(0, 10);
	}

	function startFromIssue(issue: GithubIssue) {
		timerStore.startFromGithubIssue(issue);
	}

	async function loadOwners() {
		console.log('📋 Loading owners, authenticated:', isAuthenticated);
		if (!isAuthenticated) {
			console.log('📋 Not authenticated, skipping owners load');
			return;
		}
		
		loadingOptions = true;
		errorSource = null;
		try {
			console.log('📋 Fetching user profile and organizations...');
			const [profile, orgs] = await Promise.all([
				getUserProfile() as any,
				getUserOrgs() as any[]
			]);
			
			const ownerLogins = new Set([profile.login]);
			if (orgs && Array.isArray(orgs)) {
				orgs.forEach(org => ownerLogins.add(org.login));
			}

			// Also try to get options from the local workspace to discover open source/external owners
			try {
				const response = await fetch('/api/github/options/owners');
				if (response.ok) {
					const data = await response.json();
					if (data.owners && Array.isArray(data.owners)) {
						data.owners.forEach((o: string) => ownerLogins.add(o));
					}
				}
			} catch (e) {
				console.log('📋 Local server owners not available', e);
			}

			owners = Array.from(ownerLogins).filter(Boolean);
			console.log('📋 Owners set:', owners);
			errorSource = null;
		} catch (e: any) {
			console.error('📋 Error loading owners:', e);
			if (e instanceof GitHubAuthError || e.message?.includes('401') || e.message?.includes('Unauthorized')) {
				console.log('📋 Authentication error detected, forcing re-authentication');
				githubStore.setError('GitHub authentication failed. Please check your token.');
				// Force re-authentication
				githubAuthStore.logout();
				authError = 'Your GitHub token is invalid or expired. Please authenticate again.';
			} else {
				githubStore.setError(e?.message ?? 'Failed to load owner options');
			}
			errorSource = 'owners';
		} finally {
			loadingOptions = false;
		}
	}

	async function loadUserRepos() {
		if (!isAuthenticated) return;
		
		try {
			const userRepos = (await getUserRepos()) as any[];
			// Extract repo names from GitHub API response
			repos = userRepos.map((r) => r.name || '').filter(Boolean);
			errorSource = null;
		} catch (e: any) {
			if (e instanceof GitHubAuthError || e.message?.includes('401') || e.message?.includes('Unauthorized')) {
				console.log('📋 Authentication error in repos loading, forcing re-authentication');
				githubStore.setError('GitHub authentication failed. Please check your token.');
				// Force re-authentication
				githubAuthStore.logout();
				authError = 'Your GitHub token is invalid or expired. Please authenticate again.';
			} else {
				githubStore.setError(e?.message ?? 'Failed to load repository options');
			}
			errorSource = 'repos';
		}
	}

	async function loadRepos(nextOwner = owner) {
		const requestId = ++repoRequestSeq;
		if (!nextOwner) {
			repos = [];
			repo = '';
			return;
		}
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
			if (!repos.includes(repo)) {
				repo = '';
			}
			errorSource = null;
		} catch (e: any) {
			if (requestId !== repoRequestSeq) return;
			if (e instanceof GitHubAuthError) {
				githubStore.setError('GitHub authentication failed.');
			} else {
				githubStore.setError(e?.message ?? 'Failed to load repo options');
			}
			errorSource = 'repos';
		} finally {
			if (requestId === repoRequestSeq) {
				loadingRepos = false;
			}
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


	async function loadIssues() {
		if (!owner.trim() || !repo.trim()) return;
		errorSource = null;
		githubStore.startLoading();
		try {
			const issues = (await getRepoIssues(owner.trim(), repo.trim())) as any[];
			// Normalize GitHub API issues to app model
			const normalized = issues.map((issue: any) => ({
				number: issue.number,
				title: issue.title,
				state: issue.state?.toUpperCase() || 'OPEN',
				labels: issue.labels?.map((l: any) => (typeof l === 'string' ? l : l.name)) || [],
				assignees: issue.assignees?.map((a: any) => (typeof a === 'string' ? a : a.login)) || [],
				milestone: issue.milestone?.title || null,
				createdAt: issue.created_at || null,
				updatedAt: issue.updated_at || null,
				url: issue.html_url || issue.url || ''
			}));
			githubStore.setIssues(normalized);
		} catch (e: any) {
			if (e instanceof GitHubAuthError) {
				githubStore.setError('GitHub authentication failed. Please check your token.');
			} else {
				githubStore.setError(e?.message ?? 'Failed to load issues');
			}
			errorSource = 'issues';
		} finally {
			githubStore.endLoading();
		}
	}
</script>

<div class="mx-auto max-w-5xl">
	<!-- Authentication Login Modal -->
	{#if loginState.isShowing}
		<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black">
			<div class="flex items-center justify-between border-b border-white/10 bg-slate-100/50 px-6 py-4 dark:bg-black/20">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl dark:bg-indigo-500/20">
						🔐
					</div>
					<div>
						<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">GitHub Authentication</h2>
						<p class="text-xs text-slate-500 dark:text-slate-400">Secure Device Flow Login</p>
					</div>
				</div>
			</div>

			<div class="p-4 sm:p-6 lg:p-8">
				{#if authError}
					<div class="mb-6 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
						<div class="flex items-center gap-3">
							<span>⚠️</span>
							{authError}
						</div>
					</div>
				{/if}

				<div class="space-y-4">
					<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						<button
							class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => (showDeviceAuthModal = true)}
						>
							<span>📱</span>
							Authenticate with GitHub
						</button>
					</div>

					<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
						<h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">How this works:</h3>
						<ol class="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
							<li>Authentication is securely handled via GitHub Device Flow OAuth.</li>
							<li>Your authentication is securely scoped to this specific device.</li>
							<li>You will remain logged in until you explicitly click Logout.</li>
						</ol>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main GitHub Panel (only shown when authenticated) -->
		<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 bg-slate-100/50 px-4 sm:px-6 py-4 dark:bg-black/20">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xl dark:bg-indigo-500/20">
					🐙
				</div>
				<div>
					<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">GitHub Tracking</h2>
					<p class="text-xs text-slate-500 dark:text-slate-400">Search and track issues from your repositories</p>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-2 sm:gap-3">
				<button
					aria-label="Add GitHub Task"
					class="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					onclick={() => (showCreateModal = true)}
				>
					<span>➕</span> Add Task
				</button>
				<button
					aria-label="Logout"
					class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
					onclick={handleLogoutClick}
					title="Logout from GitHub"
				>
					<span>🚪</span> Logout
				</button>
			</div>
		</div>

		<div class="p-4 sm:p-6 lg:p-8">
			<!-- Filters Section -->
			<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
							class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							placeholder={loadingOptions ? 'Loading...' : 'e.g. facebook'}
							disabled={loadingOptions}
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
							class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							placeholder={loadingRepos ? 'Loading repositories...' : (owner ? 'e.g. react' : 'Select owner first')}
							disabled={!owner || loadingRepos}
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
						{@const timer = timerStore.getTimerForIssue(issue.number)}
						<div
							class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-white/5 dark:bg-slate-800/50 dark:hover:border-white/20"
						>
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


								<div class="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:self-center">
									<a
										class="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
										href={issue.url}
										target="_blank"
										rel="noreferrer"
									>
										<span>🔗</span> <span class="hidden sm:inline">Open</span>
									</a>
									{#if !timer}
										<button
											aria-label={`Start #${issue.number}`}
											class="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
											onclick={() => startFromIssue(issue)}
										>
											<span>▶️</span> Start
										</button>
									{:else if timer.running}
										<div class="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
											<span
												class="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
											>
												<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
												{formatDuration(timer.elapsedSeconds)}
											</span>
											<div class="flex items-center gap-2">
												<button
													class="rounded-xl bg-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
													onclick={() => timerStore.pause()}
													title="Pause"
												>
													⏸️
												</button>
												<button
													class="rounded-xl bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500"
													onclick={() => timerStore.complete()}
													title="Complete"
												>
													✅
												</button>
											</div>
										</div>
									{:else}
										<div class="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2">
											<span
												class="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"
											>
												⏸️ {formatDuration(timer.elapsedSeconds)}
											</span>
											<div class="flex items-center gap-2">
												<button
													class="rounded-xl bg-indigo-600 p-2 text-white transition-colors hover:bg-indigo-500"
													onclick={() => timerStore.resume()}
													title="Resume"
												>
													▶️
												</button>
												<button
													class="rounded-xl bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500"
													onclick={() => timerStore.complete()}
													title="Complete"
												>
													✅
												</button>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
		{/if}
	</div>

<GithubIssueCreateModal
	open={showCreateModal}
	onClose={() => (showCreateModal = false)}
	onCreated={async () => {
		await loadIssues();
	}}
/>


{#if showDeviceAuthModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
		<div class="w-full max-w-xl">
			<DeviceAuthModal
				onSuccess={handleDeviceAuthSuccess}
				onCancel={() => {
					showDeviceAuthModal = false;
					loginState = showLoginPrompt();
				}}
			/>
		</div>
	</div>
{/if}

