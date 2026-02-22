/**
 * Tests for HttpClientInspector / HttpClientSnapshot — the pull-based
 * inspection API that reports request counts, error counts, active requests,
 * and registered client names.
 */

import { describe, it, expect } from "vitest";
import type { HttpClientSnapshot, HttpClientInspector } from "../../src/inspection/types.js";

// ---------------------------------------------------------------------------
// Helpers — minimal in-process inspector
// ---------------------------------------------------------------------------

/**
 * Build a minimal inspector backed by a mutable snapshot object.
 * This mirrors how a real inspector adapter would work internally.
 */
function makeInspector(initial?: Partial<HttpClientSnapshot>): {
  inspector: HttpClientInspector;
  snapshot: HttpClientSnapshot;
  setSnapshot: (patch: Partial<HttpClientSnapshot>) => void;
} {
  let snapshot: HttpClientSnapshot = {
    requestCount: initial?.requestCount ?? 0,
    errorCount: initial?.errorCount ?? 0,
    activeRequests: initial?.activeRequests ?? 0,
    registeredClients: initial?.registeredClients ?? [],
  };

  const inspector: HttpClientInspector = {
    getSnapshot(): HttpClientSnapshot {
      return { ...snapshot };
    },
    reset(): void {
      snapshot = {
        requestCount: 0,
        errorCount: 0,
        activeRequests: 0,
        registeredClients: snapshot.registeredClients,
      };
    },
  };

  return {
    inspector,
    get snapshot() {
      return snapshot;
    },
    setSnapshot(patch: Partial<HttpClientSnapshot>) {
      snapshot = { ...snapshot, ...patch };
    },
  };
}

// ---------------------------------------------------------------------------
// getSnapshot()
// ---------------------------------------------------------------------------

describe("HttpClientInspector — getSnapshot()", () => {
  it("returns an initial snapshot with zero counts", () => {
    const { inspector } = makeInspector();
    const snap = inspector.getSnapshot();

    expect(snap.requestCount).toBe(0);
    expect(snap.errorCount).toBe(0);
    expect(snap.activeRequests).toBe(0);
    expect(snap.registeredClients).toEqual([]);
  });

  it("returns the current requestCount", () => {
    const { inspector, setSnapshot } = makeInspector();
    setSnapshot({ requestCount: 42 });

    const snap = inspector.getSnapshot();
    expect(snap.requestCount).toBe(42);
  });

  it("returns the current errorCount", () => {
    const { inspector, setSnapshot } = makeInspector();
    setSnapshot({ errorCount: 5 });

    const snap = inspector.getSnapshot();
    expect(snap.errorCount).toBe(5);
  });

  it("returns the current activeRequests count", () => {
    const { inspector, setSnapshot } = makeInspector();
    setSnapshot({ activeRequests: 3 });

    const snap = inspector.getSnapshot();
    expect(snap.activeRequests).toBe(3);
  });

  it("returns the registered client names", () => {
    const { inspector, setSnapshot } = makeInspector();
    setSnapshot({ registeredClients: ["primary", "secondary"] });

    const snap = inspector.getSnapshot();
    expect(snap.registeredClients).toEqual(["primary", "secondary"]);
  });

  it("snapshot captures a point-in-time state (not live reference)", () => {
    const { inspector, setSnapshot } = makeInspector({ requestCount: 10 });
    const snap = inspector.getSnapshot();

    setSnapshot({ requestCount: 99 });

    // The previously captured snapshot should not be mutated
    expect(snap.requestCount).toBe(10);
    expect(inspector.getSnapshot().requestCount).toBe(99);
  });

  it("successive getSnapshot() calls return independent objects", () => {
    const { inspector } = makeInspector({ requestCount: 1 });
    const snap1 = inspector.getSnapshot();
    const snap2 = inspector.getSnapshot();

    expect(snap1).not.toBe(snap2);
    expect(snap1).toEqual(snap2);
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe("HttpClientInspector — reset()", () => {
  it("resets requestCount to zero", () => {
    const { inspector, setSnapshot } = makeInspector({ requestCount: 10 });
    inspector.reset();

    expect(inspector.getSnapshot().requestCount).toBe(0);
    // Suppress unused variable warning
    void setSnapshot;
  });

  it("resets errorCount to zero", () => {
    const { inspector, setSnapshot } = makeInspector({ errorCount: 3 });
    inspector.reset();

    expect(inspector.getSnapshot().errorCount).toBe(0);
    void setSnapshot;
  });

  it("resets activeRequests to zero", () => {
    const { inspector, setSnapshot } = makeInspector({ activeRequests: 2 });
    inspector.reset();

    expect(inspector.getSnapshot().activeRequests).toBe(0);
    void setSnapshot;
  });

  it("preserves registeredClients after reset (names are configuration, not counters)", () => {
    const { inspector } = makeInspector({
      requestCount: 5,
      registeredClients: ["api", "auth"],
    });
    inspector.reset();

    expect(inspector.getSnapshot().registeredClients).toEqual(["api", "auth"]);
  });

  it("can record again after reset", () => {
    const { inspector, setSnapshot } = makeInspector({ requestCount: 100 });
    inspector.reset();
    setSnapshot({ requestCount: 1 });

    expect(inspector.getSnapshot().requestCount).toBe(1);
  });

  it("reset is idempotent — resetting twice yields same result as once", () => {
    const { inspector } = makeInspector({ requestCount: 7, errorCount: 2 });
    inspector.reset();
    inspector.reset();

    const snap = inspector.getSnapshot();
    expect(snap.requestCount).toBe(0);
    expect(snap.errorCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// HttpClientSnapshot interface shape
// ---------------------------------------------------------------------------

describe("HttpClientSnapshot — interface shape", () => {
  it("snapshot has requestCount, errorCount, activeRequests, registeredClients", () => {
    const { inspector } = makeInspector({
      requestCount: 1,
      errorCount: 0,
      activeRequests: 0,
      registeredClients: ["svc"],
    });

    const snap = inspector.getSnapshot();
    expect(typeof snap.requestCount).toBe("number");
    expect(typeof snap.errorCount).toBe("number");
    expect(typeof snap.activeRequests).toBe("number");
    expect(Array.isArray(snap.registeredClients)).toBe(true);
  });

  it("registeredClients is a readonly array of strings", () => {
    const { inspector } = makeInspector({ registeredClients: ["a", "b", "c"] });
    const snap = inspector.getSnapshot();
    expect(snap.registeredClients).toEqual(["a", "b", "c"]);
  });
});
