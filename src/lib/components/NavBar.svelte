<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';

	let { activeTab = $bindable('timer') }: { activeTab: string } = $props();

	const navItems = [
		{ id: 'timer',   label: 'Timer',   icon: '⏱' },
		{ id: 'logs',    label: 'Logs',    icon: '📋' },
		{ id: 'reports', label: 'Reports', icon: '📊' },
		{ id: 'github',  label: 'GitHub',  icon: '🐙' }
	];
</script>

<!-- Desktop sidebar -->
<aside
	class="hidden w-56 flex-col justify-between border-r border-slate-200 bg-white/80 px-4 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 lg:flex"
>
	<div class="flex flex-col gap-6">
		<!-- Logo -->
		<div class="flex items-center gap-2.5 px-2">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
				<span class="text-lg">⚡</span>
			</div>
			<div>
				<p class="text-sm font-bold leading-none text-slate-900 dark:text-white">WorkTrack</p>
				<p class="mt-0.5 text-[10px] text-slate-500">Time & Task Manager</p>
			</div>
		</div>

		<!-- Nav -->
		<nav class="flex flex-col gap-1" aria-label="Main navigation">
			{#each navItems as item}
				<button
					id="nav-{item.id}"
					onclick={() => (activeTab = item.id)}
					class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
						{activeTab === item.id
							? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/30 dark:bg-indigo-600/20 dark:text-indigo-400'
							: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}"
				>
					<span class="text-base">{item.icon}</span>
					{item.label}
					{#if activeTab === item.id}
						<span class="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
					{/if}
				</button>
			{/each}
		</nav>
	</div>

	<div class="px-2">
		<ThemeToggle />
	</div>
</aside>

<!-- Mobile / Tablet top bar -->
<header
	class="relative z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 lg:hidden"
>
	<div class="flex items-center gap-2">
		<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow shadow-indigo-900/40">
			<span class="text-sm">⚡</span>
		</div>
		<p class="text-sm font-bold text-slate-900 dark:text-white">WorkTrack</p>
	</div>
	<div class="w-48">
		<ThemeToggle placement="bottom" />
	</div>
</header>

<!-- Mobile bottom tab bar -->
<nav
	class="pb-safe fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-slate-50/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 lg:hidden"
	aria-label="Bottom navigation"
>
	{#each navItems as item}
		<button
			id="mobile-nav-{item.id}"
			onclick={() => (activeTab = item.id)}
			class="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-all duration-200
				{activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
		>
			<span class="text-xl leading-none">{item.icon}</span>
			{item.label}
		</button>
	{/each}
</nav>
