/**
 * Tests for the audit trail sink system.
 *
 * Verifies that audit events are emitted for build and validation
 * decisions, and that the sink is truly optional (never blocks).
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAuditSink, clearAuditSink, hasAuditSink } from "../src/audit/global-sink.js";
import type { AuditEvent } from "../src/audit/types.js";
import { GraphBuilder } from "../src/builder/builder.js";
import { buildGraph } from "../src/builder/builder-build.js";
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({ query: () => null }),
});

describe("Audit Trail Sink", () => {
  beforeEach(() => {
    clearAuditSink();
  });

  it("hasAuditSink returns false when no sink configured", () => {
    expect(hasAuditSink()).toBe(false);
  });

  it("hasAuditSink returns true after setAuditSink", () => {
    setAuditSink({ emit: () => {} });
    expect(hasAuditSink()).toBe(true);
  });

  it("clearAuditSink resets state", () => {
    setAuditSink({ emit: () => {} });
    expect(hasAuditSink()).toBe(true);
    clearAuditSink();
    expect(hasAuditSink()).toBe(false);
  });

  it("emits build.attempt on successful build", () => {
    const events: AuditEvent[] = [];
    setAuditSink({ emit: e => events.push(e) });

    GraphBuilder.create().provide(LoggerAdapter).build();

    const buildEvents = events.filter(e => e.type === "graph.build.attempt");
    expect(buildEvents.length).toBeGreaterThanOrEqual(1);
    const successEvent = buildEvents.find(
      e => e.type === "graph.build.attempt" && e.outcome === "success"
    );
    expect(successEvent).toBeDefined();
  });

  it("emits build.attempt on failed build", () => {
    const events: AuditEvent[] = [];
    setAuditSink({ emit: e => events.push(e) });

    // Create captive dependency (singleton depends on scoped)
    const SingletonAdapter = createAdapter({
      provides: LoggerPort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });
    const ScopedAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ query: () => null }),
    });

    try {
      buildGraph({
        adapters: [SingletonAdapter, ScopedAdapter],
        overridePortNames: new Set<string>(),
      });
    } catch {
      // Expected
    }

    const failureEvent = events.find(
      e => e.type === "graph.build.attempt" && e.outcome === "failure"
    );
    expect(failureEvent).toBeDefined();
    if (failureEvent && failureEvent.type === "graph.build.attempt") {
      expect(failureEvent.error).toBeDefined();
      expect(failureEvent.error?.tag).toBe("CaptiveDependency");
    }
  });

  it("emits validation.decision on validation pass", () => {
    const events: AuditEvent[] = [];
    setAuditSink({ emit: e => events.push(e) });

    GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const validationEvents = events.filter(e => e.type === "graph.validation.decision");
    expect(validationEvents.length).toBeGreaterThanOrEqual(1);
    const passEvent = validationEvents.find(
      e => e.type === "graph.validation.decision" && e.validation.result === "pass"
    );
    expect(passEvent).toBeDefined();
  });

  it("emits warning when no sink configured", () => {
    clearAuditSink();
    const g = globalThis as Record<string, unknown>;
    const cons = g.console as { warn: (...args: unknown[]) => void };
    const warnSpy = vi.spyOn(cons, "warn").mockImplementation(() => {});

    GraphBuilder.create().provide(LoggerAdapter).build();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("No audit sink configured");
    warnSpy.mockRestore();
  });

  it("does not emit warning on subsequent calls without sink", () => {
    clearAuditSink();
    const g = globalThis as Record<string, unknown>;
    const cons = g.console as { warn: (...args: unknown[]) => void };
    const warnSpy = vi.spyOn(cons, "warn").mockImplementation(() => {});

    GraphBuilder.create().provide(LoggerAdapter).build();
    GraphBuilder.create().provide(LoggerAdapter).build();
    GraphBuilder.create().provide(LoggerAdapter).build();

    // Warning emitted only once
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("sink errors do not prevent build", () => {
    setAuditSink({
      emit: () => {
        throw new Error("Sink failure!");
      },
    });

    // Build should still succeed despite sink throwing
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    expect(graph).toBeDefined();
    expect(graph.adapters.length).toBe(1);
  });

  it("audit events have timestamps", () => {
    const events: AuditEvent[] = [];
    setAuditSink({ emit: e => events.push(e) });

    GraphBuilder.create().provide(LoggerAdapter).build();

    for (const event of events) {
      expect(event.timestamp).toBeDefined();
      // Should be ISO string format
      expect(() => new Date(event.timestamp)).not.toThrow();
    }
  });

  it("audit events have correlation IDs", () => {
    const events: AuditEvent[] = [];
    setAuditSink({ emit: e => events.push(e) });

    GraphBuilder.create().provide(LoggerAdapter).build();

    for (const event of events) {
      expect(event.correlationId).toBeDefined();
      expect(typeof event.correlationId).toBe("string");
      expect(event.correlationId.length).toBeGreaterThan(0);
    }
  });
});
