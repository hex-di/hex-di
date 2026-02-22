/**
 * E2E: Certificate pinning (mock TLS behavior).
 *
 * Tests that HTTPS enforcement rejects non-HTTPS and simulates
 * TLS certificate validation via mock behavior.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { requireHttps } from "../../src/combinators/security/require-https.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("E2E: certificate pinning", () => {
  it("HTTPS enforced end-to-end", async () => {
    const client = requireHttps()(
      createMockHttpClient({
        "GET /api/data": mockJsonResponse(200, {}),
      }),
    );

    // HTTPS passes
    const httpsResult = await client.get("https://secure.example.com/api/data");
    expect(httpsResult._tag).toBe("Ok");

    // HTTP is rejected
    const httpResult = await client.get("http://insecure.example.com/api/data");
    expect(httpResult._tag).toBe("Err");
    if (httpResult._tag === "Err") {
      expect(httpResult.error.reason).toBe("Transport");
      expect(httpResult.error.message).toContain("HTTPS required");
    }
  });

  it("TLS errors surface as HttpRequestError Transport", async () => {
    // Simulate certificate pinning via an interceptor that checks the URL
    const pinnedHosts = new Set(["trusted.api.com"]);

    const certPinningInterceptor = interceptor({
      onRequest: (req) => {
        try {
          const hostname = new URL(req.url).hostname;
          if (!pinnedHosts.has(hostname)) {
            throw new Error(`Certificate pin mismatch for ${hostname}`);
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("Certificate pin")) {
            throw e;
          }
        }
        return req;
      },
    });

    const client = certPinningInterceptor(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // Trusted host passes
    const trusted = await client.get("https://trusted.api.com/data");
    expect(trusted._tag).toBe("Ok");

    // Untrusted host fails with transport error (interceptor throws)
    const untrusted = await client.get("https://untrusted.api.com/data");
    expect(untrusted._tag).toBe("Err");
    if (untrusted._tag === "Err") {
      expect(untrusted.error.reason).toBe("Transport");
      expect(untrusted.error.message).toContain("Certificate pin mismatch");
    }
  });

  it("security headers are attached to all requests", async () => {
    let capturedPin: string | undefined;
    let capturedTls: string | undefined;

    const securityHeaderInterceptor = interceptor({
      onRequest: (req) => {
        const withPin = setRequestHeader("x-certificate-pin", "sha256/abc123")(req);
        return setRequestHeader("x-tls-version", "1.3")(withPin);
      },
    });

    const client = securityHeaderInterceptor(
      createMockHttpClient((req) => {
        capturedPin = req.headers.entries["x-certificate-pin"];
        capturedTls = req.headers.entries["x-tls-version"];
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client.get("https://api.example.com/secure");

    expect(capturedPin).toBe("sha256/abc123");
    expect(capturedTls).toBe("1.3");
  });
});
