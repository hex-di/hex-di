/**
 * Tests for behavioral port specifications: pre/postconditions, invariants,
 * and runtime verification via Proxy wrapping.
 *
 * @see BEH-CO-13
 */
import { describe, it, expect, vi } from "vitest";
import {
  wrapWithVerification,
  PreconditionViolationError,
  PostconditionViolationError,
  InvariantViolationError,
} from "../src/index.js";
import type {
  BehavioralPortSpec,
  StatefulPortSpec,
  VerificationConfig,
  MethodContract,
} from "../src/index.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface Calculator {
  add(a: number, b: number): number;
  divide(a: number, b: number): number;
}

interface AsyncUserRepo {
  findById(id: string): Promise<{ id: string; name: string } | null>;
  save(user: { id: string; name: string }): Promise<void>;
}

interface Counter {
  readonly count: number;
  increment(): void;
  decrement(): void;
  reset(): void;
}

// =============================================================================
// Shared Specs
// =============================================================================

const calcPreconditionSpec: BehavioralPortSpec<Calculator> = {
  methods: {
    add: {
      preconditions: [
        {
          name: "finite-inputs",
          check: (args: readonly [number, number]) =>
            Number.isFinite(args[0]) && Number.isFinite(args[1]),
          message: "Both inputs must be finite numbers",
        },
      ],
      postconditions: [],
    },
    divide: {
      preconditions: [
        {
          name: "non-zero-divisor",
          check: (args: readonly [number, number]) => args[1] !== 0,
          message: "Divisor must not be zero",
        },
      ],
      postconditions: [],
    },
  },
};

const calcPostconditionSpec: BehavioralPortSpec<Calculator> = {
  methods: {
    add: {
      preconditions: [],
      postconditions: [
        {
          name: "finite-result",
          check: (result: number) => Number.isFinite(result),
          message: "Result must be a finite number",
        },
      ],
    },
    divide: {
      preconditions: [],
      postconditions: [
        {
          name: "finite-result",
          check: (result: number) => Number.isFinite(result),
          message: "Result must be a finite number",
        },
      ],
    },
  },
};

const repoSpec: BehavioralPortSpec<AsyncUserRepo> = {
  methods: {
    findById: {
      preconditions: [
        {
          name: "non-empty-id",
          check: (args: readonly [string]) => args[0].length > 0,
          message: "User ID must be non-empty",
        },
      ],
      postconditions: [
        {
          name: "consistent-id",
          check: (result: { id: string; name: string } | null) =>
            result === null || result.id.length > 0,
          message: "Returned user must have a non-empty ID",
        },
      ],
    },
    save: {
      preconditions: [
        {
          name: "valid-user",
          check: (args: readonly [{ id: string; name: string }]) =>
            args[0].id.length > 0 && args[0].name.length > 0,
          message: "User must have valid ID and name",
        },
      ],
      postconditions: [],
    },
  },
};

function createCounterSpec(): StatefulPortSpec<Counter> {
  return {
    invariants: [
      {
        name: "non-negative",
        check: (c: Counter) => c.count >= 0,
        message: "Count must be non-negative",
      },
    ],
    methods: {
      increment: { preconditions: [], postconditions: [] },
      decrement: { preconditions: [], postconditions: [] },
      reset: { preconditions: [], postconditions: [] },
    },
  };
}

// =============================================================================
// Precondition Tests
// =============================================================================

