/**
 * Tests for createScopedClient — context header propagation, caller override
 * precedence, and all convenience method coverage.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createScopedClient } from "../../src/context/scoped-http-client.js";
import { createRecordingClient } from "../../src/testing/recording-client.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse, mockJsonResponse } from "../../src/testing/response-factory.js";
import { get } from "../../src/request/http-request.js";

// ---------------------------------------------------------------------------
// Helper — a mock client that accepts all routes
// ---------------------------------------------------------------------------

function makePassthroughMock() {
  return createMockHttpClient((_req) => ok(mockResponse(200)));
}

// ---------------------------------------------------------------------------
// correlationId context
// ---------------------------------------------------------------------------

describe("createScopedClient — correlationId", () => {
  it("adds x-correlation-id header to GET requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-123" });

    await scoped.get("/users");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-123");
  });

  it("adds x-correlation-id header to POST requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-456" });

    await scoped.post("/users", { json: { name: "Alice" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-456");
  });

  it("adds x-correlation-id header to PUT requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-789" });

    await scoped.put("/users/1");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-789");
  });

  it("adds x-correlation-id header to PATCH requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-abc" });

    await scoped.patch("/users/1");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-abc");
  });

  it("adds x-correlation-id header to DELETE requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-del" });

    await scoped.del("/users/1");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-del");
  });

  it("adds x-correlation-id header to HEAD requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-head" });

    await scoped.head("/health");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-head");
  });

  it("adds x-correlation-id via execute()", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "req-exec" });

    await scoped.execute(get("/resource"));

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("req-exec");
  });
});

// ---------------------------------------------------------------------------
// tenantId context
// ---------------------------------------------------------------------------

describe("createScopedClient — tenantId", () => {
  it("adds x-tenant-id header to GET requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { tenantId: "acme" });

    await scoped.get("/products");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-tenant-id"]).toBe("acme");
  });

  it("adds x-tenant-id header to POST requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { tenantId: "globex" });

    await scoped.post("/orders");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-tenant-id"]).toBe("globex");
  });

  it("adds both x-correlation-id and x-tenant-id when both are set", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, {
      correlationId: "corr-001",
      tenantId: "initech",
    });

    await scoped.get("/data");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("corr-001");
    expect(req.headers.entries["x-tenant-id"]).toBe("initech");
  });
});

// ---------------------------------------------------------------------------
// Custom headers context
// ---------------------------------------------------------------------------

describe("createScopedClient — custom headers", () => {
  it("adds custom headers to all GET requests", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { headers: { "x-custom": "val" } });

    await scoped.get("/endpoint");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-custom"]).toBe("val");
  });

  it("adds multiple custom headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, {
      headers: { "x-feature": "on", "x-version": "2" },
    });

    await scoped.get("/resource");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-feature"]).toBe("on");
    expect(req.headers.entries["x-version"]).toBe("2");
  });

  it("custom headers in context override correlationId/tenantId for the same key", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    // Context headers override the built-in correlationId since headers are applied last
    const scoped = createScopedClient(inner, {
      correlationId: "original",
      headers: { "x-correlation-id": "overridden" },
    });

    await scoped.get("/data");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("overridden");
  });
});

// ---------------------------------------------------------------------------
// Caller-supplied header override precedence
// ---------------------------------------------------------------------------

describe("createScopedClient — caller headers override context headers", () => {
  it("caller-supplied headers in get() override context x-correlation-id", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "ctx-corr" });

    await scoped.get("/data", { headers: { "x-correlation-id": "caller-corr" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("caller-corr");
  });

  it("caller-supplied headers in post() override context headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { tenantId: "ctx-tenant" });

    await scoped.post("/items", { headers: { "x-tenant-id": "caller-tenant" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-tenant-id"]).toBe("caller-tenant");
  });

  it("caller can add additional headers alongside context headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "ctx-123" });

    await scoped.get("/data", { headers: { "x-extra": "extra-val" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("ctx-123");
    expect(req.headers.entries["x-extra"]).toBe("extra-val");
  });

  it("caller-supplied headers in put() override context custom headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { headers: { "x-mode": "ctx-mode" } });

    await scoped.put("/resource", { headers: { "x-mode": "caller-mode" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-mode"]).toBe("caller-mode");
  });

  it("caller-supplied headers in del() override context headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { tenantId: "ctx" });

    await scoped.del("/item", { headers: { "x-tenant-id": "caller" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-tenant-id"]).toBe("caller");
  });

  it("caller-supplied headers in head() override context headers", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, { correlationId: "ctx" });

    await scoped.head("/status", { headers: { "x-correlation-id": "caller" } });

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBe("caller");
  });
});

// ---------------------------------------------------------------------------
// Passthrough — context does not break response
// ---------------------------------------------------------------------------

describe("createScopedClient — response passthrough", () => {
  it("returns the response from the inner client unchanged", async () => {
    const inner = createMockHttpClient({
      "GET /users": mockJsonResponse(200, []),
    });
    const scoped = createScopedClient(inner, { correlationId: "id-001" });

    const result = await scoped.get("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("propagates errors from the inner client", async () => {
    const inner = createMockHttpClient({});
    const scoped = createScopedClient(inner, { correlationId: "id-002" });

    const result = await scoped.get("/missing");

    expect(result._tag).toBe("Err");
  });
});

// ---------------------------------------------------------------------------
// Empty context
// ---------------------------------------------------------------------------

describe("createScopedClient — empty context", () => {
  it("does not add spurious headers when context is empty", async () => {
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, {});

    await scoped.get("/data");

    const req = getRequests()[0].request;
    expect(req.headers.entries["x-correlation-id"]).toBeUndefined();
    expect(req.headers.entries["x-tenant-id"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Empty context — key absence (mutation-killing)
// ---------------------------------------------------------------------------

describe("createScopedClient — empty context key absence", () => {
  it("x-correlation-id key is not present in headers entries when correlationId is not set", async () => {
    // Kills the `if (context.correlationId)` → `if (true)` mutant.
    // When mutated to always-true, `headers["x-correlation-id"] = undefined` is set,
    // meaning the key EXISTS even though the value is undefined.
    // This assertion catches that: toBeUndefined() passes for both missing key and
    // undefined value, but "in" operator distinguishes them.
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, {});

    await scoped.get("/data");

    const req = getRequests()[0].request;
    expect("x-correlation-id" in req.headers.entries).toBe(false);
    expect("x-tenant-id" in req.headers.entries).toBe(false);
  });

  it("headers entries object has no keys when context is completely empty", async () => {
    // Also kills the `if (context.headers)` → `if (true)` mutant:
    // when mutated, Object.assign(headers, undefined) would be called but
    // the key count assertion differentiates empty-object assign from no-assign.
    const { client: inner, getRequests } = createRecordingClient(makePassthroughMock());
    const scoped = createScopedClient(inner, {});

    await scoped.get("/data");

    const req = getRequests()[0].request;
    expect(Object.keys(req.headers.entries)).toHaveLength(0);
  });
});
