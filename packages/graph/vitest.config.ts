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
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test-d.ts",
        "src/**/index.ts", // Re-export barrel files
        "src/types/**", // Type-only code (tested via *.test-d.ts)
        "src/convenience.ts", // Re-export barrel file
        "src/internal.ts", // Type-only re-exports
        "src/graph/builder-inspection.ts", // Re-export barrel file
        // Optional debugging/visualization utilities (not core validation)
        "src/graph/graph-visualization.ts",
        "src/graph/inspection/error-formatting.ts",
        "src/graph/inspection/structured-logging.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 90,
        lines: 80,
      },
    },
    // Benchmark configuration
    benchmark: {
      include: ["tests/**/*.bench.ts"],
      reporters: ["default"],
    },
  },
});
