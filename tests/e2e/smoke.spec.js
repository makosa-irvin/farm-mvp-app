import { test, expect } from '@playwright/test';
import { clearAppState } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('app loads and every tab is reachable', async ({ page }) => {
  await expect(page.getByText('Field Ledger')).toBeVisible();

  for (const tabName of ['Daily log', 'Expenses', 'Stock', 'Units', 'Analytics', 'Dashboard']) {
    await page.getByRole('button', { name: tabName, exact: true }).click();
  }
});

test('starts from a clean, empty state', async ({ page }) => {
  await page.getByRole('button', { name: 'Units', exact: true }).click();
  await expect(page.getByText('Add a production unit')).toBeVisible();

  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await expect(page.getByText('Nothing tracked yet')).toBeVisible();
});
