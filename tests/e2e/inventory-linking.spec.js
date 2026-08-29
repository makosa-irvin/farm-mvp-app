import { test, expect } from '@playwright/test';
import { clearAppState, fieldByLabel } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('recording a feed expense increases inventory, and logging feed use decreases it', async ({ page }) => {
  // --- Add a production unit ---
  await page.getByRole('button', { name: 'Groups', exact: true }).click();
  await fieldByLabel(page, 'What should we call it?').fill('Layer House A');
  await page.getByRole('button', { name: 'Add group' }).click();
  await expect(page.getByText('Layer House A')).toBeVisible();

  // --- Add a Feed inventory item, starting at zero stock ---
  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await fieldByLabel(page, 'Item name').fill('Layer Mash');
  await fieldByLabel(page, 'Category').selectOption('Feed');
  await fieldByLabel(page, 'Unit', { exact: true }).fill('kg');
  await page.getByRole('button', { name: 'Add item' }).click();

  const inventoryCard = page.locator('div.rounded-2xl.px-5.py-4.flex.items-center.justify-between').filter({ hasText: 'Layer Mash' });
  await expect(inventoryCard).toContainText('0.0 kg');

  // --- THE CORE BEHAVIOR: record a feed purchase via Expenses ---
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await fieldByLabel(page, 'How much did you pay? (KSh)').fill('105');
  await fieldByLabel(page, 'Did you buy stock? (optional)').selectOption({ label: 'Layer Mash (kg)' });
  await fieldByLabel(page, 'How much stock?').fill('150');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('KSh 105')).toBeVisible();

  // --- Inventory should have increased, with no second manual step ---
  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await expect(inventoryCard).toContainText('150.0 kg');

  // --- THE OTHER HALF: log feed consumption ---
  await page.getByRole('button', { name: 'Daily log', exact: true }).click();
  await page.getByRole('button', { name: 'Layer House A' }).click();
  // "Stock used" is collapsed by default; this one click both opens it
  // and adds the first empty row.
  await page.getByText('+ Add stock used today').click();
  // The item option's label includes a live balance ("Layer Mash ·
  // 150.0 kg"), so it can't be matched with an exact string — look up
  // its value by partial text instead, then select by that value.
  const stockItemSelect = page.getByLabel('Stock item');
  const stockItemValue = await stockItemSelect.locator('option', { hasText: 'Layer Mash' }).getAttribute('value');
  await stockItemSelect.selectOption(stockItemValue);
  await page.getByLabel('Quantity used').fill('45');
  await page.getByRole('button', { name: 'Save log entry' }).click();

  // --- Inventory should have decreased by exactly what was consumed ---
  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await expect(inventoryCard).toContainText('105.0 kg');
});

test('deleting a feed expense whose stock is already in use is blocked, not silently applied', async ({ page }) => {
  // Same setup as above, compressed.
  await page.getByRole('button', { name: 'Groups', exact: true }).click();
  await fieldByLabel(page, 'What should we call it?').fill('Layer House A');
  await page.getByRole('button', { name: 'Add group' }).click();

  await page.getByRole('button', { name: 'Stock', exact: true }).click();
  await fieldByLabel(page, 'Item name').fill('Layer Mash');
  await fieldByLabel(page, 'Category').selectOption('Feed');
  await fieldByLabel(page, 'Unit', { exact: true }).fill('kg');
  await page.getByRole('button', { name: 'Add item' }).click();

  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await fieldByLabel(page, 'How much did you pay? (KSh)').fill('105');
  await fieldByLabel(page, 'Did you buy stock? (optional)').selectOption({ label: 'Layer Mash (kg)' });
  await fieldByLabel(page, 'How much stock?').fill('150');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Daily log', exact: true }).click();
  await page.getByRole('button', { name: 'Layer House A' }).click();
  await page.getByText('+ Add stock used today').click();
  const stockItemSelect = page.getByLabel('Stock item');
  const stockItemValue = await stockItemSelect.locator('option', { hasText: 'Layer Mash' }).getAttribute('value');
  await stockItemSelect.selectOption(stockItemValue);
  await page.getByLabel('Quantity used').fill('45');
  await page.getByRole('button', { name: 'Save log entry' }).click();

  // Now try to delete the expense — 45kg of its 150kg is already consumed.
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.getByRole('button', { name: 'Delete expense' }).click();

  // The expense should still be there, and the deletion toast should
  // explain why rather than silently removing it.
  await expect(page.getByText('KSh 105')).toBeVisible();
  await expect(page.getByText(/already been used elsewhere/)).toBeVisible();
});
