import { describe, it, expect } from "vitest";
import { ok, err, some, none, ResultAsync } from "@hex-di/result";
import { setupResultMatchers } from "../src/index.js";

// =============================================================================
// BEH-T02-002: toBeOk
// =============================================================================

describe("toBeOk", () => {
  it("passes for Ok result (no arg)", () => {
    expect(ok(42)).toBeOk();
  });

  it("passes for Ok result with matching value", () => {
    expect(ok(42)).toBeOk(42);
  });

  it("passes with deep equal objects", () => {
    expect(ok({ a: 1 })).toBeOk({ a: 1 });
  });

  it("fails for Err result", () => {
    expect(() => expect(err("fail")).toBeOk()).toThrow(
      'expected result to be Ok but got Err("fail")'
    );
  });

  it("fails for Ok with mismatched value", () => {
    expect(() => expect(ok(42)).toBeOk(99)).toThrow("expected result to be Ok(99) but got Ok(42)");
  });

  it("supports .not negation", () => {
    expect(err("fail")).not.toBeOk();
  });

  it("supports .not with value", () => {
    expect(ok(42)).not.toBeOk(99);
  });

  it(".not fails when Ok (no arg)", () => {
    expect(() => expect(ok(42)).not.toBeOk()).toThrow("expected result not to be Ok");
  });

  it(".not fails when Ok matches value", () => {
    expect(() => expect(ok(42)).not.toBeOk(42)).toThrow("expected result not to be Ok(42)");
  });

  // TINV-4: uses this.equals(), not JSON equality
  // JSON.stringify(/test/) === JSON.stringify({}) === "{}", but this.equals distinguishes them
  it("distinguishes RegExp from plain object (TINV-4)", () => {
    expect(ok(/test/)).toBeOk(/test/);
    expect(() => expect(ok(/test/)).toBeOk({})).toThrow();
  });
});

// =============================================================================
// BEH-T02-003: toBeErr
// =============================================================================

describe("toBeErr", () => {
  it("passes for Err result (no arg)", () => {
    expect(err("fail")).toBeErr();
  });

  it("passes for Err result with matching error", () => {
    expect(err("fail")).toBeErr("fail");
  });

  it("passes with deep equal error objects", () => {
    expect(err({ _tag: "NotFound" })).toBeErr({ _tag: "NotFound" });
  });

  it("fails for Ok result", () => {
    expect(() => expect(ok(42)).toBeErr()).toThrow("expected result to be Err but got Ok(42)");
  });

  it("fails for Err with mismatched error", () => {
    expect(() => expect(err("a")).toBeErr("b")).toThrow(
      'expected result to be Err("b") but got Err("a")'
    );
  });

  it("supports .not negation", () => {
    expect(ok(42)).not.toBeErr();
  });

  it(".not fails when Err (no arg)", () => {
    expect(() => expect(err("fail")).not.toBeErr()).toThrow("expected result not to be Err");
  });

  it(".not fails when Err matches error", () => {
    expect(() => expect(err("fail")).not.toBeErr("fail")).toThrow(
      'expected result not to be Err("fail")'
    );
  });
});

// =============================================================================
// BEH-T02-004: toBeOkWith
// =============================================================================

describe("toBeOkWith", () => {
  it("passes when Ok value deeply equals expected", () => {
    expect(ok({ a: 1 })).toBeOkWith({ a: 1 });
  });

  it("fails when Ok value differs from expected", () => {
    expect(() => expect(ok(42)).toBeOkWith(99)).toThrow("expected Ok(99) but got Ok(42)");
  });

  it("fails when result is Err", () => {
    expect(() => expect(err("fail")).toBeOkWith(42)).toThrow(
      'expected result to be Ok(42) but got Err("fail")'
    );
  });

  it("supports .not negation", () => {
    expect(ok(42)).not.toBeOkWith(99);
  });

  it(".not fails when Ok value matches", () => {
    expect(() => expect(ok(42)).not.toBeOkWith(42)).toThrow("expected result not to be Ok(42)");
  });
});

// =============================================================================
// BEH-T02-005: toBeErrWith
// =============================================================================

describe("toBeErrWith", () => {
  it("passes when Err error deeply equals expected", () => {
    expect(err({ code: 404 })).toBeErrWith({ code: 404 });
  });

  it("fails when Err error differs from expected", () => {
    expect(() => expect(err("a")).toBeErrWith("b")).toThrow('expected Err("b") but got Err("a")');
  });

  it("fails when result is Ok", () => {
    expect(() => expect(ok(42)).toBeErrWith("fail")).toThrow(
      'expected result to be Err("fail") but got Ok(42)'
    );
  });

  it("supports .not negation", () => {
    expect(err("a")).not.toBeErrWith("b");
  });

  it(".not fails when Err error matches", () => {
    expect(() => expect(err("fail")).not.toBeErrWith("fail")).toThrow(
      'expected result not to be Err("fail")'
    );
  });
});

