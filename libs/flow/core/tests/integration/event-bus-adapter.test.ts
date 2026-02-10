/**
 * Tests for FlowEventBusAdapter
 *
 * Verifies that the adapter provides the correct port, has singleton lifetime,
 * creates a working event bus, and properly disposes via the finalizer.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { FlowEventBusAdapter } from "../../src/integration/event-bus-adapter.js";
import { FlowEventBusPort } from "../../src/integration/types.js";

describe("FlowEventBusAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(FlowEventBusAdapter)).toBe(true);
  });

  it("provides FlowEventBusPort", () => {
    expect(FlowEventBusAdapter.provides).toBe(FlowEventBusPort);
  });

  it("has singleton lifetime", () => {
    expect(FlowEventBusAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(FlowEventBusAdapter.factoryKind).toBe("sync");
  });

  it("requires no dependencies", () => {
    expect(FlowEventBusAdapter.requires).toEqual([]);
  });

  it("factory creates a working FlowEventBus", () => {
    const bus = FlowEventBusAdapter.factory({} as never);

    const events: Array<{ readonly type: string }> = [];
    bus.subscribe(e => events.push(e));

    bus.emit({ type: "TEST_EVENT" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("TEST_EVENT");

    bus.dispose();
  });

  it("finalizer calls dispose on the bus", () => {
    const bus = FlowEventBusAdapter.factory({} as never);

    const events: Array<{ readonly type: string }> = [];
    bus.subscribe(e => events.push(e));

    // Finalize the bus
    FlowEventBusAdapter.finalizer?.(bus);

    // After disposal, emit should be a no-op
    bus.emit({ type: "AFTER_DISPOSE" });
    expect(events).toHaveLength(0);
  });
});
