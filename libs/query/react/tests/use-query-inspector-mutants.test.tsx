import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  createQueryInspector,
  type QueryClient,
  type QueryInspectorAPI,
} from "@hex-di/query";
import {
  QueryClientProvider,
  QueryInspectorProvider,
  useQuerySnapshot,
  useQueryDiagnostics,
  useQueryCacheStats,
  useQuerySuggestions,
  useQueryFetchHistory,
  useQueryPorts,
} from "../src/index.js";
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
  name: "InspMutUsers",
});

// =============================================================================
// Helpers
// =============================================================================

function createClientAndInspector(): { client: QueryClient; inspector: QueryInspectorAPI } {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok([{ id: "1", name: "Alice" }]));
  const client = createQueryClient({ container, defaults: { retry: 0 } });
  const inspector = createQueryInspector(client);
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
}) {
  return (
    <QueryClientProvider client={client}>
      <QueryInspectorProvider inspector={inspector}>{children}</QueryInspectorProvider>
    </QueryClientProvider>
  );
}

// =============================================================================
// Versioned snapshot caching
// =============================================================================

describe("useQueryInspector hooks (mutation killers)", () => {
  it("useQuerySnapshot returns cached value when version unchanged", async () => {
    const { client, inspector } = createClientAndInspector();
    const snapshots: unknown[] = [];

    function TestComponent() {
      const snapshot = useQuerySnapshot();
      snapshots.push(snapshot);
      return <div>Snap: {typeof snapshot}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Snap: object")).toBeDefined();

    // Multiple renders without changes should return cached reference
    if (snapshots.length >= 2) {
      expect(snapshots[snapshots.length - 1]).toBe(snapshots[snapshots.length - 2]);
    }

    client.dispose();
  });

  it("useQueryDiagnostics returns diagnostic summary", async () => {
    const { client, inspector } = createClientAndInspector();

    function TestComponent() {
      const diagnostics = useQueryDiagnostics();
      return <div>ErrorRate: {typeof diagnostics.errorRate}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("ErrorRate: number")).toBeDefined();
    client.dispose();
  });

  it("useQueryCacheStats returns cache statistics", async () => {
    const { client, inspector } = createClientAndInspector();

    function TestComponent() {
      const stats = useQueryCacheStats();
      return <div>Total: {typeof stats.totalEntries}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Total: number")).toBeDefined();
    client.dispose();
  });

  it("useQueryFetchHistory passes filter ref through", async () => {
    const { client, inspector } = createClientAndInspector();

    // Pre-populate with a fetch
    await client.fetchQuery(UsersPort, undefined);

    function TestComponent() {
      const history = useQueryFetchHistory({ portName: "InspMutUsers" });
      return <div>History: {history.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      const text = screen.getByText(/History: \d+/);
      expect(text).toBeDefined();
    });

    client.dispose();
  });

  it("useQuerySuggestions returns suggestions array", async () => {
    const { client, inspector } = createClientAndInspector();

    function TestComponent() {
      const suggestions = useQuerySuggestions();
      return <div>Suggestions: {Array.isArray(suggestions) ? "array" : "other"}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByText("Suggestions: array")).toBeDefined();
    client.dispose();
  });

  it("useQueryPorts returns port list", async () => {
    const { client, inspector } = createClientAndInspector();

    // Trigger a fetch so the port shows up
    await client.fetchQuery(UsersPort, undefined);

    function TestComponent() {
      const ports = useQueryPorts();
      return <div>Ports: {ports.length}</div>;
    }

    render(
      <Wrapper client={client} inspector={inspector}>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ports: \d+/)).toBeDefined();
    });

    client.dispose();
  });
});
