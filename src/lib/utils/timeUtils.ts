/**
 * Pure time-related utility functions.
 * Zero side effects, easy to test.
 */

/**
 * Calculate LIVE elapsed seconds from a server timer data.
 * Works identically on every device because it uses wall-clock math.
 */
export function calcElapsedSeconds(timer: {
	startTime: string;
	elapsedSeconds: number;
	running: boolean;
}): number {
	if (!timer.running) {
		return timer.elapsedSeconds;
	}
	const runningSeconds = Math.floor(
		(Date.now() - new Date(timer.startTime).getTime()) / 1000
	);
	return Math.max(0, timer.elapsedSeconds + runningSeconds);
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
