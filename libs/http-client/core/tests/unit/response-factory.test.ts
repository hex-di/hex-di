/**
 * Tests for response factory functions: mockResponse, mockJsonResponse,
 * mockStreamResponse, and mockRequestError.
 */

import { describe, it, expect, vi } from "vitest";
import {
  mockResponse,
  mockJsonResponse,
  mockStreamResponse,
  mockRequestError,
} from "../../src/testing/response-factory.js";
import { get } from "../../src/request/http-request.js";

// ---------------------------------------------------------------------------
// mockResponse
// ---------------------------------------------------------------------------

describe("mockResponse()", () => {
  it("creates a response with the given status code", () => {
    const response = mockResponse(200);
    expect(response.status).toBe(200);
  });

  it("creates a 404 response with correct statusText", () => {
    const response = mockResponse(404);
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("Not Found");
  });

  it("creates a 201 Created response", () => {
    const response = mockResponse(201);
    expect(response.status).toBe(201);
    expect(response.statusText).toBe("Created");
  });

  it("creates a 204 No Content response", () => {
    const response = mockResponse(204);
    expect(response.status).toBe(204);
    expect(response.statusText).toBe("No Content");
  });

  it("creates a 500 Internal Server Error response", () => {
    const response = mockResponse(500);
    expect(response.status).toBe(500);
    expect(response.statusText).toBe("Internal Server Error");
  });

  it("creates a 401 Unauthorized response", () => {
    const response = mockResponse(401);
    expect(response.status).toBe(401);
    expect(response.statusText).toBe("Unauthorized");
  });

  it("unknown status codes get 'Unknown' statusText", () => {
    const response = mockResponse(599);
    expect(response.status).toBe(599);
    expect(response.statusText).toBe("Unknown");
  });

  it("uses a default placeholder request when none is provided", () => {
    const response = mockResponse(200);
    expect(response.request).toBeDefined();
    expect(response.request.method).toBe("GET");
  });

  it("uses a custom request when provided", () => {
    const req = get("https://api.example.com/users");
    const response = mockResponse(200, { request: req });
    expect(response.request).toBe(req);
  });

  it("accepts custom headers", () => {
    const response = mockResponse(200, { headers: { "x-request-id": "abc-123" } });
    expect(response.headers.entries["x-request-id"]).toBe("abc-123");
  });

  it("body is accessible via text when text option is provided", async () => {
    const response = mockResponse(200, { text: "hello world" });
    const textResult = await response.text;
    expect(textResult._tag).toBe("Ok");
    if (textResult._tag === "Ok") {
      expect(textResult.value).toBe("hello world");
    }
  });

  it("body is empty when no text or body option is provided", async () => {
    const response = mockResponse(204);
    const textResult = await response.text;
    expect(textResult._tag).toBe("Err");
    if (textResult._tag === "Err") {
      expect(textResult.error.reason).toBe("EmptyBody");
    }
  });

  it("response is a frozen object", () => {
    const response = mockResponse(200);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it("exposes a ReadableStream on the stream property", () => {
    const response = mockResponse(200);
    expect(response.stream).toBeInstanceOf(ReadableStream);
  });
});

// ---------------------------------------------------------------------------
// mockJsonResponse
// ---------------------------------------------------------------------------

describe("mockJsonResponse()", () => {
  it("creates a response with the given status code", () => {
    const response = mockJsonResponse(200, { data: "value" });
    expect(response.status).toBe(200);
  });

  it("creates a 404 JSON response", () => {
    const response = mockJsonResponse(404, { error: "Not found" });
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("Not Found");
  });

  it("body is accessible via json accessor and returns the passed data", async () => {
    const response = mockJsonResponse(200, { data: "value" });
    const json = await response.json;
    expect(json._tag).toBe("Ok");
    if (json._tag === "Ok") {
      expect(json.value).toEqual({ data: "value" });
    }
  });

  it("body is accessible via json accessor for array data", async () => {
    const response = mockJsonResponse(200, [{ id: 1 }, { id: 2 }]);
    const json = await response.json;
    if (json._tag === "Ok") {
      expect(json.value).toEqual([{ id: 1 }, { id: 2 }]);
    }
  });

  it("sets content-type header to application/json", () => {
    const response = mockJsonResponse(200, {});
    expect(response.headers.entries["content-type"]).toContain("application/json");
  });

  it("accepts custom headers in addition to content-type", () => {
    const response = mockJsonResponse(200, {}, { headers: { "x-trace-id": "trace-001" } });
    expect(response.headers.entries["x-trace-id"]).toBe("trace-001");
    expect(response.headers.entries["content-type"]).toContain("application/json");
  });

  it("custom headers override content-type when explicitly provided", () => {
    const response = mockJsonResponse(200, {}, { headers: { "content-type": "application/hal+json" } });
    expect(response.headers.entries["content-type"]).toBe("application/hal+json");
  });

  it("uses a default placeholder request when none is provided", () => {
    const response = mockJsonResponse(200, {});
    expect(response.request).toBeDefined();
    expect(response.request.method).toBe("GET");
  });

  it("uses a custom request when provided", () => {
    const req = get("https://api.example.com/items");
    const response = mockJsonResponse(200, { items: [] }, { request: req });
    expect(response.request).toBe(req);
  });

  it("creates a 201 Created response with nested body", async () => {
    const body = { id: 99, name: "Widget", tags: ["a", "b"] };
    const response = mockJsonResponse(201, body);
    expect(response.status).toBe(201);
    const json = await response.json;
    if (json._tag === "Ok") {
      expect(json.value).toEqual(body);
    }
  });

  it("response is a frozen object", () => {
    const response = mockJsonResponse(200, {});
    expect(Object.isFrozen(response)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mockStreamResponse
// ---------------------------------------------------------------------------

describe("mockStreamResponse()", () => {
  it("creates a response with the given status code", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("chunk1")]);
    expect(response.status).toBe(200);
  });

  it("stream emits all provided chunks in order", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("hello "), encoder.encode("world")];
    const response = mockStreamResponse(200, chunks);

    const reader = response.stream.getReader();
    const collected: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      collected.push(new TextDecoder().decode(value));
    }

    expect(collected).toEqual(["hello ", "world"]);
  });

  it("stream closes after all chunks are emitted", async () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("data")]);

    const reader = response.stream.getReader();
    await reader.read(); // consume chunk
    const { done } = await reader.read();

    expect(done).toBe(true);
  });

  it("accepts custom headers", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("x")], {
      headers: { "content-type": "text/event-stream" },
    });
    expect(response.headers.entries["content-type"]).toBe("text/event-stream");
  });

  it("uses a custom request when provided", () => {
    const req = get("https://api.example.com/stream");
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("event")], { request: req });
    expect(response.request).toBe(req);
  });
});

