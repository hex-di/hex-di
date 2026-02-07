import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    benchmark: {
      include: ["tests/**/*.bench.ts"],
      reporters: ["default"],
    },
  },
});
