/**
 * MCP Resource Contract Tests
 *
 * Tests that createStoreMcpResourceHandler maps operations to inspector methods
 * and returns the correct data types.
 */

import { describe, it, expect } from "vitest";
import { createStoreMcpResourceHandler } from "../../src/integration/mcp-resources.js";
import { createStoreInspectorImpl } from "../../src/inspection/store-inspector-impl.js";
import type { PortRegistryEntry } from "../../src/types/inspection.js";
import { __stateAdapterBrand } from "../../src/adapters/brands.js";

// =============================================================================
// Helpers
// =============================================================================

function makePortEntry(portName: string): PortRegistryEntry {
  return {
    portName,
    adapter: { [__stateAdapterBrand]: true },
    lifetime: "singleton",
    requires: [],
    writesTo: [],
    getSnapshot: () => ({
      kind: "state",
      portName,
      state: { count: 0 },
      subscriberCount: 0,
      actionCount: 0,
      lastActionAt: null,
    }),
    getSubscriberCount: () => 0,
    getHasEffects: () => false,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("MCP Resource Contract", () => {
  it("handler has the correct supported URIs", () => {
    const inspector = createStoreInspectorImpl();
    const handler = createStoreMcpResourceHandler(inspector);

    expect(handler.supportedUris).toEqual([
      "hexdi://store/snapshot",
      "hexdi://store/ports",
      "hexdi://store/graph",
      "hexdi://store/history",
    ]);
  });

  it("resolveSnapshot returns a StoreSnapshot", () => {
    const inspector = createStoreInspectorImpl();
    const handler = createStoreMcpResourceHandler(inspector);

    const snapshot = handler.resolveSnapshot();
    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("ports");
    expect(snapshot).toHaveProperty("totalSubscribers");
    expect(snapshot).toHaveProperty("pendingEffects");
    expect(snapshot.ports).toEqual([]);
  });

  it("resolvePorts returns registered port info", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));

    const handler = createStoreMcpResourceHandler(inspector);
    const ports = handler.resolvePorts();

    expect(ports).toHaveLength(1);
    expect(ports[0]?.portName).toBe("Counter");
    expect(ports[0]?.kind).toBe("state");
  });

  it("resolveGraph returns a SubscriberGraph", () => {
    const inspector = createStoreInspectorImpl();
    inspector.registerPort(makePortEntry("Counter"));

    const handler = createStoreMcpResourceHandler(inspector);
    const graph = handler.resolveGraph();

    expect(graph).toHaveProperty("correlationId");
    expect(graph).toHaveProperty("nodes");
    expect(graph).toHaveProperty("edges");
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.id).toBe("Counter");
  });

  it("resolveHistory returns action history entries", () => {
    const inspector = createStoreInspectorImpl();
    inspector.recordAction({
      id: "action-1",
      portName: "Counter",
      actionName: "increment",
      payload: undefined,
      prevState: { count: 0 },
      nextState: { count: 1 },
      timestamp: Date.now(),
      effectStatus: "none",
      parentId: null,
      order: 1,
    });

    const handler = createStoreMcpResourceHandler(inspector);
    const history = handler.resolveHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.portName).toBe("Counter");
    expect(history[0]?.actionName).toBe("increment");
  });

  it("resolveHistory respects filter params", () => {
    const inspector = createStoreInspectorImpl();
    inspector.recordAction({
      id: "action-1",
      portName: "Counter",
      actionName: "increment",
      payload: undefined,
      prevState: { count: 0 },
      nextState: { count: 1 },
      timestamp: Date.now(),
      effectStatus: "none",
      parentId: null,
      order: 1,
    });
    inspector.recordAction({
      id: "action-2",
      portName: "Theme",
      actionName: "toggle",
      payload: undefined,
      prevState: "light",
      nextState: "dark",
      timestamp: Date.now(),
      effectStatus: "none",
      parentId: null,
      order: 2,
    });

    const handler = createStoreMcpResourceHandler(inspector);
    const filtered = handler.resolveHistory({ portName: "Counter" });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.portName).toBe("Counter");
  });
});
