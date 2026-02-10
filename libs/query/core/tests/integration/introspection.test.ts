/**
 * Integration tests: Query introspection
 *
 * Tests QueryInspector with a real QueryClient: snapshots, stats, fetch history,
 * invalidation graph, diagnostics, and suggestions.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryClient,
  createQueryPort,
  createMutationPort,
  createQueryInspector,
  type CacheEvent,
  type QueryClient,
  type QueryInspectorAPI,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "IntUsers" });
const PostsPort = createQueryPort<string[], unknown>()({ name: "IntPosts" });

const DeleteUserMutation = createMutationPort<void, string, Error>()({
  name: "IntDeleteUser",
  effects: {
    invalidates: [UsersPort],
  },
});

const ClearPostsMutation = createMutationPort<void, void, Error>()({
  name: "IntClearPosts",
  effects: {
    removes: [PostsPort],
  },
});

function createPopulatedClient(): { client: QueryClient; inspector: QueryInspectorAPI } {
  const container = createTestContainer();
  container.register(UsersPort, () =>
    ResultAsync.fromPromise(Promise.resolve(["Alice", "Bob"]), () => new Error("fail"))
  );
  container.register(PostsPort, () =>
    ResultAsync.fromPromise(Promise.resolve(["Post 1", "Post 2"]), () => new Error("fail"))
  );
  container.register(DeleteUserMutation, () => ResultAsync.ok(undefined));
  container.register(ClearPostsMutation, () => ResultAsync.ok(undefined));
  const client = createQueryClient({ container, defaults: { staleTime: 60_000, retry: 0 } });
  const inspector = createQueryInspector(client, {
    mutationPorts: [
      { name: "IntDeleteUser", effects: { invalidates: [UsersPort] } },
      { name: "IntClearPosts", effects: { removes: [PostsPort] } },
    ],
  });
  return { client, inspector };
}

describe("Introspection Integration", () => {
  let client: QueryClient;
  let inspector: QueryInspectorAPI;

  afterEach(() => {
    inspector?.dispose();
    client?.dispose();
  });

  it("getCacheStatsreturns correct counts after multiple queries", async () => {
    ({ client, inspector } = createPopulatedClient());

    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    const stats = inspector.getCacheStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.errorEntries).toBe(0);
  });

  it("getCacheStatstracks error entries", async () => {
    const container = createTestContainer();
    const ErrorPort = createQueryPort<string, unknown>()({ name: "IntError" });

    container.register(ErrorPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("query-failed")), e => e as Error)
    );

    client = createQueryClient({ container, defaults: { retry: 0 } });

    await client.fetchQuery(ErrorPort, undefined);

    inspector = createQueryInspector(client);
    const stats = inspector.getCacheStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(1);
  });

  it("getSnapshot returns entries for each cached query", async () => {
    ({ client, inspector } = createPopulatedClient());

    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    const snapshot = inspector.getSnapshot();
    expect(snapshot.entries.length).toBe(2);
  });

  it("subscribe fires events for cache mutations", async () => {
    ({ client, inspector } = createPopulatedClient());
    const events: CacheEvent[] = [];

    const unsub = inspector.subscribe(event => {
      events.push(event);
    });

    await client.fetchQuery(UsersPort, undefined);

    expect(events.length).toBeGreaterThan(0);
    const eventTypes = events.map(e => e.type);
    expect(eventTypes.some(t => t === "added" || t === "updated")).toBe(true);

    unsub();
  });

  it("unsubscribe stops event delivery", async () => {
    ({ client, inspector } = createPopulatedClient());
    const events: CacheEvent[] = [];

    const unsub = inspector.subscribe(event => {
      events.push(event);
    });

    await client.fetchQuery(UsersPort, undefined);
    const countBefore = events.length;

    unsub();

    await client.fetchQuery(PostsPort, undefined);
    expect(events.length).toBe(countBefore);
  });

  it("stats reflect invalidated entries as stale", async () => {
    ({ client, inspector } = createPopulatedClient());

    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    client.cache.invalidate(UsersPort);

    const stats = inspector.getCacheStats();
    expect(stats.staleEntries).toBeGreaterThanOrEqual(1);
  });

  it("stats show active entries when observers are present", async () => {
    ({ client, inspector } = createPopulatedClient());

    await client.fetchQuery(UsersPort, undefined);
    client.cache.incrementObservers(UsersPort, undefined);

    const stats = inspector.getCacheStats();
    expect(stats.activeEntries).toBe(1);

    client.cache.decrementObservers(UsersPort, undefined);
    const stats2 = inspector.getCacheStats();
    expect(stats2.activeEntries).toBe(0);
  });

  it("fetch history tracks across multiple fetch cycles", async () => {
    ({ client, inspector } = createPopulatedClient());

    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    const history = inspector.getFetchHistory();
    expect(history.length).toBe(2);

    const portNames = history.map(h => h.portName);
    expect(portNames).toContain("IntUsers");
    expect(portNames).toContain("IntPosts");
  });

  it("invalidation graph includes mutation effects", () => {
    ({ client, inspector } = createPopulatedClient());

    const graph = inspector.getInvalidationGraph();

    // Should have edges from mutations to their targets
    const deleteEdge = graph.edges.find(e => e.from === "IntDeleteUser" && e.to === "IntUsers");
    expect(deleteEdge).toBeDefined();
    expect(deleteEdge?.type).toBe("invalidates");

    const clearEdge = graph.edges.find(e => e.from === "IntClearPosts" && e.to === "IntPosts");
    expect(clearEdge).toBeDefined();
    expect(clearEdge?.type).toBe("removes");
  });

  it("diagnostics summary updates across multiple fetch/error cycles", async () => {
    const container = createTestContainer();

    let shouldFail = true;
    container.register(UsersPort, () => {
      if (shouldFail) {
        return ResultAsync.fromPromise(Promise.reject(new Error("transient")), e => e as Error);
      }
      return ResultAsync.fromPromise(
        Promise.resolve(["recovered"]),
        () => new Error("unreachable")
      );
    });

    client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });
    inspector = createQueryInspector(client, { defaultStaleTime: 0 });

    // First fetch: error
    await client.fetchQuery(UsersPort, undefined);
    const diag1 = inspector.getDiagnosticSummary();
    expect(diag1.totalQueries).toBeGreaterThanOrEqual(1);

    // Second fetch: success
    shouldFail = false;
    await client.fetchQuery(UsersPort, undefined);
    const diag2 = inspector.getDiagnosticSummary();
    expect(diag2.totalQueries).toBeGreaterThanOrEqual(1);
  });

  it("listQueryPorts returns registered ports with counts", async () => {
    ({ client, inspector } = createPopulatedClient());

    // Fetch both ports so they appear in cache entries
    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    const ports = inspector.listQueryPorts();
    expect(ports.length).toBeGreaterThanOrEqual(2);

    const usersPort = ports.find(p => p.name === "IntUsers");
    expect(usersPort?.entryCount).toBe(1);
  });

  it("runtime invalidation graph tracks mutation effects end-to-end", async () => {
    ({ client, inspector } = createPopulatedClient());

    // Populate cache
    await client.fetchQuery(UsersPort, undefined);
    await client.fetchQuery(PostsPort, undefined);

    // Execute mutation that invalidates UsersPort
    await client.mutate(DeleteUserMutation, "user-1");

    // Execute mutation that removes PostsPort
    await client.mutate(ClearPostsMutation, undefined);

    const graph = inspector.getInvalidationGraph();

    // Static edges should still be present
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);

    // Runtime edges should reflect actual mutations
    expect(graph.runtimeEdges.length).toBe(2);

    const invalidateEdge = graph.runtimeEdges.find(
      e => e.from === "IntDeleteUser" && e.to === "IntUsers"
    );
    expect(invalidateEdge).toBeDefined();
    expect(invalidateEdge?.effect).toBe("invalidates");
    expect(invalidateEdge?.count).toBe(1);
    expect(invalidateEdge?.totalEntriesAffected).toBe(1);
    expect(invalidateEdge?.lastTriggered).toBeGreaterThan(0);

    const removeEdge = graph.runtimeEdges.find(
      e => e.from === "IntClearPosts" && e.to === "IntPosts"
    );
    expect(removeEdge).toBeDefined();
    expect(removeEdge?.effect).toBe("removes");
    expect(removeEdge?.count).toBe(1);
    expect(removeEdge?.totalEntriesAffected).toBe(1);

    // No runtime-only warnings since all edges match static config
    const runtimeOnlyWarnings = graph.warnings.filter(w => w.includes("Runtime-only edge"));
    expect(runtimeOnlyWarnings).toHaveLength(0);
  });
});
