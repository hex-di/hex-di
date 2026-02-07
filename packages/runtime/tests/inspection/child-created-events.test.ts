/**
 * Tests for child-created event emission.
 *
 * Validates that the runtime emits child-created events when child containers
 * are dynamically created via createChild, createChildAsync, and createLazyChild.
 */

import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../../src/container/factory.js";
import type { InspectorEvent } from "../../src/inspection/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const ServiceA = port<{ value: string }>()({ name: "ServiceA" });
const ServiceB = port<{ value: string }>()({ name: "ServiceB" });
const ServiceC = port<{ value: string }>()({ name: "ServiceC" });

// =============================================================================
// Test 1: Synchronous Child Creation (createChild)
// =============================================================================

describe("child-created events - createChild", () => {
  it("should emit child-created event with childKind='child'", () => {
    // Create root container
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    // Subscribe to child-created events
    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    // Create child container
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    const child = root.createChild(childGraph, { name: "Child1" });

    // Verify event was emitted
    const childCreatedEvents = events.filter(e => e.type === "child-created");
    expect(childCreatedEvents).toHaveLength(1);

    const event = childCreatedEvents[0];
    if (event.type !== "child-created") throw new Error("Wrong event type");

    expect(event.childKind).toBe("child");
    expect(event.childId).toBeDefined();
    expect(typeof event.childId).toBe("string");

    // Verify child inspector is accessible
    expect(child.inspector).toBeDefined();
    expect(child.inspector.getContainerKind()).toBe("child");
  });

  it("should emit events for multiple children", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    const childGraph1 = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B1" }),
        })
      )
      .build();
    const childGraph2 = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceC,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "C1" }),
        })
      )
      .build();

    root.createChild(childGraph1, { name: "Child1" });
    root.createChild(childGraph2, { name: "Child2" });

    const childCreatedEvents = events.filter(e => e.type === "child-created");
    expect(childCreatedEvents).toHaveLength(2);

    // Verify both events have different childIds
    const childIds = childCreatedEvents.map(e => {
      if (e.type !== "child-created") throw new Error("Wrong event type");
      return e.childId;
    });
    expect(new Set(childIds).size).toBe(2);
  });
});

// =============================================================================
// Test 2: Async Child Creation (createChildAsync)
// =============================================================================

describe("child-created events - createChildAsync", () => {
  it("should emit child-created event after async load with childKind='child'", async () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    // Create child async
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    const loadGraph = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return childGraph;
    };

    const child = await root.createChildAsync(loadGraph, { name: "AsyncChild" });

    // Verify event was emitted
    const childCreatedEvents = events.filter(e => e.type === "child-created");
    expect(childCreatedEvents).toHaveLength(1);

    const event = childCreatedEvents[0];
    if (event.type !== "child-created") throw new Error("Wrong event type");

    expect(event.childKind).toBe("child");
    expect(event.childId).toBeDefined();

    // Verify child is fully initialized
    expect(child.isInitialized).toBe(true);
    expect(child.resolve(ServiceB).value).toBe("B");
  });
});

// =============================================================================
// Test 3: Lazy Child Creation (createLazyChild)
// =============================================================================

describe("child-created events - createLazyChild", () => {
  it("should NOT emit event until lazy child is loaded", async () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    // Create lazy child - should not emit event yet
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    const loadGraph = async () => childGraph;

    const lazyChild = root.createLazyChild(loadGraph, { name: "LazyChild" });

    // No event yet
    const beforeLoadEvents = events.filter(e => e.type === "child-created");
    expect(beforeLoadEvents).toHaveLength(0);

    // Load the lazy child
    await lazyChild.load();

    // Now event should be emitted
    const afterLoadEvents = events.filter(e => e.type === "child-created");
    expect(afterLoadEvents).toHaveLength(1);

    const event = afterLoadEvents[0];
    if (event.type !== "child-created") throw new Error("Wrong event type");

    expect(event.childKind).toBe("lazy");
    expect(event.childId).toBeDefined();
  });

  it("should emit child-created event on first resolve of lazy child", async () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B-lazy" }),
        })
      )
      .build();
    const loadGraph = async () => childGraph;

    const lazyChild = root.createLazyChild(loadGraph, { name: "LazyChild" });

    // Trigger lazy load via resolve
    const result = await lazyChild.resolve(ServiceB);
    expect(result.value).toBe("B-lazy");

    // Event should be emitted
    const childCreatedEvents = events.filter(e => e.type === "child-created");
    expect(childCreatedEvents).toHaveLength(1);

    const event = childCreatedEvents[0];
    if (event.type !== "child-created") throw new Error("Wrong event type");

    expect(event.childKind).toBe("lazy");
  });
});