// ---------------------------------------------------------------------------
// mockRequestError
// ---------------------------------------------------------------------------

describe("mockRequestError()", () => {
  it("creates an HttpRequestError with reason Transport", () => {
    const error = mockRequestError("Transport");
    expect(error._tag).toBe("HttpRequestError");
    expect(error.reason).toBe("Transport");
  });

  it("creates an HttpRequestError with reason Timeout", () => {
    const error = mockRequestError("Timeout");
    expect(error.reason).toBe("Timeout");
  });

  it("creates an HttpRequestError with reason Aborted", () => {
    const error = mockRequestError("Aborted");
    expect(error.reason).toBe("Aborted");
  });

  it("creates an HttpRequestError with reason InvalidUrl", () => {
    const error = mockRequestError("InvalidUrl");
    expect(error.reason).toBe("InvalidUrl");
  });

  it("uses the provided message", () => {
    const error = mockRequestError("Transport", "ECONNREFUSED");
    expect(error.message).toBe("ECONNREFUSED");
  });

  it("uses a default message when none is provided", () => {
    const error = mockRequestError("Transport");
    expect(error.message).toContain("Transport");
  });

  it("includes a default placeholder request", () => {
    const error = mockRequestError("Timeout");
    expect(error.request).toBeDefined();
    expect(error.request.method).toBe("GET");
  });

  it("uses a custom request when provided", () => {
    const req = get("https://api.example.com/resource");
    const error = mockRequestError("Aborted", "User aborted", req);
    expect(error.request).toBe(req);
  });

  it("error is a frozen object", () => {
    const error = mockRequestError("Transport");
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mockStreamResponse — delayBetweenChunks and additional paths
// ---------------------------------------------------------------------------

describe("mockStreamResponse() — additional coverage", () => {
  it("delayBetweenChunks > 0 still delivers all chunks in order", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("first"), encoder.encode("second")];
    const response = mockStreamResponse(200, chunks, { delayBetweenChunks: 10 });

    const reader = response.stream.getReader();
    const collected: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      collected.push(new TextDecoder().decode(value));
    }

    expect(collected).toEqual(["first", "second"]);
  }, 5000);

  it("delayBetweenChunks > 0 stream closes after all chunks are delivered", async () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("x")], { delayBetweenChunks: 10 });

    const reader = response.stream.getReader();
    await reader.read(); // consume the one chunk
    const { done } = await reader.read();

    expect(done).toBe(true);
  }, 5000);

  it("explicit request option is set on the response", () => {
    const req = get("https://api.example.com/events");
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("data")], { request: req });

    expect(response.request).toBe(req);
  });

  it("default (no options) creates a stream that closes immediately with no chunks", async () => {
    const response = mockStreamResponse(200, []);

    const reader = response.stream.getReader();
    const { done } = await reader.read();

    expect(done).toBe(true);
  });

  it("default request is a GET when no request option is provided", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("hi")]);

    expect(response.request.method).toBe("GET");
  });
});

