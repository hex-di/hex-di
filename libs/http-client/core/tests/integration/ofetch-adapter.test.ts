/**
 * ofetch adapter integration tests.
 *
 * Verifies that a mock HttpClient composes with combinators in the
 * same way a real ofetch-based adapter would.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { interceptor } from "../../src/combinators/interceptor.js";

describe("ofetch adapter integration", () => {
  it("adapter registers in DI graph via HttpClientPort", () => {
    const client = createMockHttpClient({
      "GET /api/v1/data": mockJsonResponse(200, { ok: true }),
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
    let capturedHeaders: Record<string, string> = {};
    const client = createMockHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ok(mockJsonResponse(200, { ok: true }));
    });

    const composed = interceptor({
      onRequest: (req) => req,
      onResponse: (res) => res,
    })(bearerAuth("ofetch-tok")(baseUrl("https://api.ofetch.test")(client)));

    const result = await composed.get("/api/v1/data");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
    expect(capturedHeaders["authorization"]).toBe("Bearer ofetch-tok");
  });

  it("adapter maps network errors to HttpRequestError Transport", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Transport", "ofetch: network error", req)),
    );

    const composed = baseUrl("https://api.ofetch.test")(client);
    const result = await composed.get("/api/v1/data");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("adapter maps timeout to HttpRequestError Timeout", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Timeout", "ofetch timeout", req)),
    );

    const result = await client.get("https://api.ofetch.test/slow");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("adapter maps abort to HttpRequestError Aborted", async () => {
    const client = createMockHttpClient((req) =>
      err(mockRequestError("Aborted", "ofetch: request aborted", req)),
    );

    const result = await client.get("https://api.ofetch.test/abort");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});
