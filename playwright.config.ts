import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL:
      process.env.PREVIEW_URL ??
      "https://cron-explainer-6xws9j627-elainegao.vercel.app",
  },
  reporter: [["list"]],
});