// =============================================================================
// BEH-T02-006: toBeSome
// =============================================================================

describe("toBeSome", () => {
  it("passes for Some option (no arg)", () => {
    expect(some(42)).toBeSome();
  });

  it("passes for Some option with matching value", () => {
    expect(some(42)).toBeSome(42);
  });

  it("passes with deep equal objects", () => {
    expect(some({ x: 1 })).toBeSome({ x: 1 });
  });

  it("fails for None option", () => {
    expect(() => expect(none()).toBeSome()).toThrow("expected option to be Some but got None");
  });

  it("fails for Some with mismatched value", () => {
    expect(() => expect(some(42)).toBeSome(99)).toThrow(
      "expected option to be Some(99) but got Some(42)"
    );
  });

  it("supports .not negation", () => {
    expect(none()).not.toBeSome();
  });

  it(".not passes for Some with different value", () => {
    expect(some(42)).not.toBeSome(99);
  });

  it(".not fails when Some (no arg)", () => {
    expect(() => expect(some(42)).not.toBeSome()).toThrow("expected option not to be Some");
  });

  it(".not fails when Some matches value", () => {
    expect(() => expect(some(42)).not.toBeSome(42)).toThrow("expected option not to be Some(42)");
  });
});

// =============================================================================
// BEH-T02-007: toBeNone
// =============================================================================

describe("toBeNone", () => {
  it("passes for None option", () => {
    expect(none()).toBeNone();
  });

  it("fails for Some option", () => {
    expect(() => expect(some(42)).toBeNone()).toThrow(
      "expected option to be None but got Some(42)"
    );
  });

  it("supports .not negation", () => {
    expect(some(42)).not.toBeNone();
  });

  it(".not fails when is None", () => {
    expect(() => expect(none()).not.toBeNone()).toThrow("expected option not to be None");
  });
});

// =============================================================================
// BEH-T02-008: toContainOk (strict === via Result.contains())
// =============================================================================

describe("toContainOk", () => {
  it("passes when Ok contains the value (strict ===)", () => {
    expect(ok(42)).toContainOk(42);
  });

  it("passes with same string reference", () => {
    expect(ok("hello")).toContainOk("hello");
  });

  it("fails with different object references (strict ===)", () => {
    expect(() => expect(ok({ a: 1 })).toContainOk({ a: 1 })).toThrow(
      "expected result to contain Ok"
    );
  });

  it("passes with same object reference", () => {
    const ref = { a: 1 };
    expect(ok(ref)).toContainOk(ref);
  });

  it("fails when result is Err", () => {
    expect(() => expect(err("fail")).toContainOk(42)).toThrow(
      'expected result to contain Ok(42) but got Err("fail")'
    );
  });

  it("supports .not negation", () => {
    expect(ok(42)).not.toContainOk(99);
  });

  it(".not fails when value is contained", () => {
    expect(() => expect(ok(42)).not.toContainOk(42)).toThrow(
      "expected result not to contain Ok(42)"
    );
  });
});

// =============================================================================
// BEH-T02-009: toContainErr (strict === via Result.containsErr())
// =============================================================================

describe("toContainErr", () => {
  it("passes when Err contains the error (strict ===)", () => {
    expect(err("fail")).toContainErr("fail");
  });

  it("fails with different object references (strict ===)", () => {
    expect(() => expect(err({ code: 404 })).toContainErr({ code: 404 })).toThrow(
      "expected result to contain Err"
    );
  });

  it("passes with same object reference", () => {
    const ref = { code: 404 };
    expect(err(ref)).toContainErr(ref);
  });

  it("fails when result is Ok", () => {
    expect(() => expect(ok(42)).toContainErr("fail")).toThrow(
      'expected result to contain Err("fail") but got Ok(42)'
    );
  });

  it("supports .not negation", () => {
    expect(err("a")).not.toContainErr("b");
  });

  it(".not fails when error is contained", () => {
    expect(() => expect(err("fail")).not.toContainErr("fail")).toThrow(
      'expected result not to contain Err("fail")'
    );
  });
});

// =============================================================================
// Input validation: Result matchers reject non-Result inputs
// =============================================================================

