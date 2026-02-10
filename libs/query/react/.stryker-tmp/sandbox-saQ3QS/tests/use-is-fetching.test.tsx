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
  name: "IsFetchingUsers",
});

const PostsPort = createQueryPort<string[], void, ApiError>()({
  name: "IsFetchingPosts",
});

// =============================================================================
// Helpers
// =============================================================================

function createDelayedClient(delay: number): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => {
    return ResultAsync.fromSafePromise(
      new Promise<User[]>(resolve => {
        setTimeout(() => resolve([{ id: "1", name: "Alice" }]), delay);
      })
    );
  });
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useIsFetching", () => {
  it("returns 0 when no queries are fetching", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
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
    client.dispose();
  });

  it("returns count of fetching queries", async () => {
    const client = createDelayedClient(100);
    const counts: number[] = [];

    function TestComponent() {
      const count = useIsFetching();
      // Also trigger a query
      useQuery(UsersPort, {});
      counts.push(count);
      return <div>Count: {count}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    // Wait for fetch to complete
    await waitFor(
      () => {
        // Eventually the fetch should complete and count should go back to 0
        expect(counts[counts.length - 1]).toBe(0);
      },
      { timeout: 2000 }
    );

    client.dispose();
  });

  it("filters by port when provided", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    let filteredCount = -1;

    function TestComponent() {
      filteredCount = useIsFetching({ port: PostsPort });
      return <div>Count: {filteredCount}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    // No queries registered or fetching for PostsPort
    expect(filteredCount).toBe(0);
    client.dispose();
  });

  it("returns 0 when client is disposed", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    client.dispose();
    let count = -1;

    function TestComponent() {
      count = useIsFetching();
      return <div>Count: {count}</div>;
    }

    // Note: disposed client won't crash, just return 0
    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(count).toBe(0);
  });
});
