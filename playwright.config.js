import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // The existing specs (smoke, inventory-linking) assume the desktop
    // top nav is clickable. At mobile viewport widths that nav is
    // legitimately CSS-hidden (`hidden sm:block` — see Header.jsx), not
    // just visually small, so Playwright's click() correctly refuses to
    // click it there. Explicitly excluding mobile.spec.js keeps desktop
    // tests off the mobile project rather than letting them fail for a
    // reason that has nothing to do with an actual bug.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/mobile.spec.js' },
    // Android, not iPhone: Android holds the large majority of the
    // Kenyan smartphone market, so this is the more realistic target
    // device for this app's actual persona. Also practical — this
    // device preset defaults to Chromium (`defaultBrowserType:
    // 'chromium'`), matching the only browser this project installs
    // (`npx playwright install chromium`); an iOS device preset would
    // default to WebKit, which isn't installed here.
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: '**/mobile.spec.js' },
  ],
});