describe("Precondition verification", () => {
  it("allows method call when precondition passes", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator");
    expect(wrapped.add(2, 3)).toBe(5);
    expect(wrapped.divide(10, 2)).toBe(5);
  });

  it("throws PreconditionViolationError when precondition fails", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator");

    expect(() => wrapped.divide(10, 0)).toThrow(PreconditionViolationError);
  });

  it("includes violation details in PreconditionViolationError", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator");

    try {
      wrapped.divide(10, 0);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PreconditionViolationError);
      const violation = (err as PreconditionViolationError).violation;
      expect(violation._tag).toBe("PreconditionViolation");
      expect(violation.contractName).toBe("non-zero-divisor");
      expect(violation.portName).toBe("Calculator");
      expect(violation.methodName).toBe("divide");
      expect(violation.message).toBe("Divisor must not be zero");
    }
  });

  it("throws PreconditionViolationError for NaN input", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator");

    expect(() => wrapped.add(NaN, 3)).toThrow(PreconditionViolationError);
  });

  it("PreconditionViolationError is frozen", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator");

    try {
      wrapped.divide(10, 0);
    } catch (err) {
      expect(Object.isFrozen(err)).toBe(true);
      expect(Object.isFrozen((err as PreconditionViolationError).violation)).toBe(true);
    }
  });
});

// =============================================================================
// Postcondition Tests
// =============================================================================

describe("Postcondition verification", () => {
  it("allows method call when postcondition passes", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPostconditionSpec, "Calculator");
    expect(wrapped.add(2, 3)).toBe(5);
  });

  it("throws PostconditionViolationError when postcondition fails", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPostconditionSpec, "Calculator");

    // divide by 0 returns Infinity, which is not finite
    expect(() => wrapped.divide(10, 0)).toThrow(PostconditionViolationError);
  });

  it("includes violation details in PostconditionViolationError", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const wrapped = wrapWithVerification(calc, calcPostconditionSpec, "Calculator");

    try {
      wrapped.divide(10, 0);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PostconditionViolationError);
      const violation = (err as PostconditionViolationError).violation;
      expect(violation._tag).toBe("PostconditionViolation");
      expect(violation.contractName).toBe("finite-result");
      expect(violation.methodName).toBe("divide");
    }
  });
});

// =============================================================================
// Async Method Tests
// =============================================================================

describe("Async method verification", () => {
  it("checks precondition before async method", () => {
    const repo: AsyncUserRepo = {
      findById: async (_id: string) => ({ id: "1", name: "Alice" }),
      save: async (_user: { id: string; name: string }) => {},
    };

    const wrapped = wrapWithVerification(repo, repoSpec, "UserRepo");

    // Precondition failure happens synchronously (before await)
    expect(() => wrapped.findById("")).toThrow(PreconditionViolationError);
  });

  it("checks postcondition on resolved async value", async () => {
    const repo: AsyncUserRepo = {
      // Returns a user with empty ID -- violates postcondition
      findById: async (_id: string) => ({ id: "", name: "BadUser" }),
      save: async (_user: { id: string; name: string }) => {},
    };

    const wrapped = wrapWithVerification(repo, repoSpec, "UserRepo");

    await expect(wrapped.findById("valid-id")).rejects.toThrow(PostconditionViolationError);
  });

  it("allows async method when all conditions pass", async () => {
    const repo: AsyncUserRepo = {
      findById: async (id: string) => ({ id, name: "Alice" }),
      save: async (_user: { id: string; name: string }) => {},
    };

    const wrapped = wrapWithVerification(repo, repoSpec, "UserRepo");

    const user = await wrapped.findById("123");
    expect(user).toEqual({ id: "123", name: "Alice" });
  });

  it("returns null from async postcondition when check allows null", async () => {
    const repo: AsyncUserRepo = {
      findById: async (_id: string) => null,
      save: async (_user: { id: string; name: string }) => {},
    };

    const wrapped = wrapWithVerification(repo, repoSpec, "UserRepo");

    const user = await wrapped.findById("missing");
    expect(user).toBeNull();
  });
});

// =============================================================================
// Invariant Tests
// =============================================================================

