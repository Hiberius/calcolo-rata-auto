import { defineConfig, devices } from '@playwright/test';

// 8787 su questo Mac è occupata da un altro servizio: porta dedicata, sovrascrivibile.
const PORTA = process.env.PORTA ?? '8799';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: `http://localhost:${PORTA}`, locale: 'it-IT' },
  webServer: {
    command: `npm run build && npx wrangler dev --port ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
