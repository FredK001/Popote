import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same env files as Next (.env.local): signed-in journeys need the real Supabase keys.
loadEnvConfig(process.cwd());

const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      // Reference viewport of the design: 390 × 844.
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    // Simulated AI for the add-recipe journey (never enabled on Netlify).
    command: `AI_FAKE_PROVIDER=1 E2E_ALLOW_FAKE_AI=1 npm run start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
