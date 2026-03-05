import { describe, it, expect } from "vitest";
import {
  expectOk,
  expectErr,
  expectOkAsync,
  expectErrAsync,
  expectSome,
  expectNone,
  createResultFixture,
  createOptionFixture,
  mockResultAsync,
  createErrorFixture,
  createErrorGroupFixture,
} from "../src/index.js";

// =============================================================================
// BEH-T03-001: createResultFixture
// =============================================================================

describe("createResultFixture", () => {
  const fixture = createResultFixture({ id: 1, name: "Alice" });

  it("ok() returns Ok with defaults", () => {
    const result = fixture.ok();
    const value = expectOk(result);
    expect(value).toEqual({ id: 1, name: "Alice" });
  });

  it("ok(override) overrides the default", () => {
    const result = fixture.ok({ id: 2, name: "Bob" });
    const value = expectOk(result);
    expect(value).toEqual({ id: 2, name: "Bob" });
  });

  it("err(error) returns Err", () => {
    const result = fixture.err("not found");
    const error = expectErr(result);
    expect(error).toBe("not found");
  });

  it("okAsync() resolves to Ok with defaults", async () => {
    const value = await expectOkAsync(fixture.okAsync());
    expect(value).toEqual({ id: 1, name: "Alice" });
  });

  it("okAsync(override) resolves to Ok with override", async () => {
    const value = await expectOkAsync(fixture.okAsync({ id: 3, name: "Carol" }));
    expect(value).toEqual({ id: 3, name: "Carol" });
  });

  it("errAsync(error) resolves to Err (not a promise rejection)", async () => {
    const error = await expectErrAsync(fixture.errAsync("timeout"));
    expect(error).toBe("timeout");
  });
});

// =============================================================================
// BEH-T03-002: createOptionFixture
// =============================================================================

describe("createOptionFixture", () => {
  const fixture = createOptionFixture({ timeout: 3000 });

  it("some() returns Some with defaults", () => {
    const value = expectSome(fixture.some());
    expect(value).toEqual({ timeout: 3000 });
  });

  it("some(override) overrides the default", () => {
    const value = expectSome(fixture.some({ timeout: 0 }));
    expect(value).toEqual({ timeout: 0 });
  });

  it("none() returns None", () => {
    expectNone(fixture.none());
  });
});

// =============================================================================
// BEH-T03-003: mockResultAsync
// =============================================================================

describe("mockResultAsync", () => {
  it("resultAsync is pending until resolve is called", async () => {
    const { resultAsync, resolve } = mockResultAsync<string, Error>();

    let resolved = false;
    const promise = resultAsync.then(() => {
      resolved = true;
    });

    // Still pending at this point (microtask hasn't run)
    expect(resolved).toBe(false);

    resolve("hello");
    await promise;
    expect(resolved).toBe(true);
  });

  it("resolve(value) resolves to Ok", async () => {
    const { resultAsync, resolve } = mockResultAsync<number, string>();
    resolve(42);
    const value = await expectOkAsync(resultAsync);
    expect(value).toBe(42);
  });

  it("reject(error) resolves to Err (not a promise rejection)", async () => {
    const { resultAsync, reject } = mockResultAsync<number, string>();
    reject("fail");
    const error = await expectErrAsync(resultAsync);
    expect(error).toBe("fail");
  });

  it("first call wins (resolve then reject)", async () => {
    const { resultAsync, resolve, reject } = mockResultAsync<number, string>();
    resolve(42);
    reject("fail");
    const value = await expectOkAsync(resultAsync);
    expect(value).toBe(42);
  });

  it("first call wins (reject then resolve)", async () => {
    const { resultAsync, resolve, reject } = mockResultAsync<number, string>();
    reject("fail");
    resolve(42);
    const error = await expectErrAsync(resultAsync);
    expect(error).toBe("fail");
  });
});

// =============================================================================
// createErrorFixture
// =============================================================================

describe("createErrorFixture", () => {
  const fixture = createErrorFixture("NotFound");

  it("has the correct tag property", () => {
    expect(fixture.tag).toBe("NotFound");
  });

  it("create() produces a tagged error with given fields", () => {
    const error = fixture.create({ resource: "User", id: "123" });
    expect(error._tag).toBe("NotFound");
    expect(error.resource).toBe("User");
    expect(error.id).toBe("123");
  });

  it("create() produces frozen errors", () => {
    const error = fixture.create({ x: 1 });
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// =============================================================================
// createErrorGroupFixture
// =============================================================================

describe("createErrorGroupFixture", () => {
  const fixture = createErrorGroupFixture("HttpError", "NotFound", "Timeout");

  it("create map has constructors for each tag", () => {
    expect(typeof fixture.create.NotFound).toBe("function");
    expect(typeof fixture.create.Timeout).toBe("function");
  });

  it("creates errors with correct namespace and tag", () => {
    const error = fixture.create.NotFound({ url: "/api" });
    expect(error._namespace).toBe("HttpError");
    expect(error._tag).toBe("NotFound");
    expect(error.url).toBe("/api");
  });

  it("group.is() recognizes created errors", () => {
    const error = fixture.create.Timeout({ ms: 5000 });
    expect(fixture.group.is(error)).toBe(true);
  });

  it("group.isTag() checks specific tag", () => {
    const error = fixture.create.NotFound({ url: "/" });
    expect(fixture.group.isTag("NotFound")(error)).toBe(true);
    expect(fixture.group.isTag("Timeout")(error)).toBe(false);
  });

  it("creates frozen errors", () => {
    const error = fixture.create.NotFound({ url: "/" });
    expect(Object.isFrozen(error)).toBe(true);
  });
});
