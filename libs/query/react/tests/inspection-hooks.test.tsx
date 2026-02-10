import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  createQueryClient,
  createQueryInspector,
  type QueryClient,
  type QueryInspectorAPI,
} from "@hex-di/query";
import {
  QueryClientProvider,
  QueryInspectorProvider,
  useQueryInspector,
  useQuery,
} from "../src/index.js";
import {
  useQuerySnapshot,
  useQueryDiagnostics,
  useQueryCacheStats,
  useQuerySuggestions,
  useQueryFetchHistory,
  useQueryInvalidationGraph,
  useQueryPorts,
} from "../src/hooks/use-query-inspector.js";
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
  name: "InspUsers",
});

const PostsPort = createQueryPort<string[], void, ApiError>()({
  name: "InspPosts",
});

const CreateUserPort = createMutationPort<User, { name: string }, ApiError>()({
  name: "InspCreateUser",
  effects: { invalidates: [UsersPort] },
});

// =============================================================================
// Helpers
// =============================================================================

function createClientAndInspector(opts?: { delay?: number }): {
  client: QueryClient;
  inspector: QueryInspectorAPI;
} {
  const container = createTestContainer();
  const delay = opts?.delay ?? 0;

  container.register(UsersPort, () =>
    ResultAsync.fromSafePromise(
      new Promise<User[]>(resolve => setTimeout(() => resolve([{ id: "1", name: "Alice" }]), delay))
    )
  );
  container.register(PostsPort, () => ResultAsync.ok(["Hello World"]));
  container.register(CreateUserPort, (input: { name: string }) =>
    ResultAsync.ok({ id: "2", name: input.name })
  );

  const client = createQueryClient({
    container,
    defaults: { retry: 0, staleTime: 0 },
  });
  const inspector = createQueryInspector(client, {
    mutationPorts: [{ name: "InspCreateUser", effects: { invalidates: [UsersPort] } }],
    queryPorts: [{ name: "InspUsers" }, { name: "InspPosts" }],
  });

  return { client, inspector };
}

function Wrapper({
  client,
  inspector,
  children,
}: {
  client: QueryClient;
  inspector: QueryInspectorAPI;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <QueryClientProvider client={client}>
      <QueryInspectorProvider inspector={inspector}>{children}</QueryInspectorProvider>
    </QueryClientProvider>
  );
}

// =============================================================================
// QueryInspectorProvider + useQueryInspector
// =============================================================================

