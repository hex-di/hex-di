import { describe, it, expectTypeOf } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  type QueryFetcher,
  type MutationExecutor,
  type QueryClient,
} from "@hex-di/query";
import {
  createMockQueryFetcher,
  createMockMutationExecutor,
  createQueryTestContainer,
  createSpyQueryAdapter,
  type SpyQueryAdapterResult,
  type SpyCall,
  type QueryTestContainer,
} from "../src/index.js";

// =============================================================================
// Test Ports
// =============================================================================

interface User {
  readonly id: string;
  readonly name: string;
}

interface CreateUserInput {
  readonly name: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "Users" });

const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({
  name: "UserById",
});

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "CreateUser",
});

const StringQueryPort = createQueryPort<string, void>()({ name: "StringQuery" });

// =============================================================================
// Mock Fetcher Type Inference
// =============================================================================

describe("createMockQueryFetcher type inference", () => {
  it("returns QueryFetcher matching the port's service type", () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<User[], void, ApiError>>();
  });

  it("inferred fetcher is callable as a function", () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });
    expectTypeOf(fetcher).toBeFunction();
  });

  it("returns correct type for parameterized query port", () => {
    const fetcher = createMockQueryFetcher(UserByIdPort, {
      data: { id: "42", name: "Bob" },
    });
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<User, { id: string }, ApiError>>();
  });

  it("returns correct type with dynamic data factory", () => {
    const fetcher = createMockQueryFetcher(UserByIdPort, {
      data: params => {
        expectTypeOf(params).toEqualTypeOf<{ id: string }>();
        return { id: params.id, name: `User ${params.id}` };
      },
    });
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<User, { id: string }, ApiError>>();
  });

  it("returns correct type with error option", () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      error: { _tag: "NetworkError", message: "Failed" },
    });
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<User[], void, ApiError>>();
  });

  it("returns correct type when no options provided", () => {
    const fetcher = createMockQueryFetcher(UsersPort);
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<User[], void, ApiError>>();
  });

  it("returns correct type for port with default Error type", () => {
    const fetcher = createMockQueryFetcher(StringQueryPort, {
      data: "hello",
    });
    expectTypeOf(fetcher).toEqualTypeOf<QueryFetcher<string, void, Error>>();
  });

  it("rejects wrong data type in options", () => {
    // @ts-expect-error -- number is not assignable to User[]
    createMockQueryFetcher(UsersPort, { data: 42 });
  });

  it("rejects wrong error type in options", () => {
    // @ts-expect-error -- string is not assignable to ApiError
    createMockQueryFetcher(UsersPort, { error: "wrong" });
  });

  it("rejects wrong data type in dynamic factory return", () => {
    createMockQueryFetcher(UsersPort, {
      // @ts-expect-error -- string is not assignable to User[]
      data: () => "wrong",
    });
  });

  it("rejects wrong param type in dynamic factory", () => {
    createMockQueryFetcher(UserByIdPort, {
      // @ts-expect-error -- (params: { name: string }) is not compatible with { id: string }
      data: (params: { name: string }) => ({ id: "1", name: params.name }),
    });
  });
});

// =============================================================================
// Mock Mutation Executor Type Inference
// =============================================================================

describe("createMockMutationExecutor type inference", () => {
  it("returns MutationExecutor matching the port's service type", () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "1", name: "Alice" },
    });
    expectTypeOf(executor).toEqualTypeOf<MutationExecutor<User, CreateUserInput, ApiError>>();
  });

  it("inferred executor is callable as a function", () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: { id: "1", name: "Alice" },
    });
    expectTypeOf(executor).toBeFunction();
  });

  it("returns correct type with dynamic data factory", () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      data: input => {
        expectTypeOf(input).toEqualTypeOf<CreateUserInput>();
        return { id: "new-1", name: input.name };
      },
    });
    expectTypeOf(executor).toEqualTypeOf<MutationExecutor<User, CreateUserInput, ApiError>>();
  });

  it("returns correct type with error option", () => {
    const executor = createMockMutationExecutor(CreateUserPort, {
      error: { _tag: "ValidationError", message: "Name required" },
    });
    expectTypeOf(executor).toEqualTypeOf<MutationExecutor<User, CreateUserInput, ApiError>>();
  });

  it("returns correct type when no options provided", () => {
    const executor = createMockMutationExecutor(CreateUserPort);
    expectTypeOf(executor).toEqualTypeOf<MutationExecutor<User, CreateUserInput, ApiError>>();
  });

  it("rejects wrong data type in options", () => {
    // @ts-expect-error -- string is not assignable to User
    createMockMutationExecutor(CreateUserPort, { data: "wrong" });
  });

  it("rejects wrong error type in options", () => {
    // @ts-expect-error -- number is not assignable to ApiError
    createMockMutationExecutor(CreateUserPort, { error: 42 });
  });

  it("rejects wrong data type in dynamic factory return", () => {
    createMockMutationExecutor(CreateUserPort, {
      // @ts-expect-error -- number is not assignable to User
      data: () => 42,
    });
  });
});

