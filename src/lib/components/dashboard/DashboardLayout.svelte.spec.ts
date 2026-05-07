import { page } from 'vitest/browser';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DashboardLayout from './DashboardLayout.svelte';
import { tracker } from '$lib/stores/tracker.svelte';

// Mock Chart.js components
vi.mock('svelte-chartjs', () => ({
	Doughnut: () => null,
	Bar: () => null
}));

describe('DashboardLayout', () => {
	beforeEach(() => {
		tracker.init();
		tracker.state.sessions = [];
		tracker.state.activeTimers = [];
		tracker.state.pausedTimers = [];
	});

	it('renders dashboard with header and welcome message', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('Dashboard')).toBeInTheDocument();
		await expect.element(page.getByText(/Welcome back/)).toBeInTheDocument();
	});

	it('displays timeframe selector with all options', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('Daily')).toBeInTheDocument();
		await expect.element(page.getByText('Weekly')).toBeInTheDocument();
		await expect.element(page.getByText('Monthly')).toBeInTheDocument();
		await expect.element(page.getByText('Yearly')).toBeInTheDocument();
	});

	it('renders hero metric cards', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('Time Tracked')).toBeInTheDocument();
		await expect.element(page.getByText('Shift Goal')).toBeInTheDocument();
		await expect.element(page.getByText('Active Timers')).toBeInTheDocument();
		await expect.element(page.getByText('Pending Issues')).toBeInTheDocument();
	});

	it('renders chart sections', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('Time Allocation')).toBeInTheDocument();
		await expect.element(page.getByText('Activity Velocity')).toBeInTheDocument();
		await expect.element(page.getByText('Status Distribution')).toBeInTheDocument();
	});

	it('renders quick access widgets', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('Now Tracking')).toBeInTheDocument();
		await expect.element(page.getByText('Up Next')).toBeInTheDocument();
		await expect.element(page.getByText('Recent Sessions')).toBeInTheDocument();
	});

	it('changes timeframe when selector is clicked', async () => {
		render(DashboardLayout);
		const weeklyButton = page.getByText('Weekly');
		await weeklyButton.click();
		// Verify the button has active styling (bg-indigo-600)
		await expect.element(weeklyButton).toHaveClass(/bg-indigo/);
	});

	it('displays empty states when no data available', async () => {
		render(DashboardLayout);
		await expect.element(page.getByText('No active timers')).toBeInTheDocument();
		await expect.element(page.getByText('No completed sessions')).toBeInTheDocument();
	});
});
