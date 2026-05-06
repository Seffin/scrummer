<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
</script>

<div class="space-y-6">
	<div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
		<h3 class="text-lg font-semibold text-slate-900 dark:text-white">Account</h3>
		<p class="mt-1 text-sm text-slate-500">Manage your profile and authentication.</p>

		<div class="mt-6 flex items-center gap-4 border-t border-slate-100 pt-6 dark:border-white/5">
			{#if authStore.user?.avatar_url}
				<img src={authStore.user.avatar_url} alt="Profile" class="h-16 w-16 rounded-2xl object-cover" />
			{:else}
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 text-2xl font-bold">
					{authStore.user?.username?.charAt(0).toUpperCase() || 'U'}
				</div>
			{/if}
			
			<div class="flex-1">
				<p class="text-base font-bold text-slate-900 dark:text-white">{authStore.user?.username || 'User'}</p>
				<p class="text-sm text-slate-500">{authStore.user?.email || 'No email provided'}</p>
			</div>

			<button
				onclick={() => authStore.logout()}
				class="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:bg-red-600 active:scale-95"
			>
				Sign Out
			</button>
		</div>
	</div>

	<div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
		<h3 class="text-lg font-semibold text-slate-900 dark:text-white">Preferences</h3>
		<div class="mt-6 space-y-4 border-t border-slate-100 pt-6 dark:border-white/5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-slate-900 dark:text-white">Desktop Notifications</p>
					<p class="text-xs text-slate-500">Receive alerts when timers complete.</p>
				</div>
				<div class="h-6 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
			</div>
		</div>
	</div>
</div>
