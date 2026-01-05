/**
 * Child Container Discovery Fix Tests (Task Group 7)
 *
 * These tests verify that the wrapper accumulation bug fix from Task Group 1
 * correctly enables child container discovery in DevTools.
 *
 * The original bug: DevTools only showed "App Root (root)" but child containers
 * (Chat Dashboard, grandchildren) were missing.
 *
 * The fix: Modified `trackAppliedWrapper()` to inherit wrappers from input
 * container when using `pipe()`, ensuring all wrappers are accumulated.
 *
 * These tests verify:
 * 1. getChildContainers() returns all children in multi-level hierarchy
 * 2. Children created from `pipe(withTracing, withInspector)` parents are discoverable
 * 3. Container tree matches the actual container hierarchy
 * 4. Grandchildren are properly discovered through recursive traversal
 * 5. Graph data is accessible for all discovered containers
 * 6. Container hierarchy works with the react-showcase pattern
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import {
  createContainer,
  pipe,
  createPluginWrapper,
  TracingPlugin,
  InspectorPlugin,
  INSPECTOR,
  getAppliedWrappers,
  type InspectorWithSubscription,
} from "@hex-di/runtime";
import { createDevToolsFlowRuntime } from "../src/runtime/devtools-flow-runtime.js";

// =============================================================================
// Test Fixtures (Mirrors react-showcase structure)
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Config {
  readonly apiUrl: string;
}

interface MessageStore {
  getMessages(): readonly string[];
  addMessage(message: string): void;
}

interface ChatService {
  sendMessage(content: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");
const MessageStorePort = createPort<"MessageStore", MessageStore>("MessageStore");
const ChatServicePort = createPort<"ChatService", ChatService>("ChatService");

/**
 * Creates a root graph matching react-showcase's rootGraph pattern.
 * Contains shared infrastructure: Logger, Config
 */
function createRootGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: vi.fn() }),
  });

  const ConfigAdapter = createAdapter({
    provides: ConfigPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ apiUrl: "https://api.example.com" }),
  });

  return GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter).build();
}

/**
 * Creates a chat graph fragment matching react-showcase's chatGraphFragment pattern.
 * Contains chat-specific services: MessageStore, ChatService
 */
function createChatGraphFragment() {
  const MessageStoreAdapter = createAdapter({
    provides: MessageStorePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => {
      const messages: string[] = [];
      return {
        getMessages: () => Object.freeze([...messages]),
        addMessage: (msg: string) => messages.push(msg),
      };
    },
  });

  const ChatServiceAdapter = createAdapter({
    provides: ChatServicePort,
    requires: [LoggerPort, MessageStorePort],
    lifetime: "scoped",
    factory: deps => ({
      sendMessage: (content: string) => deps.MessageStore.addMessage(content),
    }),
  });

  return GraphBuilder.create()
    .provide(MessageStoreAdapter)
    .provide(ChatServiceAdapter)
    .buildFragment();
}

/**
 * Creates a child graph fragment for grandchild containers.
 */
function createGrandchildGraph() {
  return GraphBuilder.create().buildFragment();
}

// Plugin wrappers (matching react-showcase pattern)
const withTracing = createPluginWrapper(TracingPlugin);
const withInspector = createPluginWrapper(InspectorPlugin);

// =============================================================================
// Child Container Discovery Tests
// =============================================================================

