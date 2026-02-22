/**
 * Tests that combinators are stateless (pure functional).
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { bearerAuth, dynamicAuth } from "../../src/combinators/auth.js";
import { defaultHeaders } from "../../src/combinators/headers.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { retry } from "../../src/combinators/retry.js";
import { mapRequest } from "../../src/combinators/request.js";
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

function captureAndSucceed(capture: (req: HttpRequest) => void) {
  return createHttpClient((req) => {
    capture(req);
    return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
  });
}

// ---------------------------------------------------------------------------
// bearerAuth — fixed token is always the same
// ---------------------------------------------------------------------------

describe("bearerAuth — stateless fixed token", () => {
  it("always sends the same static token across multiple requests", async () => {
    const authHeaders: string[] = [];

    const base = captureAndSucceed((req) => {
      authHeaders.push(req.headers.entries["authorization"] ?? "");
    });

    const client = bearerAuth("fixed-token-123")(base);

    await client.execute(get("/req1"));
    await client.execute(get("/req2"));
    await client.execute(get("/req3"));

    expect(authHeaders).toEqual([
      "Bearer fixed-token-123",
      "Bearer fixed-token-123",
      "Bearer fixed-token-123",
    ]);
  });

  it("the token does not change over repeated requests even under concurrent execution", async () => {
    const authHeaders: string[] = [];

    const base = captureAndSucceed((req) => {
      authHeaders.push(req.headers.entries["authorization"] ?? "");
    });

    const client = bearerAuth("concurrent-token")(base);

    // Execute three requests "concurrently"
    await Promise.all([
      client.execute(get("/a")),
      client.execute(get("/b")),
      client.execute(get("/c")),
    ]);

    expect(authHeaders).toHaveLength(3);
    for (const header of authHeaders) {
      expect(header).toBe("Bearer concurrent-token");
    }
  });

  it("two different bearerAuth clients with different tokens are independent", async () => {
    const authA: string[] = [];
    const authB: string[] = [];

    const baseA = captureAndSucceed((req) => {
      authA.push(req.headers.entries["authorization"] ?? "");
    });
    const baseB = captureAndSucceed((req) => {
      authB.push(req.headers.entries["authorization"] ?? "");
    });

    const clientA = bearerAuth("token-a")(baseA);
    const clientB = bearerAuth("token-b")(baseB);

    await clientA.execute(get("/test"));
    await clientB.execute(get("/test"));

    expect(authA[0]).toBe("Bearer token-a");
    expect(authB[0]).toBe("Bearer token-b");
  });
});

// ---------------------------------------------------------------------------
// dynamicAuth — uses latest value from getter on each call
// ---------------------------------------------------------------------------

describe("dynamicAuth — stateless dynamic getter", () => {
  it("calls the getter on each request and uses the latest returned value", async () => {
    const authHeaders: string[] = [];

    const base = captureAndSucceed((req) => {
      authHeaders.push(req.headers.entries["authorization"] ?? "");
    });

    let currentToken = "token-v1";
    const client = dynamicAuth(() => ResultAsync.ok(`Bearer ${currentToken}`))(base);

    await client.execute(get("/req1"));
    currentToken = "token-v2";
    await client.execute(get("/req2"));
    currentToken = "token-v3";
    await client.execute(get("/req3"));

    expect(authHeaders).toEqual([
      "Bearer token-v1",
      "Bearer token-v2",
      "Bearer token-v3",
    ]);
  });

  it("each request independently calls the getter (no caching between requests)", async () => {
    let getterCallCount = 0;

    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    const client = dynamicAuth(() => {
      getterCallCount++;
      return ResultAsync.ok(`Bearer token-${getterCallCount}`);
    })(base);

    await client.execute(get("/r1"));
    await client.execute(get("/r2"));
    await client.execute(get("/r3"));

    expect(getterCallCount).toBe(3);
  });

  it("getter receives the current request object on each call", async () => {
    const receivedUrls: string[] = [];

    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    const client = dynamicAuth((req) => {
      receivedUrls.push(req.url);
      return ResultAsync.ok("Bearer tok");
    })(base);

    await client.execute(get("/first"));
    await client.execute(get("/second"));

    expect(receivedUrls).toEqual(["/first", "/second"]);
  });

  it("a failing getter only affects the single request it was called for", async () => {
    let callCount = 0;

    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    // Fail the second call, succeed the others
    const client = dynamicAuth((req) => {
      callCount++;
      if (callCount === 2) {
        return ResultAsync.err(httpRequestError("Transport", req, "Token service down"));
      }
      return ResultAsync.ok("Bearer good-token");
    })(base);

    const r1 = await client.execute(get("/req1"));
    const r2 = await client.execute(get("/req2"));
    const r3 = await client.execute(get("/req3"));

    expect(r1._tag).toBe("Ok");
    expect(r2._tag).toBe("Err");
    expect(r3._tag).toBe("Ok");
  });
});

// ---------------------------------------------------------------------------
// retry — counter resets between independent requests
// ---------------------------------------------------------------------------

describe("retry — stateless counter per request", () => {
  it("retry counter resets for each new request (no shared state)", async () => {
    const callCounts: Record<string, number> = {};

    const base = createHttpClient((req) => {
      const key = req.url;
      callCounts[key] = (callCounts[key] ?? 0) + 1;

      // Both requests fail twice then succeed
      if ((callCounts[key] ?? 0) < 3) {
        return ResultAsync.err(httpRequestError("Transport", req, "Fail"));
      }
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = retry({ times: 3 })(base);

    const r1 = await client.execute(get("/req1"));
    const r2 = await client.execute(get("/req2"));

    expect(r1._tag).toBe("Ok");
    expect(r2._tag).toBe("Ok");
    // Each request was tried 3 times independently (1 initial + 2 retries)
    expect(callCounts["/req1"]).toBe(3);
    expect(callCounts["/req2"]).toBe(3);
  });

  it("a successful first request does not consume retry budget for the second", async () => {
    let firstRequestCalled = false;
    let secondCallCount = 0;

    const base = createHttpClient((req) => {
      if (!firstRequestCalled && req.url === "/first") {
        firstRequestCalled = true;
        return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
      }
      if (req.url === "/second") {
        secondCallCount++;
        if (secondCallCount < 3) {
          return ResultAsync.err(httpRequestError("Transport", req, "Fail"));
        }
        return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
      }
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = retry({ times: 3 })(base);

    const r1 = await client.execute(get("/first"));
    const r2 = await client.execute(get("/second"));

    expect(r1._tag).toBe("Ok");
    expect(r2._tag).toBe("Ok");
    expect(secondCallCount).toBe(3); // full retry budget available for second request
  });

  it("retry(3) always allows exactly 3 retries regardless of previous request outcomes", async () => {
    const attemptsPerRequest: number[] = [];

    const base = createHttpClient((req) => {
      const requestIndex = attemptsPerRequest.length;
      // Track: we get called for each attempt of each request
      // We build a counter per request URL
      const lastCount = attemptsPerRequest[requestIndex] ?? 0;

      // Always fail to count total attempts
      const count = lastCount + 1;
      attemptsPerRequest[requestIndex] = count;

      return ResultAsync.err(httpRequestError("Transport", req, "Always fails"));
    });

    // To count per-request attempts, use separate tracking
    const perRequestAttempts: number[] = [];
    let requestNumber = -1;

    const trackingBase = createHttpClient((req) => {
      if (!req.url.includes("req")) {
        return ResultAsync.err(httpRequestError("Transport", req, "fail"));
      }
      const reqNum = parseInt(req.url.replace("/req", ""), 10) - 1;
      perRequestAttempts[reqNum] = (perRequestAttempts[reqNum] ?? 0) + 1;
      return ResultAsync.err(httpRequestError("Transport", req, "Always fails"));
    });

    const client = retry({ times: 3 })(trackingBase);

    await client.execute(get("/req1"));
    await client.execute(get("/req2"));
    await client.execute(get("/req3"));

    // Each request should have exactly 4 attempts (1 initial + 3 retries)
    expect(perRequestAttempts[0]).toBe(4);
    expect(perRequestAttempts[1]).toBe(4);
    expect(perRequestAttempts[2]).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// defaultHeaders — no shared mutable state
// ---------------------------------------------------------------------------

describe("defaultHeaders — stateless", () => {
  it("header values are fixed at creation time and don't change across requests", async () => {
    const capturedHeaders: Array<Record<string, string>> = [];

    const base = captureAndSucceed((req) => {
      capturedHeaders.push({ ...req.headers.entries });
    });

    const headers = { "x-app-id": "my-app" };
    const client = defaultHeaders(headers)(base);

    await client.execute(get("/req1"));
    await client.execute(get("/req2"));

    expect(capturedHeaders[0]["x-app-id"]).toBe("my-app");
    expect(capturedHeaders[1]["x-app-id"]).toBe("my-app");
  });

  it("modifying the headers object after creating the client has no effect", async () => {
    const capturedHeaders: Array<Record<string, string>> = [];

    const base = captureAndSucceed((req) => {
      capturedHeaders.push({ ...req.headers.entries });
    });

    const headers: Record<string, string> = { "x-initial": "value-1" };
    const client = defaultHeaders(headers)(base);

    await client.execute(get("/req1"));

    // Mutate the original headers object (defensive: client should not be affected)
    // Note: this tests that defaultHeaders doesn't hold a live reference to the input
    headers["x-extra"] = "injected";

    await client.execute(get("/req2"));

    // Both requests should only have the original header
    expect(capturedHeaders[0]["x-initial"]).toBe("value-1");
    expect(capturedHeaders[0]["x-extra"]).toBeUndefined();
    expect(capturedHeaders[1]["x-initial"]).toBe("value-1");
    // The injected key should NOT appear (the combinator froze its own copy)
    expect(capturedHeaders[1]["x-extra"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// baseUrl — no shared mutable state
// ---------------------------------------------------------------------------

describe("baseUrl — stateless", () => {
  it("the base URL is fixed at creation time and applies consistently", async () => {
    const capturedUrls: string[] = [];

    const base = captureAndSucceed((req) => {
      capturedUrls.push(req.url);
    });

    const client = baseUrl("https://api.example.com")(base);

    for (let i = 0; i < 5; i++) {
      await client.execute(get(`/path-${i}`));
    }

    for (let i = 0; i < 5; i++) {
      expect(capturedUrls[i]).toBe(`https://api.example.com/path-${i}`);
    }
  });
});

// ---------------------------------------------------------------------------
// mapRequest — pure function applied consistently
// ---------------------------------------------------------------------------

describe("mapRequest — stateless transform", () => {
  it("the transform function is called for each request with no side effects", async () => {
    const receivedUrls: string[] = [];
    const transformedUrls: string[] = [];

    const base = captureAndSucceed((req) => {
      receivedUrls.push(req.url);
    });

    const client = mapRequest((req) => {
      const modified = { ...req, url: req.url + "/modified" };
      transformedUrls.push(modified.url);
      return modified;
    })(base);

    await client.execute(get("/a"));
    await client.execute(get("/b"));
    await client.execute(get("/c"));

    expect(receivedUrls).toEqual(["/a/modified", "/b/modified", "/c/modified"]);
    expect(transformedUrls).toEqual(["/a/modified", "/b/modified", "/c/modified"]);
  });
});