describe("input validation (Result matchers)", () => {
  it("rejects number", () => {
    expect(() => expect(42).toBeOk()).toThrow("expected a Result but received number");
  });

  it("rejects null", () => {
    expect(() => expect(null).toBeOk()).toThrow("expected a Result but received null");
  });

  it("rejects undefined", () => {
    expect(() => expect(undefined).toBeOk()).toThrow("expected a Result but received undefined");
  });

  it("rejects object without _tag", () => {
    expect(() => expect({ value: 42 }).toBeOk()).toThrow(
      "expected a Result but received an object without _tag"
    );
  });

  it("rejects object with wrong _tag", () => {
    expect(() => expect({ _tag: "Maybe" }).toBeOk()).toThrow(
      'expected a Result (Ok or Err) but received object with _tag "Maybe"'
    );
  });

  it(".not also fails for non-Result", () => {
    expect(() => expect(42).not.toBeOk()).toThrow("expected a Result but received number");
  });

  it("rejects non-Result for toBeErr", () => {
    expect(() => expect("string").toBeErr()).toThrow("expected a Result but received string");
  });

  it("rejects non-Result for toBeOkWith", () => {
    expect(() => expect(42).toBeOkWith(42)).toThrow("expected a Result but received number");
  });

  it("rejects non-Result for toBeErrWith", () => {
    expect(() => expect(42).toBeErrWith("x")).toThrow("expected a Result but received number");
  });

  it("rejects non-Result for toContainOk", () => {
    expect(() => expect(42).toContainOk(42)).toThrow("expected a Result but received number");
  });

  it("rejects non-Result for toContainErr", () => {
    expect(() => expect(42).toContainErr("x")).toThrow("expected a Result but received number");
  });
});

// =============================================================================
// Input validation: Option matchers reject non-Option inputs
// =============================================================================

describe("input validation (Option matchers)", () => {
  it("rejects number for toBeSome", () => {
    expect(() => expect(42).toBeSome()).toThrow("expected an Option but received number");
  });

  it("rejects null for toBeSome", () => {
    expect(() => expect(null).toBeSome()).toThrow("expected an Option but received null");
  });

  it("rejects undefined for toBeNone", () => {
    expect(() => expect(undefined).toBeNone()).toThrow("expected an Option but received undefined");
  });

  it("rejects object without _tag for toBeSome", () => {
    expect(() => expect({ value: 42 }).toBeSome()).toThrow(
      "expected an Option but received an object without _tag"
    );
  });

  it("rejects object with wrong _tag for toBeSome", () => {
    expect(() => expect({ _tag: "Ok" }).toBeSome()).toThrow(
      'expected an Option (Some or None) but received object with _tag "Ok"'
    );
  });

  it(".not also fails for non-Option", () => {
    expect(() => expect(42).not.toBeSome()).toThrow("expected an Option but received number");
  });
});

// =============================================================================
// toResolveToOk (async)
// =============================================================================

describe("toResolveToOk", () => {
  it("passes for Ok ResultAsync (no arg)", async () => {
    await expect(ResultAsync.ok(42)).toResolveToOk();
  });

  it("passes for Ok ResultAsync with matching value", async () => {
    await expect(ResultAsync.ok(42)).toResolveToOk(42);
  });

  it("passes with deep equal objects", async () => {
    await expect(ResultAsync.ok({ a: 1 })).toResolveToOk({ a: 1 });
  });

  it("fails for Err ResultAsync", async () => {
    await expect(expect(ResultAsync.err("fail")).toResolveToOk()).rejects.toThrow(
      "expected ResultAsync to resolve to Ok but got Err"
    );
  });

  it("fails for Ok with mismatched value", async () => {
    await expect(expect(ResultAsync.ok(42)).toResolveToOk(99)).rejects.toThrow(
      "expected ResultAsync to resolve to Ok(99) but got Ok(42)"
    );
  });

  it("supports .not negation", async () => {
    await expect(ResultAsync.err("fail")).not.toResolveToOk();
  });

  it(".not fails when Ok (no arg)", async () => {
    await expect(expect(ResultAsync.ok(42)).not.toResolveToOk()).rejects.toThrow(
      "expected ResultAsync not to resolve to Ok"
    );
  });

  it("rejects non-ResultAsync input", async () => {
    await expect(expect(42).toResolveToOk()).rejects.toThrow(
      "expected a ResultAsync but received number"
    );
  });
});

// =============================================================================
// toResolveToErr (async)
// =============================================================================

