import { defineConfig, devices } from "@playwright/test";

// Live Supabase runs load .env.local (NEXT_PUBLIC_* + E2E_TEST_* creds) so the
// guarded Supabase specs run and the webServer boots in Supabase mode. Set
// WV_FORCE_DEMO=1 to force the localStorage demo backend for the regression run.
if (process.env.WV_FORCE_DEMO) {
  process.env.NEXT_PUBLIC_DATA_BACKEND = "local";
} else {
  try {
    (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(".env.local");
  } catch {
    /* .env.local absent — falls back to demo mode */
  }
}

const PORT = 3210;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E config for Web Vision. Runs against the production server (`next start`)
 * so screenshots are free of the dev indicator. Run `npm run build` first; the
 * webServer is reused if already running.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
