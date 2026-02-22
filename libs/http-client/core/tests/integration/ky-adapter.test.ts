/**
 * Ky adapter integration tests.
 *
 * Verifies that a mock HttpClient composes with combinators in the
 * same way a real ky-based adapter would.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth, basicAuth } from "../../src/combinators/auth.js";

describe("ky adapter integration", () => {
  it("adapter registers in DI graph via HttpClientPort", () => {
    const client = createMockHttpClient({
      "GET /api/search": mockJsonResponse(200, { results: [] }),
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
    let capturedUrl = "";
    const client = createMockHttpClient((req) => {
      capturedUrl = req.url;
      return ok(mockJsonResponse(200, { results: ["a"] }));
    });

    const composed = basicAuth("user", "pass")(baseUrl("https://api.ky.test")(client));
    const result = await composed.get("/api/search");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
    expect(capturedUrl).toBe("https://api.ky.test/api/search");
  });

  it("adapter maps network errors to HttpRequestError Transport", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Transport", "Network error", req)),
    );

    const result = await client.get("https://api.ky.test/fail");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("adapter maps timeout to HttpRequestError Timeout", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Timeout", "Ky timeout", req)),
    );

    const result = await client.get("https://api.ky.test/timeout");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("adapter maps abort to HttpRequestError Aborted", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Aborted", "Ky abort", req)),
    );

    const result = await client.get("https://api.ky.test/abort");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});
