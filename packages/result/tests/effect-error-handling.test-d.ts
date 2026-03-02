import { describe, it, expectTypeOf } from "vitest";
import { ok, err } from "../src/index.js";
import type { Result, Ok, Err } from "../src/index.js";

type NotFoundError = Readonly<{ _tag: "NotFound"; resource: string }>;
type TimeoutError = Readonly<{ _tag: "Timeout"; ms: number }>;
type ForbiddenError = Readonly<{ _tag: "Forbidden"; reason: string }>;
type AppError = NotFoundError | TimeoutError | ForbiddenError;

describe("BEH-15-001: catchTag type narrowing", () => {
  it("Ok.catchTag narrows phantom E via Exclude", () => {
    const result = ok(42) as Ok<number, AppError>;
    const caught = result.catchTag("NotFound", () => ok(0));
    expectTypeOf(caught).toMatchTypeOf<Ok<number, TimeoutError | ForbiddenError>>();
  });

  it("Err.catchTag returns Result with Exclude'd E", () => {
    const result = err({ _tag: "NotFound" as const, resource: "User" }) as Err<number, AppError>;
    const caught = result.catchTag("NotFound", () => ok(0));
    expectTypeOf(caught).toMatchTypeOf<Result<number, TimeoutError | ForbiddenError>>();
  });

  it("Result.catchTag returns Result with narrowed E", () => {
    const result = ok(42) as Result<number, AppError>;
    const caught = result.catchTag("NotFound", () => ok("fallback"));
    expectTypeOf(caught).toMatchTypeOf<Result<number | string, TimeoutError | ForbiddenError>>();
  });

  it("chained catchTag narrows progressively", () => {
    const result = ok(42) as Result<number, AppError>;
    const caught = result.catchTag("NotFound", () => ok(-1)).catchTag("Timeout", () => ok(-2));
    expectTypeOf(caught).toMatchTypeOf<Result<number, ForbiddenError>>();
  });

  it("exhaustive catchTag narrows E to never", () => {
    type SmallError = NotFoundError | TimeoutError;
    const result = ok(42) as Result<number, SmallError>;
    const caught = result.catchTag("NotFound", () => ok(-1)).catchTag("Timeout", () => ok(-2));
    expectTypeOf(caught).toMatchTypeOf<Result<number, never>>();
  });
});

describe("BEH-15-002: catchTags type narrowing", () => {
  it("handles multiple tags and narrows E", () => {
    const result = ok(42) as Result<number, AppError>;
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expectTypeOf(caught).toMatchTypeOf<Result<number, ForbiddenError>>();
  });

  it("all tags handled narrows E to never", () => {
    type SmallError = NotFoundError | TimeoutError;
    const result = ok(42) as Result<number, SmallError>;
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expectTypeOf(caught).toMatchTypeOf<Result<number, never>>();
  });
});

describe("BEH-15-003: andThenWith type inference", () => {
  it("Ok path produces Result<U, F>", () => {
    const result = ok(42) as Ok<number, string>;
    const transformed = result.andThenWith(
      n => ok(String(n)),
      () => ok("recovered")
    );
    expectTypeOf(transformed).toMatchTypeOf<Result<string, never>>();
  });

  it("Err path produces Result<U, G>", () => {
    const result = err("fail") as Err<number, string>;
    const transformed = result.andThenWith(
      n => ok(String(n)),
      () => err(404)
    );
    expectTypeOf(transformed).toMatchTypeOf<Result<string, number>>();
  });

  it("Result union produces Result<U, F | G>", () => {
    const result = ok(42) as Result<number, string>;
    const transformed = result.andThenWith(
      n => (n > 0 ? ok(String(n)) : err(false)),
      e => err(e.length)
    );
    expectTypeOf(transformed).toMatchTypeOf<Result<string, boolean | number>>();
  });
});
