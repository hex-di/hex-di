/**
 * Tests for the tap combinators: tapRequest, tapResponse, tapError.
 *
 * Tap combinators run side-effects without altering the request/response/error
 * flowing through the pipeline. Errors thrown by the callback are silently
 * swallowed so the pipeline is never broken.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { tapRequest, tapResponse, tapError } from "../../src/combinators/tap.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";
import type { HttpClientError } from "../../src/errors/index.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeResponse(status = 200): HttpResponse {
  const req = get("/test");
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("{}"),
  });
}

function successClient(response?: HttpResponse) {
  const res = response ?? makeResponse();
  return createHttpClient(() => ResultAsync.fromSafePromise(Promise.resolve(res)));
}

function failingClient() {
  return createHttpClient((req) =>
    ResultAsync.err(httpRequestError("Transport", req, "Network error")),
  );
}

// ---------------------------------------------------------------------------
// tapRequest
// ---------------------------------------------------------------------------

describe("tapRequest", () => {
  it("calls fn with the outgoing request before executing", async () => {
    const captured: HttpRequest[] = [];
    const client = tapRequest((req) => { captured.push(req); })(successClient());

    const outgoing = get("/observe-me");
    await client.execute(outgoing);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBe(outgoing);
  });

  it("calls fn on every request independently", async () => {
    let callCount = 0;
    const client = tapRequest(() => { callCount++; })(successClient());

    await client.execute(get("/a"));
    await client.execute(get("/b"));
    await client.execute(get("/c"));

    expect(callCount).toBe(3);
  });

  it("passes the request through to the inner client unchanged", async () => {
    const received: HttpRequest[] = [];
    const base = createHttpClient((req) => {
      received.push(req);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const original = get("/passthrough");
    const client = tapRequest(() => { /* no-op */ })(base);
    await client.execute(original);

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(original);
  });

  it("returns the response from the inner client as Ok", async () => {
    const expected = makeResponse(201);
    const client = tapRequest(() => { /* no-op */ })(successClient(expected));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("swallows errors thrown by fn — pipeline continues normally", async () => {
    const expected = makeResponse(200);
    const client = tapRequest(() => {
      throw new Error("side-effect crash");
    })(successClient(expected));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("swallowed error from fn does not prevent inner client from being called", async () => {
    let innerCalled = false;
    const base = createHttpClient((req) => {
      innerCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });
    const client = tapRequest(() => {
      throw new Error("boom");
    })(base);

    await client.execute(get("/test"));

    expect(innerCalled).toBe(true);
  });

  it("propagates Err from the inner client when fn does not throw", async () => {
    const client = tapRequest(() => { /* no-op */ })(failingClient());
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("propagates Err from inner client even when fn throws", async () => {
    const client = tapRequest(() => {
      throw new Error("side-effect crash");
    })(failingClient());

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});

// ---------------------------------------------------------------------------
// tapResponse
// ---------------------------------------------------------------------------

describe("tapResponse", () => {
  it("calls fn with both the response and the originating request", async () => {
    const capturedArgs: Array<{ res: HttpResponse; req: HttpRequest }> = [];
    const response = makeResponse(200);

    const client = tapResponse((res, req) => {
      capturedArgs.push({ res, req });
    })(successClient(response));

    const outgoing = get("/check-args");
    await client.execute(outgoing);

    expect(capturedArgs).toHaveLength(1);
    expect(capturedArgs[0]?.res).toBe(response);
    expect(capturedArgs[0]?.req).toBe(outgoing);
  });

  it("calls fn with the correct request (not a mutated copy)", async () => {
    const capturedRequests: HttpRequest[] = [];
    const client = tapResponse((_res, req) => {
      capturedRequests.push(req);
    })(successClient());

    const original = get("/original-url");
    await client.execute(original);

    expect(capturedRequests[0]).toBe(original);
  });

  it("returns the response unchanged as Ok after calling fn", async () => {
    const expected = makeResponse(202);
    const client = tapResponse(() => { /* no-op */ })(successClient(expected));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("swallows errors thrown by fn — response still returned as Ok", async () => {
    const expected = makeResponse(200);
    const client = tapResponse(() => {
      throw new Error("logging exploded");
    })(successClient(expected));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("does NOT call fn when the inner client returns Err", async () => {
    let fnCalled = false;
    const client = tapResponse(() => {
      fnCalled = true;
    })(failingClient());

    await client.execute(get("/test"));

    expect(fnCalled).toBe(false);
  });

  it("passes Err from inner client through unchanged (fn not invoked)", async () => {
    const client = tapResponse(() => { /* no-op */ })(failingClient());
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toBe("Network error");
    }
  });

  it("calls fn on every successful response independently", async () => {
    let callCount = 0;
    const client = tapResponse(() => { callCount++; })(successClient());

    await client.execute(get("/a"));
    await client.execute(get("/b"));

    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// tapError
// ---------------------------------------------------------------------------

describe("tapError", () => {
  it("calls fn with the error and the originating request", async () => {
    const capturedArgs: Array<{ err: HttpClientError; req: HttpRequest }> = [];

    const client = tapError((err, req) => {
      capturedArgs.push({ err, req });
    })(failingClient());

    const outgoing = get("/check-error-args");
    await client.execute(outgoing);

    expect(capturedArgs).toHaveLength(1);
    expect(capturedArgs[0]?.err._tag).toBe("HttpRequestError");
    expect(capturedArgs[0]?.req).toBe(outgoing);
  });

  it("calls fn with the correct request URL", async () => {
    const capturedUrls: string[] = [];
    const client = tapError((_err, req) => {
      capturedUrls.push(req.url);
    })(failingClient());

    await client.execute(get("/specific-url"));

    expect(capturedUrls[0]).toBe("/specific-url");
  });

  it("returns the error unchanged as Err after calling fn", async () => {
    const client = tapError(() => { /* no-op */ })(failingClient());
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toBe("Network error");
    }
  });

  it("swallows errors thrown by fn — original Err still returned", async () => {
    const client = tapError(() => {
      throw new Error("metrics service down");
    })(failingClient());

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("does NOT call fn when the inner client returns Ok", async () => {
    let fnCalled = false;
    const client = tapError(() => {
      fnCalled = true;
    })(successClient());

    await client.execute(get("/test"));

    expect(fnCalled).toBe(false);
  });

  it("passes Ok from inner client through unchanged (fn not invoked)", async () => {
    const expected = makeResponse(200);
    const client = tapError(() => { /* no-op */ })(successClient(expected));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(expected);
    }
  });

  it("calls fn on every error independently", async () => {
    let callCount = 0;
    const client = tapError(() => { callCount++; })(failingClient());

    await client.execute(get("/a"));
    await client.execute(get("/b"));

    expect(callCount).toBe(2);
  });

  it("exposes the error as the HttpClientError union type (not narrowed)", async () => {
    const seenTags: string[] = [];
    const client = tapError((err) => {
      seenTags.push(err._tag);
    })(failingClient());

    await client.execute(get("/test"));

    expect(seenTags).toEqual(["HttpRequestError"]);
  });
});
