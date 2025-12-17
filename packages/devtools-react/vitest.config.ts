import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    typecheck: {
      enabled: true,
      include: ["src/**/*.test-d.ts", "tests/**/*.test-d.ts"],
    },
  },
});
