import { defineConfig, devices } from '@playwright/test';

const SERVER_PORT = 3101;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    {
      command: 'pnpm --filter server start',
      cwd: '../..',
      url: `http://localhost:${SERVER_PORT}/health`,
      reuseExistingServer: false,
      env: { PORT: String(SERVER_PORT), ENABLE_TEST_MAP: '1', CORS_ORIGIN: `http://localhost:${WEB_PORT}` },
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { VITE_SERVER_URL: `http://localhost:${SERVER_PORT}`, VITE_FAKE_VIEWER: '1', VITE_ENABLE_TEST_MAP: '1' },
    },
  ],
});
