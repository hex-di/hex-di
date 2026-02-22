/**
 * Tests for createRecordingClient — wraps an inner HttpClient and records
 * all requests and responses for later assertion.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createRecordingClient } from "../../src/testing/recording-client.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { get } from "../../src/request/http-request.js";
import { urlEncodedBody, streamBody } from "../../src/types/body.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMock() {
  return createMockHttpClient({
    "GET /users": mockJsonResponse(200, [{ id: 1 }]),
    "POST /users": mockJsonResponse(201, { id: 2 }),
    "PUT /users/1": mockJsonResponse(200, { id: 1, name: "Updated" }),
    "PATCH /users/1": mockJsonResponse(200, { id: 1 }),
    "DELETE /users/1": mockResponse(204),
    "HEAD /health": mockResponse(200),
  });
}

// ---------------------------------------------------------------------------
// Basic wrapping and recording
// ---------------------------------------------------------------------------

describe("createRecordingClient — basic wrapping", () => {
  it("returns a client and inspection methods", () => {
    const { client, getRequests, getResponses, clear } = createRecordingClient(makeMock());
    expect(client).toBeDefined();
    expect(typeof getRequests).toBe("function");
    expect(typeof getResponses).toBe("function");
    expect(typeof clear).toBe("function");
  });

  it("starts with empty recordings", () => {
    const { getRequests, getResponses } = createRecordingClient(makeMock());
    expect(getRequests()).toHaveLength(0);
    expect(getResponses()).toHaveLength(0);
  });

  it("records a GET request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.get("/users");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("GET");
    expect(requests[0].request.url).toBe("/users");
  });

  it("records a POST request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.post("/users", { json: { name: "Alice" } });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("POST");
  });

  it("records a PUT request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.put("/users/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("PUT");
  });

  it("records a PATCH request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.patch("/users/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("PATCH");
  });

  it("records a DELETE request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.del("/users/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("DELETE");
  });

  it("records a HEAD request", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.head("/health");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("HEAD");
  });

  it("records multiple requests in order", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.get("/users");
    await client.post("/users", { json: { name: "Bob" } });

    const requests = getRequests();
    expect(requests).toHaveLength(2);
    expect(requests[0].request.method).toBe("GET");
    expect(requests[1].request.method).toBe("POST");
  });

  it("records execute() calls", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.execute(get("/users"));

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("GET");
    expect(requests[0].request.url).toBe("/users");
  });
});

// ---------------------------------------------------------------------------
// RecordedRequest structure
// ---------------------------------------------------------------------------

describe("createRecordingClient — RecordedRequest", () => {
  it("each recorded request has a timestamp", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());
    const before = Date.now();

    await client.get("/users");

    const after = Date.now();
    const requests = getRequests();
    expect(requests[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(requests[0].timestamp).toBeLessThanOrEqual(after);
  });

  it("recorded request includes the full HttpRequest", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.get("/users");

    const req = getRequests()[0].request;
    expect(req.method).toBe("GET");
    expect(req.url).toBe("/users");
    expect(req.body._tag).toBe("EmptyBody");
  });
});

// ---------------------------------------------------------------------------
// RecordedResponse structure
// ---------------------------------------------------------------------------

describe("createRecordingClient — getResponses()", () => {
  it("records the response for a successful request", async () => {
    const { client, getResponses } = createRecordingClient(makeMock());

    await client.get("/users");

    const responses = getResponses();
    expect(responses).toHaveLength(1);
    expect(responses[0].response).toBeDefined();
    expect(responses[0].error).toBeUndefined();
    expect(responses[0].response?.status).toBe(200);
  });

  it("records the error for a failed request", async () => {
    const failingMock = createMockHttpClient((req) => {
      return err(httpRequestError("Transport", req, "ECONNREFUSED"));
    });
    const { client, getResponses } = createRecordingClient(failingMock);

    await client.get("/fail");

    const responses = getResponses();
    expect(responses).toHaveLength(1);
    expect(responses[0].response).toBeUndefined();
    expect(responses[0].error).toBeDefined();
    expect(responses[0].error?._tag).toBe("HttpRequestError");
  });

  it("records durationMs for a successful request", async () => {
    const { client, getResponses } = createRecordingClient(makeMock());

    await client.get("/users");

    const rec = getResponses()[0];
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records durationMs for a failed request", async () => {
    const failingMock = createMockHttpClient((req) => {
      return err(httpRequestError("Timeout", req, "Timed out"));
    });
    const { client, getResponses } = createRecordingClient(failingMock);

    await client.get("/fail");

    const rec = getResponses()[0];
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("each recorded response has a timestamp", async () => {
    const { client, getResponses } = createRecordingClient(makeMock());
    const before = Date.now();

    await client.get("/users");

    const after = Date.now();
    const rec = getResponses()[0];
    expect(rec.timestamp).toBeGreaterThanOrEqual(before);
    expect(rec.timestamp).toBeLessThanOrEqual(after);
  });

  it("recorded response includes the originating request", async () => {
    const { client, getResponses } = createRecordingClient(makeMock());

    await client.get("/users");

    const rec = getResponses()[0];
    expect(rec.request.method).toBe("GET");
    expect(rec.request.url).toBe("/users");
  });

  it("both successful and failed requests are recorded in getResponses()", async () => {
    const mixedMock = createMockHttpClient((req) => {
      if (req.url === "/ok") {
        return ok(mockResponse(200));
      }
      return err(httpRequestError("Transport", req, "No route"));
    });
    const { client, getResponses } = createRecordingClient(mixedMock);

    await client.get("/ok");
    await client.get("/fail");

    const responses = getResponses();
    expect(responses).toHaveLength(2);
    expect(responses[0].error).toBeUndefined();
    expect(responses[1].error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe("createRecordingClient — clear()", () => {
  it("clears all recorded requests", async () => {
    const { client, getRequests, clear } = createRecordingClient(makeMock());

    await client.get("/users");
    expect(getRequests()).toHaveLength(1);

    clear();
    expect(getRequests()).toHaveLength(0);
  });

  it("clears all recorded responses", async () => {
    const { client, getResponses, clear } = createRecordingClient(makeMock());

    await client.get("/users");
    expect(getResponses()).toHaveLength(1);

    clear();
    expect(getResponses()).toHaveLength(0);
  });

  it("can record again after clearing", async () => {
    const { client, getRequests, clear } = createRecordingClient(makeMock());

    await client.get("/users");
    clear();
    await client.post("/users");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// Snapshot semantics
// ---------------------------------------------------------------------------

describe("createRecordingClient — snapshot semantics", () => {
  it("getRequests() returns a snapshot (new array each call)", async () => {
    const { client, getRequests } = createRecordingClient(makeMock());

    await client.get("/users");

    const snap1 = getRequests();
    const snap2 = getRequests();
    expect(snap1).not.toBe(snap2);
    expect(snap1).toEqual(snap2);
  });

  it("getResponses() returns a snapshot (new array each call)", async () => {
    const { client, getResponses } = createRecordingClient(makeMock());

    await client.get("/users");

    const snap1 = getResponses();
    const snap2 = getResponses();
    expect(snap1).not.toBe(snap2);
    expect(snap1).toEqual(snap2);
  });
});

// ---------------------------------------------------------------------------
// HTTP method coverage — DELETE, HEAD, PUT, PATCH with passthrough mock
// ---------------------------------------------------------------------------

describe("createRecordingClient — method ternary branches", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("del() records a DELETE request with correct method", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.del("/items/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("DELETE");
    expect(requests[0].request.url).toBe("/items/1");
  });

  it("head() records a HEAD request with correct method", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.head("/health");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("HEAD");
    expect(requests[0].request.url).toBe("/health");
  });

  it("put() records a PUT request with correct method", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.put("/items/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("PUT");
    expect(requests[0].request.url).toBe("/items/1");
  });

  it("patch() records a PATCH request with correct method", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.patch("/items/1");

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("PATCH");
    expect(requests[0].request.url).toBe("/items/1");
  });
});

// ---------------------------------------------------------------------------
// applyOptions branches — urlParams, timeout, signal
// ---------------------------------------------------------------------------

describe("createRecordingClient — applyOptions branches", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("get() with urlParams option records params on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.get("/search", { urlParams: { q: "hello" } });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    const entries = requests[0].request.urlParams.entries;
    const hasQParam = entries.some(([k, v]) => k === "q" && v === "hello");
    expect(hasQParam).toBe(true);
  });

  it("get() with timeout option records the timeout on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.get("/data", { timeout: 3000 });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.timeoutMs).toBe(3000);
  });

  it("get() with signal option records the signal on the request", async () => {
    const controller = new AbortController();
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.get("/data", { signal: controller.signal });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.signal).toBe(controller.signal);
  });

  it("get() with headers option records the headers on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.get("/data", { headers: { "x-custom": "value" } });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.headers.entries["x-custom"]).toBe("value");
  });
});

// ---------------------------------------------------------------------------
// buildBodyRequest body branches — json, TextBody, Uint8ArrayBody
// ---------------------------------------------------------------------------

describe("createRecordingClient — buildBodyRequest body branches", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(201)));
  }

  it("post() with json option records a JsonBody on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.post("/items", { json: { name: "Widget" } });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    const body = requests[0].request.body;
    expect(body._tag).toBe("JsonBody");
    if (body._tag === "JsonBody") {
      expect(body.value).toEqual({ name: "Widget" });
    }
  });

  it("post() with TextBody option records a TextBody on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    await client.post("/items", {
      body: { _tag: "TextBody", value: "hello text", contentType: "text/plain" },
    });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    const body = requests[0].request.body;
    expect(body._tag).toBe("TextBody");
    if (body._tag === "TextBody") {
      expect(body.value).toBe("hello text");
    }
  });

  it("post() with Uint8ArrayBody option records a Uint8ArrayBody on the request", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());
    const bytes = new TextEncoder().encode("binary data");

    await client.post("/upload", {
      body: { _tag: "Uint8ArrayBody", value: bytes, contentType: "application/octet-stream" },
    });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    const body = requests[0].request.body;
    expect(body._tag).toBe("Uint8ArrayBody");
    if (body._tag === "Uint8ArrayBody") {
      expect(body.value).toBe(bytes);
    }
  });
});

// ---------------------------------------------------------------------------
// Mutant-killing tests — recording-client.ts
// ---------------------------------------------------------------------------

describe("createRecordingClient — durationMs upper bound (kills ArithmeticOperator mutant)", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("durationMs for a successful request is less than 5000ms", async () => {
    const { client, getResponses } = createRecordingClient(passthroughMock());

    await client.get("/users");

    const rec = getResponses()[0];
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
    expect(rec.durationMs).toBeLessThan(5000);
  });

  it("durationMs for a failed request is less than 5000ms", async () => {
    const failingMock = createMockHttpClient((req) => {
      return err(httpRequestError("Transport", req, "ECONNREFUSED"));
    });
    const { client, getResponses } = createRecordingClient(failingMock);

    await client.get("/fail");

    const rec = getResponses()[0];
    expect(rec.durationMs).toBeGreaterThanOrEqual(0);
    expect(rec.durationMs).toBeLessThan(5000);
  });
});

describe("createRecordingClient — buildBodyRequest default branch (kills no-coverage mutant)", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("post() with UrlEncodedBody hits the default branch and preserves body tag", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    // UrlEncodedBody is a valid HttpBody type but hits the default: branch in the switch
    const body = urlEncodedBody([["key", "val"]]);
    await client.post("/items", { body });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("POST");
    const reqBody = requests[0].request.body;
    expect(reqBody._tag).toBe("UrlEncodedBody");
  });

  it("patch() with StreamBody hits the default branch and preserves body tag", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data"));
        controller.close();
      },
    });
    const body = streamBody(stream, { contentType: "application/octet-stream" });

    await client.patch("/items/1", { body });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("PATCH");
    const reqBody = requests[0].request.body;
    expect(reqBody._tag).toBe("StreamBody");
  });
});

describe("createRecordingClient — bodyJson error path (kills no-coverage mutant)", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("post() with circular reference JSON skips body assignment when bodyResult is Err", async () => {
    const { client, getRequests } = createRecordingClient(passthroughMock());

    // A circular reference forces JSON.stringify to throw, making bodyJson return Err
    const circular: Record<string, unknown> = { name: "circular" };
    circular["self"] = circular;

    await client.post("/items", { json: circular });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe("POST");
    // When bodyJson returns Err, the body is NOT set to JsonBody — it stays EmptyBody
    const reqBody = requests[0].request.body;
    expect(reqBody._tag).toBe("EmptyBody");
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests — TextBody/Uint8ArrayBody StringLiteral mutations
// recording-client.ts buildBodyRequest switch (L139/L142)
// ---------------------------------------------------------------------------
// The StringLiteral mutant changes "case 'TextBody':" → "case ':'", which falls
// to default: and does NOT call bodyText()/bodyUint8Array(). The existing tests
// only assert body._tag. Asserting the content-type header kills the mutant.

describe("createRecordingClient — TextBody/Uint8ArrayBody set content-type header (kills L139/L142 mutants)", () => {
  function passthroughMock() {
    return createMockHttpClient((_req) => ok(mockResponse(200)));
  }

  it("TextBody via body option creates a new TextBody (not the same reference as input)", async () => {
    // StringLiteral mutant on case "TextBody": falls to default:
    // default: does Object.freeze({...result, body}) — keeps the ORIGINAL body reference.
    // bodyText() creates a NEW TextBody via textBody(), so it's a different object.
    const { client, getRequests } = createRecordingClient(passthroughMock());

    const inputBody = { _tag: "TextBody" as const, value: "hello", contentType: "text/plain" };
    await client.post("https://api.example.com/upload", { body: inputBody });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.body._tag).toBe("TextBody");
    // bodyText() creates a fresh frozen TextBody; default keeps the original reference.
    expect(requests[0].request.body).not.toBe(inputBody);
  });

  it("Uint8ArrayBody via body option creates a new Uint8ArrayBody (not the same reference as input)", async () => {
    // Same StringLiteral mutant kill, for Uint8ArrayBody case (L142).
    const { client, getRequests } = createRecordingClient(passthroughMock());

    const bytes = new Uint8Array([10, 20, 30]);
    const inputBody = { _tag: "Uint8ArrayBody" as const, value: bytes, contentType: "application/octet-stream" };
    await client.post("https://api.example.com/binary", { body: inputBody });

    const requests = getRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].request.body._tag).toBe("Uint8ArrayBody");
    // bodyUint8Array() creates a fresh frozen body; default keeps inputBody reference.
    expect(requests[0].request.body).not.toBe(inputBody);
  });
});