// =============================================================================
// Test 4: Nested Child Creation
// =============================================================================

describe("child-created events - nested children", () => {
  it("should emit events at each level of hierarchy", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    // Track events on root
    const rootEvents: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      rootEvents.push(event);
    });

    // Create child
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    const child = root.createChild(childGraph, { name: "Child" });

    // Track events on child
    const childEvents: InspectorEvent[] = [];
    child.inspector.subscribe(event => {
      childEvents.push(event);
    });

    // Create grandchild
    const grandchildGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceC,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "C" }),
        })
      )
      .build();
    const grandchild = child.createChild(grandchildGraph, { name: "Grandchild" });

    // Root should see child-created for direct child only
    const rootChildCreated = rootEvents.filter(e => e.type === "child-created");
    expect(rootChildCreated).toHaveLength(1);

    // Child should see child-created for grandchild
    const childChildCreated = childEvents.filter(e => e.type === "child-created");
    expect(childChildCreated).toHaveLength(1);

    // Verify grandchild exists
    expect(grandchild.inspector.getContainerKind()).toBe("child");
  });
});

// =============================================================================
// Test 5: Event Metadata
// =============================================================================

describe("child-created events - metadata", () => {
  it("should provide childId and childKind fields", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    root.inspector.subscribe(event => {
      events.push(event);
    });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    root.createChild(childGraph, { name: "Child" });

    const childCreatedEvents = events.filter(e => e.type === "child-created");
    expect(childCreatedEvents).toHaveLength(1);

    const event = childCreatedEvents[0];
    if (event.type !== "child-created") throw new Error("Wrong event type");

    // Verify metadata fields
    expect(event.childId).toBeDefined();
    expect(typeof event.childId).toBe("string");
    expect(event.childKind).toBeDefined();
    expect(["child", "lazy"]).toContain(event.childKind);
  });

  it("should allow accessing child container via getContainer", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    let childInspector: any = null;
    root.inspector.subscribe(event => {
      if (event.type === "child-created") {
        // Get child containers and find the one that matches
        const children = root.inspector.getChildContainers();
        childInspector = children[0];
      }
    });

    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    const child = root.createChild(childGraph, { name: "Child" });

    // Verify inspector was captured
    expect(childInspector).toBeDefined();
    expect(childInspector.getContainer).toBeDefined();

    // Verify getContainer returns the container
    const container = childInspector.getContainer();
    expect(container).toBe(child);
  });
});

// =============================================================================
// Test 6: Multiple Subscribers
// =============================================================================

describe("child-created events - multiple subscribers", () => {
  it("should notify all subscribers of child-created events", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    // Add multiple subscribers
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    root.inspector.subscribe(listener1);
    root.inspector.subscribe(listener2);
    root.inspector.subscribe(listener3);

    // Create child
    const childGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B" }),
        })
      )
      .build();
    root.createChild(childGraph, { name: "Child" });

    // All listeners should be called
    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
    expect(listener3).toHaveBeenCalled();

    // Extract child-created events from each listener
    const listener1ChildCreated = listener1.mock.calls
      .map(call => call[0])
      .filter(e => e.type === "child-created");
    const listener2ChildCreated = listener2.mock.calls
      .map(call => call[0])
      .filter(e => e.type === "child-created");
    const listener3ChildCreated = listener3.mock.calls
      .map(call => call[0])
      .filter(e => e.type === "child-created");

    expect(listener1ChildCreated).toHaveLength(1);
    expect(listener2ChildCreated).toHaveLength(1);
    expect(listener3ChildCreated).toHaveLength(1);
  });
});

// =============================================================================
// Test 7: Unsubscribe
// =============================================================================

describe("child-created events - unsubscribe", () => {
  it("should not receive events after unsubscribe", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    const events: InspectorEvent[] = [];
    const unsubscribe = root.inspector.subscribe(event => {
      events.push(event);
    });

    // Create first child - should receive event
    const childGraph1 = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceB,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "B1" }),
        })
      )
      .build();
    root.createChild(childGraph1, { name: "Child1" });

    expect(events.filter(e => e.type === "child-created")).toHaveLength(1);

    // Unsubscribe
    unsubscribe();

    // Create second child - should NOT receive event
    const childGraph2 = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceC,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "C1" }),
        })
      )
      .build();
    root.createChild(childGraph2, { name: "Child2" });

    // Still only 1 event (from before unsubscribe)
    expect(events.filter(e => e.type === "child-created")).toHaveLength(1);
  });
});
