import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.test-d.ts", "src/**/index.ts"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 90,
        lines: 80,
      },
    },
  },
});
