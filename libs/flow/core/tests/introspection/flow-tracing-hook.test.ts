/**
 * FlowTracingHook Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createFlowTracingHook } from "../../src/introspection/flow-tracing-hook.js";
import type { TracerLike, FlowTracingHook } from "../../src/introspection/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createMockTracer(): TracerLike & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    pushSpan(name: string, attributes?: Record<string, string>) {
      calls.push({ method: "pushSpan", args: [name, attributes] });
    },
    popSpan(status: "ok" | "error") {
      calls.push({ method: "popSpan", args: [status] });
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("FlowTracingHook", () => {
  it("onTransitionStart creates span with correct name format", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionStart("my-machine", "idle", "loading", "FETCH");

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("pushSpan");
    expect(tracer.calls[0]?.args[0]).toBe("flow:my-machine/idle->loading");
  });

  it("onTransitionStart sets correct attributes", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionStart("my-machine", "idle", "loading", "FETCH");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs).toEqual({
      machine_id: "my-machine",
      from_state: "idle",
      to_state: "loading",
      event_type: "FETCH",
    });
  });

  it("onTransitionEnd calls popSpan with 'ok' on success", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionEnd("my-machine", true);

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("popSpan");
    expect(tracer.calls[0]?.args[0]).toBe("ok");
  });

  it("onTransitionEnd calls popSpan with 'error' on failure", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionEnd("my-machine", false);

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("popSpan");
    expect(tracer.calls[0]?.args[0]).toBe("error");
  });

  it("onEffectStart creates span with invoke format", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onEffectStart("Invoke", "UserPort.getUser");

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.args[0]).toBe("flow:effect:Invoke:UserPort.getUser");
  });

  it("onEffectStart creates span for spawn effects", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onEffectStart("Spawn", "FetchActivity");

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.args[0]).toBe("flow:effect:Spawn:FetchActivity");
  });

  it("onEffectEnd calls popSpan with correct status", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onEffectEnd(true);
    expect(tracer.calls[0]?.args[0]).toBe("ok");

    hook.onEffectEnd(false);
    expect(tracer.calls[1]?.args[0]).toBe("error");
  });

  it("filter option excludes specific machineIds", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({
      tracer,
      filter: id => id !== "excluded-machine",
    });

    hook.onTransitionStart("excluded-machine", "idle", "active", "START");
    expect(tracer.calls).toHaveLength(0);

    hook.onTransitionStart("included-machine", "idle", "active", "START");
    expect(tracer.calls).toHaveLength(1);

    // onTransitionEnd also respects filter
    hook.onTransitionEnd("excluded-machine", true);
    expect(tracer.calls).toHaveLength(1);

    hook.onTransitionEnd("included-machine", true);
    expect(tracer.calls).toHaveLength(2);
  });

  it("traceEffects=false disables effect-level spans", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer, traceEffects: false });

    hook.onEffectStart("Invoke", "UserPort.getUser");
    hook.onEffectEnd(true);

    expect(tracer.calls).toHaveLength(0);
  });

  it("zero-overhead: no calls when hook is undefined", () => {
    // This tests the optional chaining pattern used in the runner
    const tracer = createMockTracer();

    // Simulating the runner's usage pattern: `tracingHook?.onTransitionStart(...)`
    // When no hook is provided, the runner uses optional chaining which short-circuits
    function simulateRunnerUsage(hook: FlowTracingHook | undefined): void {
      hook?.onTransitionStart("m1", "a", "b", "E");
      hook?.onTransitionEnd("m1", true);
      hook?.onEffectStart("Invoke", "P.m");
      hook?.onEffectEnd(true);
    }

    simulateRunnerUsage(undefined);

    // No calls should have been made to the tracer
    expect(tracer.calls).toHaveLength(0);
  });

  it("span attributes include scope_id when provided", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer, scopeId: "my-scope-42" });

    hook.onTransitionStart("m1", "idle", "active", "GO");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBe("my-scope-42");
    expect(attrs["machine_id"]).toBe("m1");
  });

  it("span attributes include trace context entries", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({
      tracer,
      traceContext: { trace_id: "abc-123", parent_span: "def-456" },
    });

    hook.onTransitionStart("m1", "a", "b", "E");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["trace_id"]).toBe("abc-123");
    expect(attrs["parent_span"]).toBe("def-456");
  });

  it("scope_id omitted when not configured", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionStart("m1", "a", "b", "E");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBeUndefined();
  });

  it("trace context entries omitted when not configured", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    hook.onTransitionStart("m1", "a", "b", "E");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(Object.keys(attrs)).toEqual(["machine_id", "from_state", "to_state", "event_type"]);
  });

  it("effect spans include scope_id and trace context", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({
      tracer,
      scopeId: "scope-1",
      traceContext: { req_id: "r1" },
    });

    hook.onEffectStart("Invoke", "Api.fetch");

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBe("scope-1");
    expect(attrs["req_id"]).toBe("r1");
    expect(attrs["effect_tag"]).toBe("Invoke");
  });

  it("shared span stack: parent-child correlation", () => {
    const tracer = createMockTracer();
    const hook = createFlowTracingHook({ tracer });

    // Push transition span (parent)
    hook.onTransitionStart("m1", "idle", "active", "START");
    // Push effect span (child)
    hook.onEffectStart("Invoke", "Api.fetch");
    // Pop effect span
    hook.onEffectEnd(true);
    // Pop transition span
    hook.onTransitionEnd("m1", true);

    expect(tracer.calls).toEqual([
      {
        method: "pushSpan",
        args: [
          "flow:m1/idle->active",
          { machine_id: "m1", from_state: "idle", to_state: "active", event_type: "START" },
        ],
      },
      {
        method: "pushSpan",
        args: ["flow:effect:Invoke:Api.fetch", { effect_tag: "Invoke", detail: "Api.fetch" }],
      },
      { method: "popSpan", args: ["ok"] },
      { method: "popSpan", args: ["ok"] },
    ]);
  });
});
