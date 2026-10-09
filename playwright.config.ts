import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173/chuan-zi/',
    browserName: 'chromium',
    channel: 'chrome',
    launchOptions: { args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'npm run server', url: 'http://localhost:8787/health', reuseExistingServer: true },
    { command: 'npm run preview -- --port 4173 --base /chuan-zi/', url: 'http://localhost:4173/chuan-zi/', reuseExistingServer: true },
  ],
});
