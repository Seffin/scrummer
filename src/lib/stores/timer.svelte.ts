/**
 * Timer store — manages the active timer session.
 * Uses setInterval for tick counting and persists state to localStorage
 * so an active session survives a page refresh.
 * 
 * Cross-browser restriction: Only ONE task can run at a time across all tabs.
 * Uses storage events to sync and prevent concurrent timers.
 */

import { tasksStore } from './tasks.svelte';

const ACTIVE_KEY = 'wtt-active';
const TIMER_LOCK_KEY = 'wtt-timer-lock'; // Tracks which tab owns the running timer
const INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; // Unique ID for this browser tab

export interface ActiveTask {
	client: string;
	project: string;
	task: string;
}

class TimerStore {
	elapsed = $state(0); // seconds elapsed in current session
	running = $state(false);
	activeTask = $state<ActiveTask | null>(null);
	sessionStart = $state<number | null>(null); // wall-clock ms when session began
	conflictError = $state<string | null>(null); // Error message when another tab has an active timer

	private _iid: ReturnType<typeof setInterval> | null = null;
	private _ownsLock = false; // Whether this tab currently owns the running timer

	/** Formatted elapsed time as HH:MM:SS. */
	get formatted(): string {
		const h = Math.floor(this.elapsed / 3600)
			.toString()
			.padStart(2, '0');
		const m = Math.floor((this.elapsed % 3600) / 60)
			.toString()
			.padStart(2, '0');
		const s = (this.elapsed % 60).toString().padStart(2, '0');
		return `${h}:${m}:${s}`;
	}

	/** idle | running | paused */
	get status(): 'idle' | 'running' | 'paused' {
		if (!this.activeTask) return 'idle';
		return this.running ? 'running' : 'paused';
	}

	/** Restore persisted timer state (called once client-side). */
	init() {
		if (typeof window === 'undefined') return;
		
		// Listen for storage changes from other tabs
		window.addEventListener('storage', (e) => this._onStorageChange(e));
		
		try {
			const raw = localStorage.getItem(ACTIVE_KEY);
			if (raw) {
				const d = JSON.parse(raw);
				this.elapsed = d.elapsed ?? 0;
				this.activeTask = d.activeTask ?? null;
				this.sessionStart = d.sessionStart ?? null;

				// Recover lost time if session was running when browser closed
				if (this.sessionStart && this.activeTask) {
					const now = Date.now();
					const lostSeconds = Math.floor((now - this.sessionStart) / 1000);
					this.elapsed = Math.max(this.elapsed, lostSeconds);
				}
				// Restore as paused — user must manually resume
			}
		} catch {
			// Ignore
		}
	}

	/** Start a new session for the given task. */
	start(task: ActiveTask) {
		// Check if another tab has the lock
		if (!this._canAcquireLock()) {
			this.conflictError = 'Timer is already running in another browser tab. Stop it first.';
			return;
		}

		this.conflictError = null;
		this.activeTask = task;
		if (!this.sessionStart) {
			this.sessionStart = Date.now();
		}
		this._acquireLock();
		this._beginTicking();
	}

	/** Resume a paused session. */
	resume() {
		if (!this.activeTask || this.running) return;

		// Check if another tab has the lock
		if (!this._canAcquireLock()) {
			this.conflictError = 'Timer is already running in another browser tab. Stop it first.';
			return;
		}

		this.conflictError = null;
		this._acquireLock();
		this._beginTicking();
	}

	/** Pause the running timer. */
	pause() {
		if (!this.running) return;
		this.running = false;
		this._clearInterval();
		this._releaseLock();
		this._persist();
	}

	/** Save the session as Completed and reset. */
	complete() {
		if (!this.activeTask) return;
		const endTime = Date.now();
		const startTime = this.sessionStart ?? endTime - this.elapsed * 1000;

		tasksStore.addSession({
			client: this.activeTask.client,
			project: this.activeTask.project,
			task: this.activeTask.task,
			status: 'completed',
			startTime,
			endTime,
			duration: this.elapsed
		});

		this._reset(true);
	}

