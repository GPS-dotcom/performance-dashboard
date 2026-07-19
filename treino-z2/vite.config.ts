/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split third-party code into its own chunk. It changes far less
        // often than app code, so browsers can keep reusing the cached
        // vendor chunk across deploys that only touch app code -- instead
        // of invalidating everything on every release.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/types.ts',
        'src/**/index.ts',
      ],
      // Coverage goals per TESTING.md: services/api are the critical, external-facing
      // data boundary (100%); engines/hooks/utils are business logic (90%);
      // components are UI (80%).
      thresholds: {
        // Floor for anything not covered by a more specific bucket below (e.g. App.tsx).
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
        'src/services/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/api/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/engines/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/hooks/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/utils/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        // Metrics Engine coverage floor, per the explicit request that created it.
        'src/metrics/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        // Intelligence Engine coverage floor, per the explicit request that created it.
        'src/intelligence/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        // Prediction Engine coverage floor, per the explicit request that created it.
        'src/prediction/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/components/**': { statements: 80, branches: 80, functions: 80, lines: 80 },
      },
    },
  },
})
