import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:8787', locale: 'it-IT' },
  webServer: {
    command: 'npm run build && npx wrangler dev --port 8787',
    url: 'http://localhost:8787',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
