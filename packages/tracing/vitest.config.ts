import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.bench.ts"],
  },
  benchmark: {
    include: ["tests/**/*.bench.ts"],
    reporters: ["default"],
  },
});
