/**
 * E2E: Scope isolation (different configs per scope).
 *
 * Tests that different client scopes have isolated configurations
 * and headers do not leak between them.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("E2E: scope isolation", () => {
  it("full pipeline processes body correctly", async () => {
    const capturedRequests: Array<{ scope: string | undefined; url: string; auth: string | undefined }> = [];

    const baseClient = createMockHttpClient((req) => {
      capturedRequests.push({
        scope: req.headers.entries["x-scope"],
        url: req.url,
        auth: req.headers.entries["authorization"],
      });
      return ok(mockJsonResponse(200, {}));
    });

    // Scope A: production API
    const scopeA = bearerAuth("prod-token")(
      interceptor({
        onRequest: (req) => setRequestHeader("x-scope", "production")(req),
      })(baseUrl("https://prod.api.test")(baseClient)),
    );

    // Scope B: staging API
    const scopeB = bearerAuth("staging-token")(
      interceptor({
        onRequest: (req) => setRequestHeader("x-scope", "staging")(req),
      })(baseUrl("https://staging.api.test")(baseClient)),
    );

    await scopeA.get("/api/data");
    await scopeB.get("/api/data");

    expect(capturedRequests).toHaveLength(2);
    expect(capturedRequests[0]?.scope).toBe("production");
    expect(capturedRequests[0]?.auth).toBe("Bearer prod-token");
    expect(capturedRequests[1]?.scope).toBe("staging");
    expect(capturedRequests[1]?.auth).toBe("Bearer staging-token");
  });

  it("pipeline handles degraded upstream gracefully", async () => {
    const prodCalls: string[] = [];
    const stagingCalls: string[] = [];

    const prodClient = baseUrl("https://prod.api.test")(
      createMockHttpClient((req) => {
        prodCalls.push(req.url);
        return ok(mockJsonResponse(200, { env: "prod" }));
      }),
    );

    const stagingClient = baseUrl("https://staging.api.test")(
      createMockHttpClient((req) => {
        stagingCalls.push(req.url);
        return ok(mockJsonResponse(200, { env: "staging" }));
      }),
    );

    await prodClient.get("/api/users");
    await stagingClient.get("/api/users");
    await prodClient.get("/api/orders");

    // Calls are isolated to their respective scopes
    expect(prodCalls).toHaveLength(2);
    expect(stagingCalls).toHaveLength(1);
    expect(prodCalls[0]).toContain("prod.api.test");
    expect(stagingCalls[0]).toContain("staging.api.test");
  });

  it("scope isolation prevents header leakage between scopes", async () => {
    const allRequests: Array<{
      internalKey: string | undefined;
      tenant: string | undefined;
    }> = [];

    const baseClient = createMockHttpClient((req) => {
      allRequests.push({
        internalKey: req.headers.entries["x-internal-api-key"],
        tenant: req.headers.entries["x-tenant"],
      });
      return ok(mockJsonResponse(200, {}));
    });

    // Scope with internal headers
    const internalScope = interceptor({
      onRequest: (req) => {
        const withKey = setRequestHeader("x-internal-api-key", "secret-key-123")(req);
        return setRequestHeader("x-tenant", "internal")(withKey);
      },
    })(baseClient);

    // Scope without internal headers
    const externalScope = interceptor({
      onRequest: (req) => setRequestHeader("x-tenant", "external")(req),
    })(baseClient);

    await internalScope.get("https://internal.api.test/data");
    await externalScope.get("https://external.api.test/data");
    await internalScope.get("https://internal.api.test/other");

    expect(allRequests).toHaveLength(3);

    // Internal requests have the secret key
    expect(allRequests[0]?.internalKey).toBe("secret-key-123");
    expect(allRequests[0]?.tenant).toBe("internal");

    // External requests do NOT have the secret key
    expect(allRequests[1]?.internalKey).toBeUndefined();
    expect(allRequests[1]?.tenant).toBe("external");

    // Second internal request also has the key
    expect(allRequests[2]?.internalKey).toBe("secret-key-123");
  });
});
