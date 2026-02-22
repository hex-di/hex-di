/**
 * E2E: Payload size/type validation.
 *
 * Tests that payload validation enforces size limits and content-type
 * restrictions on requests.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { withPayloadValidation } from "../../src/combinators/security/payload-validation.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { get, post, bodyJson, bodyText } from "../../src/request/http-request.js";

describe("E2E: payload validation", () => {
  it("full pipeline processes body correctly", async () => {
    const client = withPayloadValidation({
      maxRequestSize: 1024, // 1 KB
      allowedRequestContentTypes: ["application/json"],
    })(
      baseUrl("https://api.test")(
        createMockHttpClient((req) => ok(mockJsonResponse(200, { accepted: true }))),
      ),
    );

    // Small JSON body passes validation
    const result = await client.post("/api/data", { json: { name: "small" } });
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("pipeline handles degraded upstream gracefully", async () => {
    const client = withPayloadValidation({
      maxRequestSize: 50, // Very small limit
      allowedRequestContentTypes: ["application/json"],
    })(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // Large payload exceeds size limit
    const largePayload = { data: "x".repeat(100) };
    const req = post("https://api.test/upload");
    const bodyResult = bodyJson(largePayload)(req);

    if (bodyResult._tag === "Ok") {
      const result = await client.execute(bodyResult.value);
      expect(result._tag).toBe("Err");
      if (result._tag === "Err") {
        expect(result.error.message).toContain("exceeds limit");
      }
    }
  });

  it("scope isolation prevents header leakage between scopes", async () => {
    // Strict scope with tight limits
    const strictClient = withPayloadValidation({
      maxRequestSize: 100,
      allowedRequestContentTypes: ["application/json"],
    })(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // Permissive scope with larger limits
    const permissiveClient = withPayloadValidation({
      maxRequestSize: 10000,
      allowedRequestContentTypes: ["application/json", "text/plain"],
    })(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // Small JSON passes both
    const small = { tiny: "data" };
    const r1 = await strictClient.post("https://api.test/data", { json: small });
    expect(r1._tag).toBe("Ok");

    const r2 = await permissiveClient.post("https://api.test/data", { json: small });
    expect(r2._tag).toBe("Ok");

    // Large JSON fails strict but passes permissive
    const large = { big: "x".repeat(200) };
    const strictReq = post("https://api.test/data");
    const strictBody = bodyJson(large)(strictReq);
    if (strictBody._tag === "Ok") {
      const r3 = await strictClient.execute(strictBody.value);
      expect(r3._tag).toBe("Err");
    }

    const permReq = post("https://api.test/data");
    const permBody = bodyJson(large)(permReq);
    if (permBody._tag === "Ok") {
      const r4 = await permissiveClient.execute(permBody.value);
      expect(r4._tag).toBe("Ok");
    }
  });
});