// ---------------------------------------------------------------------------
// mockResponse — additional paths
// ---------------------------------------------------------------------------

describe("mockResponse() — additional coverage", () => {
  it("request option is set on the response", () => {
    const req = get("https://api.example.com/check");
    const response = mockResponse(200, { request: req });

    expect(response.request).toBe(req);
  });

  it("text option creates a response with readable text body", async () => {
    const response = mockResponse(200, { text: "body text content" });

    const textResult = await response.text;
    expect(textResult._tag).toBe("Ok");
    if (textResult._tag === "Ok") {
      expect(textResult.value).toBe("body text content");
    }
  });
});

// ---------------------------------------------------------------------------
// mockJsonResponse — headers combined with request option
// ---------------------------------------------------------------------------

describe("mockJsonResponse() — headers and request option", () => {
  it("applies both headers and request when both options are provided", () => {
    const req = get("https://api.example.com/items");
    const response = mockJsonResponse(200, { id: 1 }, {
      headers: { "x-trace-id": "trace-abc" },
      request: req,
    });

    expect(response.request).toBe(req);
    expect(response.headers.entries["x-trace-id"]).toBe("trace-abc");
    expect(response.headers.entries["content-type"]).toContain("application/json");
  });
});

// ---------------------------------------------------------------------------
// mockRequestError — message and request options
// ---------------------------------------------------------------------------

describe("mockRequestError() — additional coverage", () => {
  it("explicit message overrides the default message", () => {
    const error = mockRequestError("Transport", "ECONNREFUSED: connection refused");
    expect(error.message).toBe("ECONNREFUSED: connection refused");
  });

  it("explicit request overrides the default request", () => {
    const req = get("https://api.example.com/resource");
    const error = mockRequestError("Timeout", "timed out after 5s", req);
    expect(error.request).toBe(req);
  });

  it("default message follows the pattern when no message is provided", () => {
    const error = mockRequestError("Aborted");
    expect(error.message).toContain("Aborted");
  });
});

// ---------------------------------------------------------------------------
// statusTextForCode — complete coverage for all lookup table entries
// ---------------------------------------------------------------------------

