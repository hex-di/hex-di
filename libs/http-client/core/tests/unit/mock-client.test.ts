/**
 * Tests for createMockHttpClient — route matching, handler function form,
 * inline config responses, and unmatched-route behavior.
 */

import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { get } from "../../src/request/http-request.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { urlEncodedBody } from "../../src/types/body.js";
import type { HttpRequest } from "../../src/request/http-request.js";

// ---------------------------------------------------------------------------
// Static route map — basic matching
// ---------------------------------------------------------------------------

describe("createMockHttpClient — static route map", () => {
  it("returns the configured response for a matching GET route", async () => {
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, { users: [] }),
    });

    const result = await mock.get("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("returns the configured response for a matching POST route", async () => {
    const mock = createMockHttpClient({
      "POST /users": mockJsonResponse(201, { id: 42 }),
    });

    const result = await mock.post("/users", { json: { name: "Alice" } });

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(201);
    }
  });

  it("returns the configured response for a matching PUT route", async () => {
    const mock = createMockHttpClient({
      "PUT /users/1": mockJsonResponse(200, { id: 1, name: "Updated" }),
    });

    const result = await mock.put("/users/1");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("returns the configured response for a matching DELETE route", async () => {
    const mock = createMockHttpClient({
      "DELETE /users/1": mockResponse(204),
    });

    const result = await mock.del("/users/1");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(204);
    }
  });

  it("returns the configured response for a matching PATCH route", async () => {
    const mock = createMockHttpClient({
      "PATCH /users/1": mockJsonResponse(200, { id: 1 }),
    });

    const result = await mock.patch("/users/1");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("returns the configured response for a matching HEAD route", async () => {
    const mock = createMockHttpClient({
      "HEAD /health": mockResponse(200),
    });

    const result = await mock.head("/health");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("returns Transport error when no route matches", async () => {
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, []),
    });

    const result = await mock.get("/unknown");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("unmatched route error message includes method and URL", async () => {
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, []),
    });

    const result = await mock.get("/products");

    if (result._tag === "Err") {
      expect(result.error.message).toContain("GET");
      expect(result.error.message).toContain("/products");
    }
  });

  it("wildcard method (*) matches any HTTP method", async () => {
    const mock = createMockHttpClient({
      "* /health": mockResponse(200),
    });

    const getResult = await mock.get("/health");
    const postResult = await mock.post("/health");

    expect(getResult._tag).toBe("Ok");
    expect(postResult._tag).toBe("Ok");
  });

  it("glob wildcard (*) in path matches single-segment paths", async () => {
    const mock = createMockHttpClient({
      "GET /users/*": mockJsonResponse(200, { id: 1 }),
    });

    const result = await mock.get("/users/42");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("double wildcard (**) in path matches multi-segment paths", async () => {
    const mock = createMockHttpClient({
      "GET /api/**": mockJsonResponse(200, { ok: true }),
    });

    const result = await mock.get("/api/v1/users/42/posts");

    expect(result._tag).toBe("Ok");
  });

  it("MockResponseConfig with body produces JSON response", async () => {
    const mock = createMockHttpClient({
      "GET /items": { status: 200, body: { items: [1, 2, 3] } },
    });

    const result = await mock.get("/items");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
      const json = await result.value.json;
      expect(json._tag).toBe("Ok");
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ items: [1, 2, 3] });
      }
    }
  });

  it("MockResponseConfig with text produces text response", async () => {
    const mock = createMockHttpClient({
      "GET /ping": { status: 200, text: "pong" },
    });

    const result = await mock.get("/ping");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
      const text = await result.value.text;
      if (text._tag === "Ok") {
        expect(text.value).toBe("pong");
      }
    }
  });

  it("execute() also matches the route map", async () => {
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, []),
    });

    const req = get("/users");
    const result = await mock.execute(req);

    expect(result._tag).toBe("Ok");
  });

  it("first matching route wins when multiple routes could match", async () => {
    // Using different paths to avoid duplicate key issues
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, { source: "specific" }),
      "GET /*": mockJsonResponse(201, { source: "wildcard" }),
    });

    const result = await mock.get("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      const json = await result.value.json;
      if (json._tag === "Ok") {
        expect((json.value as { source: string }).source).toBe("specific");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Handler function form
// ---------------------------------------------------------------------------

describe("createMockHttpClient — handler function form", () => {
  it("calls the handler with the request and returns the result", async () => {
    const mock = createMockHttpClient((req) => {
      return ok(mockJsonResponse(200, { url: req.url }));
    });

    const result = await mock.get("/anything");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      const json = await result.value.json;
      if (json._tag === "Ok") {
        expect((json.value as { url: string }).url).toBe("/anything");
      }
    }
  });

  it("handler returning err propagates as Err", async () => {
    const mock = createMockHttpClient((req) => {
      return err(httpRequestError("Transport", req, "Handler-level failure"));
    });

    const result = await mock.get("/fail");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Handler-level failure");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("handler can distinguish request method", async () => {
    const mock = createMockHttpClient((req) => {
      if (req.method === "POST") {
        return ok(mockJsonResponse(201, { created: true }));
      }
      return ok(mockJsonResponse(200, { found: true }));
    });

    const getResult = await mock.get("/resource");
    const postResult = await mock.post("/resource");

    if (getResult._tag === "Ok") {
      expect(getResult.value.status).toBe(200);
    }
    if (postResult._tag === "Ok") {
      expect(postResult.value.status).toBe(201);
    }
  });

  it("handler receives the full request object with correct method and url", async () => {
    let capturedMethod = "";
    let capturedUrl = "";

    const mock = createMockHttpClient((req) => {
      capturedMethod = req.method;
      capturedUrl = req.url;
      return ok(mockResponse(200));
    });

    await mock.get("https://api.example.com/users");

    expect(capturedMethod).toBe("GET");
    expect(capturedUrl).toBe("https://api.example.com/users");
  });

  it("handler form: mockRequestError can be returned to simulate network failure", async () => {
    const mock = createMockHttpClient((_req) => {
      return err(mockRequestError("Transport", "Connection refused"));
    });

    const result = await mock.post("/endpoint");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("handler is invoked for execute() as well", async () => {
    let called = false;

    const mock = createMockHttpClient((_req) => {
      called = true;
      return ok(mockResponse(200));
    });

    await mock.execute(get("/resource"));

    expect(called).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JSON body accessible from response
// ---------------------------------------------------------------------------

describe("createMockHttpClient — response body content", () => {
  it("mockJsonResponse body is accessible via response.json", async () => {
    const mock = createMockHttpClient({
      "GET /users": mockJsonResponse(200, { users: [{ id: 1 }] }),
    });

    const result = await mock.get("/users");
    expect(result._tag).toBe("Ok");

    if (result._tag === "Ok") {
      const json = await result.value.json;
      expect(json._tag).toBe("Ok");
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ users: [{ id: 1 }] });
      }
    }
  });

  it("content-type header is set for JSON responses", async () => {
    const mock = createMockHttpClient({
      "GET /data": mockJsonResponse(200, { x: 1 }),
    });

    const result = await mock.get("/data");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.headers.entries["content-type"]).toContain("application/json");
    }
  });
});

// ---------------------------------------------------------------------------
// extractPathname — absolute vs relative URL handling
// ---------------------------------------------------------------------------

describe("createMockHttpClient — extractPathname URL handling", () => {
  it("matches a route using a relative URL (no scheme)", async () => {
    const mock = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, { users: [] }),
    });

    // Relative URL — extractPathname falls back to the raw string (catch branch)
    const result = await mock.get("/api/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("matches a route using an absolute URL (extracts pathname)", async () => {
    const mock = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, { found: true }),
    });

    // Absolute URL — extractPathname uses new URL(url).pathname
    const result = await mock.get("https://api.example.com/api/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("strips query string from relative URL when matching", async () => {
    const mock = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, { paged: true }),
    });

    // Relative URL with query string — extractPathname must strip the ?... part
    const result = await mock.get("/api/users?page=1&limit=10");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("strips query string from absolute URL when matching", async () => {
    const mock = createMockHttpClient({
      "GET /api/search": mockJsonResponse(200, { results: [] }),
    });

    const result = await mock.get("https://api.example.com/api/search?q=hello&sort=asc");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});

