import { describe, it, expect, beforeEach } from 'vitest';
import { tracker } from './tracker.svelte';

describe('tracker store - github integration', () => {
	beforeEach(() => {
		// Mock localStorage for node environment if needed, 
		// but vitest usually handles this or we can clear state.
		tracker.clearAll();
	});

	it('should find a timer for a github issue by number', () => {
		const issue = { number: 42, title: 'Test Issue' };
		tracker.startTimerFromGithubIssue(issue as any, 'Tom');
		
		const timer = tracker.getTimerForIssue(42);
		expect(timer).toBeDefined();
		expect(timer?.task).toBe('#42 Test Issue');
		expect(timer?.running).toBe(true);
	});

	it('should return undefined if no timer exists for issue', () => {
		const timer = tracker.getTimerForIssue(999);
		expect(timer).toBeUndefined();
	});

	it('should find a paused timer for a github issue', () => {
		// Clear any existing locks that might prevent timer creation
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('wtt-global-timer-lock');
		}
		
		const issue = { number: 101, title: 'Paused Issue' };
		tracker.startTimerFromGithubIssue(issue as any, 'Tom');
		
		const timer = tracker.getTimerForIssue(101);
		expect(timer).toBeDefined();
		
		if (timer) {
			tracker.pauseTimer(timer.id);
		}
		
		const updatedTimer = tracker.getTimerForIssue(101);
		expect(updatedTimer).toBeDefined();
		expect(updatedTimer?.running).toBe(false);
		expect(updatedTimer?.status).toBe('On Hold');
	});
});
