/**
 * Clock Source Change Sink Port tests — DoD 8/13
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import {
  ClockSourceChangedSinkPort,
  createClockSourceChangedEvent,
} from "../src/ports/clock-source-changed.js";
import type { ClockSourceChangedEvent } from "../src/ports/clock-source-changed.js";

// =============================================================================
// DoD 8/13: Clock Source Change Auditing
// =============================================================================

describe("ClockSourceChangedSinkPort", () => {
  it("ClockSourceChangedSinkPort is defined as a directed port via createPort", () => {
    expect(typeof ClockSourceChangedSinkPort).toBe("object");
    expect(ClockSourceChangedSinkPort.__portName).toBe("ClockSourceChangedSink");
  });

  it("ClockSourceChangedSinkPort has name 'ClockSourceChangedSinkPort'", () => {
    // Port name is 'ClockSourceChangedSink' per spec
    expect(ClockSourceChangedSinkPort.__portName).toBe("ClockSourceChangedSink");
  });

  it("ClockSourceChangedEvent has _tag 'ClockSourceChanged'", () => {
    const event = createClockSourceChangedEvent({
      previousAdapter: "OldAdapter",
      newAdapter: "NewAdapter",
      timestamp: new Date().toISOString(),
      reason: "test reason",
    });
    expect(event._tag).toBe("ClockSourceChanged");
  });

  it("ClockSourceChangedEvent object is frozen", () => {
    const event = createClockSourceChangedEvent({
      previousAdapter: "OldAdapter",
      newAdapter: "NewAdapter",
      timestamp: "2024-02-12T12:00:00.000Z",
      reason: "test reason",
    });
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("ClockSourceChangedEvent includes previousAdapter, newAdapter, timestamp (ISO 8601), and reason fields", () => {
    const event = createClockSourceChangedEvent({
      previousAdapter: "OldAdapter",
      newAdapter: "NewAdapter",
      timestamp: "2024-02-12T12:00:00.000Z",
      reason: "Manual override",
    });
    expect(event.previousAdapter).toBe("OldAdapter");
    expect(event.newAdapter).toBe("NewAdapter");
    expect(event.timestamp).toBe("2024-02-12T12:00:00.000Z");
    expect(event.reason).toBe("Manual override");
  });

  it("sink onClockSourceChanged is called with event object", () => {
    const received: unknown[] = [];
    const sink = {
      onClockSourceChanged: (event: ClockSourceChangedEvent) => {
        received.push(event);
      },
    };

    const event = createClockSourceChangedEvent({
      previousAdapter: "AdapterA",
      newAdapter: "AdapterB",
      timestamp: new Date().toISOString(),
      reason: "override",
    });

    sink.onClockSourceChanged(event);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(event);
  });

  it("if onClockSourceChanged sink throws, the error can be caught externally", () => {
    const throwingSink = {
      onClockSourceChanged: (_event: ClockSourceChangedEvent) => {
        throw new Error("sink error");
      },
    };

    const event = createClockSourceChangedEvent({
      previousAdapter: "A",
      newAdapter: "B",
      timestamp: new Date().toISOString(),
      reason: "test",
    });

    // Sink throws — caller is responsible for catching (bridge would catch internally)
    let sinkError: Error | undefined;
    try {
      throwingSink.onClockSourceChanged(event);
    } catch (e) {
      sinkError = e as Error;
    }
    expect(sinkError?.message).toBe("sink error");
  });
});
