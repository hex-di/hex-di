/**
 * QueryTracingBridge Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createQueryTracingBridge } from "../../src/tracing/tracing-bridge.js";
import type { TracerLike } from "../../src/tracing/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockTracer(): TracerLike {
  return {
    pushSpan() {},
    popSpan() {},
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createQueryTracingBridge", () => {
  it("forwards all config properties to hook options", () => {
    const tracer = createMockTracer();
    const filter = (portName: string): boolean => portName !== "excluded";

    const options = createQueryTracingBridge({
      tracer,
      filter,
      traceMutations: false,
      scopeId: "scope-42",
      traceContext: { trace_id: "abc" },
    });

    expect(options.tracer).toBe(tracer);
    expect(options.filter).toBe(filter);
    expect(options.traceMutations).toBe(false);
    expect(options.scopeId).toBe("scope-42");
    expect(options.traceContext).toEqual({ trace_id: "abc" });
  });

  it("defaults optional properties to undefined", () => {
    const tracer = createMockTracer();

    const options = createQueryTracingBridge({ tracer });

    expect(options.tracer).toBe(tracer);
    expect(options.filter).toBeUndefined();
    expect(options.traceMutations).toBeUndefined();
    expect(options.scopeId).toBeUndefined();
    expect(options.traceContext).toBeUndefined();
  });
});
