import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { requestIdMiddleware } from "../../src/index.js";

type RequestIdEnv = { Variables: { requestId: string } };

describe("requestIdMiddleware", () => {
  it("generates a request ID when none is provided", async () => {
    const app = new Hono<RequestIdEnv>();

    app.use("*", requestIdMiddleware());

    app.get("/test", c => {
      const requestId = c.get("requestId");
      return c.json({ requestId });
    });

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe("string");
    // generateSpanId returns a 16-character hex string
    expect(body.requestId).toMatch(/^[0-9a-f]{16}$/);
  });

  it("passes through an existing request ID header", async () => {
    const app = new Hono<RequestIdEnv>();

    app.use("*", requestIdMiddleware());

    app.get("/test", c => {
      const requestId = c.get("requestId");
      return c.json({ requestId });
    });

    const res = await app.request("/test", {
      headers: { "X-Request-ID": "existing-id-123" },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBe("existing-id-123");
  });

  it("sets the response header with the request ID", async () => {
    const app = new Hono<RequestIdEnv>();

    app.use("*", requestIdMiddleware());

    app.get("/test", c => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    const header = res.headers.get("X-Request-ID");
    expect(header).toBeDefined();
    expect(header).toMatch(/^[0-9a-f]{16}$/);
  });

  it("supports a custom header name", async () => {
    const app = new Hono<RequestIdEnv>();

    app.use("*", requestIdMiddleware({ headerName: "X-Correlation-ID" }));

    app.get("/test", c => {
      const requestId = c.get("requestId");
      return c.json({ requestId });
    });

    const res = await app.request("/test", {
      headers: { "X-Correlation-ID": "corr-456" },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBe("corr-456");

    const header = res.headers.get("X-Correlation-ID");
    expect(header).toBe("corr-456");
  });
});
