/**
 * Tests for the Ofetch transport adapter.
 *
 * Mocks `$fetch.create()` to return a mock with `.raw()` that resolves
 * with a Response-like object so that no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptyBody, jsonBody } from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockRaw } = vi.hoisted(() => ({
  mockRaw: vi.fn(),
}));

vi.mock("ofetch", () => {
  const mockInstance = Object.assign(vi.fn(), { raw: mockRaw });
  const create = vi.fn(() => mockInstance);
  const $fetch = Object.assign(vi.fn(), { create, raw: mockRaw });
  return { $fetch };
});

import { createOfetchHttpClient, OfetchHttpClientAdapter } from "../src/adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOfetchResponse(
  status: number,
  body: string = "",
  headers: Record<string, string> = {},
): {
  status: number;
  statusText: string;
  headers: { forEach: (cb: (value: string, key: string) => void) => void };
  arrayBuffer: () => Promise<ArrayBuffer>;
} {
  const headerMap = new Map(Object.entries(headers));
  return {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      forEach(cb: (value: string, key: string) => void) {
        headerMap.forEach(cb);
      },
    },
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body).buffer),
  };
}

// ---------------------------------------------------------------------------
// createOfetchHttpClient
// ---------------------------------------------------------------------------

describe("createOfetchHttpClient", () => {
  beforeEach(() => {
    mockRaw.mockReset();
  });

  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    mockRaw.mockResolvedValueOnce(
      makeOfetchResponse(200, '{"id":1}', { "content-type": "application/json" }),
    );

    const client = createOfetchHttpClient();
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    mockRaw.mockResolvedValueOnce(makeOfetchResponse(200));

    const client = createOfetchHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    expect(mockRaw).toHaveBeenCalledOnce();
    const calledWith = mockRaw.mock.calls[0][1];
    expect(calledWith.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    mockRaw.mockResolvedValueOnce(makeOfetchResponse(200));

    const client = createOfetchHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledWith = mockRaw.mock.calls[0][1];
    expect(calledWith.headers["content-type"]).toBe("application/json");
    expect(calledWith.body).toBe('{"name":"item"}');
  });

  it("appends query parameters to the URL", async () => {
    mockRaw.mockResolvedValueOnce(makeOfetchResponse(200));

    const client = createOfetchHttpClient();
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    const calledUrl = mockRaw.mock.calls[0][0];
    expect(calledUrl).toContain("q=test");
    expect(calledUrl).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const client = createOfetchHttpClient();
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    mockRaw.mockRejectedValueOnce(new TypeError("fetch failed"));

    const client = createOfetchHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on abort", async () => {
    mockRaw.mockRejectedValueOnce(
      new DOMException("aborted", "AbortError"),
    );

    const client = createOfetchHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    mockRaw.mockRejectedValueOnce(
      new DOMException("signal timed out", "TimeoutError"),
    );

    const client = createOfetchHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    mockRaw.mockResolvedValueOnce(makeOfetchResponse(200));

    const client = createOfetchHttpClient();
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    mockRaw.mockResolvedValueOnce(makeOfetchResponse(200));

    const client = createOfetchHttpClient();
    await client.del("https://api.example.com/items/1");

    const calledWith = mockRaw.mock.calls[0][1];
    expect(calledWith.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// OfetchHttpClientAdapter
// ---------------------------------------------------------------------------

describe("OfetchHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(OfetchHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(OfetchHttpClientAdapter.lifetime).toBe("singleton");
  });
});
