import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["tests/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["tests/**/*.test-d.ts"],
    },
  },
});
