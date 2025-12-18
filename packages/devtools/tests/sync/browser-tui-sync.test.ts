/**
 * Browser/TUI Synchronization Tests
 *
 * Tests bidirectional state synchronization between browser and TUI clients.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StateBroadcaster } from "../../src/network/state-broadcaster.js";
import { StateReceiver } from "../../src/network/state-receiver.js";
import { ActionSync } from "../../src/network/action-sync.js";
import { ConnectionManager } from "../../src/network/connection-manager.js";
import { initialState } from "../../src/state/devtools.state.js";
import type { SyncStateParams, SyncActionParams } from "@hex-di/devtools-core";
import type { DevToolsAction } from "../../src/state/actions.js";

describe("Browser/TUI Synchronization", () => {
  describe("State Broadcasting", () => {
    it("should broadcast state changes to all connected clients", () => {
      const broadcasts: SyncStateParams[] = [];
      const broadcaster = new StateBroadcaster(
        (params) => broadcasts.push(params),
        { debounceDelayMs: 300, verbose: false }
      );

      const state = {
        ...initialState,
        graph: {
          ...initialState.graph,
          selectedNodeId: "node-1",
        },
      };

      broadcaster.broadcastImmediate(state);

      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0]?.graph?.selectedNodeId).toBe("node-1");
      expect(broadcasts[0]?.priority).toBe("immediate");
    });

    it("should debounce rapid filter changes", async () => {
      const broadcasts: SyncStateParams[] = [];
      const broadcaster = new StateBroadcaster(
        (params) => broadcasts.push(params),
        { debounceDelayMs: 100, verbose: false }
      );

      // Rapid filter changes
      for (let i = 0; i < 5; i++) {
        const state = {
          ...initialState,
          timeline: {
            ...initialState.timeline,
            filterText: `filter-${i}`,
          },
        };
        broadcaster.broadcastDebounced(state);
      }

      // Should not have broadcast yet
      expect(broadcasts).toHaveLength(0);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have broadcast once with the last filter
      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0]?.timeline?.filterText).toBe("filter-4");
    });
  });

  describe("Bidirectional Action Sync", () => {
    it("should send actions to remote clients", () => {
      const sentActions: SyncActionParams[] = [];
      const dispatched: DevToolsAction[] = [];

      const actionSync = new ActionSync(
        (params) => sentActions.push(params),
        (action) => dispatched.push(action),
        { clientId: "tui-1", maxHistorySize: 100, enableReplay: true, verbose: false }
      );

      const action: DevToolsAction = {
        type: "SELECT_NODE",
        payload: "service-1",
      };

      actionSync.sendAction(action);

      expect(sentActions).toHaveLength(1);
      expect(sentActions[0]?.action.type).toBe("SELECT_NODE");
      expect(sentActions[0]?.action.payload).toBe("service-1");
      expect(sentActions[0]?.source).toBe("tui-1");
    });

    it("should receive and apply actions from remote clients", () => {
      const sentActions: SyncActionParams[] = [];
      const dispatched: DevToolsAction[] = [];

      const actionSync = new ActionSync(
        (params) => sentActions.push(params),
        (action) => dispatched.push(action),
        { clientId: "browser-1", maxHistorySize: 100, enableReplay: true, verbose: false }
      );

      const remoteAction: SyncActionParams = {
        action: {
          type: "SELECT_NODE",
          payload: "service-1",
        },
        source: "tui-1",
        timestamp: Date.now(),
      };

      actionSync.receiveAction(remoteAction);

      // Should dispatch the action and store remote action info
      expect(dispatched.length).toBeGreaterThanOrEqual(1);
      expect(dispatched.find((a) => a.type === "SELECT_NODE")).toBeDefined();
    });

    it("should prevent action loops by ignoring self-actions", () => {
      const sentActions: SyncActionParams[] = [];
      const dispatched: DevToolsAction[] = [];

      const actionSync = new ActionSync(
        (params) => sentActions.push(params),
        (action) => dispatched.push(action),
        { clientId: "tui-1", maxHistorySize: 100, enableReplay: true, verbose: false }
      );

      const selfAction: SyncActionParams = {
        action: {
          type: "SELECT_NODE",
          payload: "service-1",
        },
        source: "tui-1", // Same as clientId
        timestamp: Date.now(),
      };

      actionSync.receiveAction(selfAction);

      // Should not dispatch self-actions
      expect(dispatched).toHaveLength(0);
    });
  });

  describe("Selection State Sync", () => {
    it("should immediately broadcast selection changes", () => {
      const broadcasts: SyncStateParams[] = [];
      const broadcaster = new StateBroadcaster(
        (params) => broadcasts.push(params),
        { debounceDelayMs: 300, verbose: false }
      );

      const state = {
        ...initialState,
        graph: {
          ...initialState.graph,
          selectedNodeId: "new-node",
        },
      };

      broadcaster.broadcastSelection(state);

      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0]?.priority).toBe("immediate");
      expect(broadcasts[0]?.graph?.selectedNodeId).toBe("new-node");
    });

    it("should receive and apply selection changes", () => {
      const dispatched: DevToolsAction[] = [];
      const receiver = new StateReceiver(
        (action) => dispatched.push(action),
        { autoApply: true, defaultResolution: "remote-wins", verbose: false }
      );

      const syncParams: SyncStateParams = {
        graph: {
          selectedNodeId: "remote-node",
        },
        timestamp: Date.now(),
        priority: "immediate",
      };

      receiver.receive(syncParams, initialState);

      expect(dispatched.find((a) => a.type === "SELECT_NODE")).toBeDefined();
      expect(
        dispatched.find(
          (a) => a.type === "SELECT_NODE" && "payload" in a && a.payload === "remote-node"
        )
      ).toBeDefined();
    });
  });

  describe("Filter Preference Sync", () => {
    it("should debounce and sync filter changes", async () => {
      const broadcasts: SyncStateParams[] = [];
      const broadcaster = new StateBroadcaster(
        (params) => broadcasts.push(params),
        { debounceDelayMs: 100, verbose: false }
      );

      // Rapid filter changes
      for (let i = 0; i < 5; i++) {
        const state = {
          ...initialState,
          timeline: {
            ...initialState.timeline,
            filterText: `filter-${i}`,
          },
        };
        broadcaster.broadcastFilters(state);
      }

      // Should not have broadcast yet
      expect(broadcasts).toHaveLength(0);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should have broadcast once
      expect(broadcasts).toHaveLength(1);
      expect(broadcasts[0]?.priority).toBe("debounced");
      expect(broadcasts[0]?.timeline?.filterText).toBe("filter-4");
    });
  });

  describe("Connection Management", () => {
    it("should track connection status", () => {
      // Mock WebSocket
      const mockSocket = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1, // OPEN
      };

      const mockFactory = vi.fn(() => mockSocket as any);

      const manager = new ConnectionManager({
        url: "ws://localhost:9229/devtools",
        autoReconnect: true,
        verbose: false,
        webSocketFactory: mockFactory,
      });

      expect(manager.getState()).toBe("disconnected");
      expect(manager.isConnected()).toBe(false);
    });

    it("should handle connection events", () => {
      const events: any[] = [];

      const mockSocket = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        onopen: null as any,
        onclose: null as any,
        onerror: null as any,
        onmessage: null as any,
      };

      const mockFactory = vi.fn(() => {
        // Simulate successful connection
        setTimeout(() => {
          if (mockSocket.onopen) mockSocket.onopen({} as any);
        }, 10);
        return mockSocket as any;
      });

      const manager = new ConnectionManager({
        url: "ws://localhost:9229/devtools",
        autoReconnect: false,
        verbose: false,
        webSocketFactory: mockFactory,
      });

      manager.on((event) => events.push(event));

      // Connect should change state
      manager.connect();

      expect(manager.getState()).toBe("connecting");
    });

    it("should support message sending", () => {
      const mockSocket = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1, // OPEN
        onopen: null as any,
        onclose: null as any,
        onerror: null as any,
        onmessage: null as any,
      };

      const mockFactory = vi.fn(() => {
        setTimeout(() => {
          if (mockSocket.onopen) mockSocket.onopen({} as any);
        }, 10);
        return mockSocket as any;
      });

      const manager = new ConnectionManager({
        url: "ws://localhost:9229/devtools",
        autoReconnect: false,
        verbose: false,
        webSocketFactory: mockFactory,
      });

      // Should not send when disconnected
      expect(manager.send("test")).toBe(false);
    });
  });

  describe("Multi-Client Support", () => {
    it("should support broadcasting to multiple clients", () => {
      const client1Broadcasts: SyncStateParams[] = [];
      const client2Broadcasts: SyncStateParams[] = [];
      const client3Broadcasts: SyncStateParams[] = [];

      const broadcastToAll = (params: SyncStateParams) => {
        client1Broadcasts.push(params);
        client2Broadcasts.push(params);
        client3Broadcasts.push(params);
      };

      const broadcaster = new StateBroadcaster(broadcastToAll, {
        debounceDelayMs: 300,
        verbose: false,
      });

      const state = {
        ...initialState,
        graph: {
          ...initialState.graph,
          selectedNodeId: "multi-client-test",
        },
      };

      broadcaster.broadcastImmediate(state);

      // All clients should receive the broadcast
      expect(client1Broadcasts).toHaveLength(1);
      expect(client2Broadcasts).toHaveLength(1);
      expect(client3Broadcasts).toHaveLength(1);

      expect(client1Broadcasts[0]?.graph?.selectedNodeId).toBe("multi-client-test");
      expect(client2Broadcasts[0]?.graph?.selectedNodeId).toBe("multi-client-test");
      expect(client3Broadcasts[0]?.graph?.selectedNodeId).toBe("multi-client-test");
    });
  });
});
