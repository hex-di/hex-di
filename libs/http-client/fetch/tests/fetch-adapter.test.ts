/**
 * Tests for the Fetch API transport adapter.
 *
 * Uses a mock fetch function to avoid real network calls.
 */

import { describe, it, expect, vi } from "vitest";
import { createFetchHttpClient, FetchHttpClientAdapter } from "../src/adapter.js";
import { serializeBody } from "../src/body-serializer.js";
import { mapFetchError } from "../src/error-mapper.js";
import {
  emptyBody,
  textBody,
  jsonBody,
  uint8ArrayBody,
  urlEncodedBody,
  formDataBody,
  streamBody,
} from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse(body?: string, headers?: Record<string, string>): Response {
  return new Response(body ?? null, {
    status: 200,
    statusText: "OK",
    headers: headers ?? {},
  });
}

/**
 * Create a mock fetch function that resolves with the given handler's return value.
 * The handler receives the same arguments as fetch. Handlers should return a Response.
 * To simulate network errors, return a Promise.reject() from the handler.
 */
function makeMockFetch(
  handler: (input: string | URL, init?: RequestInit) => Response | Promise<Response>,
): typeof globalThis.fetch {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) =>
    Promise.resolve(handler(input, init)),
  ) as unknown as typeof globalThis.fetch;
}

/**
 * Create a mock fetch that rejects with the given error.
 */
function makeRejectingFetch(error: unknown): typeof globalThis.fetch {
  return vi.fn().mockImplementation(() => Promise.reject(error)) as unknown as typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Body Serializer
// ---------------------------------------------------------------------------

describe("serializeBody", () => {
  it("returns null body for EmptyBody", () => {
    const result = serializeBody(emptyBody());
    expect(result.body).toBeNull();
    expect(result.contentType).toBeUndefined();
  });

  it("returns string body and contentType for TextBody", () => {
    const result = serializeBody(textBody("hello", "text/plain"));
    expect(result.body).toBe("hello");
    expect(result.contentType).toBe("text/plain");
  });

  it("returns JSON-serialized body for JsonBody", () => {
    const result = serializeBody(jsonBody({ key: "value" }));
    expect(result.body).toBe('{"key":"value"}');
    expect(result.contentType).toBe("application/json");
  });

  it("returns ArrayBuffer body for Uint8ArrayBody", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const result = serializeBody(uint8ArrayBody(bytes, "application/octet-stream"));
    expect(result.body).toBeInstanceOf(ArrayBuffer);
    expect(result.contentType).toBe("application/octet-stream");
    // Verify the buffer contents match
    const resultBytes = new Uint8Array(result.body as ArrayBuffer);
    expect(Array.from(resultBytes)).toEqual([1, 2, 3]);
  });

  it("returns URLSearchParams for UrlEncodedBody", () => {
    const result = serializeBody(urlEncodedBody({ foo: "bar", baz: "qux" }));
    expect(result.body).toBeInstanceOf(URLSearchParams);
    expect(result.contentType).toBe("application/x-www-form-urlencoded");
    const params = result.body;
    if (params instanceof URLSearchParams) {
      expect(params.get("foo")).toBe("bar");
      expect(params.get("baz")).toBe("qux");
    }
  });

  it("returns FormData body with undefined contentType for FormDataBody", () => {
    const fd = new FormData();
    fd.append("field", "value");
    const result = serializeBody(formDataBody(fd));
    expect(result.body).toBe(fd);
    // Browser sets Content-Type with boundary automatically
    expect(result.contentType).toBeUndefined();
  });

  it("returns ReadableStream body for StreamBody", () => {
    const stream = new ReadableStream<Uint8Array>();
    const result = serializeBody(streamBody(stream, { contentType: "application/octet-stream" }));
    expect(result.body).toBe(stream);
    expect(result.contentType).toBe("application/octet-stream");
  });
});

// ---------------------------------------------------------------------------
// Error Mapper
// ---------------------------------------------------------------------------

