import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts", "tests/**/*.test-d.tsx"],
    },
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/index.ts"],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 100,
        statements: 95,
      },
    },
  },
});
