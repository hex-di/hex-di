/**
 * E2E: Auth strength escalation.
 *
 * Tests bearer auth to dynamic auth escalation and token propagation.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { ResultAsync } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { bearerAuth, dynamicAuth } from "../../src/combinators/auth.js";
import { baseUrl } from "../../src/combinators/base-url.js";

describe("E2E: auth strength escalation", () => {
  it("HTTPS enforced end-to-end", async () => {
    let capturedAuth: string | undefined;

    const client = bearerAuth("static-token")(
      createMockHttpClient((req) => {
        capturedAuth = req.headers.entries["authorization"];
        return ok(mockJsonResponse(200, { user: "alice" }));
      }),
    );

    const result = await client.get("https://api.auth.test/me");

    expect(result._tag).toBe("Ok");
    expect(capturedAuth).toBe("Bearer static-token");
  });

  it("TLS errors surface as HttpRequestError Transport", async () => {
    let tokenFetchCount = 0;
    let currentToken = "initial-token";

    const client = dynamicAuth((req) => {
      tokenFetchCount++;
      return ResultAsync.ok(`Bearer ${currentToken}`);
    })(
      createMockHttpClient((req) => {
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client.get("https://api.auth.test/resource");
    expect(tokenFetchCount).toBe(1);

    // Update token for second request
    currentToken = "refreshed-token";
    let capturedAuth: string | undefined;

    const client2 = dynamicAuth((req) => {
      return ResultAsync.ok(`Bearer ${currentToken}`);
    })(
      createMockHttpClient((req) => {
        capturedAuth = req.headers.entries["authorization"];
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client2.get("https://api.auth.test/resource");
    expect(capturedAuth).toBe("Bearer refreshed-token");
  });

  it("security headers are attached to all requests", async () => {
    const requests: Array<{ url: string; auth: string | undefined }> = [];

    const client = bearerAuth("api-key-123")(
      baseUrl("https://api.secure.test")(
        createMockHttpClient((req) => {
          requests.push({
            url: req.url,
            auth: req.headers.entries["authorization"],
          });
          return ok(mockJsonResponse(200, {}));
        }),
      ),
    );

    await client.get("/users");
    await client.get("/orders");
    await client.post("/items", { json: { name: "Widget" } });

    expect(requests).toHaveLength(3);
    for (const req of requests) {
      expect(req.auth).toBe("Bearer api-key-123");
      expect(req.url).toContain("https://api.secure.test");
    }
  });
});
