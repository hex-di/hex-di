/**
 * Runtime tests for HEX error codes in validation messages.
 *
 * Verifies that runtime validation errors follow the ERROR[HEXxxx] format
 * and can be parsed by parseGraphError().
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { parseGraphError, isGraphError, GraphErrorCode } from "../src/advanced.js";

describe("adapter factory runtime error codes", () => {
  describe("createAdapter validation errors", () => {
    it("should include HEX010 for missing provides", () => {
      expect(() => {
        // @ts-expect-error Testing runtime validation
        createAdapter({
          requires: [],
          lifetime: "singleton",
          factory: () => ({}),
        });
      }).toThrow(/ERROR\[HEX010\]/);
    });

    it("should include HEX011 for invalid provides", () => {
      const invalidConfig = {
        provides: "not-a-port",
        requires: [] as const,
        lifetime: "singleton" as const,
        factory: () => ({}),
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid provides type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX011\]/);
    });

    it("should include HEX012 for invalid requires type", () => {
      const Port = createPort({ name: "TestPort" });
      const invalidConfig = {
        provides: Port,
        requires: "not-an-array",
        lifetime: "singleton" as const,
        factory: () => ({}),
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid requires type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX012\]/);
    });

    it("should include HEX013 for invalid requires element", () => {
      const Port = createPort({ name: "TestPort" });
      const invalidConfig = {
        provides: Port,
        requires: ["not-a-port"],
        lifetime: "singleton" as const,
        factory: () => ({}),
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid requires element
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX013\]/);
    });

    it("should include HEX014 for invalid lifetime type", () => {
      const Port = createPort({ name: "TestPort" });
      const invalidConfig = {
        provides: Port,
        requires: [] as const,
        lifetime: 123,
        factory: () => ({}),
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid lifetime type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX014\]/);
    });

    it("should include HEX015 for invalid lifetime value", () => {
      const Port = createPort({ name: "TestPort" });
      const invalidConfig = {
        provides: Port,
        requires: [] as const,
        lifetime: "forever",
        factory: () => ({}),
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid lifetime value
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX015\]/);
    });

    it("should include HEX016 for invalid factory", () => {
      const Port = createPort({ name: "TestPort" });
      const invalidConfig = {
        provides: Port,
        requires: [] as const,
        lifetime: "singleton" as const,
        factory: "not-a-function",
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid factory type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX016\]/);
    });

    it("should include HEX017 for duplicate requires", () => {
      const PortA = createPort({ name: "PortA" });
      const PortB = createPort({ name: "PortB" });
      // TypeScript allows duplicate ports structurally, but runtime validation catches it
      expect(() => {
        createAdapter({
          provides: PortA,
          requires: [PortB, PortB],
          lifetime: "singleton",
          factory: () => ({}),
        });
      }).toThrow(/ERROR\[HEX017\]/);
    });

    it("should include HEX018 for invalid finalizer", () => {
      const Port = createPort({ name: "TestPort" });
      // Use indirect object to bypass TypeScript's overload resolution
      const invalidConfig = {
        provides: Port,
        requires: [] as const,
        lifetime: "singleton" as const,
        factory: () => ({}),
        finalizer: "not-a-function",
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid finalizer type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX018\]/);
    });
  });

  describe("createAdapter validation errors", () => {
    it("should include HEX010 for missing provides (async)", () => {
      expect(() => {
        // @ts-expect-error Testing runtime validation
        createAdapter({
          requires: [],
          factory: async () => ({}),
        });
      }).toThrow(/ERROR\[HEX010\]/);
    });

    it("should include HEX016 for invalid factory (async)", () => {
      const Port = createPort({ name: "TestPort" });
      // Use indirect object to bypass TypeScript's overload resolution
      const invalidConfig = {
        provides: Port,
        requires: [] as const,
        factory: "not-a-function",
      };
      expect(() => {
        // @ts-expect-error Testing runtime validation with invalid factory type
        createAdapter(invalidConfig);
      }).toThrow(/ERROR\[HEX016\]/);
    });
  });
});

describe("parseGraphError for new HEX codes", () => {
  it("should parse HEX010 missing provides error", () => {
    const message = "ERROR[HEX010]: Invalid adapter config: 'provides' is required.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.MISSING_PROVIDES);
  });

  it("should parse HEX011 invalid provides error", () => {
    const message = "ERROR[HEX011]: Invalid adapter config: 'provides' must be a Port object.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_PROVIDES);
  });

  it("should parse HEX012 invalid requires type error", () => {
    const message = "ERROR[HEX012]: Invalid adapter config: 'requires' must be an array.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_REQUIRES_TYPE);
  });

  it("should parse HEX013 invalid requires element error", () => {
    const message = "ERROR[HEX013]: Invalid adapter config: 'requires[0]' must be a Port object.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_REQUIRES_ELEMENT);
  });

  it("should parse HEX014 invalid lifetime type error", () => {
    const message = "ERROR[HEX014]: Invalid adapter config: 'lifetime' must be a string.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_LIFETIME_TYPE);
  });

  it("should parse HEX015 invalid lifetime value error", () => {
    const message =
      'ERROR[HEX015]: Invalid adapter config: \'lifetime\' must be "singleton", "scoped", or "transient".';
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_LIFETIME_VALUE);
  });

  it("should parse HEX016 invalid factory error", () => {
    const message = "ERROR[HEX016]: Invalid adapter config: 'factory' must be a function.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_FACTORY);
  });

  it("should parse HEX017 duplicate requires error", () => {
    const message =
      "ERROR[HEX017]: Invalid adapter config: Duplicate port 'Logger' in requires array.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.DUPLICATE_REQUIRES);
    if (parsed?.code === GraphErrorCode.DUPLICATE_REQUIRES) {
      expect(parsed.details.portName).toBe("Logger");
    }
  });

  it("should parse HEX018 invalid finalizer error", () => {
    const message = "ERROR[HEX018]: Invalid adapter config: 'finalizer' must be a function.";
    expect(isGraphError(message)).toBe(true);
    const parsed = parseGraphError(message);
    expect(parsed).not.toBeUndefined();
    expect(parsed?.code).toBe(GraphErrorCode.INVALID_FINALIZER);
  });
});

describe("builder-build runtime error codes", () => {
  // Note: These errors are already covered by existing tests that check for
  // specific error messages. This test documents that they should include HEX codes.

  it("should have HEX002 for circular dependency errors (covered by existing tests)", () => {
    // The actual test for circular dependencies at runtime is in build.test.ts
    // This test documents that the error format includes HEX002
    const exampleMessage = "ERROR[HEX002]: Circular dependency detected at runtime";
    expect(isGraphError(exampleMessage)).toBe(true);
    expect(parseGraphError(exampleMessage)?.code).toBe(GraphErrorCode.CIRCULAR_DEPENDENCY);
  });

  it("should have HEX003 for captive dependency errors (covered by existing tests)", () => {
    // The actual test for captive dependencies at runtime is in build.test.ts
    // This test documents that the error format includes HEX003
    const exampleMessage = "ERROR[HEX003]: Captive dependency detected at runtime";
    expect(isGraphError(exampleMessage)).toBe(true);
    expect(parseGraphError(exampleMessage)?.code).toBe(GraphErrorCode.CAPTIVE_DEPENDENCY);
  });
});
