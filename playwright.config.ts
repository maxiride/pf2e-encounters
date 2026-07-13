import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
  },
  // ponytail: chromium-only smoke suite; add firefox/webkit projects if cross-browser bugs ever show up.
  // channel 'chromium' forces the full browser instead of chromium_headless_shell, which can hang
  // on close and stall workers for 5 minutes (microsoft/playwright#39753).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:9000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
