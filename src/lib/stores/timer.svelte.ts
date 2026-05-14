import { timerApi, type TimerDTO } from '$lib/api/timerApi';
import { authStore } from './auth.svelte';
import { calcElapsedSeconds, formatDuration } from '$lib/utils/timeUtils';

export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'active' | 'paused';

export interface WorkSession {
	id: string;
	user: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: string;
	endTime?: string;
	durationSeconds: number;
}

const STORAGE_KEY = 'work-tracker-metadata';

function createTimerStore() {
	let activeTimer = $state<TimerDTO | null>(null);
	let sessions = $state<WorkSession[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let conflictError = $state<string | null>(null);
	let conflictingSession = $state<TimerDTO | null>(null);

	// Local metadata
	let clients = $state<string[]>([]);
	let projects = $state<Record<string, string[]>>({}); // client -> projects[]
	let knownTasks = $state<Record<string, string[]>>({}); // client::project -> tasks[]
	let shiftGoals = $state<Record<string, number>>({});

	let _tick = $state(0);
	let _intervalId: ReturnType<typeof setInterval> | null = null;

	function startTick() {
		if (_intervalId) return;
		console.log('[TimerStore] Starting tick');
		_intervalId = setInterval(() => {
			_tick++;
			console.log('[TimerStore] Tick:', _tick);
		}, 1000);
	}

	function stopTick() {
		if (_intervalId) {
			console.log('[TimerStore] Stopping tick');
			clearInterval(_intervalId);
			_intervalId = null;
		}
	}

	function loadMetadata() {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const data = JSON.parse(raw);
				clients = data.clients || [];
				projects = data.projects || {};
				knownTasks = data.knownTasks || {};
				shiftGoals = data.shiftGoals || {};
			}
		} catch (e) {
			console.error('[TimerStore] Failed to load metadata', e);
		}
	}

	function saveMetadata() {
		if (typeof localStorage === 'undefined') return;
		const data = { clients, projects, knownTasks, shiftGoals };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}

	async function sync() {
		if (!authStore.isAuthenticated) return;

		try {
			const [activeRes, sessionsRes] = await Promise.all([
				timerApi.getActive(),
				timerApi.getSessions(20)
			]);

			console.log('[TimerStore] Sync - activeRes:', activeRes);
			console.log('[TimerStore] Sync - activeRes.timer:', activeRes.timer);
			console.log('[TimerStore] Sync - sessionsRes:', sessionsRes);

			activeTimer = activeRes.timer;
			console.log('[TimerStore] Sync - activeTimer set to:', activeTimer);

			if (activeTimer && (activeTimer.status === 'active' || activeTimer.status === 'In Progress')) {
				startTick();
			} else {
				stopTick();
			}

			if (sessionsRes && Array.isArray(sessionsRes.sessions)) {
				sessions = sessionsRes.sessions.map(s => ({
					id: s.id.toString(),
					user: authStore.user?.username || 'User',
					client: s.client,
					project: s.project,
					task: s.task,
					status: s.status as TaskStatus,
					startTime: s.start_time,
					durationSeconds: s.duration_seconds
				}));
			} else {
				sessions = [];
			}
			conflictError = null;
		} catch (e) {
			console.error('[TimerStore] Sync failed', e);
		}
	}

	async function start(client: string, project: string, task: string) {
		isLoading = true;
		error = null;
		conflictError = null;
		conflictingSession = null;

		// Update local metadata
		const c = client.trim();
		const p = project.trim();
		const t = task.trim();

		if (c && !clients.includes(c)) clients = [...clients, c];
		if (c && p) {
			const existing = projects[c] ?? [];
			if (!existing.includes(p)) projects[c] = [...existing, p];
			const key = `${c}::${p}`;
			const tasks = knownTasks[key] ?? [];
			if (t && !tasks.includes(t)) knownTasks[key] = [...tasks, t];
		}
		saveMetadata();

		try {
			const deviceInfo = { browser: navigator.userAgent, platform: navigator.platform };
			const res = await timerApi.start(c, p, t, deviceInfo);
			console.log('[TimerStore] Start response:', res);
			activeTimer = res.timer;
			console.log('[TimerStore] Active timer set:', activeTimer);
			startTick();
		} catch (e: any) {
			if (e.status === 409) {
				conflictError = e.data?.message || 'Timer conflict';
				conflictingSession = e.data?.conflicting_timer || null;
			} else {
				error = e.message;
			}
		} finally {
			isLoading = false;
		}
	}

	async function addToQueue(client: string, project: string, task: string) {
		isLoading = true;
		error = null;

		// Update local metadata
		const c = client.trim();
		const p = project.trim();
		const t = task.trim();

		if (c && !clients.includes(c)) clients = [...clients, c];
		if (c && p) {
			const existing = projects[c] ?? [];
			if (!existing.includes(p)) projects[c] = [...existing, p];
			const key = `${c}::${p}`;
			const tasks = knownTasks[key] ?? [];
			if (t && !tasks.includes(t)) knownTasks[key] = [...tasks, t];
		}
		saveMetadata();

		try {
			const deviceInfo = { browser: navigator.userAgent, platform: navigator.platform };
			await timerApi.queue(c, p, t, deviceInfo);
			await sync();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	async function startFromGithubIssue(issue: { number: number; title: string }) {
		const taskTitle = `#${issue.number} ${issue.title}`.trim();
		await start('GitHub', 'Issues', taskTitle);
	}

	async function queueFromGithubIssue(issue: { number: number; title: string }) {
		const taskTitle = `#${issue.number} ${issue.title}`.trim();
		await addToQueue('GitHub', 'Issues', taskTitle);
	}

	async function pause(id?: string | number) {
		const targetId = id || activeTimer?.id;
		if (!targetId) return;
		isLoading = true;
		try {
			const res = await timerApi.pause(targetId, { browser: navigator.userAgent });
			activeTimer = res.timer;
			stopTick();
			await sync();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	async function resume(id?: string | number) {
		const targetId = id || activeTimer?.id;
		if (!targetId) return;
		isLoading = true;
		try {
			const res = await timerApi.resume(targetId, { browser: navigator.userAgent });
			activeTimer = res.timer;
			startTick();
			await sync();
		} catch (e: any) {
			if (e.status === 409) {
				conflictError = e.data?.message || 'Timer conflict';
			} else {
				error = e.message;
			}
		} finally {
			isLoading = false;
		}
	}

	async function complete(id?: string | number) {
		const targetId = id || activeTimer?.id;
		if (!targetId) return;
		isLoading = true;
		try {
			await timerApi.complete(targetId, { browser: navigator.userAgent });
			if (activeTimer?.id === targetId) {
				activeTimer = null;
				stopTick();
			}
			conflictError = null;
			conflictingSession = null;
			await sync();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	async function discard(id?: string | number) {
		const targetId = id || activeTimer?.id;
		if (!targetId) return;
		if (!confirm('Are you sure you want to discard this session?')) return;
		isLoading = true;
		try {
			await timerApi.discard(targetId, { browser: navigator.userAgent });
			if (activeTimer?.id === targetId) {
				activeTimer = null;
				stopTick();
			}
			await sync();
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoading = false;
		}
	}

	function getReport(): ReportUser[] {
		const map = new Map<string, Map<string, Map<string, Map<string, number>>>>();

		for (const s of sessions) {
			if (!map.has(s.user)) map.set(s.user, new Map());
			const clientMap = map.get(s.user)!;
			if (!clientMap.has(s.client)) clientMap.set(s.client, new Map());
			const pMap = clientMap.get(s.client)!;
			if (!pMap.has(s.project)) pMap.set(s.project, new Map());
			const tMap = pMap.get(s.project)!;
			tMap.set(s.task, (tMap.get(s.task) ?? 0) + s.durationSeconds);
		}

		const report: ReportUser[] = [];
		for (const [user, clientMap] of map) {
			const clients: ReportClient[] = [];
			let userTotal = 0;
			for (const [client, pMap] of clientMap) {
				const projects: ReportProject[] = [];
				let clientTotal = 0;
				for (const [project, tMap] of pMap) {
					const tasks: ReportTask[] = [];
					let projectTotal = 0;
					for (const [task, secs] of tMap) {
						tasks.push({ task, seconds: secs });
						projectTotal += secs;
					}
					projects.push({ project, seconds: projectTotal, tasks });
					clientTotal += projectTotal;
				}
				clients.push({ client, seconds: clientTotal, projects });
				userTotal += clientTotal;
			}
			report.push({ user, seconds: userTotal, clients });
		}
		return report;
	}

	const store = {
		get activeTimer() { return activeTimer; },
		get sessions() { return sessions; },
		get isLoading() { return isLoading; },
		get error() { return error; },
		get conflictError() { return conflictError; },
		get conflictingSession() { return conflictingSession; },
		get clients() { return clients; },
		get projects() { return projects; },
		get knownTasks() { return knownTasks; },
		
		get pausedTimers() {
			return sessions.filter(s => s && (s.status === 'paused' || s.status === 'queued'));
		},

		get totalTodaySeconds() {
			const today = new Date().toDateString();
			const sessionTotal = sessions
				.filter(s => s && s.startTime && new Date(s.startTime).toDateString() === today)
				.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
			return sessionTotal + this.elapsedSeconds;
		},

		get elapsedSeconds() {
			void _tick; // reactive dependency
			if (!activeTimer) {
				return 0;
			}
			const running = activeTimer.status === 'active' || activeTimer.status === 'In Progress';
			return calcElapsedSeconds({
				startTime: activeTimer.start_time,
				elapsedSeconds: activeTimer.duration_seconds || 0,
				running
			});
		},

		init: () => {
			loadMetadata();
		},
		sync,
		start,
		addToQueue,
		startFromGithubIssue,
		queueFromGithubIssue,
		pause,
		resume,
		complete,
		discard,
		
		getProjects: (c: string) => projects[c] ?? [],
		getTasks: (c: string, p: string) => knownTasks[`${c}::${p}`] ?? [],
		
		getUserTotalTodaySeconds: (targetUser: string) => {
			void _tick; // reactive
			const today = new Date().toDateString();
			const sessionTotal = sessions
				.filter(s => s && s.user === targetUser && s.startTime && new Date(s.startTime).toDateString() === today)
				.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
			
			let activeExtra = 0;
			if (activeTimer && (authStore.user?.username === targetUser)) {
				const timerDate = new Date(activeTimer.start_time).toDateString();
				if (timerDate === today) {
					activeExtra = store.elapsedSeconds;
				}
			}
			return sessionTotal + activeExtra;
		},
		getTimerForIssue: (issueNumber: number) => {
			void _tick; // reactive
			const prefix = `#${issueNumber} `;
			if (activeTimer && activeTimer.client === 'GitHub' && activeTimer.project === 'Issues' && activeTimer.task.startsWith(prefix)) {
				return { 
					id: activeTimer.id, 
					running: activeTimer.status === 'active' || activeTimer.status === 'In Progress',
					elapsedSeconds: store.elapsedSeconds,
					status: activeTimer.status
				};
			}
			const other = sessions.find(s => s && s.client === 'GitHub' && s.project === 'Issues' && s.task.startsWith(prefix) && (s.status === 'paused' || s.status === 'queued'));
			if (other) {
				return { 
					id: other.id, 
					running: false, 
					elapsedSeconds: other.durationSeconds || 0,
					status: other.status
				};
			}
			return undefined;
		},
		setUserShiftGoal: (user: string, hours: number) => {
			shiftGoals[user] = hours;
			saveMetadata();
		},
		getShiftGoal: (user: string) => shiftGoals[user] || 8,
		
		getReport,
		formatDuration,
		destroy: stopTick
	};

	return store;
}

export const timerStore = createTimerStore();

// ─── Report types ─────────────────────────────────────────────────────────────

export interface ReportTask {
	task: string;
	seconds: number;
}
export interface ReportProject {
	project: string;
	seconds: number;
	tasks: ReportTask[];
}
export interface ReportClient {
	client: string;
	seconds: number;
	projects: ReportProject[];
}
export interface ReportUser {
	user: string;
	seconds: number;
	clients: ReportClient[];
}
