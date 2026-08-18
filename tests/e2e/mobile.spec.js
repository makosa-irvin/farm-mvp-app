import { test, expect } from '@playwright/test';
import { clearAppState, fieldByLabel } from './helpers.js';

// Runs only under the 'mobile' project (see playwright.config.js) — a
// Pixel 5 viewport (393px wide, touch-capable). Everything here checks
// behavior that's specifically mobile-conditional: the responsive nav
// swap, touch-target sizing, single-column form layout, and the absence
// of horizontal overflow. None of this can be verified by the jsdom-based
// unit tests, since jsdom doesn't evaluate CSS media queries the way a
// real browser viewport does — that gap is exactly why this file exists.

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('the mobile bottom nav is visible and usable; the desktop top nav is not', async ({ page }) => {
  // The desktop-only Refresh button (`hidden sm:flex` in Header.jsx)
  // should be genuinely absent from a real accessibility-tree query at
  // this width, not just small.
  await expect(page.getByRole('button', { name: 'Refresh' })).toHaveCount(0);

  // The four primary mobile destinations should each be one visible,
  // clickable tap away.
  for (const label of ['Home', 'Log', 'Stock', 'Expenses']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.getByText('Farm group')).toBeVisible();
});

test('the "More" menu reveals Groups and Analytics, and both are reachable', async ({ page }) => {
  await page.getByText('More').click();
  await expect(page.getByRole('button', { name: 'Groups' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible();

  await page.getByRole('button', { name: 'Groups' }).click();
  await expect(page.getByText('Add a farm group')).toBeVisible();
});

test('primary touch targets meet the 44px minimum', async ({ page }) => {
  // Spot-checks the elements this project's mobile CSS pass specifically
  // targeted (see the `@media (max-width: 639px)` block in index.css) —
  // not exhaustive, but covers the highest-traffic ones: bottom nav
  // items, and a primary form button.
  const homeButton = page.getByRole('button', { name: 'Home', exact: true });
  const homeBox = await homeButton.boundingBox();
  expect(homeBox.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: 'Log', exact: true }).click();
  const saveButton = page.getByRole('button', { name: 'Save log entry' });
  const saveBox = await saveButton.boundingBox();
  expect(saveBox.height).toBeGreaterThanOrEqual(44);
});

test('form inputs use 16px+ text, avoiding iOS Safari\'s auto-zoom-on-focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  const amountInput = fieldByLabel(page, 'How much did you pay? (KSh)');
  const fontSize = await amountInput.evaluate((el) => window.getComputedStyle(el).fontSize);
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
});

test('two-column form grids collapse to one column at mobile width', async ({ page }) => {
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  // "What was it for?" and "How much did you pay?" sit in the same
  // grid-cols-2 row in the source (ExpensesView.jsx) — at mobile width
  // the CSS rule `.farm-app form .grid-cols-2 { grid-template-columns:
  // 1fr !important; }` should stack them, so the amount field ends up
  // below the category field rather than beside it.
  const categoryBox = await page.locator('select').first().boundingBox();
  const amountInput = fieldByLabel(page, 'How much did you pay? (KSh)');
  const amountBox = await amountInput.boundingBox();
  expect(amountBox.y).toBeGreaterThan(categoryBox.y + categoryBox.height - 5); // stacked, not side-by-side
});

test('no horizontal scrolling at mobile width, on the Dashboard or any tab', async ({ page }) => {
  for (const tabName of ['Home', 'Log', 'Stock', 'Expenses']) {
    await page.getByRole('button', { name: tabName, exact: true }).click();
    const overflowsHorizontally = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowsHorizontally, `${tabName} should not force horizontal scroll`).toBe(false);
  }
});

test('the quick-actions button opens, offers the expected shortcuts, and navigates', async ({ page }) => {
  await page.getByLabel('Open quick actions').click();
  await expect(page.getByRole('button', { name: 'Daily log' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stock' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expense' })).toBeVisible();

  await page.getByRole('button', { name: 'Expense' }).click();
  await expect(page.getByText('Record money spent')).toBeVisible();
  // The menu should close after navigating, not stay open over the new screen.
  await expect(page.getByLabel('Close quick actions')).toHaveCount(0);
});

test('the bottom nav and quick-actions button do not visually collide', async ({ page }) => {
  // Both are fixed-position elements sharing the bottom of the screen
  // (see the CSS: .mobileNav at bottom: 0, .mobile-quick-actions__fab at
  // bottom: calc(76px + safe-area)) — a real risk any time two fixed
  // elements share a screen edge is one silently overlapping the other.
  const navBox = await page.locator('nav[aria-label="Primary navigation"]').boundingBox();
  const fabBox = await page.getByLabel('Open quick actions').boundingBox();
  expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y + 1); // FAB sits above the nav bar, not inside/overlapping it
});
