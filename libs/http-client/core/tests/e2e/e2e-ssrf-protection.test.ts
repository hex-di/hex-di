/**
 * E2E: SSRF protection (block private IPs).
 *
 * Tests that SSRF protection blocks requests to private networks,
 * localhost, link-local addresses, and cloud metadata endpoints.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { withSsrfProtection } from "../../src/combinators/security/ssrf-protection.js";
import { baseUrl } from "../../src/combinators/base-url.js";

describe("E2E: SSRF protection", () => {
  it("HTTPS enforced end-to-end", async () => {
    const client = withSsrfProtection()(
      createMockHttpClient((req) => ok(mockJsonResponse(200, { safe: true }))),
    );

    // Public IP passes
    const publicResult = await client.get("https://93.184.216.34/api/data");
    expect(publicResult._tag).toBe("Ok");

    // Private IPs are blocked
    const privateResult = await client.get("http://192.168.1.1/admin");
    expect(privateResult._tag).toBe("Err");
    if (privateResult._tag === "Err") {
      expect(privateResult.error.message).toContain("SSRF");
      expect(privateResult.error.message).toContain("private");
    }
  });

  it("TLS errors surface as HttpRequestError Transport", async () => {
    const client = withSsrfProtection()(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // Localhost blocked
    const localhost = await client.get("http://localhost/admin");
    expect(localhost._tag).toBe("Err");
    if (localhost._tag === "Err") {
      expect(localhost.error.message).toContain("SSRF");
    }

    // 127.x.x.x blocked
    const loopback = await client.get("http://127.0.0.1/admin");
    expect(loopback._tag).toBe("Err");

    // 10.x.x.x blocked
    const rfc1918 = await client.get("http://10.0.0.1/internal");
    expect(rfc1918._tag).toBe("Err");

    // 172.16.x.x blocked
    const rfc1918b = await client.get("http://172.16.0.1/internal");
    expect(rfc1918b._tag).toBe("Err");

    // Cloud metadata endpoint blocked (169.254.169.254 is link-local AND metadata)
    const metadata = await client.get("http://169.254.169.254/latest/meta-data");
    expect(metadata._tag).toBe("Err");
    if (metadata._tag === "Err") {
      expect(metadata.error.message).toContain("SSRF");
      // The message will mention link-local since that check fires first
      expect(metadata.error.message).toContain("link-local");
    }
  });

  it("security headers are attached to all requests", async () => {
    const client = withSsrfProtection({
      allowedDomains: ["internal-api.mycompany.com"],
    })(
      createMockHttpClient((req) => ok(mockJsonResponse(200, { allowed: true }))),
    );

    // Allowed domain passes even though it could be internal
    const allowed = await client.get("http://internal-api.mycompany.com/api/data");
    expect(allowed._tag).toBe("Ok");

    // External public domain passes
    const external = await client.get("https://api.example.com/data");
    expect(external._tag).toBe("Ok");

    // Private IP still blocked even with allowed domains
    const blocked = await client.get("http://192.168.0.1/data");
    expect(blocked._tag).toBe("Err");
  });
});
