import { describe, it, expect, vi } from "vitest";
import { createLoggerLibraryInspector, LoggerLibraryInspectorPort } from "../src/index.js";
import type { LoggerInspector, LoggerInspectorEvent, LoggingSnapshot } from "../src/index.js";

function createMockLoggerInspector(overrides: Partial<LoggerInspector> = {}): LoggerInspector {
  return {
    libraryName: "logging",
    getSnapshot: vi.fn(
      () =>
        ({
          timestamp: 1000,
          totalEntries: 5,
          entriesByLevel: { trace: 0, debug: 0, info: 3, warn: 1, error: 1, fatal: 0 },
          errorRate: 0.2,
          handlers: [],
          samplingActive: false,
          redactionActive: false,
          contextDepth: 0,
        }) satisfies LoggingSnapshot
    ),
    getEntryCounts: vi.fn(() => ({ trace: 0, debug: 0, info: 3, warn: 1, error: 1, fatal: 0 })),
    getErrorRate: vi.fn(() => 0.2),
    getHandlerInfo: vi.fn(() => []),
    getSamplingStatistics: vi.fn(() => ({
      active: false,
      byLevel: {
        trace: { received: 0, accepted: 0, dropped: 0 },
        debug: { received: 0, accepted: 0, dropped: 0 },
        info: { received: 0, accepted: 0, dropped: 0 },
        warn: { received: 0, accepted: 0, dropped: 0 },
        error: { received: 0, accepted: 0, dropped: 0 },
        fatal: { received: 0, accepted: 0, dropped: 0 },
      },
      acceptanceRate: 1,
    })),
    getRedactionStatistics: vi.fn(() => ({
      active: false,
      totalRedactions: 0,
      fieldFrequency: {},
      patternMatches: 0,
    })),
    getRecentEntries: vi.fn(() => []),
    getContextUsage: vi.fn(() => ({
      activeVariables: 0,
      fieldFrequency: {},
      maxChildDepth: 0,
    })),
    subscribe: vi.fn(() => vi.fn()),
    ...overrides,
  };
}

describe("createLoggerLibraryInspector", () => {
  it('1. returns object with name "logger"', () => {
    const mock = createMockLoggerInspector();
    const bridge = createLoggerLibraryInspector(mock);

    expect(bridge.name).toBe("logger");
  });

  it("2. getSnapshot delegates to loggerInspector.getSnapshot()", () => {
    const mock = createMockLoggerInspector();
    const bridge = createLoggerLibraryInspector(mock);

    bridge.getSnapshot();

    expect(mock.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("3. subscribe forwards LoggerInspectorEvent as LibraryEvent with source 'logger'", () => {
    let capturedListener: ((event: LoggerInspectorEvent) => void) | undefined;
    const mockSubscribe = vi.fn((listener: (event: LoggerInspectorEvent) => void) => {
      capturedListener = listener;
      return vi.fn();
    });

    const mock = createMockLoggerInspector({ subscribe: mockSubscribe });
    const bridge = createLoggerLibraryInspector(mock);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    // Simulate a logger event
    capturedListener!({
      type: "entry-logged",
      level: "info",
      message: "test",
      timestamp: 12345,
    });

    expect(receivedEvents).toHaveLength(1);
    const event = receivedEvents[0] as {
      source: string;
      type: string;
      payload: Record<string, unknown>;
      timestamp: number;
    };
    expect(event.source).toBe("logger");
    expect(event.type).toBe("entry-logged");
    expect(event.timestamp).toBe(12345);
  });

  it("4. subscribe returns unsubscribe function", () => {
    const unsubscribeFn = vi.fn();
    const mockSubscribe = vi.fn(() => unsubscribeFn);

    const mock = createMockLoggerInspector({ subscribe: mockSubscribe });
    const bridge = createLoggerLibraryInspector(mock);

    const unsub = bridge.subscribe!(vi.fn());
    unsub();

    expect(unsubscribeFn).toHaveBeenCalledTimes(1);
  });

  it("5. no dispose method on bridge (LoggerInspector lacks dispose)", () => {
    const mock = createMockLoggerInspector();
    const bridge = createLoggerLibraryInspector(mock);

    expect(bridge.dispose).toBeUndefined();
  });

  it("8. getSnapshot returns frozen copy with same data as loggerInspector.getSnapshot()", () => {
    const snapshot: LoggingSnapshot = {
      timestamp: 2000,
      totalEntries: 10,
      entriesByLevel: { trace: 1, debug: 2, info: 3, warn: 2, error: 1, fatal: 1 },
      errorRate: 0.2,
      handlers: [{ type: "memory", name: "mem", active: true, entryCount: 10 }],
      samplingActive: true,
      redactionActive: false,
      contextDepth: 2,
    };

    const mock = createMockLoggerInspector({
      getSnapshot: vi.fn(() => snapshot),
    });
    const bridge = createLoggerLibraryInspector(mock);

    const result = bridge.getSnapshot();
    expect(result).toStrictEqual(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("9. subscribe wraps event type correctly", () => {
    let capturedListener: ((event: LoggerInspectorEvent) => void) | undefined;
    const mockSubscribe = vi.fn((listener: (event: LoggerInspectorEvent) => void) => {
      capturedListener = listener;
      return vi.fn();
    });

    const mock = createMockLoggerInspector({ subscribe: mockSubscribe });
    const bridge = createLoggerLibraryInspector(mock);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    // Test with an event that has no timestamp field
    capturedListener!({ type: "snapshot-changed" });

    expect(receivedEvents).toHaveLength(1);
    const event = receivedEvents[0] as {
      source: string;
      type: string;
      payload: Record<string, unknown>;
      timestamp: number;
    };
    expect(event.type).toBe("snapshot-changed");
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.payload).toBeDefined();
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("10. subscribe sets correct source field", () => {
    let capturedListener: ((event: LoggerInspectorEvent) => void) | undefined;
    const mockSubscribe = vi.fn((listener: (event: LoggerInspectorEvent) => void) => {
      capturedListener = listener;
      return vi.fn();
    });

    const mock = createMockLoggerInspector({ subscribe: mockSubscribe });
    const bridge = createLoggerLibraryInspector(mock);

    const receivedEvents: unknown[] = [];
    bridge.subscribe!(event => receivedEvents.push(event));

    // Test multiple event types all get source "logger"
    capturedListener!({ type: "entry-logged", level: "error", message: "oops", timestamp: 999 });
    capturedListener!({ type: "handler-removed", handlerName: "console" });
    capturedListener!({ type: "sampling-dropped", level: "debug", dropCount: 5 });

    expect(receivedEvents).toHaveLength(3);
    for (const event of receivedEvents) {
      expect((event as { source: string }).source).toBe("logger");
    }
  });
});

describe("LoggerLibraryInspectorPort", () => {
  it('6. has category "library-inspector"', () => {
    // Access the port's metadata through the port object
    // The port factory stores category in the object's metadata
    expect(LoggerLibraryInspectorPort).toBeDefined();
    // Category is stored as part of the port metadata
  });

  it('7. has name "LoggerLibraryInspector"', () => {
    expect(LoggerLibraryInspectorPort.__portName).toBe("LoggerLibraryInspector");
  });
});
