import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// RNF-10.3.1: el piso es >85 % en los cuatro indicadores. Es un piso, no un
// techo: si una PR lo supera, no se baja el listón para hacerla pasar.
const MINIMUM_COVERAGE = 86

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        thresholds: {
          statements: MINIMUM_COVERAGE,
          branches: MINIMUM_COVERAGE,
          functions: MINIMUM_COVERAGE,
          lines: MINIMUM_COVERAGE,
        },
      },
    },
  }),
)
