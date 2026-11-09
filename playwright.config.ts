import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

// Browser tests run against the production build (vite preview), service worker included.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
    // Locally, use the installed Google Chrome; CI installs Playwright's Chromium.
    ...(CI ? {} : { channel: 'chrome' }),
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'] } }],
})
