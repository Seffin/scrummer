import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuickAccessWidget from './QuickAccessWidget.svelte';
import { tracker } from '$lib/stores/tracker.svelte';
import { githubStore } from '$lib/stores/github.svelte';

vi.mock('$lib/stores/github.svelte', () => ({
	githubStore: {
		filteredIssues: []
	}
}));

describe('QuickAccessWidget', () => {
	beforeEach(() => {
		tracker.init();
		tracker.state.sessions = [];
		tracker.state.activeTimers = [];
		tracker.state.pausedTimers = [];
		tracker.state.currentUser = 'Test User';
		githubStore.filteredIssues = [];
		vi.clearAllMocks();
	});

	it('renders all three quick access sections', async () => {
		render(QuickAccessWidget);
		await expect.element(page.getByText('Now Tracking')).toBeInTheDocument();
		await expect.element(page.getByText('Up Next')).toBeInTheDocument();
		await expect.element(page.getByText('Recent Sessions')).toBeInTheDocument();
	});

	it('displays active timer with controls', async () => {
		tracker.state.activeTimers = [
			{ id: '1', client: 'GitHub', project: 'Issues', task: '#123 Fix bug', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 600, running: true, status: 'In Progress' }
		];
		render(QuickAccessWidget);
		await expect.element(page.getByText('#123 Fix bug')).toBeInTheDocument();
		await expect.element(page.getByTitle('Pause')).toBeInTheDocument();
		await expect.element(page.getByTitle('Complete')).toBeInTheDocument();
	});

	it('displays paused timer with resume button', async () => {
		tracker.state.pausedTimers = [
			{ id: '1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 300, running: false, status: 'On Hold' }
		];
		render(QuickAccessWidget);
		await expect.element(page.getByTitle('Resume')).toBeInTheDocument();
	});

	it('displays GitHub issues in Up Next', async () => {
		githubStore.filteredIssues = [
			{ number: 123, title: 'Fix critical bug', state: 'OPEN', labels: ['bug'], assignees: [], milestone: null, createdAt: null, updatedAt: null, url: '' }
		];
		render(QuickAccessWidget);
		await expect.element(page.getByText('#123')).toBeInTheDocument();
		await expect.element(page.getByText('Fix critical bug')).toBeInTheDocument();
		await expect.element(page.getByText('bug')).toBeInTheDocument();
	});

	it('displays recent completed sessions', async () => {
		const now = new Date();
		tracker.state.sessions = [
			{ id: '1', client: 'Client', project: 'Project', task: 'Completed Task', user: 'Test User', startTime: now.toISOString(), endTime: now.toISOString(), durationSeconds: 1800, status: 'Completed' }
		];
		render(QuickAccessWidget);
		await expect.element(page.getByText('Completed Task')).toBeInTheDocument();
		await expect.element(page.getByText('30m')).toBeInTheDocument();
	});

	it('shows empty state for Now Tracking when no timers', async () => {
		render(QuickAccessWidget);
		await expect.element(page.getByText('No active timers')).toBeInTheDocument();
	});

	it('shows empty state for Up Next when no issues', async () => {
		render(QuickAccessWidget);
		await expect.element(page.getByText('No open issues')).toBeInTheDocument();
	});

	it('shows empty state for Recent Sessions when no sessions', async () => {
		render(QuickAccessWidget);
		await expect.element(page.getByText('No completed sessions')).toBeInTheDocument();
	});

	it('calls pauseTimer when pause button clicked', async () => {
		const pauseSpy = vi.spyOn(tracker, 'pauseTimer');
		tracker.state.activeTimers = [
			{ id: 'timer-1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 600, running: true, status: 'In Progress' }
		];
		render(QuickAccessWidget);
		await page.getByTitle('Pause').click();
		expect(pauseSpy).toHaveBeenCalledWith('timer-1');
	});

	it('calls resumeTimer when resume button clicked', async () => {
		const resumeSpy = vi.spyOn(tracker, 'resumeTimer');
		tracker.state.pausedTimers = [
			{ id: 'timer-1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 300, running: false, status: 'On Hold' }
		];
		render(QuickAccessWidget);
		await page.getByTitle('Resume').click();
		expect(resumeSpy).toHaveBeenCalledWith('timer-1');
	});

	it('calls completeTimer when complete button clicked', async () => {
		const completeSpy = vi.spyOn(tracker, 'completeTimer');
		tracker.state.activeTimers = [
			{ id: 'timer-1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 600, running: true, status: 'In Progress' }
		];
		render(QuickAccessWidget);
		await page.getByTitle('Complete').click();
		expect(completeSpy).toHaveBeenCalledWith('timer-1');
	});

	it('calls startTimerFromGithubIssue when issue play button clicked', async () => {
		const startSpy = vi.spyOn(tracker, 'startTimerFromGithubIssue');
		githubStore.filteredIssues = [
			{ number: 123, title: 'Issue Title', state: 'OPEN', labels: [], assignees: [], milestone: null, createdAt: null, updatedAt: null, url: '' }
		];
		render(QuickAccessWidget);
		await page.getByTitle('Start timer').click();
		expect(startSpy).toHaveBeenCalledWith(
			expect.objectContaining({ number: 123, title: 'Issue Title' }),
			'Test User'
		);
	});
});
