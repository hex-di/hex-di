import { describe, it, expect } from "vitest";
import { createQueryPort, createMutationPort } from "@hex-di/query";
import { ResultAsync } from "@hex-di/result";
import { createMockQueryFetcher, createMockMutationExecutor } from "../src/mock-adapters.js";

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "MockMutUsers",
});

const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({
  name: "MockMutUserById",
});

interface CreateUserInput {
  readonly name: string;
  readonly email: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "MockMutCreateUser",
});

// =============================================================================
// createMockQueryFetcher — mutation-killing tests
// =============================================================================

describe("createMockQueryFetcher (mutation killers)", () => {
  it("error takes precedence when both data and error are provided", async () => {
    const error: ApiError = { _tag: "NetworkError", message: "Fail" };
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
      error,
    });

    const result = await fetcher({ role: "admin" }, { signal: new AbortController().signal });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual(error);
    }
  });

  it("delay=0 resolves within microtasks (sync path, not setTimeout)", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
      delay: 0,
    });

    // When delay is exactly 0, the function should NOT go through setTimeout.
    // ResultAsync.ok() resolves in the microtask queue, while
    // ResultAsync.fromSafePromise(wait(0)) goes through setTimeout (macrotask).
    let resolved = false;
    const resultAsync = fetcher({ role: "admin" }, { signal: new AbortController().signal });
    void resultAsync.map(() => {
      resolved = true;
    });

    // Drain microtask queue (enough for ResultAsync.ok() chain but not for setTimeout)
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(resolved).toBe(true);
  });

  it("delay>0 actually delays the response", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
      delay: 50,
    });

    const start = Date.now();
    const result = await fetcher({}, { signal: new AbortController().signal });
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(30);
  });

  it("static data returns the exact value (not called as function)", async () => {
    const staticData: User[] = [{ id: "1", name: "Static" }];
    const fetcher = createMockQueryFetcher(UsersPort, { data: staticData });

    const result = await fetcher({}, { signal: new AbortController().signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(staticData); // referential equality
    }
  });

  it("factory function receives params and returns computed data", async () => {
    const fetcher = createMockQueryFetcher(UserByIdPort, {
      data: params => ({ id: params.id, name: `User-${params.id}` }),
    });

    const result = await fetcher({ id: "99" }, { signal: new AbortController().signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: "99", name: "User-99" });
    }
  });

  it("no options returns Ok with undefined data", async () => {
    const fetcher = createMockQueryFetcher(UsersPort);

    const result = await fetcher({}, { signal: new AbortController().signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  it("options with neither data nor error returns Ok with undefined data", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {});

    const result = await fetcher({}, { signal: new AbortController().signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });
});

// =============================================================================
// createMockMutationExecutor — mutation-killing tests
// =============================================================================

describe("createMockMutationExecutor (mutation killers)", () => {
  it("error takes precedence when both data and error are provided", async () => {
    const error: ApiError = { _tag: "ValidationError", message: "Bad" };
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "1", name: "Alice" },
      error,
    });

    const result = await executor(
      { name: "Alice", email: "alice@test.com" },
      { signal: new AbortController().signal }
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual(error);
    }
  });

  it("delay=0 resolves within microtasks (sync path, not setTimeout)", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "1", name: "Alice" },
      delay: 0,
    });

    let resolved = false;
    const resultAsync = executor(
      { name: "Alice", email: "alice@test.com" },
      { signal: new AbortController().signal }
    );
    void resultAsync.map(() => {
      resolved = true;
    });

    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(resolved).toBe(true);
  });

  it("delay>0 actually delays the response", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "1", name: "Charlie" },
      delay: 50,
    });

    const start = Date.now();
    const result = await executor(
      { name: "Charlie", email: "charlie@test.com" },
      { signal: new AbortController().signal }
    );
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(30);
  });

  it("static data returns the exact value (not called as function)", async () => {
    const staticData: User = { id: "1", name: "Static" };
    const executor = createMockMutationExecutor(CreateUserPort, { data: staticData });

    const result = await executor(
      { name: "ignored", email: "ignored" },
      { signal: new AbortController().signal }
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(staticData);
    }
  });

  it("factory function receives input and returns computed data", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: input => ({ id: "new-1", name: input.name }),
    });

    const result = await executor(
      { name: "Dave", email: "dave@test.com" },
      { signal: new AbortController().signal }
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: "new-1", name: "Dave" });
    }
  });

  it("no options returns Ok with undefined data", async () => {
    const executor = createMockMutationExecutor(CreateUserPort);

    const result = await executor(
      { name: "Alice", email: "a@b.com" },
      { signal: new AbortController().signal }
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  it("options with neither data nor error returns Ok with undefined data", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {});

    const result = await executor(
      { name: "Alice", email: "a@b.com" },
      { signal: new AbortController().signal }
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });
});
