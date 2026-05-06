<script lang="ts">
	import { timerStore } from '$lib/stores/timer.svelte';
	import { formatDuration } from '$lib/utils/timeUtils';

	let { user } = $props<{ user: string }>();

	let totalSeconds = $derived(timerStore.getUserTotalTodaySeconds(user));
	let shiftGoalHours = $derived(timerStore.getShiftGoal(user));
	let shiftGoalSeconds = $derived(shiftGoalHours * 3600);
	let percent = $derived(Math.min(100, Math.round((totalSeconds / shiftGoalSeconds) * 100)));

	function handleShiftChange(e: Event) {
		const val = Number((e.target as HTMLInputElement).value);
		if (!isNaN(val) && val > 0) {
			timerStore.setUserShiftGoal(user, val);
		}
	}
</script>

<div class="border-b border-slate-200/50 bg-indigo-50/50 px-6 py-3 dark:border-white/5 dark:bg-indigo-900/20">
	<div class="flex items-center justify-between text-xs font-semibold text-indigo-800 dark:text-indigo-300">
		<div class="flex items-center gap-2">
			<span class="text-lg" aria-hidden="true">👤</span>
			<span class="text-sm font-medium">{user}</span>
		</div>
		<div class="flex items-center gap-1.5">
			<span>{formatDuration(totalSeconds)} /</span>
			<input
				type="number"
				min="1"
				max="24"
				value={shiftGoalHours}
				onchange={handleShiftChange}
				class="w-10 rounded bg-white/50 px-1 py-0.5 text-center outline-none ring-1 ring-indigo-200 transition-all focus:ring-2 focus:ring-indigo-500/50 dark:bg-black/20 dark:ring-indigo-700/50"
				aria-label="Shift Goal (Hours)"
			/>
			<span>h ({percent}%)</span>
		</div>
	</div>
	<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/50 dark:bg-indigo-900/50">
		<div 
			class="h-full rounded-full bg-indigo-600 transition-all duration-1000 ease-out dark:bg-indigo-400" 
			style="width: {percent}%"
		></div>
	</div>
</div>
