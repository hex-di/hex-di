/**
 * Tests for the Bun fetch transport adapter.
 *
 * Passes a mock fetch function via `createBunHttpClient({ fetch: mockFetch })`
 * so that no `vi.mock()` of external modules is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBunHttpClient, BunHttpClientAdapter } from "../src/adapter.js";
import { emptyBody, jsonBody } from "@hex-di/http-client";

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

function makeMockFetch(
  handler: (input: string | URL, init?: RequestInit) => Response | Promise<Response>,
): typeof globalThis.fetch {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) =>
    Promise.resolve(handler(input, init)),
  ) as unknown as typeof globalThis.fetch;
}

function makeRejectingFetch(error: unknown): typeof globalThis.fetch {
  return vi.fn().mockImplementation(() =>
    Promise.reject(error),
  ) as unknown as typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// createBunHttpClient
// ---------------------------------------------------------------------------

describe("createBunHttpClient", () => {
  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    const mockFetch = makeMockFetch(() =>
      makeOkResponse(JSON.stringify({ id: 1 }), { "content-type": "application/json" }),
    );

    const client = createBunHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    let capturedInit: RequestInit | undefined;
    const mockFetch = makeMockFetch((_url, init) => {
      capturedInit = init;
      return makeOkResponse();
    });

    const client = createBunHttpClient({ fetch: mockFetch });
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

    const client = createBunHttpClient({ fetch: mockFetch });
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

    const client = createBunHttpClient({ fetch: mockFetch });
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    expect(capturedUrl).toContain("q=test");
    expect(capturedUrl).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const mockFetch = makeMockFetch(() => makeOkResponse());
    const client = createBunHttpClient({ fetch: mockFetch });
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    const mockFetch = makeRejectingFetch(new TypeError("Failed to fetch"));

    const client = createBunHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on abort", async () => {
    const mockFetch = makeRejectingFetch(
      new DOMException("aborted", "AbortError"),
    );

    const client = createBunHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    const mockFetch = makeRejectingFetch(
      new DOMException("signal timed out", "TimeoutError"),
    );

    const client = createBunHttpClient({ fetch: mockFetch });
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    const mockFetch = makeMockFetch(() => makeOkResponse());

    const client = createBunHttpClient({ fetch: mockFetch });
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

    const client = createBunHttpClient({ fetch: mockFetch });
    await client.del("https://api.example.com/items/1");

    expect(capturedInit?.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// BunHttpClientAdapter
// ---------------------------------------------------------------------------

describe("BunHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(BunHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(BunHttpClientAdapter.lifetime).toBe("singleton");
  });
});
