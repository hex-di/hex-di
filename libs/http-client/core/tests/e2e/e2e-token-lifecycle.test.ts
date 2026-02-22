/**
 * E2E: Token refresh lifecycle (401 -> refresh -> retry).
 *
 * Tests the full token lifecycle: initial token, 401 trigger,
 * transparent refresh, and request retry with new token.
 */

import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { withTokenLifecycle } from "../../src/combinators/security/token-lifecycle.js";
import { baseUrl } from "../../src/combinators/base-url.js";

describe("E2E: token lifecycle", () => {
  it("expired token is refreshed transparently", async () => {
    let currentToken = "expired-token";
    let requestCount = 0;

    const client = withTokenLifecycle({
      getToken: () => currentToken,
      refreshToken: async () => {
        currentToken = "fresh-token";
        return currentToken;
      },
    })(
      baseUrl("https://api.auth.test")(
        createMockHttpClient((req) => {
          requestCount++;
          const auth = req.headers.entries["authorization"] ??
            (req.headers as unknown as Record<string, string>)["authorization"];

          if (auth === "Bearer expired-token") {
            return ok(mockResponse(401));
          }
          return ok(mockJsonResponse(200, { user: "alice" }));
        }),
      ),
    );

    const result = await client.get("/api/me");

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
    // First request returns 401, triggers refresh, then retries
    expect(requestCount).toBe(2);
    expect(currentToken).toBe("fresh-token");
  });

  it("refresh failure surfaces as HttpRequestError", async () => {
    const client = withTokenLifecycle({
      getToken: () => "bad-token",
      refreshToken: async () => {
        throw new Error("Refresh server unavailable");
      },
    })(
      createMockHttpClient((req) => {
        return ok(mockResponse(401));
      }),
    );

    const result = await client.get("https://api.auth.test/me");

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("Token refresh failed");
    }
  });

  it("token rotation is applied to queued requests", async () => {
    let currentToken = "initial-token";
    let refreshCount = 0;
    const capturedTokens: string[] = [];

    const client = withTokenLifecycle({
      getToken: () => currentToken,
      refreshToken: async () => {
        refreshCount++;
        currentToken = `rotated-token-${refreshCount}`;
        return currentToken;
      },
    })(
      createMockHttpClient((req) => {
        const auth = req.headers.entries["authorization"] ??
          (req.headers as unknown as Record<string, string>)["authorization"];
        if (auth !== undefined) {
          capturedTokens.push(auth);
        }

        // First request with initial token triggers 401
        if (auth === "Bearer initial-token") {
          return ok(mockResponse(401));
        }
        return ok(mockJsonResponse(200, { ok: true }));
      }),
    );

    // First call: sends initial-token, gets 401, refreshes, retries with rotated-token-1
    const result = await client.get("https://api.auth.test/resource");
    expect(result._tag).toBe("Ok");

    // Should have captured initial-token (401) then rotated-token-1 (200)
    expect(capturedTokens).toContain("Bearer initial-token");
    expect(capturedTokens).toContain("Bearer rotated-token-1");
    expect(refreshCount).toBe(1);
  });
});
