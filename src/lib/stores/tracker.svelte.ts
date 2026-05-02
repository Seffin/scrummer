// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed';

export interface WorkSession {
	id: string;
	user: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: string; // ISO
	endTime: string; // ISO
	durationSeconds: number;
}

export interface ActiveTimer {
	id: string;
	user: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: string; // ISO
	elapsedSeconds: number;
	running: boolean;
}

export interface GithubIssueRef {
	number: number;
	title: string;
	url?: string;
}

export interface TrackerState {
	sessions: WorkSession[];
	activeTimers: ActiveTimer[];
	pausedTimers: ActiveTimer[];
	clients: string[];
	projects: Record<string, string[]>; // client -> projects[]
	knownTasks: Record<string, string[]>; // client::project -> tasks[]
	currentUser: string;
	users: string[];
	shiftGoals: Record<string, number>;
	conflictError: string | null; // Error when another browser tab has an active timer
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = 'work-tracker-state';

function loadState(): TrackerState {
	if (typeof localStorage === 'undefined') return defaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed: TrackerState = JSON.parse(raw);
		
		// Migration: convert single activeTimer to array
		if (parsed.activeTimers === undefined) {
			parsed.activeTimers = [];
			if ((parsed as any).activeTimer) {
				const legacyTimer = (parsed as any).activeTimer;
				// Maintain running state if it was running
				parsed.activeTimers.push(legacyTimer);
				delete (parsed as any).activeTimer;
			}
		}

		// (Removed auto-stop logic to allow persistence across reloads)

		if (!parsed.pausedTimers) {
			parsed.pausedTimers = [];
		}
		if (!parsed.knownTasks) {
			parsed.knownTasks = {};
		}
		if (!parsed.currentUser) parsed.currentUser = 'Default User';
		if (!parsed.users) parsed.users = [parsed.currentUser];
		if (!parsed.shiftGoals) parsed.shiftGoals = { [parsed.currentUser]: 8 };

		// Backward compatibility for users
		parsed.activeTimers.forEach(t => { if (!t.user) t.user = parsed.currentUser; });
		parsed.sessions.forEach(s => { if (!s.user) s.user = parsed.currentUser; });
		parsed.pausedTimers.forEach(t => { if (!t.user) t.user = parsed.currentUser; });

		return parsed;
	} catch {
		return defaultState();
	}
}

function defaultState(): TrackerState {
	return {
		sessions: [],
		activeTimers: [],
		pausedTimers: [],
		clients: [],
		projects: {},
		knownTasks: {},
		currentUser: 'Default User',
		users: ['Default User'],
		shiftGoals: { 'Default User': 8 },
		conflictError: null
	};
}

function saveState(state: TrackerState): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Store ───────────────────────────────────────────────────────────────────

