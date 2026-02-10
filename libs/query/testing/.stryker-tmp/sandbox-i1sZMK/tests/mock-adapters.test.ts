// @ts-nocheck
import { describe, it, expect } from "vitest";
import { createQueryPort, createMutationPort } from "@hex-di/query";
import {
  createMockQueryFetcher,
  createMockMutationExecutor,
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
  name: "Users",
});

const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({
  name: "UserById",
});

interface CreateUserInput {
  readonly name: string;
  readonly email: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "CreateUser",
});

// =============================================================================
// createMockQueryFetcher
// =============================================================================

describe("createMockQueryFetcher", () => {
  it("returns static data as Ok result", async () => {
    const users: User[] = [{ id: "1", name: "Alice" }];
    const fetcher = createMockQueryFetcher(UsersPort, { data: users });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, { role: "admin" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(users);
    }

    container.dispose();
  });

  it("returns dynamic data based on params", async () => {
    const fetcher = createMockQueryFetcher(UserByIdPort, {
      data: params => ({ id: params.id, name: `User ${params.id}` }),
    });

    const container = createQueryTestContainer();
    container.register(UserByIdPort, fetcher);

    const result = await container.queryClient.fetchQuery(UserByIdPort, { id: "42" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: "42", name: "User 42" });
    }

    container.dispose();
  });

  it("returns error as Err result", async () => {
    const error: ApiError = { _tag: "NetworkError", message: "Connection refused" };
    const fetcher = createMockQueryFetcher(UsersPort, { error });

    const container = createQueryTestContainer({ defaults: { retry: 0 } });
    container.register(UsersPort, fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, {});
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // QueryClient wraps errors in QueryFetchFailed with original error as cause
      expect(result.error).toMatchObject({
        _tag: "QueryFetchFailed",
        cause: error,
      });
    }

    container.dispose();
  });

  it("returns undefined data when no options provided", async () => {
    const fetcher = createMockQueryFetcher(UsersPort);

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, {});
    expect(result.isOk()).toBe(true);

    container.dispose();
  });

  it("applies delay before returning result", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
      delay: 50,
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    const start = Date.now();
    const result = await container.queryClient.fetchQuery(UsersPort, {});
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow small timing variance

    container.dispose();
  });

  it("returns a function (QueryFetcher)", () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    expect(typeof fetcher).toBe("function");
  });
});

// =============================================================================
// createMockMutationExecutor
// =============================================================================

describe("createMockMutationExecutor", () => {
  it("returns static data as Ok result", async () => {
    const user: User = { id: "new-1", name: "Charlie" };
    const executor = createMockMutationExecutor(CreateUserPort, { data: user });

    const container = createQueryTestContainer();
    container.register(CreateUserPort, executor);

    const result = await container.queryClient.mutate(CreateUserPort, {
      name: "Charlie",
      email: "charlie@test.com",
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(user);
    }

    container.dispose();
  });

  it("returns dynamic data based on input", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: input => ({ id: "new-1", name: input.name }),
    });

    const container = createQueryTestContainer();
    container.register(CreateUserPort, executor);

    const result = await container.queryClient.mutate(CreateUserPort, {
      name: "Dave",
      email: "dave@test.com",
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: "new-1", name: "Dave" });
    }

    container.dispose();
  });

  it("returns error as Err result", async () => {
    const error: ApiError = { _tag: "ValidationError", message: "Name required" };
    const executor = createMockMutationExecutor(CreateUserPort, { error });

    const container = createQueryTestContainer();
    container.register(CreateUserPort, executor);

    const result = await container.queryClient.mutate(CreateUserPort, { name: "", email: "" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual(error);
    }

    container.dispose();
  });

  it("applies delay before returning result", async () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "new-1", name: "Charlie" },
      delay: 50,
    });

    const container = createQueryTestContainer();
    container.register(CreateUserPort, executor);

    const start = Date.now();
    const result = await container.queryClient.mutate(CreateUserPort, {
      name: "Charlie",
      email: "charlie@test.com",
    });
    const elapsed = Date.now() - start;

    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(40);

    container.dispose();
  });

  it("returns undefined data when no options provided", async () => {
    const executor = createMockMutationExecutor(CreateUserPort);

    const container = createQueryTestContainer();
    container.register(CreateUserPort, executor);

    const result = await container.queryClient.mutate(CreateUserPort, {
      name: "Charlie",
      email: "charlie@test.com",
    });
    expect(result.isOk()).toBe(true);

    container.dispose();
  });

  it("returns a function (MutationExecutor)", () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "new-1", name: "Charlie" },
    });

    expect(typeof executor).toBe("function");
  });
});
