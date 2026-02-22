import { describe, it, expect } from "vitest";
import { HttpClientPort } from "../../src/ports/http-client-port.js";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { get as makeGet } from "../../src/request/http-request.js";
import { ResultAsync } from "@hex-di/result";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";
import type { HttpRequestError } from "../../src/errors/http-request-error.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockResponse(status = 200): HttpResponse {
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders({ "content-type": "application/json" }),
    request: makeGet("http://mock.test/"),
  });
}

type CapturedCall = { request: HttpRequest };

function captureExecute(response: HttpResponse = makeMockResponse()) {
  const calls: CapturedCall[] = [];

  const executeFn = (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
    calls.push({ request: req });
    return ResultAsync.ok(response);
  };

  return { calls, executeFn };
}

// ---------------------------------------------------------------------------
// HttpClientPort — port token
// ---------------------------------------------------------------------------

describe("HttpClientPort", () => {
  it('has __portName "HttpClient"', () => {
    expect(HttpClientPort.__portName).toBe("HttpClient");
  });

  it("is a frozen object", () => {
    expect(Object.isFrozen(HttpClientPort)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createHttpClient — factory
// ---------------------------------------------------------------------------

describe("createHttpClient()", () => {
  it("returns an HttpClient object with the required methods", () => {
    const { executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    expect(typeof client.execute).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.post).toBe("function");
    expect(typeof client.put).toBe("function");
    expect(typeof client.patch).toBe("function");
    expect(typeof client.del).toBe("function");
    expect(typeof client.head).toBe("function");
  });

  // ---- execute() -----------------------------------------------------------

  describe("execute()", () => {
    it("delegates directly to the executeFn", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);
      const req = makeGet("https://api.example.com/test");

      await client.execute(req);

      expect(calls).toHaveLength(1);
      expect(calls[0].request).toBe(req);
    });

    it("returns the ResultAsync produced by the executeFn resolving to Ok", async () => {
      const mockResp = makeMockResponse(201);
      const { executeFn } = captureExecute(mockResp);
      const client = createHttpClient(executeFn);
      const req = makeGet("https://api.example.com/items");

      const result = await client.execute(req);

      expect(result.isOk()).toBe(true);
      // Access the value via match since Result has no unwrap()
      result.match(
        (resp) => expect(resp).toBe(mockResp),
        () => expect.fail("Expected Ok"),
      );
    });
  });

  // ---- get() ---------------------------------------------------------------

  describe("get()", () => {
    it("calls executeFn with a GET request for the given URL", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/users");

      expect(calls).toHaveLength(1);
      expect(calls[0].request.method).toBe("GET");
      expect(calls[0].request.url).toBe("https://api.example.com/users");
    });

    it("applies headers from options", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/users", {
        headers: { "x-custom": "value" },
      });

      expect(calls[0].request.headers.entries["x-custom"]).toBe("value");
    });

    it("applies urlParams from options", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/items", {
        urlParams: { page: "2" },
      });

      const params = Object.fromEntries(calls[0].request.urlParams.entries);
      expect(params["page"]).toBe("2");
    });

    it("applies timeout from options", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/slow", { timeout: 8000 });

      expect(calls[0].request.timeoutMs).toBe(8000);
    });

    it("applies signal from options", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);
      const controller = new AbortController();

      await client.get("https://api.example.com/cancel", { signal: controller.signal });

      expect(calls[0].request.signal).toBe(controller.signal);
    });

    it("preserves URL query params from the URL string when opts has no urlParams", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/items?page=2&limit=10", { timeout: 5000 });

      const params = Object.fromEntries(calls[0].request.urlParams.entries);
      expect(params["page"]).toBe("2");
      expect(params["limit"]).toBe("10");
    });
  });

  // ---- post() --------------------------------------------------------------

  describe("post()", () => {
    it("calls executeFn with a POST request for the given URL", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.post("https://api.example.com/users");

      expect(calls).toHaveLength(1);
      expect(calls[0].request.method).toBe("POST");
      expect(calls[0].request.url).toBe("https://api.example.com/users");
    });

    it("sets a JSON body and content-type when json option is provided", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.post("https://api.example.com/users", { json: { name: "Alice" } });

      const req = calls[0].request;
      expect(req.body._tag).toBe("JsonBody");
      expect(req.headers.entries["content-type"]).toBe("application/json");
    });

    it("falls back to no body when json serialization fails (convenience API contract)", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      const circular: Record<string, unknown> = {};
      circular["self"] = circular;

      await client.post("https://api.example.com/data", { json: circular });

      // The convenience API silently drops the body rather than propagating the error.
      expect(calls[0].request.body._tag).toBe("EmptyBody");
    });

    it("sets a raw HttpBody when body option is provided", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      const rawBytes = new Uint8Array([1, 2, 3]);
      await client.post("https://api.example.com/upload", {
        body: { _tag: "Uint8ArrayBody", value: rawBytes, contentType: "application/octet-stream" },
      });

      expect(calls[0].request.body._tag).toBe("Uint8ArrayBody");
    });

    it("json option takes precedence over body option when both are provided", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      const rawBytes = new Uint8Array([9]);
      await client.post("https://api.example.com/data", {
        json: { key: "value" },
        body: { _tag: "Uint8ArrayBody", value: rawBytes, contentType: "application/octet-stream" },
      });

      // json wins
      expect(calls[0].request.body._tag).toBe("JsonBody");
    });
  });

  // ---- put() ---------------------------------------------------------------

  describe("put()", () => {
    it("calls executeFn with a PUT request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.put("https://api.example.com/users/1", { json: { name: "Bob" } });

      const req = calls[0].request;
      expect(req.method).toBe("PUT");
      expect(req.body._tag).toBe("JsonBody");
    });

    it("calls executeFn with a PUT request and no body when no opts provided", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.put("https://api.example.com/users/1");

      expect(calls[0].request.method).toBe("PUT");
      expect(calls[0].request.body._tag).toBe("EmptyBody");
    });
  });

  // ---- patch() -------------------------------------------------------------

  describe("patch()", () => {
    it("calls executeFn with a PATCH request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.patch("https://api.example.com/users/1", { json: { name: "Charlie" } });

      const req = calls[0].request;
      expect(req.method).toBe("PATCH");
      expect(req.body._tag).toBe("JsonBody");
    });

    it("calls executeFn with a PATCH request and no body when no opts provided", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.patch("https://api.example.com/users/1");

      expect(calls[0].request.method).toBe("PATCH");
      expect(calls[0].request.body._tag).toBe("EmptyBody");
    });
  });

  // ---- del() ---------------------------------------------------------------

  describe("del()", () => {
    it("calls executeFn with a DELETE request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.del("https://api.example.com/users/1");

      expect(calls[0].request.method).toBe("DELETE");
      expect(calls[0].request.url).toBe("https://api.example.com/users/1");
    });

    it("applies options to DELETE request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.del("https://api.example.com/users/1", {
        headers: { "x-idempotency-key": "idem-123" },
      });

      expect(calls[0].request.headers.entries["x-idempotency-key"]).toBe("idem-123");
    });
  });

  // ---- head() --------------------------------------------------------------

  describe("head()", () => {
    it("calls executeFn with a HEAD request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.head("https://api.example.com/resource");

      expect(calls[0].request.method).toBe("HEAD");
      expect(calls[0].request.url).toBe("https://api.example.com/resource");
    });

    it("applies options to HEAD request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.head("https://api.example.com/resource", { timeout: 3000 });

      expect(calls[0].request.timeoutMs).toBe(3000);
    });
  });

  // ---- multiple calls / independence ---------------------------------------

  describe("call independence", () => {
    it("each convenience-method call is independent (no shared state)", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.get("https://api.example.com/a");
      await client.get("https://api.example.com/b");

      expect(calls).toHaveLength(2);
      expect(calls[0].request.url).toBe("https://api.example.com/a");
      expect(calls[1].request.url).toBe("https://api.example.com/b");
    });

    it("each call produces a frozen request", async () => {
      const { calls, executeFn } = captureExecute();
      const client = createHttpClient(executeFn);

      await client.post("https://api.example.com/data", { json: { x: 1 } });

      expect(Object.isFrozen(calls[0].request)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// applyOptions — mutation-killing: opts field checks (undefined guards)
// ---------------------------------------------------------------------------

describe("applyOptions — mutation-killing: opts field guards", () => {
  it("preserves URL query params when get() is called without opts (no urlParams override)", async () => {
    // Kills the `opts.urlParams !== undefined` → `true` mutant in applyOptions.
    // When mutated, setUrlParams(undefined) is called which clears all URL params
    // to an empty array, even params parsed from the URL string.
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    // URL with embedded query params — no opts passed
    await client.get("https://api.example.com/items?page=3&limit=5");

    const params = Object.fromEntries(calls[0].request.urlParams.entries);
    expect(params["page"]).toBe("3");
    expect(params["limit"]).toBe("5");
  });

  it("preserves URL query params when del() is called without opts", async () => {
    // Same kill, but through del() to ensure the applyOptions guard is exercised
    // for DELETE methods as well.
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.del("https://api.example.com/items?filter=active");

    const params = Object.fromEntries(calls[0].request.urlParams.entries);
    expect(params["filter"]).toBe("active");
  });

  it("preserves URL query params when head() is called without opts", async () => {
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.head("https://api.example.com/resource?v=2");

    const params = Object.fromEntries(calls[0].request.urlParams.entries);
    expect(params["v"]).toBe("2");
  });

  it("get() without opts does not set a signal on the request", async () => {
    // Kills the `opts.signal !== undefined` → `true` mutant:
    // when mutated, withSignal(undefined) would be called, but the signal
    // field would still be undefined, so this test can't distinguish.
    // However, if the request originally had a signal (from URL parsing context),
    // setting it to undefined would clear it. For a fresh request, it's a no-op.
    // This test documents the expected no-signal behavior.
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.get("https://api.example.com/test");

    // A fresh GET without opts should have no signal set
    expect(calls[0].request.signal).toBeUndefined();
  });

  it("get() without opts does not set a timeoutMs on the request", async () => {
    // Documents expected no-timeout behavior when no opts are provided.
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.get("https://api.example.com/test");

    expect(calls[0].request.timeoutMs).toBeUndefined();
  });
});

describe("applyBodyOptions — mutation-killing: opts.json undefined guard", () => {
  it("post() without opts does not serialize undefined as JSON body", async () => {
    // Kills the `opts.json !== undefined` → `true` mutant in applyBodyOptions.
    // When mutated, bodyJson(undefined)(r) is called. JSON.stringify(undefined)
    // returns undefined (not a string), JSON.parse(undefined) throws SyntaxError,
    // which is caught, returning err(bodyErr), which causes the match to return r.
    // So body remains EmptyBody. The test still passes. This is an equivalent mutant
    // for the json undefined case specifically.
    // BUT: verify that the request body is EmptyBody (not corrupted)
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.post("https://api.example.com/items");

    expect(calls[0].request.body._tag).toBe("EmptyBody");
  });

  it("put() without opts does not set JSON body", async () => {
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.put("https://api.example.com/items/1");

    expect(calls[0].request.body._tag).toBe("EmptyBody");
  });

  it("patch() without opts does not set JSON body", async () => {
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.patch("https://api.example.com/items/1");

    expect(calls[0].request.body._tag).toBe("EmptyBody");
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests — opts.body undefined guard
// ---------------------------------------------------------------------------
// applyBodyOptions (http-client-factory.ts): `else if (opts.body !== undefined)`
// Mutant: opts.body !== undefined → true → sets r.body = undefined even when no body given.

describe("applyBodyOptions — mutation-killing: opts.body undefined guard", () => {
  it("post() with empty opts ({}) leaves body as EmptyBody — no json, no body", async () => {
    // Kills the `opts.body !== undefined` → `true` mutant in applyBodyOptions.
    // When mutated, `r = Object.freeze({ ...r, body: undefined as HttpBody })` is executed,
    // producing an EmptyBody-like or undefined body rather than the clean EmptyBody.
    const { calls, executeFn } = captureExecute();
    const client = createHttpClient(executeFn);

    await client.post("https://api.example.com/items", {});

    expect(calls[0].request.body._tag).toBe("EmptyBody");
  });
});
