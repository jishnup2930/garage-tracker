import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI
// An uncommon port, and always our own server: reusing whatever answers on a port once ran the tests against another app.
const PORT = 4791

// Browser tests run against the production build (vite preview), service worker included.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    // Locally, use the installed Google Chrome; CI installs Playwright's Chromium.
    ...(CI ? {} : { channel: 'chrome' }),
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'] } }],
})
