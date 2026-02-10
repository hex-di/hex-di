import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQueries } from "../src/index.js";
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

interface Post {
  readonly id: string;
  readonly title: string;
}

interface ApiError {
  readonly _tag: string;
  readonly message: string;
}

const UsersPort = createQueryPort<User[], { role?: string }, ApiError>()({
  name: "QueriesUsers",
});

const PostsPort = createQueryPort<Post[], { authorId?: string }, ApiError>()({
  name: "QueriesPosts",
});

// =============================================================================
// Helpers
// =============================================================================

function createTestClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
  container.register(PostsPort, () => ResultAsync.ok([{ id: "p1", title: "Hello World" }]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useQueries", () => {
  it("returns array of query states matching input order", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([
        { port: UsersPort, params: {} },
        { port: PostsPort, params: {} },
      ]);

      const allDone = results.every(r => r.isSuccess);
      if (!allDone) return <div>Loading...</div>;

      return (
        <div>
          <span>Users: {(results[0].data as User[]).length}</span>
          <span>Posts: {(results[1].data as Post[]).length}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Users: 1")).toBeDefined();
      expect(screen.getByText("Posts: 1")).toBeDefined();
    });

    client.dispose();
  });

  it("shows pending state initially for each query", () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<User[]>(resolve => setTimeout(() => resolve([]), 1000))
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TestComponent() {
      const results = useQueries([{ port: UsersPort, params: {} }]);
      return <div>{results[0].isPending ? "Pending" : "Done"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Pending")).toBeDefined();
    client.dispose();
  });

  it("handles empty configs array", () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([]);
      return <div>Count: {results.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
    client.dispose();
  });

  it("supports enabled option per query", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([
        { port: UsersPort, params: {}, enabled: true },
        { port: PostsPort, params: {}, enabled: false },
      ]);

      return (
        <div>
          <span>Users: {results[0].isPending ? "pending" : "done"}</span>
          <span>Posts: {results[1].isPending ? "pending" : "done"}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Users: done")).toBeDefined();
    });

    // Posts should remain pending since it's disabled
    expect(screen.getByText("Posts: pending")).toBeDefined();

    client.dispose();
  });

  it("returns correct length matching number of configs", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([
        { port: UsersPort, params: {} },
        { port: PostsPort, params: {} },
        { port: UsersPort, params: { role: "admin" } },
      ]);

      return <div>Count: {results.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Count: 3")).toBeDefined();
    client.dispose();
  });

  it("each query state has required fields", async () => {
    const client = createTestClient();
    let capturedState: any;

    function TestComponent() {
      const results = useQueries([{ port: UsersPort, params: {} }]);
      capturedState = results[0];
      return <div>Status: {results[0].status}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Status: success")).toBeDefined();
    });

    expect(capturedState).toBeDefined();
    expect(typeof capturedState.isPending).toBe("boolean");
    expect(typeof capturedState.isSuccess).toBe("boolean");
    expect(typeof capturedState.isError).toBe("boolean");
    expect(typeof capturedState.isFetching).toBe("boolean");

    client.dispose();
  });
});