describe("toResolveToErr", () => {
  it("passes for Err ResultAsync (no arg)", async () => {
    await expect(ResultAsync.err("fail")).toResolveToErr();
  });

  it("passes for Err ResultAsync with matching error", async () => {
    await expect(ResultAsync.err("fail")).toResolveToErr("fail");
  });

  it("passes with deep equal error objects", async () => {
    await expect(ResultAsync.err({ code: 404 })).toResolveToErr({ code: 404 });
  });

  it("fails for Ok ResultAsync", async () => {
    await expect(expect(ResultAsync.ok(42)).toResolveToErr()).rejects.toThrow(
      "expected ResultAsync to resolve to Err but got Ok(42)"
    );
  });

  it("fails for Err with mismatched error", async () => {
    await expect(expect(ResultAsync.err("a")).toResolveToErr("b")).rejects.toThrow(
      'expected ResultAsync to resolve to Err("b") but got Err("a")'
    );
  });

  it("supports .not negation", async () => {
    await expect(ResultAsync.ok(42)).not.toResolveToErr();
  });

  it(".not fails when Err (no arg)", async () => {
    await expect(expect(ResultAsync.err("fail")).not.toResolveToErr()).rejects.toThrow(
      "expected ResultAsync not to resolve to Err"
    );
  });

  it("rejects non-ResultAsync input", async () => {
    await expect(expect(null).toResolveToErr()).rejects.toThrow(
      "expected a ResultAsync but received null"
    );
  });
});

// =============================================================================
// toResolveToOkWith (async)
// =============================================================================

describe("toResolveToOkWith", () => {
  it("passes when Ok value deeply equals expected", async () => {
    await expect(ResultAsync.ok({ a: 1 })).toResolveToOkWith({ a: 1 });
  });

  it("fails when Ok value differs from expected", async () => {
    await expect(expect(ResultAsync.ok(42)).toResolveToOkWith(99)).rejects.toThrow(
      "expected Ok(99) but got Ok(42)"
    );
  });

  it("fails when result is Err", async () => {
    await expect(expect(ResultAsync.err("fail")).toResolveToOkWith(42)).rejects.toThrow(
      'expected ResultAsync to resolve to Ok(42) but got Err("fail")'
    );
  });

  it("supports .not negation", async () => {
    await expect(ResultAsync.ok(42)).not.toResolveToOkWith(99);
  });

  it(".not fails when Ok value matches", async () => {
    await expect(expect(ResultAsync.ok(42)).not.toResolveToOkWith(42)).rejects.toThrow(
      "expected ResultAsync not to resolve to Ok(42)"
    );
  });
});

// =============================================================================
// toResolveToErrWith (async)
// =============================================================================

describe("toResolveToErrWith", () => {
  it("passes when Err error deeply equals expected", async () => {
    await expect(ResultAsync.err({ code: 404 })).toResolveToErrWith({ code: 404 });
  });

  it("fails when Err error differs from expected", async () => {
    await expect(expect(ResultAsync.err("a")).toResolveToErrWith("b")).rejects.toThrow(
      'expected Err("b") but got Err("a")'
    );
  });

  it("fails when result is Ok", async () => {
    await expect(expect(ResultAsync.ok(42)).toResolveToErrWith("fail")).rejects.toThrow(
      'expected ResultAsync to resolve to Err("fail") but got Ok(42)'
    );
  });

  it("supports .not negation", async () => {
    await expect(ResultAsync.err("a")).not.toResolveToErrWith("b");
  });

  it(".not fails when Err error matches", async () => {
    await expect(expect(ResultAsync.err("fail")).not.toResolveToErrWith("fail")).rejects.toThrow(
      'expected ResultAsync not to resolve to Err("fail")'
    );
  });
});

// =============================================================================
// toHaveErrorTag
// =============================================================================

describe("toHaveErrorTag", () => {
  it("passes when _tag matches", () => {
    expect({ _tag: "NotFound" }).toHaveErrorTag("NotFound");
  });

  it("fails when _tag differs", () => {
    expect(() => expect({ _tag: "NotFound" }).toHaveErrorTag("Timeout")).toThrow(
      'expected error to have tag "Timeout" but got "NotFound"'
    );
  });

  it("supports .not negation", () => {
    expect({ _tag: "NotFound" }).not.toHaveErrorTag("Timeout");
  });

  it(".not fails when _tag matches", () => {
    expect(() => expect({ _tag: "NotFound" }).not.toHaveErrorTag("NotFound")).toThrow(
      'expected error not to have tag "NotFound"'
    );
  });

  it("rejects non-tagged input", () => {
    expect(() => expect(42).toHaveErrorTag("x")).toThrow(
      "expected a tagged error but received number"
    );
  });

  it("rejects object without string _tag", () => {
    expect(() => expect({ _tag: 123 }).toHaveErrorTag("x")).toThrow(
      "expected a tagged error but received an object without string _tag"
    );
  });
});

