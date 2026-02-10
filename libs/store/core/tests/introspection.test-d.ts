/**
 * Type-level tests for Store Introspection module
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  StoreInspectorAPI,
  StoreSnapshot,
  PortSnapshot,
  StatePortInfo,
  SubscriberGraph,
  ActionHistoryEntry,
  StoreInspectorEvent,
  StoreInspectorListener,
  ActionHistoryConfig,
  StatePortSnapshot,
  AtomPortSnapshot,
  DerivedPortSnapshot,
  AsyncDerivedPortSnapshot,
  SubscriberNode,
  SubscriberEdge,
} from "../src/index.js";

// =============================================================================
// StoreInspectorAPI method signatures
// =============================================================================

describe("StoreInspectorAPI", () => {
  it("getSnapshot returns StoreSnapshot", () => {
    expectTypeOf<StoreInspectorAPI["getSnapshot"]>().returns.toEqualTypeOf<StoreSnapshot>();
  });

  it("getPortState returns PortSnapshot | undefined", () => {
    expectTypeOf<StoreInspectorAPI["getPortState"]>().returns.toEqualTypeOf<
      PortSnapshot | undefined
    >();
    expectTypeOf<StoreInspectorAPI["getPortState"]>().parameters.toEqualTypeOf<
      [portName: string]
    >();
  });

  it("listStatePorts returns readonly StatePortInfo[]", () => {
    expectTypeOf<StoreInspectorAPI["listStatePorts"]>().returns.toEqualTypeOf<
      readonly StatePortInfo[]
    >();
  });

  it("getSubscriberGraph returns SubscriberGraph", () => {
    expectTypeOf<
      StoreInspectorAPI["getSubscriberGraph"]
    >().returns.toEqualTypeOf<SubscriberGraph>();
  });

  it("subscribe accepts StoreInspectorListener and returns unsubscribe", () => {
    expectTypeOf<StoreInspectorAPI["subscribe"]>()
      .parameter(0)
      .toEqualTypeOf<StoreInspectorListener>();
    expectTypeOf<StoreInspectorAPI["subscribe"]>().returns.toEqualTypeOf<() => void>();
  });

  it("getActionHistory accepts optional filter", () => {
    expectTypeOf<StoreInspectorAPI["getActionHistory"]>().returns.toEqualTypeOf<
      readonly ActionHistoryEntry[]
    >();
  });
});

// =============================================================================
// PortSnapshot discriminated union
// =============================================================================

describe("PortSnapshot", () => {
  it("is a discriminated union of all port snapshot types", () => {
    expectTypeOf<PortSnapshot>().toEqualTypeOf<
      StatePortSnapshot | AtomPortSnapshot | DerivedPortSnapshot | AsyncDerivedPortSnapshot
    >();
  });

  it("StatePortSnapshot has correct shape", () => {
    expectTypeOf<StatePortSnapshot["kind"]>().toEqualTypeOf<"state">();
    expectTypeOf<StatePortSnapshot["portName"]>().toBeString();
    expectTypeOf<StatePortSnapshot["state"]>().toBeUnknown();
    expectTypeOf<StatePortSnapshot["subscriberCount"]>().toBeNumber();
    expectTypeOf<StatePortSnapshot["actionCount"]>().toBeNumber();
    expectTypeOf<StatePortSnapshot["lastActionAt"]>().toEqualTypeOf<number | null>();
  });

  it("AtomPortSnapshot has correct shape", () => {
    expectTypeOf<AtomPortSnapshot["kind"]>().toEqualTypeOf<"atom">();
    expectTypeOf<AtomPortSnapshot["value"]>().toBeUnknown();
  });

  it("DerivedPortSnapshot has correct shape", () => {
    expectTypeOf<DerivedPortSnapshot["kind"]>().toEqualTypeOf<"derived">();
    expectTypeOf<DerivedPortSnapshot["sourcePortNames"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<DerivedPortSnapshot["isStale"]>().toBeBoolean();
  });

  it("AsyncDerivedPortSnapshot has correct shape", () => {
    expectTypeOf<AsyncDerivedPortSnapshot["kind"]>().toEqualTypeOf<"async-derived">();
    expectTypeOf<AsyncDerivedPortSnapshot["status"]>().toEqualTypeOf<
      "idle" | "loading" | "success" | "error"
    >();
    expectTypeOf<AsyncDerivedPortSnapshot["data"]>().toBeUnknown();
  });
});

// =============================================================================
// StoreInspectorEvent discriminated union
// =============================================================================

describe("StoreInspectorEvent", () => {
  it("covers all 8 event types", () => {
    type EventTypes = StoreInspectorEvent["type"];
    expectTypeOf<EventTypes>().toEqualTypeOf<
      | "action-dispatched"
      | "state-changed"
      | "subscriber-added"
      | "subscriber-removed"
      | "effect-completed"
      | "effect-failed"
      | "async-derived-failed"
      | "snapshot-changed"
    >();
  });
});

// =============================================================================
// ActionHistoryEntry fields
// =============================================================================

describe("ActionHistoryEntry", () => {
  it("has required fields with correct types", () => {
    expectTypeOf<ActionHistoryEntry["id"]>().toBeString();
    expectTypeOf<ActionHistoryEntry["portName"]>().toBeString();
    expectTypeOf<ActionHistoryEntry["actionName"]>().toBeString();
    expectTypeOf<ActionHistoryEntry["payload"]>().toBeUnknown();
    expectTypeOf<ActionHistoryEntry["prevState"]>().toBeUnknown();
    expectTypeOf<ActionHistoryEntry["nextState"]>().toBeUnknown();
    expectTypeOf<ActionHistoryEntry["timestamp"]>().toBeNumber();
    expectTypeOf<ActionHistoryEntry["effectStatus"]>().toEqualTypeOf<
      "none" | "pending" | "completed" | "failed"
    >();
    expectTypeOf<ActionHistoryEntry["parentId"]>().toEqualTypeOf<string | null>();
    expectTypeOf<ActionHistoryEntry["order"]>().toBeNumber();
  });
});

// =============================================================================
// SubscriberGraph
// =============================================================================

describe("SubscriberGraph", () => {
  it("has correct structure", () => {
    expectTypeOf<SubscriberGraph["correlationId"]>().toBeString();
    expectTypeOf<SubscriberGraph["nodes"]>().toEqualTypeOf<readonly SubscriberNode[]>();
    expectTypeOf<SubscriberGraph["edges"]>().toEqualTypeOf<readonly SubscriberEdge[]>();
  });

  it("SubscriberEdge type is a union of edge types", () => {
    expectTypeOf<SubscriberEdge["type"]>().toEqualTypeOf<
      "derives-from" | "subscribes-to" | "writes-to"
    >();
  });
});

// =============================================================================
// ActionHistoryConfig
// =============================================================================

describe("ActionHistoryConfig", () => {
  it("has correct shape", () => {
    expectTypeOf<ActionHistoryConfig["maxEntries"]>().toBeNumber();
    expectTypeOf<ActionHistoryConfig["mode"]>().toEqualTypeOf<"full" | "lightweight" | "off">();
  });
});
