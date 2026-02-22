import { describe, it, expect, vi } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { withTokenLifecycle } from "../../src/combinators/security/token-lifecycle.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("token lifecycle", () => {
  it("expired token triggers refresh before retry", async () => {
    let callCount = 0;
    let currentToken = "expired-token";
    const refreshToken = vi.fn(async () => {
      currentToken = "refreshed-token";
      return currentToken;
    });

    const base = createMockHttpClient((req) => {
      callCount++;
      const authHeader = req.headers.entries["authorization"];
      // First call with expired token returns 401
      if (authHeader === "Bearer expired-token") {
        return ok(mockResponse(401));
      }
      // Second call with refreshed token returns 200
      return ok(mockResponse(200));
    });

    const client = withTokenLifecycle({
      getToken: () => currentToken,
      refreshToken,
    })(base);

    const result = await client.get("https://api.example.com/data");

    expect(refreshToken).toHaveBeenCalledOnce();
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
    // Should have made 2 calls: initial + retry
    expect(callCount).toBe(2);
  });

  it("refresh failure maps to HttpRequestError with Transport reason", async () => {
    const refreshToken = vi.fn(async () => {
      throw new Error("Refresh endpoint unavailable");
    });

    const base = createMockHttpClient((_req) => {
      return ok(mockResponse(401));
    });

    const client = withTokenLifecycle({
      getToken: () => "expired-token",
      refreshToken,
    })(base);

    const result = await client.get("https://api.example.com/data");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("Token refresh failed");
    }
  });

  it("concurrent requests share a single in-flight token refresh", async () => {
    let refreshCallCount = 0;
    const refreshToken = vi.fn(async () => {
      refreshCallCount++;
      return "new-token";
    });

    let requestCount = 0;
    const base = createMockHttpClient((_req) => {
      requestCount++;
      // All initial requests return 401
      if (requestCount <= 3) {
        return ok(mockResponse(401));
      }
      return ok(mockResponse(200));
    });

    const client = withTokenLifecycle({
      getToken: () => "expired",
      refreshToken,
    })(base);

    // Fire 3 concurrent requests
    const results = await Promise.all([
      client.get("https://api.example.com/a"),
      client.get("https://api.example.com/b"),
      client.get("https://api.example.com/c"),
    ]);

    // Refresh should only be called once even though multiple requests triggered it
    expect(refreshCallCount).toBe(1);
  });

  it("refreshed token is applied to the retried request", async () => {
    const requests: HttpRequest[] = [];
    let currentToken = "old-token";

    const base = createMockHttpClient((req) => {
      requests.push(req);
      if (req.headers.entries["authorization"] === "Bearer old-token") {
        return ok(mockResponse(401));
      }
      return ok(mockResponse(200));
    });

    const client = withTokenLifecycle({
      getToken: () => currentToken,
      refreshToken: async () => {
        currentToken = "new-token";
        return "new-token";
      },
    })(base);

    await client.get("https://api.example.com/data");

    // The retry request should have the new token
    expect(requests.length).toBeGreaterThanOrEqual(2);
    const lastRequest = requests[requests.length - 1]!;
    expect(lastRequest.headers.entries["authorization"]).toBe("Bearer new-token");
  });

  it("token is not refreshed on non-401 errors", async () => {
    const refreshToken = vi.fn(async () => "new-token");

    const base = createMockHttpClient((_req) => {
      return ok(mockResponse(500));
    });

    const client = withTokenLifecycle({
      getToken: () => "valid-token",
      refreshToken,
    })(base);

    const result = await client.get("https://api.example.com/data");

    // Should not trigger refresh for non-401 status
    expect(refreshToken).not.toHaveBeenCalled();
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(500);
    }
  });
});
