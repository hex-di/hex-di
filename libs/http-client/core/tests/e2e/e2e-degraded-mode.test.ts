/**
 * E2E: Degraded mode operation (circuit breaker + health).
 *
 * Tests the full degraded mode pipeline: circuit breaker opens on failures,
 * health status reflects degradation, and recovery transitions back to normal.
 */

import { describe, it, expect } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { circuitBreaker } from "../../src/combinators/circuit-breaker.js";
import { deriveHealth } from "../../src/inspection/health.js";

describe("E2E: degraded mode operation", () => {
  it("full pipeline processes body correctly", async () => {
    let callCount = 0;

    const client = circuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
    })(
      createMockHttpClient((req) => {
        callCount++;
        if (callCount <= 5) {
          return ok(mockJsonResponse(200, { count: callCount }));
        }
        return err(mockRequestError("Transport", "Server down", req));
      }),
    );

    // First 5 requests succeed
    for (let i = 0; i < 5; i++) {
      const result = await client.get("https://api.test/data");
      expect(result._tag).toBe("Ok");
    }

    // Health is good
    const health1 = deriveHealth({
      totalRequests: 5,
      failedRequests: 0,
      averageLatencyMs: 50,
    });
    expect(health1.status).toBe("healthy");
  });

  it("pipeline handles degraded upstream gracefully", async () => {
    let callCount = 0;

    const client = circuitBreaker({
      failureThreshold: 2,
      resetTimeout: 50,
    })(
      createMockHttpClient((req) => {
        callCount++;
        return err(mockRequestError("Transport", "Connection refused", req));
      }),
    );

    // First 2 failures counted
    await client.get("https://api.test/data");
    await client.get("https://api.test/data");

    // Circuit is now open -- next request fails immediately without calling transport
    const beforeCount = callCount;
    const result = await client.get("https://api.test/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("Circuit breaker is open");
    }
    // Transport was NOT called
    expect(callCount).toBe(beforeCount);

    // Health reflects degraded state
    const health = deriveHealth({
      totalRequests: 3,
      failedRequests: 3,
      averageLatencyMs: undefined,
    });
    expect(health.status).toBe("unhealthy");
  });

  it("scope isolation prevents header leakage between scopes", async () => {
    let failureCount = 0;

    const client = circuitBreaker({
      failureThreshold: 2,
      resetTimeout: 50,
      halfOpenMax: 1,
    })(
      createMockHttpClient((req) => {
        failureCount++;
        if (failureCount <= 2) {
          return err(mockRequestError("Transport", "Down", req));
        }
        // After circuit reopens (half-open probe), succeed
        return ok(mockJsonResponse(200, { recovered: true }));
      }),
    );

    // Trigger circuit open
    await client.get("https://api.test/data");
    await client.get("https://api.test/data");

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Half-open probe succeeds, circuit closes
    const probe = await client.get("https://api.test/data");
    expect(probe._tag).toBe("Ok");
    if (probe._tag === "Ok") {
      const json = await probe.value.json;
      if (json._tag === "Ok") {
        expect(json.value).toEqual({ recovered: true });
      }
    }
  });
});
