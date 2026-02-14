/**
 * Structured warning utilities for the tracing package.
 *
 * Provides one-time warning emission for tracing-related conditions
 * (disabled tracing, fallback behaviors, insecure configurations).
 *
 * @packageDocumentation
 */

let _noTracingWarned = false;
let _warningsSuppressed = false;

/**
 * Suppress all tracing warnings.
 *
 * Call this in test environments or CI where tracing warnings
 * are intentionally not needed. Once called, all subsequent
 * warning functions become no-ops.
 *
 * @public
 */
export function suppressTracingWarnings(): void {
  _warningsSuppressed = true;
}

/**
 * Reset warning state (for tests only).
 *
 * @internal
 */
export function _resetTracingWarnings(): void {
  _noTracingWarned = false;
  _warningsSuppressed = false;
}

/**
 * Emit a one-time warning that tracing is disabled.
 *
 * Called when instrumentContainer detects a NoOp tracer, or when
 * external packages attempt to use TracerLike without a configured tracer.
 *
 * @param context - Human-readable description of where the warning was triggered
 *
 * @public
 */
export function warnTracingDisabled(context: string): void {
  if (_warningsSuppressed) return;
  if (_noTracingWarned) return;
  _noTracingWarned = true;

  emitWarning(
    `[hex-di/tracing] Tracing is disabled (NoOp tracer detected). ` +
      `Context: ${context}. ` +
      `No spans will be recorded. ` +
      `To enable tracing, register a MemoryTracer or OTel-backed tracer adapter.`
  );
}

/**
 * Safe console.warn emission for cross-platform compatibility.
 *
 * @internal
 */
function emitWarning(message: string): void {
  if (typeof globalThis !== "undefined" && "console" in globalThis) {
    const g: Record<string, unknown> = globalThis;
    const cons = g.console;
    if (cons && typeof cons === "object" && "warn" in cons) {
      const warnFn: unknown = (cons as Record<string, unknown>).warn;
      if (typeof warnFn === "function") {
        (warnFn as (msg: string) => void).call(cons, message);
      }
    }
  }
}
