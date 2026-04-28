<script lang="ts">
	import { deviceFlowService, type DeviceFlowState } from '$lib/github/device-flow';

	let { 
		onSuccess = () => {},
		onCancel = () => {}
	}: {
		onSuccess?: () => void;
		onCancel?: () => void;
	} = $props();

	let deviceState: DeviceFlowState | null = $state(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Subscribe to device flow state changes
	deviceFlowService.onStateChangeSubscribe((state) => {
		deviceState = state;
		
		if (state.status === 'authorized') {
			console.log('🔐 Device flow authorization successful');
			onSuccess();
		} else if (state.status === 'expired') {
			error = 'The device code has expired. Please try again.';
		} else if (state.status === 'error') {
			error = state.error || 'An error occurred during authentication.';
		}
	});

	async function startDeviceFlow() {
		isLoading = true;
		error = null;

		try {
			const state = await deviceFlowService.initiateDeviceFlow();
			deviceState = state;
			
			// Start polling for authorization
			deviceFlowService.startPolling();
		} catch (err) {
			console.error('🔐 Failed to start device flow:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to start device flow';
			
			error = errorMessage;
		} finally {
			isLoading = false;
		}
	}

	function cancelDeviceFlow() {
		deviceFlowService.stopPolling();
		deviceFlowService.reset();
		onCancel();
	}

	function retryDeviceFlow() {
		deviceFlowService.reset();
		error = null;
		startDeviceFlow();
	}

	function copyUserCode() {
		if (deviceState?.userCode) {
			navigator.clipboard.writeText(deviceState.userCode).then(() => {
				// Show brief success feedback
				const button = document.getElementById('copy-code-btn');
				if (button) {
					const originalText = button.textContent;
					button.textContent = '✅ Copied!';
					setTimeout(() => {
						button.textContent = originalText;
					}, 2000);
				}
			}).catch(err => {
				console.error('🔐 Failed to copy code:', err);
			});
		}
	}

	function openVerificationUrl() {
		if (deviceState?.verificationUrl) {
			window.open(deviceState.verificationUrl, '_blank');
		}
	}

	// Auto-start device flow when component mounts
	$effect(() => {
		startDeviceFlow();
		
		// Cleanup on unmount
		return () => {
			deviceFlowService.cleanup();
		};
	});

	// Format time remaining
	function getTimeRemaining(): string {
		if (!deviceState) return '';
		
		const remaining = Math.max(0, deviceState.expiresAt - Date.now());
		const minutes = Math.floor(remaining / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	// Check if code is expiring soon (less than 2 minutes)
	function isExpiringSoon(): boolean {
		if (!deviceState) return false;
		return (deviceState.expiresAt - Date.now()) < 120000; // 2 minutes
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
				<p class="text-xs text-slate-500 dark:text-slate-400">Authorize with a simple device code</p>
			</div>
		</div>
		<button
			onclick={cancelDeviceFlow}
			class="rounded-lg p-2 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-700/50 dark:hover:text-slate-300"
			title="Cancel"
		>
			✕
		</button>
	</div>

	<div class="p-6 sm:p-8">
		{#if error}
			<div class="mb-6 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
				<div class="flex items-center gap-3">
					<span>⚠️</span>
					<div>
						<p>{error}</p>
						<button
							onclick={retryDeviceFlow}
							class="mt-2 text-sm font-medium underline hover:no-underline"
						>
							Try Again
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
				<p class="mt-4 text-sm text-slate-600 dark:text-slate-400">Initializing device flow...</p>
			</div>
		{:else if deviceState}
			<div class="space-y-6">
				<!-- Device Code Display -->
				<div class="text-center">
					<p class="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">
						Enter this code on GitHub:
					</p>
					<div class="mx-auto inline-flex items-center gap-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-6 py-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
						<span class="text-3xl font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
							{deviceState.userCode}
						</span>
						<button
							id="copy-code-btn"
							onclick={copyUserCode}
							class="rounded-lg p-2 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
							title="Copy code"
						>
							📋
						</button>
					</div>
				</div>

				<!-- Instructions -->
				<div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
					<h3 class="mb-3 font-semibold text-slate-800 dark:text-slate-100">How to authorize:</h3>
					<ol class="space-y-2 text-sm text-slate-600 dark:text-slate-400">
						<li class="flex items-start gap-2">
							<span class="mt-1 shrink-0">1️⃣</span>
							<span>Click the button below to open GitHub in a new tab</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="mt-1 shrink-0">2️⃣</span>
							<span>Enter the code: <strong>{deviceState.userCode}</strong></span>
						</li>
						<li class="flex items-start gap-2">
							<span class="mt-1 shrink-0">3️⃣</span>
							<span>Authorize WorkTrack to access your repositories</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="mt-1 shrink-0">4️⃣</span>
							<span>Return here - we'll automatically detect the authorization</span>
						</li>
					</ol>
				</div>

				<!-- Status -->
				<div class="text-center">
					{#if deviceState.isPolling}
						<div class="flex items-center justify-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
							<span class="text-sm text-slate-600 dark:text-slate-400">
								Waiting for authorization...
							</span>
						</div>
						<p class="mt-1 text-xs text-slate-500 dark:text-slate-500">
							Code expires in {getTimeRemaining()}
							{#if isExpiringSoon()}
								<span class="text-amber-600 dark:text-amber-400"> (expiring soon!)</span>
							{/if}
						</p>
					{:else if deviceState.status === 'authorized'}
						<div class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
							<span>✅</span>
							<span class="text-sm font-medium">Authorization successful!</span>
						</div>
					{:else}
						<p class="text-sm text-slate-600 dark:text-slate-400">
							Ready to start polling for authorization
						</p>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex flex-col gap-3">
					<button
						onclick={openVerificationUrl}
						class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0"
					>
						<span>🔗</span>
						Open GitHub to Authorize
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
