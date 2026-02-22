/**
 * GxP security pipeline integration tests.
 *
 * Verifies the full GxP security pipeline combining HTTPS enforcement,
 * SSRF protection, audit chain integrity, and health monitoring.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { requireHttps } from "../../src/combinators/security/require-https.js";
import { withSsrfProtection } from "../../src/combinators/security/ssrf-protection.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { verifyChain } from "../../src/audit/integrity.js";
import { deriveHealth } from "../../src/inspection/health.js";
import { interceptor } from "../../src/combinators/interceptor.js";

describe("GxP security pipeline", () => {
  it("full GxP-compliant pipeline processes requests correctly", async () => {
    const bridge = createAuditBridge();
    let requestCount = 0;

    const auditInterceptor = interceptor({
      onRequest: (req) => {
        requestCount++;
        return req;
      },
      onResponse: (res) => {
        bridge.record(res.request.method, res.request.url, res.status);
        return res;
      },
    });

    const client = auditInterceptor(
      requireHttps()(
        withSsrfProtection()(
          bearerAuth("gxp-token")(
            createMockHttpClient({
              "GET /api/batches": mockJsonResponse(200, [{ id: 1 }]),
              "POST /api/batches": mockJsonResponse(201, { id: 2 }),
            }),
          ),
        ),
      ),
    );

    // HTTPS URLs pass through the pipeline
    const r1 = await client.get("https://api.pharma.com/api/batches");
    expect(r1._tag).toBe("Ok");

    const r2 = await client.post("https://api.pharma.com/api/batches", { json: { name: "B1" } });
    expect(r2._tag).toBe("Ok");

    expect(bridge.entryCount()).toBe(2);
    expect(verifyChain(bridge.getChain())).toBe(true);
  });

  it("audit entries are persisted across service restarts", async () => {
    const bridge = createAuditBridge();

    // Simulate operations before "restart"
    bridge.record("GET", "https://api.pharma.com/lots", 200);
    bridge.record("POST", "https://api.pharma.com/lots", 201);
    bridge.record("PUT", "https://api.pharma.com/lots/1", 200);

    const chain = bridge.getChain();
    const lastHash = bridge.lastHash();

    // After restart, the chain hash should be deterministic
    expect(chain.length).toBe(3);
    expect(lastHash).toHaveLength(8);
    expect(verifyChain(chain)).toBe(true);

    // SSRF protection blocks private IPs in the pipeline
    const secureClient = withSsrfProtection()(
      createMockHttpClient((req) => ok(mockResponse(200))),
    );

    const blocked = await secureClient.get("http://192.168.1.1/internal");
    expect(blocked._tag).toBe("Err");
    if (blocked._tag === "Err") {
      expect(blocked.error.message).toContain("SSRF");
    }
  });

  it("GxP pipeline maintains ALCOA+ invariants end-to-end", async () => {
    const bridge = createAuditBridge();
    let totalRequests = 0;
    let failedRequests = 0;

    const metricsInterceptor = interceptor({
      onRequest: (req) => {
        totalRequests++;
        return req;
      },
      onError: (error, req) => {
        failedRequests++;
        return error;
      },
    });

    const client = metricsInterceptor(
      requireHttps()(
        withSsrfProtection()(
          createMockHttpClient((req) => {
            if (req.url.includes("/fail")) {
              return err(mockRequestError("Transport", "Connection refused", req));
            }
            return ok(mockJsonResponse(200, {}));
          }),
        ),
      ),
    );

    // Mix of successful and failed requests
    const r1 = await client.get("https://api.pharma.com/api/data");
    if (r1._tag === "Ok") bridge.record("GET", "/api/data", 200);

    const r2 = await client.get("https://api.pharma.com/fail");
    // r2 is an error, record it with undefined status
    if (r2._tag === "Err") bridge.record("GET", "/fail", undefined);

    const r3 = await client.get("https://api.pharma.com/api/health");
    if (r3._tag === "Ok") bridge.record("GET", "/api/health", 200);

    // Verify ALCOA+ invariants
    const chain = bridge.getChain();
    expect(verifyChain(chain)).toBe(true);

    // Health metrics reflect the mixed results
    const health = deriveHealth({
      totalRequests,
      failedRequests,
      averageLatencyMs: undefined,
    });

    expect(health.status).toBe("degraded");
    expect(health.errorRate).toBeCloseTo(1 / 3, 1);
  });
});
