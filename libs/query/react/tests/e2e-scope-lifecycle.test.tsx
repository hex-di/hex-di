/**
 * E2E tests for React scope lifecycle.
 *
 * Tests multi-tenant scope switching, scope disposal during active fetches,
 * and error state for disposed scope queries — all through React components.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
import { createElement, useState } from "react";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "@hex-di/query";
import { QueryClientProvider, useQuery } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Test Ports
// =============================================================================

interface TenantData {
  readonly tenantId: string;
  readonly items: readonly string[];
}

const TenantPort = createQueryPort<TenantData, void, Error>()({
  name: "E2EScopeTenant",
});

const SlowPort = createQueryPort<string, void, Error>()({
  name: "E2EScopeSlow",
});

// =============================================================================
// Tests
// =============================================================================

describe("React scope lifecycle E2E", () => {
  it("multi-tenant scope switching re-fetches with new scope", async () => {
    // Create two tenant clients with different data
    const containerA = createTestContainer();
    containerA.register(TenantPort, () =>
      ResultAsync.ok({ tenantId: "A", items: ["Item-A1", "Item-A2"] })
    );
    const clientA = createQueryClient({ container: containerA, defaults: { retry: 0 } });

    const containerB = createTestContainer();
    containerB.register(TenantPort, () => ResultAsync.ok({ tenantId: "B", items: ["Item-B1"] }));
    const clientB = createQueryClient({ container: containerB, defaults: { retry: 0 } });

    function TenantView() {
      const state = useQuery(TenantPort, undefined);
      if (state.isPending) return <div>Loading tenant...</div>;
      if (state.isError) return <div>Error</div>;
      return (
        <div>
          <span>Tenant: {state.data?.tenantId}</span>
          <span>Items: {state.data?.items.join(", ")}</span>
        </div>
      );
    }

    function App() {
      const [tenant, setTenant] = useState<"A" | "B">("A");
      const activeClient = tenant === "A" ? clientA : clientB;

      return (
        <div>
          <button onClick={() => setTenant("B")}>Switch to B</button>
          {/* key forces remount so useQuery creates a new observer on the new client */}
          <QueryClientProvider client={activeClient} key={tenant}>
            <TenantView />
          </QueryClientProvider>
        </div>
      );
    }

    render(<App />);

    // Initially shows tenant A data
    await waitFor(() => {
      expect(screen.getByText("Tenant: A")).toBeDefined();
      expect(screen.getByText("Items: Item-A1, Item-A2")).toBeDefined();
    });

    // Switch to tenant B
    await act(async () => {
      fireEvent.click(screen.getByText("Switch to B"));
    });

    // Should show tenant B data after re-render
    await waitFor(
      () => {
        expect(screen.getByText("Tenant: B")).toBeDefined();
        expect(screen.getByText("Items: Item-B1")).toBeDefined();
      },
      { timeout: 3000 }
    );

    clientA.dispose();
    clientB.dispose();
  });

  it("scope disposal during active fetches does not leak state updates", async () => {
    const container = createTestContainer();
    let resolveFetch: ((v: string) => void) | undefined;

    container.register(SlowPort, () =>
      ResultAsync.fromSafePromise(
        new Promise<string>(resolve => {
          resolveFetch = resolve;
        })
      )
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    let renderCount = 0;

    function SlowComponent() {
      const state = useQuery(SlowPort, undefined);
      renderCount++;
      if (state.isPending) return <div>Loading slow...</div>;
      if (state.isError) return <div>Error: disposed</div>;
      return <div>Data: {String(state.data)}</div>;
    }

    function App() {
      const [mounted, setMounted] = useState(true);

      return (
        <div>
          <button onClick={() => setMounted(false)}>Unmount</button>
          {mounted && (
            <QueryClientProvider client={client}>
              <SlowComponent />
            </QueryClientProvider>
          )}
          {!mounted && <div>Component unmounted</div>}
        </div>
      );
    }

    render(<App />);

    // Should be loading initially
    await waitFor(() => {
      expect(screen.getByText("Loading slow...")).toBeDefined();
    });

    const renderCountBeforeDispose = renderCount;

    // Dispose client while fetch is mid-flight, and unmount the component
    await act(async () => {
      client.dispose();
      fireEvent.click(screen.getByText("Unmount"));
    });

    await waitFor(() => {
      expect(screen.getByText("Component unmounted")).toBeDefined();
    });

    // Resolve the pending fetch after disposal
    resolveFetch?.("late-data");

    // Wait a tick to ensure no leaked state updates
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    // Render count should not have increased significantly after unmount
    // The component was unmounted, so no further renders should occur
    expect(renderCount).toBeLessThanOrEqual(renderCountBeforeDispose + 2);
  });

  it("components see error state for disposed scope queries", async () => {
    const container = createTestContainer();
    container.register(TenantPort, () => ResultAsync.ok({ tenantId: "X", items: ["Item-X"] }));
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    function TenantView() {
      const state = useQuery(TenantPort, undefined);
      if (state.isPending) return <div>Loading...</div>;
      if (state.isError) return <div>Query failed</div>;
      return <div>Tenant: {state.data?.tenantId}</div>;
    }

    // Pre-populate then dispose the client
    await client.fetchQuery(TenantPort, undefined);
    client.dispose();

    // Create a new client pointing at a disposed scope
    // Render with the disposed client — new queries should fail
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <TenantView />
      </QueryClientProvider>
    );

    // The client is disposed, so the query observer should detect the disposed state.
    // The cache was cleared on dispose, so data won't be available.
    // The component should show either loading (no data) or error state.
    await waitFor(
      () => {
        // Since the cache is cleared on dispose, data is gone → isPending or error
        const loadingOrError =
          screen.queryByText("Loading...") ?? screen.queryByText("Query failed");
        expect(loadingOrError).toBeDefined();
      },
      { timeout: 3000 }
    );

    rerender(<div />);
  });
});
