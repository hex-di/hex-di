/**
 * Tests for createHttpClientRegistry — register, get, list, and unregister
 * named client instances.
 */

import { describe, it, expect } from "vitest";
import { createHttpClientRegistry } from "../../src/inspection/registry.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { ok } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockClient(status = 200) {
  return createMockHttpClient((_req) => ok(mockResponse(status)));
}

// ---------------------------------------------------------------------------
// register / get
// ---------------------------------------------------------------------------

describe("createHttpClientRegistry — register and get", () => {
  it("register then get returns the registered client", () => {
    const registry = createHttpClientRegistry();
    const client = makeMockClient();

    registry.register("default", client);

    expect(registry.get("default")).toBe(client);
  });

  it("get returns undefined for an unregistered name", () => {
    const registry = createHttpClientRegistry();

    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("re-registering a name overwrites the previous client", () => {
    const registry = createHttpClientRegistry();
    const first = makeMockClient(200);
    const second = makeMockClient(201);

    registry.register("api", first);
    registry.register("api", second);

    expect(registry.get("api")).toBe(second);
  });

  it("multiple distinct names are stored independently", () => {
    const registry = createHttpClientRegistry();
    const a = makeMockClient();
    const b = makeMockClient();

    registry.register("service-a", a);
    registry.register("service-b", b);

    expect(registry.get("service-a")).toBe(a);
    expect(registry.get("service-b")).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// unregister
// ---------------------------------------------------------------------------

describe("createHttpClientRegistry — unregister", () => {
  it("unregister removes the client so get returns undefined", () => {
    const registry = createHttpClientRegistry();
    const client = makeMockClient();

    registry.register("temp", client);
    registry.unregister("temp");

    expect(registry.get("temp")).toBeUndefined();
  });

  it("unregistering a name that was never registered does not throw", () => {
    const registry = createHttpClientRegistry();

    expect(() => registry.unregister("ghost")).not.toThrow();
  });

  it("unregister only removes the named client, not others", () => {
    const registry = createHttpClientRegistry();
    const a = makeMockClient();
    const b = makeMockClient();

    registry.register("a", a);
    registry.register("b", b);
    registry.unregister("a");

    expect(registry.get("a")).toBeUndefined();
    expect(registry.get("b")).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// getAll
// ---------------------------------------------------------------------------

describe("createHttpClientRegistry — getAll", () => {
  it("returns an empty object when no clients are registered", () => {
    const registry = createHttpClientRegistry();
    expect(registry.getAll()).toEqual({});
  });

  it("returns all registered clients as a record", () => {
    const registry = createHttpClientRegistry();
    const a = makeMockClient();
    const b = makeMockClient();

    registry.register("alpha", a);
    registry.register("beta", b);

    const all = registry.getAll();
    expect(all["alpha"]).toBe(a);
    expect(all["beta"]).toBe(b);
  });

  it("returned record is frozen (immutable)", () => {
    const registry = createHttpClientRegistry();
    registry.register("x", makeMockClient());

    const all = registry.getAll();
    expect(Object.isFrozen(all)).toBe(true);
  });

  it("does not reflect subsequent mutations on the returned snapshot", () => {
    const registry = createHttpClientRegistry();
    const a = makeMockClient();

    registry.register("a", a);
    const snap1 = registry.getAll();

    registry.register("b", makeMockClient());
    const snap2 = registry.getAll();

    expect(Object.keys(snap1)).toHaveLength(1);
    expect(Object.keys(snap2)).toHaveLength(2);
  });

  it("reflects unregistered clients — removed client absent from getAll()", () => {
    const registry = createHttpClientRegistry();
    registry.register("to-remove", makeMockClient());
    registry.register("to-keep", makeMockClient());
    registry.unregister("to-remove");

    const all = registry.getAll();
    expect("to-remove" in all).toBe(false);
    expect("to-keep" in all).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getNames
// ---------------------------------------------------------------------------

describe("createHttpClientRegistry — getNames", () => {
  it("returns an empty array when no clients are registered", () => {
    const registry = createHttpClientRegistry();
    expect(registry.getNames()).toHaveLength(0);
  });

  it("returns the names of all registered clients", () => {
    const registry = createHttpClientRegistry();

    registry.register("primary", makeMockClient());
    registry.register("secondary", makeMockClient());

    const names = registry.getNames();
    expect(names).toContain("primary");
    expect(names).toContain("secondary");
    expect(names).toHaveLength(2);
  });

  it("does not include unregistered client names", () => {
    const registry = createHttpClientRegistry();
    registry.register("a", makeMockClient());
    registry.register("b", makeMockClient());
    registry.unregister("a");

    const names = registry.getNames();
    expect(names).not.toContain("a");
    expect(names).toContain("b");
  });

  it("returned names array is frozen", () => {
    const registry = createHttpClientRegistry();
    registry.register("svc", makeMockClient());

    const names = registry.getNames();
    expect(Object.isFrozen(names)).toBe(true);
  });
});
