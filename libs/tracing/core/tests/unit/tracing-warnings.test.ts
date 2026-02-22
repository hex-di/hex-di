/**
 * Tests for tracing warnings utility.
 *
 * Verifies one-time warning emission and suppression.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { warnTracingDisabled, suppressTracingWarnings } from "../../src/utils/tracing-warnings.js";
import { _resetTracingWarnings } from "../../src/utils/tracing-warnings.js";

/**
 * Access console.warn through globalThis in a type-safe way.
 * The tracing package uses ES2022 lib without dom, so console
 * isn't directly typed.
 */
function getGlobalConsole(): Record<string, unknown> {
  // globalThis.console is always available in Node.js runtime.
  // We use Record<string, unknown> because the tracing package's
  // tsconfig doesn't include the 'dom' lib.
  const g: Record<string, unknown> = globalThis;
  return g.console as Record<string, unknown>;
}

describe("warnTracingDisabled", () => {
  let warnSpy: ReturnType<typeof vi.fn>;
  let originalWarn: unknown;

  beforeEach(() => {
    _resetTracingWarnings();
    const cons = getGlobalConsole();
    if (cons) {
      originalWarn = cons.warn;
      warnSpy = vi.fn();
      cons.warn = warnSpy;
    }
  });

  afterEach(() => {
    const cons = getGlobalConsole();
    if (cons && originalWarn !== undefined) {
      cons.warn = originalWarn;
    }
  });

  it("should emit a warning on first call", () => {
    warnTracingDisabled("test-context");

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Tracing is disabled"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("test-context"));
  });

  it("should emit warning only once", () => {
    warnTracingDisabled("first");
    warnTracingDisabled("second");
    warnTracingDisabled("third");

    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("should not emit when warnings are suppressed", () => {
    suppressTracingWarnings();
    warnTracingDisabled("suppressed");

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("should include guidance on enabling tracing", () => {
    warnTracingDisabled("test");

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("MemoryTracer"));
  });
});
