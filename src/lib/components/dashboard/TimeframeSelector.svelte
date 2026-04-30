<script lang="ts">
	interface Props {
		value: 'day' | 'week' | 'month' | 'year';
		onChange: (value: 'day' | 'week' | 'month' | 'year') => void;
	}

	let { value = 'day', onChange }: Props = $props();

	const options = [
		{ value: 'day', label: 'Daily', icon: '☀️' },
		{ value: 'week', label: 'Weekly', icon: '📅' },
		{ value: 'month', label: 'Monthly', icon: '📊' },
		{ value: 'year', label: 'Yearly', icon: '📈' }
	] as const;
</script>

<div class="inline-flex rounded-xl bg-white p-1 shadow-sm dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
	{#each options as option}
		<button
			onclick={() => onChange(option.value)}
			class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all {value === option.value ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50'}"
		>
			<span>{option.icon}</span>
			<span class="hidden sm:inline">{option.label}</span>
		</button>
	{/each}
</div>
