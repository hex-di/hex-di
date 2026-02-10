/**
 * Type-level tests for React hooks.
 *
 * These tests verify compile-time type safety without runtime execution.
 */
// @ts-nocheck

import { describe, it, expectTypeOf } from "vitest";
import type { QueryPort, QueryState, QueryResolutionError, DehydratedState } from "@hex-di/query";
import type { ResultAsync } from "@hex-di/result";
import { createQueryPort } from "@hex-di/query";
import type {
  UseQueryOptions,
  UseQueriesConfig,
  InfiniteData,
  InfiniteQueryState,
  SuspenseQueryState,
  SuspenseQueryOptions,
  UseInfiniteQueryOptions,
  MutationResult,
  QueryFilters,
  HydrationBoundaryProps,
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
  name: "TypeTestUsers",
});

// =============================================================================
// UseQueryOptions type tests
// =============================================================================

describe("UseQueryOptions types", () => {
  it("accepts all option fields", () => {
    expectTypeOf<UseQueryOptions<User[], { role?: string }, ApiError>>().toMatchTypeOf<{
      readonly enabled?: boolean;
      readonly staleTime?: number;
      readonly refetchOnMount?: boolean | "always";
      readonly select?: (data: User[]) => unknown;
      readonly refetchInterval?: number | false;
      readonly refetchIntervalInBackground?: boolean;
      readonly throwOnError?: boolean | ((error: ApiError) => boolean);
      readonly structuralSharing?: boolean;
      readonly placeholderData?:
        | User[]
        | ((previousData: User[] | undefined) => User[] | undefined);
    }>();
  });

  it("throwOnError accepts boolean and function", () => {
    type ThrowOnError = UseQueryOptions<User[], unknown, ApiError>["throwOnError"];
    expectTypeOf<
      boolean | ((error: ApiError) => boolean) | undefined
    >().toMatchTypeOf<ThrowOnError>();
  });

  it("placeholderData accepts static data and function", () => {
    type Placeholder = UseQueryOptions<User[], unknown, ApiError>["placeholderData"];
    expectTypeOf<User[] | undefined>().toMatchTypeOf<Placeholder>();
  });
});

// =============================================================================
// UseQueriesConfig type tests
// =============================================================================

describe("UseQueriesConfig types", () => {
  it("accepts port-like objects", () => {
    expectTypeOf<UseQueriesConfig>().toMatchTypeOf<{
      readonly port: { readonly __portName: string };
      readonly params: unknown;
      readonly enabled?: boolean;
    }>();
  });

  it("port property accepts QueryPort instances", () => {
    const config: UseQueriesConfig = {
      port: UsersPort,
      params: { role: "admin" },
    };
    expectTypeOf(config.port).toMatchTypeOf<{ readonly __portName: string }>();
  });
});

// =============================================================================
// InfiniteData type tests
// =============================================================================

describe("InfiniteData types", () => {
  it("has pages and pageParams arrays", () => {
    expectTypeOf<InfiniteData<User[]>>().toMatchTypeOf<{
      readonly pages: readonly User[][];
      readonly pageParams: readonly unknown[];
    }>();
  });

  it("pages are readonly", () => {
    type Pages = InfiniteData<string>["pages"];
    expectTypeOf<Pages>().toMatchTypeOf<readonly string[]>();
  });
});

// =============================================================================
// InfiniteQueryState type tests
// =============================================================================

describe("InfiniteQueryState types", () => {
  it("has pagination helper fields", () => {
    expectTypeOf<InfiniteQueryState<User[], ApiError>>().toMatchTypeOf<{
      readonly hasNextPage: boolean;
      readonly hasPreviousPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly isFetchingPreviousPage: boolean;
      readonly fetchNextPage: () => ResultAsync<void, ApiError | QueryResolutionError>;
      readonly fetchPreviousPage: () => ResultAsync<void, ApiError | QueryResolutionError>;
    }>();
  });

  it("data is InfiniteData or undefined", () => {
    type Data = InfiniteQueryState<User[], ApiError>["data"];
    expectTypeOf<Data>().toMatchTypeOf<InfiniteData<User[]> | undefined>();
  });
});

// =============================================================================
// SuspenseQueryState type tests
// =============================================================================

describe("SuspenseQueryState types", () => {
  it("status is always success", () => {
    type Status = SuspenseQueryState<User[], ApiError>["status"];
    expectTypeOf<Status>().toEqualTypeOf<"success">();
  });

  it("data is non-optional TData", () => {
    type Data = SuspenseQueryState<User[], ApiError>["data"];
    expectTypeOf<Data>().toEqualTypeOf<User[]>();
  });

  it("isSuccess is always true", () => {
    type IsSuccess = SuspenseQueryState<User[], ApiError>["isSuccess"];
    expectTypeOf<IsSuccess>().toEqualTypeOf<true>();
  });

  it("has isFetching and isRefetching booleans", () => {
    expectTypeOf<SuspenseQueryState<User[], ApiError>>().toMatchTypeOf<{
      readonly isFetching: boolean;
      readonly isRefetching: boolean;
    }>();
  });
});

// =============================================================================
// QueryFilters type tests
// =============================================================================

describe("QueryFilters types", () => {
  it("port is optional with __portName", () => {
    expectTypeOf<QueryFilters>().toMatchTypeOf<{
      readonly port?: { readonly __portName: string };
    }>();
  });

  it("accepts QueryPort instances", () => {
    const filters: QueryFilters = { port: UsersPort };
    expectTypeOf(filters).toMatchTypeOf<QueryFilters>();
  });
});

// =============================================================================
// DehydratedState type tests
// =============================================================================

describe("DehydratedState types", () => {
  it("has version 3", () => {
    type Version = DehydratedState["version"];
    expectTypeOf<Version>().toEqualTypeOf<3>();
  });

  it("queries array has required fields", () => {
    type Query = DehydratedState["queries"][number];
    expectTypeOf<Query>().toMatchTypeOf<{
      readonly cacheKey: readonly [string, string];
      readonly result:
        | { readonly _tag: "Ok"; readonly value: unknown }
        | { readonly _tag: "Err"; readonly error: unknown };
      readonly dataUpdatedAt: number;
    }>();
  });
});