describe("statusTextForCode — all lookup table entries via mockResponse()", () => {
  it.each([
    [200, "OK"],
    [301, "Moved Permanently"],
    [302, "Found"],
    [304, "Not Modified"],
    [400, "Bad Request"],
    [403, "Forbidden"],
    [405, "Method Not Allowed"],
    [409, "Conflict"],
    [422, "Unprocessable Entity"],
    [429, "Too Many Requests"],
    [502, "Bad Gateway"],
    [503, "Service Unavailable"],
    [504, "Gateway Timeout"],
  ])("mockResponse(%i) has statusText %s", (status, expectedText) => {
    const response = mockResponse(status);
    expect(response.statusText).toBe(expectedText);
  });

  it("mockStreamResponse(200) has statusText 'OK'", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("x")]);
    expect(response.statusText).toBe("OK");
  });

  it("mockStreamResponse(302) has statusText 'Found'", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(302, [encoder.encode("x")]);
    expect(response.statusText).toBe("Found");
  });

  it("mockStreamResponse(503) has statusText 'Service Unavailable'", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(503, [encoder.encode("x")]);
    expect(response.statusText).toBe("Service Unavailable");
  });

  it("mockJsonResponse(302) has statusText 'Found'", () => {
    const response = mockJsonResponse(302, { location: "/new" });
    expect(response.statusText).toBe("Found");
  });

  it("mockJsonResponse(400) has statusText 'Bad Request'", () => {
    const response = mockJsonResponse(400, { error: "bad" });
    expect(response.statusText).toBe("Bad Request");
  });

  it("mockJsonResponse(409) has statusText 'Conflict'", () => {
    const response = mockJsonResponse(409, { error: "conflict" });
    expect(response.statusText).toBe("Conflict");
  });

  it("mockJsonResponse(429) has statusText 'Too Many Requests'", () => {
    const response = mockJsonResponse(429, { error: "rate limited" });
    expect(response.statusText).toBe("Too Many Requests");
  });

  it("mockJsonResponse(502) has statusText 'Bad Gateway'", () => {
    const response = mockJsonResponse(502, { error: "upstream failed" });
    expect(response.statusText).toBe("Bad Gateway");
  });

  it("mockJsonResponse(504) has statusText 'Gateway Timeout'", () => {
    const response = mockJsonResponse(504, { error: "upstream timeout" });
    expect(response.statusText).toBe("Gateway Timeout");
  });
});

// ---------------------------------------------------------------------------
// mockStreamResponse — delayBetweenChunks actually delays delivery
// ---------------------------------------------------------------------------

describe("mockStreamResponse() — timing test for delayBetweenChunks", () => {
  it("delayBetweenChunks > 0 causes actual delay before each chunk", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("a"), encoder.encode("b")];

    const start = Date.now();
    const response = mockStreamResponse(200, chunks, { delayBetweenChunks: 30 });

    const reader = response.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    const elapsed = Date.now() - start;

    // 2 chunks * 30ms delay each = at least 50ms elapsed
    expect(elapsed).toBeGreaterThanOrEqual(50);
  }, 10000);

  it("delayBetweenChunks = 0 resolves without timing delay", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("a"), encoder.encode("b")];

    const start = Date.now();
    const response = mockStreamResponse(200, chunks, { delayBetweenChunks: 0 });

    const reader = response.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    const elapsed = Date.now() - start;

    // Without delay, should complete very quickly
    expect(elapsed).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// Mutant-killing tests — response-factory.ts
// ---------------------------------------------------------------------------

describe("mockResponse() — default request URL (kills StringLiteral mutant)", () => {
  it("default request URL is exactly 'http://mock.test/'", () => {
    const response = mockResponse(200);
    expect(response.request.url).toBe("http://mock.test/");
  });

  it("mockJsonResponse default request URL is exactly 'http://mock.test/'", () => {
    const response = mockJsonResponse(200, {});
    expect(response.request.url).toBe("http://mock.test/");
  });

  it("mockStreamResponse default request URL is exactly 'http://mock.test/'", () => {
    const encoder = new TextEncoder();
    const response = mockStreamResponse(200, [encoder.encode("x")]);
    expect(response.request.url).toBe("http://mock.test/");
  });

  it("mockRequestError default request URL is exactly 'http://mock.test/'", () => {
    const error = mockRequestError("Transport");
    expect(error.request.url).toBe("http://mock.test/");
  });
});

describe("mockStreamResponse() — setTimeout NOT called when delayBetweenChunks=0 (kills ConditionalExpression mutant)", () => {
  it("does not call setTimeout when delayBetweenChunks is 0", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("a"), encoder.encode("b"), encoder.encode("c")];

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const response = mockStreamResponse(200, chunks, { delayBetweenChunks: 0 });
    const reader = response.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("does not call setTimeout when no delayBetweenChunks option is provided", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("x")];

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const response = mockStreamResponse(200, chunks);
    const reader = response.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("DOES call setTimeout when delayBetweenChunks > 0", async () => {
    const encoder = new TextEncoder();
    const chunks = [encoder.encode("a")];

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const response = mockStreamResponse(200, chunks, { delayBetweenChunks: 5 });
    const reader = response.stream.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    expect(setTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  }, 5000);
});
