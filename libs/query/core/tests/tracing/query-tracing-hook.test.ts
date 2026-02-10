/**
 * QueryTracingHook Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createQueryTracingHook } from "../../src/tracing/query-tracing-hook.js";
import type { TracerLike, QueryTracingHook } from "../../src/tracing/types.js";

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

describe("QueryTracingHook", () => {
  it("onFetchStart creates span with correct name format", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", '{"id":1}', {
      cacheHit: false,
      deduplicated: false,
      staleTimeMs: 5000,
    });

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("pushSpan");
    expect(tracer.calls[0]?.args[0]).toBe("query:fetch:Users");
  });

  it("onFetchStart sets correct attributes", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", '{"id":1}', {
      cacheHit: false,
      deduplicated: false,
      staleTimeMs: 5000,
    });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs).toEqual({
      "hex-di.query.port.name": "Users",
      "hex-di.query.params": '{"id":1}',
      "hex-di.query.cache_hit": "false",
      "hex-di.query.deduplicated": "false",
      "hex-di.query.stale_time_ms": "5000",
    });
  });

  it("onFetchStart sets cache_hit=true for cache hits", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", "{}", { cacheHit: true, deduplicated: false, staleTimeMs: 0 });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["hex-di.query.cache_hit"]).toBe("true");
  });

  it("onFetchEnd calls popSpan with 'ok' on success", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchEnd("Users", true);

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("popSpan");
    expect(tracer.calls[0]?.args[0]).toBe("ok");
  });

  it("onFetchEnd calls popSpan with 'error' on failure", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchEnd("Users", false);

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("popSpan");
    expect(tracer.calls[0]?.args[0]).toBe("error");
  });

  it("onMutationStart creates span with correct name format", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onMutationStart("CreateUser", '{"name":"Alice"}', { portName: "CreateUser" });

    expect(tracer.calls).toHaveLength(1);
    expect(tracer.calls[0]?.method).toBe("pushSpan");
    expect(tracer.calls[0]?.args[0]).toBe("query:mutate:CreateUser");
  });

  it("onMutationStart sets correct attributes", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onMutationStart("CreateUser", '{"name":"Alice"}', { portName: "CreateUser" });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs).toEqual({
      "hex-di.query.port.name": "CreateUser",
      "hex-di.query.input": '{"name":"Alice"}',
    });
  });

  it("onMutationEnd calls popSpan with correct status", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onMutationEnd("CreateUser", true);
    expect(tracer.calls[0]?.args[0]).toBe("ok");

    hook.onMutationEnd("CreateUser", false);
    expect(tracer.calls[1]?.args[0]).toBe("error");
  });

  it("filter option excludes specific port names", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({
      tracer,
      filter: portName => portName !== "Internal",
    });

    hook.onFetchStart("Internal", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });
    expect(tracer.calls).toHaveLength(0);

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });
    expect(tracer.calls).toHaveLength(1);

    // onFetchEnd also respects filter
    hook.onFetchEnd("Internal", true);
    expect(tracer.calls).toHaveLength(1);

    hook.onFetchEnd("Users", true);
    expect(tracer.calls).toHaveLength(2);
  });

  it("filter applies to mutations", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({
      tracer,
      filter: portName => portName !== "Excluded",
    });

    hook.onMutationStart("Excluded", "{}", { portName: "Excluded" });
    expect(tracer.calls).toHaveLength(0);

    hook.onMutationEnd("Excluded", true);
    expect(tracer.calls).toHaveLength(0);

    hook.onMutationStart("Included", "{}", { portName: "Included" });
    expect(tracer.calls).toHaveLength(1);
  });

  it("traceMutations=false disables mutation-level spans", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer, traceMutations: false });

    hook.onMutationStart("CreateUser", "{}", { portName: "CreateUser" });
    hook.onMutationEnd("CreateUser", true);

    expect(tracer.calls).toHaveLength(0);

    // Fetch spans still work
    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });
    expect(tracer.calls).toHaveLength(1);
  });

  it("zero-overhead: no calls when hook is undefined", () => {
    const tracer = createMockTracer();

    function simulateClientUsage(hook: QueryTracingHook | undefined): void {
      hook?.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });
      hook?.onFetchEnd("Users", true);
      hook?.onMutationStart("Create", "{}", { portName: "Create" });
      hook?.onMutationEnd("Create", true);
    }

    simulateClientUsage(undefined);

    expect(tracer.calls).toHaveLength(0);
  });

  it("span attributes include scope_id when provided", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer, scopeId: "request-42" });

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBe("request-42");
    expect(attrs["hex-di.query.port.name"]).toBe("Users");
  });

  it("span attributes include trace context entries", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({
      tracer,
      traceContext: { trace_id: "abc-123", parent_span: "def-456" },
    });

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["trace_id"]).toBe("abc-123");
    expect(attrs["parent_span"]).toBe("def-456");
  });

  it("scope_id omitted when not configured", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBeUndefined();
  });

  it("trace context entries omitted when not configured", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 0 });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(Object.keys(attrs)).toEqual([
      "hex-di.query.port.name",
      "hex-di.query.params",
      "hex-di.query.cache_hit",
      "hex-di.query.deduplicated",
      "hex-di.query.stale_time_ms",
    ]);
  });

  it("mutation spans include scope_id and trace context", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({
      tracer,
      scopeId: "scope-1",
      traceContext: { req_id: "r1" },
    });

    hook.onMutationStart("CreateUser", "{}", { portName: "CreateUser" });

    const attrs = tracer.calls[0]?.args[1] as Record<string, string>;
    expect(attrs["scope_id"]).toBe("scope-1");
    expect(attrs["req_id"]).toBe("r1");
    expect(attrs["hex-di.query.port.name"]).toBe("CreateUser");
  });

  it("shared span stack: fetch push then pop correlation", () => {
    const tracer = createMockTracer();
    const hook = createQueryTracingHook({ tracer });

    hook.onFetchStart("Users", "{}", { cacheHit: false, deduplicated: false, staleTimeMs: 5000 });
    hook.onFetchEnd("Users", true);

    expect(tracer.calls).toEqual([
      {
        method: "pushSpan",
        args: [
          "query:fetch:Users",
          {
            "hex-di.query.port.name": "Users",
            "hex-di.query.params": "{}",
            "hex-di.query.cache_hit": "false",
            "hex-di.query.deduplicated": "false",
            "hex-di.query.stale_time_ms": "5000",
          },
        ],
      },
      { method: "popSpan", args: ["ok"] },
    ]);
  });
});
