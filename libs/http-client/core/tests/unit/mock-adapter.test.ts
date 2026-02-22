import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClientAdapter } from "../../src/testing/mock-adapter.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { HttpClientPort } from "../../src/ports/http-client-port.js";

describe("MockHttpClientAdapter", () => {
  it("MockHttpClientAdapter can be registered in a DI graph", () => {
    const adapter = createMockHttpClientAdapter({
      routesOrHandler: {
        "GET /api/users": { status: 200, body: [] },
      },
    });

    // The adapter should have the correct port reference
    expect(adapter.provides).toBe(HttpClientPort);
    expect(adapter.lifetime).toBeDefined();
    expect(typeof adapter.factory).toBe("function");
  });

  it("MockHttpClientAdapter routes requests to configured handlers", async () => {
    // Use createMockHttpClient directly to test route matching
    const client = createMockHttpClient({
      "GET /api/users": { status: 200, body: [{ id: 1, name: "Alice" }] },
      "POST /api/users": { status: 201, body: { id: 2 } },
    });

    const getResult = await client.get("/api/users");
    expect(getResult._tag).toBe("Ok");
    if (getResult._tag === "Ok") {
      expect(getResult.value.status).toBe(200);
    }

    const postResult = await client.post("/api/users");
    expect(postResult._tag).toBe("Ok");
    if (postResult._tag === "Ok") {
      expect(postResult.value.status).toBe(201);
    }
  });

  it("unmatched routes return a Transport error", async () => {
    const client = createMockHttpClient({
      "GET /api/users": { status: 200 },
    });

    // Request to an unmatched route should return Transport error
    const result = await client.get("/api/unknown");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("No mock route matches");
    }
  });

  it("MockHttpClientAdapter records all requests for assertion", async () => {
    const requests: string[] = [];
    const client = createMockHttpClient((req) => {
      requests.push(`${req.method} ${req.url}`);
      return ok(mockResponse(200));
    });

    await client.get("/api/a");
    await client.post("/api/b");
    await client.del("/api/c");

    expect(requests).toEqual([
      "GET /api/a",
      "POST /api/b",
      "DELETE /api/c",
    ]);
  });

  it("MockHttpClientAdapter supports route globs", async () => {
    const client = createMockHttpClient({
      "GET /api/users/*": { status: 200, body: { found: true } },
      "DELETE /api/**": { status: 204 },
    });

    const userResult = await client.get("/api/users/42");
    expect(userResult._tag).toBe("Ok");
    if (userResult._tag === "Ok") {
      expect(userResult.value.status).toBe(200);
    }

    const deleteResult = await client.del("/api/deeply/nested/resource");
    expect(deleteResult._tag).toBe("Ok");
    if (deleteResult._tag === "Ok") {
      expect(deleteResult.value.status).toBe(204);
    }
  });
});
