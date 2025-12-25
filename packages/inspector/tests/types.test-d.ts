/**
 * Type tests for @hex-di/inspector.
 *
 * These tests verify:
 * 1. ContainerSnapshot discriminated union narrowing
 * 2. Type guard type narrowing (hasInspector, ContainerWithInspector)
 * 3. InspectorAPI type safety
 * 4. InspectorEvent type safety
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, type Container, type ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import {
  createInspectorPlugin,
  INSPECTOR,
  hasInspector,
  getInspectorAPI,
  type InspectorAPI,
  type InspectorEvent,
  type ContainerWithInspector,
  type ContainerSnapshot,
  type ContainerKind,
  type ContainerPhase as TypedPhase,
  type ScopeTree,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const graph = GraphBuilder.create().provide(LoggerAdapter).build();

// =============================================================================
// ContainerSnapshot Discriminated Union Tests
// =============================================================================

describe("ContainerSnapshot discriminated union", () => {
  it("narrows to RootContainerSnapshot when kind is 'root'", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const snapshot = container[INSPECTOR].getSnapshot();

    if (snapshot.kind === "root") {
      // These properties are only available on RootContainerSnapshot
      expectTypeOf(snapshot.isInitialized).toEqualTypeOf<boolean>();
      expectTypeOf(snapshot.asyncAdaptersTotal).toEqualTypeOf<number>();
      expectTypeOf(snapshot.asyncAdaptersInitialized).toEqualTypeOf<number>();
    }
  });

  it("narrows to ChildContainerSnapshot when kind is 'child'", () => {
    const snapshot: ContainerSnapshot = {} as ContainerSnapshot;

    if (snapshot.kind === "child") {
      // These properties are only available on ChildContainerSnapshot
      expectTypeOf(snapshot.parentId).toEqualTypeOf<string>();
      expectTypeOf(snapshot.inheritanceMode).toEqualTypeOf<"shared" | "forked" | "isolated">();
    }
  });

  it("narrows to LazyContainerSnapshot when kind is 'lazy'", () => {
    const snapshot: ContainerSnapshot = {} as ContainerSnapshot;

    if (snapshot.kind === "lazy") {
      // These properties are only available on LazyContainerSnapshot
      expectTypeOf(snapshot.isLoaded).toEqualTypeOf<boolean>();
    }
  });

  it("narrows to ScopeSnapshot when kind is 'scope'", () => {
    const snapshot: ContainerSnapshot = {} as ContainerSnapshot;

    if (snapshot.kind === "scope") {
      // These properties are only available on ScopeSnapshot
      expectTypeOf(snapshot.scopeId).toEqualTypeOf<string>();
      expectTypeOf(snapshot.parentScopeId).toEqualTypeOf<string | null>();
    }
  });

  it("all snapshots have common base properties", () => {
    const snapshot: ContainerSnapshot = {} as ContainerSnapshot;

    // These are available on all snapshot types
    expectTypeOf(snapshot.kind).toEqualTypeOf<ContainerKind>();
    expectTypeOf(snapshot.isDisposed).toEqualTypeOf<boolean>();
    expectTypeOf(snapshot.singletons).toMatchTypeOf<readonly { portName: string }[]>();
    expectTypeOf(snapshot.scopes).toMatchTypeOf<ScopeTree>();
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe("hasInspector type guard", () => {
  it("narrows container type to ContainerWithInspector", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    if (hasInspector(container)) {
      // After type guard, INSPECTOR is known to exist
      expectTypeOf(container[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    }
  });

  it("preserves generic type parameters after narrowing", () => {
    const { plugin, bindContainer } = createInspectorPlugin<typeof LoggerPort>();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    if (hasInspector(container)) {
      // Original container type parameters are preserved
      type ContainerType = typeof container;
      expectTypeOf<ContainerType>().toMatchTypeOf<ContainerWithInspector>();
    }
  });
});

describe("getInspectorAPI helper", () => {
  it("returns InspectorAPI | undefined", () => {
    const container = createContainer(graph);
    const api = getInspectorAPI(container);

    expectTypeOf(api).toEqualTypeOf<InspectorAPI | undefined>();
  });

  it("can be used with optional chaining", () => {
    const container = createContainer(graph);
    const snapshot = getInspectorAPI(container)?.getSnapshot();

    expectTypeOf(snapshot).toEqualTypeOf<ContainerSnapshot | undefined>();
  });
});

describe("ContainerWithInspector type", () => {
  it("extends Container with INSPECTOR property", () => {
    type TestContainer = ContainerWithInspector<typeof LoggerPort>;

    expectTypeOf<TestContainer>().toMatchTypeOf<Container<typeof LoggerPort>>();
    expectTypeOf<TestContainer[typeof INSPECTOR]>().toEqualTypeOf<InspectorAPI>();
  });

  it("works with default type parameters", () => {
    type DefaultContainer = ContainerWithInspector;

    expectTypeOf<DefaultContainer[typeof INSPECTOR]>().toEqualTypeOf<InspectorAPI>();
  });
});

// =============================================================================
// InspectorAPI Type Tests
// =============================================================================

describe("InspectorAPI type safety", () => {
  it("getSnapshot returns ContainerSnapshot", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const snapshot = container[INSPECTOR].getSnapshot();
    expectTypeOf(snapshot).toMatchTypeOf<ContainerSnapshot>();
  });

  it("getScopeTree returns ScopeTree", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const tree = container[INSPECTOR].getScopeTree();
    expectTypeOf(tree).toMatchTypeOf<ScopeTree>();
  });

  it("listPorts returns readonly string array", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const ports = container[INSPECTOR].listPorts();
    expectTypeOf(ports).toMatchTypeOf<readonly string[]>();
  });

  it("isResolved returns boolean or 'scope-required'", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const result = container[INSPECTOR].isResolved("Logger");
    expectTypeOf(result).toEqualTypeOf<boolean | "scope-required">();
  });

  it("subscribe returns unsubscribe function", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const unsubscribe = container[INSPECTOR].subscribe(() => {});
    expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
  });

  it("getContainerKind returns ContainerKind", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const kind = container[INSPECTOR].getContainerKind();
    expectTypeOf(kind).toEqualTypeOf<ContainerKind>();
  });

  it("getPhase returns ContainerPhase", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    const phase = container[INSPECTOR].getPhase();
    expectTypeOf(phase).toEqualTypeOf<TypedPhase>();
  });

  it("isDisposed is readonly boolean", () => {
    const { plugin, bindContainer } = createInspectorPlugin();
    const container = createContainer(graph, { plugins: [plugin] });
    bindContainer(container);

    expectTypeOf(container[INSPECTOR].isDisposed).toEqualTypeOf<boolean>();
  });
});

// =============================================================================
// InspectorEvent Type Tests
// =============================================================================

describe("InspectorEvent discriminated union", () => {
  it("narrows to resolution event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "resolution") {
      expectTypeOf(event.portName).toEqualTypeOf<string>();
      expectTypeOf(event.duration).toEqualTypeOf<number>();
      expectTypeOf(event.isCacheHit).toEqualTypeOf<boolean>();
    }
  });

  it("narrows to scope-created event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "scope-created") {
      expectTypeOf(event.scope).toMatchTypeOf<{ id: string }>();
    }
  });

  it("narrows to scope-disposed event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "scope-disposed") {
      expectTypeOf(event.scopeId).toEqualTypeOf<string>();
    }
  });

  it("narrows to phase-changed event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "phase-changed") {
      expectTypeOf(event.phase).toEqualTypeOf<TypedPhase>();
    }
  });

  it("narrows to init-progress event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "init-progress") {
      expectTypeOf(event.current).toEqualTypeOf<number>();
      expectTypeOf(event.total).toEqualTypeOf<number>();
      expectTypeOf(event.portName).toEqualTypeOf<string>();
    }
  });

  it("narrows to snapshot-changed event type", () => {
    const event: InspectorEvent = {} as InspectorEvent;

    if (event.type === "snapshot-changed") {
      // snapshot-changed has no additional properties
      expectTypeOf(event.type).toEqualTypeOf<"snapshot-changed">();
    }
  });
});
