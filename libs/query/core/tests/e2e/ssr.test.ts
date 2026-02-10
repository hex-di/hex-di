/**
 * E2E tests for SSR dehydrate/hydrate workflow.
 *
 * Tests the full server-side rendering lifecycle: populate cache on server,
 * dehydrate to serializable state, hydrate on client.
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
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const SettingsPort = createQueryPort<{ theme: string; locale: string }, void, Error>()({
  name: "settings",
});

// =============================================================================
// Tests
// =============================================================================

describe("SSR dehydrate/hydrate", () => {
  let serverClient: QueryClient;
  let clientClient: QueryClient;

  afterEach(() => {
    serverClient?.dispose();
    clientClient?.dispose();
  });

  it("should dehydrate server cache and hydrate on client", async () => {
    // === Server-side ===
    const serverContainer = createTestContainer();
    serverContainer.register(UsersPort, () => ResultAsync.ok(["Alice", "Bob", "Charlie"]));
    serverContainer.register(SettingsPort, () =>
      ResultAsync.ok({ theme: "dark", locale: "en-US" })
    );
    serverClient = createQueryClient({ container: serverContainer });

    // Prefetch on server
    await serverClient.prefetchQuery(UsersPort, undefined);
    await serverClient.prefetchQuery(SettingsPort, undefined);

    // Dehydrate
    const dehydratedState = dehydrate(serverClient);

    // Verify dehydrated state structure
    expect(dehydratedState.version).toBe(3);
    expect(dehydratedState.queries).toHaveLength(2);

    // Verify it's serializable (JSON round-trip)
    const json = JSON.stringify(dehydratedState);
    const parsed = JSON.parse(json) as DehydratedState;
    expect(parsed.version).toBe(3);
    expect(parsed.queries).toHaveLength(2);

    // === Client-side ===
    const clientContainer = createTestContainer();
    clientClient = createQueryClient({ container: clientContainer });

    // Hydrate from dehydrated state
    hydrate(clientClient, parsed);

    // Client should have the data without needing to fetch
    const allEntries = clientClient.cache.getAll();
    expect(allEntries.size).toBe(2);
  });

  it("should include both success and error entries in dehydrated state", async () => {
    const serverContainer = createTestContainer();
    serverContainer.register(UsersPort, () => ResultAsync.ok(["Alice"]));
    serverContainer.register(SettingsPort, () =>
      ResultAsync.err(new Error("Settings unavailable"))
    );
    serverClient = createQueryClient({ container: serverContainer, defaults: { retry: 0 } });

    await serverClient.prefetchQuery(UsersPort, undefined);
    await serverClient.prefetchQuery(SettingsPort, undefined);

    const dehydratedState = dehydrate(serverClient);

    // Both success and error entries should be included
    expect(dehydratedState.queries).toHaveLength(2);
    const portNames = dehydratedState.queries.map(q => q.cacheKey[0]).sort();
    expect(portNames).toEqual(["settings", "users"]);

    // Verify result tags
    const usersQuery = dehydratedState.queries.find(q => q.cacheKey[0] === "users");
    expect(usersQuery?.result._tag).toBe("Ok");

    const settingsQuery = dehydratedState.queries.find(q => q.cacheKey[0] === "settings");
    expect(settingsQuery?.result._tag).toBe("Err");
  });

  it("should have version field for cache busting", () => {
    const container = createTestContainer();
    serverClient = createQueryClient({ container });
    const state = dehydrate(serverClient);
    expect(state.version).toBe(3);
  });

  it("should dispose scope and clean up cache after SSR render completes", async () => {
    // Simulate SSR: create a scope, run queries, then dispose scope
    const serverContainer = createTestContainer();
    serverContainer.register(UsersPort, () => ResultAsync.ok(["Alice", "Bob"]));
    serverContainer.register(SettingsPort, () =>
      ResultAsync.ok({ theme: "dark", locale: "en-US" })
    );
    serverClient = createQueryClient({ container: serverContainer });

    // Create a child scope for this SSR render
    const ssrScope = serverClient.createChild();

    // Prefetch within the scope
    await ssrScope.prefetchQuery(UsersPort, undefined);
    await ssrScope.prefetchQuery(SettingsPort, undefined);

    // Verify data is present
    expect(ssrScope.cache.size).toBe(2);
    expect(ssrScope.getQueryData(UsersPort, undefined)).toEqual(["Alice", "Bob"]);

    // Dehydrate before disposal
    const dehydratedState = dehydrate(ssrScope);
    expect(dehydratedState.queries).toHaveLength(2);

    // Dispose the SSR scope — cache entries should be cleaned up
    ssrScope.dispose();

    expect(ssrScope.isDisposed).toBe(true);
    expect(ssrScope.cache.size).toBe(0);

    // Fetching after dispose should fail with QueryDisposed
    const result = await ssrScope.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }

    // Parent client should be unaffected
    expect(serverClient.isDisposed).toBe(false);
  });

  it("should not overwrite existing client data during hydration", async () => {
    // Server has old data
    const serverContainer = createTestContainer();
    serverContainer.register(UsersPort, () => ResultAsync.ok(["Server-Alice"]));
    serverClient = createQueryClient({ container: serverContainer });
    await serverClient.prefetchQuery(UsersPort, undefined);
    const dehydratedState = dehydrate(serverClient);

    // Client already has fresher data
    const clientContainer = createTestContainer();
    clientClient = createQueryClient({ container: clientContainer });
    clientClient.setQueryData(UsersPort, undefined, ["Client-Bob"]);

    // Hydrate should not overwrite existing data
    hydrate(clientClient, dehydratedState);

    // Client data should be preserved
    const clientData = clientClient.getQueryData(UsersPort, undefined);
    expect(clientData).toEqual(["Client-Bob"]);
  });
});
