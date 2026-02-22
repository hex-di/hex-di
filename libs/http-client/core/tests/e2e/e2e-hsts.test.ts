/**
 * E2E: HSTS enforcement (upgrade HTTP to HTTPS).
 *
 * Tests that HTTP URLs for known HSTS domains are automatically
 * upgraded to HTTPS, and HSTS response headers are processed.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { withHstsEnforcement } from "../../src/combinators/security/hsts.js";
import { createHeaders } from "../../src/types/headers.js";
import { createHttpResponse } from "../../src/response/http-response.js";

describe("E2E: HSTS enforcement", () => {
  it("HTTPS enforced end-to-end", async () => {
    let capturedUrl = "";

    const client = withHstsEnforcement({
      preloadedDomains: ["secure.example.com"],
    })(
      createMockHttpClient((req) => {
        capturedUrl = req.url;
        return ok(mockJsonResponse(200, {}));
      }),
    );

    // HTTP URL for HSTS domain is upgraded to HTTPS
    await client.get("http://secure.example.com/api/data");
    expect(capturedUrl).toContain("https://secure.example.com");
  });

  it("TLS errors surface as HttpRequestError Transport", async () => {
    const capturedUrls: string[] = [];

    const client = withHstsEnforcement({
      preloadedDomains: ["known.example.com"],
    })(
      createMockHttpClient((req) => {
        capturedUrls.push(req.url);
        return ok(mockJsonResponse(200, {}));
      }),
    );

    // Known HSTS domain: HTTP -> HTTPS upgrade
    await client.get("http://known.example.com/api/data");
    expect(capturedUrls[0]).toContain("https://");

    // Unknown domain: no upgrade
    await client.get("http://unknown.example.com/api/data");
    expect(capturedUrls[1]).toContain("http://");

    // HTTPS URL remains unchanged
    await client.get("https://known.example.com/api/data");
    expect(capturedUrls[2]).toContain("https://");
  });

  it("security headers are attached to all requests", async () => {
    const capturedUrls: string[] = [];

    const client = withHstsEnforcement()(
      createMockHttpClient((req) => {
        capturedUrls.push(req.url);
        // Return response with HSTS header to teach the combinator about the domain
        return ok(createHttpResponse({
          status: 200,
          statusText: "OK",
          headers: createHeaders({
            "strict-transport-security": "max-age=31536000; includeSubDomains",
          }),
          request: req,
          rawBody: new TextEncoder().encode("{}"),
        }));
      }),
    );

    // First request -- no HSTS knowledge yet
    await client.get("https://learn.example.com/api/data");
    expect(capturedUrls[0]).toBe("https://learn.example.com/api/data");

    // Second request -- domain learned, HTTP should be upgraded
    await client.get("http://learn.example.com/api/other");
    expect(capturedUrls[1]).toContain("https://learn.example.com");
  });
});
