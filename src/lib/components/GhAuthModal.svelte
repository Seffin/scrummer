<script lang="ts">
	import { authenticateWithGhCli, type GhAuthStatus } from '$lib/github/gh-auth';

	interface Props {
		onSuccess: () => void;
		onCancel: () => void;
	}

	let { 
		onSuccess = () => {},
		onCancel = () => {}
	}: Props = $props();

	let isLoading = $state(false);
	let authStatus = $state<GhAuthStatus | null>(null);
	let error = $state<string | null>(null);

	async function startGhAuth() {
		isLoading = true;
		error = null;

		try {
			const status = await authenticateWithGhCli();
			authStatus = status;

			if (status.isAuthenticated) {
				console.log('🔐 GitHub CLI authentication successful');
				onSuccess();
			} else {
				error = status.error || 'Authentication failed';
			}
		} catch (err) {
			console.error('🔐 Failed to authenticate with GitHub CLI:', err);
			error = err instanceof Error ? err.message : 'Authentication failed';
		} finally {
			isLoading = false;
		}
	}

	function cancelAuth() {
		onCancel();
	}

	function retryAuth() {
		authStatus = null;
		error = null;
		startGhAuth();
	}
</script>

<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-black">
	<div class="flex items-center justify-between border-b border-white/10 bg-slate-100/50 px-6 py-4 dark:bg-black/20">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl dark:bg-indigo-500/20">
				🔐
			</div>
			<div>
				<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">GitHub Authentication</h2>
				<p class="text-xs text-slate-500 dark:text-slate-400">Authenticate using GitHub CLI</p>
			</div>
		</div>
	</div>

	<div class="p-6 sm:p-8">
		{#if error}
			<div class="mb-6 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
				<div class="flex items-center gap-3">
					<span>⚠️</span>
					{error}
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
				<p class="mt-4 text-sm text-slate-600 dark:text-slate-400">Authenticating with GitHub CLI...</p>
			</div>
		{:else if authStatus && authStatus.isAuthenticated}
			<div class="flex flex-col items-center justify-center py-12">
				<div class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
					<span>✅</span>
					<span class="text-sm font-medium">Authentication successful!</span>
				</div>
			</div>
		{:else if authStatus && !authStatus.hasGhCli}
			<div class="space-y-6">
				<div class="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
					<h3 class="mb-2 font-semibold text-amber-800 dark:text-amber-200">GitHub CLI Required</h3>
					<p class="text-sm text-amber-700 dark:text-amber-300">
						GitHub CLI is not installed. Please install it first:
					</p>
					<div class="mt-3">
						<a 
							href="https://cli.github.com/" 
							target="_blank" 
							rel="noopener noreferrer"
							class="text-sm font-medium text-amber-800 underline hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
						>
							Install GitHub CLI →
						</a>
					</div>
				</div>

				<div class="flex flex-col gap-3">
					<button
						onclick={retryAuth}
						class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					>
						<span>🔄</span>
						Check Again
					</button>
					
					<button
						onclick={cancelAuth}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else if authStatus && !authStatus.isAuthenticated}
			<div class="space-y-6">
				<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
					<h3 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">How to authenticate:</h3>
					<ol class="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
						<li>Open your terminal or command prompt</li>
						<li>Run the command: <code class="rounded bg-slate-200 px-1 dark:bg-slate-700">gh auth login</code></li>
						<li>Follow the prompts to authenticate with GitHub</li>
						<li>Return here and click "Check Authentication"</li>
					</ol>
				</div>

				<div class="flex flex-col gap-3">
					<button
						onclick={retryAuth}
						class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					>
						<span>🔄</span>
						Check Authentication
					</button>
					
					<button
						onclick={cancelAuth}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<div class="space-y-6">
				<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
					<h3 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">GitHub CLI Authentication</h3>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						This app uses GitHub CLI for authentication. If you're already authenticated with GitHub CLI, we can use your existing credentials.
					</p>
				</div>

				<div class="flex flex-col gap-3">
					<button
						onclick={startGhAuth}
						class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					>
						<span>🔐</span>
						Authenticate with GitHub CLI
					</button>
					
					<button
						onclick={cancelAuth}
						class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