// ---------------------------------------------------------------------------
// globToRegex / matchesPathPattern — pattern coverage
// ---------------------------------------------------------------------------

describe("createMockHttpClient — glob pattern matching", () => {
  it('pattern "*" in path position matches any URL', async () => {
    const mock = createMockHttpClient({
      "GET *": mockResponse(200),
    });

    const result1 = await mock.get("/anything");
    const result2 = await mock.get("https://example.com/deep/nested/path");

    expect(result1._tag).toBe("Ok");
    expect(result2._tag).toBe("Ok");
  });

  it("exact path pattern (no wildcards) matches only that exact path", async () => {
    const mock = createMockHttpClient({
      "GET /exact/path": mockResponse(200),
    });

    const hit = await mock.get("/exact/path");
    const miss = await mock.get("/exact/path/extra");

    expect(hit._tag).toBe("Ok");
    expect(miss._tag).toBe("Err");
  });

  it("single wildcard (*) matches one segment but not multiple", async () => {
    const mock = createMockHttpClient({
      "GET /api/*/detail": mockResponse(200),
    });

    const singleSegment = await mock.get("/api/user/detail");
    const multiSegment = await mock.get("/api/user/x/detail");

    expect(singleSegment._tag).toBe("Ok");
    expect(multiSegment._tag).toBe("Err");
  });

  it("double wildcard (**) matches multiple path segments", async () => {
    const mock = createMockHttpClient({
      "GET /api/**": mockResponse(200),
    });

    const shallow = await mock.get("/api/users");
    const deep = await mock.get("/api/users/123/posts/456");

    expect(shallow._tag).toBe("Ok");
    expect(deep._tag).toBe("Ok");
  });

  it("single wildcard (*) matches any single segment", async () => {
    const mock = createMockHttpClient({
      "GET /users/*": mockJsonResponse(200, { id: 1 }),
    });

    const result42 = await mock.get("/users/42");
    const resultSlug = await mock.get("/users/alice");

    expect(result42._tag).toBe("Ok");
    expect(resultSlug._tag).toBe("Ok");
  });

  it("glob pattern with dots in path is matched correctly (dots escaped)", async () => {
    const mock = createMockHttpClient({
      "GET /v1.0/resource": mockResponse(200),
    });

    const hit = await mock.get("/v1.0/resource");
    const miss = await mock.get("/v100/resource");

    expect(hit._tag).toBe("Ok");
    expect(miss._tag).toBe("Err");
  });
});

// ---------------------------------------------------------------------------
// configToResultAsync — delay option
// ---------------------------------------------------------------------------