// =============================================================================
// toHaveErrorNamespace
// =============================================================================

describe("toHaveErrorNamespace", () => {
  it("passes when _namespace matches", () => {
    expect({ _tag: "NotFound", _namespace: "HttpError" }).toHaveErrorNamespace("HttpError");
  });

  it("fails when _namespace differs", () => {
    expect(() =>
      expect({ _tag: "NotFound", _namespace: "HttpError" }).toHaveErrorNamespace("DbError")
    ).toThrow('expected error to have namespace "DbError" but got "HttpError"');
  });

  it("supports .not negation", () => {
    expect({ _tag: "NotFound", _namespace: "HttpError" }).not.toHaveErrorNamespace("DbError");
  });

  it(".not fails when _namespace matches", () => {
    expect(() =>
      expect({ _tag: "NotFound", _namespace: "HttpError" }).not.toHaveErrorNamespace("HttpError")
    ).toThrow('expected error not to have namespace "HttpError"');
  });

  it("fails when _namespace is not a string", () => {
    expect(() => expect({ _tag: "NotFound" }).toHaveErrorNamespace("HttpError")).toThrow(
      'expected error to have namespace "HttpError" but _namespace is not a string'
    );
  });
});

// =============================================================================
// toHaveResultJSON
// =============================================================================

describe("toHaveResultJSON", () => {
  it("passes for valid Ok JSON shape", () => {
    expect({ _tag: "Ok", _schemaVersion: 1, value: 42 }).toHaveResultJSON();
  });

  it("passes for valid Err JSON shape", () => {
    expect({ _tag: "Err", _schemaVersion: 1, error: "fail" }).toHaveResultJSON();
  });

  it("passes for Result.toJSON() output", () => {
    expect(ok(42).toJSON()).toHaveResultJSON();
  });

  it("fails for object without _schemaVersion", () => {
    expect(() => expect({ _tag: "Ok", value: 42 }).toHaveResultJSON()).toThrow(
      "expected a valid Result JSON shape"
    );
  });

  it("fails for object without _tag", () => {
    expect(() => expect({ _schemaVersion: 1, value: 42 }).toHaveResultJSON()).toThrow(
      "expected a valid Result JSON shape"
    );
  });

  it("fails for null", () => {
    expect(() => expect(null).toHaveResultJSON()).toThrow(
      "expected a valid Result JSON shape but received null"
    );
  });

  it("supports .not negation", () => {
    expect({ _tag: "Maybe", value: 42 }).not.toHaveResultJSON();
  });

  it(".not fails for valid shape", () => {
    expect(() =>
      expect({ _tag: "Ok", _schemaVersion: 1, value: 42 }).not.toHaveResultJSON()
    ).toThrow("expected value not to have valid Result JSON shape");
  });
});

// =============================================================================
// toRoundTripJSON
// =============================================================================

describe("toRoundTripJSON", () => {
  it("passes for Ok result", () => {
    expect(ok(42)).toRoundTripJSON();
  });

  it("passes for Err result", () => {
    expect(err("fail")).toRoundTripJSON();
  });

  it("passes for Ok with complex value", () => {
    expect(ok({ nested: { deep: true } })).toRoundTripJSON();
  });

  it("fails for non-Result without toJSON", () => {
    expect(() => expect(42).toRoundTripJSON()).toThrow("expected a Result with toJSON() method");
  });

  it("supports .not negation on non-toJSON objects", () => {
    expect(42).not.toRoundTripJSON();
  });
});

// =============================================================================
// Input validation: ResultAsync matchers reject non-ResultAsync inputs
// =============================================================================

describe("input validation (ResultAsync matchers)", () => {
  it("rejects undefined for toResolveToOk", async () => {
    await expect(expect(undefined).toResolveToOk()).rejects.toThrow(
      "expected a ResultAsync but received undefined"
    );
  });

  it("rejects object without then for toResolveToErr", async () => {
    await expect(expect({ _tag: "Ok" }).toResolveToErr()).rejects.toThrow(
      "expected a ResultAsync but received an object without then method"
    );
  });
});

// =============================================================================
// TINV-3: Idempotent setup
// =============================================================================

describe("idempotent setup (TINV-3)", () => {
  it("calling setupResultMatchers twice does not break matchers", () => {
    setupResultMatchers();
    setupResultMatchers();

    expect(ok(42)).toBeOk();
    expect(err("fail")).toBeErr();
    expect(some(42)).toBeSome();
    expect(none()).toBeNone();
  });
});
