import { describe, it, expect } from "vitest";
import { createQueryPort, createMutationPort } from "@hex-di/query";
import { createMockQueryFetcher, createMockMutationExecutor } from "../src/mock-adapters.js";
import { createQueryTestContainer } from "../src/test-container.js";

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

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "ContainerMutUsers" });
const OtherPort = createQueryPort<string, void, ApiError>()({ name: "ContainerMutOther" });

const CreateUserPort = createMutationPort<User, { name: string }, ApiError>()({
  name: "ContainerMutCreate",
});

// =============================================================================
// Mutation killers for test-container.ts
//
// Target: createMinimalContainer resolve method:
//   if (service === undefined) throw new Error(...)
//   return service;
//
// Target: register method:
//   services.set(port.__portName, service);
//
// Target: dispose method:
//   queryClient.dispose();
// =============================================================================

describe("createQueryTestContainer (mutation killers)", () => {
  // --- Throws on unregistered port with specific error message ---
  it("throws when resolving an unregistered port with port name in message", async () => {
    const container = createQueryTestContainer({ defaults: { retry: 0 } });

    const result = await container.queryClient.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // The error should mention the port name — this kills mutants that
      // remove the throw (empty block) or empty the error message string
      const errorStr = JSON.stringify(result.error);
      expect(errorStr).toContain("ContainerMutUsers");
    }

    container.dispose();
  });

  // --- Verify the resolution error is a throw with meaningful message ---
  it("resolution error contains the port name in error details", async () => {
    const container = createQueryTestContainer({ defaults: { retry: 0 } });

    const result = await container.queryClient.fetchQuery(OtherPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Verify a DIFFERENT port name appears in the error
      const errorStr = JSON.stringify(result.error);
      expect(errorStr).toContain("ContainerMutOther");
    }

    container.dispose();
  });

  // --- Re-registration replaces the previous service ---
  it("re-registration replaces the previous service", async () => {
    const container = createQueryTestContainer();

    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "1", name: "Alice" }] })
    );

    // Fetch first registration
    const result1 = await container.queryClient.fetchQuery(UsersPort, undefined);
    expect(result1.isOk()).toBe(true);
    if (result1.isOk()) {
      expect(result1.value).toEqual([{ id: "1", name: "Alice" }]);
    }

    // Re-register with different data
    container.register(
      UsersPort,
      createMockQueryFetcher(UsersPort, { data: [{ id: "2", name: "Bob" }] })
    );

    // Invalidate cache so next fetch uses new adapter
    await container.queryClient.invalidateQueries(UsersPort);

    const result2 = await container.queryClient.fetchQuery(UsersPort, undefined);
    expect(result2.isOk()).toBe(true);
    if (result2.isOk()) {
      expect(result2.value).toEqual([{ id: "2", name: "Bob" }]);
    }

    container.dispose();
  });

  // --- Dispose actually disposes the queryClient ---
  it("dispose marks queryClient as disposed", () => {
    const container = createQueryTestContainer();
    expect(container.queryClient.isDisposed).toBe(false);

    container.dispose();

    expect(container.queryClient.isDisposed).toBe(true);
  });

  // --- Double dispose is safe ---
  it("dispose can be called multiple times safely", () => {
    const container = createQueryTestContainer();
    container.dispose();
    // Second dispose should not throw
    expect(() => container.dispose()).not.toThrow();
  });

  // --- Container with custom defaults ---
  it("passes defaults to the query client", () => {
    const container = createQueryTestContainer({
      defaults: { staleTime: 30_000, retry: 3 },
    });

    expect(container.queryClient.defaults.staleTime).toBe(30_000);
    expect(container.queryClient.defaults.retry).toBe(3);

    container.dispose();
  });
});
