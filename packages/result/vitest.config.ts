import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["tests/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
    },
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 100,
      },
    },
  },
});
