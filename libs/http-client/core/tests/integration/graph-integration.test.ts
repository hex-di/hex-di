import { describe, it, expect } from "vitest";
import { HttpClientPort } from "../../src/ports/http-client-port.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { ok } from "@hex-di/result";
import { getPortDirection, getPortMetadata } from "@hex-di/core";

describe("DI graph integration", () => {
  it("HttpClientPort has expected metadata", () => {
    expect(HttpClientPort.__portName).toBe("HttpClient");
    expect(getPortDirection(HttpClientPort)).toBe("outbound");
    expect(getPortMetadata(HttpClientPort)?.category).toBe("infrastructure");
    expect(getPortMetadata(HttpClientPort)?.description).toBe(
      "Platform-agnostic HTTP client for making outbound requests",
    );
  });

  it("HttpClientPort has expected tags", () => {
    const tags = getPortMetadata(HttpClientPort)?.tags ?? [];
    expect(tags).toContain("http");
    expect(tags).toContain("network");
    expect(tags).toContain("io");
  });

  it("mock client satisfies HttpClient interface shape", async () => {
    const client = createMockHttpClient((_req) => ok(mockJsonResponse(200, { ok: true })));
    // Verify all convenience methods exist
    expect(typeof client.execute).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.post).toBe("function");
    expect(typeof client.put).toBe("function");
    expect(typeof client.patch).toBe("function");
    expect(typeof client.del).toBe("function");
    expect(typeof client.head).toBe("function");
  });
});
