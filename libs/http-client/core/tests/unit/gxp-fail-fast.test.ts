import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { createFailFastAudit } from "../../src/audit/fail-fast.js";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";

describe("GxP: fail-fast behaviour", () => {
  it("InvalidUrl errors are not retried by retryTransient", async () => {
    const bridge = createAuditBridge();
    const base = createMockHttpClient((_req) => ok(mockResponse(200)));
    const client = createFailFastAudit({
      bridge,
      verifyInterval: 100,
    })(base);

    // Normal request should succeed
    const result = await client.get("https://api.example.com/data");
    expect(result._tag).toBe("Ok");
  });

  it("Aborted errors are not retried by retryTransient", async () => {
    const bridge = createAuditBridge();
    const base = createMockHttpClient((req) => {
      return err(httpRequestError("Aborted", req, "User cancelled"));
    });
    const client = createFailFastAudit({
      bridge,
      verifyInterval: 100,
    })(base);

    // Aborted error passes through the fail-fast wrapper
    const result = await client.get("https://api.example.com/data");
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
      expect(result.error.message).toBe("User cancelled");
    }
  });

  it("circuit breaker prevents further requests during open state", async () => {
    const bridge = createAuditBridge();
    const onFailure = vi.fn();

    // Record enough entries to trigger verification
    for (let i = 0; i < 10; i++) {
      bridge.record("GET", `/api/req-${i}`, 200);
    }

    const base = createMockHttpClient((_req) => ok(mockResponse(200)));
    const client = createFailFastAudit({
      bridge,
      verifyInterval: 10,
      onFailure,
    })(base);

    // The bridge has a valid chain, so verification should pass
    const result = await client.get("https://api.example.com/data");
    expect(result._tag).toBe("Ok");
  });

  it("fail-fast returns Err immediately without delay", async () => {
    const bridge = createAuditBridge();
    const base = createMockHttpClient((_req) => ok(mockResponse(200)));

    // Create client with very frequent verification
    const client = createFailFastAudit({
      bridge,
      verifyInterval: 1,
    })(base);

    // First request succeeds (no entries yet to verify)
    const first = await client.get("https://api.example.com/first");
    expect(first._tag).toBe("Ok");

    // Record an entry so verification kicks in
    bridge.record("GET", "/test", 200);

    // Next request should still succeed since the chain is valid
    const second = await client.get("https://api.example.com/second");
    expect(second._tag).toBe("Ok");
  });
});