describe("Invariant verification", () => {
  it("checks invariants before and after method calls", () => {
    let internalCount = 0;
    const counter: Counter = {
      get count() {
        return internalCount;
      },
      increment() {
        internalCount++;
      },
      decrement() {
        internalCount--;
      },
      reset() {
        internalCount = 0;
      },
    };

    const spec = createCounterSpec();
    const wrapped = wrapWithVerification(counter, spec, "Counter");

    // Should work fine
    wrapped.increment();
    expect(counter.count).toBe(1);

    wrapped.increment();
    expect(counter.count).toBe(2);

    // Decrement to 1 -- still valid
    wrapped.decrement();
    expect(counter.count).toBe(1);

    // Decrement to 0 -- still valid
    wrapped.decrement();
    expect(counter.count).toBe(0);

    // Decrement below 0 -- invariant should fail post-method
    expect(() => wrapped.decrement()).toThrow(InvariantViolationError);
  });

  it("detects pre-method invariant violation from prior bad state", () => {
    let internalCount = -1; // Start in invalid state
    const counter: Counter = {
      get count() {
        return internalCount;
      },
      increment() {
        internalCount++;
      },
      decrement() {
        internalCount--;
      },
      reset() {
        internalCount = 0;
      },
    };

    const spec = createCounterSpec();
    const wrapped = wrapWithVerification(counter, spec, "Counter");

    // Should fail with pre-method invariant violation
    try {
      wrapped.increment();
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(InvariantViolationError);
      expect((err as InvariantViolationError).checkedAt).toBe("pre-method");
    }
  });

  it("InvariantViolationError is frozen and has correct tag", () => {
    let internalCount = -1;
    const counter: Counter = {
      get count() {
        return internalCount;
      },
      increment() {
        internalCount++;
      },
      decrement() {
        internalCount--;
      },
      reset() {
        internalCount = 0;
      },
    };

    const spec = createCounterSpec();
    const wrapped = wrapWithVerification(counter, spec, "Counter");

    try {
      wrapped.increment();
    } catch (err) {
      expect(Object.isFrozen(err)).toBe(true);
      expect((err as InvariantViolationError)._tag).toBe("InvariantViolation");
      expect((err as InvariantViolationError).code).toBe("INVARIANT_VIOLATION");
    }
  });
});

// =============================================================================
// VerificationConfig Tests
// =============================================================================

describe("VerificationConfig", () => {
  it('warns instead of throwing when onViolation is "warn"', () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const config: VerificationConfig = {
      runtimeVerification: true,
      onViolation: "warn",
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator", config);

    // Should not throw, but log a warning
    const result = wrapped.add(NaN, 3);
    expect(result).toBeNaN();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("PreconditionViolation"));

    warnSpy.mockRestore();
  });

  it('logs instead of throwing when onViolation is "log"', () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const config: VerificationConfig = {
      runtimeVerification: true,
      onViolation: "log",
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator", config);

    const result = wrapped.add(Infinity, 3);
    expect(result).toBe(Infinity);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("PreconditionViolation"));

    logSpy.mockRestore();
  });

  it('only checks preconditions when verificationMode is "preconditions"', () => {
    const calc: Calculator = {
      add: (_a: number, _b: number) => Infinity, // postcondition would fail if checked
      divide: (a: number, b: number) => a / b,
    };

    const specWithPost: BehavioralPortSpec<Calculator> = {
      methods: {
        add: {
          preconditions: [],
          postconditions: [
            {
              name: "finite-result",
              check: (result: number) => Number.isFinite(result),
              message: "Result must be finite",
            },
          ],
        },
        divide: {
          preconditions: [],
          postconditions: [],
        },
      },
    };

    const config: VerificationConfig = {
      runtimeVerification: true,
      verificationMode: "preconditions",
    };

    const wrapped = wrapWithVerification(calc, specWithPost, "Calculator", config);

    // Should NOT throw because postconditions are not checked in "preconditions" mode
    expect(wrapped.add(1, 2)).toBe(Infinity);
  });

  it('only checks postconditions when verificationMode is "postconditions"', () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    const config: VerificationConfig = {
      runtimeVerification: true,
      verificationMode: "postconditions",
    };

    const wrapped = wrapWithVerification(calc, calcPreconditionSpec, "Calculator", config);

    // NaN input would fail precondition, but we're only checking postconditions
    expect(wrapped.add(NaN, 3)).toBeNaN();
  });

  it('only checks invariants when verificationMode is "invariants"', () => {
    let internalCount = 0;
    const counter: Counter = {
      get count() {
        return internalCount;
      },
      increment() {
        internalCount++;
      },
      decrement() {
        internalCount--;
      },
      reset() {
        internalCount = 0;
      },
    };

    const spec: StatefulPortSpec<Counter> = {
      invariants: [
        {
          name: "non-negative",
          check: (c: Counter) => c.count >= 0,
          message: "Count must be non-negative",
        },
      ],
      methods: {
        increment: {
          preconditions: [
            {
              name: "always-fail",
              check: () => false,
              message: "This would fail if checked",
            },
          ],
          postconditions: [],
        },
        decrement: { preconditions: [], postconditions: [] },
        reset: { preconditions: [], postconditions: [] },
      },
    };

    const config: VerificationConfig = {
      runtimeVerification: true,
      verificationMode: "invariants",
    };

    const wrapped = wrapWithVerification(counter, spec, "Counter", config);

    // Precondition "always-fail" is not checked in "invariants" mode
    wrapped.increment();
    expect(counter.count).toBe(1);
  });
});

