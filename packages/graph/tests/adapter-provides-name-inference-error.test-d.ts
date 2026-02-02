/**
 * Tests for AdapterProvidesName and DiagnosticAdapterProvidesName.
 *
 * ## Design Decision
 *
 * The original `AdapterProvidesName` type returns `never` for invalid inputs.
 * This is necessary because:
 * 1. It is used in type constraints like `AddEdge<..., AdapterProvidesName<...>, ...>`
 *    where string keys are expected
 * 2. `InferenceError` is an object type that would fail these constraints
 * 3. Internal code relies on `never` for type narrowing
 *
 * For better IDE diagnostics, we provide `DiagnosticAdapterProvidesName` that
 * returns `InferenceError` for invalid inputs. This should be used when debugging
 * type issues in IDE tooltips.
 *
 * @module
 */
import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import type {
  AdapterProvidesName,
  DiagnosticAdapterProvidesName,
} from "../src/validation/types/adapter-extraction.js";
import type { InferenceError, IsNever } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";

// Test fixtures using proper port creation
interface Logger {
  log(message: string): void;
}
interface Config {
  get(key: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const ConfigPort = port<Config>()({ name: "Config" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: () => ({ get: () => "" }),
});

// =============================================================================
// AdapterProvidesName: Valid Inputs
// =============================================================================

describe("AdapterProvidesName: valid inputs", () => {
  it("extracts port name from valid adapter", () => {
    expectTypeOf<AdapterProvidesName<typeof LoggerAdapter>>().toEqualTypeOf<"Logger">();
  });

  it("extracts port name from adapter with dependencies", () => {
    expectTypeOf<AdapterProvidesName<typeof ConfigAdapter>>().toEqualTypeOf<"Config">();
  });

  it("distributes over union of adapters", () => {
    expectTypeOf<AdapterProvidesName<typeof LoggerAdapter | typeof ConfigAdapter>>().toEqualTypeOf<
      "Logger" | "Config"
    >();
  });
});

// =============================================================================
// AdapterProvidesName: Invalid Inputs (returns never)
// =============================================================================

describe("AdapterProvidesName: invalid inputs return never", () => {
  it("returns never for object without provides", () => {
    type InvalidNoProvides = { requires: readonly []; lifetime: "singleton" };
    expectTypeOf<AdapterProvidesName<InvalidNoProvides>>().toEqualTypeOf<never>();
  });

  it("returns never for provides without __portName", () => {
    type InvalidProvides = { provides: { notAPort: true }; requires: readonly [] };
    expectTypeOf<AdapterProvidesName<InvalidProvides>>().toEqualTypeOf<never>();
  });

  it("returns never for provides with non-string __portName", () => {
    type InvalidPortName = { provides: { __portName: 123 }; requires: readonly [] };
    expectTypeOf<AdapterProvidesName<InvalidPortName>>().toEqualTypeOf<never>();
  });

  it("returns never for string input", () => {
    expectTypeOf<AdapterProvidesName<string>>().toEqualTypeOf<never>();
  });

  it("returns never for number input", () => {
    expectTypeOf<AdapterProvidesName<number>>().toEqualTypeOf<never>();
  });

  it("returns never for empty object", () => {
    type EmptyObject = Record<string, never>;
    expectTypeOf<AdapterProvidesName<EmptyObject>>().toEqualTypeOf<never>();
  });

  it("preserves never for never input", () => {
    expectTypeOf<AdapterProvidesName<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// DiagnosticAdapterProvidesName: Valid Inputs
// =============================================================================

describe("DiagnosticAdapterProvidesName: valid inputs", () => {
  it("extracts port name from valid adapter", () => {
    expectTypeOf<DiagnosticAdapterProvidesName<typeof LoggerAdapter>>().toEqualTypeOf<"Logger">();
  });

  it("extracts port name from adapter with dependencies", () => {
    expectTypeOf<DiagnosticAdapterProvidesName<typeof ConfigAdapter>>().toEqualTypeOf<"Config">();
  });

  it("distributes over union of adapters", () => {
    expectTypeOf<
      DiagnosticAdapterProvidesName<typeof LoggerAdapter | typeof ConfigAdapter>
    >().toEqualTypeOf<"Logger" | "Config">();
  });
});

// =============================================================================
// DiagnosticAdapterProvidesName: Invalid Inputs (returns InferenceError)
// =============================================================================

describe("DiagnosticAdapterProvidesName: invalid inputs return InferenceError", () => {
  it("returns InferenceError for object without provides", () => {
    type InvalidNoProvides = { requires: readonly []; lifetime: "singleton" };
    type Result = DiagnosticAdapterProvidesName<InvalidNoProvides>;
    // Should NOT be never
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    // Should be InferenceError
    type IsError =
      Result extends InferenceError<"AdapterProvidesName", string, InvalidNoProvides>
        ? true
        : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for provides without __portName", () => {
    type InvalidProvides = { provides: { notAPort: true }; requires: readonly [] };
    type Result = DiagnosticAdapterProvidesName<InvalidProvides>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError =
      Result extends InferenceError<"AdapterProvidesName", string, InvalidProvides> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for provides with non-string __portName", () => {
    type InvalidPortName = { provides: { __portName: 123 }; requires: readonly [] };
    type Result = DiagnosticAdapterProvidesName<InvalidPortName>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError =
      Result extends InferenceError<"AdapterProvidesName", string, InvalidPortName> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for string input", () => {
    type Result = DiagnosticAdapterProvidesName<string>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError =
      Result extends InferenceError<"AdapterProvidesName", string, string> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("returns InferenceError for number input", () => {
    type Result = DiagnosticAdapterProvidesName<number>;
    expectTypeOf<IsNever<Result>>().toEqualTypeOf<false>();
    type IsError =
      Result extends InferenceError<"AdapterProvidesName", string, number> ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("error message mentions what is expected", () => {
    type InvalidNoProvides = { requires: readonly []; lifetime: "singleton" };
    type Result = DiagnosticAdapterProvidesName<InvalidNoProvides>;
    // The error message should guide the user
    type HasGuidance = Result extends { __message: `${string}provides${string}` } ? true : false;
    expectTypeOf<HasGuidance>().toEqualTypeOf<true>();
  });

  it("preserves never for never input", () => {
    // When the input is `never` (empty union), the output should also be `never`
    expectTypeOf<DiagnosticAdapterProvidesName<never>>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Union Distribution Tests
// =============================================================================

describe("AdapterProvidesName: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<AdapterProvidesName<typeof LoggerAdapter | typeof ConfigAdapter>>().toEqualTypeOf<
      "Logger" | "Config"
    >();
  });

  it("invalid members disappear in union", () => {
    type InvalidNoProvides = { requires: readonly []; lifetime: "singleton" };
    // Valid + invalid = only valid (never disappears in union)
    expectTypeOf<
      AdapterProvidesName<typeof LoggerAdapter | InvalidNoProvides>
    >().toEqualTypeOf<"Logger">();
  });
});

describe("DiagnosticAdapterProvidesName: union distribution", () => {
  it("distributes over valid unions", () => {
    expectTypeOf<
      DiagnosticAdapterProvidesName<typeof LoggerAdapter | typeof ConfigAdapter>
    >().toEqualTypeOf<"Logger" | "Config">();
  });

  it("preserves both valid and error results in union", () => {
    type InvalidNoProvides = { requires: readonly []; lifetime: "singleton" };
    type Result = DiagnosticAdapterProvidesName<typeof LoggerAdapter | InvalidNoProvides>;
    // Check that "Logger" is part of the union
    type HasLogger = "Logger" extends Result ? true : false;
    expectTypeOf<HasLogger>().toEqualTypeOf<true>();
    // The result type includes both "Logger" and InferenceError
    // We verify InferenceError is present by checking the result is not assignable to just string
    type IsOnlyString = Result extends string ? true : false;
    expectTypeOf<IsOnlyString>().toEqualTypeOf<false>();
  });
});
