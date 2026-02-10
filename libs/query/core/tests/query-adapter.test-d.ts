import { describe, it, expectTypeOf } from "vitest";
import type { AdapterConstraint } from "@hex-di/core";
import { port } from "@hex-di/core";
import { createQueryPort, createQueryAdapter, type QueryFetcher } from "../src/index.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Setup: Ports
// =============================================================================

interface User {
  id: string;
  name: string;
}

interface ApiError {
  code: number;
  message: string;
}

const UsersPort = createQueryPort<User[], void>()({ name: "Users" });
const UserByIdPort = createQueryPort<User, { id: string }, ApiError>()({ name: "UserById" });

const HttpClientPort = port<{ get(url: string): Promise<unknown> }>()({
  name: "HttpClient",
});

const LoggerPort = port<{ log(msg: string): void }>()({
  name: "Logger",
});

// =============================================================================
// Tests
// =============================================================================

describe("Query Adapter Type-Level Tests", () => {
  it("createQueryAdapter with no deps returns AdapterConstraint", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => (_params, _ctx) => ({}) as ResultAsync<User[], Error>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("createQueryAdapter with requires returns AdapterConstraint", () => {
    const adapter = createQueryAdapter(UsersPort, {
      requires: [HttpClientPort],
      factory: _deps => (_params, _ctx) => ({}) as ResultAsync<User[], Error>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("factory receives ResolvedDeps with correct port types when requires provided", () => {
    createQueryAdapter(UsersPort, {
      requires: [HttpClientPort, LoggerPort] as const,
      factory: deps => {
        // deps should have HttpClient and Logger properties
        expectTypeOf(deps).toHaveProperty("HttpClient");
        expectTypeOf(deps).toHaveProperty("Logger");
        return (_params, _ctx) => ({}) as ResultAsync<User[], Error>;
      },
    });
  });

  it("factory return type matches QueryFetcher service type", () => {
    createQueryAdapter(UserByIdPort, {
      factory: () => {
        // Must return a QueryFetcher<User, { id: string }, ApiError>
        const fetcher: QueryFetcher<User, { id: string }, ApiError> = (_params, _ctx) =>
          ({}) as ResultAsync<User, ApiError>;
        return fetcher;
      },
    });
  });

  it("lifetime defaults work (omitting lifetime is valid)", () => {
    // No lifetime specified — should compile
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => (_params, _ctx) => ({}) as ResultAsync<User[], Error>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("port constraint: only accepts AnyQueryPort", () => {
    const NotAQueryPort = port<string>()({ name: "NotQuery" });

    // @ts-expect-error - NotAQueryPort is not a query port
    createQueryAdapter(NotAQueryPort, {
      factory: () => "hello",
    });
  });

  it("noDeps config with requires: undefined matches noDeps overload", () => {
    const adapter = createQueryAdapter(UsersPort, {
      requires: undefined,
      factory: () => (_params, _ctx) => ({}) as ResultAsync<User[], Error>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("explicit lifetime is accepted", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => (_params, _ctx) => ({}) as ResultAsync<User[], Error>,
      lifetime: "transient",
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });
});
