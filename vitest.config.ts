import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: ".vite-temp",
  test: {
    projects: ["packages/*", "integrations/*", "tooling/*", "libs/*/*"],
  },
});
