import { expect, test } from '@playwright/test';

test('user can open github tab and start timer from issue row', async ({ page }) => {
	await page.route('**/api/github/options/owners', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ owners: ['acme'] })
		});
	});

	await page.route('**/api/github/options/repos?owner=*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ repos: ['repo'] })
		});
	});

	await page.route('**/api/github/issues?**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				issues: [
					{
						number: 55,
						title: 'Track integration',
						state: 'OPEN',
						labels: ['feature'],
						assignees: ['tom'],
						milestone: 'v1',
						createdAt: '2026-01-01T00:00:00Z',
						updatedAt: '2026-01-02T00:00:00Z',
						url: 'https://github.com/acme/repo/issues/55'
					}
				]
			})
		});
	});

	await page.goto('/');
	await page.getByRole('button', { name: /github/i }).click();

	await page.getByLabel('Owner').fill('acme');
	await page.getByLabel('Repo').fill('repo');
	await page.getByRole('button', { name: /load issues/i }).click();

	await expect(page.getByText('#55 Track integration')).toBeVisible();
	await expect(page.getByText('Assignees: tom')).toBeVisible();
	await expect(page.getByText('Milestone: v1')).toBeVisible();
	await page.getByRole('button', { name: /start/i }).click();
	await page.getByRole('button', { name: /timer/i }).click();
	await expect(page.getByText('#55 Track integration')).toBeVisible();
});

test('user can create issue with mode selection', async ({ page }) => {
	await page.route('**/api/github/options/owners', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ owners: ['acme'] })
		});
	});

	await page.route('**/api/github/options/repos?owner=*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ repos: ['repo'] })
		});
	});

	let createCalled = false;
	await page.route('**/api/github/issues/create', async (route) => {
		createCalled = true;
		await route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				number: 81,
				title: 'Track deployment prep',
				url: 'https://github.com/acme/repo/issues/81',
				mode: 'issue-and-project',
				projectLinked: true
			})
		});
	});

	await page.goto('/');
	await page.getByRole('button', { name: /github/i }).click();
	await page.getByRole('button', { name: /add github task/i }).click();

	await page.getByLabel('Owner').fill('acme');
	await page.getByLabel('Repo').fill('repo');
	await page.getByLabel('Title').fill('Track deployment prep');
	await page.getByLabel('Mode').selectOption('issue-and-project');
	await page.getByLabel('Project ID').fill('PVT_xxx');

	await page.getByRole('button', { name: /create/i }).click();
	await expect
		.poll(() => createCalled, {
			timeout: 5000
		})
		.toBe(true);
	await expect(page.getByRole('dialog')).toBeHidden();
});
