/**
 * Tests for createHttpClientLibraryInspector — the LibraryInspector bridge
 * that exposes HttpClientSnapshot fields via the container inspection protocol.
 */

import { describe, it, expect } from "vitest";
import {
  createHttpClientLibraryInspector,
  HttpClientLibraryInspectorPort,
} from "../../src/inspection/library-inspector-bridge.js";
import type { HttpClientSnapshot } from "../../src/inspection/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides?: Partial<HttpClientSnapshot>): HttpClientSnapshot {
  return {
    requestCount: 0,
    errorCount: 0,
    activeRequests: 0,
    registeredClients: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// HttpClientLibraryInspectorPort
// ---------------------------------------------------------------------------

describe("HttpClientLibraryInspectorPort", () => {
  it("is defined", () => {
    expect(HttpClientLibraryInspectorPort).toBeDefined();
  });

  it("has __portName 'HttpClientLibraryInspector'", () => {
    expect(HttpClientLibraryInspectorPort.__portName).toBe("HttpClientLibraryInspector");
  });

  it("is a frozen object", () => {
    expect(Object.isFrozen(HttpClientLibraryInspectorPort)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createHttpClientLibraryInspector — identity and naming
// ---------------------------------------------------------------------------

describe("createHttpClientLibraryInspector — identity", () => {
  it("returns a LibraryInspector with name 'http-client'", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    expect(inspector.name).toBe("http-client");
  });

  it("exposes a getSnapshot method", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    expect(typeof inspector.getSnapshot).toBe("function");
  });

  it("does not expose a subscribe method (pull-only)", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    expect(inspector.subscribe).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getSnapshot — snapshot field projection
// ---------------------------------------------------------------------------

describe("createHttpClientLibraryInspector — getSnapshot()", () => {
  it("includes 'name' field with value 'http-client'", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    const snap = inspector.getSnapshot();
    expect(snap["name"]).toBe("http-client");
  });

  it("includes requestCount from the source snapshot", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ requestCount: 42 }));
    const snap = inspector.getSnapshot();
    expect(snap["requestCount"]).toBe(42);
  });

  it("includes errorCount from the source snapshot", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ errorCount: 5 }));
    const snap = inspector.getSnapshot();
    expect(snap["errorCount"]).toBe(5);
  });

  it("includes activeRequests from the source snapshot", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ activeRequests: 3 }));
    const snap = inspector.getSnapshot();
    expect(snap["activeRequests"]).toBe(3);
  });

  it("includes registeredClients from the source snapshot", () => {
    const inspector = createHttpClientLibraryInspector(() =>
      makeSnapshot({ registeredClients: ["primary", "fallback"] }),
    );
    const snap = inspector.getSnapshot();
    expect(snap["registeredClients"]).toEqual(["primary", "fallback"]);
  });

  it("returns an empty registeredClients array when no clients are registered", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    const snap = inspector.getSnapshot();
    expect(snap["registeredClients"]).toEqual([]);
  });

  it("returned snapshot is frozen", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ requestCount: 1 }));
    const snap = inspector.getSnapshot();
    expect(Object.isFrozen(snap)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSnapshot — live source function
// ---------------------------------------------------------------------------

describe("createHttpClientLibraryInspector — live source function", () => {
  it("calls the source function on every getSnapshot() call", () => {
    let callCount = 0;
    const inspector = createHttpClientLibraryInspector(() => {
      callCount++;
      return makeSnapshot({ requestCount: callCount });
    });

    inspector.getSnapshot();
    inspector.getSnapshot();
    inspector.getSnapshot();

    expect(callCount).toBe(3);
  });

  it("reflects updated values when source function returns different data", () => {
    let count = 0;
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ requestCount: ++count }));

    const snap1 = inspector.getSnapshot();
    const snap2 = inspector.getSnapshot();

    expect(snap1["requestCount"]).toBe(1);
    expect(snap2["requestCount"]).toBe(2);
  });

  it("projections remain independent across calls", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot({ errorCount: 7 }));

    const snap1 = inspector.getSnapshot();
    const snap2 = inspector.getSnapshot();

    expect(snap1).not.toBe(snap2);
    expect(snap1["errorCount"]).toBe(7);
    expect(snap2["errorCount"]).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// getSnapshot — snapshot contains only expected keys
