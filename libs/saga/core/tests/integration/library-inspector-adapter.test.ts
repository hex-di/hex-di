/**
 * Tests for SagaLibraryInspectorAdapter
 *
 * Verifies that the frozen singleton adapter correctly:
 * - Is frozen (immutable)
 * - Provides SagaLibraryInspectorPort
 * - Requires [SagaInspectorPort]
 * - Has singleton lifetime and sync factoryKind
 * - Factory returns valid LibraryInspector (name, getSnapshot, subscribe, dispose)
 * - Factory delegates getSnapshot to provided SagaInspector mock
 * - Port has category "library-inspector" metadata (auto-registration precondition)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import { ok } from "@hex-di/result";
import { SagaLibraryInspectorAdapter } from "../../src/integration/library-inspector-adapter.js";
import { SagaLibraryInspectorPort } from "../../src/integration/library-inspector-port.js";
import { SagaInspectorPort } from "../../src/ports/factory.js";
import type { SagaInspector } from "../../src/introspection/types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockSagaInspector(): SagaInspector {
  return {
    getDefinitions: vi.fn().mockReturnValue([]),
    getActiveExecutions: vi.fn().mockReturnValue([]),
    getHistory: vi.fn().mockReturnValue(ok([])),
    getTrace: vi.fn().mockReturnValue(null),
    getCompensationStats: vi.fn().mockReturnValue({
      totalCompensations: 0,
      successfulCompensations: 0,
      failedCompensations: 0,
      averageCompensationTime: 0,
      mostCompensatedSaga: null,
      bySaga: [],
    }),
    getSuggestions: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => undefined),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(SagaLibraryInspectorAdapter)).toBe(true);
  });

  it("provides SagaLibraryInspectorPort", () => {
    expect(SagaLibraryInspectorAdapter.provides).toBe(SagaLibraryInspectorPort);
  });

  it("requires [SagaInspectorPort]", () => {
    expect(SagaLibraryInspectorAdapter.requires).toHaveLength(1);
    expect(SagaLibraryInspectorAdapter.requires[0]).toBe(SagaInspectorPort);
  });

  it("has singleton lifetime", () => {
    expect(SagaLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(SagaLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("is not clonable", () => {
    expect(SagaLibraryInspectorAdapter.clonable).toBe(false);
  });

  it("factory returns a LibraryInspector with name 'saga'", () => {
    const result = SagaLibraryInspectorAdapter.factory({
      SagaInspector: createMockSagaInspector(),
    });

    expect(result.name).toBe("saga");
    expect(typeof result.getSnapshot).toBe("function");
    expect(typeof result.subscribe).toBe("function");
    expect(typeof result.dispose).toBe("function");
  });

  it("factory delegates to createSagaLibraryInspector", () => {
    const mockInspector = createMockSagaInspector();

    const result = SagaLibraryInspectorAdapter.factory({
      SagaInspector: mockInspector,
    });

    // getSnapshot should call through to SagaInspector methods
    result.getSnapshot();
    expect(mockInspector.getDefinitions).toHaveBeenCalled();
    expect(mockInspector.getActiveExecutions).toHaveBeenCalled();
    expect(mockInspector.getCompensationStats).toHaveBeenCalled();
    expect(mockInspector.getSuggestions).toHaveBeenCalled();
  });
});

describe("SagaLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(SagaLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});
