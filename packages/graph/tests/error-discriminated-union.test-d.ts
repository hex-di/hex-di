/**
 * Type-level tests for discriminated union error types.
 *
 * These tests verify that TypeScript correctly narrows the `details` type
 * based on the error `code` discriminant.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  ParsedGraphError,
  DuplicateAdapterDetails,
  CircularDependencyDetails,
  CaptiveDependencyDetails,
  MissingDependencyDetails,
  LifetimeInconsistencyDetails,
} from "./test-types.js";
import { parseGraphError, GraphErrorCode } from "./test-types.js";

describe("ParsedGraphError discriminated union", () => {
  describe("type narrowing works correctly", () => {
    it("should narrow to DuplicateAdapterDetails when code is DUPLICATE_ADAPTER", () => {
      const parsed = parseGraphError("ERROR[HEX001]: Duplicate adapter for 'Logger'.");
      if (parsed?.code === GraphErrorCode.DUPLICATE_ADAPTER) {
        expectTypeOf(parsed.details).toEqualTypeOf<Readonly<DuplicateAdapterDetails>>();
        expectTypeOf(parsed.details.portName).toBeString();
      }
    });

    it("should narrow to CircularDependencyDetails when code is CIRCULAR_DEPENDENCY", () => {
      const parsed = parseGraphError("ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: ...");
      if (parsed?.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
        expectTypeOf(parsed.details).toEqualTypeOf<Readonly<CircularDependencyDetails>>();
        // cyclePath is optional
        expectTypeOf(parsed.details.cyclePath).toEqualTypeOf<string | undefined>();
      }
    });

    it("should narrow to CaptiveDependencyDetails when code is CAPTIVE_DEPENDENCY", () => {
      const parsed = parseGraphError(
        "ERROR[HEX003]: Captive dependency: Singleton 'X' cannot depend on Scoped 'Y'"
      );
      if (parsed?.code === GraphErrorCode.CAPTIVE_DEPENDENCY) {
        expectTypeOf(parsed.details).toEqualTypeOf<Readonly<CaptiveDependencyDetails>>();
        // All fields are optional for runtime format
        expectTypeOf(parsed.details.dependentLifetime).toEqualTypeOf<string | undefined>();
        expectTypeOf(parsed.details.dependentName).toEqualTypeOf<string | undefined>();
        expectTypeOf(parsed.details.captiveLifetime).toEqualTypeOf<string | undefined>();
        expectTypeOf(parsed.details.captiveName).toEqualTypeOf<string | undefined>();
      }
    });

    it("should narrow to MissingDependencyDetails when code is MISSING_DEPENDENCY", () => {
      const parsed = parseGraphError("ERROR[HEX008]: Missing adapters for Logger.");
      if (parsed?.code === GraphErrorCode.MISSING_DEPENDENCY) {
        expectTypeOf(parsed.details).toEqualTypeOf<Readonly<MissingDependencyDetails>>();
        expectTypeOf(parsed.details.missingPorts).toBeString();
      }
    });

    it("should narrow to LifetimeInconsistencyDetails when code is LIFETIME_INCONSISTENCY", () => {
      const parsed = parseGraphError(
        "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped."
      );
      if (parsed?.code === GraphErrorCode.LIFETIME_INCONSISTENCY) {
        expectTypeOf(parsed.details).toEqualTypeOf<Readonly<LifetimeInconsistencyDetails>>();
        expectTypeOf(parsed.details.portName).toBeString();
        expectTypeOf(parsed.details.lifetimeA).toBeString();
        expectTypeOf(parsed.details.lifetimeB).toBeString();
      }
    });
  });

  describe("switch exhaustiveness", () => {
    it("should support exhaustive switch over error codes", () => {
      function handleError(error: ParsedGraphError): string {
        switch (error.code) {
          case "DUPLICATE_ADAPTER":
            return `Duplicate: ${error.details.portName}`;
          case "CIRCULAR_DEPENDENCY":
            return `Cycle: ${error.details.cyclePath ?? "unknown"}`;
          case "CAPTIVE_DEPENDENCY":
            return `Captive: ${error.details.dependentName ?? "unknown"}`;
          case "REVERSE_CAPTIVE_DEPENDENCY":
            return `Reverse captive: ${error.details.existingName}`;
          case "LIFETIME_INCONSISTENCY":
            return `Lifetime: ${error.details.portName}`;
          case "SELF_DEPENDENCY":
            return `Self: ${error.details.portName}`;
          case "DEPTH_LIMIT_EXCEEDED":
            return `Depth: ${error.details.maxDepth}`;
          case "MISSING_DEPENDENCY":
            return `Missing: ${error.details.missingPorts}`;
          case "OVERRIDE_WITHOUT_PARENT":
            return "Override without parent";
          case "MISSING_PROVIDES":
            return "Missing provides";
          case "INVALID_PROVIDES":
            return `Invalid provides: ${error.details.actualType ?? "unknown"}`;
          case "INVALID_REQUIRES_TYPE":
            return `Invalid requires type: ${error.details.actualType ?? "unknown"}`;
          case "INVALID_REQUIRES_ELEMENT":
            return `Invalid element at ${error.details.index}`;
          case "INVALID_LIFETIME_TYPE":
            return `Invalid lifetime type: ${error.details.actualType ?? "unknown"}`;
          case "INVALID_LIFETIME_VALUE":
            return `Invalid lifetime value: ${error.details.actualValue ?? "unknown"}`;
          case "INVALID_FACTORY":
            return `Invalid factory: ${error.details.actualType ?? "unknown"}`;
          case "DUPLICATE_REQUIRES":
            return `Duplicate requires: ${error.details.portName}`;
          case "INVALID_FINALIZER":
            return `Invalid finalizer: ${error.details.actualType ?? "unknown"}`;
          case "INVALID_LAZY_PORT":
            return "Invalid lazy port";
          case "MULTIPLE_ERRORS":
            return `Multiple: ${error.details.errorCount}`;
          case "UNKNOWN_ERROR":
            return `Unknown: ${error.details.rawMessage}`;
        }
      }

      // Function should work without exhaustiveness errors
      expectTypeOf(handleError).toBeFunction();
    });
  });
});
