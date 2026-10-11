import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx tsx tests/mocks/tmdb-server.ts",
      port: 4010,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/`,
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        ...(process.env as Record<string, string>),
        TMDB_API_TOKEN: "test-token",
        TMDB_BASE_URL: "http://localhost:4010/3",
        NETFLIX_PROVIDER_IDS: "8",
      },
    },
  ],
});
