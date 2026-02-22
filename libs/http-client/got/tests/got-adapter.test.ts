/**
 * Tests for the Got transport adapter.
 *
 * Mocks `got.extend()` to return a callable mock so that
 * no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { emptyBody, jsonBody } from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockGotInstance } = vi.hoisted(() => {
  const fn = vi.fn();
  return { mockGotInstance: Object.assign(fn, { extend: vi.fn(() => fn) }) };
});

vi.mock("got", () => {
  return { default: mockGotInstance };
});

import { createGotHttpClient, GotHttpClientAdapter } from "../src/adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGotResponse(
  statusCode: number,
  rawBody: Buffer,
  headers: Record<string, string> = {},
): { statusCode: number; statusMessage: string; headers: Record<string, string>; rawBody: Buffer } {
  return {
    statusCode,
    statusMessage: statusCode === 200 ? "OK" : "Error",
    headers,
    rawBody,
  };
}

// ---------------------------------------------------------------------------
// createGotHttpClient
// ---------------------------------------------------------------------------

describe("createGotHttpClient", () => {
  beforeEach(() => {
    mockGotInstance.mockReset();
  });

  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from('{"id":1}'), { "content-type": "application/json" }),
    );

    const client = createGotHttpClient();
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from("")),
    );

    const client = createGotHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    expect(mockGotInstance).toHaveBeenCalledOnce();
    const calledWith = mockGotInstance.mock.calls[0][1];
    expect(calledWith.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from("")),
    );

    const client = createGotHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledWith = mockGotInstance.mock.calls[0][1];
    expect(calledWith.headers["content-type"]).toBe("application/json");
    expect(calledWith.body).toBe('{"name":"item"}');
  });

  it("appends query parameters to the URL", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from("")),
    );

    const client = createGotHttpClient();
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    const calledUrl = mockGotInstance.mock.calls[0][0];
    expect(calledUrl).toContain("q=test");
    expect(calledUrl).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const client = createGotHttpClient();
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    const requestError = new Error("connect ECONNREFUSED");
    Object.assign(requestError, { name: "RequestError" });
    mockGotInstance.mockRejectedValueOnce(requestError);

    const client = createGotHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on cancel", async () => {
    const cancelError = new Error("canceled");
    Object.assign(cancelError, { name: "CancelError" });
    mockGotInstance.mockRejectedValueOnce(cancelError);

    const client = createGotHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    const timeoutError = new Error("Timeout awaiting");
    Object.assign(timeoutError, { name: "TimeoutError" });
    mockGotInstance.mockRejectedValueOnce(timeoutError);

    const client = createGotHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from("")),
    );

    const client = createGotHttpClient();
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    mockGotInstance.mockResolvedValueOnce(
      makeGotResponse(200, Buffer.from("")),
    );

    const client = createGotHttpClient();
    await client.del("https://api.example.com/items/1");

    const calledWith = mockGotInstance.mock.calls[0][1];
    expect(calledWith.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// GotHttpClientAdapter
// ---------------------------------------------------------------------------

describe("GotHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(GotHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(GotHttpClientAdapter.lifetime).toBe("singleton");
  });
});
