import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "line",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: { baseURL: "http://localhost:3000" },
  /* Public-page tests count stories, and admin tests publish some, so the admin tests run after. */
  projects: [
    { name: "chromium", testIgnore: /admin-.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "admin", testMatch: /admin-.*\.spec\.ts/, dependencies: ["chromium"], use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    /* Never reuse a server that is already running: it might have the real Google Drive settings, and the upload tests
       would then write test files into the real Fic Library. A fresh server always gets the mock below. */
    reuseExistingServer: false,
    timeout: 120_000,
    /* The app talks to a local stand-in for the Google Drive bridge during tests, never the real Drive. */
    env: { ...(process.env as Record<string, string>), DRIVE_BRIDGE_URL: "http://127.0.0.1:4011/exec", DRIVE_BRIDGE_TOKEN: "mock-token-for-browser-tests" },
  },
});