// =============================================================================
// Test Container Type Inference
// =============================================================================

describe("createQueryTestContainer type inference", () => {
  it("returns QueryTestContainer", () => {
    const container = createQueryTestContainer();
    expectTypeOf(container).toEqualTypeOf<QueryTestContainer>();
  });

  it("has queryClient property of type QueryClient", () => {
    const container = createQueryTestContainer();
    expectTypeOf(container.queryClient).toEqualTypeOf<QueryClient>();
  });

  it("has register method", () => {
    const container = createQueryTestContainer();
    expectTypeOf(container.register).toBeFunction();
  });

  it("has dispose method", () => {
    const container = createQueryTestContainer();
    expectTypeOf(container.dispose).toBeFunction();
  });

  it("accepts optional config parameter", () => {
    const container = createQueryTestContainer({ defaults: { retry: 0 } });
    expectTypeOf(container).toEqualTypeOf<QueryTestContainer>();
  });

  it("accepts empty call with no config", () => {
    const container = createQueryTestContainer();
    expectTypeOf(container).toEqualTypeOf<QueryTestContainer>();
  });
});

// =============================================================================
// Spy Adapter Type Inference
// =============================================================================

describe("createSpyQueryAdapter type inference", () => {
  it("returns SpyQueryAdapterResult with correct type parameters", () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }] satisfies User[])
    );
    expectTypeOf(spy).toEqualTypeOf<SpyQueryAdapterResult<User[], void, ApiError>>();
  });

  it("fetcher property is a QueryFetcher", () => {
    const spy = createSpyQueryAdapter(UsersPort, () =>
      ResultAsync.ok([{ id: "1", name: "Alice" }] satisfies User[])
    );
    expectTypeOf(spy.fetcher).toEqualTypeOf<QueryFetcher<User[], void, ApiError>>();
  });

  it("calls array has typed SpyCall entries", () => {
    const spy = createSpyQueryAdapter(UsersPort, () => ResultAsync.ok([] satisfies User[]));
    expectTypeOf(spy.calls).toEqualTypeOf<ReadonlyArray<SpyCall<void>>>();
  });

  it("calls array for parameterized port has correct param type", () => {
    const spy = createSpyQueryAdapter(UserByIdPort, params => {
      expectTypeOf(params).toEqualTypeOf<{ id: string }>();
      return ResultAsync.ok({ id: params.id, name: "Test" } satisfies User);
    });
    expectTypeOf(spy.calls).toEqualTypeOf<ReadonlyArray<SpyCall<{ id: string }>>>();
  });

  it("lastCall is SpyCall or undefined", () => {
    const spy = createSpyQueryAdapter(UsersPort, () => ResultAsync.ok([] satisfies User[]));
    expectTypeOf(spy.lastCall).toEqualTypeOf<SpyCall<void> | undefined>();
  });

  it("callCount is a number", () => {
    const spy = createSpyQueryAdapter(UsersPort, () => ResultAsync.ok([] satisfies User[]));
    expectTypeOf(spy.callCount).toEqualTypeOf<number>();
  });

  it("reset is a function returning void", () => {
    const spy = createSpyQueryAdapter(UsersPort, () => ResultAsync.ok([] satisfies User[]));
    expectTypeOf(spy.reset).toEqualTypeOf<() => void>();
  });

  it("SpyCall has params and timestamp", () => {
    type Call = SpyCall<{ id: string }>;
    expectTypeOf<Call["params"]>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<Call["timestamp"]>().toEqualTypeOf<number>();
  });
});
