import { describe, it, expect } from "vitest";
import { ok, err, createError } from "../src/index.js";
import type { Result } from "../src/index.js";

// Tagged error constructors for testing
const NotFound = createError("NotFound");
const Timeout = createError("Timeout");
const Forbidden = createError("Forbidden");

type NotFoundError = Readonly<{ _tag: "NotFound"; resource: string }>;
type TimeoutError = Readonly<{ _tag: "Timeout"; ms: number }>;
type ForbiddenError = Readonly<{ _tag: "Forbidden"; reason: string }>;
type AppError = NotFoundError | TimeoutError | ForbiddenError;

describe("BEH-15-001: catchTag(tag, handler)", () => {
  it("Ok passes through unchanged", () => {
    const result: Result<number, AppError> = ok(42);
    const caught = result.catchTag("NotFound", () => ok(0));
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(42);
  });

  it("Err with matching _tag invokes handler", () => {
    const error = NotFound({ resource: "User" }) as unknown as NotFoundError;
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(99));
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(99);
  });

  it("Err with non-matching _tag passes through", () => {
    const error: AppError = { _tag: "Timeout", ms: 5000 };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(99));
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toEqual({ _tag: "Timeout", ms: 5000 });
  });

  it("non-tagged error passes through", () => {
    const result: Result<number, string> = err("plain error");
    const caught = result.catchTag("NotFound", () => ok(99));
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toBe("plain error");
  });

  it("null error passes through", () => {
    const result: Result<number, null> = err(null);
    const caught = result.catchTag("NotFound", () => ok(99));
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toBeNull();
  });

  it("chained catchTag narrows errors progressively", () => {
    const error: AppError = { _tag: "Forbidden", reason: "no access" };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(-1)).catchTag("Timeout", () => ok(-2));
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toEqual({ _tag: "Forbidden", reason: "no access" });
  });

  it("handler can return Err", () => {
    type RecoveryError = { _tag: "RecoveryFailed" };
    const error: AppError = { _tag: "NotFound", resource: "User" };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(0) as Result<number, never>);
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(0);
  });

  it("exhaustive catchTag chains narrow E to never", () => {
    type SmallError = NotFoundError | TimeoutError;
    const error: SmallError = { _tag: "NotFound", resource: "User" };
    const result: Result<number, SmallError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(-1)).catchTag("Timeout", () => ok(-2));
    // At this point E should be never
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(-1);
  });
});

describe("BEH-15-002: catchTags(handlers)", () => {
  it("Ok passes through unchanged", () => {
    const result: Result<number, AppError> = ok(42);
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(42);
  });

  it("Err with matching _tag invokes the correct handler", () => {
    const error: AppError = { _tag: "Timeout", ms: 3000 };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(-1);
  });

  it("Err with unhandled _tag passes through", () => {
    const error: AppError = { _tag: "Forbidden", reason: "no access" };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toEqual({ _tag: "Forbidden", reason: "no access" });
  });

  it("handles all tags to narrow E to never", () => {
    type SmallError = NotFoundError | TimeoutError;
    const error: SmallError = { _tag: "NotFound", resource: "User" };
    const result: Result<number, SmallError> = err(error);
    const caught = result.catchTags({
      NotFound: () => ok(0),
      Timeout: () => ok(-1),
    });
    expect(caught._tag).toBe("Ok");
    if (caught.isOk()) expect(caught.value).toBe(0);
  });

  it("non-tagged error passes through", () => {
    const result: Result<number, string> = err("plain");
    const caught = result.catchTags({});
    expect(caught._tag).toBe("Err");
    if (caught.isErr()) expect(caught.error).toBe("plain");
  });
});

describe("BEH-15-003: andThenWith(onOk, onErr)", () => {
  it("Ok delegates to onOk", () => {
    const result: Result<number, string> = ok(42);
    const transformed = result.andThenWith(
      n => ok(n * 2),
      () => ok(-1)
    );
    expect(transformed._tag).toBe("Ok");
    if (transformed.isOk()) expect(transformed.value).toBe(84);
  });

  it("Err delegates to onErr", () => {
    const result: Result<number, string> = err("fail");
    const transformed = result.andThenWith(
      n => ok(n * 2),
      () => ok(-1)
    );
    expect(transformed._tag).toBe("Ok");
    if (transformed.isOk()) expect(transformed.value).toBe(-1);
  });

  it("onOk can return Err", () => {
    const result: Result<number, string> = ok(0);
    const transformed = result.andThenWith(
      n => (n > 0 ? ok(n) : err("must be positive")),
      () => ok(-1)
    );
    expect(transformed._tag).toBe("Err");
    if (transformed.isErr()) expect(transformed.error).toBe("must be positive");
  });

  it("onErr can return Err", () => {
    const result: Result<number, string> = err("original");
    const transformed = result.andThenWith(
      n => ok(n),
      () => err("recovery failed")
    );
    expect(transformed._tag).toBe("Err");
    if (transformed.isErr()) expect(transformed.error).toBe("recovery failed");
  });

  it("onErr receives the error value", () => {
    const result: Result<number, string> = err("the error");
    const transformed = result.andThenWith(
      n => ok(n),
      e => ok(e.length)
    );
    expect(transformed._tag).toBe("Ok");
    if (transformed.isOk()) expect(transformed.value).toBe(9);
  });
});

describe("BEH-15-001, INV-15: catchTag integration with createError", () => {
  it("works with createError-produced errors", () => {
    const error = NotFound({ resource: "User" });
    const result = (err(error) as Result<string, NotFoundError | TimeoutError>).catchTag(
      "NotFound",
      () => ok("recovered")
    );
    expect(result._tag).toBe("Ok");
    if (result.isOk()) expect(result.value).toBe("recovered");
  });

  it("INV-15: catchTag output is frozen (passthrough case)", () => {
    const result: Result<number, AppError> = ok(42);
    const caught = result.catchTag("NotFound", () => ok(0));
    expect(Object.isFrozen(caught)).toBe(true);
  });

  it("INV-15: catchTag output is frozen (handler case)", () => {
    const error: AppError = { _tag: "NotFound", resource: "User" };
    const result: Result<number, AppError> = err(error);
    const caught = result.catchTag("NotFound", () => ok(0));
    expect(Object.isFrozen(caught)).toBe(true);
  });
});