describe("createMockHttpClient — MockResponseConfig with delay", () => {
  it("returns the response after the configured delay", async () => {
    const delayMs = 30;
    const mock = createMockHttpClient({
      "GET /slow": { status: 200, delay: delayMs },
    });

    const start = Date.now();
    const result = await mock.get("/slow");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 5);
  });

  it("responds immediately when delay is 0", async () => {
    const mock = createMockHttpClient({
      "GET /fast": { status: 200, delay: 0 },
    });

    const result = await mock.get("/fast");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("responds immediately when delay is omitted", async () => {
    const mock = createMockHttpClient({
      "GET /instant": { status: 204 },
    });

    const result = await mock.get("/instant");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(204);
    }
  });
});

// ---------------------------------------------------------------------------
// MockResponseConfig — body, text, headers options
// ---------------------------------------------------------------------------

describe("createMockHttpClient — MockResponseConfig body options", () => {
  it("body option produces a readable JSON response", async () => {
    const mock = createMockHttpClient({
      "GET /data": { status: 200, body: { name: "Alice", age: 30 } },
    });

    const result = await mock.get("/data");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      const json = await result.value.json;
      expect(json._tag).toBe("Ok");
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ name: "Alice", age: 30 });
      }
    }
  });

  it("body option sets content-type to application/json", async () => {
    const mock = createMockHttpClient({
      "GET /typed": { status: 200, body: { x: 1 } },
    });

    const result = await mock.get("/typed");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.headers.entries["content-type"]).toContain("application/json");
    }
  });

  it("text option produces a readable text response", async () => {
    const mock = createMockHttpClient({
      "GET /text": { status: 200, text: "Hello World" },
    });

    const result = await mock.get("/text");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      const text = await result.value.text;
      expect(text._tag).toBe("Ok");
      if (text._tag === "Ok") {
        expect(text.value).toBe("Hello World");
      }
    }
  });

  it("text option does not set content-type to application/json", async () => {
    const mock = createMockHttpClient({
      "GET /text-ct": { status: 200, text: "plain text response" },
    });

    const result = await mock.get("/text-ct");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      const ct = result.value.headers.entries["content-type"];
      // When text is set but body is not, no content-type header is set automatically.
      // The value is either undefined or does not contain application/json.
      expect(ct === undefined || !ct.includes("application/json")).toBe(true);
    }
  });

  it("headers option is included in the response", async () => {
    const mock = createMockHttpClient({
      "GET /with-headers": {
        status: 200,
        headers: { "x-custom": "my-value", "x-request-id": "abc123" },
        body: {},
      },
    });

    const result = await mock.get("/with-headers");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.headers.entries["x-custom"]).toBe("my-value");
      expect(result.value.headers.entries["x-request-id"]).toBe("abc123");
    }
  });

  it("headers option merges with auto-set content-type when body is present", async () => {
    const mock = createMockHttpClient({
      "GET /merged": {
        status: 200,
        headers: { "x-trace": "t123" },
        body: { merged: true },
      },
    });

    const result = await mock.get("/merged");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.headers.entries["x-trace"]).toBe("t123");
      expect(result.value.headers.entries["content-type"]).toContain("application/json");
    }
  });

  it("status code without body or text produces empty body response", async () => {
    const mock = createMockHttpClient({
      "DELETE /resource": { status: 204 },
    });

    const result = await mock.del("/resource");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(204);
    }
  });
});

// ---------------------------------------------------------------------------
// applyRequestOptions — headers, urlParams, signal, timeout
// ---------------------------------------------------------------------------

describe("createMockHttpClient — applyRequestOptions branches", () => {
  it("get() with headers option includes headers in request seen by handler", async () => {
    let capturedHeaders: Readonly<Record<string, string>> = {};

    const mock = createMockHttpClient((req) => {
      capturedHeaders = req.headers.entries;
      return ok(mockResponse(200));
    });

    await mock.get("/url", { headers: { "x-token": "abc123" } });

    expect(capturedHeaders["x-token"]).toBe("abc123");
  });

  it("get() with urlParams option appends params to request", async () => {
    let capturedEntries: ReadonlyArray<readonly [string, string]> = [];

    const mock = createMockHttpClient((req) => {
      capturedEntries = req.urlParams.entries;
      return ok(mockResponse(200));
    });

    await mock.get("/url", { urlParams: { page: "1", sort: "asc" } });

    const pageEntry = capturedEntries.find(([k]) => k === "page");
    const sortEntry = capturedEntries.find(([k]) => k === "sort");
    expect(pageEntry?.[1]).toBe("1");
    expect(sortEntry?.[1]).toBe("asc");
  });

  it("get() with timeout option sets timeoutMs on request", async () => {
    let capturedTimeoutMs: number | undefined;

    const mock = createMockHttpClient((req) => {
      capturedTimeoutMs = req.timeoutMs;
      return ok(mockResponse(200));
    });

    await mock.get("/url", { timeout: 5000 });

    expect(capturedTimeoutMs).toBe(5000);
  });

  it("get() with signal option sets signal on request", async () => {
    const controller = new AbortController();
    let capturedSignal: AbortSignal | undefined;

    const mock = createMockHttpClient((req) => {
      capturedSignal = req.signal;
      return ok(mockResponse(200));
    });

    await mock.get("/url", { signal: controller.signal });

    expect(capturedSignal).toBe(controller.signal);
  });

  it("del() with headers option includes headers in request", async () => {
    let capturedHeaders: Readonly<Record<string, string>> = {};

    const mock = createMockHttpClient((req) => {
      capturedHeaders = req.headers.entries;
      return ok(mockResponse(204));
    });

    await mock.del("/resource", { headers: { "authorization": "Bearer token" } });

    expect(capturedHeaders["authorization"]).toBe("Bearer token");
  });

  it("head() with signal option sets signal on request", async () => {
    const controller = new AbortController();
    let capturedSignal: AbortSignal | undefined;

    const mock = createMockHttpClient((req) => {
      capturedSignal = req.signal;
      return ok(mockResponse(200));
    });

    await mock.head("/health", { signal: controller.signal });

    expect(capturedSignal).toBe(controller.signal);
  });
});

