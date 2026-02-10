// @ts-nocheck
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createMutationPort } from "@hex-di/query";
import {
  createSpyQueryAdapter,
  createSpyMutationAdapter,
  createQueryTestContainer,
} from "../src/index.js";

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
  name: "SpyUsers",
});

// =============================================================================
// createSpyQueryAdapter
// =============================================================================

describe("createSpyQueryAdapter", () => {
  it("records calls with params and timestamp", async () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }])
    );

    const container = createQueryTestContainer();
    container.register(UsersPort, spy.fetcher);

    await container.queryClient.fetchQuery(UsersPort, { role: "admin" });

    expect(spy.callCount).toBe(1);
    expect(spy.calls[0].params).toEqual({ role: "admin" });
    expect(spy.calls[0].timestamp).toBeGreaterThan(0);

    container.dispose();
  });

  it("tracks multiple calls", async () => {
    const spy = createSpyQueryAdapter(UsersPort, params =>
      ResultAsync.ok(
        params.role === "admin" ? [{ id: "1", name: "Admin" }] : [{ id: "2", name: "User" }]
      )
    );

    const container = createQueryTestContainer();
    container.register(UsersPort, spy.fetcher);

    // First fetch - different params to avoid cache hit
    const result1 = await container.queryClient.fetchQuery(UsersPort, { role: "admin" });
    expect(result1.isOk()).toBe(true);

    // Invalidate to force refetch with different params
    container.queryClient.removeQueries(UsersPort);

    const result2 = await container.queryClient.fetchQuery(UsersPort, { role: "user" });
    expect(result2.isOk()).toBe(true);

    expect(spy.callCount).toBe(2);
    expect(spy.calls[0].params).toEqual({ role: "admin" });
    expect(spy.calls[1].params).toEqual({ role: "user" });

    container.dispose();
  });

  it("provides lastCall accessor", async () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }])
    );

    expect(spy.lastCall).toBeUndefined();

    const container = createQueryTestContainer();
    container.register(UsersPort, spy.fetcher);

    await container.queryClient.fetchQuery(UsersPort, { role: "admin" });

    expect(spy.lastCall).toBeDefined();
    expect(spy.lastCall?.params).toEqual({ role: "admin" });

    container.dispose();
  });

  it("resets all recorded calls", async () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }])
    );

    const container = createQueryTestContainer();
    container.register(UsersPort, spy.fetcher);

    await container.queryClient.fetchQuery(UsersPort, { role: "admin" });
    expect(spy.callCount).toBe(1);

    spy.reset();

    expect(spy.callCount).toBe(0);
    expect(spy.calls).toEqual([]);
    expect(spy.lastCall).toBeUndefined();

    container.dispose();
  });

  it("records calls for error results too", async () => {
    const error: ApiError = { _tag: "NetworkError", message: "Failed" };
    const spy = createSpyQueryAdapter(UsersPort, () => ResultAsync.err(error));

    const container = createQueryTestContainer({ defaults: { retry: 0 } });
    container.register(UsersPort, spy.fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, { role: "admin" });
    expect(result.isErr()).toBe(true);
    expect(spy.callCount).toBe(1);
    expect(spy.calls[0].params).toEqual({ role: "admin" });

    container.dispose();
  });

  it("returns a fetcher function", () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }])
    );

    expect(typeof spy.fetcher).toBe("function");
  });
});

// =============================================================================
// Mutation Test Ports
// =============================================================================

interface CreateUserInput {
  readonly name: string;
  readonly role?: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "CreateUser",
});

// =============================================================================
// createSpyMutationAdapter
// =============================================================================

describe("createSpyMutationAdapter", () => {
  it("records calls with input and timestamp", async () => {
    const spy = createSpyMutationAdapter(CreateUserPort, input =>
      ResultAsync.ok({ id: "1", name: input.name })
    );

    const container = createQueryTestContainer();
    container.register(CreateUserPort, spy.executor);

    await container.queryClient.mutate(CreateUserPort, { name: "Alice" });

    expect(spy.callCount).toBe(1);
    expect(spy.calls[0].input).toEqual({ name: "Alice" });
    expect(spy.calls[0].timestamp).toBeGreaterThan(0);

    container.dispose();
  });

  it("tracks multiple calls", async () => {
    const spy = createSpyMutationAdapter(CreateUserPort, input =>
      ResultAsync.ok({ id: "1", name: input.name })
    );

    const container = createQueryTestContainer();
    container.register(CreateUserPort, spy.executor);

    await container.queryClient.mutate(CreateUserPort, { name: "Alice" });
    await container.queryClient.mutate(CreateUserPort, { name: "Bob", role: "admin" });

    expect(spy.callCount).toBe(2);
    expect(spy.calls[0].input).toEqual({ name: "Alice" });
    expect(spy.calls[1].input).toEqual({ name: "Bob", role: "admin" });

    container.dispose();
  });

  it("provides lastCall accessor", async () => {
    const spy = createSpyMutationAdapter(CreateUserPort, input =>
      ResultAsync.ok({ id: "1", name: input.name })
    );

    expect(spy.lastCall).toBeUndefined();

    const container = createQueryTestContainer();
    container.register(CreateUserPort, spy.executor);

    await container.queryClient.mutate(CreateUserPort, { name: "Alice" });

    expect(spy.lastCall).toBeDefined();
    expect(spy.lastCall?.input).toEqual({ name: "Alice" });

    container.dispose();
  });

  it("resets all recorded calls", async () => {
    const spy = createSpyMutationAdapter(CreateUserPort, input =>
      ResultAsync.ok({ id: "1", name: input.name })
    );

    const container = createQueryTestContainer();
    container.register(CreateUserPort, spy.executor);

    await container.queryClient.mutate(CreateUserPort, { name: "Alice" });
    expect(spy.callCount).toBe(1);

    spy.reset();

    expect(spy.callCount).toBe(0);
    expect(spy.calls).toEqual([]);
    expect(spy.lastCall).toBeUndefined();

    container.dispose();
  });

  it("records calls for error results too", async () => {
    const error: ApiError = { _tag: "ValidationError", message: "Invalid input" };
    const spy = createSpyMutationAdapter(CreateUserPort, () => ResultAsync.err(error));

    const container = createQueryTestContainer();
    container.register(CreateUserPort, spy.executor);

    const result = await container.queryClient.mutate(CreateUserPort, { name: "" });
    expect(result.isErr()).toBe(true);
    expect(spy.callCount).toBe(1);
    expect(spy.calls[0].input).toEqual({ name: "" });

    container.dispose();
  });

  it("returns an executor function", () => {
    const spy = createSpyMutationAdapter(CreateUserPort, input =>
      ResultAsync.ok({ id: "1", name: input.name })
    );

    expect(typeof spy.executor).toBe("function");
  });
});
