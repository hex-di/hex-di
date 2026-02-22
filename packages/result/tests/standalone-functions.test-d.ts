import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result } from "../src/index.js";
import type { Option } from "../src/option/types.js";
import {
  pipe,
  map,
  mapErr,
  andThen,
  match,
  unwrapOr,
  flatten,
  flip,
  contains,
  containsErr,
  toNullable,
  toUndefined,
  intoTuple,
  merge,
  toOption,
} from "../src/fn/index.js";

// BEH-10-001 through BEH-10-004
describe("Standalone Functions - Type Level", () => {
  it("map returns a curried function Result<T,E> => Result<U,E>", () => {
    const fn = map((x: number) => String(x));
    expectTypeOf(fn).toBeFunction();
    const result = fn(ok(42));
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  it("mapErr returns a curried function Result<T,E> => Result<T,F>", () => {
    const fn = mapErr((e: string) => new Error(e));
    const result = fn(err("fail"));
    expectTypeOf(result).toMatchTypeOf<Result<never, Error>>();
  });

  it("andThen returns a curried function Result<T,E> => Result<U,E|F>", () => {
    const fn = andThen((x: number) => ok(String(x)));
    const result = fn(ok(1));
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  it("match extracts the final value from both branches", () => {
    const fn = match(
      (v: number) => `ok: ${v}`,
      (e: string) => `err: ${e}`,
    );
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toEqualTypeOf<string>();
  });

  it("unwrapOr returns T | U", () => {
    const fn = unwrapOr(0);
    const result = fn(ok(42));
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("flip swaps Ok/Err type parameters", () => {
    const fn = flip<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toMatchTypeOf<Result<string, number>>();
  });

  it("flatten removes one layer of nesting", () => {
    const fn = flatten<number, string, string>();
    const nested: Result<Result<number, string>, string> = ok(ok(42) as Result<number, string>);
    const result = fn(nested);
    expectTypeOf(result).toMatchTypeOf<Result<number, string>>();
  });

  it("toNullable returns T | null", () => {
    const fn = toNullable<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toEqualTypeOf<number | null>();
  });

  it("toUndefined returns T | undefined", () => {
    const fn = toUndefined<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toEqualTypeOf<number | undefined>();
  });

  it("intoTuple returns [null, T] | [E, null]", () => {
    const fn = intoTuple<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toMatchTypeOf<[null, number] | [string, null]>();
  });

  it("merge returns T | E", () => {
    const fn = merge<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toEqualTypeOf<number | string>();
  });

  it("contains returns boolean", () => {
    const fn = contains(42);
    const result = fn(ok(42));
    expectTypeOf(result).toEqualTypeOf<boolean>();
  });

  it("containsErr returns boolean", () => {
    const fn = containsErr("fail");
    const result = fn(err("fail"));
    expectTypeOf(result).toEqualTypeOf<boolean>();
  });

  it("toOption returns Option<T>", () => {
    const fn = toOption<number, string>();
    const result = fn(ok(42) as Result<number, string>);
    expectTypeOf(result).toMatchTypeOf<Option<number>>();
  });

  it("pipe composes functions with correct type inference", () => {
    const result = pipe(
      ok(42),
      map((x: number) => x * 2),
      map((x: number) => String(x)),
    );
    expectTypeOf(result).toMatchTypeOf<Result<string, never>>();
  });

  it("pipe with single value returns the value unchanged", () => {
    const result = pipe(42);
    expectTypeOf(result).toEqualTypeOf<number>();
  });
});
