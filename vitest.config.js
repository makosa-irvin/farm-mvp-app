import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/unit/setup.js'],
      // Includes tests/unit/** (the vast majority of this project's tests)
      // and any co-located *.test.{js,jsx} file under src/ (currently
      // just src/components/OnboardingTour.test.jsx). That file was
      // previously silently excluded from every test run — including
      // `npm test` and CI — since this pattern only matched tests/unit/.
      // Its 9 tests existed but gave zero real protection.
      include: ['tests/unit/**/*.{test,spec}.{js,jsx}', 'src/**/*.{test,spec}.{js,jsx}'],
      restoreMocks: true,
    },
  })
);