describe("mapFetchError", () => {
  it("maps DOMException TimeoutError to Timeout", () => {
    const error = new DOMException("signal timed out", "TimeoutError");
    expect(mapFetchError(error)).toBe("Timeout");
  });

  it("maps DOMException AbortError to Aborted", () => {
    const error = new DOMException("aborted", "AbortError");
    expect(mapFetchError(error)).toBe("Aborted");
  });

  it("maps TypeError to Transport", () => {
    const error = new TypeError("Failed to fetch");
    expect(mapFetchError(error)).toBe("Transport");
  });

  it("maps unknown errors to Transport", () => {
    expect(mapFetchError(new Error("unknown"))).toBe("Transport");
    expect(mapFetchError("string error")).toBe("Transport");
    expect(mapFetchError(null)).toBe("Transport");
  });
});

// ---------------------------------------------------------------------------
// createFetchHttpClient
// ---------------------------------------------------------------------------

describe("createFetchHttpClient", () => {
  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    const mockFetch = makeMockFetch(() =>
      makeOkResponse(JSON.stringify({ id: 1 }), { "content-type": "application/json" }),
    );

    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method to fetch", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createFetchHttpClient({ fetch: mockFetch });
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    expect(capturedInit?.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createFetchHttpClient({ fetch: mockFetch });
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const headers = capturedInit?.headers;
    if (headers !== null && typeof headers === "object" && !Array.isArray(headers)) {
      const headerRecord = headers as Record<string, string>;
      expect(headerRecord["content-type"]).toBe("application/json");
    }
    expect(capturedInit?.body).toBe('{"name":"item"}');
  });

  it("appends query parameters to the URL", async () => {
    let capturedUrl: string | undefined;
    const mockFetch = makeMockFetch((url) => {
      capturedUrl = url.toString();
      return makeOkResponse();
    });

    const client = createFetchHttpClient({ fetch: mockFetch });
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    expect(capturedUrl).toContain("q=test");
    expect(capturedUrl).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const mockFetch = makeMockFetch(() => makeOkResponse());
    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toBe("InvalidUrl");
      expect(result.error._tag).toBe("HttpRequestError");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    const mockFetch = makeRejectingFetch(new TypeError("Failed to fetch"));

    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toBe("Transport");
      expect(result.error._tag).toBe("HttpRequestError");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on manual abort", async () => {
    const mockFetch = makeRejectingFetch(new DOMException("aborted", "AbortError"));

    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    const mockFetch = makeRejectingFetch(new DOMException("signal timed out", "TimeoutError"));

    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("merges default requestInit into each request", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createFetchHttpClient({
      fetch: mockFetch,
      requestInit: { credentials: "include" },
    });
    await client.get("https://api.example.com/me");

    expect(capturedInit?.credentials).toBe("include");
  });

  it("uses globalThis.fetch when no custom fetch is provided", () => {
    // This just verifies the factory does not throw when no options are given.
    // Actual network is not called in tests.
    expect(() => createFetchHttpClient()).not.toThrow();
  });

  it("parses response body as JSON via result chain", async () => {
    const mockFetch = makeMockFetch(() =>
      makeOkResponse(JSON.stringify({ name: "Alice" }), {
        "content-type": "application/json",
      }),
    );

    const client = createFetchHttpClient({ fetch: mockFetch });
    const jsonResult = await client
      .get("https://api.example.com/user")
      .andThen((response) => response.json);

    expect(jsonResult.isOk()).toBe(true);
    if (jsonResult.isOk()) {
      expect(jsonResult.value).toEqual({ name: "Alice" });
    }
  });

  it("preserves request back-reference in the response", async () => {
    const mockFetch = makeMockFetch(() => makeOkResponse());

    const client = createFetchHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createFetchHttpClient({ fetch: mockFetch });
    await client.del("https://api.example.com/items/1");

    expect(capturedInit?.method).toBe("DELETE");
  });

  it("passes headers from RequestOptions to fetch", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createFetchHttpClient({ fetch: mockFetch });
    await client.get("https://api.example.com/data", {
      headers: { Authorization: "Bearer token123" },
    });

    const headers = capturedInit?.headers;
    if (headers !== null && typeof headers === "object" && !Array.isArray(headers)) {
      const headerRecord = headers as Record<string, string>;
      expect(headerRecord["authorization"]).toBe("Bearer token123");
    }
  });
});

// ---------------------------------------------------------------------------
// FetchHttpClientAdapter
// ---------------------------------------------------------------------------

describe("FetchHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(FetchHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(FetchHttpClientAdapter.lifetime).toBe("singleton");
  });
});
