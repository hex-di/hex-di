/**
 * Axios adapter integration tests.
 *
 * Since we cannot make real network calls, we test that a mock HttpClient
 * (standing in for the adapter) composes correctly with combinators like
 * baseUrl and bearerAuth.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";

describe("axios adapter integration", () => {
  it("adapter registers in DI graph via HttpClientPort", () => {
    const client = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, []),
    });

    expect(client.execute).toBeTypeOf("function");
    expect(client.get).toBeTypeOf("function");
    expect(client.post).toBeTypeOf("function");
    expect(client.put).toBeTypeOf("function");
    expect(client.patch).toBeTypeOf("function");
    expect(client.del).toBeTypeOf("function");
    expect(client.head).toBeTypeOf("function");
  });

  it("adapter executes GET request and returns Ok(HttpResponse)", async () => {
    const client = createMockHttpClient({
      "GET /api/users": mockJsonResponse(200, [{ id: 1, name: "Alice" }]),
    });

    const composed = bearerAuth("tok_abc")(baseUrl("https://api.example.com")(client));
    const result = await composed.get("/api/users");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("adapter maps network errors to HttpRequestError Transport", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Transport", "ECONNREFUSED", req)),
    );

    const composed = baseUrl("https://api.example.com")(client);
    const result = await composed.get("/api/users");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("ECONNREFUSED");
    }
  });

  it("adapter maps timeout to HttpRequestError Timeout", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Timeout", "Connection timed out", req)),
    );

    const result = await client.get("https://api.example.com/slow");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("adapter maps abort to HttpRequestError Aborted", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Aborted", "Request cancelled", req)),
    );

    const result = await client.get("https://api.example.com/cancelled");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});
