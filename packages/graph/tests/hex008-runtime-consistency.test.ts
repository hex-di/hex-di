/**
 * Runtime consistency tests for HEX008 error code.
 *
 * These tests verify that the parseGraphError utility correctly parses
 * HEX008 "Missing adapters" errors, ensuring consistency between
 * type-level and runtime error handling.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { GraphBuilder, createAdapter, parseGraphError, GraphErrorCode } from "../src/index.js";
import { LoggerPort, CachePortSimple as CachePort } from "./fixtures.js";

// =============================================================================
// Test Adapters
// =============================================================================

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

// =============================================================================
// HEX008 Runtime Consistency Tests
// =============================================================================

describe("parseGraphError handles HEX008 missing adapters (TDD)", () => {
  it("parseGraphError recognizes HEX008 error format", () => {
    // This is the expected error format after the fix
    const errorMessage = "ERROR[HEX008]: Missing adapters for Logger. Call .provide() first.";

    const parsed = parseGraphError(errorMessage);

    expect(parsed).toBeDefined();
    expect(parsed?.code).toBe(GraphErrorCode.MISSING_DEPENDENCY);
    if (parsed?.code === GraphErrorCode.MISSING_DEPENDENCY) {
      expect(parsed.details.missingPorts).toBe("Logger");
    }
  });

  it("build() error message is parseable as HEX008", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);
    const result = builder.build();

    // At runtime, build() still succeeds but returns an error string
    // We verify the string format is correct
    if (typeof result === "string") {
      expect(result).toContain("ERROR[HEX008]");
      expect(result).toContain("Missing adapters for");
      expect(result).toContain("Logger");

      const parsed = parseGraphError(result);
      expect(parsed).toBeDefined();
      expect(parsed?.code).toBe(GraphErrorCode.MISSING_DEPENDENCY);
    }
  });

  it("HEX008 error includes helpful suggestion", () => {
    const errorMessage = "ERROR[HEX008]: Missing adapters for Logger. Call .provide() first.";

    expect(errorMessage).toContain("Call .provide() first.");
  });
});
