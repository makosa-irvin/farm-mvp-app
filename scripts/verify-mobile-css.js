#!/usr/bin/env node
// Verifies that mobile-specific CSS actually made it into the production
// build — not just that it's written in the source files.
//
// Why this exists as its own script, separate from `npm test`: this
// project has a confirmed history of CSS rules failing to compile into
// the final stylesheet while `npm run build` still exits 0 and the full
// Vitest suite still passes (jsdom doesn't evaluate real stylesheets, so
// it can't catch this class of bug at all). Two specific past incidents:
// an `@import` ordering mistake that silently dropped `.btn-primary`,
// `.btn-ghost`, and `.ledger-table` from the compiled CSS, and a
// component that stopped importing its own stylesheet entirely. Both
// were only caught by directly inspecting `dist/assets/*.css` after a
// real build — this script makes that inspection repeatable instead of
// ad hoc.
//
// Usage:
//   npm run build
//   node scripts/verify-mobile-css.js
//
// Exits non-zero (and fails loudly) if any expected rule is missing.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST_CSS_DIR = 'dist/assets';

// Each check is a marker string that should appear somewhere in the
// compiled CSS, paired with a human explanation of what breaks if it's
// missing. These intentionally check for compiled *output* patterns
// (e.g. "max-width: 639px" as Vite/PostCSS actually emits it), not a
// copy of the source file content.
const CHECKS = [
  {
    name: 'mobile media query breakpoint exists',
    pattern: /@media \(max-width:\s*639px\)/,
    ifMissing: 'None of the mobile-only styles (bottom nav, safe-area padding, touch targets, single-column forms) will apply on a real phone.',
  },
  {
    name: 'bottom nav is styled',
    pattern: /\._?mobileNav_[a-zA-Z0-9_]+\{[^}]*position:fixed/,
    ifMissing: 'The mobile bottom navigation bar exists in the DOM but has no fixed positioning — it would render inline in the page flow instead of pinned to the bottom of the screen.',
  },
  {
    name: 'safe-area inset padding exists',
    pattern: /env\(safe-area-inset-bottom\)/,
    ifMissing: 'The bottom nav could sit under a phone\'s home-indicator area on notched devices.',
  },
  {
    name: 'form inputs are 16px on mobile (iOS zoom prevention)',
    pattern: /font-size:16px/,
    ifMissing: 'iOS Safari will auto-zoom the page whenever a form input is focused, which is disorienting on a phone.',
  },
  {
    name: 'mobile touch targets meet the 44px minimum',
    pattern: /min-height:44px/,
    ifMissing: 'Buttons and inputs may render below the 44px minimum touch-target recommendation on mobile.',
  },
  {
    name: 'core buttons are styled (regression check for the @import-ordering bug)',
    pattern: /\.btn-primary\{/,
    ifMissing: 'Every primary button in the app would render completely unstyled — this exact failure has happened before in this project via an @import-ordering mistake in index.css.',
  },
];

function findCssFile() {
  let files;
  try {
    files = readdirSync(DIST_CSS_DIR);
  } catch {
    console.error(`✗ ${DIST_CSS_DIR} doesn't exist. Run "npm run build" first.`);
    process.exit(1);
  }
  const cssFile = files.find((f) => f.endsWith('.css'));
  if (!cssFile) {
    console.error(`✗ No .css file found in ${DIST_CSS_DIR}. Run "npm run build" first.`);
    process.exit(1);
  }
  return join(DIST_CSS_DIR, cssFile);
}

function main() {
  const cssPath = findCssFile();
  const css = readFileSync(cssPath, 'utf8');

  console.log(`Checking ${cssPath} (${(css.length / 1024).toFixed(1)} KB)\n`);

  let failures = 0;
  for (const check of CHECKS) {
    const found = check.pattern.test(css);
    console.log(`${found ? '✓' : '✗'} ${check.name}`);
    if (!found) {
      console.log(`  → ${check.ifMissing}`);
      failures++;
    }
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} of ${CHECKS.length} checks failed. The build succeeded and Vitest would stay green — this is exactly the class of bug those checks can't catch.`);
    process.exit(1);
  }

  console.log(`All ${CHECKS.length} checks passed.`);
}

main();
