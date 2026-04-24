<script lang="ts">
	import { onMount } from 'svelte';
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
	let owners = $state<string[]>([]);
	let repos = $state<string[]>([]);
	let loadingOwners = $state(false);
	let errorSource = $state<'owners' | 'repos' | 'create' | null>(null);
	let repoRequestSeq = 0;
	let title = $state('');
	let body = $state('');
	let mode = $state<'issue-only' | 'issue-and-project'>('issue-only');
	let projectId = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let warning = $state<string | null>(null);

	async function loadOwners() {
		loadingOwners = true;
		errorSource = null;
		try {
			const response = await fetch('/api/github/options/owners');
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load owners');
			owners = payload.owners ?? [];
			if (!owner && owners.length > 0) owner = owners[0];
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
		try {
			const response = await fetch(`/api/github/options/repos?owner=${encodeURIComponent(nextOwner)}`);
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load repos');
			if (requestId !== repoRequestSeq) return;
			repos = payload.repos ?? [];
			if (!repos.includes(repo)) repo = repos[0] ?? '';
			errorSource = null;
		} catch (e: any) {
			if (requestId !== repoRequestSeq) return;
			errorSource = 'repos';
			error = e?.message ?? 'Failed to load repo options';
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
			const response = await fetch('/api/github/issues/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					owner: owner.trim(),
					repo: repo.trim(),
					title: title.trim(),
					body: body.trim(),
					mode,
					projectId: mode === 'issue-and-project' ? projectId.trim() : undefined
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				errorSource = 'create';
				throw new Error(payload.error ?? 'Failed to create issue');
			}

			success = `Created ${payload.url}`;
			warning = payload.warning ?? null;
			onCreated?.();
			if (!payload.warning) {
				onClose?.();
			}
		} catch (e: any) {
			errorSource ??= 'create';
			error = e?.message ?? 'Failed to create issue';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
		<div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Create GitHub Task</h3>
				<button
					type="button"
					onclick={() => onClose?.()}
					class="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Close
				</button>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div>
					<label for="gh-owner" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Owner</label>
					<input
						id="gh-owner"
						bind:value={owner}
						list="create-owner-options"
						class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						placeholder={loadingOwners ? 'Loading owners...' : 'Select or type owner'}
					/>
					<datalist id="create-owner-options">
						{#each owners as ownerOption}
							<option value={ownerOption}></option>
						{/each}
					</datalist>
				</div>
				<div>
					<label for="gh-repo" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Repo</label>
					<input
						id="gh-repo"
						bind:value={repo}
						list="create-repo-options"
						class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						placeholder={owner ? 'Select or type repo' : 'Select or type owner first'}
					/>
					<datalist id="create-repo-options">
						{#each repos as repoOption}
							<option value={repoOption}></option>
						{/each}
					</datalist>
				</div>
			</div>

			<div class="mt-3">
				<label for="gh-title" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Title</label>
				<input
					id="gh-title"
					bind:value={title}
					class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
				/>
			</div>

			<div class="mt-3">
				<label for="gh-body" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Body</label>
				<textarea
					id="gh-body"
					bind:value={body}
					class="h-24 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
				></textarea>
			</div>

			<div class="mt-3">
				<label for="create-mode" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Mode</label>
				<select
					id="create-mode"
					bind:value={mode}
					class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
				>
					<option value="issue-only">Issue only</option>
					<option value="issue-and-project">Issue + Project</option>
				</select>
			</div>

			{#if mode === 'issue-and-project'}
				<div class="mt-3">
					<label for="project-id" class="mb-1 block text-sm text-slate-700 dark:text-slate-300">Project ID</label>
					<input
						id="project-id"
						bind:value={projectId}
						class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
					/>
				</div>
			{/if}

			{#if error}
				<p class="mt-3 text-sm text-red-600">
					{error}
					{#if errorSource === 'owners' || errorSource === 'repos'}
						<button class="ml-2 underline" type="button" onclick={retryCurrentError}>Retry</button>
					{/if}
				</p>
			{/if}
			{#if success}
				<p class="mt-3 text-sm text-emerald-600">{success}</p>
			{/if}
			{#if warning}
				<p class="mt-3 text-sm text-amber-600">{warning}</p>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button type="button" onclick={() => onClose?.()} class="rounded border px-3 py-2 text-sm">Cancel</button>
				<button
					aria-label="Create"
					type="button"
					onclick={handleCreate}
					disabled={submitting || !owner || !repo || !title.trim()}
					class="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
				>
					{submitting ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}
