import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { circuitBreaker } from "../../src/combinators/circuit-breaker.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";

describe("GxP: availability", () => {
  it("HttpClient remains available after a single Transport error", async () => {
    let callCount = 0;
    const base = createMockHttpClient((req) => {
      callCount++;
      if (callCount === 1) {
        return err(httpRequestError("Transport", req, "Connection failed"));
      }
      return ok(mockResponse(200));
    });

    const client = circuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
    })(base);

    // First request fails
    const fail = await client.get("https://api.example.com/data");
    expect(fail._tag).toBe("Err");

    // Second request should still go through (circuit stays closed)
    const success = await client.get("https://api.example.com/data");
    expect(success._tag).toBe("Ok");
  });

  it("circuit breaker opens after consecutive failures", async () => {
    const base = createMockHttpClient((req) => {
      return err(httpRequestError("Transport", req, "Connection failed"));
    });

    const client = circuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000,
    })(base);

    // Trigger enough failures to open the circuit
    await client.get("https://api.example.com/data");
    await client.get("https://api.example.com/data");
    await client.get("https://api.example.com/data");

    // The circuit should now be open, rejecting immediately
    const result = await client.get("https://api.example.com/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("Circuit breaker is open");
    }
  });

  it("circuit breaker transitions to half-open after cooldown period", async () => {
    vi.useFakeTimers();

    const base = createMockHttpClient((req) => {
      return err(httpRequestError("Transport", req, "Connection failed"));
    });

    const client = circuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000,
    })(base);

    // Open the circuit
    await client.get("https://api.example.com/data");
    await client.get("https://api.example.com/data");

    // Circuit is open
    const openResult = await client.get("https://api.example.com/data");
    expect(openResult._tag).toBe("Err");
    if (openResult._tag === "Err") {
      expect(openResult.error.message).toContain("Circuit breaker is open");
    }

    // Advance time past the cooldown period
    vi.advanceTimersByTime(6000);

    // The circuit should transition to half-open, allowing a probe
    // The probe will fail (base always returns error), reopening the circuit
    const halfOpenResult = await client.get("https://api.example.com/data");
    expect(halfOpenResult._tag).toBe("Err");
    // The request was allowed through (not immediately rejected), but the underlying transport failed
    if (halfOpenResult._tag === "Err") {
      expect(halfOpenResult.error.message).toContain("Connection failed");
    }

    vi.useRealTimers();
  });

  it("circuit breaker closes after successful probes in half-open state", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const base = createMockHttpClient((req) => {
      callCount++;
      // First 2 calls fail (to open circuit), subsequent calls succeed
      if (callCount <= 2) {
        return err(httpRequestError("Transport", req, "Connection failed"));
      }
      return ok(mockResponse(200));
    });

    const client = circuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000,
    })(base);

    // Open the circuit
    await client.get("https://api.example.com/data");
    await client.get("https://api.example.com/data");

    // Advance past cooldown
    vi.advanceTimersByTime(6000);

    // Probe succeeds -- circuit should close
    const probe = await client.get("https://api.example.com/data");
    expect(probe._tag).toBe("Ok");

    // Now circuit is closed, requests flow normally
    const normalResult = await client.get("https://api.example.com/data");
    expect(normalResult._tag).toBe("Ok");

    vi.useRealTimers();
  });

  it("availability is maintained when failure threshold is not reached", async () => {
    let callCount = 0;
    const base = createMockHttpClient((req) => {
      callCount++;
      // Alternate between success and failure
      if (callCount % 2 === 0) {
        return err(httpRequestError("Transport", req, "Intermittent failure"));
      }
      return ok(mockResponse(200));
    });

    const client = circuitBreaker({
      failureThreshold: 5,
      resetTimeout: 10000,
    })(base);

    // Successful requests reset the failure counter
    const r1 = await client.get("https://api.example.com/data");
    expect(r1._tag).toBe("Ok");

    const r2 = await client.get("https://api.example.com/data");
    expect(r2._tag).toBe("Err");

    // Circuit should still be closed (only 1 failure, threshold is 5)
    const r3 = await client.get("https://api.example.com/data");
    expect(r3._tag).toBe("Ok");
  });
});
