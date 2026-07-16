import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit + integration tests run under Node (not the browser). End-to-end browser
// flows live under tests/e2e and run with Playwright instead.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/db/migrations/**'],
      // The crypto module is the privacy linchpin — hold it to a high bar.
      thresholds: {
        'src/crypto/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