// =============================================================================
// Non-function Property Pass-through
// =============================================================================

describe("Non-function property pass-through", () => {
  it("passes through non-function properties without interception", () => {
    const counter: Counter = {
      count: 42,
      increment() {},
      decrement() {},
      reset() {},
    };

    const spec: BehavioralPortSpec<Counter> = {
      methods: {
        increment: { preconditions: [], postconditions: [] },
        decrement: { preconditions: [], postconditions: [] },
        reset: { preconditions: [], postconditions: [] },
      },
    };

    const wrapped = wrapWithVerification(counter, spec, "Counter");
    expect(wrapped.count).toBe(42);
  });

  it("passes through methods without contracts", () => {
    const calc: Calculator = {
      add: (a: number, b: number) => a + b,
      divide: (a: number, b: number) => a / b,
    };

    // Only specify contract for add, not divide
    const spec: BehavioralPortSpec<Calculator> = {
      methods: {
        add: {
          preconditions: [
            {
              name: "finite",
              check: (args: readonly [number, number]) =>
                Number.isFinite(args[0]) && Number.isFinite(args[1]),
              message: "Inputs must be finite",
            },
          ],
          postconditions: [],
        },
      },
    };

    const wrapped = wrapWithVerification(calc, spec, "Calculator");

    // divide has no contract, so it passes through
    expect(wrapped.divide(10, 0)).toBe(Infinity);

    // add with NaN should throw due to precondition
    expect(() => wrapped.add(NaN, 1)).toThrow(PreconditionViolationError);
  });
});

// =============================================================================
// Error Class Tests
// =============================================================================

