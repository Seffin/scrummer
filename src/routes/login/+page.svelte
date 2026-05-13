<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { deviceFlowService } from '$lib/github/device-flow';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let email = $state('');
	let password = $state('');
	let username = $state('');
	let isRegister = $state(false);
	let showPassword = $state(false);
	let backendOnline = $state<boolean | null>(null);
	let error = $state<string | null>(null);
	let deviceFlow = $state(false);
	let deviceCode = $state('');
	let verificationUrl = $state('');
	let loading = $state(false);

	onMount(async () => {
		if (authStore.isAuthenticated) {
			goto('/');
		}
		
		// Setup device flow status listener
		deviceFlowService.onStatusChange = (status: string, tokenData?: any) => {
			console.log('[Login] OAuth status:', status);
			if (status === 'authorized' && tokenData) {
				// Token received - exchange for user and login
				exchangeTokenForUser(tokenData.access_token);
			} else if (status === 'error' || status === 'expired_token' || status === 'authorization_declined') {
				error = 'GitHub authorization failed or was declined.';
				loading = false;
			}
		};
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		let success = false;
		if (isRegister) {
			success = await authStore.register(email, password, username);
		} else {
			success = await authStore.loginEmail(email, password);
		}

		if (success) {
			console.log('[Login] Login successful, forcing page reload to "/"');
			window.location.href = '/';
		} else {
			console.log('[Login] Login failed:', authStore.error);
			error = authStore.error;
		}
	}

	async function exchangeTokenForUser(accessToken: string) {
		try {
			// Fetch GitHub user with the OAuth token
			const res = await fetch('https://api.github.com/user', {
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			});
			if (!res.ok) {
				throw new Error('Failed to fetch GitHub user');
			}
			const githubUser = await res.json();
			
			// Login with GitHub user data AND OAuth token (stored in backend per-user)
			const success = await authStore.loginGitHub({
				id: githubUser.id,
				login: githubUser.login,
				email: githubUser.email || `${githubUser.login}@github.com`,
				avatar_url: githubUser.avatar_url,
				github_token: accessToken // Store OAuth token in backend
			});
			if (success) {
				goto('/');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to complete GitHub login';
			loading = false;
		}
	}

	async function loginWithGitHub() {
		// Use OAuth device flow - requires explicit authorization on GitHub.com
		// This prevents silent re-login and allows switching accounts
		loading = true;
		error = null;
		deviceFlow = true;
		
		try {
			console.log('[Login] Initiating GitHub OAuth device flow...');
			const state = await deviceFlowService.initiateDeviceFlow();
			deviceCode = state.userCode;
			verificationUrl = state.verificationUrl;
			deviceFlowService.startPolling();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initiate GitHub login';
			loading = false;
			deviceFlow = false;
		}
	}

	async function loginWithGoogle() {
		// Mocking Google login for this demonstration
		const mockGoogleData = {
			sub: 'google_12345',
			name: 'Tom Google',
			email: 'tom@google.com',
			picture: 'https://lh3.googleusercontent.com/a/ACg8ocL...'
		};
		const success = await authStore.loginGoogle(mockGoogleData);
		if (success) goto('/');
	}
</script>

<div class="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 selection:bg-indigo-500/30">
	<!-- Background blobs -->
	<div class="fixed inset-0 overflow-hidden pointer-events-none">
		<div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
		<div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
	</div>

	<div class="w-full max-w-md relative">
		<!-- Card -->
		<div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
			<div class="p-8">
				<div class="text-center mb-8">
					<div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/20">
						<svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h1 class="text-3xl font-bold text-white tracking-tight">WorkTrack</h1>
					<div class="flex items-center justify-center gap-2 mt-2">
						<div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50">
							<div class="w-1.5 h-1.5 rounded-full {backendOnline === true ? 'bg-emerald-500 animate-pulse' : backendOnline === false ? 'bg-red-500' : 'bg-slate-500'}"></div>
							<span class="text-[10px] uppercase tracking-wider font-bold {backendOnline === true ? 'text-emerald-400' : backendOnline === false ? 'text-red-400' : 'text-slate-500'}">
								{backendOnline === true ? 'Server Online' : backendOnline === false ? 'Server Offline' : 'Checking Server...'}
							</span>
						</div>
					</div>
					<p class="text-slate-400 mt-3">{isRegister ? 'Create your account' : 'Welcome back'}</p>
				</div>

				{#if error || authStore.error}
					<div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
						{error || authStore.error}
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-5">
					{#if authStore.isAuthenticated}
						<div class="space-y-4 py-4">
							<div class="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
								<p class="text-emerald-400 font-medium">Session Active: {authStore.user?.username || 'Authenticated'}</p>
							</div>
							<button
								type="button"
								onclick={() => window.location.href = '/'}
								class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
							>
								Enter Dashboard
							</button>
							<button
								type="button"
								onclick={() => authStore.logout()}
								class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-2xl transition-all"
							>
								Sign Out
							</button>
						</div>
					{:else}
						{#if isRegister}
							<div class="space-y-2">
								<label for="username" class="text-sm font-medium text-slate-300 ml-1">Username</label>
								<input
									id="username"
									type="text"
									bind:value={username}
									placeholder="tom_dev"
									required
									class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
								/>
							</div>
						{/if}

						<div class="space-y-2">
							<label for="email" class="text-sm font-medium text-slate-300 ml-1">Email Address</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								placeholder="tom@example.com"
								required
								class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between ml-1">
								<label for="password" class="text-sm font-medium text-slate-300">Password</label>
								{#if !isRegister}
									<button type="button" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot Password?</button>
								{/if}
							</div>
							<div class="relative group">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder="••••••••"
									required
									class="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all pr-14"
								/>
								<button
									type="button"
									onclick={() => showPassword = !showPassword}
									class="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-xl hover:bg-slate-700/50"
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
										</svg>
									{:else}
										<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
									{/if}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={authStore.loading}
							class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
						>
							{authStore.loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
						</button>
					{/if}
				</form>

				<div class="relative my-8">
					<div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-800"></div></div>
					<div class="relative flex justify-center text-xs uppercase"><span class="bg-[#0f172a] px-4 text-slate-500">Or continue with</span></div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<button
						onclick={loginWithGitHub}
						class="bg-white hover:bg-slate-50 text-slate-900 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
						GitHub
					</button>

					<button
						onclick={loginWithGoogle}
						class="bg-white hover:bg-slate-50 text-slate-900 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm"
					>
						<svg class="w-5 h-5" viewBox="0 0 24 24">
							<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
							<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
							<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
							<path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
						</svg>
						Google
					</button>
				</div>

				<p class="text-center text-slate-400 text-sm mt-8">
					{isRegister ? 'Already have an account?' : "Don't have an account?"}
					<button 
						onclick={() => isRegister = !isRegister} 
						class="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors ml-1"
					>
						{isRegister ? 'Sign In' : 'Create Account'}
					</button>
				</p>
			</div>
		</div>
		
		<p class="text-center text-slate-500 text-xs mt-8">
			&copy; 2026 WorkTrack System. Premium Time Management.
		</p>
	</div>
</div>

<style>
	:global(body) {
		background-color: #0f172a;
	}
</style>
