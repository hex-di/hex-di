import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
    },
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 100,
      },
    },
  },
});