// ---------------------------------------------------------------------------
// applyRequestOptionsWithBody — body type branches (TextBody, Uint8ArrayBody)
// ---------------------------------------------------------------------------

describe("createMockHttpClient — applyRequestOptionsWithBody body type branches", () => {
  it("post() with TextBody sets text body on request", async () => {
    let capturedBody: { _tag: string; value?: string; contentType?: string } | undefined;

    const mock = createMockHttpClient((req) => {
      const body = req.body;
      if (body._tag === "TextBody") {
        capturedBody = { _tag: body._tag, value: body.value, contentType: body.contentType };
      }
      return ok(mockResponse(200));
    });

    await mock.post("/upload", {
      body: { _tag: "TextBody", value: "hello text", contentType: "text/plain" },
    });

    expect(capturedBody?._tag).toBe("TextBody");
    expect(capturedBody?.value).toBe("hello text");
    expect(capturedBody?.contentType).toBe("text/plain");
  });

  it("post() with Uint8ArrayBody sets binary body on request", async () => {
    let capturedBody: { _tag: string; contentType?: string } | undefined;
    let capturedBytes: Uint8Array | undefined;

    const mock = createMockHttpClient((req) => {
      const body = req.body;
      if (body._tag === "Uint8ArrayBody") {
        capturedBody = { _tag: body._tag, contentType: body.contentType };
        capturedBytes = body.value;
      }
      return ok(mockResponse(200));
    });

    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    await mock.post("/upload", {
      body: { _tag: "Uint8ArrayBody", value: bytes, contentType: "application/octet-stream" },
    });

    expect(capturedBody?._tag).toBe("Uint8ArrayBody");
    expect(capturedBody?.contentType).toBe("application/octet-stream");
    expect(capturedBytes).toEqual(bytes);
  });

  it("put() with json option sets json body on request", async () => {
    let capturedBody: { _tag: string; value?: unknown } | undefined;

    const mock = createMockHttpClient((req) => {
      const body = req.body;
      capturedBody = { _tag: body._tag, value: body._tag === "JsonBody" ? body.value : undefined };
      return ok(mockResponse(200));
    });

    await mock.put("/resource", { json: { name: "Updated" } });

    expect(capturedBody?._tag).toBe("JsonBody");
    expect(capturedBody?.value).toEqual({ name: "Updated" });
  });

  it("patch() with TextBody and custom content type sets body correctly", async () => {
    let capturedContentType: string | undefined;

    const mock = createMockHttpClient((req) => {
      const body = req.body;
      if (body._tag === "TextBody") {
        capturedContentType = body.contentType;
      }
      return ok(mockResponse(200));
    });

    await mock.patch("/resource", {
      body: { _tag: "TextBody", value: "<xml/>", contentType: "application/xml" },
    });

    expect(capturedContentType).toBe("application/xml");
  });
});

// ---------------------------------------------------------------------------
// Wildcard method "* /path" matches any HTTP method
// ---------------------------------------------------------------------------

