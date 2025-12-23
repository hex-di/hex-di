import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    typecheck: false,
    setupFiles: ["./tests/setup.ts"],
  },
});
