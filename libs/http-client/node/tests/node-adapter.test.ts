/**
 * Tests for the Node.js http/https transport adapter.
 *
 * Mocks `node:http` and `node:https` modules. The `transport.request()` returns
 * a mock ClientRequest; the callback receives a mock IncomingMessage with
 * `.on("data")` and `.on("end")`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { emptyBody, jsonBody } from "@hex-di/http-client";

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures variables are available when vi.mock runs
// ---------------------------------------------------------------------------

const { mockHttpRequest, mockHttpsRequest } = vi.hoisted(() => ({
  mockHttpRequest: vi.fn(),
  mockHttpsRequest: vi.fn(),
}));

vi.mock("node:http", () => ({
  request: mockHttpRequest,
  Agent: class MockHttpAgent {},
}));

vi.mock("node:https", () => ({
  request: mockHttpsRequest,
  Agent: class MockHttpsAgent {},
}));

import { createNodeHttpClient, NodeHttpClientAdapter } from "../src/adapter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockClientRequest(): EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> } {
  const req = new EventEmitter();
  Object.assign(req, {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  });
  return req as EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
}

function simulateSuccessResponse(
  mockTransport: ReturnType<typeof vi.fn>,
  statusCode: number,
  body: string = "",
  headers: Record<string, string> = {},
): void {
  mockTransport.mockImplementation((_options: unknown, cb: (res: EventEmitter) => void) => {
    const req = createMockClientRequest();

    queueMicrotask(() => {
      const incomingMessage = new EventEmitter();
      Object.assign(incomingMessage, {
        statusCode,
        statusMessage: statusCode === 200 ? "OK" : "Error",
        headers,
      });
      cb(incomingMessage);
      if (body.length > 0) {
        incomingMessage.emit("data", Buffer.from(body));
      }
      incomingMessage.emit("end");
    });

    return req;
  });
}

function simulateErrorResponse(
  mockTransport: ReturnType<typeof vi.fn>,
  error: Error,
): void {
  mockTransport.mockImplementation((_options: unknown, _cb: unknown) => {
    const req = createMockClientRequest();

    queueMicrotask(() => {
      req.emit("error", error);
    });

    return req;
  });
}

// ---------------------------------------------------------------------------
// createNodeHttpClient
// ---------------------------------------------------------------------------

describe("createNodeHttpClient", () => {
  beforeEach(() => {
    mockHttpRequest.mockReset();
    mockHttpsRequest.mockReset();
  });

  it("makes a GET request and returns Ok(HttpResponse)", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200, '{"id":1}', {
      "content-type": "application/json",
    });

    const client = createNodeHttpClient();
    const result = await client.get("https://api.example.com/users/1");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe(200);
    }
  });

  it("passes correct method for POST requests", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200);

    const client = createNodeHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledOptions = mockHttpsRequest.mock.calls[0][0];
    expect(calledOptions.method).toBe("POST");
  });

  it("sends JSON body with correct content-type header", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200);

    const client = createNodeHttpClient();
    await client.post("https://api.example.com/items", {
      json: { name: "item" },
    });

    const calledOptions = mockHttpsRequest.mock.calls[0][0];
    expect(calledOptions.headers["content-type"]).toBe("application/json");
  });

  it("appends query parameters to the URL", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200);

    const client = createNodeHttpClient();
    await client.get("https://api.example.com/search", {
      urlParams: { q: "test", page: "1" },
    });

    const calledOptions = mockHttpsRequest.mock.calls[0][0];
    const path: string = calledOptions.path;
    expect(path).toContain("q=test");
    expect(path).toContain("page=1");
  });

  it("returns Err(HttpRequestError) for invalid URL", async () => {
    const client = createNodeHttpClient();
    const result = await client.get("not a valid url");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });

  it("returns Err(HttpRequestError) with reason Transport on network failure", async () => {
    const error = new Error("connect ECONNREFUSED");
    Object.assign(error, { code: "ECONNREFUSED" });
    simulateErrorResponse(mockHttpsRequest, error);

    const client = createNodeHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("returns Err(HttpRequestError) with reason Aborted on abort", async () => {
    simulateErrorResponse(
      mockHttpsRequest,
      new DOMException("Request aborted", "AbortError"),
    );

    const client = createNodeHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Aborted");
    }
  });

  it("returns Err(HttpRequestError) with reason Timeout on timeout", async () => {
    simulateErrorResponse(
      mockHttpsRequest,
      new DOMException("Request timeout", "TimeoutError"),
    );

    const client = createNodeHttpClient();
    const result = await client.get("https://api.example.com/data");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("preserves request back-reference in the response", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200);

    const client = createNodeHttpClient();
    const result = await client.get("https://api.example.com/ping");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.request.method).toBe("GET");
      expect(result.value.request.url).toBe("https://api.example.com/ping");
    }
  });

  it("passes DELETE method for del()", async () => {
    simulateSuccessResponse(mockHttpsRequest, 200);

    const client = createNodeHttpClient();
    await client.del("https://api.example.com/items/1");

    const calledOptions = mockHttpsRequest.mock.calls[0][0];
    expect(calledOptions.method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// NodeHttpClientAdapter
// ---------------------------------------------------------------------------

describe("NodeHttpClientAdapter", () => {
  it("provides HttpClientPort with name HttpClient", () => {
    expect(NodeHttpClientAdapter.provides.__portName).toBe("HttpClient");
  });

  it("has singleton lifetime", () => {
    expect(NodeHttpClientAdapter.lifetime).toBe("singleton");
  });
});
