/**
 * Integration Tests: Tracing / Inspection
 *
 * Tests for StoreInspectorImpl, ActionHistory with traceId/spanId,
 * and inspector event emission.
 */

import { describe, it, expect } from "vitest";
import { createStoreInspectorImpl } from "../../src/index.js";
import type { ActionHistoryEntry, StoreInspectorEvent } from "../../src/index.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEntry(overrides: Partial<ActionHistoryEntry> = {}): ActionHistoryEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    portName: "Counter",
    actionName: "increment",
    payload: undefined,
    prevState: { count: 0 },
    nextState: { count: 1 },
    timestamp: Date.now(),
    effectStatus: "none",
    parentId: null,
    order: 0,
    ...overrides,
  };
}

// =============================================================================
// Span creation: traceId/spanId stored and queryable
// =============================================================================

describe("Action history traceId/spanId storage", () => {
  it("recordAction with traceId/spanId stores them in history, queryable via filter", () => {
    const inspector = createStoreInspectorImpl();

    const entry1 = makeEntry({
      id: "action-1",
      traceId: "trace-abc",
      spanId: "span-001",
    });

    const entry2 = makeEntry({
      id: "action-2",
      traceId: "trace-def",
      spanId: "span-002",
    });

    const entry3 = makeEntry({
      id: "action-3",
      traceId: "trace-abc",
      spanId: "span-003",
    });

    inspector.recordAction(entry1);
    inspector.recordAction(entry2);
    inspector.recordAction(entry3);

    // Query by traceId
    const traceAbcEntries = inspector.getActionHistory({ traceId: "trace-abc" });
    expect(traceAbcEntries).toHaveLength(2);
    expect(traceAbcEntries[0].id).toBe("action-1");
    expect(traceAbcEntries[0].spanId).toBe("span-001");
    expect(traceAbcEntries[1].id).toBe("action-3");
    expect(traceAbcEntries[1].spanId).toBe("span-003");

    // Query by different traceId
    const traceDefEntries = inspector.getActionHistory({ traceId: "trace-def" });
    expect(traceDefEntries).toHaveLength(1);
    expect(traceDefEntries[0].id).toBe("action-2");
  });
});

// =============================================================================
// Batch spans: multiple actions share parentId
// =============================================================================

describe("Batch actions share parentId correlation", () => {
  it("multiple actions within a batch share the same parentId", () => {
    const inspector = createStoreInspectorImpl();

    const batchId = "batch-xyz";

    const entry1 = makeEntry({
      id: "batch-action-1",
      actionName: "increment",
      parentId: batchId,
      order: 0,
      traceId: "trace-batch",
      spanId: "span-b1",
    });

    const entry2 = makeEntry({
      id: "batch-action-2",
      actionName: "setLabel",
      parentId: batchId,
      order: 1,
      traceId: "trace-batch",
      spanId: "span-b2",
    });

    const entry3 = makeEntry({
      id: "non-batch-action",
      actionName: "increment",
      parentId: null,
      order: 0,
      traceId: "trace-other",
    });

    inspector.recordAction(entry1);
    inspector.recordAction(entry2);
    inspector.recordAction(entry3);

    const allEntries = inspector.getActionHistory();
    expect(allEntries).toHaveLength(3);

    // The first two share the same parentId
    const batchEntries = allEntries.filter(e => e.parentId === batchId);
    expect(batchEntries).toHaveLength(2);
    expect(batchEntries[0].order).toBe(0);
    expect(batchEntries[1].order).toBe(1);
  });
});

// =============================================================================
// TracerPort absent: traceId/spanId are undefined
// =============================================================================

describe("TracerPort absent", () => {
  it("when no tracing, traceId/spanId are undefined in history entries", () => {
    const inspector = createStoreInspectorImpl();

    const entry = makeEntry({
      id: "no-trace-action",
      // Omit traceId and spanId entirely
    });

    inspector.recordAction(entry);

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].traceId).toBeUndefined();
    expect(history[0].spanId).toBeUndefined();
  });
});

// =============================================================================
// Inspector event emission with tryCatch protection
// =============================================================================

describe("Inspector emit() error isolation", () => {
  it("a throwing listener does not prevent other listeners from receiving events", () => {
    const inspector = createStoreInspectorImpl();

    const receivedEvents: StoreInspectorEvent[] = [];

    // First listener throws
    inspector.subscribe(() => {
      throw new Error("Listener 1 broke");
    });

    // Second listener records
    inspector.subscribe(event => {
      receivedEvents.push(event);
    });

    // Emit should not throw
    inspector.emit({ type: "snapshot-changed" });

    // The second listener still received the event
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].type).toBe("snapshot-changed");
  });
});
