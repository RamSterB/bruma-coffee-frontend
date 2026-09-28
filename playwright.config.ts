import { defineConfig, devices } from '@playwright/test'

/**
 * El recorrido de compra, contra la tienda publicada.
 *
 * **La tienda es la de `PLAYWRIGHT_BASE_URL`, que por defecto es la desplegada.** No hay
 * servidor de pruebas: lo que se compra es lo que hay en el bucket y lo que se cobra es lo
 * que hay en la base. Es lo que hace que estas pruebas sirvan de algo: los fallos que
 * aparecen aqui son los que no se ven con jsdom ni con supertest.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // El recorrido compra de verdad, asi que dos workers a la vez se pelean por el mismo
  // cafe y el recuento de stock sale raro. De uno en uno.
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://don1v5z5j5m3b.cloudfront.net',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
