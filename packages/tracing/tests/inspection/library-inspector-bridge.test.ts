/**
 * Tests for the Tracing Library Inspector bridge.
 *
 * Verifies:
 * - Inspector name is "tracing"
 * - getSnapshot returns frozen object
 * - getSnapshot includes correct fields
 * - isLibraryInspector returns true
 * - TracingLibraryInspectorPort exists and has correct properties
 */

import { describe, it, expect } from "vitest";
import { isLibraryInspector, getPortDirection, getPortMetadata } from "@hex-di/core";
import { createMemoryTracer } from "../../src/adapters/memory/tracer.js";
import { createTracingQueryApi } from "../../src/inspection/query-api.js";
import {
  createTracingLibraryInspector,
  TracingLibraryInspectorPort,
} from "../../src/inspection/library-inspector-bridge.js";

describe("createTracingLibraryInspector", () => {
  function createInspector() {
    const tracer = createMemoryTracer();
    const api = createTracingQueryApi(() => tracer.getCollectedSpans());
    return { inspector: createTracingLibraryInspector(api), tracer };
  }

  it("should have name 'tracing'", () => {
    const { inspector } = createInspector();
    expect(inspector.name).toBe("tracing");
  });

  it("should return a frozen snapshot", () => {
    const { inspector } = createInspector();
    const snapshot = inspector.getSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("should include correct fields in snapshot", () => {
    const { inspector, tracer } = createInspector();

    // Create some spans to get non-zero values
    tracer.withSpan("test-op", span => {
      span.setAttribute("hex-di.resolution.cached", true);
      span.setStatus("ok");
    });
    tracer.withSpan("error-op", span => {
      span.recordException(new Error("fail"));
      span.setStatus("error");
    });

    const snapshot = inspector.getSnapshot();
    expect(snapshot).toHaveProperty("totalSpans");
    expect(snapshot).toHaveProperty("errorCount");
    expect(snapshot).toHaveProperty("averageDuration");
    expect(snapshot).toHaveProperty("cacheHitRate");
    expect(snapshot.totalSpans).toBe(2);
    expect(snapshot.errorCount).toBe(1);
    expect(typeof snapshot.averageDuration).toBe("number");
    expect(typeof snapshot.cacheHitRate).toBe("number");
  });

  it("should pass isLibraryInspector type guard", () => {
    const { inspector } = createInspector();
    expect(isLibraryInspector(inspector)).toBe(true);
  });
});

describe("TracingLibraryInspectorPort", () => {
  it("should exist and have correct properties", () => {
    expect(TracingLibraryInspectorPort).toBeDefined();
    expect(TracingLibraryInspectorPort.__portName).toBe("TracingLibraryInspector");
    expect(getPortDirection(TracingLibraryInspectorPort)).toBe("outbound");
    const metadata = getPortMetadata(TracingLibraryInspectorPort);
    expect(metadata?.category).toBe("library-inspector");
  });
});
