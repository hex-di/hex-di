import { describe, it, expect } from "vitest";
import { deriveHealth } from "../../src/inspection/health.js";

describe("health check", () => {
  it("health check endpoint returns ok for successful response", () => {
    const result = deriveHealth({
      totalRequests: 100,
      failedRequests: 2,
      averageLatencyMs: 50,
    });

    expect(result._tag).toBe("HealthCheckResult");
    expect(result.status).toBe("healthy");
    expect(result.errorRate).toBeCloseTo(0.02);
    expect(result.latencyMs).toBe(50);
    expect(result.message).toContain("within acceptable range");
  });

  it("health check endpoint returns degraded on timeout", () => {
    const result = deriveHealth({
      totalRequests: 100,
      failedRequests: 15,
      averageLatencyMs: 5000,
    });

    expect(result.status).toBe("degraded");
    expect(result.errorRate).toBeCloseTo(0.15);
    expect(result.latencyMs).toBe(5000);
    expect(result.message).toContain("degraded threshold");
  });

  it("health check includes response latency", () => {
    const result = deriveHealth({
      totalRequests: 50,
      failedRequests: 0,
      averageLatencyMs: 250,
    });

    expect(result.latencyMs).toBe(250);
    expect(result.status).toBe("healthy");

    // When no latency is available
    const noLatency = deriveHealth({
      totalRequests: 10,
      failedRequests: 0,
      averageLatencyMs: undefined,
    });

    expect(noLatency.latencyMs).toBeUndefined();
    expect(noLatency.status).toBe("healthy");
  });

  it("health check status is exposed via registry", () => {
    // Unhealthy: error rate exceeds 50%
    const unhealthy = deriveHealth({
      totalRequests: 100,
      failedRequests: 60,
      averageLatencyMs: 1000,
    });

    expect(unhealthy.status).toBe("unhealthy");
    expect(unhealthy.errorRate).toBeCloseTo(0.6);
    expect(unhealthy.message).toContain("unhealthy threshold");

    // No requests yet: defaults to healthy
    const noRequests = deriveHealth({
      totalRequests: 0,
      failedRequests: 0,
      averageLatencyMs: undefined,
    });

    expect(noRequests.status).toBe("healthy");
    expect(noRequests.errorRate).toBe(0);
    expect(noRequests.message).toContain("No requests recorded");

    // The result is frozen
    expect(Object.isFrozen(unhealthy)).toBe(true);
  });
});
