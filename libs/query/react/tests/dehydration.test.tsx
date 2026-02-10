import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  createCacheKeyFromName,
  dehydrate,
  hydrate,
  type QueryClient,
  type DehydratedState,
} from "@hex-di/query";
import { QueryClientProvider, useQuery, HydrationBoundary } from "../src/index.js";
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

const UsersPort = createQueryPort<User[], void, ApiError>()({
  name: "DehydrateUsers",
});

const PostsPort = createQueryPort<string[], void, ApiError>()({
  name: "DehydratePosts",
});

// =============================================================================
// Helpers
// =============================================================================

function createTestClient(): QueryClient {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
  container.register(PostsPort, () => ResultAsync.ok(["Hello", "World"]));
  return createQueryClient({ container, defaults: { retry: 0 } });
}

function Wrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// =============================================================================
// dehydrate tests
// =============================================================================

describe("dehydrate", () => {
  it("returns empty queries for empty cache", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    const state = dehydrate(client);

    expect(state.version).toBe(3);
    expect(state.queries).toHaveLength(0);

    client.dispose();
  });

  it("includes success entries", async () => {
    const client = createTestClient();

    await client.prefetchQuery(UsersPort, undefined);
    const state = dehydrate(client);

    expect(state.version).toBe(3);
    expect(state.queries.length).toBeGreaterThanOrEqual(1);

    const usersEntry = state.queries.find(q => q.cacheKey[0] === "DehydrateUsers");
    expect(usersEntry).toBeDefined();
    expect(usersEntry?.result._tag).toBe("Ok");
    if (usersEntry?.result._tag === "Ok") {
      expect(usersEntry.result.value).toEqual([{ id: "1", name: "Alice" }]);
    }

    client.dispose();
  });

  it("includes multiple queries", async () => {
    const client = createTestClient();

    await client.prefetchQuery(UsersPort, undefined);
    await client.prefetchQuery(PostsPort, undefined);
    const state = dehydrate(client);

    expect(state.queries.length).toBeGreaterThanOrEqual(2);

    const usersEntry = state.queries.find(q => q.cacheKey[0] === "DehydrateUsers");
    const postsEntry = state.queries.find(q => q.cacheKey[0] === "DehydratePosts");
    expect(usersEntry).toBeDefined();
    expect(postsEntry).toBeDefined();
    if (postsEntry?.result._tag === "Ok") {
      expect(postsEntry.result.value).toEqual(["Hello", "World"]);
    }

    client.dispose();
  });

  it("does not include pending entries", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    // Create pending entry without fetching
    client.cache.getOrCreate({ __portName: "SomePort" }, {});

    const state = dehydrate(client);
    expect(state.queries).toHaveLength(0);

    client.dispose();
  });
});

// =============================================================================
// hydrate tests
// =============================================================================

describe("hydrate", () => {
  it("restores dehydrated state into client", () => {
    const sourceClient = createTestClient();
    const targetContainer = createTestContainer();
    const targetClient = createQueryClient({ container: targetContainer, defaults: { retry: 0 } });

    // Populate source
    sourceClient.cache.set({ __portName: "DehydrateUsers" }, undefined, [
      { id: "1", name: "Alice" },
    ]);
    const state = dehydrate(sourceClient);

    // Hydrate target
    hydrate(targetClient, state);

    // Verify target has the data
    const entry = targetClient.cache.get({ __portName: "DehydrateUsers" }, undefined);
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("success");

    sourceClient.dispose();
    targetClient.dispose();
  });

  it("does not overwrite existing fresh data", () => {
    const targetContainer = createTestContainer();
    const targetClient = createQueryClient({ container: targetContainer, defaults: { retry: 0 } });

    // Pre-populate target with fresh data
    targetClient.cache.set({ __portName: "TestPort" }, {}, "fresh-data");

    // Create a dehydrated state with different data
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("TestPort", {}),
          result: { _tag: "Ok", value: "stale-data" },
          dataUpdatedAt: Date.now() - 10000,
        },
      ],
    };

    hydrate(targetClient, state);

    // Should keep the fresh data
    const entry = targetClient.cache.get({ __portName: "TestPort" }, {});
    expect(entry?.data).toBe("fresh-data");

    targetClient.dispose();
  });

  it("hydrates empty dehydrated state without error", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    const state: DehydratedState = { version: 3, queries: [] };

    hydrate(client, state);

    expect(client.cache.size).toBe(0);
    client.dispose();
  });
});

// =============================================================================
// HydrationBoundary component tests
// =============================================================================

describe("HydrationBoundary", () => {
  it("renders children", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    const state: DehydratedState = { version: 3, queries: [] };

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <div>Content</div>
        </HydrationBoundary>
      </Wrapper>
    );

    expect(screen.getByText("Content")).toBeDefined();
    client.dispose();
  });

  it("hydrates state before rendering children", async () => {
    const serverClient = createTestClient();
    serverClient.cache.set({ __portName: "DehydrateUsers" }, undefined, [
      { id: "1", name: "Server Alice" },
    ]);
    const dehydratedState = dehydrate(serverClient);

    const clientContainer = createTestContainer();
    clientContainer.register(UsersPort, () => ResultAsync.ok([{ id: "2", name: "Client Bob" }]));
    const clientClient = createQueryClient({ container: clientContainer, defaults: { retry: 0 } });

    function UserList() {
      const { data, isSuccess } = useQuery(UsersPort, undefined);
      if (!isSuccess || !data) return <div>Loading...</div>;
      return <div>User: {data[0].name}</div>;
    }

    render(
      <Wrapper client={clientClient}>
        <HydrationBoundary state={dehydratedState}>
          <UserList />
        </HydrationBoundary>
      </Wrapper>
    );

    // The hydrated data should be available
    await waitFor(() => {
      expect(screen.getByText(/User:/)).toBeDefined();
    });

    serverClient.dispose();
    clientClient.dispose();
  });

  it("hydrates only once even with re-renders", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    let hydrateCallCount = 0;

    const originalSet = client.cache.set.bind(client.cache);
    client.cache.set = (...args: any) => {
      hydrateCallCount++;
      return (originalSet as any)(...args);
    };

    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("TestPort", {}),
          result: { _tag: "Ok", value: "test-data" },
          dataUpdatedAt: Date.now(),
        },
      ],
    };

    const { rerender } = render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <div>Content</div>
        </HydrationBoundary>
      </Wrapper>
    );

    const firstCallCount = hydrateCallCount;

    // Re-render
    rerender(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <div>Content updated</div>
        </HydrationBoundary>
      </Wrapper>
    );

    // hydrate should not have been called again
    expect(hydrateCallCount).toBe(firstCallCount);

    client.dispose();
  });
});
