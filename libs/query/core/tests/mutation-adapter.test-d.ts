import { describe, it, expectTypeOf } from "vitest";
import type { AdapterConstraint } from "@hex-di/core";
import { port } from "@hex-di/core";
import { createMutationPort, createMutationAdapter, type MutationExecutor } from "../src/index.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Setup: Ports
// =============================================================================

interface User {
  id: string;
  name: string;
}

interface CreateUserInput {
  name: string;
  email: string;
}

interface ApiError {
  code: number;
  message: string;
}

const CreateUserPort = createMutationPort<User, CreateUserInput, ApiError>()({
  name: "CreateUser",
});

const DeleteUserPort = createMutationPort<void, { id: string }>()({
  name: "DeleteUser",
});

const HttpClientPort = port<{ post(url: string, body: unknown): Promise<unknown> }>()({
  name: "HttpClient",
});

// =============================================================================
// Tests
// =============================================================================

describe("Mutation Adapter Type-Level Tests", () => {
  it("createMutationAdapter with no deps returns AdapterConstraint", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => (_input, _ctx) => ({}) as ResultAsync<User, ApiError>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("createMutationAdapter with requires returns AdapterConstraint", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      requires: [HttpClientPort],
      factory: _deps => (_input, _ctx) => ({}) as ResultAsync<User, ApiError>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("factory receives typed deps", () => {
    createMutationAdapter(CreateUserPort, {
      requires: [HttpClientPort] as const,
      factory: deps => {
        expectTypeOf(deps).toHaveProperty("HttpClient");
        return (_input, _ctx) => ({}) as ResultAsync<User, ApiError>;
      },
    });
  });

  it("port constraint: only accepts AnyMutationPort", () => {
    const NotAMutationPort = port<string>()({ name: "NotMutation" });

    // @ts-expect-error - NotAMutationPort is not a mutation port
    createMutationAdapter(NotAMutationPort, {
      factory: () => "hello",
    });
  });

  it("overload resolution: noDeps vs withDeps", () => {
    // noDeps
    const a1 = createMutationAdapter(DeleteUserPort, {
      factory: () => (_input, _ctx) => ({}) as ResultAsync<void, Error>,
    });
    expectTypeOf(a1).toMatchTypeOf<AdapterConstraint>();

    // withDeps
    const a2 = createMutationAdapter(DeleteUserPort, {
      requires: [HttpClientPort],
      factory: _deps => (_input, _ctx) => ({}) as ResultAsync<void, Error>,
    });
    expectTypeOf(a2).toMatchTypeOf<AdapterConstraint>();
  });

  it("factory return type matches MutationExecutor service type", () => {
    createMutationAdapter(CreateUserPort, {
      factory: () => {
        const executor: MutationExecutor<User, CreateUserInput, ApiError> = (_input, _ctx) =>
          ({}) as ResultAsync<User, ApiError>;
        return executor;
      },
    });
  });

  it("noDeps config with requires: undefined matches noDeps overload", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      requires: undefined,
      factory: () => (_input, _ctx) => ({}) as ResultAsync<User, ApiError>,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("explicit lifetime is accepted", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => (_input, _ctx) => ({}) as ResultAsync<User, ApiError>,
      lifetime: "transient",
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });
});