function createTracker() {
	let state = $state<TrackerState>(defaultState());
	let intervalId: ReturnType<typeof setInterval> | null = null;

	// Initialise from localStorage (client-side only)
	function init() {
		state = loadState();
		// Automatically resume the interval if there are running timers
		if (state.activeTimers.some(t => t.running)) {
			startInterval();
		}
	}

	function persist() {
		saveState(state);
	}

	// ── User management ──

	function switchUser(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		if (!state.users.includes(trimmed)) {
			state.users = [...state.users, trimmed];
		}
		if (!(trimmed in state.shiftGoals)) {
			state.shiftGoals[trimmed] = 8;
		}
		
		state.currentUser = trimmed;
		persist();
	}

	function setShiftGoal(hours: number) {
		if (hours > 0) {
			state.shiftGoals[state.currentUser] = hours;
			persist();
		}
	}

	// ── Client / Project management ──

	function addClient(name: string) {
		const trimmed = name.trim();
		if (!trimmed || state.clients.includes(trimmed)) return;
		state.clients = [...state.clients, trimmed];
		if (!state.projects[trimmed]) state.projects = { ...state.projects, [trimmed]: [] };
		persist();
	}

	function addProject(client: string, project: string) {
		const trimmed = project.trim();
		if (!trimmed) return;
		const existing = state.projects[client] ?? [];
		if (existing.includes(trimmed)) return;
		state.projects = { ...state.projects, [client]: [...existing, trimmed] };
		persist();
	}

	function getProjects(client: string): string[] {
		return state.projects[client] ?? [];
	}

	function addTask(client: string, project: string, task: string) {
		const trimmedClient = client.trim();
		const trimmedProject = project.trim();
		const trimmedTask = task.trim();
		if (!trimmedTask) return;
		const key = `${trimmedClient}::${trimmedProject}`;
		const existing = state.knownTasks[key] ?? [];
		if (existing.includes(trimmedTask)) return;
		state.knownTasks = { ...state.knownTasks, [key]: [...existing, trimmedTask] };
		persist();
	}

	function getTasks(client: string, project: string): string[] {
		const key = `${client.trim()}::${project.trim()}`;
		return state.knownTasks[key] ?? [];
	}

	// ── Timer controls ──

	function startTimer(client: string, project: string, task: string, assignee: string) {
		if (!client.trim() || !project.trim() || !task.trim() || !assignee.trim()) return;

		// Check cross-browser lock: only allow if no other tab has a running timer
		const lockKey = 'wtt-global-timer-lock';
		const lockData = typeof localStorage !== 'undefined' ? localStorage.getItem(lockKey) : null;
		if (lockData) {
			try {
				const lock = JSON.parse(lockData);
				// If lock is younger than 30 seconds, another tab has the lock
				if (Date.now() - lock.timestamp < 30000) {
					state.conflictError = `Timer already running in another browser tab on task: "${lock.task}". Stop it first.`;
					return;
				}
			} catch {
				// Malformed lock, ignore
			}
		}

		state.conflictError = null;

		// Ensure client/project exist in lists
		addClient(client);
		addProject(client, project);
		addTask(client, project, task);

		const assignedUser = assignee.trim();
		if (!state.users.includes(assignedUser)) {
			state.users = [...state.users, assignedUser];
			if (!(assignedUser in state.shiftGoals)) {
				state.shiftGoals[assignedUser] = 8;
			}
		}

		// If this user already has an active timer, move it to paused timers to avoid overwriting
		const userActiveIndex = state.activeTimers.findIndex(t => t.user === assignedUser);
		if (userActiveIndex !== -1) {
			const toPause = { ...state.activeTimers[userActiveIndex], status: 'On Hold' as TaskStatus, running: false };
			state.pausedTimers = [toPause, ...state.pausedTimers];
			state.activeTimers.splice(userActiveIndex, 1);
		}

		const now = new Date().toISOString();
		const taskTitle = `${client} / ${project} / ${task}`;

		const newTimer: ActiveTimer = {
			id: generateId(),
			user: assignedUser,
			client: client.trim(),
			project: project.trim(),
			task: task.trim(),
			status: 'In Progress',
			startTime: now,
			elapsedSeconds: 0,
			running: true
		};

		// Acquire global lock for this tab
		if (typeof localStorage !== 'undefined') {
			const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			localStorage.setItem(lockKey, JSON.stringify({
				instanceId,
				task: taskTitle,
				timestamp: Date.now()
			}));
		}

		state.activeTimers = [...state.activeTimers, newTimer];
		startInterval();
		persist();
	}

	function startTimerFromGithubIssue(issue: GithubIssueRef, assignee?: string) {
		const user = assignee?.trim() || state.currentUser;
		const taskTitle = `#${issue.number} ${issue.title}`.trim();
		startTimer('GitHub', 'Issues', taskTitle, user);
	}

	function addPendingTask(client: string, project: string, task: string, assignee: string) {
		if (!client.trim() || !project.trim() || !task.trim() || !assignee.trim()) return;

		addClient(client);
		addProject(client, project);
		addTask(client, project, task);

		const assignedUser = assignee.trim();
		if (!state.users.includes(assignedUser)) {
			state.users = [...state.users, assignedUser];
			if (!(assignedUser in state.shiftGoals)) {
				state.shiftGoals[assignedUser] = 8;
			}
		}

		const now = new Date().toISOString();

		const newTask: ActiveTimer = {
			id: generateId(),
			user: assignedUser,
			client: client.trim(),
			project: project.trim(),
			task: task.trim(),
			status: 'Pending',
			startTime: now,
			elapsedSeconds: 0,
			running: false
		};

		state.pausedTimers = [newTask, ...state.pausedTimers];
		persist();
	}

	function pauseTimer(id: string) {
		const idx = state.activeTimers.findIndex(t => t.id === id);
		if (idx === -1 || !state.activeTimers[idx].running) return;
		
		const pausedTimer = { ...state.activeTimers[idx], status: 'On Hold' as TaskStatus, running: false };
		state.pausedTimers = [pausedTimer, ...state.pausedTimers];
		state.activeTimers.splice(idx, 1);
		
		// Release lock when pausing the timer
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('wtt-global-timer-lock');
		}
		persist();
	}

	function resumeTimer(id: string) {
		const idx = state.pausedTimers.findIndex(t => t.id === id);
		if (idx === -1 || state.pausedTimers[idx].running) return;
		
		// Check cross-browser lock before resuming
		const lockKey = 'wtt-global-timer-lock';
		const lockData = typeof localStorage !== 'undefined' ? localStorage.getItem(lockKey) : null;
		if (lockData) {
			try {
				const lock = JSON.parse(lockData);
				if (Date.now() - lock.timestamp < 30000) {
					state.conflictError = `Timer already running in another browser tab on task: "${lock.task}". Stop it first.`;
					return;
				}
			} catch {
				// Ignore
			}
		}

		state.conflictError = null;
		
		const resumedTimer = { ...state.pausedTimers[idx], status: 'In Progress' as TaskStatus, running: true };
		state.activeTimers = [...state.activeTimers, resumedTimer];
		state.pausedTimers.splice(idx, 1);
		
		// Acquire lock when resuming
		if (typeof localStorage !== 'undefined') {
			const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const taskTitle = `${resumedTimer.client} / ${resumedTimer.project} / ${resumedTimer.task}`;
			localStorage.setItem(lockKey, JSON.stringify({
				instanceId,
				task: taskTitle,
				timestamp: Date.now()
			}));
		}

		startInterval();
		persist();
	}

	function completeTimer(id: string) {
		const idx = state.activeTimers.findIndex(t => t.id === id);
		if (idx === -1) return;

		const target = state.activeTimers[idx];
		state.activeTimers.splice(idx, 1);

		// Release lock when completing
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('wtt-global-timer-lock');
		}

		const endTime = new Date().toISOString();
		const session: WorkSession = {
			id: generateId(),
			user: target.user,
			client: target.client,
			project: target.project,
			task: target.task,
			status: 'Completed',
			startTime: target.startTime,
			endTime,
			durationSeconds: target.elapsedSeconds
		};

		state.sessions = [session, ...state.sessions];
		persist();
	}

	function discardTimer(id: string) {
		const idx = state.activeTimers.findIndex(t => t.id === id);
		if (idx === -1) return;
		state.activeTimers.splice(idx, 1);
		
		// Release lock when discarding
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('wtt-global-timer-lock');
		}
		persist();
	}

	function resumePausedTimer(id: string) {
		const targetIdx = state.pausedTimers.findIndex(t => t.id === id);
		if (targetIdx === -1) return;

		const target = state.pausedTimers[targetIdx];
		const newPausedTimers = [...state.pausedTimers];
		newPausedTimers.splice(targetIdx, 1);
		
		const userActiveIndex = state.activeTimers.findIndex(t => t.user === target.user);
		if (userActiveIndex !== -1) {
			const toPause = { ...state.activeTimers[userActiveIndex], status: 'On Hold' as TaskStatus, running: false };
			newPausedTimers.unshift(toPause);
			state.activeTimers.splice(userActiveIndex, 1);
		}

		state.pausedTimers = newPausedTimers;
		state.activeTimers = [...state.activeTimers, { ...target, status: 'In Progress', running: true }];
		startInterval();
		persist();
	}

	function completePausedTimer(id: string) {
		const targetIdx = state.pausedTimers.findIndex(t => t.id === id);
		if (targetIdx === -1) return;

		const target = state.pausedTimers[targetIdx];
		state.pausedTimers = state.pausedTimers.filter(t => t.id !== id);

		const session: WorkSession = {
			id: target.id || generateId(),
			user: target.user,
			client: target.client,
			project: target.project,
			task: target.task,
			status: 'Completed',
			startTime: target.startTime,
			endTime: new Date().toISOString(),
			durationSeconds: target.elapsedSeconds
		};

		state.sessions = [session, ...state.sessions];
		persist();
	}

	function discardPausedTimer(id: string) {
		state.pausedTimers = state.pausedTimers.filter(t => t.id !== id);
		persist();
	}

	function deleteSession(id: string) {
		state.sessions = state.sessions.filter((s) => s.id !== id);
		persist();
	}

	function clearAll() {
		stopInterval();
		state = defaultState();
		persist();
	}

	// ── Interval helpers ──

	function startInterval() {
		if (intervalId !== null) clearInterval(intervalId);
		intervalId = setInterval(() => {
			let updated = false;
			state.activeTimers = state.activeTimers.map(timer => {
				if (timer.running) {
					updated = true;
					return {
						...timer,
						elapsedSeconds: timer.elapsedSeconds + 1
					};
				}
				return timer;
			});
			if (updated) persist();
		}, 1000);
	}

	function stopInterval() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function destroy() {
		stopInterval();
	}

	// ── Derived / computed ──

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
	}

	function isToday(isoString: string): boolean {
		if (!isoString) return false;
		const date = new Date(isoString);
		const today = new Date();
		return date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear();
	}

	// Report: grouped by user > client > project > task
	function getReport(): ReportUser[] {
		const map = new Map<string, Map<string, Map<string, Map<string, number>>>>();

		for (const s of state.sessions) {
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

	function getUserTotalTodaySeconds(user: string): number {
		let total = 0;
		for (const s of state.sessions) {
			if (s.user === user && isToday(s.startTime)) total += s.durationSeconds;
		}
		for (const at of state.activeTimers) {
			if (at.user === user && isToday(at.startTime)) total += at.elapsedSeconds;
		}
		for (const pt of state.pausedTimers) {
			if (pt.user === user && isToday(pt.startTime)) total += pt.elapsedSeconds;
		}
		return total;
	}

	function getUserShiftGoalHours(user: string): number {
		return state.shiftGoals[user] || 8;
	}

	function setUserShiftGoal(user: string, hours: number) {
		if (hours > 0) {
			state.shiftGoals[user] = hours;
			persist();
		}
	}

	function getTimerForIssue(issueNumber: number): ActiveTimer | undefined {
		const prefix = `#${issueNumber} `;
		return [...state.activeTimers, ...state.pausedTimers].find(
			(t) => t.client === 'GitHub' && t.project === 'Issues' && t.task.startsWith(prefix)
		);
	}

	return {
		get state() {
			return state;
		},
		get totalTodaySeconds() {
			return getUserTotalTodaySeconds(state.currentUser);
		},
		get currentShiftGoalSeconds() {
			return getUserShiftGoalHours(state.currentUser) * 3600;
		},
		get currentShiftGoalHours() {
			return getUserShiftGoalHours(state.currentUser);
		},
		init,
		switchUser,
		setShiftGoal,
		addClient,
		addProject,
		getProjects,
		addTask,
		getTasks,
		startTimer,
		startTimerFromGithubIssue,
		getTimerForIssue,
		addPendingTask,
		pauseTimer,
		resumeTimer,
		resumePausedTimer,
		completePausedTimer,
		discardPausedTimer,
		completeTimer,
		discardTimer,
		deleteSession,
		clearAll,
		destroy,
		formatDuration,
		getReport,
		getUserTotalTodaySeconds,
		getUserShiftGoalHours,
		setUserShiftGoal
	};
}

export const tracker = createTracker();

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