describe("Error classes", () => {
  it("PreconditionViolationError extends ContainerError", () => {
    const err = new PreconditionViolationError(
      Object.freeze({
        _tag: "PreconditionViolation" as const,
        contractName: "test",
        message: "test message",
        portName: "TestPort",
        methodName: "testMethod",
      })
    );

    expect(err._tag).toBe("PreconditionViolation");
    expect(err.code).toBe("PRECONDITION_VIOLATION");
    expect(err.isProgrammingError).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("PostconditionViolationError extends ContainerError", () => {
    const err = new PostconditionViolationError(
      Object.freeze({
        _tag: "PostconditionViolation" as const,
        contractName: "test",
        message: "test message",
        portName: "TestPort",
        methodName: "testMethod",
      })
    );

    expect(err._tag).toBe("PostconditionViolation");
    expect(err.code).toBe("POSTCONDITION_VIOLATION");
    expect(err.isProgrammingError).toBe(true);
  });

  it("InvariantViolationError has checkedAt field", () => {
    const violation = Object.freeze({
      _tag: "InvariantViolation" as const,
      contractName: "test",
      message: "test message",
      portName: "TestPort",
      methodName: "testMethod",
    });

    const preErr = new InvariantViolationError(violation, "pre-method");
    expect(preErr.checkedAt).toBe("pre-method");
    expect(preErr.message).toContain("before");

    const postErr = new InvariantViolationError(violation, "post-method");
    expect(postErr.checkedAt).toBe("post-method");
    expect(postErr.message).toContain("after");
  });
});

// =============================================================================
// Combined Pre/Post/Invariant Tests
// =============================================================================

describe("Combined pre/post/invariants", () => {
  it("checks invariants, preconditions, method execution, postconditions, invariants in order", () => {
    const callOrder: string[] = [];
    let internalCount = 5;

    const counter: Counter = {
      get count() {
        return internalCount;
      },
      increment() {
        callOrder.push("method");
        internalCount++;
      },
      decrement() {
        internalCount--;
      },
      reset() {
        internalCount = 0;
      },
    };

    const spec: StatefulPortSpec<Counter> = {
      invariants: [
        {
          name: "in-range",
          check: (c: Counter) => {
            callOrder.push(`invariant:${c.count}`);
            return c.count >= 0 && c.count <= 100;
          },
          message: "Count must be between 0 and 100",
        },
      ],
      methods: {
        increment: {
          preconditions: [
            {
              name: "always-true",
              check: () => {
                callOrder.push("precondition");
                return true;
              },
              message: "Always passes",
            },
          ],
          postconditions: [
            {
              name: "always-true",
              check: () => {
                callOrder.push("postcondition");
                return true;
              },
              message: "Always passes",
            },
          ],
        },
        decrement: { preconditions: [], postconditions: [] },
        reset: { preconditions: [], postconditions: [] },
      },
    };

    const wrapped = wrapWithVerification(counter, spec, "Counter");
    wrapped.increment();

    // Expected order: pre-invariant, precondition, method, postcondition, post-invariant
    expect(callOrder).toEqual([
      "invariant:5", // pre-method invariant check
      "precondition", // precondition check
      "method", // actual method execution
      "postcondition", // postcondition check
      "invariant:6", // post-method invariant check
    ]);
  });
});

// =============================================================================
// Async Invariant Tests
// =============================================================================

describe("Async invariant verification", () => {
  it("checks invariants around async method calls", async () => {
    interface AsyncCounter {
      readonly count: number;
      incrementAsync(): Promise<void>;
    }

    let internalCount = 0;
    const counter: AsyncCounter = {
      get count() {
        return internalCount;
      },
      async incrementAsync() {
        internalCount++;
      },
    };

    const spec: StatefulPortSpec<AsyncCounter> = {
      invariants: [
        {
          name: "max-10",
          check: (c: AsyncCounter) => c.count <= 10,
          message: "Count must not exceed 10",
        },
      ],
      methods: {
        incrementAsync: { preconditions: [], postconditions: [] },
      },
    };

    const wrapped = wrapWithVerification(counter, spec, "AsyncCounter");

    // Set count to 10 (at limit)
    internalCount = 10;

    // This should fail the post-method invariant because count becomes 11
    await expect(wrapped.incrementAsync()).rejects.toThrow(InvariantViolationError);
  });
});

// =============================================================================
// BehavioralPortSpec type tests
// =============================================================================

describe("BehavioralPortSpec type structure", () => {
  it("allows partial method contracts (not all methods need contracts)", () => {
    // Only specifying 'add' contract, leaving 'divide' unspecified
    const spec: BehavioralPortSpec<Calculator> = {
      methods: {
        add: {
          preconditions: [],
          postconditions: [],
        },
      },
    };

    // Should compile and work
    expect(spec.methods.add).toBeDefined();
    expect(spec.methods.divide).toBeUndefined();
  });

  it("MethodContract has correct structure", () => {
    const contract: MethodContract<readonly [number, number], number> = {
      preconditions: [
        {
          name: "test",
          check: (args: readonly [number, number]) => args[0] > 0,
          message: "First arg must be positive",
        },
      ],
      postconditions: [
        {
          name: "test",
          check: (result: number) => result > 0,
          message: "Result must be positive",
        },
      ],
    };

    expect(contract.preconditions).toHaveLength(1);
    expect(contract.postconditions).toHaveLength(1);
  });
});
