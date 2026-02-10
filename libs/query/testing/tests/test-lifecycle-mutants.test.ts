import { describe, it, expect, afterAll } from "vitest";
import { createQueryPort, type QueryClient } from "@hex-di/query";
import { createMockQueryFetcher } from "../src/mock-adapters.js";
import { useQueryTestContainer } from "../src/test-lifecycle.js";

// =============================================================================
// Test Port
// =============================================================================

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<string[], void, ApiError>()({ name: "LifecycleMutUsers" });

// =============================================================================
// Mutation killers for test-lifecycle.ts
//
// Target lines in afterEach:
//   container?.dispose();    — mutant: remove dispose call
//   container = undefined;   — mutant: remove nullification
//
// To kill "remove dispose": capture queryClient ref during test, verify it is
// disposed after the describe block completes (afterAll).
//
// To kill "remove container = undefined": if container is not set to undefined,
// accessing ctx.container after afterEach would NOT throw the expected error.
// =============================================================================

describe("useQueryTestContainer lifecycle (mutation killers)", () => {
  const ctx = useQueryTestContainer();
  let capturedClient: QueryClient | undefined;

  it("captures queryClient reference for post-teardown verification", () => {
    ctx.container.register(UsersPort, createMockQueryFetcher(UsersPort, { data: ["Alice"] }));
    capturedClient = ctx.queryClient;
    expect(capturedClient).toBeDefined();
    expect(capturedClient.isDisposed).toBe(false);
  });

  // This test runs AFTER the previous one. The afterEach from useQueryTestContainer
  // should have disposed the previous test's container and set it to undefined.
  // A new container is created for this test by beforeEach.
  it("previous test's queryClient is disposed by afterEach", () => {
    expect(capturedClient).toBeDefined();
    expect(capturedClient?.isDisposed).toBe(true);
  });
});

// =============================================================================
// Verify container is set to undefined after afterEach
// =============================================================================

describe("useQueryTestContainer clears container after afterEach", () => {
  // We verify that after a test runs and afterEach fires, the container getter
  // throws, proving container was set to undefined.

  // Use a separate describe to create a lifecycle that we can test against
  let ctxOuterRef: ReturnType<typeof useQueryTestContainer>;

  describe("inner describe with lifecycle", () => {
    ctxOuterRef = useQueryTestContainer();

    it("runs a test so beforeEach/afterEach fire", () => {
      expect(ctxOuterRef.queryClient).toBeDefined();
    });
  });

  // After the inner describe completes (including afterEach), the container
  // should be undefined. This test is in the outer describe scope.
  it("container accessor throws after lifecycle teardown", () => {
    // ctxOuterRef's container was disposed and set to undefined by afterEach
    expect(() => ctxOuterRef.container).toThrow();
    expect(() => ctxOuterRef.queryClient).toThrow();
  });
});