describe("Child Container Discovery Fix (Task Group 7)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getChildContainers() returns all children in multi-level hierarchy", () => {
    it("root container with pipe(withTracing, withInspector) has both wrappers tracked", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Verify wrapper accumulation
      const appliedWrappers = getAppliedWrappers(rootContainer);
      expect(appliedWrappers.length).toBe(2);
      expect(appliedWrappers[0].plugin.name).toBe("tracing");
      expect(appliedWrappers[1].plugin.name).toBe("inspector");

      // Verify INSPECTOR symbol is present
      expect(INSPECTOR in rootContainer).toBe(true);
      const inspector = rootContainer[INSPECTOR];
      expect(typeof inspector.getChildContainers).toBe("function");
    });

    it("child containers created via createChild inherit all wrappers and are discoverable", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Create child container (matches react-showcase pattern)
      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      // Verify child has INSPECTOR
      expect(INSPECTOR in chatContainer).toBe(true);

      // Verify parent can discover child
      const parentInspector = rootContainer[INSPECTOR];
      const children = parentInspector.getChildContainers();
      expect(children.length).toBe(1);

      // Verify child's identity
      const childSnapshot = children[0].getSnapshot();
      expect(childSnapshot.containerName).toBe("Chat Dashboard");
      expect(childSnapshot.kind).toBe("child");
    });

    it("grandchildren are discoverable through recursive traversal", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Create chat container (child of root)
      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      // Create grandchildren (children of chat container)
      const grandchildGraph = createGrandchildGraph();
      chatContainer.createChild(grandchildGraph, { name: "Shared Child" });
      chatContainer.createChild(grandchildGraph, { name: "Forked Child" });
      chatContainer.createChild(grandchildGraph, { name: "Isolated Child" });

      // Verify grandchildren are discoverable from chat container
      const chatInspector = (
        chatContainer as unknown as { [INSPECTOR]: InspectorWithSubscription }
      )[INSPECTOR];
      const grandchildren = chatInspector.getChildContainers();
      expect(grandchildren.length).toBe(3);

      // Verify grandchild identities
      const grandchildNames = grandchildren.map(g => g.getSnapshot().containerName);
      expect(grandchildNames).toContain("Shared Child");
      expect(grandchildNames).toContain("Forked Child");
      expect(grandchildNames).toContain("Isolated Child");
    });
  });

  describe("complete container hierarchy discovery", () => {
    it("full hierarchy (root -> child -> grandchildren) is discoverable from root", () => {
      // This test mirrors the react-showcase App.tsx hierarchy:
      // AppRootContainer (Logger, Config)
      // +-- ChatContainer (MessageStore, ChatService)
      //     +-- SharedChild
      //     +-- ForkedChild
      //     +-- IsolatedChild

      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Create chat container
      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      // Create grandchildren
      const grandchildGraph = createGrandchildGraph();
      chatContainer.createChild(grandchildGraph, { name: "Shared Child" });
      chatContainer.createChild(grandchildGraph, { name: "Forked Child" });
      chatContainer.createChild(grandchildGraph, { name: "Isolated Child" });

      // Walk the entire tree from root
      const allContainers: string[] = [];
      function walkContainers(inspector: InspectorWithSubscription): void {
        allContainers.push(inspector.getSnapshot().containerName);
        for (const child of inspector.getChildContainers()) {
          walkContainers(child);
        }
      }

      const rootInspector = rootContainer[INSPECTOR];
      walkContainers(rootInspector);

      // Verify all 5 containers are discoverable
      expect(allContainers.length).toBe(5);
      expect(allContainers).toContain("App Root");
      expect(allContainers).toContain("Chat Dashboard");
      expect(allContainers).toContain("Shared Child");
      expect(allContainers).toContain("Forked Child");
      expect(allContainers).toContain("Isolated Child");
    });

    it("DevToolsFlowRuntime discovers all containers in hierarchy", async () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Create chat container with grandchildren
      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      const grandchildGraph = createGrandchildGraph();
      chatContainer.createChild(grandchildGraph, { name: "Grandchild 1" });
      chatContainer.createChild(grandchildGraph, { name: "Grandchild 2" });

      // Create DevTools runtime with root inspector
      const rootInspector = rootContainer[INSPECTOR];
      const runtime = createDevToolsFlowRuntime({ inspector: rootInspector });

      expect(runtime).toBeDefined();
      expect(runtime.getRootInspector()).toBe(rootInspector);

      // Verify runtime can discover child containers through root inspector
      const children = rootInspector.getChildContainers();
      expect(children.length).toBe(1);
      expect(children[0].getSnapshot().containerName).toBe("Chat Dashboard");

      // Verify grandchildren are also discoverable
      const grandchildren = children[0].getChildContainers();
      expect(grandchildren.length).toBe(2);

      await runtime.dispose();
    });
  });

  describe("graph data available for all discovered containers", () => {
    it("getGraphData() returns correct data for each container in hierarchy", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      // Root graph data
      const rootInspector = rootContainer[INSPECTOR];
      const rootGraphData = rootInspector.getGraphData();
      expect(rootGraphData.containerName).toBe("App Root");
      expect(rootGraphData.kind).toBe("root");
      expect(rootGraphData.parentName).toBeNull();
      expect(rootGraphData.adapters.length).toBe(2); // Logger, Config

      // Chat container graph data
      const chatInspector = (
        chatContainer as unknown as { [INSPECTOR]: InspectorWithSubscription }
      )[INSPECTOR];
      const chatGraphData = chatInspector.getGraphData();
      expect(chatGraphData.containerName).toBe("Chat Dashboard");
      expect(chatGraphData.kind).toBe("child");
      // Note: parentName is null for child containers because parentState is
      // intentionally not included in internal state to avoid circular references.
      // Parent-child relationships are discovered via getChildContainers() instead.
      expect(chatGraphData.parentName).toBeNull();

      // Child containers expose only their LOCAL adapters (overrides/extensions),
      // not inherited adapters. This avoids circular parent access.
      // Inherited adapters are visible in the parent's graph data.
      expect(chatGraphData.adapters.length).toBeGreaterThan(0);

      // Verify chat-specific adapters are present with origin "own"
      const messageStoreAdapter = chatGraphData.adapters.find(a => a.portName === "MessageStore");
      expect(messageStoreAdapter).toBeDefined();
      expect(messageStoreAdapter?.origin).toBe("own");

      const chatServiceAdapter = chatGraphData.adapters.find(a => a.portName === "ChatService");
      expect(chatServiceAdapter).toBeDefined();
      expect(chatServiceAdapter?.origin).toBe("own");

      // Logger is NOT in chat's adapters - it's inherited from parent
      // but child containers only expose local adapters in getGraphData()
      const loggerAdapter = chatGraphData.adapters.find(a => a.portName === "Logger");
      expect(loggerAdapter).toBeUndefined();
    });

    it("container graph visualization works with full hierarchy via getChildContainers()", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Build multi-level hierarchy
      const chatGraph = createChatGraphFragment();
      const chatContainer = rootContainer.createChild(chatGraph, { name: "Chat Dashboard" });

      const grandchildGraph = createGrandchildGraph();
      chatContainer.createChild(grandchildGraph, { name: "Plugin Container" });

      // Collect graph data from all containers via getChildContainers()
      // The parent-child relationship is expressed through the traversal order,
      // not via parentName (which is null for child containers)
      const graphDataCollection: Array<{
        name: string;
        kind: string;
        adapterCount: number;
        discoveredFrom: string | null;
      }> = [];

      function collectGraphData(inspector: InspectorWithSubscription, parent: string | null): void {
        const data = inspector.getGraphData();
        graphDataCollection.push({
          name: data.containerName,
          kind: data.kind,
          adapterCount: data.adapters.length,
          discoveredFrom: parent,
        });
        for (const child of inspector.getChildContainers()) {
          collectGraphData(child, data.containerName);
        }
      }

      const rootInspector = rootContainer[INSPECTOR];
      collectGraphData(rootInspector, null);

      // Verify graph data collection
      expect(graphDataCollection.length).toBe(3);

      const rootData = graphDataCollection.find(g => g.name === "App Root");
      expect(rootData?.kind).toBe("root");
      expect(rootData?.discoveredFrom).toBeNull();

      const chatData = graphDataCollection.find(g => g.name === "Chat Dashboard");
      expect(chatData?.kind).toBe("child");
      // Parent is discovered via traversal, not via parentName property
      expect(chatData?.discoveredFrom).toBe("App Root");

      const pluginData = graphDataCollection.find(g => g.name === "Plugin Container");
      expect(pluginData?.kind).toBe("child");
      expect(pluginData?.discoveredFrom).toBe("Chat Dashboard");
    });
  });

  describe("edge cases and robustness", () => {
    it("disposed child containers are not returned by getChildContainers()", async () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      // Create children
      const childGraph = GraphBuilder.create().buildFragment();
      const child1 = rootContainer.createChild(childGraph, { name: "Child 1" });
      rootContainer.createChild(childGraph, { name: "Child 2" });

      // Initially both children should be discoverable
      const rootInspector = rootContainer[INSPECTOR];
      let children = rootInspector.getChildContainers();
      expect(children.length).toBe(2);

      // Dispose child1
      await child1.dispose();

      // After disposal, only child2 should be discoverable
      children = rootInspector.getChildContainers();
      expect(children.length).toBe(1);
      expect(children[0].getSnapshot().containerName).toBe("Child 2");
    });

    it("empty container hierarchy (root only) returns empty children array", () => {
      const rootGraph = createRootGraph();
      const rootContainer = pipe(
        createContainer(rootGraph, { name: "App Root" }),
        withTracing,
        withInspector
      );

      const rootInspector = rootContainer[INSPECTOR];
      const children = rootInspector.getChildContainers();
      expect(children).toEqual([]);
    });
  });
});
