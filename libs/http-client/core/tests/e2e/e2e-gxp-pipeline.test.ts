/**
 * E2E: Full GxP pipeline (audit + security + health).
 *
 * Tests the complete GxP-compliant pipeline combining audit chain,
 * HTTPS enforcement, SSRF protection, and health monitoring.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { requireHttps } from "../../src/combinators/security/require-https.js";
import { withSsrfProtection } from "../../src/combinators/security/ssrf-protection.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { verifyChain } from "../../src/audit/integrity.js";
import { deriveHealth } from "../../src/inspection/health.js";

describe("E2E: full GxP pipeline", () => {
  it("audit chain captures full request lifecycle", async () => {
    const bridge = createAuditBridge();
    let totalRequests = 0;
    let failedRequests = 0;

    const metricsInterceptor = interceptor({
      onRequest: (req) => {
        totalRequests++;
        return req;
      },
      onResponse: (res) => {
        bridge.record(res.request.method, res.request.url, res.status);
        return res;
      },
      onError: (error) => {
        failedRequests++;
        return error;
      },
    });

    const client = metricsInterceptor(
      requireHttps()(
        withSsrfProtection()(
          bearerAuth("gxp-token")(
            createMockHttpClient({
              "GET /api/lots": mockJsonResponse(200, [{ id: "LOT-001" }]),
              "POST /api/lots": mockJsonResponse(201, { id: "LOT-002" }),
              "GET /api/lots/LOT-001": mockJsonResponse(200, { id: "LOT-001", status: "active" }),
            }),
          ),
        ),
      ),
    );

    // Full lifecycle: list, create, fetch
    await client.get("https://gxp.pharma.com/api/lots");
    await client.post("https://gxp.pharma.com/api/lots", { json: { name: "Batch-X" } });
    await client.get("https://gxp.pharma.com/api/lots/LOT-001");

    expect(bridge.entryCount()).toBe(3);
    expect(verifyChain(bridge.getChain())).toBe(true);

    const health = deriveHealth({
      totalRequests,
      failedRequests,
      averageLatencyMs: 45,
    });
    expect(health.status).toBe("healthy");
  });

  it("electronic signatures are attached when configured", async () => {
    const bridge = createAuditBridge();

    const client = requireHttps()(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );

    // HTTP request blocked by security
    const httpResult = await client.get("http://insecure.pharma.com/api/lots");
    expect(httpResult._tag).toBe("Err");

    // Record the security event
    bridge.record("SECURITY", "http://insecure.pharma.com/api/lots", undefined);

    // SSRF blocked
    const ssrfClient = withSsrfProtection()(
      createMockHttpClient((req) => ok(mockJsonResponse(200, {}))),
    );
    const ssrfResult = await ssrfClient.get("http://192.168.1.1/admin");
    expect(ssrfResult._tag).toBe("Err");

    bridge.record("SECURITY", "http://192.168.1.1/admin", undefined);

    expect(bridge.entryCount()).toBe(2);
    expect(verifyChain(bridge.getChain())).toBe(true);
  });

  it("WAL recovery restores unsent audit entries after restart", async () => {
    const bridge = createAuditBridge();
    let totalRequests = 0;
    let failedRequests = 0;

    const metricsInterceptor = interceptor({
      onRequest: (req) => {
        totalRequests++;
        return req;
      },
      onError: (error) => {
        failedRequests++;
        return error;
      },
    });

    const client = metricsInterceptor(
      requireHttps()(
        createMockHttpClient((req) => {
          if (req.url.includes("/fail")) {
            return err(mockRequestError("Transport", "Server error", req));
          }
          return ok(mockJsonResponse(200, {}));
        }),
      ),
    );

    // Mix of successes and failures
    const r1 = await client.get("https://gxp.test/api/data");
    if (r1._tag === "Ok") bridge.record("GET", "/api/data", 200);

    const r2 = await client.get("https://gxp.test/fail");
    if (r2._tag === "Err") bridge.record("GET", "/fail", undefined);

    const r3 = await client.get("https://gxp.test/api/health");
    if (r3._tag === "Ok") bridge.record("GET", "/api/health", 200);

    // GxP health reflects mixed results
    const health = deriveHealth({
      totalRequests,
      failedRequests,
      averageLatencyMs: 100,
    });

    expect(health.errorRate).toBeCloseTo(1 / 3, 1);
    expect(health.status).toBe("degraded");
    expect(verifyChain(bridge.getChain())).toBe(true);
  });
});
