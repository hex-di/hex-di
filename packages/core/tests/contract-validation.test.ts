/**
 * Tests for contract validation: checkConformance, checkSignatures, ContractViolationError.
 *
 * @see BEH-CO-10
 */
import { describe, it, expect } from "vitest";
import {
  checkConformance,
  deriveMethodSpecs,
  checkSignatures,
  ContractViolationError,
  createBlameContext,
} from "../src/index.js";
import type { PortMemberSpec, PortMethodSpec, ConformanceCheckResult } from "../src/index.js";

// =============================================================================
// checkConformance
// =============================================================================

describe("checkConformance", () => {
  it("returns conforms=true when instance satisfies all specs", () => {
    const instance = {
      send: () => {},
      validate: () => true,
    };
    const specs: PortMemberSpec[] = [
      { name: "send", typeCategory: "function" },
      { name: "validate", typeCategory: "function" },
    ];

    const result = checkConformance(instance, specs);

    expect(result.conforms).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("returns conforms=true for empty specs", () => {
    const result = checkConformance({}, []);
    expect(result.conforms).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("detects MissingMethod when function member is absent", () => {
    const instance = { validate: () => true };
    const specs: PortMemberSpec[] = [
      { name: "send", typeCategory: "function" },
      { name: "validate", typeCategory: "function" },
    ];

    const result = checkConformance(instance, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]._tag).toBe("MissingMethod");
    expect(result.violations[0].memberName).toBe("send");
    expect(result.violations[0].expected).toBe("function");
    expect(result.violations[0].actual).toBe("undefined");
  });

  it("detects MissingProperty when non-function member is absent", () => {
    const instance = {};
    const specs: PortMemberSpec[] = [{ name: "name", typeCategory: "string" }];

    const result = checkConformance(instance, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]._tag).toBe("MissingProperty");
    expect(result.violations[0].memberName).toBe("name");
  });

  it("detects TypeMismatch when member has wrong type", () => {
    const instance = { send: "not-a-function" };
    const specs: PortMemberSpec[] = [{ name: "send", typeCategory: "function" }];

    const result = checkConformance(instance, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]._tag).toBe("TypeMismatch");
    expect(result.violations[0].memberName).toBe("send");
    expect(result.violations[0].expected).toBe("function");
    expect(result.violations[0].actual).toBe("string");
  });

  it("detects multiple violations", () => {
    const instance = { other: true };
    const specs: PortMemberSpec[] = [
      { name: "send", typeCategory: "function" },
      { name: "validate", typeCategory: "function" },
      { name: "name", typeCategory: "string" },
    ];

    const result = checkConformance(instance, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(3);
  });

  it("handles null instance", () => {
    const specs: PortMemberSpec[] = [{ name: "send", typeCategory: "function" }];

    const result = checkConformance(null, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]._tag).toBe("MissingMethod");
    expect(result.violations[0].actual).toBe("null");
  });

  it("handles undefined instance", () => {
    const specs: PortMemberSpec[] = [{ name: "send", typeCategory: "function" }];

    const result = checkConformance(undefined, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].actual).toBe("undefined");
  });

  it("handles primitive instance", () => {
    const specs: PortMemberSpec[] = [{ name: "send", typeCategory: "function" }];

    const result = checkConformance(42, specs);

    expect(result.conforms).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].actual).toBe("number");
  });

  it("result and violations are frozen", () => {
    const instance = {};
    const specs: PortMemberSpec[] = [{ name: "send", typeCategory: "function" }];

    const result = checkConformance(instance, specs);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.violations)).toBe(true);
    for (const v of result.violations) {
      expect(Object.isFrozen(v)).toBe(true);
    }
  });

  it("conforms result is also frozen", () => {
    const result = checkConformance({ send: () => {} }, [
      { name: "send", typeCategory: "function" },
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.violations)).toBe(true);
  });
});

// =============================================================================
// deriveMethodSpecs
// =============================================================================

describe("deriveMethodSpecs", () => {
  it("converts method names to PortMemberSpec with typeCategory='function'", () => {
    const specs = deriveMethodSpecs(["send", "validate"]);

    expect(specs).toHaveLength(2);
    expect(specs[0].name).toBe("send");
    expect(specs[0].typeCategory).toBe("function");
    expect(specs[1].name).toBe("validate");
    expect(specs[1].typeCategory).toBe("function");
  });

  it("returns frozen array", () => {
    const specs = deriveMethodSpecs(["foo"]);
    expect(Object.isFrozen(specs)).toBe(true);
  });

  it("returns empty frozen array for empty input", () => {
    const specs = deriveMethodSpecs([]);
    expect(specs).toHaveLength(0);
    expect(Object.isFrozen(specs)).toBe(true);
  });
});

