/**
 * Tests for TracingLibraryInspectorAdapter and TracingQueryApiPort
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { TracingLibraryInspectorAdapter } from "../../src/inspection/adapters.js";
import { TracingLibraryInspectorPort } from "../../src/inspection/library-inspector-bridge.js";
import { TracingQueryApiPort } from "../../src/inspection/ports.js";
import type { TracingQueryAPI } from "../../src/inspection/types.js";

function createMockQueryApi(): TracingQueryAPI {
  return {
    querySpans: vi.fn().mockReturnValue([]),
    getAverageDuration: vi.fn().mockReturnValue(5.0),
    getErrorCount: vi.fn().mockReturnValue(1),
    getCacheHitRate: vi.fn().mockReturnValue(0.8),
    getPercentiles: vi.fn().mockReturnValue({}),
    getSlowResolutions: vi.fn().mockReturnValue([]),
    getErrorSpans: vi.fn().mockReturnValue([]),
    getResolutionCount: vi.fn().mockReturnValue(10),
    getTraceTree: vi.fn().mockReturnValue(undefined),
  };
}

describe("TracingLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(TracingLibraryInspectorAdapter)).toBe(true);
  });

  it("provides TracingLibraryInspectorPort", () => {
    expect(TracingLibraryInspectorAdapter.provides).toBe(TracingLibraryInspectorPort);
  });

  it("requires [TracingQueryApiPort]", () => {
    expect(TracingLibraryInspectorAdapter.requires).toHaveLength(1);
    expect(TracingLibraryInspectorAdapter.requires[0]).toBe(TracingQueryApiPort);
  });

  it("has singleton lifetime", () => {
    expect(TracingLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(TracingLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("factory returns a LibraryInspector with name 'tracing'", () => {
    const result = TracingLibraryInspectorAdapter.factory({
      TracingQueryApi: createMockQueryApi(),
    });
    expect(result.name).toBe("tracing");
    expect(typeof result.getSnapshot).toBe("function");
  });

  it("factory delegates getSnapshot to TracingQueryAPI", () => {
    const mockApi = createMockQueryApi();
    const result = TracingLibraryInspectorAdapter.factory({
      TracingQueryApi: mockApi,
    });

    const snapshot = result.getSnapshot();
    expect(mockApi.getResolutionCount).toHaveBeenCalled();
    expect(snapshot.totalSpans).toBe(10);
  });
});

describe("TracingLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(TracingLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});

describe("TracingQueryApiPort", () => {
  it("has name 'TracingQueryApi'", () => {
    expect(TracingQueryApiPort.__portName).toBe("TracingQueryApi");
  });
});
