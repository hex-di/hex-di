import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    environment: "node",
    testTimeout: 5000,
    include: ["tests/**/*.test.ts"],
  },
});
