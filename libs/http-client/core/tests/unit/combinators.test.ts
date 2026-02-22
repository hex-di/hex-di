/**
 * Tests for basic combinators: mapRequest, mapRequestResult, mapResponse,
 * mapResponseResult, filterStatusOk, filterStatus, baseUrl, defaultHeaders,
 * bearerAuth, dynamicAuth.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { mapRequest, mapRequestResult } from "../../src/combinators/request.js";
import { mapResponse, mapResponseResult } from "../../src/combinators/response.js";
import { filterStatusOk, filterStatus } from "../../src/combinators/status.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { defaultHeaders } from "../../src/combinators/headers.js";
import { bearerAuth, dynamicAuth } from "../../src/combinators/auth.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeResponse(status = 200, statusText = "OK"): HttpResponse {
  const req = get("/test");
  const res = createHttpResponse({
    status,
    statusText,
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("{}"),
  });
  return res;
}

function mockClientThatReturns(response: HttpResponse) {
  return createHttpClient(() => ResultAsync.fromSafePromise(Promise.resolve(response)));
}

function mockClientThatCaptures(
  onExecute: (req: HttpRequest) => HttpResponse,
) {
  return createHttpClient((req) =>
    ResultAsync.fromSafePromise(Promise.resolve(onExecute(req))),
  );
}

function mockClientThatFails(reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl" = "Transport") {
  return createHttpClient((req) => {
    const e = httpRequestError(reason, req, `Simulated ${reason} error`);
    return ResultAsync.err(e);
  });
}

// ---------------------------------------------------------------------------
// mapRequest
// ---------------------------------------------------------------------------

describe("mapRequest", () => {
  it("transforms the request before passing it to the client", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = mapRequest((req) => ({ ...req, url: req.url + "/modified" }))(base);
    await client.execute(get("/original"));

    expect(capturedUrl).toBe("/original/modified");
  });

  it("does not mutate the original request object", async () => {
    const originalReq = get("/original");
    let receivedReq: HttpRequest | undefined;

    const base = createHttpClient((req) => {
      receivedReq = req;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = mapRequest((req) => ({ ...req, url: "/transformed" }))(base);
    await client.execute(originalReq);

    expect(originalReq.url).toBe("/original");
    expect(receivedReq?.url).toBe("/transformed");
  });

  it("returns the response from the inner client unchanged", async () => {
    const expected = makeResponse(201, "Created");
    const client = mapRequest((req) => req)(mockClientThatReturns(expected));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("propagates errors from the inner client", async () => {
    const client = mapRequest((req) => req)(mockClientThatFails("Transport"));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });
});

// ---------------------------------------------------------------------------
// mapRequestResult
// ---------------------------------------------------------------------------

describe("mapRequestResult", () => {
  it("transforms request through a fallible async fn and executes if Ok", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = mapRequestResult((req) =>
      ResultAsync.ok({ ...req, url: "/async-modified" }),
    )(base);
    await client.execute(get("/original"));

    expect(capturedUrl).toBe("/async-modified");
  });

  it("short-circuits with Err if the transform returns Err (request not sent)", async () => {
    let wasCalled = false;
    const base = createHttpClient(() => {
      wasCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const req = get("/test");
    const client = mapRequestResult((r) =>
      ResultAsync.err(httpRequestError("InvalidUrl", r, "Not allowed")),
    )(base);
    const result = await client.execute(req);

    expect(wasCalled).toBe(false);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });
});

// ---------------------------------------------------------------------------
// mapResponse
// ---------------------------------------------------------------------------

describe("mapResponse", () => {
  it("transforms the response after execution", async () => {
    const original = makeResponse(200, "OK");
    const client = mapResponse((res) => ({ ...res, status: 299 }))(
      mockClientThatReturns(original),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(299);
    }
  });

  it("does not call the transform on error", async () => {
    let transformCalled = false;
    const client = mapResponse((res) => {
      transformCalled = true;
      return res;
    })(mockClientThatFails("Transport"));

    await client.execute(get("/test"));

    expect(transformCalled).toBe(false);
  });

  it("propagates errors from the inner client unchanged", async () => {
    const client = mapResponse((res) => res)(mockClientThatFails("Timeout"));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });
});

// ---------------------------------------------------------------------------
// mapResponseResult
// ---------------------------------------------------------------------------

describe("mapResponseResult", () => {
  it("transforms response through a fallible async fn", async () => {
    const original = makeResponse(200, "OK");
    const client = mapResponseResult((res) =>
      ResultAsync.ok({ ...res, statusText: "Mapped" }),
    )(mockClientThatReturns(original));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.statusText).toBe("Mapped");
    }
  });

  it("propagates Err returned by the transform", async () => {
    const original = makeResponse(200, "OK");
    const req = get("/test");

    const client = mapResponseResult((res) =>
      ResultAsync.err(
        httpRequestError("Transport", res.request, "Validation failed"),
      ),
    )(mockClientThatReturns(original));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Validation failed");
    }
  });
});

// ---------------------------------------------------------------------------
// filterStatusOk
// ---------------------------------------------------------------------------

describe("filterStatusOk", () => {
  it("passes 200 responses through as Ok", async () => {
    const res = makeResponse(200, "OK");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("passes 201 responses through as Ok", async () => {
    const res = makeResponse(201, "Created");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("passes 204 responses through as Ok", async () => {
    const res = makeResponse(204, "No Content");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("passes 299 responses through as Ok (end of 2xx range)", async () => {
    const res = makeResponse(299, "Custom 2xx");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("converts 404 to Err with HttpRequestError (Transport)", async () => {
    const res = makeResponse(404, "Not Found");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("converts 500 to Err with HttpRequestError (Transport)", async () => {
    const res = makeResponse(500, "Internal Server Error");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("converts 301 to Err (3xx is not 2xx)", async () => {
    const res = makeResponse(301, "Moved Permanently");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
  });

  it("wraps the underlying HttpResponseError in the cause field", async () => {
    const res = makeResponse(404, "Not Found");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    if (result._tag === "Err") {
      expect(result.error.cause).toBeDefined();
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "_tag" in cause &&
          (cause as { _tag: unknown })._tag === "HttpResponseError",
      ).toBe(true);
    }
  });

  it("propagates existing transport errors unchanged", async () => {
    const client = filterStatusOk(mockClientThatFails("Transport"));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});

// ---------------------------------------------------------------------------
// filterStatus (predicate-based)
// ---------------------------------------------------------------------------

describe("filterStatus", () => {
  it("passes responses whose status satisfies the predicate", async () => {
    const res = makeResponse(200, "OK");
    const client = filterStatus((s) => s === 200)(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("rejects responses whose status does not satisfy the predicate", async () => {
    const res = makeResponse(201, "Created");
    const client = filterStatus((s) => s === 200)(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
  });

  it("accepts a list-based predicate for specific status codes", async () => {
    const allowed = [200, 201, 204];
    const predicate = (s: number): boolean => allowed.includes(s);

    const res201 = makeResponse(201, "Created");
    const client201 = filterStatus(predicate)(mockClientThatReturns(res201));
    const result201 = await client201.execute(get("/test"));
    expect(result201._tag).toBe("Ok");

    const res400 = makeResponse(400, "Bad Request");
    const client400 = filterStatus(predicate)(mockClientThatReturns(res400));
    const result400 = await client400.execute(get("/test"));
    expect(result400._tag).toBe("Err");
  });

  it("uses custom buildMessage when provided", async () => {
    const res = makeResponse(422, "Unprocessable Entity");
    const client = filterStatus(
      (s) => s < 400,
      (_res, req) => `Custom error for ${req.url}`,
    )(mockClientThatReturns(res));

    const result = await client.execute(get("/my-endpoint"));

    if (result._tag === "Err" && result.error.cause !== undefined) {
      const cause = result.error.cause as { message?: unknown };
      expect(typeof cause.message === "string" && cause.message.includes("/my-endpoint")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// baseUrl
// ---------------------------------------------------------------------------

describe("baseUrl", () => {
  it("prepends the base URL to each request's url", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = baseUrl("https://api.example.com")(base);
    await client.execute(get("/users"));

    expect(capturedUrl).toBe("https://api.example.com/users");
  });

  it("handles trailing slash on base and leading slash on path", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = baseUrl("https://api.example.com/")(base);
    await client.execute(get("/orders/123"));

    expect(capturedUrl).toBe("https://api.example.com/orders/123");
  });

  it("adds leading slash to path when missing", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = baseUrl("https://api.example.com")(base);
    await client.execute(get("users"));

    expect(capturedUrl).toBe("https://api.example.com/users");
  });

  it("applies to every request through the client", async () => {
    const capturedUrls: string[] = [];
    const base = createHttpClient((req) => {
      capturedUrls.push(req.url);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = baseUrl("https://api.example.com")(base);
    await client.execute(get("/a"));
    await client.execute(get("/b"));

    expect(capturedUrls).toEqual([
      "https://api.example.com/a",
      "https://api.example.com/b",
    ]);
  });
});

// ---------------------------------------------------------------------------
// defaultHeaders
// ---------------------------------------------------------------------------

describe("defaultHeaders", () => {
  it("adds default headers when the request has none", async () => {
    let capturedHeaders: Record<string, string> = {};
    const base = createHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "X-Api-Key": "secret" })(base);
    await client.execute(get("/test"));

    expect(capturedHeaders["x-api-key"]).toBe("secret");
  });

  it("does not overwrite existing request headers with defaults", async () => {
    let capturedHeaders: Record<string, string> = {};
    const base = createHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "x-api-key": "default-key" })(base);

    const req = get("/test");
    const reqWithHeader = {
      ...req,
      headers: createHeaders({ "x-api-key": "per-request-key" }),
    };
    await client.execute(reqWithHeader);

    expect(capturedHeaders["x-api-key"]).toBe("per-request-key");
  });

  it("normalizes default header keys to lowercase", async () => {
    let capturedHeaders: Record<string, string> = {};
    const base = createHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "X-Request-Id": "abc123" })(base);
    await client.execute(get("/test"));

    expect(capturedHeaders["x-request-id"]).toBe("abc123");
  });

  it("passes through without modification if all defaults already exist on request", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "x-app": "myapp" })(base);
    const req = get("/test");
    const reqWithHeader = { ...req, headers: createHeaders({ "x-app": "already-set" }) };
    await client.execute(reqWithHeader);

    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// bearerAuth
// ---------------------------------------------------------------------------

describe("bearerAuth", () => {
  it("adds Authorization: Bearer <token> header to every request", async () => {
    let capturedHeaders: Record<string, string> = {};
    const base = createHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("token123")(base);
    await client.execute(get("/secure"));

    expect(capturedHeaders["authorization"]).toBe("Bearer token123");
  });

  it("uses the exact token provided, not a modified version", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("my-special-token-xyz")(base);
    await client.execute(get("/test"));

    expect(capturedAuth).toBe("Bearer my-special-token-xyz");
  });

  it("overrides any existing authorization header", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("new-token")(base);
    const req = get("/test");
    const reqWithAuth = { ...req, headers: createHeaders({ authorization: "Bearer old-token" }) };
    await client.execute(reqWithAuth);

    expect(capturedAuth).toBe("Bearer new-token");
  });
});

// ---------------------------------------------------------------------------
// dynamicAuth
// ---------------------------------------------------------------------------

describe("dynamicAuth", () => {
  it("calls the getter and sets the Authorization header from the result", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = dynamicAuth(() => ResultAsync.ok("Bearer dynamic-token"))(base);
    await client.execute(get("/secure"));

    expect(capturedAuth).toBe("Bearer dynamic-token");
  });

  it("propagates Err if the getter fails (request is not sent)", async () => {
    let wasCalled = false;
    const base = createHttpClient(() => {
      wasCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const req = get("/secure");
    const client = dynamicAuth((r) =>
      ResultAsync.err(httpRequestError("Transport", r, "Token service unavailable")),
    )(base);

    const result = await client.execute(req);

    expect(wasCalled).toBe(false);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Token service unavailable");
    }
  });

  it("passes the current request to the getter function", async () => {
    let receivedRequest: HttpRequest | undefined;
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    const expectedReq = get("/needs-auth");
    const client = dynamicAuth((req) => {
      receivedRequest = req;
      return ResultAsync.ok("Bearer computed");
    })(base);

    await client.execute(expectedReq);

    expect(receivedRequest?.url).toBe("/needs-auth");
  });

  it("calls the getter on every request independently", async () => {
    let callCount = 0;
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    const client = dynamicAuth(() => {
      callCount++;
      return ResultAsync.ok(`Bearer token-${callCount}`);
    })(base);

    await client.execute(get("/a"));
    await client.execute(get("/b"));

    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// basicAuth
// ---------------------------------------------------------------------------

import { basicAuth } from "../../src/combinators/auth.js";

describe("basicAuth", () => {
  it("adds Authorization: Basic header from username and password", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = basicAuth("user", "pass")(base);
    await client.execute(get("/secure"));

    expect(capturedAuth).toMatch(/^Basic /);
  });

  it("Basic header is base64 encoded (user:pass)", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = basicAuth("alice", "s3cr3t")(base);
    await client.execute(get("/secure"));

    // btoa("alice:s3cr3t") is the expected encoding
    const expected = `Basic ${btoa("alice:s3cr3t")}`;
    expect(capturedAuth).toBe(expected);
  });

  it("correctly encodes different username and password combinations", async () => {
    let capturedAuth = "";
    const base = createHttpClient((req) => {
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = basicAuth("admin", "P@ssw0rd!")(base);
    await client.execute(get("/admin"));

    const expected = `Basic ${btoa("admin:P@ssw0rd!")}`;
    expect(capturedAuth).toBe(expected);
  });

  it("sets authorization header on every request", async () => {
    const capturedAuths: string[] = [];
    const base = createHttpClient((req) => {
      capturedAuths.push(req.headers.entries["authorization"] ?? "");
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = basicAuth("bob", "secret")(base);
    await client.execute(get("/a"));
    await client.execute(get("/b"));

    const expected = `Basic ${btoa("bob:secret")}`;
    expect(capturedAuths).toHaveLength(2);
    expect(capturedAuths[0]).toBe(expected);
    expect(capturedAuths[1]).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// defaultHeaders — hasNewKeys boundary tests
// ---------------------------------------------------------------------------

describe("defaultHeaders hasNewKeys boundary", () => {
  it("does not modify request when all default headers are already set", async () => {
    const receivedRequests: HttpRequest[] = [];
    const base = createHttpClient((req) => {
      receivedRequests.push(req);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "x-api-key": "default-value" })(base);

    const req = get("/test");
    const reqWithHeader = {
      ...req,
      headers: createHeaders({ "x-api-key": "already-present" }),
    };
    await client.execute(reqWithHeader);

    expect(receivedRequests).toHaveLength(1);
    // The request object should be the original (no new object created)
    expect(receivedRequests[0]).toBe(reqWithHeader);
  });

  it("applies only missing default headers when request has some but not all", async () => {
    let capturedHeaders: Record<string, string> = {};
    const base = createHttpClient((req) => {
      capturedHeaders = { ...req.headers.entries };
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({
      "x-api-key": "default-key",
      "x-api-version": "2024-01-01",
    })(base);

    const req = get("/test");
    // Request already has x-api-key but NOT x-api-version
    const reqWithPartialHeaders = {
      ...req,
      headers: createHeaders({ "x-api-key": "per-request-key" }),
    };
    await client.execute(reqWithPartialHeaders);

    // Per-request value wins for existing header
    expect(capturedHeaders["x-api-key"]).toBe("per-request-key");
    // Default is applied for missing header
    expect(capturedHeaders["x-api-version"]).toBe("2024-01-01");
  });

  it("does not pass original request object when new keys are added", async () => {
    const receivedRequests: HttpRequest[] = [];
    const base = createHttpClient((req) => {
      receivedRequests.push(req);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "x-injected": "yes" })(base);
    const original = get("/test");
    await client.execute(original);

    // A new request object must have been created (with the injected header)
    expect(receivedRequests).toHaveLength(1);
    expect(receivedRequests[0]).not.toBe(original);
    expect(receivedRequests[0]?.headers.entries["x-injected"]).toBe("yes");
  });

  it("passes request through unchanged (same reference) when all defaults already exist", async () => {
    let receivedReq: HttpRequest | undefined;
    const base = createHttpClient((req) => {
      receivedReq = req;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = defaultHeaders({ "content-type": "application/json" })(base);
    const reqWithAll = {
      ...get("/test"),
      headers: createHeaders({ "content-type": "text/plain" }),
    };
    await client.execute(reqWithAll);

    // The inner client must have received the exact same object (short-circuit path)
    expect(receivedReq).toBe(reqWithAll);
  });
});

// ---------------------------------------------------------------------------
// filterStatus — buildMessage branch
// ---------------------------------------------------------------------------

describe("filterStatus buildMessage branch", () => {
  it("uses custom buildMessage when provided and status fails predicate", async () => {
    const res = makeResponse(422, "Unprocessable Entity");
    const client = filterStatus(
      (s) => s < 400,
      (_res, req) => `Custom: ${req.url} returned 422`,
    )(mockClientThatReturns(res));

    const result = await client.execute(get("/my-endpoint"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      // The wrapper error's cause is the HttpResponseError with our custom message
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "message" in cause &&
          typeof (cause as { message: unknown }).message === "string" &&
          (cause as { message: string }).message === "Custom: /my-endpoint returned 422",
      ).toBe(true);
    }
  });

  it("buildMessage receives the response and request", async () => {
    let receivedStatus: number | undefined;
    let receivedUrl: string | undefined;

    const res = makeResponse(403, "Forbidden");
    const client = filterStatus(
      (s) => s === 200,
      (response, req) => {
        receivedStatus = response.status;
        receivedUrl = req.url;
        return `${response.status} at ${req.url}`;
      },
    )(mockClientThatReturns(res));

    await client.execute(get("/protected-resource"));

    expect(receivedStatus).toBe(403);
    expect(receivedUrl).toBe("/protected-resource");
  });

  it("uses default message format when buildMessage is not provided", async () => {
    const res = makeResponse(404, "Not Found");
    const client = filterStatus((s) => s === 200)(mockClientThatReturns(res));

    const result = await client.execute(get("/missing"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "message" in cause &&
          typeof (cause as { message: unknown }).message === "string" &&
          (cause as { message: string }).message.includes("404") &&
          (cause as { message: string }).message.includes("GET") &&
          (cause as { message: string }).message.includes("/missing"),
      ).toBe(true);
    }
  });

  it("buildMessage result is the exact error message (not default format)", async () => {
    const res = makeResponse(500, "Server Error");
    const customMsg = "EXACTLY_THIS_MESSAGE";
    const client = filterStatus(
      (s) => s < 500,
      () => customMsg,
    )(mockClientThatReturns(res));

    const result = await client.execute(get("/boom"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "message" in cause &&
          (cause as { message: unknown }).message === customMsg,
      ).toBe(true);
    }
  });

  it("does not call buildMessage when status satisfies predicate", async () => {
    let buildMessageCalled = false;
    const res = makeResponse(200, "OK");
    const client = filterStatus(
      (s) => s === 200,
      () => {
        buildMessageCalled = true;
        return "should not appear";
      },
    )(mockClientThatReturns(res));

    const result = await client.execute(get("/ok-endpoint"));

    expect(result._tag).toBe("Ok");
    expect(buildMessageCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterStatusOk / filterStatus — mutation-killing tests
// ---------------------------------------------------------------------------

describe("filterStatusOk — mutation-killing: error properties", () => {
  it('error reason is exactly "Transport" (not other reasons) when filterStatusOk rejects', async () => {
    // Kills the `"Transport"` StringLiteral mutant in wrapResponseError.
    const res = makeResponse(404, "Not Found");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("cause has _tag HttpResponseError when filterStatusOk rejects a non-2xx response", async () => {
    // Kills the `"StatusCode"` StringLiteral mutant in httpResponseError call.
    const res = makeResponse(500, "Internal Server Error");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.cause).toBeDefined();
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "_tag" in cause &&
          (cause as { _tag: unknown })._tag === "HttpResponseError",
      ).toBe(true);
      // Also verify the cause has reason: "StatusCode" to kill the StringLiteral mutant
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "reason" in cause &&
          (cause as { reason: unknown }).reason === "StatusCode",
      ).toBe(true);
    }
  });
});

describe("filterStatus — mutation-killing: buildMessage conditional", () => {
  it("uses the default message format when no buildMessage is provided", async () => {
    // Kills the `buildMessage !== undefined` → `true` mutant:
    // when mutated to always call buildMessage (which is undefined), it would throw.
    // More importantly, verifies the default message format is used.
    const res = makeResponse(404, "Not Found");
    const client = filterStatus((s) => s === 200)(mockClientThatReturns(res));
    const result = await client.execute(get("/test-path"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "message" in cause &&
          typeof (cause as { message: unknown }).message === "string" &&
          (cause as { message: string }).message.includes("404"),
      ).toBe(true);
    }
  });

  it("uses the custom buildMessage function when provided, producing a different message than default", async () => {
    // Kills the `buildMessage !== undefined` → `false` mutant:
    // when mutated, the custom buildMessage is never called, so message would be default format.
    const res = makeResponse(403, "Forbidden");
    const customMessage = "CUSTOM_MARKER_XYZ_403";
    const client = filterStatus(
      (s) => s === 200,
      () => customMessage,
    )(mockClientThatReturns(res));
    const result = await client.execute(get("/secure"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      const cause = result.error.cause;
      expect(
        typeof cause === "object" &&
          cause !== null &&
          "message" in cause &&
          (cause as { message: unknown }).message === customMessage,
      ).toBe(true);
    }
  });
});

describe("filterStatusOk — mutation-killing: s >= 200 boundary", () => {
  it("rejects status 199 (just below 2xx range)", async () => {
    // Kills the `s >= 200` → `true` mutant in filterStatusOk's predicate.
    // If mutated to `true && s < 300`, status 199 would PASS (199 < 300).
    // This test asserts 199 is rejected.
    const res = makeResponse(199, "Below 2xx");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("rejects status 100 (informational)", async () => {
    // Additional boundary test: status 100 should be rejected by filterStatusOk
    const res = makeResponse(100, "Continue");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
  });
});

// ---------------------------------------------------------------------------
// filterStatusOk — mutation-killing: s < 300 upper boundary
// ---------------------------------------------------------------------------

describe("filterStatusOk — mutation-killing: s < 300 upper boundary", () => {
  it("rejects status 300 (first 3xx, just above 2xx range)", async () => {
    // Kills the `s < 300` → `s <= 300` mutant in filterStatusOk's predicate.
    // With `<= 300`, status 300 would PASS as "ok" (200 <= 300 <= 300).
    // The correct behaviour: 300 is NOT in [200, 299], so filterStatusOk must return Err.
    const res = makeResponse(300, "Multiple Choices");
    const client = filterStatusOk(mockClientThatReturns(res));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});
