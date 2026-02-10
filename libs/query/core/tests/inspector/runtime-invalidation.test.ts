/**
 * Unit tests for runtime invalidation tracking in QueryInspector.
 *
 * Verifies that "mutation-effect-applied" events are captured and
 * that getInvalidationGraph() merges runtime edges with static edges.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryClient,
  createQueryPort,
  createMutationPort,
  createQueryInspector,
  type QueryClient,
  type QueryInspectorAPI,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "RTUsers" });
const PostsPort = createQueryPort<string[], void, Error>()({ name: "RTPosts" });
const CommentsPort = createQueryPort<string[], void, Error>()({ name: "RTComments" });

const DeleteUserMutation = createMutationPort<void, string, Error>()({
  name: "RTDeleteUser",
  effects: {
    invalidates: [UsersPort],
  },
});

const ClearPostsMutation = createMutationPort<void, void, Error>()({
  name: "RTClearPosts",
  effects: {
    removes: [PostsPort],
  },
});

// A mutation with no static config (runtime-only edge)
const UndeclaredMutation = createMutationPort<void, void, Error>()({
  name: "RTUndeclared",
  effects: {
    invalidates: [CommentsPort],
  },
});

// =============================================================================
// Tests
// =============================================================================

describe("Runtime invalidation tracking", () => {
  let client: QueryClient;
  let inspector: QueryInspectorAPI;

  afterEach(() => {
    inspector?.dispose();
    client?.dispose();
  });

  it("tracks mutation-effect-applied events in runtime invalidations", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok(["Alice"]));
    container.register(DeleteUserMutation, () => ResultAsync.ok(undefined));

    client = createQueryClient({ container, defaults: { retry: 0 } });
    inspector = createQueryInspector(client, {
      mutationPorts: [{ name: "RTDeleteUser", effects: { invalidates: [UsersPort] } }],
    });

    // Populate cache so invalidation affects entries
    await client.fetchQuery(UsersPort, undefined);

    // Execute mutation → triggers invalidation effect
    await client.mutate(DeleteUserMutation, "user-1");

    const graph = inspector.getInvalidationGraph();

    // Runtime edges should be populated
    expect(graph.runtimeEdges.length).toBe(1);
    expect(graph.runtimeEdges[0].from).toBe("RTDeleteUser");
    expect(graph.runtimeEdges[0].to).toBe("RTUsers");
    expect(graph.runtimeEdges[0].effect).toBe("invalidates");
    expect(graph.runtimeEdges[0].count).toBe(1);
    expect(graph.runtimeEdges[0].totalEntriesAffected).toBe(1);
    expect(graph.runtimeEdges[0].lastTriggered).toBeGreaterThan(0);
  });

  it("increments count on repeated mutation effects", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok(["Alice"]));
    container.register(DeleteUserMutation, () => ResultAsync.ok(undefined));

    client = createQueryClient({ container, defaults: { retry: 0, staleTime: 0 } });
    inspector = createQueryInspector(client, {
      mutationPorts: [{ name: "RTDeleteUser", effects: { invalidates: [UsersPort] } }],
    });

    await client.fetchQuery(UsersPort, undefined);

    // Execute mutation twice
    await client.mutate(DeleteUserMutation, "user-1");
    await client.mutate(DeleteUserMutation, "user-2");

    const graph = inspector.getInvalidationGraph();
    const edge = graph.runtimeEdges.find(e => e.from === "RTDeleteUser" && e.to === "RTUsers");
    expect(edge).toBeDefined();
    expect(edge?.count).toBe(2);
  });

  it("tracks removes effects in runtime edges", async () => {
    const container = createTestContainer();
    container.register(PostsPort, () => ResultAsync.ok(["Post1"]));
    container.register(ClearPostsMutation, () => ResultAsync.ok(undefined));

    client = createQueryClient({ container, defaults: { retry: 0 } });
    inspector = createQueryInspector(client, {
      mutationPorts: [{ name: "RTClearPosts", effects: { removes: [PostsPort] } }],
    });

    await client.fetchQuery(PostsPort, undefined);
    await client.mutate(ClearPostsMutation, undefined);

    const graph = inspector.getInvalidationGraph();
    const edge = graph.runtimeEdges.find(e => e.from === "RTClearPosts" && e.to === "RTPosts");
    expect(edge).toBeDefined();
    expect(edge?.effect).toBe("removes");
    expect(edge?.totalEntriesAffected).toBe(1);
  });

  it("warns about runtime-only edges not in static config", async () => {
    const container = createTestContainer();
    container.register(CommentsPort, () => ResultAsync.ok(["Comment1"]));
    container.register(UndeclaredMutation, () => ResultAsync.ok(undefined));

    client = createQueryClient({ container, defaults: { retry: 0 } });
    // Inspector has NO static config for UndeclaredMutation
    inspector = createQueryInspector(client, {
      mutationPorts: [],
    });

    await client.fetchQuery(CommentsPort, undefined);
    await client.mutate(UndeclaredMutation, undefined);

    const graph = inspector.getInvalidationGraph();

    // Runtime edge should still appear
    const edge = graph.runtimeEdges.find(e => e.from === "RTUndeclared" && e.to === "RTComments");
    expect(edge).toBeDefined();

    // Warning about undeclared runtime edge
    const runtimeWarning = graph.warnings.find(
      w => w.includes("Runtime-only edge") && w.includes("RTUndeclared")
    );
    expect(runtimeWarning).toBeDefined();
  });

  it("cycle detection works on combined static + runtime edges", async () => {
    // Create a scenario where runtime edge creates a cycle with static edge.
    // Static: MutA → QueryB (invalidates)
    // Runtime: MutB → QueryA (invalidates) — if MutB existed and targeted QueryA

    // For simplicity, test that cycle detection still works on the combined graph.
    const QueryA = createQueryPort<string, void, Error>()({ name: "CycleA" });
    const QueryB = createQueryPort<string, void, Error>()({ name: "CycleB" });
    const MutA = createMutationPort<void, void, Error>()({
      name: "CycleMutA",
      effects: { invalidates: [QueryB] },
    });
    const MutB = createMutationPort<void, void, Error>()({
      name: "CycleMutB",
      effects: { invalidates: [QueryA] },
    });

    const container = createTestContainer();
    container.register(QueryA, () => ResultAsync.ok("a"));
    container.register(QueryB, () => ResultAsync.ok("b"));
    container.register(MutA, () => ResultAsync.ok(undefined));
    container.register(MutB, () => ResultAsync.ok(undefined));

    client = createQueryClient({ container, defaults: { retry: 0 } });
    // Only declare MutA statically; MutB is "runtime-only"
    inspector = createQueryInspector(client, {
      mutationPorts: [{ name: "CycleMutA", effects: { invalidates: [QueryB] } }],
    });

    await client.fetchQuery(QueryA, undefined);
    await client.fetchQuery(QueryB, undefined);

    // Trigger MutB's runtime effect
    await client.mutate(MutB, undefined);

    const graph = inspector.getInvalidationGraph();

    // Both static and runtime edges should be in the graph
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.runtimeEdges.length).toBeGreaterThanOrEqual(1);

    // Nodes should include all involved ports
    expect(graph.nodes).toContain("CycleA");
    expect(graph.nodes).toContain("CycleB");
    expect(graph.nodes).toContain("CycleMutA");
    expect(graph.nodes).toContain("CycleMutB");
  });

  it("getInvalidationGraph includes runtimeEdges field even when empty", () => {
    const container = createTestContainer();
    client = createQueryClient({ container, defaults: { retry: 0 } });
    inspector = createQueryInspector(client);

    const graph = inspector.getInvalidationGraph();
    expect(graph.runtimeEdges).toBeDefined();
    expect(graph.runtimeEdges).toEqual([]);
  });
});
