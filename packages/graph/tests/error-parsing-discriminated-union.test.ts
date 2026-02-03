/**
 * Runtime tests for discriminated union implementation in error parsing.
 * Verifies proper parsing and type narrowing at runtime.
 */

import { describe, expect, it } from "vitest";
import { parseGraphError, GraphErrorCode } from "./test-types.js";

describe("Error parsing discriminated union runtime behavior", () => {
  describe("Type narrowing via discriminated union", () => {
    it("should narrow DUPLICATE_ADAPTER errors correctly", () => {
      const message = "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove duplicate.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.DUPLICATE_ADAPTER);

      // TypeScript should know details has portName
      if (parsed.code === GraphErrorCode.DUPLICATE_ADAPTER) {
        expect(parsed.details.portName).toBe("Logger");
        // @ts-expect-error - Should not have missingPorts
        expect(parsed.details.missingPorts).toBeUndefined();
      }
    });

    it("should narrow CAPTIVE_DEPENDENCY errors with all fields", () => {
      const message =
        "ERROR[HEX003]: Captive dependency: singleton 'Service' cannot depend on scoped 'Database'.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.CAPTIVE_DEPENDENCY);

      if (parsed.code === GraphErrorCode.CAPTIVE_DEPENDENCY) {
        expect(parsed.details.dependentLifetime).toBe("singleton");
        expect(parsed.details.dependentName).toBe("Service");
        expect(parsed.details.captiveLifetime).toBe("scoped");
        expect(parsed.details.captiveName).toBe("Database");
        // @ts-expect-error - Should not have portName
        expect(parsed.details.portName).toBeUndefined();
      }
    });

    it("should narrow CAPTIVE_DEPENDENCY errors with no fields (runtime format)", () => {
      const message = "ERROR[HEX003]: Captive dependency detected at runtime.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.CAPTIVE_DEPENDENCY);

      if (parsed.code === GraphErrorCode.CAPTIVE_DEPENDENCY) {
        // All fields are optional for runtime variations
        expect(parsed.details.dependentLifetime).toBeUndefined();
        expect(parsed.details.dependentName).toBeUndefined();
        expect(parsed.details.captiveLifetime).toBeUndefined();
        expect(parsed.details.captiveName).toBeUndefined();
      }
    });

    it("should narrow CIRCULAR_DEPENDENCY with cyclePath", () => {
      const message = "ERROR[HEX002]: Circular dependency: A -> B -> C -> A. Fix: Break cycle.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.CIRCULAR_DEPENDENCY);

      if (parsed.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
        expect(parsed.details.cyclePath).toBe("A -> B -> C -> A");
        // @ts-expect-error - Should not have portName
        expect(parsed.details.portName).toBeUndefined();
      }
    });

    it("should narrow CIRCULAR_DEPENDENCY without cyclePath", () => {
      const message = "ERROR[HEX002]: Circular dependency detected at runtime.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.CIRCULAR_DEPENDENCY);

      if (parsed.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
        expect(parsed.details.cyclePath).toBeUndefined();
      }
    });

    it("should narrow MISSING_DEPENDENCY errors", () => {
      const message = "ERROR[HEX008]: Missing adapters for ['Logger', 'Database'].";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.MISSING_DEPENDENCY);

      if (parsed.code === GraphErrorCode.MISSING_DEPENDENCY) {
        expect(parsed.details.missingPorts).toBe("['Logger', 'Database']");
        // @ts-expect-error - Should not have portName
        expect(parsed.details.portName).toBeUndefined();
      }
    });

    it("should narrow MULTIPLE_ERRORS correctly", () => {
      const message = `Multiple validation errors:
  1. ERROR[HEX001]: Duplicate adapter for 'Logger'.
  2. ERROR[HEX002]: Circular dependency: A -> B -> A.`;
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.MULTIPLE_ERRORS);

      if (parsed.code === GraphErrorCode.MULTIPLE_ERRORS) {
        expect(parsed.details.errorCount).toBe("2");
        expect(parsed.details.errorCodes).toBe("HEX001,HEX002");
        // @ts-expect-error - Should not have portName
        expect(parsed.details.portName).toBeUndefined();
      }
    });

    it("should handle UNKNOWN_ERROR for future error codes", () => {
      const message = "ERROR[HEX999]: Some future error we don't recognize yet.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      expect(parsed.code).toBe(GraphErrorCode.UNKNOWN_ERROR);

      if (parsed.code === GraphErrorCode.UNKNOWN_ERROR) {
        expect(parsed.details.rawMessage).toBe(message);
        // @ts-expect-error - Should not have portName
        expect(parsed.details.portName).toBeUndefined();
      }
    });
  });

  describe("Switch statement exhaustiveness", () => {
    it("should handle all error types in switch", () => {
      const testMessages = [
        "ERROR[HEX001]: Duplicate adapter for 'Logger'.",
        "ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: Break cycle.",
        "ERROR[HEX003]: Captive dependency: singleton 'A' cannot depend on scoped 'B'.",
        "ERROR[HEX004]: Reverse captive dependency: Existing singleton 'A' would capture new scoped 'B'.",
        "ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides singleton, Graph B provides scoped.",
        "ERROR[HEX006]: Self-dependency detected. Adapter for 'Logger' requires itself.",
        "WARNING[HEX007]: Type-level depth limit (20) exceeded.",
        "ERROR[HEX008]: Missing adapters for ['Logger'].",
        "ERROR[HEX009]: Cannot use override() without forParent().",
        "ERROR[HEX010]: Adapter config missing 'provides' field.",
        "ERROR[HEX011]: Invalid 'provides'. Got: string",
        "ERROR[HEX012]: Invalid 'requires'. Got: string",
        "ERROR[HEX013]: Invalid port in 'requires[0]'.",
        "ERROR[HEX014]: Invalid 'lifetime'. Got: number",
        'ERROR[HEX015]: Invalid lifetime value. Got: "invalid"',
        "ERROR[HEX016]: Invalid 'factory'. Got: string",
        "ERROR[HEX017]: Duplicate port 'Logger' in requires.",
        "ERROR[HEX018]: Invalid 'finalizer', got string",
        "ERROR[HEX019]: Invalid lazy port reference.",
        "Multiple validation errors:\n  1. ERROR[HEX001]: Test",
        "ERROR[HEX999]: Unknown future error.",
      ];

      for (const message of testMessages) {
        const parsed = parseGraphError(message);
        expect(parsed).toBeDefined();
        if (!parsed) continue;

        // This switch should be exhaustive
        let handled = false;
        switch (parsed.code) {
          case GraphErrorCode.DUPLICATE_ADAPTER:
          case GraphErrorCode.CIRCULAR_DEPENDENCY:
          case GraphErrorCode.CAPTIVE_DEPENDENCY:
          case GraphErrorCode.REVERSE_CAPTIVE_DEPENDENCY:
          case GraphErrorCode.LIFETIME_INCONSISTENCY:
          case GraphErrorCode.SELF_DEPENDENCY:
          case GraphErrorCode.DEPTH_LIMIT_EXCEEDED:
          case GraphErrorCode.MISSING_DEPENDENCY:
          case GraphErrorCode.OVERRIDE_WITHOUT_PARENT:
          case GraphErrorCode.MISSING_PROVIDES:
          case GraphErrorCode.INVALID_PROVIDES:
          case GraphErrorCode.INVALID_REQUIRES_TYPE:
          case GraphErrorCode.INVALID_REQUIRES_ELEMENT:
          case GraphErrorCode.INVALID_LIFETIME_TYPE:
          case GraphErrorCode.INVALID_LIFETIME_VALUE:
          case GraphErrorCode.INVALID_FACTORY:
          case GraphErrorCode.DUPLICATE_REQUIRES:
          case GraphErrorCode.INVALID_FINALIZER:
          case GraphErrorCode.INVALID_LAZY_PORT:
          case GraphErrorCode.MULTIPLE_ERRORS:
          case GraphErrorCode.UNKNOWN_ERROR:
            handled = true;
            break;
          default: {
            // This should never be reached if union is exhaustive
            const _exhaustive: never = parsed;
            throw new Error(`Unhandled error code: ${(_exhaustive as any).code}`);
          }
        }
        expect(handled).toBe(true);
      }
    });
  });

  describe("Details are properly readonly at type level", () => {
    it("should have readonly details (TypeScript enforced, not runtime)", () => {
      const message = "ERROR[HEX001]: Duplicate adapter for 'Logger'.";
      const parsed = parseGraphError(message);

      expect(parsed).toBeDefined();
      if (!parsed) return;

      if (parsed.code === GraphErrorCode.DUPLICATE_ADAPTER) {
        const originalPortName = parsed.details.portName;

        // TypeScript prevents mutation at compile time via readonly modifier

        // At runtime, the value doesn't change since we return new objects
        expect(parsed.details.portName).toBe(originalPortName);

        // Verify details is an object with expected property
        expect(parsed.details).toEqual({ portName: "Logger" });
      }
    });
  });

  describe("Error code constants", () => {
    it("should use literal string types for error codes", () => {
      expect(GraphErrorCode.DUPLICATE_ADAPTER).toBe("DUPLICATE_ADAPTER");
      expect(typeof GraphErrorCode.DUPLICATE_ADAPTER).toBe("string");

      // The object is const, TypeScript prevents mutation at compile time

      // Verify the constant values
      expect(GraphErrorCode.CIRCULAR_DEPENDENCY).toBe("CIRCULAR_DEPENDENCY");
      expect(GraphErrorCode.CAPTIVE_DEPENDENCY).toBe("CAPTIVE_DEPENDENCY");
      expect(GraphErrorCode.MISSING_DEPENDENCY).toBe("MISSING_DEPENDENCY");
    });
  });
});