describe("createMockHttpClient — wildcard method route", () => {
  it('route "* /health" matches GET requests', async () => {
    const mock = createMockHttpClient({
      "* /health": mockResponse(200),
    });

    const result = await mock.get("/health");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it('route "* /health" matches POST requests', async () => {
    const mock = createMockHttpClient({
      "* /health": mockResponse(200),
    });

    const result = await mock.post("/health");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it('route "* /health" matches DELETE requests', async () => {
    const mock = createMockHttpClient({
      "* /health": mockResponse(200),
    });

    const result = await mock.del("/health");

    expect(result._tag).toBe("Ok");
  });

  it('route "* /health" matches HEAD requests', async () => {
    const mock = createMockHttpClient({
      "* /health": mockResponse(200),
    });

    const result = await mock.head("/health");

    expect(result._tag).toBe("Ok");
  });
});

// ---------------------------------------------------------------------------
// Handler function returning Err
// ---------------------------------------------------------------------------

describe("createMockHttpClient — handler function returning Err", () => {
  it("handler returning err propagates as Err result", async () => {
    const mock = createMockHttpClient((req) =>
      err(httpRequestError("Transport", req, "Simulated failure")),
    );

    const result = await mock.get("/any");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.message).toBe("Simulated failure");
    }
  });

  it("handler Err reason is preserved in result", async () => {
    const mock = createMockHttpClient((req) =>
      err(httpRequestError("Timeout", req, "Request timed out")),
    );

    const result = await mock.post("/endpoint");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("handler Err is returned from execute() as well", async () => {
    const mock = createMockHttpClient((req) =>
      err(httpRequestError("Aborted", req, "User cancelled")),
    );

    const result = await mock.execute(get("/endpoint"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});

// ---------------------------------------------------------------------------
// statusTextForCode — MockResponseConfig status codes map to correct statusText
// ---------------------------------------------------------------------------

describe("createMockHttpClient — statusText from MockResponseConfig", () => {
  it.each([
    [200, "OK"],
    [201, "Created"],
    [204, "No Content"],
    [400, "Bad Request"],
    [401, "Unauthorized"],
    [403, "Forbidden"],
    [404, "Not Found"],
    [405, "Method Not Allowed"],
    [409, "Conflict"],
    [422, "Unprocessable Entity"],
    [429, "Too Many Requests"],
    [500, "Internal Server Error"],
    [502, "Bad Gateway"],
    [503, "Service Unavailable"],
    [504, "Gateway Timeout"],
  ])("status %i maps to statusText '%s' in inline config", async (status, expectedText) => {
    const mock = createMockHttpClient({
      "GET /test": { status },
    });

    const result = await mock.get("/test");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.statusText).toBe(expectedText);
    }
  });

  it("unknown status (999) falls back to 'Unknown'", async () => {
    const mock = createMockHttpClient({
      "GET /test": { status: 999 },
    });

    const result = await mock.get("/test");
    if (result._tag === "Ok") {
      expect(result.value.statusText).toBe("Unknown");
    }
  });
});

// ---------------------------------------------------------------------------
// MockResponseConfig — delay causes actual timing pause
// ---------------------------------------------------------------------------

describe("createMockHttpClient — delay in inline config", () => {
  it("delay > 0 actually waits before resolving the response", async () => {
    const mock = createMockHttpClient({
      "GET /slow": { status: 200, delay: 50 },
    });

    const start = Date.now();
    await mock.get("/slow");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40);
  }, 10000);

  it("delay = 0 resolves without a timer delay", async () => {
    const mock = createMockHttpClient({
      "GET /fast": { status: 200, delay: 0 },
    });

    const start = Date.now();
    await mock.get("/fast");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("no delay property resolves immediately", async () => {
    const mock = createMockHttpClient({
      "GET /instant": { status: 200 },
    });

    const start = Date.now();
    await mock.get("/instant");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("delay > 0 with body option still resolves correctly after delay", async () => {
    const mock = createMockHttpClient({
      "GET /delayed-data": { status: 200, delay: 30, body: { message: "delayed" } },
    });

    const start = Date.now();
    const result = await mock.get("/delayed-data");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    expect(elapsed).toBeGreaterThanOrEqual(20);
    if (result._tag === "Ok") {
      const json = await result.value.json;
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ message: "delayed" });
      }
    }
  }, 10000);
});

// ---------------------------------------------------------------------------
// Mutant killers — targeted tests for surviving mutants
// ---------------------------------------------------------------------------

// extractPathname catch branch: qIdx === -1 vs qIdx !== -1
// The catch fires for relative URLs; when the URL has a "?", must strip it.
describe("createMockHttpClient — extractPathname catch branch query-strip precision", () => {
  it("relative URL with query string matches only the path portion (qIdx !== -1 branch)", async () => {
    const mock = createMockHttpClient({
      "GET /items": mockResponse(200),
    });

    // /items?foo=bar is a relative URL — new URL() throws, catch fires
    // qIdx finds "?", so qIdx !== -1, and url.slice(0, qIdx) === "/items"
    const result = await mock.get("/items?foo=bar");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("relative URL with no query string matches the whole path (qIdx === -1 branch)", async () => {
    const mock = createMockHttpClient({
      "GET /items": mockResponse(200),
    });

    // /items has no "?", so qIdx === -1 and we return url unchanged
    const result = await mock.get("/items");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("relative URL with query string only matches the path, not the query (path vs path+query)", async () => {
    // Route pattern "/items" matches the extracted pathname from "/items?foo=bar"
    // because extractPathname strips the query string in the catch branch.
    // A route using "/items/extra" does NOT match "/items?foo=bar" (different path).
    const mock = createMockHttpClient({
      "GET /items": mockResponse(200),
      "GET /items/extra": mockResponse(404),
    });

    // "/items?foo=bar" extracts to "/items" (qIdx !== -1, slice to qIdx)
    const withQuery = await mock.get("/items?foo=bar");
    // "/items" extracts to "/items" (qIdx === -1, return url)
    const withoutQuery = await mock.get("/items");

    expect(withQuery._tag).toBe("Ok");
    expect(withoutQuery._tag).toBe("Ok");
    if (withQuery._tag === "Ok") {
      expect(withQuery.value.status).toBe(200);
    }
  });

  it("relative URL with multiple query params strips all of them leaving clean path", async () => {
    const mock = createMockHttpClient({
      "GET /search": mockResponse(200),
    });

    const result = await mock.get("/search?q=hello&page=1&sort=asc");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});

// globToRegex — StringLiteral mutations on "@@DOUBLE@@", "[^/]*", ".*"
// These mutants survive if ** patterns are not tested to verify they
// cross segment boundaries while * does not.
describe("createMockHttpClient — globToRegex double-star vs single-star precision", () => {
  it("** matches path segments containing slashes (.*)", async () => {
    const mock = createMockHttpClient({
      "GET /api/**/items": mockResponse(200),
    });

    // ** must match "v1/nested" — if replaced with [^/]* it would fail
    const result = await mock.get("/api/v1/nested/items");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("** does not match a path that misses the suffix (regex is anchored)", async () => {
    const mock = createMockHttpClient({
      "GET /api/**/items": mockResponse(200),
    });

    // /api/v1/nested/other does NOT end with /items
    const result = await mock.get("/api/v1/nested/other");

    expect(result._tag).toBe("Err");
  });

  it("single * does not match across slashes ([^/]* must not match /)", async () => {
    const mock = createMockHttpClient({
      "GET /api/*/items": mockResponse(200),
    });

    // * should not match "v1/nested" (contains a slash)
    const multi = await mock.get("/api/v1/nested/items");
    // * should match "v1" (single segment)
    const single = await mock.get("/api/v1/items");

    expect(multi._tag).toBe("Err");
    expect(single._tag).toBe("Ok");
  });

  it("** placeholder @@DOUBLE@@ is fully replaced: ** matches deep nesting", async () => {
    const mock = createMockHttpClient({
      "GET /a/**/z": mockResponse(200),
    });

    // If @@DOUBLE@@ replacement breaks, deep nesting won't match
    const deep = await mock.get("/a/b/c/d/e/z");
    const shallow = await mock.get("/a/b/z");

    expect(deep._tag).toBe("Ok");
    expect(shallow._tag).toBe("Ok");
  });
});

// matchesPathPattern — pattern === "*" StringLiteral mutant
// The route key has no space so matchesPathPattern("*", pathname) is called directly.
describe("createMockHttpClient — matchesPathPattern with bare '*' pattern", () => {
  it('route key "*" (no method prefix) matches any path via matchesPathPattern early-return', async () => {
    const mock = createMockHttpClient({
      "*": mockResponse(200),
    });

    // spaceIdx === -1 because "*" has no space, so matchesPathPattern("*", pathname)
    // pattern === "*" early-return fires
    const result1 = await mock.get("/anything");
    const result2 = await mock.get("/foo/bar/baz");
    const result3 = await mock.post("/some/path");

    expect(result1._tag).toBe("Ok");
    expect(result2._tag).toBe("Ok");
    expect(result3._tag).toBe("Ok");
  });

  it('route key "*" does not rely on globToRegex (pattern === "*" short-circuit)', async () => {
    // If the "*" string literal is mutated to something else, the short-circuit fails
    // and globToRegex would be used — which produces [^/]* and would fail for paths with slashes.
    const mock = createMockHttpClient({
      "*": mockResponse(200),
    });

    // A path with slashes would fail glob [^/]* but passes the "*" short-circuit
    const result = await mock.get("/deep/nested/path/with/many/segments");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});

// matchesRoute spaceIdx === -1 — route with no space (path-only, no method prefix)
describe("createMockHttpClient — matchesRoute path-only pattern (no method prefix)", () => {
  it("path-only route '/users' matches GET requests to /users", async () => {
    const mock = createMockHttpClient({
      "/users": mockResponse(200),
    });

    const result = await mock.get("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("path-only route '/users' matches POST requests to /users", async () => {
    const mock = createMockHttpClient({
      "/users": mockResponse(200),
    });

    const result = await mock.post("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("path-only route '/users' matches DELETE requests to /users", async () => {
    const mock = createMockHttpClient({
      "/users": mockResponse(200),
    });

    const result = await mock.del("/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("path-only route '/users' does NOT match /other", async () => {
    const mock = createMockHttpClient({
      "/users": mockResponse(200),
    });

    const result = await mock.get("/other");

    expect(result._tag).toBe("Err");
  });

  it("path-only route uses matchesPathPattern: path-only glob '/users/*' matches /users/42", async () => {
    const mock = createMockHttpClient({
      "/users/*": mockResponse(200),
    });

    const result = await mock.put("/users/42");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});

// matchesRoute methodPart !== "*" — wildcard method with "* /path"
// Kills the mutant that changes methodPart !== "*" so the wildcard never bypasses method check.
describe("createMockHttpClient — matchesRoute wildcard method methodPart !== '*' branch", () => {
  it('"* /api/resource" matches GET even though methodPart is not req.method', async () => {
    const mock = createMockHttpClient({
      "* /api/resource": mockResponse(200),
    });

    const result = await mock.get("/api/resource");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it('"* /api/resource" matches PUT even though methodPart is not req.method', async () => {
    const mock = createMockHttpClient({
      "* /api/resource": mockResponse(200),
    });

    const result = await mock.put("/api/resource");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it('"* /api/resource" matches PATCH', async () => {
    const mock = createMockHttpClient({
      "* /api/resource": mockResponse(200),
    });

    const result = await mock.patch("/api/resource");

    expect(result._tag).toBe("Ok");
  });

  it('"* /api/resource" matches DELETE', async () => {
    const mock = createMockHttpClient({
      "* /api/resource": mockResponse(200),
    });

    const result = await mock.del("/api/resource");

    expect(result._tag).toBe("Ok");
  });

  it("specific method route does NOT match other methods (methodPart !== req.method returns false)", async () => {
    const mock = createMockHttpClient({
      "GET /resource": mockResponse(200),
    });

    // POST /resource should NOT match "GET /resource"
    const result = await mock.post("/resource");

    expect(result._tag).toBe("Err");
  });
});

// delay !== undefined && delay > 0 — compound condition mutations
// Kills mutants that change > to >= (delay=0 would delay), or remove the undefined check.
describe("createMockHttpClient — delay compound condition precision", () => {
  it("delay=-1 does NOT add delay (delay > 0 is false, resolves immediately)", async () => {
    const mock = createMockHttpClient({
      "GET /negative-delay": { status: 200, delay: -1 },
    });

    const start = Date.now();
    const result = await mock.get("/negative-delay");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    // Negative delay should NOT be treated as a real delay (delay > 0 is false)
    // Response should still be returned (using immediate path)
    expect(elapsed).toBeLessThan(200);
  });

  it("delay=0 uses immediate path (delay > 0 is false, not >= 0)", async () => {
    const mock = createMockHttpClient({
      "GET /zero-delay": { status: 200, delay: 0 },
    });

    const start = Date.now();
    const result = await mock.get("/zero-delay");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    expect(elapsed).toBeLessThan(100);
  });

  it("delay=undefined uses immediate path (delay !== undefined is false)", async () => {
    const mock = createMockHttpClient({
      "GET /no-delay": { status: 200, delay: undefined },
    });

    const start = Date.now();
    const result = await mock.get("/no-delay");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    expect(elapsed).toBeLessThan(100);
  });

  it("delay=10 uses timer path and elapsed time reflects the wait", async () => {
    const mock = createMockHttpClient({
      "GET /timed": { status: 200, delay: 10 },
    });

    const start = Date.now();
    const result = await mock.get("/timed");
    const elapsed = Date.now() - start;

    expect(result._tag).toBe("Ok");
    // delay > 0 is true, so the setTimeout path is used
    expect(elapsed).toBeGreaterThanOrEqual(5);
  }, 10000);

  it("delay=1 (minimal positive delay) uses the timer path", async () => {
    const mock = createMockHttpClient({
      "GET /min-delay": { status: 200, delay: 1 },
    });

    const result = await mock.get("/min-delay");

    // The key assertion: result still arrives correctly after the timer fires
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  }, 10000);
});

// isHttpResponse — "stream" in value StringLiteral mutant
// Kills mutant that changes "stream" to a different property name,
// causing MockResponseConfig to be treated as HttpResponse (or vice versa).
describe("createMockHttpClient — isHttpResponse duck-typing via 'stream' property", () => {
  it("pre-built HttpResponse (has stream property) is returned as-is without re-wrapping", async () => {
    // mockJsonResponse returns an HttpResponse which has a 'stream' property.
    // isHttpResponse returns true → routeValueToResultAsync wraps it in ResultAsync.ok directly.
    const prebuilt = mockJsonResponse(200, { source: "prebuilt" });

    const mock = createMockHttpClient({
      "GET /prebuilt": prebuilt,
    });

    const result = await mock.get("/prebuilt");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      // The exact same response object is returned
      expect(result.value).toBe(prebuilt);
    }
  });

  it("MockResponseConfig (no stream property) goes through configToResultAsync", async () => {
    // { status: 200, body: { x: 1 } } is a MockResponseConfig — no 'stream' key.
    // isHttpResponse returns false → configToResultAsync is called.
    const mock = createMockHttpClient({
      "GET /config": { status: 200, body: { built: true } },
    });

    const result = await mock.get("/config");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
      const json = await result.value.json;
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ built: true });
      }
    }
  });

  it("HttpResponse with stream is not re-processed through configToResultAsync (body preserved)", async () => {
    // If isHttpResponse mistakenly returned false for an HttpResponse,
    // the object would be treated as MockResponseConfig and the response body would differ.
    const prebuilt = mockJsonResponse(418, { teapot: true });

    const mock = createMockHttpClient({
      "GET /teapot": prebuilt,
    });

    const result = await mock.get("/teapot");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      // Status 418 would be wrong if the object was re-interpreted as MockResponseConfig
      // since { status: 418 } with MockResponseConfig would still work... but the JSON body
      // and exact object identity confirm we got the prebuilt response.
      expect(result.value.status).toBe(418);
      const json = await result.value.json;
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ teapot: true });
      }
    }
  });

  it("mockResponse (stream present) is identified as HttpResponse not MockResponseConfig", async () => {
    // mockResponse(204) returns HttpResponse with stream property.
    // The config branch would fail here since a MockResponseConfig with no 'status' field
    // equivalent would produce wrong output.
    const prebuilt = mockResponse(204);

    const mock = createMockHttpClient({
      "DELETE /resource": prebuilt,
    });

    const result = await mock.del("/resource");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(prebuilt);
      expect(result.value.status).toBe(204);
    }
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests — targeted at surviving Stryker mutants (NEW)
// ---------------------------------------------------------------------------

// Test 1 — Kill L111 (globToRegex "\\$&" → "" mutation)
// The mutation strips special char escaping, so "." matches any char instead of only ".".
describe("createMockHttpClient — globToRegex dot-escaping precision (kills L111 mutant)", () => {
  it("glob pattern with wildcard and dot is matched correctly — special chars are escaped", async () => {
    // The pattern "GET /api/*.json" requires globToRegex to:
    // 1. escape the dot: "." → "\\." (so it only matches a literal dot, not any char)
    // 2. replace "*" with ".*"
    // Without escaping (mutant: "\\$&" → ""), the dot matches ANY char,
    // so "/api/dataxjson" would incorrectly match "/api/*.json".
    const client = createMockHttpClient({
      "GET /api/*.json": { status: 200 },
    });

    // This path has no dot before "json" — should NOT match /api/*.json
    const miss = await client.get("https://api.example.com/api/dataxjson");
    expect(miss.isErr()).toBe(true);

    // This path has a literal dot — SHOULD match /api/*.json
    const hit = await client.get("https://api.example.com/api/data.json");
    expect(hit.isOk()).toBe(true);
  });
});

// Test 2 — Kill L183 (text !== undefined → true mutation)
// When body=undefined and text=undefined, rawBody should be undefined (empty response).
describe("createMockHttpClient — configToResultAsync empty body (kills L183 mutant)", () => {
  it("response with no body and no text has empty body (not 'undefined' text)", async () => {
    // When the config has neither body nor text, rawBody is undefined → empty response.
    // Mutant: text !== undefined → true causes TextEncoder.encode(undefined) →
    // produces "undefined" bytes in the body, making it non-empty.
    // Original: rawBody is undefined, so text accessor returns Err(EmptyBody).
    const client = createMockHttpClient({
      "GET /empty": { status: 200 },
    });

    const result = await client.get("https://api.example.com/empty");
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const textResult = await result.value.text;
      // Original code: no rawBody → text returns Err(EmptyBody).
      // Mutant: rawBody has "undefined" bytes → text returns Ok("undefined").
      expect(textResult.isErr()).toBe(true);
      if (textResult.isErr()) {
        expect(textResult.error.reason).toBe("EmptyBody");
      }
    }
  });
});

// Test 3 — Kill L201 delay compound condition mutations (delay > 0 → true, && → ||, > → >=)
describe("createMockHttpClient — delay=0 does not invoke setTimeout (kills L201 mutants)", () => {
  it("delay of 0 does not invoke setTimeout", async () => {
    // Three mutants on: if (delay !== undefined && delay > 0)
    //   mutant 1: delay > 0 → true  → calls setTimeout even for delay=0
    //   mutant 2: && → ||            → calls setTimeout even when delay is undefined
    //   mutant 3: > → >=            → calls setTimeout for delay=0
    // Timing tests alone can't catch these (setTimeout(0) is near-instant).
    // Spy on globalThis.setTimeout to assert it is NOT called for delay=0.
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const client = createMockHttpClient({
      "GET /test": { status: 200, delay: 0 },
    });

    await client.get("https://api.example.com/test");

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});

// Test 4 — Kill L258 (bodyResult._tag === "Ok" mutation in applyRequestOptionsWithBody)
describe("createMockHttpClient — applyRequestOptionsWithBody circular json (kills L258 mutant)", () => {
  it("applyRequestOptionsWithBody: circular reference json leaves body as EmptyBody", async () => {
    // When bodyJson(circular)(req) returns Err, the body must stay EmptyBody.
    // Mutant on `bodyResult._tag === "Ok"` would set result = bodyResult.value
    // even when it's an Err, corrupting the request.
    const calls: HttpRequest[] = [];

    const client = createMockHttpClient((req: HttpRequest) => {
      calls.push(req);
      return ok(mockResponse(201));
    });

    const circular: Record<string, unknown> = {};
    circular["self"] = circular;

    await client.post("https://api.example.com/data", { json: circular });

    expect(calls).toHaveLength(1);
    expect(calls[0].body._tag).toBe("EmptyBody");
  });
});

// Tests 5 & 6 — Kill L267/L270 (TextBody/Uint8ArrayBody StringLiteral mutations)
// The mutation changes "case 'TextBody':" → "case '':" which falls to default: (no content-type set).
describe("createMockHttpClient — TextBody/Uint8ArrayBody header assertions (kills L267/L270 mutants)", () => {
  it("TextBody via body option creates a new TextBody (not the same reference as input)", async () => {
    // StringLiteral mutant on case "TextBody": falls to default:
    // default: does Object.freeze({...result, body}) — keeps the ORIGINAL body reference.
    // bodyText() creates a NEW TextBody via textBody(), so it's a different object.
    // Distinguishing: the result body should NOT be identity-equal to the input body.
    const calls: HttpRequest[] = [];

    const client = createMockHttpClient((req: HttpRequest) => {
      calls.push(req);
      return ok(mockResponse(200));
    });

    const inputBody = { _tag: "TextBody" as const, value: "hello world", contentType: "text/plain" };
    await client.post("https://api.example.com/upload", { body: inputBody });

    expect(calls[0].body._tag).toBe("TextBody");
    // bodyText() creates a fresh frozen TextBody; default branch keeps the original reference.
    // If the mutant fires (case "TextBody" → case ""), default branch runs and body === inputBody.
    expect(calls[0].body).not.toBe(inputBody);
  });

  it("Uint8ArrayBody via body option creates a new Uint8ArrayBody (not the same reference as input)", async () => {
    // Same StringLiteral mutant kill, for Uint8ArrayBody case.
    // bodyUint8Array() creates a new Uint8ArrayBody; default branch keeps the original.
    const calls: HttpRequest[] = [];

    const client = createMockHttpClient((req: HttpRequest) => {
      calls.push(req);
      return ok(mockResponse(200));
    });

    const bytes = new Uint8Array([1, 2, 3]);
    const inputBody = { _tag: "Uint8ArrayBody" as const, value: bytes, contentType: "application/octet-stream" };
    await client.post("https://api.example.com/binary", { body: inputBody });

    expect(calls[0].body._tag).toBe("Uint8ArrayBody");
    // bodyUint8Array() creates a fresh frozen body; default keeps inputBody reference.
    expect(calls[0].body).not.toBe(inputBody);
  });
});

// Test 7 — Kill L273/L274 (NoCoverage: default branch in switch)
describe("createMockHttpClient — UrlEncodedBody default branch (kills L273/L274 no-coverage)", () => {
  it("UrlEncodedBody via body option is preserved as-is (default branch coverage)", async () => {
    // The switch has a default: branch for body types other than TextBody/Uint8ArrayBody.
    // No existing test exercises this branch (NoCoverage mutant at L273/L274).
    const calls: HttpRequest[] = [];

    const client = createMockHttpClient((req: HttpRequest) => {
      calls.push(req);
      return ok(mockResponse(200));
    });

    await client.post("https://api.example.com/form", {
      body: urlEncodedBody({ key: "value" }),
    });

    expect(calls[0].body._tag).toBe("UrlEncodedBody");
  });
});

// Test 8 — Kill L329 (if (value !== undefined) mutation)
describe("createMockHttpClient — route with undefined value (kills L329 mutant)", () => {
  it("route mapped to undefined value results in a Transport error", async () => {
    // If `if (value !== undefined)` is mutated to always true,
    // routeValueToResultAsync(undefined, req) would be called, crashing.
    // This test verifies the guard works correctly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createMockHttpClient({ "GET /test": undefined } as any);

    const result = await client.get("https://api.example.com/test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toBe("Transport");
    }
  });
});
