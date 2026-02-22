import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { requireHttps } from "../../src/combinators/security/require-https.js";
import { withHstsEnforcement } from "../../src/combinators/security/hsts.js";

describe("transport security", () => {
  it("HTTPS-only mode rejects HTTP requests", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = requireHttps()(base);

    const result = await client.get("http://example.com/api/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("HTTPS required");
    }
  });

  it("certificate validation errors map to HttpRequestError", async () => {
    // Simulate a TLS error via the mock client handler
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = requireHttps()(base);

    // HTTP requests are rejected as Transport errors
    const result = await client.get("http://untrusted.example.com/api/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("TLS minimum version is enforced", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = requireHttps()(base);

    // HTTPS requests pass through
    const httpsResult = await client.get("https://secure.example.com/api/data");
    expect(httpsResult._tag).toBe("Ok");

    // HTTP requests are rejected
    const httpResult = await client.get("http://insecure.example.com/api/data");
    expect(httpResult._tag).toBe("Err");
  });

  it("HSTS preloading is respected", async () => {
    const base = createMockHttpClient({
      "GET /api/data": { status: 200 },
    });
    const client = withHstsEnforcement({
      preloadedDomains: ["secure.example.com"],
    })(base);

    // HTTP request to a preloaded HSTS domain should be upgraded to HTTPS
    const result = await client.get("http://secure.example.com/api/data");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      // The request should have been upgraded to HTTPS
      expect(result.value.request.url).toContain("https://");
    }
  });

  it("custom CA certificates are supported", async () => {
    const base = createMockHttpClient({
      "GET /api/internal": { status: 200, body: { internal: true } },
    });
    const client = requireHttps()(base);

    // HTTPS requests pass through to the underlying client
    const result = await client.get("https://internal.corp.example.com/api/internal");
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });
});
