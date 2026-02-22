import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockResponse } from "../../src/testing/response-factory.js";
import { withPayloadIntegrity } from "../../src/combinators/security/payload-integrity.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("payload integrity", () => {
  it("request body hash is computed and attached as header", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withPayloadIntegrity({ signRequests: true })(base);

    await client.post("https://api.example.com/data", {
      json: { message: "hello" },
    });

    expect(requests).toHaveLength(1);
    // The x-content-hash header should be set
    expect(requests[0]!.headers.entries["x-content-hash"]).toBeDefined();
    expect(typeof requests[0]!.headers.entries["x-content-hash"]).toBe("string");
    expect(requests[0]!.headers.entries["x-content-hash"]!.length).toBe(8);
  });

  it("same payload produces same hash (deterministic)", async () => {
    const hashes: string[] = [];
    const base = createMockHttpClient((req) => {
      const hash = req.headers.entries["x-content-hash"];
      if (hash !== undefined) {
        hashes.push(hash);
      }
      return ok(mockResponse(200));
    });

    const client = withPayloadIntegrity({ signRequests: true })(base);
    const payload = { message: "hello" };

    await client.post("https://api.example.com/data", { json: payload });
    await client.post("https://api.example.com/data", { json: payload });

    expect(hashes).toHaveLength(2);
    expect(hashes[0]).toBe(hashes[1]);
  });

  it("different payloads produce different hashes", async () => {
    const hashes: string[] = [];
    const base = createMockHttpClient((req) => {
      const hash = req.headers.entries["x-content-hash"];
      if (hash !== undefined) {
        hashes.push(hash);
      }
      return ok(mockResponse(200));
    });

    const client = withPayloadIntegrity({ signRequests: true })(base);

    await client.post("https://api.example.com/data", { json: { a: 1 } });
    await client.post("https://api.example.com/data", { json: { b: 2 } });

    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
  });

  it("integrity check is skipped for requests with no body", async () => {
    const requests: HttpRequest[] = [];
    const base = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    const client = withPayloadIntegrity({ signRequests: true })(base);

    // GET request with no body -- hash should not be set
    await client.get("https://api.example.com/api/stream");

    expect(requests).toHaveLength(1);
    // No body means no hash header
    expect(requests[0]!.headers.entries["x-content-hash"]).toBeUndefined();
  });
});