// =============================================================================
// checkSignatures
// =============================================================================

describe("checkSignatures", () => {
  it("reports matching arity", () => {
    const instance = {
      send: (msg: string) => msg,
      validate: (a: unknown, b: unknown) => [a, b],
    };
    const specs: PortMethodSpec[] = [
      { name: "send", arity: 1, isAsync: false },
      { name: "validate", arity: 2, isAsync: false },
    ];

    const results = checkSignatures(instance as Record<string, unknown>, specs);

    expect(results).toHaveLength(2);
    expect(results[0].memberName).toBe("send");
    expect(results[0].arityMatch).toBe(true);
    expect(results[0].expectedArity).toBe(1);
    expect(results[0].actualArity).toBe(1);
    expect(results[1].memberName).toBe("validate");
    expect(results[1].arityMatch).toBe(true);
  });

  it("reports mismatched arity", () => {
    const instance = {
      send: () => {},
    };
    const specs: PortMethodSpec[] = [{ name: "send", arity: 2, isAsync: false }];

    const results = checkSignatures(instance as Record<string, unknown>, specs);

    expect(results).toHaveLength(1);
    expect(results[0].arityMatch).toBe(false);
    expect(results[0].expectedArity).toBe(2);
    expect(results[0].actualArity).toBe(0);
  });

  it("skips non-function members", () => {
    const instance = {
      name: "hello",
    };
    const specs: PortMethodSpec[] = [{ name: "name", arity: 0, isAsync: false }];

    const results = checkSignatures(instance as Record<string, unknown>, specs);

    expect(results).toHaveLength(0);
  });

  it("returns frozen results", () => {
    const instance = { fn: () => {} };
    const results = checkSignatures(instance as Record<string, unknown>, [
      { name: "fn", arity: 0, isAsync: false },
    ]);

    expect(Object.isFrozen(results)).toBe(true);
    for (const r of results) {
      expect(Object.isFrozen(r)).toBe(true);
    }
  });
});

// =============================================================================
// ContractViolationError
// =============================================================================

describe("ContractViolationError", () => {
  it("has correct _tag and code", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", [
      {
        _tag: "MissingMethod",
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
    ]);

    expect(error._tag).toBe("ContractViolationError");
    expect(error.code).toBe("CONTRACT_VIOLATION");
    expect(error.isProgrammingError).toBe(true);
  });

  it("carries portName and adapterName", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", [
      {
        _tag: "MissingMethod",
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
    ]);

    expect(error.portName).toBe("MyPort");
    expect(error.adapterName).toBe("MyAdapter");
  });

  it("carries frozen violations", () => {
    const violations = [
      {
        _tag: "MissingMethod" as const,
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
    ];
    const error = new ContractViolationError("MyPort", "MyAdapter", violations);

    expect(Object.isFrozen(error.violations)).toBe(true);
    expect(error.violations).toHaveLength(1);
    expect(error.violations[0]._tag).toBe("MissingMethod");
  });

  it("formats single violation message", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", [
      {
        _tag: "MissingMethod",
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
    ]);

    expect(error.message).toContain("Missing method 'send'");
    expect(error.message).toContain("MyPort");
  });

  it("formats multi-violation message", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", [
      {
        _tag: "MissingMethod",
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
      {
        _tag: "TypeMismatch",
        memberName: "validate",
        expected: "function",
        actual: "string",
      },
    ]);

    expect(error.message).toContain("2 contract violations");
    expect(error.message).toContain("MyPort");
  });

  it("carries blame context when provided", () => {
    const blame = createBlameContext({
      adapterFactory: { name: "MyPort" },
      portContract: { name: "MyPort", direction: "outbound" },
      violationType: { _tag: "ContractViolation", details: "test" },
      resolutionPath: ["Root", "MyPort"],
    });

    const error = new ContractViolationError(
      "MyPort",
      "MyAdapter",
      [
        {
          _tag: "MissingMethod",
          memberName: "send",
          expected: "function",
          actual: "undefined",
        },
      ],
      blame
    );

    expect(error.blame).toBeDefined();
    expect(error.blame?.adapterFactory.name).toBe("MyPort");
  });

  it("is frozen", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", [
      {
        _tag: "MissingMethod",
        memberName: "send",
        expected: "function",
        actual: "undefined",
      },
    ]);

    expect(Object.isFrozen(error)).toBe(true);
  });

  it("is instanceof Error", () => {
    const error = new ContractViolationError("MyPort", "MyAdapter", []);

    expect(error instanceof Error).toBe(true);
  });
});
