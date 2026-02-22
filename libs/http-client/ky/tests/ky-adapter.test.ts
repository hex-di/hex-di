/**
 * Tests for the Ky transport adapter.
 *
 * Mocks `ky.create()` to return a callable mock so that
 * no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptyBody, jsonBody } from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockKyInstance } = vi.hoisted(() => {
  const fn = vi.fn();
  return { mockKyInstance: Object.assign(fn, { create: vi.fn(() => fn) }) };
});

vi.mock("ky", () => {
  return { default: mockKyInstance };
});

import { createKyHttpClient, KyHttpClientAdapter } from "../src/adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKyResponse(
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
// createKyHttpClient
// ---------------------------------------------------------------------------

describe("createKyHttpClient", () => {
  beforeEach(() => {
    mockKyInstance.mockReset();
  });

  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    mockKyInstance.mockResolvedValueOnce(
      makeKyResponse(200, '{"id":1}', { "content-type": "application/json" }),
    );

    const client = createKyHttpClient();
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    mockKyInstance.mockResolvedValueOnce(makeKyResponse(200));

    const client = createKyHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    expect(mockKyInstance).toHaveBeenCalledOnce();
    const calledWith = mockKyInstance.mock.calls[0][1];
    expect(calledWith.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    mockKyInstance.mockResolvedValueOnce(makeKyResponse(200));

    const client = createKyHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledWith = mockKyInstance.mock.calls[0][1];
    expect(calledWith.headers["content-type"]).toBe("application/json");
    expect(calledWith.body).toBe('{"name":"item"}');
  });

  it("appends query parameters to the URL", async () => {
    mockKyInstance.mockResolvedValueOnce(makeKyResponse(200));

    const client = createKyHttpClient();
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    const calledUrl = mockKyInstance.mock.calls[0][0];
    expect(calledUrl).toContain("q=test");
    expect(calledUrl).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const client = createKyHttpClient();
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    mockKyInstance.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const client = createKyHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on abort", async () => {
    mockKyInstance.mockRejectedValueOnce(
      new DOMException("aborted", "AbortError"),
    );

    const client = createKyHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    mockKyInstance.mockRejectedValueOnce(
      new DOMException("signal timed out", "TimeoutError"),
    );

    const client = createKyHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    mockKyInstance.mockResolvedValueOnce(makeKyResponse(200));

    const client = createKyHttpClient();
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    mockKyInstance.mockResolvedValueOnce(makeKyResponse(200));

    const client = createKyHttpClient();
    await client.del("https://api.example.com/items/1");

    const calledWith = mockKyInstance.mock.calls[0][1];
    expect(calledWith.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// KyHttpClientAdapter
// ---------------------------------------------------------------------------

describe("KyHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(KyHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(KyHttpClientAdapter.lifetime).toBe("singleton");
  });
});
