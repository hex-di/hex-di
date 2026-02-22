/**
 * Tests that combinator chains preserve immutability and don't share state.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { defaultHeaders } from "../../src/combinators/headers.js";
import { mapRequest } from "../../src/combinators/request.js";
import { mapResponse } from "../../src/combinators/response.js";
import { retry } from "../../src/combinators/retry.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status = 200): HttpResponse {
  const req = get("/test");
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("ok"),
  });
}

function captureClient(onRequest: (req: HttpRequest) => void) {
  return createHttpClient((req) => {
    onRequest(req);
    return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
  });
}

// ---------------------------------------------------------------------------
// Applying the same combinator twice creates independent clients
// ---------------------------------------------------------------------------

describe("combinator chain — same combinator applied twice", () => {
  it("applying baseUrl twice creates two independent clients with different base URLs", async () => {
    const urls: string[] = [];

    const base = createHttpClient((req) => {
      urls.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = baseUrl("https://api-a.example.com")(base);
    const clientB = baseUrl("https://api-b.example.com")(base);

    await clientA.execute(get("/resource"));
    await clientB.execute(get("/resource"));

    expect(urls[0]).toBe("https://api-a.example.com/resource");
    expect(urls[1]).toBe("https://api-b.example.com/resource");
  });

  it("applying bearerAuth twice creates two independent clients with different tokens", async () => {
    const authHeaders: string[] = [];

    const base = createHttpClient((req) => {
      authHeaders.push(req.headers.entries["authorization"] ?? "");
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = bearerAuth("token-a")(base);
    const clientB = bearerAuth("token-b")(base);

    await clientA.execute(get("/test"));
    await clientB.execute(get("/test"));

    expect(authHeaders[0]).toBe("Bearer token-a");
    expect(authHeaders[1]).toBe("Bearer token-b");
  });

  it("applying defaultHeaders twice creates two independent clients", async () => {
    const capturedHeaders: Array<Record<string, string>> = [];

    const base = createHttpClient((req) => {
      capturedHeaders.push({ ...req.headers.entries });
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = defaultHeaders({ "x-client": "A" })(base);
    const clientB = defaultHeaders({ "x-client": "B" })(base);

    await clientA.execute(get("/test"));
    await clientB.execute(get("/test"));

    expect(capturedHeaders[0]["x-client"]).toBe("A");
    expect(capturedHeaders[1]["x-client"]).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// Two clients from the same base don't share state
// ---------------------------------------------------------------------------

describe("combinator chain — clients from same base don't share state", () => {
  it("requests through client A do not affect requests through client B", async () => {
    const urlsA: string[] = [];
    const urlsB: string[] = [];

    const baseA = createHttpClient((req) => {
      urlsA.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const baseB = createHttpClient((req) => {
      urlsB.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = baseUrl("https://a.example.com")(baseA);
    const clientB = baseUrl("https://b.example.com")(baseB);

    await clientA.execute(get("/path"));
    await clientB.execute(get("/path"));

    expect(urlsA).toHaveLength(1);
    expect(urlsB).toHaveLength(1);
    expect(urlsA[0]).toBe("https://a.example.com/path");
    expect(urlsB[0]).toBe("https://b.example.com/path");
  });

  it("modifying requests via client A does not affect the shared base client", async () => {
    const receivedUrls: string[] = [];

    const base = createHttpClient((req) => {
      receivedUrls.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = baseUrl("https://a.example.com")(base);

    // Use base directly (without baseUrl)
    await base.execute(get("/direct"));
    // Use clientA
    await clientA.execute(get("/via-a"));

    expect(receivedUrls[0]).toBe("/direct");
    expect(receivedUrls[1]).toBe("https://a.example.com/via-a");
  });

  it("chained requests on client A do not leak headers into base client requests", async () => {
    const receivedHeaders: Array<Record<string, string>> = [];

    const base = createHttpClient((req) => {
      receivedHeaders.push({ ...req.headers.entries });
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = bearerAuth("token-a")(base);

    // Execute through clientA (adds auth header)
    await clientA.execute(get("/secure"));
    // Execute through base directly (no auth header)
    await base.execute(get("/public"));

    expect(receivedHeaders[0]["authorization"]).toBe("Bearer token-a");
    expect(receivedHeaders[1]["authorization"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Combinator applied to client A doesn't affect client B
// ---------------------------------------------------------------------------

describe("combinator chain — combinator applied to A doesn't affect B", () => {
  it("applying baseUrl to client A leaves client B (same base) unaffected", async () => {
    const capturedUrls: string[] = [];

    const base = createHttpClient((req) => {
      capturedUrls.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = baseUrl("https://api.example.com")(base);
    const clientB = base; // no transformation applied to B

    await clientA.execute(get("/a"));
    await clientB.execute(get("/b"));

    expect(capturedUrls[0]).toBe("https://api.example.com/a");
    expect(capturedUrls[1]).toBe("/b");
  });

  it("applying bearerAuth to client A does not add headers in client B", async () => {
    const authValues: Array<string | undefined> = [];

    const base = createHttpClient((req) => {
      authValues.push(req.headers.entries["authorization"]);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = bearerAuth("secret")(base);
    const clientB = base;

    await clientA.execute(get("/a"));
    await clientB.execute(get("/b"));

    expect(authValues[0]).toBe("Bearer secret");
    expect(authValues[1]).toBeUndefined();
  });

  it("mapRequest on client A does not alter requests going through client B", async () => {
    const receivedBodies: string[] = [];

    const base = createHttpClient((req) => {
      receivedBodies.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const clientA = mapRequest((req) => ({ ...req, url: "/overridden" }))(base);
    const clientB = base;

    await clientA.execute(get("/original"));
    await clientB.execute(get("/original"));

    expect(receivedBodies[0]).toBe("/overridden");
    expect(receivedBodies[1]).toBe("/original");
  });
});

// ---------------------------------------------------------------------------
// Request immutability in chains
// ---------------------------------------------------------------------------

describe("combinator chain — request immutability", () => {
  it("each combinator produces a new frozen request rather than mutating the original", async () => {
    let innerRequest: HttpRequest | undefined;

    const base = createHttpClient((req) => {
      innerRequest = req;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("token")(baseUrl("https://api.example.com")(base));
    const originalReq = get("/test");

    await client.execute(originalReq);

    // The original request should be unchanged
    expect(originalReq.url).toBe("/test");
    expect(originalReq.headers.entries["authorization"]).toBeUndefined();

    // The inner request received by base should have both transformations
    expect(innerRequest?.url).toBe("https://api.example.com/test");
    expect(innerRequest?.headers.entries["authorization"]).toBe("Bearer token");
  });

  it("inner request objects are frozen", async () => {
    const frozenStates: boolean[] = [];

    const base = createHttpClient((req) => {
      frozenStates.push(Object.isFrozen(req));
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("token")(baseUrl("https://api.example.com")(base));
    await client.execute(get("/test"));

    expect(frozenStates[0]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Retry counter isolation
// ---------------------------------------------------------------------------

describe("combinator chain — retry isolation", () => {
  it("retry state is isolated per-request and does not leak between requests", async () => {
    const callCounts = { req1: 0, req2: 0 };
    let req1Done = false;

    const base = createHttpClient((req) => {
      if (!req1Done) {
        callCounts.req1++;
        if (callCounts.req1 < 3) {
          return ResultAsync.err(httpRequestError("Transport", req, "Fail"));
        }
        req1Done = true;
        return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
      } else {
        callCounts.req2++;
        return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
      }
    });

    const client = retry({ times: 3 })(base);

    const result1 = await client.execute(get("/req1"));
    const result2 = await client.execute(get("/req2"));

    expect(result1._tag).toBe("Ok");
    expect(result2._tag).toBe("Ok");
    expect(callCounts.req1).toBe(3); // 1 initial + 2 retries
    expect(callCounts.req2).toBe(1); // succeeds immediately
  });
});
