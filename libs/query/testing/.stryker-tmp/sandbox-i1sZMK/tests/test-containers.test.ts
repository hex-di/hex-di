// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import { createQueryPort } from "@hex-di/query";
import { createMockQueryFetcher } from "../src/mock-adapters.js";
import { createQueryTestContainer } from "../src/test-container.js";
import { useQueryTestContainer, createQueryTestScope } from "../src/test-lifecycle.js";
import { expectCacheEntry } from "../src/cache-assertions.js";
import { createQueryTestWrapperProps } from "../src/react-helpers.js";

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

const UsersPort = createQueryPort<User[], void, ApiError>()({ name: "ContainerUsers" });

// =============================================================================
// createQueryTestContainer
// =============================================================================

describe("createQueryTestContainer", () => {
  it("creates a container with a QueryClient", () => {
    const container = createQueryTestContainer();

    expect(container.queryClient).toBeDefined();
    expect(container.queryClient.isDisposed).toBe(false);

    container.dispose();
  });

  it("registers query fetchers via container.register", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const container = createQueryTestContainer();
    container.register(UsersPort, fetcher);

    const result = await container.queryClient.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([{ id: "1", name: "Alice" }]);
    }

    container.dispose();
  });

  it("applies custom defaults", () => {
    const container = createQueryTestContainer({
      defaults: { staleTime: 60_000 },
    });

    expect(container.queryClient.defaults.staleTime).toBe(60_000);

    container.dispose();
  });

  it("dispose disposes the QueryClient", () => {
    const container = createQueryTestContainer();
    container.dispose();

    expect(container.queryClient.isDisposed).toBe(true);
  });
});

// =============================================================================
// useQueryTestContainer
// =============================================================================

describe("useQueryTestContainer", () => {
  const ctx = useQueryTestContainer();

  beforeEach(() => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });
    ctx.container.register(UsersPort, fetcher);
  });

  it("provides a fresh QueryClient for each test", () => {
    expect(ctx.queryClient).toBeDefined();
    expect(ctx.queryClient.isDisposed).toBe(false);
  });

  it("can fetch data through the provided client", async () => {
    const result = await ctx.queryClient.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([{ id: "1", name: "Alice" }]);
    }
  });

  it("cache assertions work with the lifecycle client", async () => {
    await ctx.queryClient.fetchQuery(UsersPort, undefined);
    expectCacheEntry(ctx.queryClient, UsersPort, undefined).toExist();
    expectCacheEntry(ctx.queryClient, UsersPort, undefined).toHaveData([
      { id: "1", name: "Alice" },
    ]);
  });
});

// =============================================================================
// useQueryTestContainer error paths
// =============================================================================

describe("useQueryTestContainer error paths", () => {
  it("throws when accessing queryClient outside of test lifecycle", () => {
    // Calling useQueryTestContainer inside it() registers hooks on the parent
    // describe, but container remains undefined since beforeEach hasn't run yet.
    const ctx = useQueryTestContainer();
    expect(() => ctx.queryClient).toThrow(
      "useQueryTestContainer: accessed queryClient outside of a test"
    );
  });

  it("throws when accessing container outside of test lifecycle", () => {
    const ctx = useQueryTestContainer();
    expect(() => ctx.container).toThrow(
      "useQueryTestContainer: accessed container outside of a test"
    );
  });
});

// =============================================================================
// createQueryTestScope
// =============================================================================

describe("createQueryTestScope", () => {
  it("creates a scope with a QueryClient", () => {
    const scope = createQueryTestScope();

    expect(scope.queryClient).toBeDefined();
    expect(scope.queryClient.isDisposed).toBe(false);

    scope.dispose();
  });

  it("can fetch data through the scoped client", async () => {
    const fetcher = createMockQueryFetcher(UsersPort, {
      data: [{ id: "1", name: "Alice" }],
    });

    const scope = createQueryTestScope();
    scope.register(UsersPort, fetcher);

    const result = await scope.queryClient.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([{ id: "1", name: "Alice" }]);
    }

    scope.dispose();
    expect(scope.queryClient.isDisposed).toBe(true);
  });
});

// =============================================================================
// createQueryTestWrapperProps
// =============================================================================

describe("createQueryTestWrapperProps", () => {
  it("returns the queryClient from config", () => {
    const container = createQueryTestContainer();
    const props = createQueryTestWrapperProps({ queryClient: container.queryClient });

    expect(props.queryClient).toBe(container.queryClient);

    container.dispose();
  });
});
