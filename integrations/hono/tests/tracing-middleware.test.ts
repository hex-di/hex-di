import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMemoryTracer } from "@hex-di/tracing";
import { tracingMiddleware } from "../src/index.js";

describe("tracingMiddleware", () => {
  let tracer: ReturnType<typeof createMemoryTracer>;

  beforeEach(() => {
    tracer = createMemoryTracer();
  });

  it("creates a server span for each request", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/users", c => {
      return c.json({ users: [] });
    });

    const response = await app.request("/users");

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.name).toBe("GET /users");
    expect(span.kind).toBe("server");
    expect(span.attributes["http.method"]).toBe("GET");
    expect(span.attributes["http.target"]).toBe("/users");
    expect(span.attributes["http.status_code"]).toBe(200);
  });

  it("extracts traceparent header from incoming request", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/test", c => c.json({ ok: true }));

    const response = await app.request("/test", {
      headers: {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    // Extracted context should be recorded as attributes
    expect(span.attributes["http.request.traceparent.trace_id"]).toBe(
      "4bf92f3577b34da6a3ce929d0e0e4736"
    );
    expect(span.attributes["http.request.traceparent.span_id"]).toBe("00f067aa0ba902b7");
    expect(span.attributes["http.request.traceparent.trace_flags"]).toBe(1);
  });

  it("sets error status when handler returns 500 response", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/error", () => {
      throw new Error("Something went wrong");
    });

    const response = await app.request("/error");

    expect(response.status).toBeGreaterThanOrEqual(500);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.status).toBe("error");
    expect(span.attributes["http.status_code"]).toBeGreaterThanOrEqual(500);

    // Note: Hono catches errors internally and returns 500, so the middleware
    // doesn't see the actual exception - it only sees the 500 response.
    // Exception events are only recorded when errors escape to the middleware.
  });

  it("sets error status for 5xx responses even without exceptions", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/server-error", c => {
      return c.json({ error: "Internal error" }, 500);
    });

    const response = await app.request("/server-error");

    expect(response.status).toBe(500);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.status).toBe("error");
  });

  it("injects trace context into response headers", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/test", c => c.json({ ok: true }));

    const response = await app.request("/test");

    expect(response.status).toBe(200);

    // Check that traceparent header was injected
    const traceparent = response.headers.get("traceparent");
    expect(traceparent).toBeDefined();
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });

  it("respects extractContext: false option", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer, extractContext: false }));

    app.get("/test", c => c.json({ ok: true }));

    const response = await app.request("/test", {
      headers: {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      },
    });

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    // Should NOT have extracted traceparent attributes
    expect(span.attributes["http.request.traceparent.trace_id"]).toBeUndefined();
  });

  it("respects injectContext: false option", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer, injectContext: false }));

    app.get("/test", c => c.json({ ok: true }));

    const response = await app.request("/test");

    expect(response.status).toBe(200);

    // Should NOT have traceparent header
    const traceparent = response.headers.get("traceparent");
    expect(traceparent).toBeNull();
  });

  it("supports custom spanName function", async () => {
    const app = new Hono();

    app.use(
      "*",
      tracingMiddleware({
        tracer,
        spanName: c => `Custom: ${c.req.method} ${c.req.path}`,
      })
    );

    app.get("/users", c => c.json({ users: [] }));

    const response = await app.request("/users");

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.name).toBe("Custom: GET /users");
  });

  it("supports custom attributes function", async () => {
    const app = new Hono();

    app.use(
      "*",
      tracingMiddleware({
        tracer,
        attributes: c => ({
          "custom.path": c.req.path,
          "custom.host": c.req.header("host") ?? "unknown",
        }),
      })
    );

    app.get("/test", c => c.json({ ok: true }));

    const response = await app.request("/test", {
      headers: {
        host: "example.com",
      },
    });

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.attributes["custom.path"]).toBe("/test");
    expect(span.attributes["custom.host"]).toBe("example.com");
  });

  it("always ends span even if handler throws", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/error", () => {
      throw new Error("Test error");
    });

    await app.request("/error");

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    // Span should be ended (has endTime)
    const span = spans[0];
    expect(span.endTime).toBeGreaterThan(0);
    expect(span.endTime).toBeGreaterThanOrEqual(span.startTime);
  });

  it("handles multiple requests with separate spans", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/users", c => c.json({ users: [] }));
    app.post("/users", c => c.json({ created: true }));

    await app.request("/users");
    await app.request("/users", { method: "POST" });

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(2);

    expect(spans[0].name).toBe("GET /users");
    expect(spans[0].attributes["http.method"]).toBe("GET");

    expect(spans[1].name).toBe("POST /users");
    expect(spans[1].attributes["http.method"]).toBe("POST");
  });

  it("records full URL in http.url attribute", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/search", c => c.json({ results: [] }));

    const response = await app.request("http://example.com/search?q=test");

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.attributes["http.url"]).toBe("http://example.com/search?q=test");
  });

  it("works with async handlers", async () => {
    const app = new Hono();

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/async", async c => {
      // Just use a simple async operation without setTimeout
      await Promise.resolve();
      return c.json({ async: true });
    });

    const response = await app.request("/async");

    expect(response.status).toBe(200);

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.name).toBe("GET /async");
    expect(span.attributes["http.status_code"]).toBe(200);
  });

  it("records exceptions when middleware itself fails", async () => {
    const app = new Hono();

    let failInMiddleware = false;

    app.use("*", async (c, next) => {
      if (failInMiddleware) {
        throw new Error("Middleware failure");
      }
      await next();
    });

    app.use("*", tracingMiddleware({ tracer }));

    app.get("/test", c => c.json({ ok: true }));

    // First request succeeds
    await app.request("/test");
    expect(tracer.getCollectedSpans()).toHaveLength(1);

    // Second request fails in middleware before tracing middleware
    failInMiddleware = true;
    const response = await app.request("/test");
    expect(response.status).toBeGreaterThanOrEqual(500);

    // No new span created because error happened before tracing middleware
    expect(tracer.getCollectedSpans()).toHaveLength(1);
  });
});