	/** Discard the current session without saving. */
	cancel() {
		this._reset(true);
	}

	/** Cleanup: must be called onDestroy to avoid memory leaks. */
	cleanup() {
		this._clearInterval();
		this._releaseLock();
		if (typeof window !== 'undefined') {
			window.removeEventListener('storage', (e) => this._onStorageChange(e));
		}
	}

	// ─── Private helpers ──────────────────────────────────────────────

	/** Check if this tab can acquire the timer lock */
	private _canAcquireLock(): boolean {
		if (typeof window === 'undefined') return false;
		
		// If we already own the lock, we can continue
		if (this._ownsLock) return true;
		
		const lockData = localStorage.getItem(TIMER_LOCK_KEY);
		if (!lockData) return true; // No lock, we can acquire it
		
		try {
			const lock = JSON.parse(lockData);
			// If lock is older than 30 seconds, consider it stale
			if (Date.now() - lock.timestamp > 30000) return true;
			// Lock is held by another tab
			return false;
		} catch {
			return true; // Malformed lock, we can acquire it
		}
	}

	/** Acquire the timer lock for this tab */
	private _acquireLock() {
		if (typeof window === 'undefined') return;
		this._ownsLock = true;
		localStorage.setItem(
			TIMER_LOCK_KEY,
			JSON.stringify({
				instanceId: INSTANCE_ID,
				timestamp: Date.now()
			})
		);
	}

	/** Release the timer lock */
	private _releaseLock() {
		if (typeof window === 'undefined') return;
		const lockData = localStorage.getItem(TIMER_LOCK_KEY);
		if (lockData) {
			try {
				const lock = JSON.parse(lockData);
				if (lock.instanceId === INSTANCE_ID) {
					localStorage.removeItem(TIMER_LOCK_KEY);
					this._ownsLock = false;
				}
			} catch {
				// Ignore
			}
		}
	}

	/** Handle storage changes from other tabs */
	private _onStorageChange(e: StorageEvent) {
		// If another tab started/stopped the timer, refresh our state
		if (e.key === ACTIVE_KEY && e.newValue && e.oldValue !== e.newValue) {
			try {
				const newData = JSON.parse(e.newValue);
				this.elapsed = newData.elapsed ?? this.elapsed;
				this.activeTask = newData.activeTask ?? this.activeTask;
				this.sessionStart = newData.sessionStart ?? this.sessionStart;
			} catch {
				// Ignore
			}
		}

		// Check if lock was released by another tab
		if (e.key === TIMER_LOCK_KEY && !e.newValue) {
			this._ownsLock = false;
		}
	}

	private _beginTicking() {
		this.running = true;
		// Refresh lock every 10 seconds to prevent stale locks
		this._iid = setInterval(() => {
			this.elapsed++;
			this._persist();
			if (this._ownsLock) {
				this._acquireLock(); // Refresh timestamp
			}
		}, 1000);
	}

	private _clearInterval() {
		if (this._iid !== null) {
			clearInterval(this._iid);
			this._iid = null;
		}
	}

	private _reset(clearStorage = false) {
		this.running = false;
		this._clearInterval();
		this._releaseLock();
		this.elapsed = 0;
		this.activeTask = null;
		this.sessionStart = null;
		this.conflictError = null;
		if (clearStorage && typeof window !== 'undefined') {
			localStorage.removeItem(ACTIVE_KEY);
		}
	}

	private _persist() {
		if (typeof window === 'undefined') return;
		localStorage.setItem(
			ACTIVE_KEY,
			JSON.stringify({
				elapsed: this.elapsed,
				activeTask: this.activeTask,
				sessionStart: this.sessionStart
			})
		);
	}
}

export const timerStore = new TimerStore();
