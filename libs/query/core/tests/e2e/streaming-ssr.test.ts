/**
 * E2E tests for streaming SSR dehydrate/hydrate patterns.
 *
 * Tests progressive hydration semantics: the cache can be dehydrated
 * multiple times as queries resolve incrementally (simulating streaming),
 * and each hydration pass on the client fills in missing entries without
 * overwriting already-hydrated data.
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createQueryClient,
  dehydrate,
  hydrate,
  type QueryClient,
  type DehydratedState,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports (simulating queries that resolve at different times)
// =============================================================================

const ShellDataPort = createQueryPort<{ title: string }, void, Error>()({
  name: "shell-data",
});

const SuspenseBlockAPort = createQueryPort<string[], void, Error>()({
  name: "suspense-block-a",
});

const SuspenseBlockBPort = createQueryPort<{ count: number }, void, Error>()({
  name: "suspense-block-b",
});

// =============================================================================
// Tests
// =============================================================================

describe("streaming SSR", () => {
  let serverClient: QueryClient;
  let clientClient: QueryClient;

  afterEach(() => {
    serverClient?.dispose();
    clientClient?.dispose();
  });

  it("shell renders immediately — early dehydration captures fast queries", async () => {
    const serverContainer = createTestContainer();
    // Shell data resolves immediately
    serverContainer.register(ShellDataPort, () => ResultAsync.ok({ title: "My App" }));
    // Suspense blocks not yet registered — simulates slower data
    serverClient = createQueryClient({ container: serverContainer });

    // Fetch shell data (fast)
    await serverClient.prefetchQuery(ShellDataPort, undefined);

    // Dehydrate at "shell send" time — only shell data available
    const shellState = dehydrate(serverClient);
    expect(shellState.queries).toHaveLength(1);
    expect(shellState.queries[0].cacheKey[0]).toBe("shell-data");

    // Client hydrates shell immediately
    const clientContainer = createTestContainer();
    clientClient = createQueryClient({ container: clientContainer });
    hydrate(clientClient, shellState);

    // Shell data available on client without fetch
    const shellData = clientClient.getQueryData(ShellDataPort, undefined);
    expect(shellData).toEqual({ title: "My App" });
  });

  it("Suspense boundaries resolve during streaming — incremental hydration", async () => {
    const serverContainer = createTestContainer();
    serverContainer.register(ShellDataPort, () => ResultAsync.ok({ title: "My App" }));
    serverContainer.register(SuspenseBlockAPort, () => ResultAsync.ok(["item-1", "item-2"]));
    serverContainer.register(SuspenseBlockBPort, () => ResultAsync.ok({ count: 42 }));
    serverClient = createQueryClient({ container: serverContainer });

    // Phase 1: Shell resolves
    await serverClient.prefetchQuery(ShellDataPort, undefined);
    const phase1 = dehydrate(serverClient);

    // Phase 2: Suspense block A resolves
    await serverClient.prefetchQuery(SuspenseBlockAPort, undefined);
    const phase2 = dehydrate(serverClient);
    expect(phase2.queries).toHaveLength(2);

    // Phase 3: Suspense block B resolves
    await serverClient.prefetchQuery(SuspenseBlockBPort, undefined);
    const phase3 = dehydrate(serverClient);
    expect(phase3.queries).toHaveLength(3);

    // Client receives phase 1, then phase 2, then phase 3
    const clientContainer = createTestContainer();
    clientClient = createQueryClient({ container: clientContainer });

    hydrate(clientClient, phase1);
    expect(clientClient.cache.getAll().size).toBe(1);

    hydrate(clientClient, phase2);
    expect(clientClient.cache.getAll().size).toBe(2);

    hydrate(clientClient, phase3);
    expect(clientClient.cache.getAll().size).toBe(3);

    // All data available
    expect(clientClient.getQueryData(ShellDataPort, undefined)).toEqual({ title: "My App" });
    expect(clientClient.getQueryData(SuspenseBlockAPort, undefined)).toEqual(["item-1", "item-2"]);
    expect(clientClient.getQueryData(SuspenseBlockBPort, undefined)).toEqual({ count: 42 });
  });

  it("dehydrated state at stream end captures all queries — JSON round-trip safe", async () => {
    const serverContainer = createTestContainer();
    serverContainer.register(ShellDataPort, () => ResultAsync.ok({ title: "My App" }));
    serverContainer.register(SuspenseBlockAPort, () =>
      ResultAsync.ok(["item-1", "item-2", "item-3"])
    );
    serverContainer.register(SuspenseBlockBPort, () => ResultAsync.ok({ count: 99 }));
    serverClient = createQueryClient({ container: serverContainer });

    // Fetch all queries (simulating all Suspense boundaries resolved by stream end)
    await serverClient.prefetchQuery(ShellDataPort, undefined);
    await serverClient.prefetchQuery(SuspenseBlockAPort, undefined);
    await serverClient.prefetchQuery(SuspenseBlockBPort, undefined);

    // Final dehydration at stream end
    const finalState = dehydrate(serverClient);
    expect(finalState.queries).toHaveLength(3);

    // Simulate JSON serialization (appended as script tag at stream end)
    const json = JSON.stringify(finalState);
    const parsed = JSON.parse(json) as DehydratedState;

    // Verify JSON round-trip preserves all data
    expect(parsed.version).toBe(3);
    expect(parsed.queries).toHaveLength(3);

    const portNames = parsed.queries.map(q => q.cacheKey[0]).sort();
    expect(portNames).toEqual(["shell-data", "suspense-block-a", "suspense-block-b"]);

    // Hydrate on client from the final state
    const clientContainer = createTestContainer();
    clientClient = createQueryClient({ container: clientContainer });
    hydrate(clientClient, parsed);

    // All three queries available without fetching
    expect(clientClient.getQueryData(ShellDataPort, undefined)).toEqual({ title: "My App" });
    expect(clientClient.getQueryData(SuspenseBlockAPort, undefined)).toEqual([
      "item-1",
      "item-2",
      "item-3",
    ]);
    expect(clientClient.getQueryData(SuspenseBlockBPort, undefined)).toEqual({ count: 99 });
  });
});
