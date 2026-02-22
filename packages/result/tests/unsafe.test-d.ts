import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import { unwrap, unwrapErr } from "../src/unsafe/unwrap.js";
import { UnwrapError } from "../src/unsafe/unwrap-error.js";

// BEH-11-001 through BEH-11-005
describe("Unsafe - Type Level", () => {
  it("unwrap(Ok<number, never>) returns number", () => {
    const val = unwrap(ok(42));
    expectTypeOf(val).toEqualTypeOf<number>();
  });

  it("unwrap(Result<number, string>) returns number", () => {
    const result: Result<number, string> = ok(42);
    const val = unwrap(result);
    expectTypeOf(val).toEqualTypeOf<number>();
  });

  it("unwrapErr(Err<never, string>) returns string", () => {
    const val = unwrapErr(err("fail"));
    expectTypeOf(val).toEqualTypeOf<string>();
  });

  it("unwrapErr(Result<number, string>) returns string", () => {
    const result: Result<number, string> = err("fail");
    const val = unwrapErr(result);
    expectTypeOf(val).toEqualTypeOf<string>();
  });

  it("UnwrapError is an Error subclass", () => {
    expectTypeOf<UnwrapError>().toMatchTypeOf<Error>();
  });

  it("UnwrapError.context has _tag and value properties", () => {
    const e = new UnwrapError("msg", { _tag: "Err", value: "x" });
    expectTypeOf(e.context).toMatchTypeOf<{
      readonly _tag: "Ok" | "Err";
      readonly value: unknown;
    }>();
  });

  it("UnwrapError.context._tag is 'Ok' | 'Err'", () => {
    const e = new UnwrapError("msg", { _tag: "Ok", value: 42 });
    expectTypeOf(e.context._tag).toEqualTypeOf<"Ok" | "Err">();
  });
});
