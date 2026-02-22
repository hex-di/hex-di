import { describe, it, expectTypeOf } from "vitest";
import { some, none, isOption, fromOptionJSON } from "../src/index.js";
import type { Option, Some, None } from "../src/index.js";
import type { Ok, Err, Result } from "../src/index.js";

// BEH-09-002 through BEH-09-010
describe("Option - Type Level", () => {
  it("some(42) is Some<number>", () => {
    const s = some(42);
    expectTypeOf(s).toMatchTypeOf<Some<number>>();
  });

  it("none() is None", () => {
    const n = none();
    expectTypeOf(n).toMatchTypeOf<None>();
  });

  it("Option<T> is the union of Some<T> and None", () => {
    expectTypeOf<Some<string>>().toMatchTypeOf<Option<string>>();
    expectTypeOf<None>().toMatchTypeOf<Option<string>>();
  });

  it("Some._tag is literal 'Some'", () => {
    const s = some("hello");
    expectTypeOf(s._tag).toEqualTypeOf<"Some">();
  });

  it("None._tag is literal 'None'", () => {
    const n = none();
    expectTypeOf(n._tag).toEqualTypeOf<"None">();
  });

  it("Some.map preserves Some wrapper", () => {
    const mapped = some(1).map((x) => String(x));
    expectTypeOf(mapped).toMatchTypeOf<Some<string>>();
  });

  it("None.map returns None", () => {
    const mapped = none().map((x) => String(x));
    expectTypeOf(mapped).toMatchTypeOf<None>();
  });

  it("Some.match returns onSome branch type", () => {
    const result = some(42).match(
      (v) => `val: ${v}`,
      () => "none",
    );
    expectTypeOf(result).toEqualTypeOf<string>();
  });

  it("Some.unwrapOr returns T (not default type)", () => {
    const val = some(42).unwrapOr(0);
    expectTypeOf(val).toEqualTypeOf<number>();
  });

  it("None.unwrapOr returns the default type", () => {
    const val = none().unwrapOr(0);
    expectTypeOf(val).toEqualTypeOf<number>();
  });

  it("Some.toResult returns Ok<T, E>", () => {
    const r = some(42).toResult(() => "err" as const);
    expectTypeOf(r).toMatchTypeOf<Ok<number, "err">>();
  });

  it("None.toResult returns Err<never, E>", () => {
    const r = none().toResult(() => "missing" as const);
    expectTypeOf(r).toMatchTypeOf<Err<never, "missing">>();
  });

  it("Some.toNullable returns T", () => {
    expectTypeOf(some(42).toNullable()).toEqualTypeOf<number>();
  });

  it("None.toNullable returns null", () => {
    expectTypeOf(none().toNullable()).toEqualTypeOf<null>();
  });

  it("Some.toJSON returns tagged object with value", () => {
    const json = some(42).toJSON();
    expectTypeOf(json).toEqualTypeOf<{ _tag: "Some"; _schemaVersion: 1; value: number }>();
  });

  it("None.toJSON returns tagged object without value", () => {
    const json = none().toJSON();
    expectTypeOf(json).toEqualTypeOf<{ _tag: "None"; _schemaVersion: 1 }>();
  });

  it("isOption narrows unknown to Option<unknown>", () => {
    const val: unknown = some(1);
    if (isOption(val)) {
      expectTypeOf(val).toMatchTypeOf<Option<unknown>>();
    }
  });

  it("fromOptionJSON returns Option<T>", () => {
    const restored = fromOptionJSON({ _tag: "Some", value: 42 });
    expectTypeOf(restored).toMatchTypeOf<Option<number>>();
  });

  it("Some.andThen returns Option<U>", () => {
    const result = some(42).andThen((v) => (v > 0 ? some(String(v)) : none()));
    expectTypeOf(result).toMatchTypeOf<Option<string>>();
  });

  it("Option narrowing via isSome gives access to value", () => {
    const opt: Option<number> = some(1);
    if (opt.isSome()) {
      expectTypeOf(opt.value).toEqualTypeOf<number>();
      expectTypeOf(opt._tag).toEqualTypeOf<"Some">();
    }
  });

  it("Option narrowing via isNone gives None tag", () => {
    const opt: Option<number> = none();
    if (opt.isNone()) {
      expectTypeOf(opt._tag).toEqualTypeOf<"None">();
    }
  });
});
