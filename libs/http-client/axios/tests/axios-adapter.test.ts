/**
 * Tests for the Axios transport adapter.
 *
 * Mocks `axios.create()` to return a controlled axios instance so that
 * no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders as AxiosHeadersType } from "axios";
import { emptyBody, jsonBody } from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock("axios", () => {
  const create = vi.fn(() => ({ request: mockRequest }));
  return { default: { create }, create };
});

import { createAxiosHttpClient, AxiosHttpClientAdapter } from "../src/adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAxiosResponse(
  status: number,
  data: ArrayBuffer,
  headers: Record<string, string> = {},
): { status: number; statusText: string; headers: Record<string, string>; data: ArrayBuffer; config: { headers: Record<string, string> } } {
  return {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers,
    data,
    config: { headers: {} },
  };
}

function textToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

// ---------------------------------------------------------------------------
// createAxiosHttpClient
// ---------------------------------------------------------------------------

describe("createAxiosHttpClient", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer('{"id":1}'), { "content-type": "application/json" }),
    );

    const client = createAxiosHttpClient();
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer("")),
    );

    const client = createAxiosHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    expect(mockRequest).toHaveBeenCalledOnce();
    const calledWith = mockRequest.mock.calls[0][0];
    expect(calledWith.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer("")),
    );

    const client = createAxiosHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledWith = mockRequest.mock.calls[0][0];
    expect(calledWith.headers["content-type"]).toBe("application/json");
    expect(calledWith.data).toBe('{"name":"item"}');
  });

  it("appends query parameters to the URL", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer("")),
    );

    const client = createAxiosHttpClient();
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    const calledWith = mockRequest.mock.calls[0][0];
    expect(calledWith.url).toContain("q=test");
    expect(calledWith.url).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const client = createAxiosHttpClient();
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    const axiosError = new Error("Network Error");
    Object.assign(axiosError, { isAxiosError: true, code: "ERR_NETWORK" });
    mockRequest.mockRejectedValueOnce(axiosError);

    const client = createAxiosHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on cancel", async () => {
    const axiosError = new Error("canceled");
    Object.assign(axiosError, { isAxiosError: true, code: "ERR_CANCELED" });
    mockRequest.mockRejectedValueOnce(axiosError);

    const client = createAxiosHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    const axiosError = new Error("timeout of 0ms exceeded");
    Object.assign(axiosError, { isAxiosError: true, code: "ECONNABORTED" });
    mockRequest.mockRejectedValueOnce(axiosError);

    const client = createAxiosHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer("")),
    );

    const client = createAxiosHttpClient();
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    mockRequest.mockResolvedValueOnce(
      makeAxiosResponse(200, textToArrayBuffer("")),
    );

    const client = createAxiosHttpClient();
    await client.del("https://api.example.com/items/1");

    const calledWith = mockRequest.mock.calls[0][0];
    expect(calledWith.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// AxiosHttpClientAdapter
// ---------------------------------------------------------------------------

describe("AxiosHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(AxiosHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(AxiosHttpClientAdapter.lifetime).toBe("singleton");
  });
});
