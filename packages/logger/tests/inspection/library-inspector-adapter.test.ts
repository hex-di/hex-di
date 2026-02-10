/**
 * Tests for LoggerLibraryInspectorAdapter
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { LoggerLibraryInspectorAdapter } from "../../src/inspection/library-inspector-adapter.js";
import { LoggerLibraryInspectorPort } from "../../src/inspection/library-inspector-bridge.js";
import { LoggerInspectorPort } from "../../src/inspection/inspector-port.js";
import type { LoggerInspector } from "../../src/inspection/inspector.js";

function createMockLoggerInspector(): LoggerInspector {
  return {
    libraryName: "logging",
    getSnapshot: vi.fn().mockReturnValue({
      timestamp: Date.now(),
      totalEntries: 42,
      entriesByLevel: { trace: 0, debug: 5, info: 20, warn: 10, error: 5, fatal: 2 },
      errorRate: 0.17,
      handlers: [],
      samplingActive: false,
      redactionActive: false,
      contextDepth: 0,
    }),
    getEntryCounts: vi
      .fn()
      .mockReturnValue({ trace: 0, debug: 5, info: 20, warn: 10, error: 5, fatal: 2 }),
    getErrorRate: vi.fn().mockReturnValue(0.17),
    getHandlerInfo: vi.fn().mockReturnValue([]),
    getSamplingStatistics: vi
      .fn()
      .mockReturnValue({ active: false, byLevel: {}, acceptanceRate: 1 }),
    getRedactionStatistics: vi
      .fn()
      .mockReturnValue({
        active: false,
        totalRedactions: 0,
        fieldFrequency: {},
        patternMatches: 0,
      }),
    getRecentEntries: vi.fn().mockReturnValue([]),
    getContextUsage: vi
      .fn()
      .mockReturnValue({ activeVariables: 0, fieldFrequency: {}, maxChildDepth: 0 }),
    subscribe: vi.fn().mockReturnValue(() => {}),
  };
}

describe("LoggerLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(LoggerLibraryInspectorAdapter)).toBe(true);
  });

  it("provides LoggerLibraryInspectorPort", () => {
    expect(LoggerLibraryInspectorAdapter.provides).toBe(LoggerLibraryInspectorPort);
  });

  it("requires [LoggerInspectorPort]", () => {
    expect(LoggerLibraryInspectorAdapter.requires).toHaveLength(1);
    expect(LoggerLibraryInspectorAdapter.requires[0]).toBe(LoggerInspectorPort);
  });

  it("has singleton lifetime", () => {
    expect(LoggerLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(LoggerLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("factory returns a LibraryInspector with name 'logger'", () => {
    const result = LoggerLibraryInspectorAdapter.factory({
      LoggerInspector: createMockLoggerInspector(),
    });
    expect(result.name).toBe("logger");
    expect(typeof result.getSnapshot).toBe("function");
  });

  it("factory delegates getSnapshot to LoggerInspector", () => {
    const mockInspector = createMockLoggerInspector();
    const result = LoggerLibraryInspectorAdapter.factory({
      LoggerInspector: mockInspector,
    });

    const snapshot = result.getSnapshot();
    expect(mockInspector.getSnapshot).toHaveBeenCalled();
    expect(snapshot.totalEntries).toBe(42);
  });
});

describe("LoggerLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(LoggerLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});
