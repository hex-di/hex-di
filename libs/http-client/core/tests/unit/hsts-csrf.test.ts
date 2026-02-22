import { describe, it, expect, vi } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { withHstsEnforcement } from "../../src/combinators/security/hsts.js";
import { withCsrfProtection } from "../../src/combinators/security/csrf.js";
import { createHeaders } from "../../src/types/headers.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("HSTS and CSRF protection", () => {
  it("HTTP requests are upgraded to HTTPS when HSTS is enabled", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withHstsEnforcement({
      preloadedDomains: ["example.com"],
    })(base);

    await client.get("http://example.com/api/data");

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toContain("https://");
    expect(requests[0]!.url).not.toContain("http://example.com");
  });

  it("CSRF token is attached to mutating requests", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withCsrfProtection({
      getToken: () => "my-csrf-token-123",
    })(base);

    await client.post("https://example.com/api/data");

    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.entries["x-csrf-token"]).toBe("my-csrf-token-123");
  });

  it("CSRF token is obtained from the configured source", async () => {
    const getToken = vi.fn().mockReturnValue("dynamic-token-abc");
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withCsrfProtection({ getToken })(base);

    await client.put("https://example.com/api/data");

    expect(getToken).toHaveBeenCalled();
    expect(requests[0]!.headers.entries["x-csrf-token"]).toBe("dynamic-token-abc");
  });

  it("CSRF token rotation is supported", async () => {
    let tokenValue = "token-v1";
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withCsrfProtection({
      getToken: () => tokenValue,
    })(base);

    await client.post("https://example.com/api/first");
    expect(requests[0]!.headers.entries["x-csrf-token"]).toBe("token-v1");

    // Rotate the token
    tokenValue = "token-v2";

    await client.post("https://example.com/api/second");
    expect(requests[1]!.headers.entries["x-csrf-token"]).toBe("token-v2");
  });

  it("HSTS max-age is respected for future requests", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      // Return a response with Strict-Transport-Security header
      return ok(
        createHttpResponse({
          status: 200,
          statusText: "OK",
          headers: createHeaders({
            "strict-transport-security": "max-age=31536000; includeSubDomains",
          }),
          request: req,
        }),
      );
    });

    const client = withHstsEnforcement()(base);

    // First request to HTTPS -- should process the STS header
    await client.get("https://example.com/api/data");

    // Second request using HTTP -- should now be upgraded
    await client.get("http://example.com/api/other");

    expect(requests).toHaveLength(2);
    // The second request should have been upgraded to HTTPS
    expect(requests[1]!.url).toContain("https://");
  });
});
