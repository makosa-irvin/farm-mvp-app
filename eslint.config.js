import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

// Flat config (ESLint 9+). eslint-config-prettier is last on purpose —
// it turns off every ESLint rule that only exists to enforce formatting
// (indentation, quote style, etc.), so ESLint and Prettier never fight
// over the same thing. ESLint still catches real bugs (unused
// variables, missing hook dependencies, ...); Prettier owns formatting
// entirely.
export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'public/sw.js'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules, // React 17+ JSX transform — no `import React` required
      ...reactHooks.configs.recommended.rules,

      // Genuinely useful signal, not formatting: warns if a fast-refresh
      // boundary exports something non-component. Downgraded to a
      // warning rather than an error since a few files legitimately
      // export a constant alongside a component (e.g. TABS, STORAGE_KEY).
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // React 17+ JSX transform means `React` doesn't need to be in
      // scope just to write JSX.
      'react/react-in-jsx-scope': 'off',
      // This codebase doesn't type-check prop shapes today; enabling
      // this now would mean adding PropTypes to every existing
      // component before the linter would pass at all. Worth turning on
      // deliberately later, not as a side effect of adding ESLint.
      'react/prop-types': 'off',

      // Prefix with _ to intentionally mark a caught error or argument
      // as unused (e.g. `catch (_err)`) without triggering a warning.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
    settings: { react: { version: 'detect' } },
  },

  // Test files: add Vitest's globals (describe/it/expect/vi/...) so
  // ESLint doesn't flag every test file for "undefined" globals.
  {
    files: ['tests/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
  },

  // Node-context config/script files (this repo has no separate
  // server, but these files run under Node, not a browser).
  {
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },

  prettierConfig,
];
