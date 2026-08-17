// The app's <FieldLabel> renders a plain <label> with no `for`/`id` linking
// it to its input — confirmed via a Testing Library DOM check before
// writing these tests. That means Playwright's usual getByLabel() won't
// find these fields, since it relies on that association (or the input
// being nested inside the label, which isn't the case here either). This
// walks from the label's text to its parent <div>, then finds the
// input/select/textarea inside that same wrapper.
export function fieldByLabel(page, labelText, { exact = false } = {}) {
  const escaped = labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = exact ? new RegExp(`^${escaped}$`) : labelText;
  return page
    .locator('label', { hasText: matcher })
    .locator('xpath=..')
    .locator('input, select, textarea')
    .first();
}

export async function clearAppState(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}
