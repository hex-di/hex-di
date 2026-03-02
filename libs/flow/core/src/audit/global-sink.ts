/**
 * Global Audit Sink Registration (GxP F3 + F9)
 *
 * Module-scoped audit sink that transitions write to.
 * Never throws — warns once if no sink is configured.
 *
 * @packageDocumentation
 */

import type { FlowAuditSink, FlowAuditRecord } from "./types.js";

// =============================================================================
// Module State
// =============================================================================

let currentSink: FlowAuditSink | undefined;
let noSinkWarned = false;

// =============================================================================
// Public API
// =============================================================================

/**
 * Registers a global audit sink for flow transition records.
 */
export function setFlowAuditSink(sink: FlowAuditSink): void {
  currentSink = sink;
  noSinkWarned = false;
}

/**
 * Clears the global audit sink (useful for tests).
 */
export function clearFlowAuditSink(): void {
  currentSink = undefined;
  noSinkWarned = false;
}

/**
 * Emits an audit record to the registered sink.
 *
 * - Never throws (swallows sink errors, warns once).
 * - Warns once if no sink is registered.
 */
export function emitFlowAuditRecord(record: FlowAuditRecord): void {
  if (currentSink === undefined) {
    if (!noSinkWarned) {
      noSinkWarned = true;
      globalThis.console.warn(
        "[@hex-di/flow] GxP: No audit sink configured. " +
          "Call setFlowAuditSink() to enable audit trail."
      );
    }
    return;
  }

  try {
    currentSink.write(record);
  } catch {
    // Audit sink must never block the runner — swallow and warn once
    globalThis.console.warn(
      "[@hex-di/flow] GxP: Audit sink threw during write. Record may be lost."
    );
  }
}
