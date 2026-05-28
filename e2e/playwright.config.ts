import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../server/.env.test") });

const testEnv = {
  NODE_ENV: "test",
  DATABASE_URL: process.env.DATABASE_URL!,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  CLIENT_ORIGIN: "http://localhost:5184",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5184",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  webServer: [
    {
      command: "bun src/index.ts",
      cwd: path.resolve(__dirname, "../server"),
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: testEnv,
    },
    {
      command: "bun run dev",
      cwd: path.resolve(__dirname, "../client"),
      url: "http://localhost:5184",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
