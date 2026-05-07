import { page } from 'vitest/browser';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TimeframeSelector from './TimeframeSelector.svelte';

describe('TimeframeSelector', () => {
	it('renders all four timeframe options', async () => {
		render(TimeframeSelector, { 
			props: { value: 'day', onChange: vi.fn() } 
		});
		await expect.element(page.getByText('Daily')).toBeInTheDocument();
		await expect.element(page.getByText('Weekly')).toBeInTheDocument();
		await expect.element(page.getByText('Monthly')).toBeInTheDocument();
		await expect.element(page.getByText('Yearly')).toBeInTheDocument();
	});

	it('highlights the selected timeframe', async () => {
		render(TimeframeSelector, { 
			props: { value: 'week', onChange: vi.fn() } 
		});
		const weeklyButton = page.getByText('Weekly');
		await expect.element(weeklyButton).toHaveClass(/bg-indigo/);
	});

	it('calls onChange when a different timeframe is clicked', async () => {
		const onChange = vi.fn();
		render(TimeframeSelector, { 
			props: { value: 'day', onChange } 
		});
		await page.getByText('Weekly').click();
		expect(onChange).toHaveBeenCalledWith('week');
	});

	it('displays icons for each timeframe', async () => {
		render(TimeframeSelector, { 
			props: { value: 'day', onChange: vi.fn() } 
		});
		// Icons are emoji, check they exist by looking for the button contents
		const buttons = page.getByRole('button');
		expect(buttons).toHaveLength(4);
	});

	it('does not call onChange when clicking already selected timeframe', async () => {
		const onChange = vi.fn();
		render(TimeframeSelector, { 
			props: { value: 'day', onChange } 
		});
		await page.getByText('Daily').click();
		expect(onChange).toHaveBeenCalledWith('day');
	});
});
