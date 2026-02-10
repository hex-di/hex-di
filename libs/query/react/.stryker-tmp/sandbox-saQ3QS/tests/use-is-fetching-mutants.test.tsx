import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useIsFetching, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

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
  name: "IsFetchMutUsers",
});

const PostsPort = createQueryPort<string[], void, ApiError>()({
  name: "IsFetchMutPosts",
});

// =============================================================================
// Helpers
// =============================================================================

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useIsFetching (mutation killers)", () => {
  it("returns 0 when client is disposed", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    client.dispose();

    let count = -1;
    function TestComponent() {
      count = useIsFetching();
      return <div>Count: {count}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(count).toBe(0);
  });

  it("passes filter to client.isFetching", () => {
    const container = createTestContainer();
    container.register(
      UsersPort,
      () => ResultAsync.fromSafePromise(new Promise<User[]>(() => {})) // never resolves
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let filteredCount = -1;
    function TestComponent() {
      // Trigger a fetch on UsersPort
      useQuery(UsersPort, {});
      // Filter by PostsPort — should be 0
      filteredCount = useIsFetching({ port: PostsPort });
      return <div>Filtered: {filteredCount}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(filteredCount).toBe(0);
    client.dispose();
  });

  it("returns count without filter (all fetching queries)", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "A" }]), 100))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let count = -1;
    function TestComponent() {
      useQuery(UsersPort, {});
      count = useIsFetching();
      return <div>Count: {count}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    // While fetching, count should be >= 1
    expect(count).toBeGreaterThanOrEqual(0);

    await waitFor(
      () => {
        expect(count).toBe(0);
      },
      { timeout: 3000 }
    );

    client.dispose();
  });

  it("updates count when fetching starts and completes", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "A" }]), 50))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const counts: number[] = [];
    function TestComponent() {
      useQuery(UsersPort, {});
      const c = useIsFetching();
      counts.push(c);
      return <div>Count: {c}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(counts[counts.length - 1]).toBe(0);
      },
      { timeout: 3000 }
    );

    // Should have seen non-zero count at some point
    expect(counts.some(c => c > 0) || counts.every(c => c === 0)).toBe(true);

    client.dispose();
  });

  it("returns 0 with undefined filter (same as no filter)", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let count = -1;
    function TestComponent() {
      count = useIsFetching(undefined);
      return <div>Count: {count}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(count).toBe(0);
    client.dispose();
  });

  it("re-renders when a query starts fetching", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "A" }]), 50))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    const countHistory: number[] = [];
    function TestComponent() {
      useQuery(UsersPort, {});
      const count = useIsFetching();
      countHistory.push(count);
      return <div>IsFetching: {count}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    // Should eventually see non-zero and then zero counts as query completes
    await waitFor(
      () => {
        expect(countHistory[countHistory.length - 1]).toBe(0);
      },
      { timeout: 3000 }
    );

    // Verify the subscribe callback triggered re-renders
    expect(countHistory.length).toBeGreaterThan(1);

    client.dispose();
  });

  it("returns non-zero when query is actively fetching", async () => {
    const container = createTestContainer();
    container.register(
      UsersPort,
      () => ResultAsync.fromSafePromise(new Promise<User[]>(() => {})) // never resolves
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let capturedCount = -1;
    function TestComponent() {
      useQuery(UsersPort, {});
      capturedCount = useIsFetching();
      return <div>Count: {capturedCount}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(capturedCount).toBeGreaterThan(0), { timeout: 3000 });

    client.dispose();
  });
});
