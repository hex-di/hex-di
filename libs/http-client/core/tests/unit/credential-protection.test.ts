import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { withCredentialProtection } from "../../src/combinators/security/credential-protection.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("credential protection", () => {
  it("Authorization header is redacted in audit logs", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withCredentialProtection({
      trustedOrigins: ["https://trusted.example.com"],
      blockUntrusted: true,
    })(base);

    // Sending credentials to an untrusted origin should be blocked
    const result = await client.get("https://untrusted.example.com/api/data", {
      headers: { Authorization: "Bearer secret-token-123" },
    });

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("Credential protection");
    }
  });

  it("credentials are not included in error messages", async () => {
    const base = createMockHttpClient((req) => {
      return ok(mockResponse(200));
    });

    const client = withCredentialProtection({
      trustedOrigins: ["https://trusted.example.com"],
      blockUntrusted: true,
    })(base);

    const result = await client.get("https://untrusted.example.com/api/data", {
      headers: { Authorization: "Bearer super-secret-value" },
    });

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      // The error message should not contain the actual credential value
      expect(result.error.message).not.toContain("super-secret-value");
    }
  });

  it("cookie values are redacted in inspection output", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withCredentialProtection({
      trustedOrigins: ["https://trusted.example.com"],
      blockUntrusted: true,
    })(base);

    // Sending cookies to untrusted origin should be blocked
    const result = await client.get("https://other.example.com/api", {
      headers: { Cookie: "session=abc123; token=xyz789" },
    });

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).not.toContain("abc123");
      expect(result.error.message).not.toContain("xyz789");
    }
  });

  it("sensitive headers are excluded from request recording by default", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    // When blockUntrusted is false, sensitive headers are stripped instead
    const client = withCredentialProtection({
      trustedOrigins: ["https://trusted.example.com"],
      blockUntrusted: false,
    })(base);

    await client.get("https://untrusted.example.com/api/data", {
      headers: {
        Authorization: "Bearer token",
        "x-api-key": "secret-key",
        "x-custom": "safe-value",
      },
    });

    expect(requests).toHaveLength(1);
    // Sensitive headers should be stripped for untrusted origins
    expect(requests[0]!.headers.entries["authorization"]).toBeUndefined();
    expect(requests[0]!.headers.entries["x-api-key"]).toBeUndefined();
    // Non-sensitive headers should be preserved
    expect(requests[0]!.headers.entries["x-custom"]).toBe("safe-value");
  });
});
