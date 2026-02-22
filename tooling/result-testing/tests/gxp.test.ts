import { describe, it, expect } from "vitest";
import { ok, err, some, none, ResultAsync, fromPromise } from "@hex-di/result";
import {
  expectFrozen,
  expectResultBrand,
  expectOptionBrand,
  expectImmutableResult,
  expectNeverRejects,
} from "../src/index.js";

// =============================================================================
// BEH-T04-001: expectFrozen
// =============================================================================

describe("expectFrozen", () => {
  it("passes for a frozen object", () => {
    const obj = Object.freeze({ a: 1 });
    expectFrozen(obj);
  });

  it("passes for genuine Result (frozen by design)", () => {
    expectFrozen(ok(42));
  });

  it("passes for primitive values (always frozen)", () => {
    expectFrozen(42);
    expectFrozen("hello");
    expectFrozen(true);
    expectFrozen(Symbol("x"));
  });

  it("throws for null", () => {
    expect(() => expectFrozen(null)).toThrow(
      "Expected value to be frozen, but received null",
    );
  });

  it("throws for undefined", () => {
    expect(() => expectFrozen(undefined)).toThrow(
      "Expected value to be frozen, but received undefined",
    );
  });

  it("throws for non-frozen object", () => {
    expect(() => expectFrozen({ a: 1 })).toThrow(
      "Expected value to be frozen (Object.isFrozen), but it is not:",
    );
  });

  it("includes preview in error message", () => {
    expect(() => expectFrozen({ key: "value" })).toThrow('{"key":"value"}');
  });
});

// =============================================================================
// BEH-T04-002: expectResultBrand
// =============================================================================

describe("expectResultBrand", () => {
  it("passes for genuine Ok result", () => {
    expectResultBrand(ok(42));
  });

  it("passes for genuine Err result", () => {
    expectResultBrand(err("fail"));
  });

  it("throws for structural fake", () => {
    expect(() => expectResultBrand({ _tag: "Ok", value: 42 })).toThrow(
      "Expected value to carry RESULT_BRAND symbol, but it does not",
    );
  });

  it("throws for non-object (number)", () => {
    expect(() => expectResultBrand(42)).toThrow(
      "Expected an object, but received number",
    );
  });

  it("throws for null", () => {
    expect(() => expectResultBrand(null)).toThrow(
      "Expected an object, but received null",
    );
  });

  it("throws for undefined", () => {
    expect(() => expectResultBrand(undefined)).toThrow(
      "Expected an object, but received undefined",
    );
  });
});

// =============================================================================
// BEH-T04-003: expectOptionBrand
// =============================================================================

describe("expectOptionBrand", () => {
  it("passes for genuine Some option", () => {
    expectOptionBrand(some(42));
  });

  it("passes for genuine None option", () => {
    expectOptionBrand(none());
  });

  it("throws for structural fake", () => {
    expect(() => expectOptionBrand({ _tag: "Some", value: 42 })).toThrow(
      "Expected value to carry OPTION_BRAND symbol, but it does not",
    );
  });

  it("throws for non-object (string)", () => {
    expect(() => expectOptionBrand("hello")).toThrow(
      "Expected an object, but received string",
    );
  });

  it("throws for null", () => {
    expect(() => expectOptionBrand(null)).toThrow(
      "Expected an object, but received null",
    );
  });
});

// =============================================================================
// BEH-T04-004: expectImmutableResult
// =============================================================================

describe("expectImmutableResult", () => {
  it("passes for genuine Ok result", () => {
    expectImmutableResult(ok(42));
  });

  it("passes for genuine Err result", () => {
    expectImmutableResult(err("fail"));
  });

  it("passes for Ok with complex value", () => {
    expectImmutableResult(ok({ nested: { deep: true } }));
  });

  it("checks frozen (step 1)", () => {
    expect(() => expectImmutableResult(null as never)).toThrow("frozen");
  });

  it("checks brand (step 2)", () => {
    const fake = Object.freeze({ _tag: "Ok", value: 42 });
    expect(() => expectImmutableResult(fake as never)).toThrow("RESULT_BRAND");
  });

  it("checks _tag validity (step 3)", async () => {
    // Simulate a branded but wrong-tagged object
    const { RESULT_BRAND } = await import("@hex-di/result");
    const fake = Object.freeze({ [RESULT_BRAND]: true, _tag: "Invalid" });
    expect(() => expectImmutableResult(fake as never)).toThrow(
      'Expected _tag to be "Ok" or "Err"',
    );
  });

  it("checks 'value' property on Ok (step 4)", async () => {
    const { RESULT_BRAND } = await import("@hex-di/result");
    const fake = Object.freeze({ [RESULT_BRAND]: true, _tag: "Ok" });
    expect(() => expectImmutableResult(fake as never)).toThrow(
      'Expected Ok result to have "value" property',
    );
  });

  it("checks 'error' property on Err (step 5)", async () => {
    const { RESULT_BRAND } = await import("@hex-di/result");
    const fake = Object.freeze({ [RESULT_BRAND]: true, _tag: "Err" });
    expect(() => expectImmutableResult(fake as never)).toThrow(
      'Expected Err result to have "error" property',
    );
  });
});

// =============================================================================
// BEH-T04-005: expectNeverRejects
// =============================================================================

describe("expectNeverRejects", () => {
  it("passes for ResultAsync that resolves to Ok", async () => {
    await expectNeverRejects(ResultAsync.ok(42));
  });

  it("passes for ResultAsync that resolves to Err", async () => {
    await expectNeverRejects(ResultAsync.err("fail"));
  });

  it("passes for fromPromise wrapping a rejection", async () => {
    const resultAsync = fromPromise(
      Promise.reject("network error"),
      (e) => String(e),
    );
    await expectNeverRejects(resultAsync);
  });
});
