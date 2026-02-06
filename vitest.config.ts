import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: ".vite-temp",
  test: {
    include: ["packages/**/*.test.ts", "integrations/**/*.test.ts", "integrations/**/*.test.tsx"],
  },
});
