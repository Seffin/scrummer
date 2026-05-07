import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HeroMetricsWidget from './HeroMetricsWidget.svelte';
import { tracker } from '$lib/stores/tracker.svelte';
import { githubStore } from '$lib/stores/github.svelte';

vi.mock('$lib/stores/github.svelte', () => ({
	githubStore: {
		filteredIssues: []
	}
}));

describe('HeroMetricsWidget', () => {
	beforeEach(() => {
		tracker.init();
		tracker.state.sessions = [];
		tracker.state.activeTimers = [];
		tracker.state.pausedTimers = [];
		tracker.state.currentUser = 'Test User';
		tracker.state.shiftGoals = { 'Test User': 8 };
		githubStore.filteredIssues = [];
	});

	it('renders all four metric cards', async () => {
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		await expect.element(page.getByText('Time Tracked')).toBeInTheDocument();
		await expect.element(page.getByText('Shift Goal')).toBeInTheDocument();
		await expect.element(page.getByText('Active Timers')).toBeInTheDocument();
		await expect.element(page.getByText('Pending Issues')).toBeInTheDocument();
	});

	it('displays 0h 0m when no time tracked', async () => {
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		await expect.element(page.getByText('0m')).toBeInTheDocument();
	});

	it('calculates shift goal progress correctly', async () => {
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		// With 0 seconds tracked and 8 hour goal, progress should be 0%
		await expect.element(page.getByText('0%')).toBeInTheDocument();
	});

	it('displays active timer count', async () => {
		tracker.state.activeTimers = [
			{ id: '1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: new Date().toISOString(), elapsedSeconds: 60, running: true, status: 'In Progress' }
		];
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		await expect.element(page.getByText('1')).toBeInTheDocument();
	});

	it('displays pending issues count', async () => {
		githubStore.filteredIssues = [
			{ number: 1, title: 'Issue 1', state: 'OPEN', labels: [], assignees: [], milestone: null, createdAt: null, updatedAt: null, url: '' },
			{ number: 2, title: 'Issue 2', state: 'OPEN', labels: [], assignees: [], milestone: null, createdAt: null, updatedAt: null, url: '' }
		];
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		await expect.element(page.getByText('2')).toBeInTheDocument();
	});

	it('updates time tracked based on timeframe', async () => {
		// Add a session from yesterday
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		tracker.state.sessions = [
			{ id: '1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: yesterday.toISOString(), endTime: yesterday.toISOString(), durationSeconds: 3600, status: 'Completed' }
		];
		
		// For 'day' timeframe, should show 0 (session was yesterday)
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		await expect.element(page.getByText('0m')).toBeInTheDocument();
		
		// For 'week' timeframe, should show 1h
		render(HeroMetricsWidget, { props: { timeframe: 'week' } });
		await expect.element(page.getByText('1h 00m')).toBeInTheDocument();
	});

	it('calculates shift goal percentage correctly', async () => {
		const today = new Date();
		tracker.state.sessions = [
			{ id: '1', client: 'Client', project: 'Project', task: 'Task', user: 'Test User', startTime: today.toISOString(), endTime: today.toISOString(), durationSeconds: 14400, status: 'Completed' }
		];
		render(HeroMetricsWidget, { props: { timeframe: 'day' } });
		// 4 hours out of 8 hour goal = 50%
		await expect.element(page.getByText('50%')).toBeInTheDocument();
	});
});
