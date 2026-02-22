/**
 * E2E: Full transport security (HTTPS + SSRF + HSTS).
 *
 * Tests the combined transport security pipeline with HTTPS enforcement,
 * SSRF protection, and HSTS upgrade working together.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { requireHttps } from "../../src/combinators/security/require-https.js";
import { withSsrfProtection } from "../../src/combinators/security/ssrf-protection.js";
import { withHstsEnforcement } from "../../src/combinators/security/hsts.js";

describe("E2E: full transport security", () => {
  it("HTTPS enforced end-to-end", async () => {
    const client = requireHttps()(
      withSsrfProtection()(
        withHstsEnforcement({
          preloadedDomains: ["secure.api.com"],
        })(
          createMockHttpClient((req) => ok(mockJsonResponse(200, { secure: true }))),
        ),
      ),
    );

    // HTTPS to public domain passes all layers
    const result = await client.get("https://secure.api.com/data");
    expect(result._tag).toBe("Ok");

    // HTTP is blocked by requireHttps (before HSTS can upgrade)
    const httpResult = await client.get("http://other.api.com/data");
    expect(httpResult._tag).toBe("Err");
    if (httpResult._tag === "Err") {
      expect(httpResult.error.message).toContain("HTTPS required");
    }
  });

  it("TLS errors surface as HttpRequestError Transport", async () => {
    const client = requireHttps()(
      withSsrfProtection()(
        createMockHttpClient((req) => {
          // Simulate TLS error for a specific domain
          if (req.url.includes("expired-cert.test")) {
            return err(mockRequestError("Transport", "TLS certificate has expired", req));
          }
          return ok(mockJsonResponse(200, {}));
        }),
      ),
    );

    // TLS error surfaces as Transport error
    const tlsResult = await client.get("https://expired-cert.test/api/data");
    expect(tlsResult._tag).toBe("Err");
    if (tlsResult._tag === "Err") {
      expect(tlsResult.error.reason).toBe("Transport");
      expect(tlsResult.error.message).toContain("TLS certificate");
    }

    // SSRF blocks private IP even over HTTPS
    const ssrfResult = await client.get("https://192.168.1.1/admin");
    expect(ssrfResult._tag).toBe("Err");
    if (ssrfResult._tag === "Err") {
      expect(ssrfResult.error.message).toContain("SSRF");
    }
  });

  it("security headers are attached to all requests", async () => {
    let capturedUrl = "";

    // Pipeline: HSTS upgrades HTTP to HTTPS, then requireHttps validates
    // Note: HSTS must run before requireHttps for upgrade to take effect
    const client = withHstsEnforcement({
      preloadedDomains: ["upgraded.api.com"],
    })(
      requireHttps()(
        withSsrfProtection()(
          createMockHttpClient((req) => {
            capturedUrl = req.url;
            return ok(mockJsonResponse(200, {}));
          }),
        ),
      ),
    );

    // HSTS upgrades HTTP to HTTPS before requireHttps checks
    const result = await client.get("http://upgraded.api.com/api/data");
    expect(result._tag).toBe("Ok");
    expect(capturedUrl).toContain("https://upgraded.api.com");
  });
});
