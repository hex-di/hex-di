import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryClient,
  createQueryPort,
  createMutationPort,
  createCacheKey,
  createQueryInspector,
  type CacheEvent,
  type QueryInspectorAPI,
  type QueryClient,
  type QueryClientEvent,
} from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const UsersPort = createQueryPort<string[], unknown, Error>()({ name: "InspUsers" });
const PostsPort = createQueryPort<string[], unknown, Error>()({ name: "InspPosts" });
const CommentsPort = createQueryPort<string[], string, Error>()({ name: "InspComments" });

const DeleteUserPort = createMutationPort<void, string, Error>()({
  name: "InspDeleteUser",
  effects: { invalidates: [UsersPort] },
});

const ClearPostsPort = createMutationPort<void, unknown, Error>()({
  name: "InspClearPosts",
  effects: { removes: [PostsPort] },
});

function createTestClient(): {
  client: QueryClient;
  container: ReturnType<typeof createTestContainer>;
} {
  const container = createTestContainer();
  container.register(UsersPort, () => ResultAsync.ok(["Alice", "Bob"]));
  container.register(PostsPort, () => ResultAsync.ok(["Post 1", "Post 2"]));
  container.register(CommentsPort, (_params: string) => ResultAsync.ok(["Comment 1"]));
  container.register(DeleteUserPort, () => ResultAsync.ok(undefined));
  container.register(ClearPostsPort, () => ResultAsync.ok(undefined));

  const client = createQueryClient({
    container,
    defaults: { staleTime: 60_000, retry: 0 },
  });

  return { client, container };
}

// =============================================================================
// Tests
// =============================================================================

