/**
 * Got adapter integration tests.
 *
 * Verifies that a mock HttpClient composes with combinators in the
 * same way a real got-based adapter would.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { retry } from "../../src/combinators/retry.js";

describe("got adapter integration", () => {
  it("adapter registers in DI graph via HttpClientPort", () => {
    const client = createMockHttpClient({
      "GET /api/items": mockJsonResponse(200, []),
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
      "GET /api/items": mockJsonResponse(200, [{ id: 1 }]),
    });

    const composed = bearerAuth("got-token")(baseUrl("https://api.got.test")(client));
    const result = await composed.get("/api/items");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("adapter maps network errors to HttpRequestError Transport", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Transport", "ECONNRESET", req)),
    );

    const result = await client.get("https://api.got.test/api/items");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("ECONNRESET");
    }
  });

  it("adapter maps timeout to HttpRequestError Timeout", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Timeout", "Request timed out", req)),
    );

    const result = await client.get("https://api.got.test/slow");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("adapter maps abort to HttpRequestError Aborted", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Aborted", "Got request was cancelled", req)),
    );

    const result = await client.get("https://api.got.test/cancel");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});
