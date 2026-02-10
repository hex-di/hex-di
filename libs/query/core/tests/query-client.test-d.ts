import { describe, it, expectTypeOf } from "vitest";
import type { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  type QueryClient,
  type QueryResolutionError,
  type QueryState,
  type QueryObserver,
} from "../src/index.js";

// =============================================================================
// Setup: Ports
// =============================================================================

interface User {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
}

interface ApiError {
  code: number;
  message: string;
}

interface NetworkError {
  status: number;
}

const UsersPort = createQueryPort<User[], void>()({ name: "Users" });
const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({ name: "UserById" });
const PostsPort = createQueryPort<Post[], void, NetworkError>()({ name: "Posts" });

const CreateUserPort = createMutationPort<User, { name: string; email: string }, ApiError>()({
  name: "CreateUser",
});

// =============================================================================
// Tests
// =============================================================================

describe("QueryClient Type-Level Tests", () => {
  it("fetchQuery returns ResultAsync<TData, TError | QueryResolutionError>", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const result = client.fetchQuery(UsersPort, undefined);
      expectTypeOf(result).toEqualTypeOf<ResultAsync<User[], Error | QueryResolutionError>>();
    };
  });

  it("fetchQuery with custom error type preserves error", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const result = client.fetchQuery(UserByIdPort, { id: "123" });
      expectTypeOf(result).toEqualTypeOf<ResultAsync<User, ApiError | QueryResolutionError>>();
    };
  });

  it("prefetchQuery returns ResultAsync<void, TError | QueryResolutionError>", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const result = client.prefetchQuery(UsersPort, undefined);
      expectTypeOf(result).toEqualTypeOf<ResultAsync<void, Error | QueryResolutionError>>();
    };
  });

  it("ensureQueryData returns ResultAsync<TData, TError | QueryResolutionError>", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const result = client.ensureQueryData(UserByIdPort, { id: "abc" });
      expectTypeOf(result).toEqualTypeOf<ResultAsync<User, ApiError | QueryResolutionError>>();
    };
  });

  it("mutate returns ResultAsync<TData, TError | QueryResolutionError>", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const result = client.mutate(CreateUserPort, { name: "Jane", email: "jane@test.com" });
      expectTypeOf(result).toEqualTypeOf<ResultAsync<User, ApiError | QueryResolutionError>>();
    };
  });

  it("getQueryData returns TData | undefined", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const data = client.getQueryData(UsersPort, undefined);
      expectTypeOf(data).toEqualTypeOf<User[] | undefined>();
    };
  });

  it("getQueryState returns QueryState<TData, TError> | undefined", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const state = client.getQueryState(UserByIdPort, { id: "123" });
      expectTypeOf(state).toEqualTypeOf<QueryState<User, ApiError> | undefined>();
    };
  });

  it("observe returns QueryObserver<TData, TError>", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const observer = client.observe(UsersPort, undefined);
      expectTypeOf(observer).toEqualTypeOf<QueryObserver<User[], Error>>();
    };
  });

  it("port-specific types flow correctly (different ports produce different result types)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = (client: QueryClient) => {
      const usersResult = client.fetchQuery(UsersPort, undefined);
      const postsResult = client.fetchQuery(PostsPort, undefined);

      // Users uses default Error type
      expectTypeOf(usersResult).toEqualTypeOf<ResultAsync<User[], Error | QueryResolutionError>>();

      // Posts uses NetworkError type
      expectTypeOf(postsResult).toEqualTypeOf<
        ResultAsync<Post[], NetworkError | QueryResolutionError>
      >();
    };
  });
});
