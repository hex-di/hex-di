/**
 * Global audit sink management.
 *
 * Provides a process-level audit sink that graph operations emit events to.
 * When no sink is configured, a single console.warn is emitted per process
 * lifecycle, then events are silently dropped.
 *
 * @packageDocumentation
 */

import type { AuditEvent, AuditSink } from "./types.js";

/** Sentinel value indicating no sink is configured */
const NO_SINK: unique symbol = Symbol("NO_SINK");

let currentSink: AuditSink | typeof NO_SINK = NO_SINK;
let warningEmitted = false;

/**
 * Sets the global audit sink. Call once at application startup.
 * Idempotent — calling again replaces the previous sink.
 */
export function setAuditSink(sink: AuditSink): void {
  currentSink = sink;
  warningEmitted = false;
}

/**
 * Clears the global audit sink (primarily for testing).
 */
export function clearAuditSink(): void {
  currentSink = NO_SINK;
  warningEmitted = false;
}

/**
 * Emits an audit event. If no sink is configured, emits a
 * console.warn ONCE per process and then silently drops events.
 *
 * This function NEVER throws. Audit trail failures must not
 * prevent graph operations from completing.
 */
export function emitAuditEvent(event: AuditEvent): void {
  if (currentSink === NO_SINK) {
    if (!warningEmitted) {
      const g = globalThis as Record<string, unknown>;
      const cons = g.console as { warn?: (...args: unknown[]) => void } | undefined;
      if (cons !== undefined && typeof cons.warn === "function") {
        cons.warn(
          "[@hex-di/graph] No audit sink configured. " +
            "Graph validation decisions will not be persisted. " +
            "Call setAuditSink() to enable GxP audit trail."
        );
      }
      warningEmitted = true;
    }
    return;
  }
  try {
    currentSink.emit(event);
  } catch {
    // Audit failures must NEVER prevent graph operations.
  }
}

/**
 * Returns whether an audit sink is currently configured.
 */
export function hasAuditSink(): boolean {
  return currentSink !== NO_SINK;
}