describe("QueryInspectorProvider", () => {
  it("provides inspector via context", () => {
    const { client, inspector } = createClientAndInspector();
    let received: QueryInspectorAPI | undefined;

    function TestComponent(): React.ReactNode {
      received = useQueryInspector();
      return <div>ok</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(received).toBe(inspector);
    inspector.dispose();
    client.dispose();
  });

  it("throws when used outside provider", () => {
    expect(() => {
      function TestComponent(): React.ReactNode {
        useQueryInspector();
        return null;
      }
      render(<TestComponent />);
    }).toThrow("useQueryInspector must be used within a QueryInspectorProvider");
  });
});

// =============================================================================
// useQuerySnapshot
// =============================================================================

describe("useQuerySnapshot", () => {
  it("returns initial snapshot with empty entries", () => {
    const { client, inspector } = createClientAndInspector();
    let snapshot: ReturnType<QueryInspectorAPI["getSnapshot"]> | undefined;

    function TestComponent(): React.ReactNode {
      snapshot = useQuerySnapshot();
      return <div>entries: {snapshot.entries.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(snapshot).toBeDefined();
    expect(snapshot!.entries).toHaveLength(0);
    expect(snapshot!.inFlight).toHaveLength(0);
    inspector.dispose();
    client.dispose();
  });

  it("updates when cache changes", async () => {
    const { client, inspector } = createClientAndInspector();
    const entryCounts: number[] = [];

    function TestComponent(): React.ReactNode {
      const snapshot = useQuerySnapshot();
      entryCounts.push(snapshot.entries.length);
      useQuery(UsersPort, undefined);
      return <div>entries: {snapshot.entries.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(entryCounts[entryCounts.length - 1]).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQueryDiagnostics
// =============================================================================

describe("useQueryDiagnostics", () => {
  it("returns diagnostic summary", () => {
    const { client, inspector } = createClientAndInspector();
    let diagnostics: ReturnType<QueryInspectorAPI["getDiagnosticSummary"]> | undefined;

    function TestComponent(): React.ReactNode {
      diagnostics = useQueryDiagnostics();
      return <div>total: {diagnostics.totalQueries}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(diagnostics).toBeDefined();
    expect(diagnostics!.totalQueries).toBe(0);
    expect(diagnostics!.inFlightCount).toBe(0);
    inspector.dispose();
    client.dispose();
  });

  it("reflects queries after fetch", async () => {
    const { client, inspector } = createClientAndInspector();
    const totals: number[] = [];

    function TestComponent(): React.ReactNode {
      const diagnostics = useQueryDiagnostics();
      totals.push(diagnostics.totalQueries);
      useQuery(UsersPort, undefined);
      return <div>total: {diagnostics.totalQueries}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(totals[totals.length - 1]).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQueryCacheStats
// =============================================================================

describe("useQueryCacheStats", () => {
  it("returns cache stats with zero entries initially", () => {
    const { client, inspector } = createClientAndInspector();
    let stats: ReturnType<QueryInspectorAPI["getCacheStats"]> | undefined;

    function TestComponent(): React.ReactNode {
      stats = useQueryCacheStats();
      return <div>total: {stats.totalEntries}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(stats).toBeDefined();
    expect(stats!.totalEntries).toBe(0);
    inspector.dispose();
    client.dispose();
  });

  it("updates total entries after fetch", async () => {
    const { client, inspector } = createClientAndInspector();
    const entries: number[] = [];

    function TestComponent(): React.ReactNode {
      const stats = useQueryCacheStats();
      entries.push(stats.totalEntries);
      useQuery(UsersPort, undefined);
      return <div>total: {stats.totalEntries}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(entries[entries.length - 1]).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQuerySuggestions
// =============================================================================

describe("useQuerySuggestions", () => {
  it("returns empty suggestions initially", () => {
    const { client, inspector } = createClientAndInspector();
    let suggestions: ReadonlyArray<unknown> | undefined;

    function TestComponent(): React.ReactNode {
      suggestions = useQuerySuggestions();
      return <div>count: {suggestions.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(suggestions).toBeDefined();
    expect(suggestions!).toHaveLength(0);
    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQueryFetchHistory
// =============================================================================

describe("useQueryFetchHistory", () => {
  it("returns empty history initially", () => {
    const { client, inspector } = createClientAndInspector();
    let history: ReadonlyArray<unknown> | undefined;

    function TestComponent(): React.ReactNode {
      history = useQueryFetchHistory();
      return <div>count: {history.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(history).toBeDefined();
    expect(history!).toHaveLength(0);
    inspector.dispose();
    client.dispose();
  });

  it("records fetch history after query executes", async () => {
    const { client, inspector } = createClientAndInspector();

    // Fetch imperatively first so history is populated before render.
    // Inspector subscribe delegates to cache events, which fire BEFORE
    // the fetch-completed client event that populates history.
    // A hook-driven fetch would miss history on the first re-render.
    await client.fetchQuery(UsersPort, undefined);

    let history: ReadonlyArray<unknown> = [];

    function TestComponent(): React.ReactNode {
      history = useQueryFetchHistory();
      return <div>count: {history.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(history.length).toBeGreaterThan(0);

    inspector.dispose();
    client.dispose();
  });

  it("accepts a filter parameter", async () => {
    const { client, inspector } = createClientAndInspector();

    // Fetch both ports so we can verify filtering works
    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    let filteredHistory: ReadonlyArray<unknown> = [];
    let allHistory: ReadonlyArray<unknown> = [];

    function TestComponent(): React.ReactNode {
      filteredHistory = useQueryFetchHistory({ portName: "InspUsers" });
      allHistory = useQueryFetchHistory();
      return (
        <div>
          filtered: {filteredHistory.length}, all: {allHistory.length}
        </div>
      );
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(allHistory.length).toBe(2);
    expect(filteredHistory.length).toBe(1);

    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQueryInvalidationGraph
// =============================================================================

describe("useQueryInvalidationGraph", () => {
  it("returns the invalidation graph", () => {
    const { client, inspector } = createClientAndInspector();
    let graph: ReturnType<QueryInspectorAPI["getInvalidationGraph"]> | undefined;

    function TestComponent(): React.ReactNode {
      graph = useQueryInvalidationGraph();
      return <div>nodes: {graph.nodes.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(graph).toBeDefined();
    expect(graph!.nodes).toBeDefined();
    expect(graph!.edges).toBeDefined();
    expect(graph!.cycles).toBeDefined();
    inspector.dispose();
    client.dispose();
  });

  it("includes mutation effect edges", () => {
    const { client, inspector } = createClientAndInspector();
    let graph: ReturnType<QueryInspectorAPI["getInvalidationGraph"]> | undefined;

    function TestComponent(): React.ReactNode {
      graph = useQueryInvalidationGraph();
      return <div>edges: {graph.edges.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    // The mutation port has effects: { invalidates: [UsersPort] }
    expect(graph!.edges.length).toBeGreaterThan(0);
    expect(graph!.edges[0]!.from).toBe("InspCreateUser");
    expect(graph!.edges[0]!.to).toBe("InspUsers");
    inspector.dispose();
    client.dispose();
  });
});

// =============================================================================
// useQueryPorts
// =============================================================================

describe("useQueryPorts", () => {
  it("returns empty list when no queries are cached", () => {
    const { client, inspector } = createClientAndInspector();
    let ports: ReadonlyArray<{ name: string; entryCount: number }> | undefined;

    function TestComponent(): React.ReactNode {
      ports = useQueryPorts();
      return <div>count: {ports.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(ports).toBeDefined();
    expect(ports!).toHaveLength(0);
    inspector.dispose();
    client.dispose();
  });

  it("lists ports after queries are fetched", async () => {
    const { client, inspector } = createClientAndInspector();
    const portCounts: number[] = [];

    function TestComponent(): React.ReactNode {
      const ports = useQueryPorts();
      portCounts.push(ports.length);
      useQuery(UsersPort, undefined);
      return <div>ports: {ports.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(
      () => {
        expect(portCounts[portCounts.length - 1]).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    inspector.dispose();
    client.dispose();
  });
});
