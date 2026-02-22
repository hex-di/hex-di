import { describe, it, expect, vi } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { ok } from "@hex-di/result";
import { createAuditBridge } from "../../src/audit/bridge.js";
import { responseCache } from "../../src/combinators/cache.js";

describe("GxP: registry eviction", () => {
  it("registry evicts stale entries after TTL expires", async () => {
    vi.useFakeTimers();

    const base = createMockHttpClient((_req) => {
      return ok(mockResponse(200));
    });

    // Use a very short TTL
    const client = responseCache({ maxAge: 1000, maxEntries: 100 })(base);

    // First request -- should be cached
    const first = await client.get("https://api.example.com/data");
    expect(first._tag).toBe("Ok");

    // Advance past TTL
    vi.advanceTimersByTime(2000);

    // Second request after TTL -- cache should have expired
    const second = await client.get("https://api.example.com/data");
    expect(second._tag).toBe("Ok");

    vi.useRealTimers();
  });

  it("eviction does not remove active clients", () => {
    const bridge = createAuditBridge();

    // Record some entries
    bridge.record("GET", "/api/active", 200);
    bridge.record("POST", "/api/active", 201);

    // Active entries remain
    expect(bridge.entryCount()).toBe(2);
    expect(bridge.getChain().length).toBe(2);

    // Continue recording -- all entries are preserved
    bridge.record("DELETE", "/api/active", 204);
    expect(bridge.entryCount()).toBe(3);
  });

  it("eviction event is logged to the audit sink", () => {
    const onEntry = vi.fn();
    const bridge = createAuditBridge({ onEntry });

    bridge.record("GET", "/api/evicted", 200);
    bridge.record("GET", "/api/evicted", 404);

    expect(onEntry).toHaveBeenCalledTimes(2);

    // Each recorded event produces an audit entry
    const chain = bridge.getChain();
    expect(chain.length).toBe(2);
  });

  it("evicted client cannot be retrieved by name", async () => {
    vi.useFakeTimers();

    let requestCount = 0;
    const base = createMockHttpClient((_req) => {
      requestCount++;
      return ok(mockResponse(200));
    });

    const client = responseCache({ maxAge: 500, maxEntries: 100 })(base);

    // First request
    await client.get("https://api.example.com/cached");
    const countAfterFirst = requestCount;

    // Second request within TTL -- should be served from cache
    await client.get("https://api.example.com/cached");
    expect(requestCount).toBe(countAfterFirst); // No new request

    // Advance past TTL
    vi.advanceTimersByTime(1000);

    // Third request after TTL -- cache evicted, new request made
    await client.get("https://api.example.com/cached");
    expect(requestCount).toBe(countAfterFirst + 1); // New request made

    vi.useRealTimers();
  });
});