// ---------------------------------------------------------------------------

describe("createHttpClientLibraryInspector — snapshot keys", () => {
  it("snapshot contains exactly the expected keys", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    const snap = inspector.getSnapshot();
    const keys = Object.keys(snap).sort();

    expect(keys).toEqual(
      ["activeRequests", "errorCount", "name", "registeredClients", "requestCount"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Mutant-killing tests — library-inspector-bridge.ts
// ---------------------------------------------------------------------------

describe("createHttpClientLibraryInspector — name literal independence (kills StringLiteral mutant)", () => {
  it("inspector.name and snapshot name are both independently 'http-client'", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());

    // Test the outer object's name property directly
    const outerName: string = inspector.name;
    expect(outerName).toBe("http-client");

    // Test the snapshot's name field directly in a separate assertion
    const snap = inspector.getSnapshot();
    const snapName: unknown = snap["name"];
    expect(snapName).toBe("http-client");

    // Verify they are the same value (but each tested independently)
    expect(outerName).toBe(snapName);
  });

  it("inspector.name is exactly the string 'http-client' (not empty, not 'http_client')", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    expect(inspector.name).not.toBe("");
    expect(inspector.name).not.toBe("http_client");
    expect(inspector.name).not.toBe("httpclient");
    expect(inspector.name).toBe("http-client");
  });

  it("snapshot name field is exactly the string 'http-client' (not empty, not 'http_client')", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    const snap = inspector.getSnapshot();
    expect(snap["name"]).not.toBe("");
    expect(snap["name"]).not.toBe("http_client");
    expect(snap["name"]).not.toBe("httpclient");
    expect(snap["name"]).toBe("http-client");
  });

  it("snapshot name is consistent across multiple getSnapshot() calls", () => {
    const inspector = createHttpClientLibraryInspector(() => makeSnapshot());
    const snap1 = inspector.getSnapshot();
    const snap2 = inspector.getSnapshot();
    const snap3 = inspector.getSnapshot();
    expect(snap1["name"]).toBe("http-client");
    expect(snap2["name"]).toBe("http-client");
    expect(snap3["name"]).toBe("http-client");
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing: port name is "HttpClientLibraryInspector" (StringLiteral mutant)
// ---------------------------------------------------------------------------
//
// Stryker mutates the name argument `"HttpClientLibraryInspector"` to `""` in
// the createLibraryInspectorPort call. This test explicitly verifies the port name
// is not empty and equals "HttpClientLibraryInspector".

describe("HttpClientLibraryInspectorPort — name identity (kills StringLiteral mutant)", () => {
  it("__portName is exactly 'HttpClientLibraryInspector' (not empty)", () => {
    // With mutant `""`, __portName would be "" — this assertion fails.
    expect(HttpClientLibraryInspectorPort.__portName).not.toBe("");
    expect(HttpClientLibraryInspectorPort.__portName).toBe("HttpClientLibraryInspector");
  });

  it("__portName length is greater than zero", () => {
    // Direct length check ensures the empty-string mutant is caught.
    expect(HttpClientLibraryInspectorPort.__portName.length).toBeGreaterThan(0);
  });

  it("__portName starts with 'HttpClient'", () => {
    // Additional structural assertion to strengthen the kill condition.
    expect(HttpClientLibraryInspectorPort.__portName.startsWith("HttpClient")).toBe(true);
  });

  it("__portName ends with 'Inspector'", () => {
    expect(HttpClientLibraryInspectorPort.__portName.endsWith("Inspector")).toBe(true);
  });
});