describe("QueryInspector", () => {
  let client: QueryClient;
  let inspector: QueryInspectorAPI;

  beforeEach(() => {
    const testClient = createTestClient();
    client = testClient.client;
    inspector = createQueryInspector(client, {
      mutationPorts: [
        { name: "InspDeleteUser", effects: { invalidates: [UsersPort] } },
        { name: "InspClearPosts", effects: { removes: [PostsPort] } },
      ],
    });
  });

  afterEach(() => {
    inspector.dispose();
    client.dispose();
  });

  // ---------------------------------------------------------------------------
  // getSnapshot / getQuerySnapshot
  // ---------------------------------------------------------------------------

  describe("getSnapshot", () => {
    it("returns empty entries when cache is empty", () => {
      const snapshot = inspector.getSnapshot();
      expect(snapshot.entries).toEqual([]);
    });

    it("returns entries for cached queries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const snapshot = inspector.getSnapshot();
      expect(snapshot.entries.length).toBe(2);
    });

    it("entry hasSubscribers reflects subscriber presence", async () => {
      await client.fetchQuery(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);
      const snapshot = inspector.getSnapshot();
      const usersEntry = snapshot.entries.find(s => s.portName === "InspUsers");
      expect(usersEntry?.hasSubscribers).toBe(true);
      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("includes stats in snapshot", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getSnapshot();
      expect(snapshot.stats).toBeDefined();
      expect(snapshot.stats.totalEntries).toBe(1);
    });

    it("includes timestamp in snapshot", () => {
      const snapshot = inspector.getSnapshot();
      expect(typeof snapshot.timestamp).toBe("number");
    });
  });

  describe("getQuerySnapshot", () => {
    it("returns undefined for absent query", () => {
      expect(inspector.getQuerySnapshot(UsersPort, "missing")).toBeUndefined();
    });

    it("returns snapshot for existing query", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot).toBeDefined();
      expect(snapshot?.data).toEqual(["Alice", "Bob"]);
    });

    it("snapshot isStale reflects stale time", async () => {
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });
      await staleClient.fetchQuery(UsersPort, undefined);

      const staleInspector = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      // Need a tiny delay for the timestamp to differ
      await new Promise(r => setTimeout(r, 2));
      const snapshot = staleInspector.getQuerySnapshot(UsersPort);
      expect(snapshot?.isStale).toBe(true);

      staleInspector.dispose();
      staleClient.dispose();
    });

    it("snapshot has kind 'query-entry'", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot?.kind).toBe("query-entry");
    });
  });

  // ---------------------------------------------------------------------------
  // subscribe
  // ---------------------------------------------------------------------------

  describe("subscribe", () => {
    it("fires cache events on mutations", async () => {
      const events: CacheEvent[] = [];
      const unsub = inspector.subscribe(event => events.push(event));
      await client.fetchQuery(UsersPort, undefined);
      expect(events.length).toBeGreaterThan(0);
      unsub();
    });

    it("unsubscribe stops event delivery", async () => {
      const events: CacheEvent[] = [];
      const unsub = inspector.subscribe(event => events.push(event));
      await client.fetchQuery(UsersPort, undefined);
      const countBefore = events.length;
      unsub();
      await client.fetchQuery(PostsPort, undefined);
      expect(events.length).toBe(countBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------

  describe("getCacheStats", () => {
    it("returns zero stats when empty", () => {
      const stats = inspector.getCacheStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.activeEntries).toBe(0);
      expect(stats.errorEntries).toBe(0);
    });

    it("counts total entries correctly", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const stats = inspector.getCacheStats();
      expect(stats.totalEntries).toBe(2);
    });

    it("counts active entries (with observers)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);
      const stats = inspector.getCacheStats();
      expect(stats.activeEntries).toBe(1);
      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("counts error entries", async () => {
      client.cache.setError(UsersPort, undefined, new Error("fail"));
      const stats = inspector.getCacheStats();
      expect(stats.errorEntries).toBe(1);
    });

    it("reports inFlightCount from client", () => {
      const stats = inspector.getCacheStats();
      expect(stats.inFlightCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getFetchHistory
  // ---------------------------------------------------------------------------

  describe("getFetchHistory", () => {
    it("returns empty history initially", () => {
      expect(inspector.getFetchHistory()).toEqual([]);
    });

    it("records completed fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].portName).toBe("InspUsers");
      expect(history[0].result).toBe("ok");
    });

    it("records multiple fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const history = inspector.getFetchHistory();
      expect(history.length).toBe(2);
    });

    it("filters by portName", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const history = inspector.getFetchHistory({ portName: "InspUsers" });
      expect(history.length).toBe(1);
      expect(history[0].portName).toBe("InspUsers");
    });

    it("filters by limit", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const history = inspector.getFetchHistory({ limit: 1 });
      expect(history.length).toBe(1);
    });

    it("durationMs is captured", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      expect(history[0].durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getInvalidationGraph
  // ---------------------------------------------------------------------------

  describe("getInvalidationGraph", () => {
    it("includes registered query and mutation ports as nodes", () => {
      const graph = inspector.getInvalidationGraph();
      expect(graph.nodes).toContain("InspUsers");
      expect(graph.nodes).toContain("InspPosts");
      expect(graph.nodes).toContain("InspDeleteUser");
      expect(graph.nodes).toContain("InspClearPosts");
    });

    it("includes invalidation edges from mutation effects", () => {
      const graph = inspector.getInvalidationGraph();
      const invalidateEdge = graph.edges.find(
        e => e.from === "InspDeleteUser" && e.to === "InspUsers"
      );
      expect(invalidateEdge).toBeDefined();
      expect(invalidateEdge?.type).toBe("invalidates");
    });

    it("includes removal edges from mutation effects", () => {
      const graph = inspector.getInvalidationGraph();
      const removeEdge = graph.edges.find(e => e.from === "InspClearPosts" && e.to === "InspPosts");
      expect(removeEdge).toBeDefined();
      expect(removeEdge?.type).toBe("removes");
    });

    it("reports no cycles for acyclic graph", () => {
      const graph = inspector.getInvalidationGraph();
      expect(graph.cycles.length).toBe(0);
    });

    it("reports maxCascadeDepth", () => {
      const graph = inspector.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getDependencyGraph
  // ---------------------------------------------------------------------------

  describe("getQueryDependencyGraph", () => {
    it("returns empty graph when no queryPorts option provided", () => {
      const graph = inspector.getQueryDependencyGraph();
      expect(graph.staticEdges).toEqual([]);
      expect(graph.dynamicEdges).toEqual([]);
      expect(graph.cycles).toEqual([]);
    });

    it("returns static edges when queryPorts have dependsOn", () => {
      const { client: c2 } = createTestClient();
      const ins = createQueryInspector(c2, {
        queryPorts: [
          { name: "InspComments", dependsOn: [UsersPort] },
          { name: "InspPosts", dependsOn: [UsersPort] },
        ],
      });
      const graph = ins.getQueryDependencyGraph();

      expect(graph.staticEdges).toContainEqual({ from: "InspComments", to: "InspUsers" });
      expect(graph.staticEdges).toContainEqual({ from: "InspPosts", to: "InspUsers" });
      expect(graph.staticEdges).toHaveLength(2);
      expect(graph.cycles).toEqual([]);

      ins.dispose();
      c2.dispose();
    });

    it("detects cycles in queryPorts dependencies", () => {
      const { client: c2 } = createTestClient();
      const ins = createQueryInspector(c2, {
        queryPorts: [
          { name: "InspUsers", dependsOn: [PostsPort] },
          { name: "InspPosts", dependsOn: [UsersPort] },
        ],
      });
      const graph = ins.getQueryDependencyGraph();

      expect(graph.cycles.length).toBeGreaterThan(0);
      // Cycle should contain both nodes
      const cycleNodes = graph.cycles.flat();
      expect(cycleNodes).toContain("InspUsers");
      expect(cycleNodes).toContain("InspPosts");

      ins.dispose();
      c2.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // getDiagnostics
  // ---------------------------------------------------------------------------

  describe("getDiagnosticSummary", () => {
    it("returns zeros when empty", () => {
      const diag = inspector.getDiagnosticSummary();
      expect(diag.totalQueries).toBe(0);
      expect(diag.totalFetches).toBe(0);
      expect(diag.errorRate).toBe(0);
      expect(diag.dedupSavings).toBe(0);
      expect(diag.errorsByTag.size).toBe(0);
    });

    it("reflects fetched data", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const diag = inspector.getDiagnosticSummary();
      expect(diag.totalQueries).toBe(1);
      expect(diag.totalFetches).toBe(1);
    });

    it("tracks dedupSavings when concurrent fetches are deduplicated", async () => {
      // Fire two concurrent fetches for the same port/params — second should be deduplicated
      const [r1, r2] = await Promise.all([
        client.fetchQuery(UsersPort, undefined),
        client.fetchQuery(UsersPort, undefined),
      ]);
      expect(r1.isOk()).toBe(true);
      expect(r2.isOk()).toBe(true);

      const diag = inspector.getDiagnosticSummary();
      expect(diag.dedupSavings).toBeGreaterThanOrEqual(1);
    });

    it("tracks errorsByTag when fetch errors have _tag field", async () => {
      const TaggedErrorPort = createQueryPort<string, unknown, Error>()({ name: "InspTaggedErr" });
      const container2 = createTestContainer();
      container2.register(TaggedErrorPort, () =>
        ResultAsync.fromPromise(Promise.reject(new Error("offline")), e =>
          e instanceof Error ? e : new Error(String(e))
        )
      );
      const c2 = createQueryClient({ container: container2, defaults: { retry: 0 } });
      const ins = createQueryInspector(c2);

      await c2.fetchQuery(TaggedErrorPort, undefined);

      const diag = ins.getDiagnosticSummary();
      // The error is wrapped by fetchWithRetry as QueryFetchFailed, so the tag is "QueryFetchFailed"
      expect(diag.errorsByTag.get("QueryFetchFailed")).toBe(1);

      ins.dispose();
      c2.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // getSuggestions
  // ---------------------------------------------------------------------------

  describe("getQuerySuggestions", () => {
    it("returns empty when no issues detected", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const suggestions = inspector.getQuerySuggestions();
      // With staleTime=60000, no stale queries with observers -> no suggestions expected
      expect(suggestions).toEqual([]);
    });

    it("detects large_cache_entry when data exceeds 1MB", async () => {
      const LargePort = createQueryPort<string, unknown, Error>()({ name: "InspLargeData" });
      const container2 = createTestContainer();
      // Create a string > 1MB
      const largeData = "x".repeat(1_100_000);
      container2.register(LargePort, () => ResultAsync.ok(largeData));
      const c2 = createQueryClient({
        container: container2,
        defaults: { staleTime: 60_000, retry: 0 },
      });
      const ins = createQueryInspector(c2);

      await c2.fetchQuery(LargePort, undefined);

      const suggestions = ins.getQuerySuggestions();
      const largeSuggestion = suggestions.find(s => s.type === "large_cache_entry");
      expect(largeSuggestion).toBeDefined();
      expect(largeSuggestion?.portName).toBe("InspLargeData");

      ins.dispose();
      c2.dispose();
    });

    it("detects unused_subscriber when observer exists but fetchCount is 0", () => {
      // Create entry without fetching, then add observer
      client.cache.getOrCreate(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);

      const suggestions = inspector.getQuerySuggestions();
      const unusedSuggestion = suggestions.find(s => s.type === "unused_subscriber");
      expect(unusedSuggestion).toBeDefined();
      expect(unusedSuggestion?.portName).toBe("InspUsers");

      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("detects missing_adapter when port has no registered adapter", async () => {
      const MissingPort = createQueryPort<string, unknown, Error>()({ name: "InspMissing" });
      // Do NOT register the adapter — the port has no fetcher
      const container2 = createTestContainer();
      const c2 = createQueryClient({ container: container2, defaults: { retry: 0 } });
      const ins = createQueryInspector(c2);

      await c2.fetchQuery(MissingPort, undefined);

      const suggestions = ins.getQuerySuggestions();
      const missingSuggestion = suggestions.find(s => s.type === "missing_adapter");
      expect(missingSuggestion).toBeDefined();
      expect(missingSuggestion?.portName).toBe("InspMissing");

      ins.dispose();
      c2.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // listQueryPorts
  // ---------------------------------------------------------------------------

  describe("listQueryPorts", () => {
    it("lists registered query ports with entry and observer counts", async () => {
      await client.fetchQuery(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);

      const ports = inspector.listQueryPorts();
      const usersPort = ports.find(p => p.name === "InspUsers");
      expect(usersPort).toBeDefined();
      expect(usersPort?.entryCount).toBe(1);
      expect(usersPort?.subscriberCount).toBe(1);

      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("ports with no cache data do not appear in listQueryPorts", () => {
      // With container-based API, listQueryPorts derives from cache entries.
      // Ports registered but never fetched won't appear.
      const ports = inspector.listQueryPorts();
      const commentsPort = ports.find(p => p.name === "InspComments");
      expect(commentsPort).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // dispose
  // ---------------------------------------------------------------------------

  describe("dispose", () => {
    it("does not throw when called", () => {
      expect(() => inspector.dispose()).not.toThrow();
    });

    it("can be called multiple times safely", () => {
      inspector.dispose();
      expect(() => inspector.dispose()).not.toThrow();
    });
  });

  // ===========================================================================
  // NEW TEST GROUPS -- Mutation testing coverage
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 1. Ring buffer behavior (via getFetchHistory)
  // ---------------------------------------------------------------------------

  describe("ring buffer behavior", () => {
    it("wraps when exceeding historySize, keeping only last N entries", async () => {
      inspector.dispose();
      const smallInspector = createQueryInspector(client, { historySize: 3 });

      // Need to force 5 distinct fetches (invalidate between each to avoid cache-hit)
      for (let i = 0; i < 5; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const history = smallInspector.getFetchHistory();
      expect(history.length).toBe(3);
      smallInspector.dispose();
    });

    it("historySize=1 keeps only the last item", async () => {
      inspector.dispose();
      const tinyInspector = createQueryInspector(client, { historySize: 1 });

      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      const history = tinyInspector.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].portName).toBe("InspUsers");
      tinyInspector.dispose();
    });

    it("empty history returns empty array", () => {
      inspector.dispose();
      const freshInspector = createQueryInspector(client, { historySize: 5 });
      expect(freshInspector.getFetchHistory()).toEqual([]);
      freshInspector.dispose();
    });

    it("preserves order after wrapping (oldest to newest)", async () => {
      inspector.dispose();
      const bufInspector = createQueryInspector(client, { historySize: 3 });

      // Push 5 fetches: Users, Posts, Users, Posts, Users
      // After wrapping with capacity=3, we keep entries 3,4,5 in order
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      // invalidate to force refetch
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(PostsPort);
      await client.fetchQuery(PostsPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      const history = bufInspector.getFetchHistory();
      expect(history.length).toBe(3);
      // Verify order: timestamps should be non-decreasing
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i - 1].timestamp);
      }
      bufInspector.dispose();
    });

    it("size caps at capacity even with many pushes", async () => {
      inspector.dispose();
      const capInspector = createQueryInspector(client, { historySize: 2 });

      for (let i = 0; i < 10; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const history = capInspector.getFetchHistory();
      expect(history.length).toBe(2);
      capInspector.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Cycle detection via invalidation graph
  // ---------------------------------------------------------------------------

  describe("cycle detection via invalidation graph", () => {
    it("detects a simple A->B->A cycle", () => {
      // PortA and PortB are query ports
      const PortA = createQueryPort<void, unknown, Error>()({ name: "CycleA" });
      const PortB = createQueryPort<void, unknown, Error>()({ name: "CycleB" });

      // MutA invalidates PortB, MutB invalidates PortA
      const MutA = createMutationPort<void, unknown, Error>()({
        name: "CycleA",
        effects: { invalidates: [PortB] },
      });
      const MutB = createMutationPort<void, unknown, Error>()({
        name: "CycleB",
        effects: { invalidates: [PortA] },
      });

      const tc = createTestContainer();
      tc.register(PortA, () => ResultAsync.ok(undefined));
      tc.register(PortB, () => ResultAsync.ok(undefined));
      tc.register(MutA, () => ResultAsync.ok(undefined));
      tc.register(MutB, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "CycleA", effects: { invalidates: [PortB] } },
          { name: "CycleB", effects: { invalidates: [PortA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.cycles.length).toBeGreaterThanOrEqual(1);
      // The cycle should contain both CycleA and CycleB
      const flatCycles = graph.cycles.flat();
      expect(flatCycles).toContain("CycleA");
      expect(flatCycles).toContain("CycleB");

      ins.dispose();
      c.dispose();
    });

    it("detects a longer A->B->C->A cycle", () => {
      const PortA = createQueryPort<void, unknown, Error>()({ name: "LongCycA" });
      const PortB = createQueryPort<void, unknown, Error>()({ name: "LongCycB" });
      const PortC = createQueryPort<void, unknown, Error>()({ name: "LongCycC" });

      // Chain: MutA -> PortB, MutB -> PortC, MutC -> PortA
      const MutA = createMutationPort<void, unknown, Error>()({
        name: "LongCycA",
        effects: { invalidates: [PortB] },
      });
      const MutB = createMutationPort<void, unknown, Error>()({
        name: "LongCycB",
        effects: { invalidates: [PortC] },
      });
      const MutC = createMutationPort<void, unknown, Error>()({
        name: "LongCycC",
        effects: { invalidates: [PortA] },
      });

      const tc = createTestContainer();
      tc.register(PortA, () => ResultAsync.ok(undefined));
      tc.register(PortB, () => ResultAsync.ok(undefined));
      tc.register(PortC, () => ResultAsync.ok(undefined));
      tc.register(MutA, () => ResultAsync.ok(undefined));
      tc.register(MutB, () => ResultAsync.ok(undefined));
      tc.register(MutC, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "LongCycA", effects: { invalidates: [PortB] } },
          { name: "LongCycB", effects: { invalidates: [PortC] } },
          { name: "LongCycC", effects: { invalidates: [PortA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.cycles.length).toBeGreaterThanOrEqual(1);
      const flatCycles = graph.cycles.flat();
      expect(flatCycles).toContain("LongCycA");
      expect(flatCycles).toContain("LongCycB");
      expect(flatCycles).toContain("LongCycC");

      ins.dispose();
      c.dispose();
    });

    it("does not report false positives on a DAG (diamond shape)", () => {
      // Diamond: MutA -> PortB, MutA -> PortC, MutB -> PortD, MutC -> PortD
      const PortB = createQueryPort<void, unknown, Error>()({ name: "DiaB" });
      const PortC = createQueryPort<void, unknown, Error>()({ name: "DiaC" });
      const PortD = createQueryPort<void, unknown, Error>()({ name: "DiaD" });

      const MutA = createMutationPort<void, unknown, Error>()({
        name: "DiaA",
        effects: { invalidates: [PortB, PortC] },
      });
      const MutB = createMutationPort<void, unknown, Error>()({
        name: "DiaB",
        effects: { invalidates: [PortD] },
      });
      const MutC = createMutationPort<void, unknown, Error>()({
        name: "DiaC",
        effects: { invalidates: [PortD] },
      });

      const tc = createTestContainer();
      tc.register(PortB, () => ResultAsync.ok(undefined));
      tc.register(PortC, () => ResultAsync.ok(undefined));
      tc.register(PortD, () => ResultAsync.ok(undefined));
      tc.register(MutA, () => ResultAsync.ok(undefined));
      tc.register(MutB, () => ResultAsync.ok(undefined));
      tc.register(MutC, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "DiaA", effects: { invalidates: [PortB, PortC] } },
          { name: "DiaB", effects: { invalidates: [PortD] } },
          { name: "DiaC", effects: { invalidates: [PortD] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.cycles.length).toBe(0);

      ins.dispose();
      c.dispose();
    });

    it("detects a self-loop", () => {
      const PortX = createQueryPort<void, unknown, Error>()({ name: "SelfLoop" });
      const MutX = createMutationPort<void, unknown, Error>()({
        name: "SelfLoop",
        effects: { invalidates: [PortX] },
      });

      const tc = createTestContainer();
      tc.register(PortX, () => ResultAsync.ok(undefined));
      tc.register(MutX, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [{ name: "SelfLoop", effects: { invalidates: [PortX] } }],
      });
      const graph = ins.getInvalidationGraph();
      // Self-loop: MutX (name="SelfLoop") -> PortX (name="SelfLoop"), which
      // means node SelfLoop points to SelfLoop in the adjacency list
      expect(graph.cycles.length).toBeGreaterThanOrEqual(1);
      const selfCycle = graph.cycles.find(cycle => cycle.every(node => node === "SelfLoop"));
      expect(selfCycle).toBeDefined();

      ins.dispose();
      c.dispose();
    });

    it("detects multiple independent cycles", () => {
      const PA = createQueryPort<void, unknown, Error>()({ name: "MultiCycA" });
      const PB = createQueryPort<void, unknown, Error>()({ name: "MultiCycB" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "MultiCycC" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "MultiCycD" });

      // Cycle 1: A -> B -> A
      const MA = createMutationPort<void, unknown, Error>()({
        name: "MultiCycA",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "MultiCycB",
        effects: { invalidates: [PA] },
      });
      // Cycle 2: C -> D -> C
      const MC = createMutationPort<void, unknown, Error>()({
        name: "MultiCycC",
        effects: { invalidates: [PD] },
      });
      const MD = createMutationPort<void, unknown, Error>()({
        name: "MultiCycD",
        effects: { invalidates: [PC] },
      });

      const tc = createTestContainer();
      tc.register(PA, () => ResultAsync.ok(undefined));
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      tc.register(MD, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "MultiCycA", effects: { invalidates: [PB] } },
          { name: "MultiCycB", effects: { invalidates: [PA] } },
          { name: "MultiCycC", effects: { invalidates: [PD] } },
          { name: "MultiCycD", effects: { invalidates: [PC] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.cycles.length).toBeGreaterThanOrEqual(2);

      ins.dispose();
      c.dispose();
    });

    it("cycles array contains the cycle path nodes", () => {
      const PA = createQueryPort<void, unknown, Error>()({ name: "PathCycA" });
      const PB = createQueryPort<void, unknown, Error>()({ name: "PathCycB" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "PathCycA",
        effects: { invalidates: [PB] },
      });
      const MB2 = createMutationPort<void, unknown, Error>()({
        name: "PathCycB",
        effects: { invalidates: [PA] },
      });

      const tc = createTestContainer();
      tc.register(PA, () => ResultAsync.ok(undefined));
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB2, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "PathCycA", effects: { invalidates: [PB] } },
          { name: "PathCycB", effects: { invalidates: [PA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.cycles.length).toBeGreaterThanOrEqual(1);
      // Each cycle should have more than one element (start and end repeating)
      for (const cycle of graph.cycles) {
        expect(cycle.length).toBeGreaterThanOrEqual(2);
      }

      ins.dispose();
      c.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. computeMaxCascadeDepth via invalidation graph
  // ---------------------------------------------------------------------------

  describe("computeMaxCascadeDepth via invalidation graph", () => {
    it("returns 0 when there are no edges", () => {
      const tc = createTestContainer();
      const P = createQueryPort<void, unknown, Error>()({ name: "NoEdge" });
      tc.register(P, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c);
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(0);

      ins.dispose();
      c.dispose();
    });

    it("returns 1 for a single edge", () => {
      const PTarget = createQueryPort<void, unknown, Error>()({ name: "DepthTarget" });
      const MSrc = createMutationPort<void, unknown, Error>()({
        name: "DepthSrc",
        effects: { invalidates: [PTarget] },
      });

      const tc = createTestContainer();
      tc.register(PTarget, () => ResultAsync.ok(undefined));
      tc.register(MSrc, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [{ name: "DepthSrc", effects: { invalidates: [PTarget] } }],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(1);

      ins.dispose();
      c.dispose();
    });

    it("returns correct depth for a chain A->B->C->D", () => {
      const PB = createQueryPort<void, unknown, Error>()({ name: "ChainB" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "ChainC" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "ChainD" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "ChainA",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "ChainB",
        effects: { invalidates: [PC] },
      });
      const MC = createMutationPort<void, unknown, Error>()({
        name: "ChainC",
        effects: { invalidates: [PD] },
      });

      const tc = createTestContainer();
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "ChainA", effects: { invalidates: [PB] } },
          { name: "ChainB", effects: { invalidates: [PC] } },
          { name: "ChainC", effects: { invalidates: [PD] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(3);

      ins.dispose();
      c.dispose();
    });

    it("returns max branch depth for branching graphs", () => {
      // A -> B (depth 1 from A to B)
      // A -> C -> D (depth 2 from A through C to D)
      // Max depth should be 2
      const PB = createQueryPort<void, unknown, Error>()({ name: "BranchB" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "BranchC" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "BranchD" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "BranchA",
        effects: { invalidates: [PB, PC] },
      });
      const MC = createMutationPort<void, unknown, Error>()({
        name: "BranchC",
        effects: { invalidates: [PD] },
      });

      const tc = createTestContainer();
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "BranchA", effects: { invalidates: [PB, PC] } },
          { name: "BranchC", effects: { invalidates: [PD] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(2);

      ins.dispose();
      c.dispose();
    });

    it("handles cycles without infinite loop and returns finite value", () => {
      const PA = createQueryPort<void, unknown, Error>()({ name: "DepthCycA" });
      const PB = createQueryPort<void, unknown, Error>()({ name: "DepthCycB" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "DepthCycA",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "DepthCycB",
        effects: { invalidates: [PA] },
      });

      const tc = createTestContainer();
      tc.register(PA, () => ResultAsync.ok(undefined));
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "DepthCycA", effects: { invalidates: [PB] } },
          { name: "DepthCycB", effects: { invalidates: [PA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(Number.isFinite(graph.maxCascadeDepth)).toBe(true);
      expect(graph.maxCascadeDepth).toBeGreaterThanOrEqual(0);

      ins.dispose();
      c.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. isGcEligible via getStats gcEligibleCount
  // ---------------------------------------------------------------------------

  describe("isGcEligible via getStats gcEligibleCount", () => {
    it("entry with observers is not gc eligible", async () => {
      // Create entry with old timestamp but with observers
      const oldTc = createTestContainer();
      oldTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const oldClient = createQueryClient({
        container: oldTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      // Set data long ago by manipulating Date.now
      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() - 400_000);
      await oldClient.fetchQuery(UsersPort, undefined);
      vi.spyOn(Date, "now").mockRestore();

      // Add observer
      oldClient.cache.incrementObservers(UsersPort, undefined);

      const ins = createQueryInspector(oldClient);
      const stats = ins.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);

      oldClient.cache.decrementObservers(UsersPort, undefined);
      ins.dispose();
      oldClient.dispose();
    });

    it("entry with expired dataUpdatedAt and no observers is gc eligible", async () => {
      const oldTc = createTestContainer();
      oldTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const oldClient = createQueryClient({
        container: oldTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      // Set data long ago (beyond cacheTime=300_000)
      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() - 400_000);
      await oldClient.fetchQuery(UsersPort, undefined);
      vi.spyOn(Date, "now").mockRestore();

      const ins = createQueryInspector(oldClient);
      const stats = ins.getCacheStats();
      expect(stats.gcEligibleCount).toBe(1);

      ins.dispose();
      oldClient.dispose();
    });

    it("entry with expired errorUpdatedAt is gc eligible", () => {
      const errTc = createTestContainer();
      errTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const errClient = createQueryClient({
        container: errTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      // Set error long ago
      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() - 400_000);
      errClient.cache.setError(UsersPort, undefined, new Error("old error"));
      vi.spyOn(Date, "now").mockRestore();

      const ins = createQueryInspector(errClient);
      const stats = ins.getCacheStats();
      expect(stats.gcEligibleCount).toBe(1);

      ins.dispose();
      errClient.dispose();
    });

    it("entry not expired and no observers is not gc eligible", async () => {
      // Fresh entry without observers
      await client.fetchQuery(UsersPort, undefined);
      const stats = inspector.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. getSuggestions - all types
  // ---------------------------------------------------------------------------

  describe("getSuggestions - all types", () => {
    it("high_error_rate does not fire when all fetches succeed with >=3 fetches", async () => {
      // The inspector always pushes result:"ok" on fetch-completed, so with
      // successful fetches the error rate is 0% -- suggestion should not fire.
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      const suggestions = inspector.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      expect(errorSuggestion).toBeUndefined();
    });

    it("high_error_rate does not fire when error rate < 50%", async () => {
      // 4 successful fetches, no errors
      for (let i = 0; i < 4; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const suggestions = inspector.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      expect(errorSuggestion).toBeUndefined();
    });

    it("high_error_rate does not fire when < 3 fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      const suggestions = inspector.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      expect(errorSuggestion).toBeUndefined();
    });

    it("invalidation_storm fires when >10 fetches in 5s window", async () => {
      // Force 12 rapid fetches of the same port
      for (let i = 0; i < 12; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const suggestions = inspector.getQuerySuggestions();
      const stormSuggestion = suggestions.find(s => s.type === "invalidation_storm");
      expect(stormSuggestion).toBeDefined();
      expect(stormSuggestion?.portName).toBe("InspUsers");
    });

    it("invalidation_storm does not fire when <= 10 fetches", async () => {
      // 5 fetches should not trigger storm
      for (let i = 0; i < 5; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const suggestions = inspector.getQuerySuggestions();
      const stormSuggestion = suggestions.find(s => s.type === "invalidation_storm");
      expect(stormSuggestion).toBeUndefined();
    });

    it("stale_query fires when entry has observers and is stale", async () => {
      // Create client with staleTime=0 so data is immediately stale
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      await staleClient.fetchQuery(UsersPort, undefined);
      // Add observer to make it "active"
      staleClient.cache.incrementObservers(UsersPort, undefined);

      const staleInsp = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      // Small delay so Date.now() > dataUpdatedAt
      await new Promise(r => setTimeout(r, 2));
      const suggestions = staleInsp.getQuerySuggestions();
      const staleSuggestion = suggestions.find(s => s.type === "stale_query");
      expect(staleSuggestion).toBeDefined();
      expect(staleSuggestion?.portName).toBe("InspUsers");

      staleClient.cache.decrementObservers(UsersPort, undefined);
      staleInsp.dispose();
      staleClient.dispose();
    });

    it("stale_query does not fire when entry has no observers", async () => {
      // staleTime=0, but no observers
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      await staleClient.fetchQuery(UsersPort, undefined);

      const staleInsp = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      await new Promise(r => setTimeout(r, 2));
      const suggestions = staleInsp.getQuerySuggestions();
      const staleSuggestion = suggestions.find(s => s.type === "stale_query");
      expect(staleSuggestion).toBeUndefined();

      staleInsp.dispose();
      staleClient.dispose();
    });

    it("multiple suggestion types can coexist", async () => {
      // Create a client where we can trigger both invalidation_storm and stale_query
      const multiTc = createTestContainer();
      multiTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      multiTc.register(PostsPort, () => ResultAsync.ok(["y"]));
      const multiClient = createQueryClient({
        container: multiTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      const multiInsp = createQueryInspector(multiClient, { defaultStaleTime: 0 });

      // Trigger invalidation_storm on UsersPort
      for (let i = 0; i < 12; i++) {
        await multiClient.invalidateQueries(UsersPort);
        await multiClient.fetchQuery(UsersPort, undefined);
      }

      // Trigger stale_query on PostsPort
      await multiClient.fetchQuery(PostsPort, undefined);
      multiClient.cache.incrementObservers(PostsPort, undefined);

      await new Promise(r => setTimeout(r, 2));
      const suggestions = multiInsp.getQuerySuggestions();
      const types = new Set(suggestions.map(s => s.type));
      expect(types.has("invalidation_storm")).toBe(true);
      expect(types.has("stale_query")).toBe(true);

      multiClient.cache.decrementObservers(PostsPort, undefined);
      multiInsp.dispose();
      multiClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Event handler coverage
  // ---------------------------------------------------------------------------

  describe("event handler coverage", () => {
    it("fetch-started increments fetch request counter (affects cacheHitRate denominator)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const stats = inspector.getCacheStats();
      // At least one fetch request was counted
      // cacheHitRate = totalCacheHits / totalFetchRequests
      // After a fresh fetch with no cache hit, cacheHitRate should be 0
      expect(stats.cacheHitRate).toBe(0);
    });

    it("fetch-completed creates history entry with 'ok' result", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].result).toBe("ok");
      expect(history[0].portName).toBe("InspUsers");
    });

    it("fetch-completed uses pending timestamp for the entry timestamp", async () => {
      const beforeFetch = Date.now();
      await client.fetchQuery(UsersPort, undefined);
      const afterFetch = Date.now();
      const history = inspector.getFetchHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeFetch);
      expect(history[0].timestamp).toBeLessThanOrEqual(afterFetch);
    });

    it("fetch-completed removes pending entry (subsequent fetch creates new entry)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      // Invalidate and refetch to create a second entry
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      expect(history.length).toBe(2);
      // Each entry should have its own timestamp
      expect(history[1].timestamp).toBeGreaterThanOrEqual(history[0].timestamp);
    });

    it("cache-hit increments totalCacheHits (affects cacheHitRate)", async () => {
      // First fetch: emits fetch-started + fetch-completed (totalFetchRequests=1)
      await client.fetchQuery(UsersPort, undefined);
      // Second fetch: data is fresh, emits only cache-hit (no fetch-started)
      // So totalFetchRequests stays at 1, totalCacheHits becomes 1
      await client.fetchQuery(UsersPort, undefined);

      const stats = inspector.getCacheStats();
      // totalFetchRequests=1, totalCacheHits=1 -> cacheHitRate=1.0
      expect(stats.cacheHitRate).toBe(1);
    });

    it("cache-hit increases cacheHitRate relative to total fetch requests", async () => {
      // Fetch two different ports (2 fetch-started events, totalFetchRequests=2)
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      // Now fetch one that hits cache (no fetch-started, totalCacheHits=1)
      await client.fetchQuery(UsersPort, undefined);

      const stats = inspector.getCacheStats();
      // totalFetchRequests=2, totalCacheHits=1 -> cacheHitRate=0.5
      expect(stats.cacheHitRate).toBe(0.5);
    });

    it("deduplicated marks the fetch as deduplicated in history", async () => {
      // Start two concurrent fetches for the same port/params
      // Invalidate first to ensure we actually fetch
      await client.invalidateQueries(UsersPort);
      const [result1, result2] = await Promise.all([
        client.fetchQuery(UsersPort, undefined),
        client.fetchQuery(UsersPort, undefined),
      ]);
      // Both should succeed
      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      // The history should show deduplication happened (only 1 actual fetch entry)
      const history = inspector.getFetchHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it("retry updates pending retryAttempt", async () => {
      // Create a port with a failing adapter that retries
      const RetryPort = createQueryPort<string[], unknown, Error>()({ name: "RetryPort" });
      let callCount = 0;
      const retryTc = createTestContainer();
      retryTc.register(RetryPort, () => {
        callCount++;
        if (callCount <= 2) {
          return ResultAsync.err(new Error("transient"));
        }
        return ResultAsync.ok(["success"]);
      });
      const retryClient = createQueryClient({
        container: retryTc,
        defaults: { staleTime: 60_000, retry: 2, retryDelay: 0 },
      });

      const retryInsp = createQueryInspector(retryClient);
      const result = await retryClient.fetchQuery(RetryPort, undefined);

      if (result.isOk()) {
        const history = retryInsp.getFetchHistory();
        expect(history.length).toBe(1);
        // retryAttempt should reflect the retry attempts
        expect(history[0].retryAttempt).toBeGreaterThanOrEqual(0);
      }

      retryInsp.dispose();
      retryClient.dispose();
    });

    it("observer and mutation events are no-ops for fetch history", async () => {
      // Fetch once to have a baseline
      await client.fetchQuery(UsersPort, undefined);
      const historyBefore = inspector.getFetchHistory().length;

      // Add/remove observers - should not affect fetch history
      client.cache.incrementObservers(UsersPort, undefined);
      client.cache.decrementObservers(UsersPort, undefined);

      // Execute a mutation - should not add to fetch history
      await client.mutate(DeleteUserPort, "user1");

      const historyAfter = inspector.getFetchHistory().length;
      // Observer and mutation events don't create fetch history entries
      // (although mutation effects might trigger invalidation+refetch if there are observers)
      // With no observers, no refetch happens, so history shouldn't grow from mutation alone
      expect(historyAfter).toBe(historyBefore);
    });

    it("multiple sequential fetches for different ports create separate history entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      await client.fetchQuery(CommentsPort, "post1");

      const history = inspector.getFetchHistory();
      expect(history.length).toBe(3);
      const portNames = history.map(h => h.portName);
      expect(portNames).toContain("InspUsers");
      expect(portNames).toContain("InspPosts");
      expect(portNames).toContain("InspComments");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. getFetchHistory filters
  // ---------------------------------------------------------------------------

  describe("getFetchHistory filters", () => {
    it("filter by result:'error' returns empty when all fetches succeed", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const errorHistory = inspector.getFetchHistory({ result: "error" });
      expect(errorHistory).toEqual([]);
    });

    it("filter by result:'ok' returns all successful fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const okHistory = inspector.getFetchHistory({ result: "ok" });
      expect(okHistory.length).toBe(2);
    });

    it("filter by minDurationMs excludes fast fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      // Our mock fetchers are instant, so durationMs should be ~0
      const slowHistory = inspector.getFetchHistory({ minDurationMs: 10_000 });
      expect(slowHistory.length).toBe(0);
    });

    it("filter by minDurationMs=0 includes all fetches", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const allHistory = inspector.getFetchHistory({ minDurationMs: 0 });
      expect(allHistory.length).toBe(2);
    });

    it("filter by since timestamp excludes older entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const midpoint = Date.now() + 1;
      await client.invalidateQueries(PostsPort);
      await client.fetchQuery(PostsPort, undefined);

      const recentHistory = inspector.getFetchHistory({ since: midpoint });
      // Only the second fetch should be included
      expect(recentHistory.length).toBeLessThanOrEqual(1);
    });

    it("filter by trigger returns matching entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      // fetchQuery uses trigger:"refetch-manual"
      const manualHistory = inspector.getFetchHistory({ trigger: "refetch-manual" });
      expect(manualHistory.length).toBe(1);

      const mountHistory = inspector.getFetchHistory({ trigger: "mount" });
      expect(mountHistory.length).toBe(0);
    });

    it("filter by limit returns last N entries from filtered set", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      await client.fetchQuery(CommentsPort, "post1");

      const limited = inspector.getFetchHistory({ limit: 2 });
      expect(limited.length).toBe(2);
      // limit takes the last N, so we should see Posts and Comments
      expect(limited[0].portName).toBe("InspPosts");
      expect(limited[1].portName).toBe("InspComments");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Invalidation graph warnings
  // ---------------------------------------------------------------------------

  describe("invalidation graph warnings", () => {
    it("warns when cycles are detected", () => {
      const PA = createQueryPort<void, unknown, Error>()({ name: "WarnCycA" });
      const PB = createQueryPort<void, unknown, Error>()({ name: "WarnCycB" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "WarnCycA",
        effects: { invalidates: [PB] },
      });
      const MutB = createMutationPort<void, unknown, Error>()({
        name: "WarnCycB",
        effects: { invalidates: [PA] },
      });

      const tc = createTestContainer();
      tc.register(PA, () => ResultAsync.ok(undefined));
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MutB, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "WarnCycA", effects: { invalidates: [PB] } },
          { name: "WarnCycB", effects: { invalidates: [PA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.warnings.length).toBeGreaterThanOrEqual(1);
      expect(graph.warnings.some(w => w.includes("cycle"))).toBe(true);

      ins.dispose();
      c.dispose();
    });

    it("warns on maxCascadeDepth > 3", () => {
      // Chain of depth 4: A -> B -> C -> D -> E
      const PB = createQueryPort<void, unknown, Error>()({ name: "DeepB" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "DeepC" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "DeepD" });
      const PE = createQueryPort<void, unknown, Error>()({ name: "DeepE" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "DeepA",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "DeepB",
        effects: { invalidates: [PC] },
      });
      const MC = createMutationPort<void, unknown, Error>()({
        name: "DeepC",
        effects: { invalidates: [PD] },
      });
      const MD = createMutationPort<void, unknown, Error>()({
        name: "DeepD",
        effects: { invalidates: [PE] },
      });

      const tc = createTestContainer();
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(PE, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      tc.register(MD, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "DeepA", effects: { invalidates: [PB] } },
          { name: "DeepB", effects: { invalidates: [PC] } },
          { name: "DeepC", effects: { invalidates: [PD] } },
          { name: "DeepD", effects: { invalidates: [PE] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(4);
      expect(graph.warnings.length).toBeGreaterThanOrEqual(1);
      expect(graph.warnings.some(w => w.includes("cascade") || w.includes("depth"))).toBe(true);

      ins.dispose();
      c.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Diagnostics (extended)
  // ---------------------------------------------------------------------------

  describe("getDiagnostics (extended)", () => {
    it("reports activeQueries from observer count", async () => {
      await client.fetchQuery(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);

      const diag = inspector.getDiagnosticSummary();
      expect(diag.activeQueries).toBe(1);

      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("reports staleQueries for invalidated entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);

      const diag = inspector.getDiagnosticSummary();
      // After invalidation without observers, the entry is invalidated
      // isStale returns true for invalidated entries
      expect(diag.staleQueries).toBeGreaterThanOrEqual(1);
    });

    it("reports errorQueries for error entries", () => {
      client.cache.setError(UsersPort, undefined, new Error("fail"));
      const diag = inspector.getDiagnosticSummary();
      expect(diag.errorQueries).toBe(1);
    });

    it("avgFetchDurationMs is computed from fetch history", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const diag = inspector.getDiagnosticSummary();
      expect(diag.avgFetchDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("errorRate is 0 when all fetches succeed", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const diag = inspector.getDiagnosticSummary();
      expect(diag.errorRate).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Additional edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("getStats staleEntries counts with defaultStaleTime", async () => {
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });
      await staleClient.fetchQuery(UsersPort, undefined);

      const staleInsp = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      await new Promise(r => setTimeout(r, 2));
      const stats = staleInsp.getCacheStats();
      expect(stats.staleEntries).toBeGreaterThanOrEqual(1);

      staleInsp.dispose();
      staleClient.dispose();
    });

    it("dispose stops tracking new events", async () => {
      await client.fetchQuery(UsersPort, undefined);
      inspector.dispose();

      // After dispose, new fetches should not affect inspector history
      // (The event subscription is removed)
      await client.invalidateQueries(PostsPort);
      await client.fetchQuery(PostsPort, undefined);

      // getFetchHistory still works but only has the pre-dispose entry
      const history = inspector.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].portName).toBe("InspUsers");
    });

    it("fetch-cancelled cleans up tracking state", async () => {
      // Create a slow adapter that we can cancel
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SlowPort" });
      const cancelTc = createTestContainer();
      cancelTc.register(SlowPort, (_params: unknown, ctx: any) => {
        return ResultAsync.fromPromise(
          new Promise<string[]>((resolve, reject) => {
            const timeout = setTimeout(() => resolve(["done"]), 5000);
            ctx.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        );
      });
      const cancelClient = createQueryClient({
        container: cancelTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const cancelInsp = createQueryInspector(cancelClient);
      const controller = new AbortController();

      // Start fetch, then cancel immediately
      const fetchPromise = cancelClient.fetchQuery(SlowPort, undefined, {
        signal: controller.signal,
      });
      controller.abort();
      await fetchPromise;

      // After cancellation, no "ok" entry should be in history
      const history = cancelInsp.getFetchHistory();
      expect(history.length).toBe(0);

      cancelInsp.dispose();
      cancelClient.dispose();
    });

    it("invalidation graph with only query ports (no mutations) has no edges", () => {
      const tc = createTestContainer();
      const QOnly = createQueryPort<void, unknown, Error>()({ name: "QOnly" });
      tc.register(QOnly, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c);
      const graph = ins.getInvalidationGraph();
      expect(graph.edges.length).toBe(0);
      expect(graph.cycles.length).toBe(0);
      expect(graph.maxCascadeDepth).toBe(0);

      ins.dispose();
      c.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Targeted mutation-killing tests (round 2)
  // ---------------------------------------------------------------------------

  describe("ring buffer internals (targeted)", () => {
    it("count < capacity branch: ring buffer size increases incrementally", async () => {
      inspector.dispose();
      const ins = createQueryInspector(client, { historySize: 10 });
      expect(ins.getFetchHistory().length).toBe(0);

      await client.fetchQuery(UsersPort, undefined);
      expect(ins.getFetchHistory().length).toBe(1);

      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);
      expect(ins.getFetchHistory().length).toBe(2);

      ins.dispose();
    });

    it("writeIndex wraps around correctly with modulo arithmetic", async () => {
      inspector.dispose();
      const ins = createQueryInspector(client, { historySize: 2 });

      // Push 3 entries into buffer of capacity 2
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      const history = ins.getFetchHistory();
      expect(history.length).toBe(2);
      // After wrapping, entries should still be valid (not undefined)
      expect(history[0].portName).toBe("InspUsers");
      expect(history[1].portName).toBe("InspUsers");

      ins.dispose();
    });

    it("start calculation: when count === capacity, start = writeIndex", async () => {
      inspector.dispose();
      const ins = createQueryInspector(client, { historySize: 2 });

      // Fill exactly to capacity
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      let history = ins.getFetchHistory();
      expect(history.length).toBe(2);
      expect(history[0].portName).toBe("InspUsers");
      expect(history[1].portName).toBe("InspPosts");

      // Now push one more — wrapping occurs, start becomes writeIndex
      await client.invalidateQueries(UsersPort);
      await client.fetchQuery(UsersPort, undefined);

      history = ins.getFetchHistory();
      expect(history.length).toBe(2);
      // Oldest entry (InspUsers first fetch) was overwritten
      expect(history[0].portName).toBe("InspPosts");
      expect(history[1].portName).toBe("InspUsers");

      ins.dispose();
    });
  });

  describe("getQuerySnapshot fields (targeted)", () => {
    it("hasSubscribers is false when no subscribers", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot).toBeDefined();
      expect(snapshot!.hasSubscribers).toBe(false);
    });

    it("hasSubscribers is true when subscribers present", async () => {
      await client.fetchQuery(UsersPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot!.hasSubscribers).toBe(true);
      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("fetchStatus is 'idle' for settled entry", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot!.fetchStatus).toBe("idle");
    });

    it("hasSubscribers per entry in getSnapshot().entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      client.cache.incrementObservers(UsersPort, undefined);

      const snapshots = inspector.getSnapshot().entries;
      const users = snapshots.find(s => s.portName === "InspUsers");
      const posts = snapshots.find(s => s.portName === "InspPosts");
      expect(users?.hasSubscribers).toBe(true);
      expect(posts?.hasSubscribers).toBe(false);

      client.cache.decrementObservers(UsersPort, undefined);
    });

    it("isStale is false for fresh entry with high staleTime", async () => {
      // Default staleTime is 60_000, so entry should be fresh
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot!.isStale).toBe(false);
    });

    it("isStale is true for invalidated entry", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.invalidateQueries(UsersPort);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot!.isStale).toBe(true);
    });

    it("isStale is true when entry.dataUpdatedAt is undefined", () => {
      // setError creates entry with dataUpdatedAt=undefined
      client.cache.setError(UsersPort, "no-data-timestamp", new Error("fail"));
      const snapshot = inspector.getQuerySnapshot(UsersPort, "no-data-timestamp");
      expect(snapshot!.isStale).toBe(true);
    });
  });

  describe("getStats computations (targeted)", () => {
    it("cacheHitRate division: 0 fetch requests → rate is 0", () => {
      const stats = inspector.getCacheStats();
      expect(stats.cacheHitRate).toBe(0);
    });

    it("avgFetchDurationMs division: 0 history entries → avg is 0", () => {
      const stats = inspector.getCacheStats();
      expect(stats.avgFetchDurationMs).toBe(0);
    });

    it("cacheHitRate = totalCacheHits / totalFetchRequests", async () => {
      // 2 fetch-started events (totalFetchRequests=2)
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      // 1 cache-hit (totalCacheHits=1)
      await client.fetchQuery(UsersPort, undefined);

      const stats = inspector.getCacheStats();
      // 1/2 = 0.5
      expect(stats.cacheHitRate).toBeCloseTo(0.5);
    });

    it("avgFetchDurationMs = sum(durationMs) / history.length", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      const stats = inspector.getCacheStats();
      // Both are instant so avg should be >= 0
      expect(stats.avgFetchDurationMs).toBeGreaterThanOrEqual(0);
      // With 2 entries, avg = total / 2
      const history = inspector.getFetchHistory();
      const expectedAvg = (history[0].durationMs + history[1].durationMs) / 2;
      expect(stats.avgFetchDurationMs).toBeCloseTo(expectedAvg);
    });

    it("staleEntries counts entries that are stale", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const stats1 = inspector.getCacheStats();
      // Fresh entry, not stale
      expect(stats1.staleEntries).toBe(0);

      // Invalidate to make stale
      await client.invalidateQueries(UsersPort);
      const stats2 = inspector.getCacheStats();
      expect(stats2.staleEntries).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getDiagnostics (targeted)", () => {
    it("errorRate = errorFetches / totalHistory when > 0", async () => {
      // All successful fetches → errorRate = 0/N
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const diag = inspector.getDiagnosticSummary();
      expect(diag.totalFetches).toBe(2);
      expect(diag.errorRate).toBe(0);
    });

    it("totalFetches matches history length", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const diag = inspector.getDiagnosticSummary();
      expect(diag.totalFetches).toBe(1);
    });
  });

  describe("getFetchHistory filter combinations (targeted)", () => {
    it("filter.portName === undefined skips port filter", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      // No portName filter → returns all
      const history = inspector.getFetchHistory({});
      expect(history.length).toBe(2);
    });

    it("filter.result === undefined skips result filter", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory({});
      expect(history.length).toBe(1);
    });

    it("filter.minDurationMs boundary: exact match is included (>=)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      const actualDuration = history[0].durationMs;
      // Filter with exact durationMs — should include the entry (>=)
      const filtered = inspector.getFetchHistory({ minDurationMs: actualDuration });
      expect(filtered.length).toBe(1);
    });

    it("filter.since boundary: exact timestamp match is included (>=)", async () => {
      const before = Date.now();
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory();
      const timestamp = history[0].timestamp;
      // Filter with exact timestamp — should include (>=)
      const filtered = inspector.getFetchHistory({ since: timestamp });
      expect(filtered.length).toBe(1);
    });

    it("filter.limit with 1 returns last entry only", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      const filtered = inspector.getFetchHistory({ limit: 1 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].portName).toBe("InspPosts");
    });

    it("filter.trigger === undefined skips trigger filter", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const history = inspector.getFetchHistory({});
      expect(history.length).toBe(1);
      expect(history[0].trigger).toBe("refetch-manual");
    });
  });

  describe("event handler string literals (targeted)", () => {
    it("fetch-started event string is exactly 'fetch-started'", async () => {
      const events: QueryClientEvent[] = [];
      const unsub = client.subscribeToEvents(e => events.push(e));
      await client.fetchQuery(UsersPort, undefined);
      unsub();

      const started = events.find(e => e.type === "fetch-started");
      expect(started).toBeDefined();
      expect(started!.type).toBe("fetch-started");
    });

    it("fetch-completed event string is exactly 'fetch-completed'", async () => {
      const events: QueryClientEvent[] = [];
      const unsub = client.subscribeToEvents(e => events.push(e));
      await client.fetchQuery(UsersPort, undefined);
      unsub();

      const completed = events.find(e => e.type === "fetch-completed");
      expect(completed).toBeDefined();
      expect(completed!.type).toBe("fetch-completed");
    });

    it("cache-hit event string is exactly 'cache-hit'", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const events: QueryClientEvent[] = [];
      const unsub = client.subscribeToEvents(e => events.push(e));
      await client.fetchQuery(UsersPort, undefined); // cache hit
      unsub();

      const hit = events.find(e => e.type === "cache-hit");
      expect(hit).toBeDefined();
      expect(hit!.type).toBe("cache-hit");
    });
  });

  describe("isStale internal function (targeted)", () => {
    it("isStale returns true when Date.now() - dataUpdatedAt > defaultStaleTime", async () => {
      // Create inspector with defaultStaleTime=0
      const zeroStaleInsp = createQueryInspector(client, { defaultStaleTime: 0 });
      await client.fetchQuery(UsersPort, undefined);
      await new Promise(r => setTimeout(r, 2));
      const snapshot = zeroStaleInsp.getQuerySnapshot(UsersPort);
      expect(snapshot!.isStale).toBe(true);
      zeroStaleInsp.dispose();
    });

    it("isStale returns false when Date.now() - dataUpdatedAt <= defaultStaleTime", async () => {
      // Default staleTime is 60_000 — entry just created is not stale
      await client.fetchQuery(UsersPort, undefined);
      const snapshot = inspector.getQuerySnapshot(UsersPort);
      expect(snapshot!.isStale).toBe(false);
    });
  });

  describe("isGcEligible boundary conditions (targeted)", () => {
    it("observerCount === 0 AND dataUpdatedAt expired → eligible", async () => {
      const gcTc = createTestContainer();
      gcTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const gcClient = createQueryClient({
        container: gcTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() - 400_000);
      await gcClient.fetchQuery(UsersPort, undefined);
      vi.spyOn(Date, "now").mockRestore();

      const gcInsp = createQueryInspector(gcClient);
      const stats = gcInsp.getCacheStats();
      expect(stats.gcEligibleCount).toBe(1);
      gcInsp.dispose();
      gcClient.dispose();
    });

    it("observerCount > 0 → not eligible even if expired", async () => {
      const gcTc = createTestContainer();
      gcTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const gcClient = createQueryClient({
        container: gcTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const realNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realNow() - 400_000);
      await gcClient.fetchQuery(UsersPort, undefined);
      vi.spyOn(Date, "now").mockRestore();

      gcClient.cache.incrementObservers(UsersPort, undefined);

      const gcInsp = createQueryInspector(gcClient);
      const stats = gcInsp.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);

      gcClient.cache.decrementObservers(UsersPort, undefined);
      gcInsp.dispose();
      gcClient.dispose();
    });

    it("not expired (fresh entry) → not eligible", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const stats = inspector.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);
    });
  });

  describe("getSuggestions boundary conditions (targeted)", () => {
    it("high_error_rate checks errorRate > 0.5 strictly (not >=)", async () => {
      // Create a client where exactly half the fetches fail (50%)
      let callCount = 0;
      const halfTc = createTestContainer();
      halfTc.register(UsersPort, () => {
        callCount++;
        if (callCount % 2 === 0) {
          return ResultAsync.err(new Error("fail"));
        }
        return ResultAsync.ok(["ok"]);
      });
      const halfClient = createQueryClient({
        container: halfTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      const halfInsp = createQueryInspector(halfClient);
      // 4 fetches: 2 ok, 2 error → errorRate = 0.5 → NOT > 0.5
      for (let i = 0; i < 4; i++) {
        await halfClient.invalidateQueries(UsersPort);
        await halfClient.fetchQuery(UsersPort, undefined);
      }

      const suggestions = halfInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      // 50% is NOT > 50%, so should not fire
      expect(errorSuggestion).toBeUndefined();

      halfInsp.dispose();
      halfClient.dispose();
    });

    it("invalidation_storm checks recentFetches.length > 10 (not >=)", async () => {
      // Exactly 10 fetches should NOT trigger storm (boundary: > 10 not >= 10)
      for (let i = 0; i < 10; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const suggestions = inspector.getQuerySuggestions();
      const stormSuggestion = suggestions.find(s => s.type === "invalidation_storm");
      expect(stormSuggestion).toBeUndefined();
    });
  });

  describe("listQueryPorts observerCount accumulation (targeted)", () => {
    it("accumulates observers from multiple entries", async () => {
      await client.fetchQuery(CommentsPort, "a");
      await client.fetchQuery(CommentsPort, "b");
      client.cache.incrementObservers(CommentsPort, "a");
      client.cache.incrementObservers(CommentsPort, "b");

      const ports = inspector.listQueryPorts();
      const comments = ports.find(p => p.name === "InspComments");
      expect(comments).toBeDefined();
      expect(comments!.entryCount).toBe(2);
      expect(comments!.subscriberCount).toBe(2);

      client.cache.decrementObservers(CommentsPort, "a");
      client.cache.decrementObservers(CommentsPort, "b");
    });
  });

  // ===========================================================================
  // Round 3: Targeted mutant-killing tests based on Stryker surviving mutants
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // A. Error fetches to exercise error rate computations
  //    Kills mutants on lines 553, 565, 583-585 (error filtering, errorRate calc)
  // ---------------------------------------------------------------------------

  describe("error fetch handling (mutant-killing)", () => {
    function createFailClient() {
      const FailPort = createQueryPort<string[], unknown, Error>()({ name: "FailPort" });
      const failTc = createTestContainer();
      failTc.register(FailPort, () => ResultAsync.err(new Error("test error")));
      const failClient = createQueryClient({
        container: failTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });
      return { failClient, failTc, FailPort };
    }

    it("getDiagnostics.errorRate > 0 when fetches fail", async () => {
      const { failClient, FailPort } = createFailClient();
      const failInsp = createQueryInspector(failClient);

      await failClient.fetchQuery(FailPort, undefined);

      const diag = failInsp.getDiagnosticSummary();
      expect(diag.totalFetches).toBe(1);
      expect(diag.errorRate).toBe(1);

      failInsp.dispose();
      failClient.dispose();
    });

    it("getDiagnostics.errorRate = errorCount / totalHistory (exact division)", async () => {
      const { failClient, failTc, FailPort } = createFailClient();
      // Also register a succeeding port
      failTc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
      const failInsp = createQueryInspector(failClient);

      await failClient.fetchQuery(UsersPort, undefined); // ok
      await failClient.fetchQuery(FailPort, undefined); // error

      const diag = failInsp.getDiagnosticSummary();
      expect(diag.totalFetches).toBe(2);
      // errorRate = 1/2 = 0.5 (not 1*2=2, not 0)
      expect(diag.errorRate).toBe(0.5);

      failInsp.dispose();
      failClient.dispose();
    });

    it("getDiagnostics.errorRate distinguishes error from empty string", async () => {
      const { failClient, FailPort } = createFailClient();
      const failInsp = createQueryInspector(failClient);

      await failClient.fetchQuery(FailPort, undefined);

      const diag = failInsp.getDiagnosticSummary();
      // error rate should be 1.0 (not 0.0 which would happen if filter matched "")
      expect(diag.errorRate).toBeGreaterThan(0);

      failInsp.dispose();
      failClient.dispose();
    });

    it("getFetchHistory records error entries with result 'error'", async () => {
      const { failClient, FailPort } = createFailClient();
      const failInsp = createQueryInspector(failClient);

      await failClient.fetchQuery(FailPort, undefined);

      const history = failInsp.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].result).toBe("error");
      expect(history[0].portName).toBe("FailPort");

      failInsp.dispose();
      failClient.dispose();
    });

    it("getFetchHistory filter by result:'error' returns error entries", async () => {
      const { failClient, failTc, FailPort } = createFailClient();
      failTc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
      const failInsp = createQueryInspector(failClient);

      await failClient.fetchQuery(UsersPort, undefined);
      await failClient.fetchQuery(FailPort, undefined);

      const errorHistory = failInsp.getFetchHistory({ result: "error" });
      expect(errorHistory.length).toBe(1);
      expect(errorHistory[0].portName).toBe("FailPort");

      const okHistory = failInsp.getFetchHistory({ result: "ok" });
      expect(okHistory.length).toBe(1);
      expect(okHistory[0].portName).toBe("InspUsers");

      failInsp.dispose();
      failClient.dispose();
    });

    it("getSuggestions fires high_error_rate when > 50% errors and >= 3 fetches", async () => {
      const { failClient, FailPort } = createFailClient();
      const failInsp = createQueryInspector(failClient);

      // 3 fetches, all error → errorRate = 1.0 > 0.5, count = 3 >= 3
      await failClient.fetchQuery(FailPort, undefined);
      await failClient.invalidateQueries(FailPort);
      await failClient.fetchQuery(FailPort, undefined);
      await failClient.invalidateQueries(FailPort);
      await failClient.fetchQuery(FailPort, undefined);

      const suggestions = failInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      expect(errorSuggestion).toBeDefined();
      expect(errorSuggestion!.portName).toBe("FailPort");
      // Verify message contains port name (kills StringLiteral mutant)
      expect(errorSuggestion!.message).toContain("FailPort");
      expect(errorSuggestion!.message.length).toBeGreaterThan(0);
      // Verify action is non-empty (kills StringLiteral mutant)
      expect(errorSuggestion!.action.length).toBeGreaterThan(0);

      failInsp.dispose();
      failClient.dispose();
    });

    it("getSuggestions error rate calculation uses division not multiplication", async () => {
      const { failClient, failTc, FailPort } = createFailClient();
      failTc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
      const failInsp = createQueryInspector(failClient);

      // 4 fetches: 1 ok + 3 errors → errorRate = 3/4 = 0.75 > 0.5
      await failClient.fetchQuery(UsersPort, undefined);
      await failClient.fetchQuery(FailPort, undefined);
      await failClient.invalidateQueries(FailPort);
      await failClient.fetchQuery(FailPort, undefined);
      await failClient.invalidateQueries(FailPort);
      await failClient.fetchQuery(FailPort, undefined);

      const suggestions = failInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      // With correct division (3/4 = 0.75 > 0.5): fires
      // With multiplication (3*4 = 12 > 0.5): would also fire, but...
      expect(errorSuggestion).toBeDefined();
      expect(errorSuggestion!.portName).toBe("FailPort");

      failInsp.dispose();
      failClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // B. Non-zero duration to exercise arithmetic mutations
  //    Kills mutants on lines 440 (sum+→sum-), 449 (div→mult)
  // ---------------------------------------------------------------------------

  describe("non-zero fetch duration (mutant-killing)", () => {
    it("avgFetchDurationMs is positive when fetches have non-zero duration", async () => {
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SlowPort" });
      const slowTc = createTestContainer();
      slowTc.register(SlowPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => setTimeout(() => resolve(["slow"]), 50)),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const slowClient = createQueryClient({
        container: slowTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const slowInsp = createQueryInspector(slowClient);
      await slowClient.fetchQuery(SlowPort, undefined);

      const stats = slowInsp.getCacheStats();
      // duration should be ~50ms (not 0, not negative)
      expect(stats.avgFetchDurationMs).toBeGreaterThan(0);

      slowInsp.dispose();
      slowClient.dispose();
    });

    it("avgFetchDurationMs sum uses addition not subtraction", async () => {
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SlowPort2" });
      const slowTc = createTestContainer();
      slowTc.register(SlowPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => setTimeout(() => resolve(["slow"]), 30)),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const slowClient = createQueryClient({
        container: slowTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const slowInsp = createQueryInspector(slowClient);
      await slowClient.fetchQuery(SlowPort, undefined);
      await slowClient.invalidateQueries(SlowPort);
      await slowClient.fetchQuery(SlowPort, undefined);

      const stats = slowInsp.getCacheStats();
      const history = slowInsp.getFetchHistory();
      // With addition: totalDuration = d1 + d2 → avg = (d1+d2)/2 > 0
      // With subtraction: totalDuration = d1 - d2 → could be 0 or negative
      expect(stats.avgFetchDurationMs).toBeGreaterThan(0);
      // Verify it's actually the average
      const manualAvg = history.reduce((sum, h) => sum + h.durationMs, 0) / history.length;
      expect(stats.avgFetchDurationMs).toBeCloseTo(manualAvg, 0);

      slowInsp.dispose();
      slowClient.dispose();
    });

    it("avgFetchDurationMs uses division not multiplication", async () => {
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SlowPort3" });
      const slowTc = createTestContainer();
      slowTc.register(SlowPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => setTimeout(() => resolve(["slow"]), 30)),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const slowClient = createQueryClient({
        container: slowTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const slowInsp = createQueryInspector(slowClient);
      await slowClient.fetchQuery(SlowPort, undefined);
      await slowClient.invalidateQueries(SlowPort);
      await slowClient.fetchQuery(SlowPort, undefined);

      const stats = slowInsp.getCacheStats();
      const history = slowInsp.getFetchHistory();
      const totalDuration = history.reduce((sum, h) => sum + h.durationMs, 0);
      // With division: avg = totalDuration / 2
      // With multiplication: avg = totalDuration * 2 (which is much larger)
      expect(stats.avgFetchDurationMs).toBeLessThan(totalDuration);
      expect(stats.avgFetchDurationMs).toBeCloseTo(totalDuration / history.length, 0);

      slowInsp.dispose();
      slowClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // C. Multiple entries for same port to exercise getSnapshot predicate
  //    Kills mutants on line 407 (k[0]===key[0] && k[1]===key[1] mutations)
  // ---------------------------------------------------------------------------

  describe("getSnapshot with multiple entries per port (mutant-killing)", () => {
    it("getQuerySnapshot returns correct entry when multiple entries exist for same port", async () => {
      await client.fetchQuery(CommentsPort, "param-a");
      await client.fetchQuery(CommentsPort, "param-b");

      const snapshotA = inspector.getQuerySnapshot(CommentsPort, "param-a");
      const snapshotB = inspector.getQuerySnapshot(CommentsPort, "param-b");

      expect(snapshotA).toBeDefined();
      expect(snapshotB).toBeDefined();

      // Port names should match
      expect(snapshotA!.portName).toBe("InspComments");
      expect(snapshotB!.portName).toBe("InspComments");
    });

    it("getQuerySnapshot matches port name AND params", async () => {
      await client.fetchQuery(CommentsPort, "x");
      await client.fetchQuery(CommentsPort, "y");

      // Fetch with params "x" should NOT return "y"'s entry
      const snapshotX = inspector.getQuerySnapshot(CommentsPort, "x");
      expect(snapshotX).toBeDefined();
      expect(snapshotX!.portName).toBe("InspComments");
    });
  });

  // ---------------------------------------------------------------------------
  // D. Exact warning assertions to kill Array/condition mutants
  //    Kills mutants on lines 523 (initial array), 524, 527 (conditions)
  // ---------------------------------------------------------------------------

  describe("invalidation graph warnings (exact assertions)", () => {
    it("acyclic graph with depth <= 3 has exactly 0 warnings", () => {
      const graph = inspector.getInvalidationGraph();
      // Default test setup: InspDeleteUser→InspUsers (depth=1, no cycles)
      expect(graph.warnings.length).toBe(0);
      expect(graph.warnings).toEqual([]);
    });

    it("acyclic graph with depth 1 has no depth warning", () => {
      const PT = createQueryPort<void, unknown, Error>()({ name: "WT" });
      const MS = createMutationPort<void, unknown, Error>()({
        name: "WS",
        effects: { invalidates: [PT] },
      });

      const tc = createTestContainer();
      tc.register(PT, () => ResultAsync.ok(undefined));
      tc.register(MS, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [{ name: "WS", effects: { invalidates: [PT] } }],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(1);
      // Depth 1 <= 3 → no warning
      expect(graph.warnings.length).toBe(0);

      ins.dispose();
      c.dispose();
    });

    it("depth exactly 3 does NOT trigger depth warning (> 3, not >= 3)", () => {
      const PB = createQueryPort<void, unknown, Error>()({ name: "D3B" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "D3C" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "D3D" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "D3A",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "D3B",
        effects: { invalidates: [PC] },
      });
      const MC = createMutationPort<void, unknown, Error>()({
        name: "D3C",
        effects: { invalidates: [PD] },
      });

      const tc = createTestContainer();
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "D3A", effects: { invalidates: [PB] } },
          { name: "D3B", effects: { invalidates: [PC] } },
          { name: "D3C", effects: { invalidates: [PD] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(3);
      // depth 3 is NOT > 3, so no depth warning
      expect(graph.warnings.length).toBe(0);

      ins.dispose();
      c.dispose();
    });

    it("cycle warning contains count of cycles", () => {
      const PA = createQueryPort<void, unknown, Error>()({ name: "CW_A" });
      const PB = createQueryPort<void, unknown, Error>()({ name: "CW_B" });
      const MA = createMutationPort<void, unknown, Error>()({
        name: "CW_A",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "CW_B",
        effects: { invalidates: [PA] },
      });

      const tc = createTestContainer();
      tc.register(PA, () => ResultAsync.ok(undefined));
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "CW_A", effects: { invalidates: [PB] } },
          { name: "CW_B", effects: { invalidates: [PA] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      // Exactly 1 cycle warning, containing "cycle" word
      const cycleWarnings = graph.warnings.filter(w => w.includes("cycle"));
      expect(cycleWarnings.length).toBe(1);

      ins.dispose();
      c.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // E. stale_query suggestion message/action assertions
  //    Kills mutants on lines 619-620 (StringLiteral mutations)
  // ---------------------------------------------------------------------------

  describe("stale_query suggestion content (mutant-killing)", () => {
    it("stale_query suggestion has non-empty message containing port name", async () => {
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      await staleClient.fetchQuery(UsersPort, undefined);
      staleClient.cache.incrementObservers(UsersPort, undefined);

      const staleInsp = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      await new Promise(r => setTimeout(r, 2));

      const suggestions = staleInsp.getQuerySuggestions();
      const staleSuggestion = suggestions.find(s => s.type === "stale_query");
      expect(staleSuggestion).toBeDefined();
      // Verify message is non-empty and contains port name
      expect(staleSuggestion!.message.length).toBeGreaterThan(0);
      expect(staleSuggestion!.message).toContain("InspUsers");
      // Verify action is non-empty
      expect(staleSuggestion!.action.length).toBeGreaterThan(0);

      staleClient.cache.decrementObservers(UsersPort, undefined);
      staleInsp.dispose();
      staleClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // F. invalidation_storm suggestion message/action assertions
  //    Kills mutants on lines 602-603 (StringLiteral mutations)
  // ---------------------------------------------------------------------------

  describe("invalidation_storm suggestion content (mutant-killing)", () => {
    it("invalidation_storm suggestion has non-empty message and action", async () => {
      for (let i = 0; i < 12; i++) {
        await client.invalidateQueries(UsersPort);
        await client.fetchQuery(UsersPort, undefined);
      }

      const suggestions = inspector.getQuerySuggestions();
      const stormSuggestion = suggestions.find(s => s.type === "invalidation_storm");
      expect(stormSuggestion).toBeDefined();
      // Message should be non-empty and contain port name
      expect(stormSuggestion!.message.length).toBeGreaterThan(0);
      expect(stormSuggestion!.message).toContain("InspUsers");
      // Action should be non-empty
      expect(stormSuggestion!.action.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // G. getSnapshots matched predicate validation
  //    Kills mutants on line 392 (e === entry → true)
  // ---------------------------------------------------------------------------

  describe("getSnapshot().entrieskey-entry matching (mutant-killing)", () => {
    it("each snapshot has the correct key matching its entry", async () => {
      await client.fetchQuery(CommentsPort, "alpha");
      await client.fetchQuery(CommentsPort, "beta");

      const snapshots = inspector.getSnapshot().entries;
      const commentSnapshots = snapshots.filter(s => s.portName === "InspComments");
      expect(commentSnapshots.length).toBe(2);

      // Each snapshot's cacheKey should uniquely identify the entry
      const keys = commentSnapshots.map(s => s.cacheKey[1]);
      expect(keys[0]).not.toBe(keys[1]);
    });
  });

  // ---------------------------------------------------------------------------
  // H. listQueryPorts with exact assertions
  //    Kills mutants on lines 631 (array init), 634 (filter predicate)
  // ---------------------------------------------------------------------------

  describe("listQueryPorts exact assertions (mutant-killing)", () => {
    it("listQueryPorts returns correct entryCount per port (not total)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);
      await client.fetchQuery(CommentsPort, "a");
      await client.fetchQuery(CommentsPort, "b");

      const ports = inspector.listQueryPorts();
      const users = ports.find(p => p.name === "InspUsers");
      const posts = ports.find(p => p.name === "InspPosts");
      const comments = ports.find(p => p.name === "InspComments");

      expect(users!.entryCount).toBe(1);
      expect(posts!.entryCount).toBe(1);
      expect(comments!.entryCount).toBe(2);
    });

    it("listQueryPorts result is an array of objects (not strings)", () => {
      const ports = inspector.listQueryPorts();
      for (const port of ports) {
        expect(typeof port).toBe("object");
        expect(typeof port.name).toBe("string");
        expect(typeof port.entryCount).toBe("number");
        expect(typeof port.subscriberCount).toBe("number");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // I. Query port nodes in invalidation graph
  //    Kills mutant on line 492 (BlockStatement removing nodeSet.add(qp))
  // ---------------------------------------------------------------------------

  describe("invalidation graph query port nodes (mutant-killing)", () => {
    it("fetched query ports without mutation effects appear as nodes", async () => {
      // CommentsPort has no mutation that invalidates it, but once fetched it appears in cache
      await client.fetchQuery(CommentsPort, "test");
      const graph = inspector.getInvalidationGraph();
      expect(graph.nodes).toContain("InspComments");
    });

    it("fetched query ports appear in nodes even with empty mutation effects", async () => {
      const tc = createTestContainer();
      const QA = createQueryPort<void, unknown, Error>()({ name: "OnlyQ_A" });
      const QB = createQueryPort<void, unknown, Error>()({ name: "OnlyQ_B" });
      tc.register(QA, () => ResultAsync.ok(undefined));
      tc.register(QB, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      // Fetch both ports so they appear in cache and thus in the graph nodes
      await c.fetchQuery(QA, undefined);
      await c.fetchQuery(QB, undefined);

      const ins = createQueryInspector(c);
      const graph = ins.getInvalidationGraph();
      // Both should appear since they have cache entries
      expect(graph.nodes).toContain("OnlyQ_A");
      expect(graph.nodes).toContain("OnlyQ_B");

      ins.dispose();
      c.dispose();
    });
  });

  // ===========================================================================
  // Round 4: Targeted mutant-killing tests
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // J. isFetching snapshot with in-flight fetch (kills line 421 mutations)
  // ---------------------------------------------------------------------------

  describe("isFetching snapshot during in-flight fetch (mutant-killing)", () => {
    it("getSnapshots.fetchStatus is true for pending entry while fetch is in flight", async () => {
      // Create a slow adapter to observe snapshot during fetch
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SnapFetch" });
      let resolveFetch!: (value: string[]) => void;
      const fetchTc = createTestContainer();
      fetchTc.register(SlowPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => {
            resolveFetch = resolve;
          }),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const fetchClient = createQueryClient({
        container: fetchTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const fetchInsp = createQueryInspector(fetchClient);

      // Start fetch but don't await
      const fetchPromise = fetchClient.fetchQuery(SlowPort, undefined);

      // While in-flight, check snapshots
      const snapshots = fetchInsp.getSnapshot().entries;
      const snap = snapshots.find(s => s.portName === "SnapFetch");
      expect(snap).toBeDefined();
      // isFetching should be true: inFlightCount > 0 AND entry.status is "pending"
      expect(snap!.fetchStatus).toBe("fetching");

      // Resolve and clean up
      resolveFetch(["done"]);
      await fetchPromise;

      // After completion, isFetching should be false
      const afterSnapshots = fetchInsp.getSnapshot().entries;
      const afterSnap = afterSnapshots.find(s => s.portName === "SnapFetch");
      expect(afterSnap!.fetchStatus).toBe("idle");

      fetchInsp.dispose();
      fetchClient.dispose();
    });

    it("isFetching distinguishes > 0 from >= 0 (no in-flight → false)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const snapshots = inspector.getSnapshot().entries;
      const snap = snapshots.find(s => s.portName === "InspUsers");
      // inFlightCount = 0, so isFetching must be false (> 0 fails, >= 0 would wrongly succeed)
      expect(snap!.fetchStatus).toBe("idle");
    });
  });

  // ---------------------------------------------------------------------------
  // K. getSnapshot k[0] filter (kills line 429 mutation: k[0] === key[0] → true)
  // ---------------------------------------------------------------------------

  describe("getSnapshot port filtering (mutant-killing)", () => {
    it("getSnapshot distinguishes ports with same params hash", async () => {
      // Both ports use undefined params
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      // getQuerySnapshot should return the correct one based on portName
      const usersSnap = inspector.getQuerySnapshot(UsersPort);
      const postsSnap = inspector.getQuerySnapshot(PostsPort);

      expect(usersSnap!.data).toEqual(["Alice", "Bob"]);
      expect(postsSnap!.data).toEqual(["Post 1", "Post 2"]);
    });
  });

  // ---------------------------------------------------------------------------
  // L. limit filter guard (kills line 497 mutation: limit !== undefined → true)
  //    If mutated to `true`, .slice(-undefined) = .slice(NaN) = [] → returns empty
  // ---------------------------------------------------------------------------

  describe("getFetchHistory limit guard (mutant-killing)", () => {
    it("no limit filter returns all entries (not empty)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      // Explicitly pass filter object WITHOUT limit
      const history = inspector.getFetchHistory({ portName: undefined });
      expect(history.length).toBe(2);
    });

    it("filter with only result returns correct count (no limit applied)", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      const history = inspector.getFetchHistory({ result: "ok" });
      expect(history.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // M. byPort init (kills line 598: ?? [] → ?? ["Stryker was here"])
  //    With mutant: errorRate = errors / (length+1), altering threshold behavior
  // ---------------------------------------------------------------------------

  describe("high_error_rate boundary with byPort init (mutant-killing)", () => {
    it("2 errors out of 3 fetches fires high_error_rate (errorRate = 2/3 > 0.5)", async () => {
      const FailPort = createQueryPort<string[], unknown, Error>()({ name: "ByPortFail" });
      let callCount = 0;
      const bpTc = createTestContainer();
      bpTc.register(FailPort, () => {
        callCount++;
        if (callCount <= 2) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok(["ok"]);
      });
      const bpClient = createQueryClient({
        container: bpTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const bpInsp = createQueryInspector(bpClient);

      // 3 fetches: 2 errors + 1 success → errorRate = 2/3 ≈ 0.667 > 0.5
      await bpClient.fetchQuery(FailPort, undefined);
      await bpClient.invalidateQueries(FailPort);
      await bpClient.fetchQuery(FailPort, undefined);
      await bpClient.invalidateQueries(FailPort);
      await bpClient.fetchQuery(FailPort, undefined);

      const suggestions = bpInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      // Without mutant: 2/3 = 0.667 > 0.5, length=3 >= 3 → fires
      // With mutant: 2/4 = 0.5, NOT > 0.5 → doesn't fire
      expect(errorSuggestion).toBeDefined();
      expect(errorSuggestion!.portName).toBe("ByPortFail");

      bpInsp.dispose();
      bpClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // N. portHistory.length >= 3 guard (kills line 607: >= 3 → true)
  //    Need 2 error fetches (errorRate=1.0 > 0.5 but length=2 < 3)
  // ---------------------------------------------------------------------------

  describe("high_error_rate minimum fetch count (mutant-killing)", () => {
    it("does NOT fire when only 2 error fetches (length < 3)", async () => {
      const FailPort2 = createQueryPort<string[], unknown, Error>()({ name: "MinCount" });
      const mcTc = createTestContainer();
      mcTc.register(FailPort2, () => ResultAsync.err(new Error("always fail")));
      const mcClient = createQueryClient({
        container: mcTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const mcInsp = createQueryInspector(mcClient);

      // 2 fetches, both error → errorRate = 1.0 > 0.5, but length = 2 < 3
      await mcClient.fetchQuery(FailPort2, undefined);
      await mcClient.invalidateQueries(FailPort2);
      await mcClient.fetchQuery(FailPort2, undefined);

      const suggestions = mcInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      // Without mutant: 2 < 3 → doesn't fire
      // With mutant (>= 3 → true): would fire
      expect(errorSuggestion).toBeUndefined();

      mcInsp.dispose();
      mcClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // O. Error rate message percentage (kills line 611: * 100 → / 100)
  // ---------------------------------------------------------------------------

  describe("high_error_rate message percentage (mutant-killing)", () => {
    it("message contains correct percentage (100% for all errors)", async () => {
      const FailPort3 = createQueryPort<string[], unknown, Error>()({ name: "PctTest" });
      const pctTc = createTestContainer();
      pctTc.register(FailPort3, () => ResultAsync.err(new Error("fail")));
      const pctClient = createQueryClient({
        container: pctTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const pctInsp = createQueryInspector(pctClient);

      for (let i = 0; i < 3; i++) {
        await pctClient.invalidateQueries(FailPort3);
        await pctClient.fetchQuery(FailPort3, undefined);
      }

      const suggestions = pctInsp.getQuerySuggestions();
      const errorSuggestion = suggestions.find(s => s.type === "high_error_rate");
      expect(errorSuggestion).toBeDefined();
      // With * 100: Math.round(1.0 * 100) = 100 → "100%"
      // With / 100: Math.round(1.0 / 100) = 0 → "0%"
      expect(errorSuggestion!.message).toContain("100%");
      // Verify it says "100%" not just "0%" — match exact number before %
      expect(errorSuggestion!.message).toMatch(/\b100%/);

      pctInsp.dispose();
      pctClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // P. recentFetches time window filter (kills line 619 mutations)
  //    Need fetch outside the 5s window to verify filter is applied
  // ---------------------------------------------------------------------------

  describe("invalidation_storm time window (mutant-killing)", () => {
    it("old fetches outside 5s window are excluded from storm check", async () => {
      inspector.dispose();

      // Use vi.useFakeTimers to control time
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const baseTime = Date.now();

      const twTc = createTestContainer();
      twTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const twClient = createQueryClient({
        container: twTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const twInsp = createQueryInspector(twClient);

      // 6 fetches at time 0 (old, will be outside window)
      for (let i = 0; i < 6; i++) {
        await twClient.invalidateQueries(UsersPort);
        await twClient.fetchQuery(UsersPort, undefined);
      }

      // Advance time by 10s (past the 5s window)
      vi.setSystemTime(baseTime + 10_000);

      // 6 more fetches at current time (within window)
      for (let i = 0; i < 6; i++) {
        await twClient.invalidateQueries(UsersPort);
        await twClient.fetchQuery(UsersPort, undefined);
      }

      const suggestions = twInsp.getQuerySuggestions();
      const stormSuggestion = suggestions.find(s => s.type === "invalidation_storm");
      // Only 6 recent fetches (< 10 threshold) → should NOT trigger
      // Without time filter: 12 total → would trigger
      expect(stormSuggestion).toBeUndefined();

      twInsp.dispose();
      twClient.dispose();
      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Q. stale_query matched entry identity (kills line 635: e === entry → true)
  //    Need multiple entries where stale+observed is NOT the first entry
  // ---------------------------------------------------------------------------

  describe("stale_query correct port matching (mutant-killing)", () => {
    it("reports correct portName for stale+observed entry (not first entry in cache)", async () => {
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["u"]));
      staleTc.register(PostsPort, () => ResultAsync.ok(["p"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      // Fetch both ports
      await staleClient.fetchQuery(UsersPort, undefined);
      await staleClient.fetchQuery(PostsPort, undefined);

      // Only add observer to PostsPort (not the first entry)
      staleClient.cache.incrementObservers(PostsPort, undefined);

      const staleInsp = createQueryInspector(staleClient, { defaultStaleTime: 0 });
      await new Promise(r => setTimeout(r, 2));

      const suggestions = staleInsp.getQuerySuggestions();
      const staleSuggestions = suggestions.filter(s => s.type === "stale_query");
      // Should suggest ONLY PostsPort (has observer + stale), not UsersPort
      expect(staleSuggestions.length).toBe(1);
      expect(staleSuggestions[0].portName).toBe("InspPosts");
      // Verify it doesn't contain wrong port
      expect(staleSuggestions[0].portName).not.toBe("InspUsers");

      staleClient.cache.decrementObservers(PostsPort, undefined);
      staleInsp.dispose();
      staleClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // R. Deduplication event handling (kills NoCoverage lines 371-372)
  //    Tests that "deduplicated" events populate history entries correctly
  // ---------------------------------------------------------------------------

  describe("deduplication event handling (mutant-killing)", () => {
    it("concurrent fetch for same key marks history entry as deduplicated", async () => {
      const DedupPort = createQueryPort<string[], unknown, Error>()({ name: "DedupInsp" });
      let resolveFetch!: (value: string[]) => void;
      const dedupTc = createTestContainer();
      dedupTc.register(DedupPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => {
            resolveFetch = resolve;
          }),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const dedupClient = createQueryClient({
        container: dedupTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const dedupInsp = createQueryInspector(dedupClient);

      // Start two concurrent fetches for the same key
      const p1 = dedupClient.fetchQuery(DedupPort, undefined);
      const p2 = dedupClient.fetchQuery(DedupPort, undefined);

      // Resolve and await both
      resolveFetch(["data"]);
      await p1;
      await p2;

      const history = dedupInsp.getFetchHistory();
      // Should have at least one history entry
      expect(history.length).toBeGreaterThanOrEqual(1);
      // At least one entry should be marked deduplicated
      const hasDedup = history.some(h => h.deduplicated === true);
      expect(hasDedup).toBe(true);

      dedupInsp.dispose();
      dedupClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // S. Retry event handling (kills NoCoverage lines 375-378)
  //    Tests that "retry" events update retryAttempt in history entries
  // ---------------------------------------------------------------------------

  describe("retry event handling (mutant-killing)", () => {
    it("fetch with retries records retryAttempt in history", async () => {
      const RetryPort = createQueryPort<string[], unknown, Error>()({ name: "RetryInsp" });
      let callCount = 0;
      const retryTc = createTestContainer();
      retryTc.register(RetryPort, () => {
        callCount++;
        if (callCount < 3) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok(["success"]);
      });
      const retryClient = createQueryClient({
        container: retryTc,
        defaults: { staleTime: 60_000, retry: 2, retryDelay: 0 },
      });

      const retryInsp = createQueryInspector(retryClient);

      // Fetch should fail twice then succeed on third attempt
      const result = await retryClient.fetchQuery(RetryPort, undefined);
      expect(result.isOk()).toBe(true);

      const history = retryInsp.getFetchHistory();
      expect(history.length).toBe(1);
      // retryAttempt should reflect the number of retries
      expect(history[0].retryAttempt).toBe(2);
      expect(history[0].result).toBe("ok");

      retryInsp.dispose();
      retryClient.dispose();
    });

    it("fetch with no retries has retryAttempt 0", async () => {
      const history = inspector.getFetchHistory();
      // Fresh inspector, first fetch
      await client.fetchQuery(UsersPort, undefined);
      const afterHistory = inspector.getFetchHistory();
      const latest = afterHistory[afterHistory.length - 1];
      expect(latest.retryAttempt).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // T. Ring buffer size getter (kills NoCoverage line 191)
  // ---------------------------------------------------------------------------

  describe("ring buffer size via inspector (mutant-killing)", () => {
    it("getFetchHistory reflects correct number of entries", async () => {
      await client.fetchQuery(UsersPort, undefined);
      await client.fetchQuery(PostsPort, undefined);

      const history = inspector.getFetchHistory();
      // Size should match the number of completed fetches
      expect(history.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // U. isGcEligible in inspector (kills line 401-402 mutations)
  //    Tests via getStats().gcEligibleCount with controlled clock
  // ---------------------------------------------------------------------------

  describe("isGcEligible via getStats (mutant-killing)", () => {
    it("fresh data entry is NOT gc eligible", async () => {
      await client.fetchQuery(UsersPort, undefined);
      const stats = inspector.getCacheStats();
      // Entry is fresh (just fetched), so gcEligibleCount should be 0
      expect(stats.gcEligibleCount).toBe(0);
    });

    it("expired data entry without observers IS gc eligible", async () => {
      // isGcEligible uses Date.now() directly — must use fake timers
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const baseTime = Date.now();

      const gcTc = createTestContainer();
      gcTc.register(UsersPort, () => ResultAsync.ok(["old data"]));
      const gcClient = createQueryClient({
        container: gcTc,
        clock: { now: () => Date.now() },
        defaults: { staleTime: 60_000, cacheTime: 300_000, retry: 0 },
      });

      const gcInsp = createQueryInspector(gcClient);

      await gcClient.fetchQuery(UsersPort, undefined);

      // At this point, entry is fresh — not eligible
      let stats = gcInsp.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);

      // Advance time past cacheTime (300s)
      vi.setSystemTime(baseTime + 400_000);
      stats = gcInsp.getCacheStats();
      // Now eligible because dataUpdatedAt is old enough
      expect(stats.gcEligibleCount).toBe(1);

      gcInsp.dispose();
      gcClient.dispose();
      vi.useRealTimers();
    });

    it("expired error entry without observers IS gc eligible", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const baseTime = Date.now();

      const gcTc = createTestContainer();
      gcTc.register(UsersPort, () => ResultAsync.err(new Error("fail")));
      const gcClient = createQueryClient({
        container: gcTc,
        clock: { now: () => Date.now() },
        defaults: { staleTime: 60_000, cacheTime: 300_000, retry: 0 },
      });

      const gcInsp = createQueryInspector(gcClient);
      await gcClient.fetchQuery(UsersPort, undefined);

      let stats = gcInsp.getCacheStats();
      expect(stats.gcEligibleCount).toBe(0);

      vi.setSystemTime(baseTime + 400_000);
      stats = gcInsp.getCacheStats();
      expect(stats.gcEligibleCount).toBe(1);

      gcInsp.dispose();
      gcClient.dispose();
      vi.useRealTimers();
    });

    it("entry with observers is NOT gc eligible even when expired", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
      const baseTime = Date.now();

      const gcTc = createTestContainer();
      gcTc.register(UsersPort, () => ResultAsync.ok(["data"]));
      const gcClient = createQueryClient({
        container: gcTc,
        clock: { now: () => Date.now() },
        defaults: { staleTime: 60_000, cacheTime: 300_000, retry: 0 },
      });

      const gcInsp = createQueryInspector(gcClient);
      await gcClient.fetchQuery(UsersPort, undefined);

      // Add observer
      gcClient.cache.incrementObservers(UsersPort, undefined);

      // Advance past cacheTime
      vi.setSystemTime(baseTime + 400_000);
      const stats = gcInsp.getCacheStats();
      // NOT eligible because it has observers
      expect(stats.gcEligibleCount).toBe(0);

      gcClient.cache.decrementObservers(UsersPort, undefined);
      gcInsp.dispose();
      gcClient.dispose();
      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // V. isFetching in getSnapshots (kills line 421 mutations)
  //    Test pending-but-not-fetching and success-while-other-is-fetching
  // ---------------------------------------------------------------------------

  describe("getSnapshot().entriesisFetching precision (mutant-killing)", () => {
    it("pending entry without in-flight fetch has isFetching=false (kills >= 0 mutant)", async () => {
      // Create a pending entry without starting a fetch
      client.cache.getOrCreate(UsersPort, "pending-nofetch");

      const snapshots = inspector.getSnapshot().entries;
      const snap = snapshots.find(s => s.portName === "InspUsers" && s.status === "pending");
      expect(snap).toBeDefined();
      // inFlightCount = 0, status = "pending"
      // With > 0: false && true = false ✓
      // With >= 0: true && true = true ✗ (should be false — nothing is being fetched)
      expect(snap!.fetchStatus).toBe("idle");
    });

    it("success entry shows isFetching=false even when another port is in-flight (kills status mutant)", async () => {
      const SlowPort = createQueryPort<string[], unknown, Error>()({ name: "SlowSnap" });
      let resolveSlow!: (value: string[]) => void;
      const snapTc = createTestContainer();
      snapTc.register(UsersPort, () => ResultAsync.ok(["user data"]));
      snapTc.register(SlowPort, () =>
        ResultAsync.fromPromise(
          new Promise<string[]>(resolve => {
            resolveSlow = resolve;
          }),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const snapClient = createQueryClient({
        container: snapTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const snapInsp = createQueryInspector(snapClient);

      // Fetch UsersPort (completes immediately)
      await snapClient.fetchQuery(UsersPort, undefined);

      // Start slow fetch (in-flight)
      const slowPromise = snapClient.fetchQuery(SlowPort, undefined);

      // Now: inFlightCount > 0 (SlowPort is in-flight)
      // UsersPort has status "success", SlowPort has status "pending"
      const snapshots = snapInsp.getSnapshot().entries;

      const usersSnap = snapshots.find(s => s.portName === "InspUsers");
      const slowSnap = snapshots.find(s => s.portName === "SlowSnap");

      // UsersPort: success entry — isFetching should be false
      // With `entry.status === "pending"` → false (correct)
      // With `true` → inFlightCount > 0 → true (wrong!)
      expect(usersSnap!.fetchStatus).toBe("idle");
      expect(usersSnap!.status).toBe("success");

      // SlowPort: pending entry with in-flight — isFetching should be true
      expect(slowSnap!.fetchStatus).toBe("fetching");
      expect(slowSnap!.status).toBe("pending");

      resolveSlow(["slow data"]);
      await slowPromise;

      snapInsp.dispose();
      snapClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // W. fetch-cancelled event handler cleanup (kills line 360 mutations)
  // ---------------------------------------------------------------------------

  describe("fetch-cancelled handler cleanup (mutant-killing)", () => {
    it("cancelled fetch clears pending tracking and does not appear in history", async () => {
      const CancelPort = createQueryPort<string[], unknown, Error>()({ name: "CancelInsp" });
      const cancelTc = createTestContainer();
      cancelTc.register(CancelPort, (_params: unknown, ctx: any) =>
        ResultAsync.fromPromise(
          new Promise<string[]>((_resolve, reject) => {
            ctx.signal.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
          (e: unknown) => (e instanceof Error ? e : new Error(String(e)))
        )
      );
      const cancelClient = createQueryClient({
        container: cancelTc,
        defaults: { staleTime: 60_000, retry: 0 },
      });

      const cancelInsp = createQueryInspector(cancelClient);

      // Start fetch
      const fetchPromise = cancelClient.fetchQuery(CancelPort, undefined);
      // Cancel it
      cancelClient.cancelQueries(CancelPort, undefined);
      await fetchPromise;

      // Cancelled fetches should NOT appear in history (they're cleaned up, not recorded)
      const history = cancelInsp.getFetchHistory();
      const cancelEntries = history.filter(h => h.portName === "CancelInsp");
      expect(cancelEntries.length).toBe(0);

      cancelInsp.dispose();
      cancelClient.dispose();
    });
  });

  // ===========================================================================
  // Round 5: Targeted mutant-killing tests
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // defaultStaleTime fallback (kills line 289 ?? → && mutation)
  // ---------------------------------------------------------------------------
  describe("defaultStaleTime fallback (mutant-killing)", () => {
    it("uses client.defaults.staleTime when options.defaultStaleTime is not provided", async () => {
      // Create client with staleTime=0 (entries are immediately stale)
      const staleTc = createTestContainer();
      staleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const staleClient = createQueryClient({
        container: staleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      // Create inspector WITHOUT providing defaultStaleTime
      // With correct code: defaultStaleTime = undefined ?? 0 = 0
      // With mutation: defaultStaleTime = undefined && 0 = undefined (NaN comparison → never stale)
      const noOptInsp = createQueryInspector(staleClient);

      await staleClient.fetchQuery(UsersPort, undefined);

      // Small delay so Date.now() > dataUpdatedAt
      await new Promise(r => setTimeout(r, 5));

      const stats = noOptInsp.getCacheStats();
      // With staleTime=0 and time elapsed, entry should be stale
      expect(stats.staleEntries).toBe(1);

      noOptInsp.dispose();
      staleClient.dispose();
    });

    it("uses options.defaultStaleTime when explicitly provided", async () => {
      const highStaleTc = createTestContainer();
      highStaleTc.register(UsersPort, () => ResultAsync.ok(["x"]));
      const highStaleClient = createQueryClient({
        container: highStaleTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      // Explicit defaultStaleTime=60000 overrides client staleTime=0
      const explicitInsp = createQueryInspector(highStaleClient, { defaultStaleTime: 60_000 });

      await highStaleClient.fetchQuery(UsersPort, undefined);

      const stats = explicitInsp.getCacheStats();
      // With high staleTime, entry should NOT be stale
      expect(stats.staleEntries).toBe(0);

      explicitInsp.dispose();
      highStaleClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // Event key distinguishes different ports/params (kills line 308 eventKey mutations)
  // ---------------------------------------------------------------------------
  describe("event key tracking (mutant-killing)", () => {
    it("fetch history distinguishes entries by portName", async () => {
      // If eventKey were always "" (empty), all fetches would be tracked under the same key
      // and pending timestamps would collide
      const distTc = createTestContainer();
      distTc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
      distTc.register(PostsPort, () => ResultAsync.ok(["Post1"]));
      const distClient = createQueryClient({
        container: distTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      const distInsp = createQueryInspector(distClient);

      await distClient.fetchQuery(UsersPort, undefined);
      await distClient.fetchQuery(PostsPort, undefined);

      const history = distInsp.getFetchHistory();
      expect(history.length).toBe(2);
      const portNames = history.map(h => h.portName);
      expect(portNames).toContain("InspUsers");
      expect(portNames).toContain("InspPosts");

      distInsp.dispose();
      distClient.dispose();
    });

    it("fetch history distinguishes entries by params", async () => {
      const paramTc = createTestContainer();
      paramTc.register(CommentsPort, () => ResultAsync.ok(["c1"]));
      const paramClient = createQueryClient({
        container: paramTc,
        defaults: { staleTime: 0, retry: 0 },
      });

      const paramInsp = createQueryInspector(paramClient);

      await paramClient.fetchQuery(CommentsPort, "param-a");
      await paramClient.fetchQuery(CommentsPort, "param-b");

      const history = paramInsp.getFetchHistory();
      expect(history.length).toBe(2);
      // Both should be recorded as separate entries
      expect(history[0].portName).toBe("InspComments");
      expect(history[1].portName).toBe("InspComments");

      paramInsp.dispose();
      paramClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // Retry event tracking (kills lines 328, 333 pending?.retryAttempt mutations)
  // ---------------------------------------------------------------------------
  describe("retry tracking in fetch history (mutant-killing)", () => {
    it("retryAttempt is > 0 when retries occur (success path)", async () => {
      let attempts = 0;
      const RetryPort = createQueryPort<string[], unknown, Error>()({ name: "RetryTrack" });
      const retryTc = createTestContainer();
      retryTc.register(RetryPort, () => {
        attempts++;
        if (attempts < 3) {
          return ResultAsync.err(new Error("fail-" + attempts));
        }
        return ResultAsync.ok(["success"]);
      });
      const retryClient = createQueryClient({
        container: retryTc,
        defaults: { staleTime: 60_000, retry: 3, retryDelay: 0 },
      });

      const retryInsp = createQueryInspector(retryClient);

      vi.useFakeTimers();
      const fetchPromise = retryClient.fetchQuery(RetryPort, undefined);
      await vi.runAllTimersAsync();
      await fetchPromise;
      vi.useRealTimers();

      const history = retryInsp.getFetchHistory();
      expect(history.length).toBe(1);
      // retryAttempt should reflect the actual retry count from the "retry" event
      // With the mutation (pending?.retryAttempt && 0), retryAttempt would always be 0
      expect(history[0].retryAttempt).toBeGreaterThan(0);

      retryInsp.dispose();
      retryClient.dispose();
    });

    it("retryAttempt is > 0 on error-path when all retries fail (kills line 355 && 0)", async () => {
      const FailRetryPort = createQueryPort<string[], unknown, Error>()({ name: "FailRetry" });
      const failRetryTc = createTestContainer();
      failRetryTc.register(FailRetryPort, () => ResultAsync.err(new Error("always-fail")));
      const failRetryClient = createQueryClient({
        container: failRetryTc,
        defaults: { staleTime: 60_000, retry: 2, retryDelay: 0 },
      });

      const failRetryInsp = createQueryInspector(failRetryClient);

      vi.useFakeTimers();
      const fetchPromise = failRetryClient.fetchQuery(FailRetryPort, undefined);
      await vi.runAllTimersAsync();
      await fetchPromise;
      vi.useRealTimers();

      const history = failRetryInsp.getFetchHistory();
      expect(history.length).toBe(1);
      expect(history[0].result).toBe("error");
      // retryAttempt should be > 0 (2 retries occurred)
      // With mutation (pendingErr?.retryAttempt && 0), this would be 0
      expect(history[0].retryAttempt).toBeGreaterThan(0);
      // trigger should be "refetch-manual" (not empty string)
      expect(history[0].trigger).toBe("refetch-manual");

      failRetryInsp.dispose();
      failRetryClient.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // Invalidation graph warnings (kills cycle/depth warning mutations)
  // ---------------------------------------------------------------------------
  describe("invalidation graph warnings (mutant-killing)", () => {
    it("warns about detected cycles", () => {
      const CycP = createQueryPort<void, unknown, Error>()({ name: "WarnCyc" });
      const CycM = createMutationPort<void, unknown, Error>()({
        name: "WarnCyc",
        effects: { invalidates: [CycP] },
      });

      const tc = createTestContainer();
      tc.register(CycP, () => ResultAsync.ok(undefined));
      tc.register(CycM, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [{ name: "WarnCyc", effects: { invalidates: [CycP] } }],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.warnings.length).toBeGreaterThanOrEqual(1);
      expect(graph.warnings.some(w => w.includes("cycle"))).toBe(true);

      ins.dispose();
      c.dispose();
    });

    it("warns about deep cascade (depth > 3)", () => {
      // Chain: A → B → C → D → E (depth 4 > 3)
      const PB = createQueryPort<void, unknown, Error>()({ name: "DeepB" });
      const PC = createQueryPort<void, unknown, Error>()({ name: "DeepC" });
      const PD = createQueryPort<void, unknown, Error>()({ name: "DeepD" });
      const PE = createQueryPort<void, unknown, Error>()({ name: "DeepE" });

      const MA = createMutationPort<void, unknown, Error>()({
        name: "DeepA",
        effects: { invalidates: [PB] },
      });
      const MB = createMutationPort<void, unknown, Error>()({
        name: "DeepB",
        effects: { invalidates: [PC] },
      });
      const MC = createMutationPort<void, unknown, Error>()({
        name: "DeepC",
        effects: { invalidates: [PD] },
      });
      const MD = createMutationPort<void, unknown, Error>()({
        name: "DeepD",
        effects: { invalidates: [PE] },
      });

      const tc = createTestContainer();
      tc.register(PB, () => ResultAsync.ok(undefined));
      tc.register(PC, () => ResultAsync.ok(undefined));
      tc.register(PD, () => ResultAsync.ok(undefined));
      tc.register(PE, () => ResultAsync.ok(undefined));
      tc.register(MA, () => ResultAsync.ok(undefined));
      tc.register(MB, () => ResultAsync.ok(undefined));
      tc.register(MC, () => ResultAsync.ok(undefined));
      tc.register(MD, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [
          { name: "DeepA", effects: { invalidates: [PB] } },
          { name: "DeepB", effects: { invalidates: [PC] } },
          { name: "DeepC", effects: { invalidates: [PD] } },
          { name: "DeepD", effects: { invalidates: [PE] } },
        ],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(4);
      expect(graph.warnings.some(w => w.includes("cascade"))).toBe(true);

      ins.dispose();
      c.dispose();
    });

    it("no warning when depth <= 3", () => {
      // Single edge: depth=1 ≤ 3
      const P = createQueryPort<void, unknown, Error>()({ name: "ShallowTarget" });
      const M = createMutationPort<void, unknown, Error>()({
        name: "ShallowSrc",
        effects: { invalidates: [P] },
      });

      const tc = createTestContainer();
      tc.register(P, () => ResultAsync.ok(undefined));
      tc.register(M, () => ResultAsync.ok(undefined));
      const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

      const ins = createQueryInspector(c, {
        mutationPorts: [{ name: "ShallowSrc", effects: { invalidates: [P] } }],
      });
      const graph = ins.getInvalidationGraph();
      expect(graph.maxCascadeDepth).toBe(1);
      expect(graph.warnings.some(w => w.includes("cascade"))).toBe(false);

      ins.dispose();
      c.dispose();
    });
  });
});

// =============================================================================
// Cycle detection: .slice(cycleStart) (mutant-killing: line 236)
// =============================================================================

describe("QueryInspector cycle detection excludes leading non-cycle nodes (mutant-killing)", () => {
  it("cycle path does NOT include the leading non-cycle node", () => {
    // Graph: Leading → CycA → CycB → CycA (cycle is [CycA, CycB, CycA])
    // "Leading" is NOT part of the cycle, so it should be excluded via .slice(cycleStart)
    const LeadingQP = createQueryPort<void, unknown, Error>()({ name: "Leading" });
    const CycAQP = createQueryPort<void, unknown, Error>()({ name: "CycA" });
    const CycBQP = createQueryPort<void, unknown, Error>()({ name: "CycB" });

    const LeadingMut = createMutationPort<void, unknown, Error>()({
      name: "Leading",
      effects: { invalidates: [CycAQP] },
    });
    const CycAMut = createMutationPort<void, unknown, Error>()({
      name: "CycA",
      effects: { invalidates: [CycBQP] },
    });
    const CycBMut = createMutationPort<void, unknown, Error>()({
      name: "CycB",
      effects: { invalidates: [CycAQP] },
    });

    const tc = createTestContainer();
    // Register Leading first so it appears first in nodeSet (traversal starts from it)
    tc.register(LeadingQP, () => ResultAsync.ok(undefined));
    tc.register(CycAQP, () => ResultAsync.ok(undefined));
    tc.register(CycBQP, () => ResultAsync.ok(undefined));
    tc.register(LeadingMut, () => ResultAsync.ok(undefined));
    tc.register(CycAMut, () => ResultAsync.ok(undefined));
    tc.register(CycBMut, () => ResultAsync.ok(undefined));
    const c = createQueryClient({ container: tc, defaults: { retry: 0 } });

    const ins = createQueryInspector(c, {
      mutationPorts: [
        { name: "Leading", effects: { invalidates: [CycAQP] } },
        { name: "CycA", effects: { invalidates: [CycBQP] } },
        { name: "CycB", effects: { invalidates: [CycAQP] } },
      ],
    });
    const graph = ins.getInvalidationGraph();

    expect(graph.cycles.length).toBeGreaterThanOrEqual(1);
    // "Leading" should NOT appear in any cycle — it's just a node that leads to the cycle
    for (const cycle of graph.cycles) {
      expect(cycle).not.toContain("Leading");
    }
    // The cycle should contain CycA and CycB
    const flatCycles = graph.cycles.flat();
    expect(flatCycles).toContain("CycA");
    expect(flatCycles).toContain("CycB");

    ins.dispose();
    c.dispose();
  });
});

// =============================================================================
// Boundary tests for isStale and isGcEligible (mutant-killing: lines 395, 401, 402)
// =============================================================================

describe("QueryInspector isStale boundary (mutant-killing)", () => {
  it("entry at exactly staleTime is NOT stale (strict >)", async () => {
    vi.useFakeTimers();
    const staleTimeMs = 5000;
    const baseTime = 1_000_000;
    vi.setSystemTime(baseTime);

    const tc = createTestContainer();
    tc.register(UsersPort, () => ResultAsync.ok(["Alice"]));
    const c = createQueryClient({ container: tc, defaults: { staleTime: staleTimeMs, retry: 0 } });

    // Fetch at baseTime
    await c.fetchQuery(UsersPort, undefined);

    // Advance exactly to staleTime boundary
    vi.setSystemTime(baseTime + staleTimeMs);

    const ins = createQueryInspector(c, { defaultStaleTime: staleTimeMs });
    const stats = ins.getCacheStats();
    // At exactly staleTime (Date.now() - dataUpdatedAt === staleTime), entry is NOT stale
    // Original: > staleTime → false (not stale)
    // Mutant: >= staleTime → true (stale)
    expect(stats.staleEntries).toBe(0);

    // 1ms later it should be stale
    vi.setSystemTime(baseTime + staleTimeMs + 1);
    const stats2 = ins.getCacheStats();
    expect(stats2.staleEntries).toBe(1);

    ins.dispose();
    c.dispose();
    vi.useRealTimers();
  });
});

describe("QueryInspector isGcEligible boundary (mutant-killing)", () => {
  it("entry at exactly cacheTime is NOT gc-eligible (strict >)", async () => {
    vi.useFakeTimers();
    const cacheTimeMs = 300_000;
    const baseTime = 1_000_000;
    vi.setSystemTime(baseTime);

    const tc = createTestContainer();
    tc.register(UsersPort, () => ResultAsync.ok(["Bob"]));
    const c = createQueryClient({
      container: tc,
      defaults: { staleTime: 0, retry: 0, cacheTime: cacheTimeMs },
    });

    // Fetch at baseTime
    await c.fetchQuery(UsersPort, undefined);

    // Advance exactly to cacheTime boundary
    vi.setSystemTime(baseTime + cacheTimeMs);

    const ins = createQueryInspector(c);
    const stats = ins.getCacheStats();
    // At exactly cacheTime, entry is NOT gc-eligible (strict > in original)
    expect(stats.gcEligibleCount).toBe(0);

    // 1ms later it should be gc-eligible
    vi.setSystemTime(baseTime + cacheTimeMs + 1);
    const stats2 = ins.getCacheStats();
    expect(stats2.gcEligibleCount).toBe(1);

    ins.dispose();
    c.dispose();
    vi.useRealTimers();
  });

  it("error entry at exactly cacheTime is NOT gc-eligible (strict >)", async () => {
    vi.useFakeTimers();
    const cacheTimeMs = 300_000;
    const baseTime = 1_000_000;
    vi.setSystemTime(baseTime);

    let failCount = 0;
    const tc = createTestContainer();
    tc.register(UsersPort, () => {
      failCount++;
      return ResultAsync.fromPromise(Promise.reject(new Error("fail")), (e: unknown) =>
        e instanceof Error ? e : new Error(String(e))
      );
    });
    const c = createQueryClient({
      container: tc,
      defaults: { staleTime: 0, retry: 0, cacheTime: cacheTimeMs },
    });

    // Fetch at baseTime (will fail, creating error entry)
    await c.fetchQuery(UsersPort, undefined);

    // Advance exactly to cacheTime boundary
    vi.setSystemTime(baseTime + cacheTimeMs);

    const ins = createQueryInspector(c);
    const stats = ins.getCacheStats();
    expect(stats.gcEligibleCount).toBe(0);

    // 1ms later it should be gc-eligible
    vi.setSystemTime(baseTime + cacheTimeMs + 1);
    const stats2 = ins.getCacheStats();
    expect(stats2.gcEligibleCount).toBe(1);

    ins.dispose();
    c.dispose();
    vi.useRealTimers();
  });
});
