/**
 * Pure time-related utility functions.
 * Zero side effects, easy to test.
 */

/**
 * Calculate LIVE elapsed seconds from a server timer data.
 * Works identically on every device because it uses wall-clock math.
 */
export function calcElapsedSeconds(timer: {
	startTime: string | null | undefined;
	elapsedSeconds: number;
	running: boolean;
}): number {
	if (!timer.running || !timer.startTime) {
		return timer.elapsedSeconds || 0;
	}
	try {
		const start = new Date(timer.startTime).getTime();
		if (isNaN(start)) return timer.elapsedSeconds || 0;
		
		const runningSeconds = Math.floor((Date.now() - start) / 1000);
		return Math.max(0, (timer.elapsedSeconds || 0) + runningSeconds);
	} catch (e) {
		console.error('[TimeUtils] Error calculating elapsed seconds:', e);
		return timer.elapsedSeconds || 0;
	}
}

/**
 * Formats seconds into HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
	if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Formats an ISO date into a readable string
 */
export function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	} catch {
		return 'Invalid Date';
	}
}

/**
 * Formats an ISO date into a readable time string
 */
export function formatTime(iso: string): string {
	try {
		return new Date(iso).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return '--:--';
	}
}
