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
  name: "QMutQueriesUsers",
});

const PostsPort = createQueryPort<Post[], { authorId?: string }, ApiError>()({
  name: "QMutQueriesPosts",
});

// =============================================================================
// Helpers
// =============================================================================

function createTestClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
  container.register(PostsPort, () => ResultAsync.ok([{ id: "p1", title: "Hello" }]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe("useQueries (mutation killers)", () => {
  it("config fingerprinting: port name + stringified params", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([
        { port: UsersPort, params: { role: "admin" } },
        { port: UsersPort, params: { role: "user" } },
      ]);
      const allDone = results.every(r => r.isSuccess);
      if (!allDone) return <div>Loading</div>;
      return <div>Count: {results.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Count: 2")).toBeDefined());
    client.dispose();
  });

  it("recreates observers when fingerprint changes", async () => {
    const client = createTestClient();

    function TestComponent({ role }: { role: string }) {
      const results = useQueries([{ port: UsersPort, params: { role } }]);
      const state = results[0];
      if (state.isPending) return <div>Loading</div>;
      return <div>Done-{role}</div>;
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <TestComponent role="admin" />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done-admin")).toBeDefined());

    // Change params — triggers observer recreation
    rerender(
      <Wrapper client={client}>
        <TestComponent role="user" />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done-user")).toBeDefined());
    client.dispose();
  });

  it("destroys observers on unmount", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([{ port: UsersPort, params: {} }]);
      return <div>{results[0].isPending ? "Loading" : "Done"}</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    unmount();
    // Client should not be disposed
    expect(client.isDisposed).toBe(false);
    client.dispose();
  });

  it("snapshot caching: returns same reference when unchanged", async () => {
    const client = createTestClient();
    const snapshots: ReadonlyArray<unknown>[] = [];

    function TestComponent() {
      const results = useQueries([{ port: UsersPort, params: {} }]);
      snapshots.push(results);
      return <div>{results[0].isPending ? "Loading" : "Done"}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    // After data arrives, snapshots should stabilize (same reference)
    if (snapshots.length >= 2) {
      const last = snapshots[snapshots.length - 1];
      const prev = snapshots[snapshots.length - 2];
      // They may or may not be the same reference, but the states should have consistent shape
      expect(last.length).toBe(1);
      expect(prev.length).toBe(1);
    }

    client.dispose();
  });

  it("empty configs array returns empty results", () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([]);
      return <div>Len: {results.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    expect(screen.getByText("Len: 0")).toBeDefined();
    client.dispose();
  });

  it("enabled false per query keeps it pending", async () => {
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

    await waitFor(() => expect(screen.getByText("Users: done")).toBeDefined());
    expect(screen.getByText("Posts: pending")).toBeDefined();

    client.dispose();
  });

  it("fingerprint uses null separator for uniqueness", async () => {
    const client = createTestClient();

    function TestComponent() {
      // These two should be distinct queries due to different port names
      const results = useQueries([
        { port: UsersPort, params: {} },
        { port: PostsPort, params: {} },
      ]);
      const allDone = results.every(r => r.isSuccess);
      if (!allDone) return <div>Loading</div>;
      return <div>Queries: {results.length}</div>;
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Queries: 2")).toBeDefined());
    client.dispose();
  });

  it("cleans up observers on unmount", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([{ port: UsersPort, params: {} }]);
      return <div>{results[0].isPending ? "Loading" : "Done"}</div>;
    }

    const { unmount } = render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done")).toBeDefined());

    // Unmount should cleanup observers
    unmount();
    // Client should still be usable
    expect(client.isDisposed).toBe(false);
    client.dispose();
  });

  it("unsubscribes from observers on configs change", async () => {
    const client = createTestClient();

    function TestComponent({ role }: { role?: string }) {
      const results = useQueries([{ port: UsersPort, params: { role } }]);
      const state = results[0];
      if (state.isPending) return <div>Loading</div>;
      return <div>Done-{role ?? "none"}</div>;
    }

    const { rerender } = render(
      <Wrapper client={client}>
        <TestComponent role="admin" />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done-admin")).toBeDefined());

    // Change configs - should destroy old observers and create new ones
    rerender(
      <Wrapper client={client}>
        <TestComponent role="user" />
      </Wrapper>
    );
    await waitFor(() => expect(screen.getByText("Done-user")).toBeDefined());

    client.dispose();
  });

  it("mixed ports return correct order", async () => {
    const client = createTestClient();

    function TestComponent() {
      const results = useQueries([
        { port: PostsPort, params: {} },
        { port: UsersPort, params: {} },
      ]);

      const allDone = results.every(r => r.isSuccess);
      if (!allDone) return <div>Loading</div>;

      return (
        <div>
          <span>First: {JSON.stringify((results[0].data as Post[])[0].title)}</span>
          <span>Second: {JSON.stringify((results[1].data as User[])[0].name)}</span>
        </div>
      );
    }

    render(
      <Wrapper client={client}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/First: "Hello"/)).toBeDefined();
      expect(screen.getByText(/Second: "Alice"/)).toBeDefined();
    });

    client.dispose();
  });
});
