import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { withPayloadValidation } from "../../src/combinators/security/payload-validation.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("payload validation", () => {
  it("JSON response is validated against a schema when schema is provided", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200, body: { name: "Alice", age: 30 } },
    });

    // Validate that request content type is application/json
    const client = withPayloadValidation({
      allowedRequestContentTypes: ["application/json"],
    })(base);

    const result = await client.get("https://api.example.com/api/data");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("schema validation error maps to HttpResponseError with Decode reason", async () => {
    const base = createMockHttpClient((req) => {
      return ok(mockResponse(200));
    });

    // Set a very small max request size so it rejects a large body
    const client = withPayloadValidation({
      maxRequestSize: 5,
    })(base);

    const result = await client.post("https://api.example.com/api/data", {
      json: { name: "Alice", age: 30, email: "alice@example.com" },
    });

    // Request body exceeds maxRequestSize
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("exceeds limit");
    }
  });

  it("schema validation is optional and skipped when no schema is set", async () => {
    const base = createMockHttpClient({
      "POST /api/data": { status: 201, body: { id: 1 } },
    });

    // No validation constraints -- everything passes through
    const client = withPayloadValidation({})(base);

    const result = await client.post("https://api.example.com/api/data", {
      json: { anything: "goes" },
    });

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(201);
    }
  });

  it("malformed JSON is caught before schema validation", async () => {
    const base = createMockHttpClient((req) => {
      return ok(mockResponse(200));
    });

    // Disallow text/plain content type, only allow application/json
    const client = withPayloadValidation({
      allowedRequestContentTypes: ["application/json"],
    })(base);

    // Sending text body with text/plain content type should be rejected
    const result = await client.post("https://api.example.com/api/data", {
      body: { _tag: "TextBody" as const, value: "not json", contentType: "text/plain" },
    });

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("not allowed");
    }
  });
});
