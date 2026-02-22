/**
 * Tests for catchError and catchAll error-recovery combinators.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { catchError, catchAll } from "../../src/combinators/error.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status = 200, statusText = "OK"): HttpResponse {
  const req = get("/test");
  return createHttpResponse({
    status,
    statusText,
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("ok"),
  });
}

function successClient(response?: HttpResponse) {
  const res = response ?? makeResponse();
  return createHttpClient(() => ResultAsync.fromSafePromise(Promise.resolve(res)));
}

function failingClient(reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl", message = "Error") {
  return createHttpClient((req) =>
    ResultAsync.err(httpRequestError(reason, req, message)),
  );
}

// ---------------------------------------------------------------------------
// catchError — basic tag-based matching
// ---------------------------------------------------------------------------

describe("catchError — tag-based matching", () => {
  it("catches HttpRequestError and returns the fallback response", async () => {
    const fallback = makeResponse(200, "Fallback");
    const client = catchError("HttpRequestError", () =>
      ResultAsync.ok(fallback),
    )(failingClient("Transport"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(fallback);
    }
  });

  it("does not call the handler when the request succeeds", async () => {
    let handlerCalled = false;
    const client = catchError("HttpRequestError", () => {
      handlerCalled = true;
      return ResultAsync.ok(makeResponse());
    })(successClient());

    await client.execute(get("/test"));

    expect(handlerCalled).toBe(false);
  });

  it("passes successful responses through unchanged", async () => {
    const expected = makeResponse(201, "Created");
    const client = catchError("HttpRequestError", () =>
      ResultAsync.ok(makeResponse(500, "Should not be used")),
    )(successClient(expected));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(201);
    }
  });

  it("passes through errors whose tag does not match (other error types)", async () => {
    // HttpResponseError tag won't match "HttpRequestError" handler... but since
    // the client returns HttpRequestError and we handle it, test the flip side:
    // an unmatched tag passes through.

    // We create a client that fails with Transport. We catch only Timeout —
    // so the Transport error should NOT be caught and should pass through.
    const client = catchError("HttpRequestError", (e) => {
      // Only recover Timeout, re-raise Transport
      if (e.reason === "Timeout") {
        return ResultAsync.ok(makeResponse(200, "Recovered"));
      }
      return ResultAsync.err(e);
    })(failingClient("Transport", "Transport error"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});

// ---------------------------------------------------------------------------
// catchError — Transport vs Timeout discrimination
// ---------------------------------------------------------------------------

describe("catchError — reason-based discrimination", () => {
  it("catches Transport errors and returns fallback when handler matches on reason", async () => {
    const fallback = makeResponse(200, "Cache hit");
    const client = catchError("HttpRequestError", (e) => {
      if (e.reason === "Transport") {
        return ResultAsync.ok(fallback);
      }
      return ResultAsync.err(e);
    })(failingClient("Transport"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(fallback);
    }
  });

  it("does not catch Timeout when handler only handles Transport", async () => {
    const client = catchError("HttpRequestError", (e) => {
      if (e.reason === "Transport") {
        return ResultAsync.ok(makeResponse(200, "Fallback"));
      }
      return ResultAsync.err(e);
    })(failingClient("Timeout"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("passes through Aborted errors when handler only handles Transport", async () => {
    const client = catchError("HttpRequestError", (e) => {
      if (e.reason === "Transport") {
        return ResultAsync.ok(makeResponse());
      }
      return ResultAsync.err(e);
    })(failingClient("Aborted"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});

// ---------------------------------------------------------------------------
// catchError — handler re-raises error
// ---------------------------------------------------------------------------

describe("catchError — handler can re-raise", () => {
  it("propagates the error when the handler returns Err", async () => {
    const client = catchError("HttpRequestError", (e) =>
      ResultAsync.err(e),
    )(failingClient("Transport", "Original error"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Original error");
    }
  });

  it("wraps a re-raised error with different message from handler", async () => {
    const client = catchError("HttpRequestError", (_e) => {
      const req = get("/test");
      return ResultAsync.err(httpRequestError("Transport", req, "Remapped error"));
    })(failingClient("Transport"));

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Remapped error");
    }
  });
});

// ---------------------------------------------------------------------------
// catchAll
// ---------------------------------------------------------------------------

describe("catchAll — catches all errors", () => {
  it("catches Transport errors and returns fallback", async () => {
    const fallback = makeResponse(200, "Recovered");
    const client = catchAll(() => ResultAsync.ok(fallback))(
      failingClient("Transport"),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value).toBe(fallback);
    }
  });

  it("catches Timeout errors and returns fallback", async () => {
    const fallback = makeResponse(200, "Recovered");
    const client = catchAll(() => ResultAsync.ok(fallback))(
      failingClient("Timeout"),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("catches Aborted errors and returns fallback", async () => {
    const fallback = makeResponse(200, "Recovered");
    const client = catchAll(() => ResultAsync.ok(fallback))(
      failingClient("Aborted"),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("catches InvalidUrl errors and maps to a new error", async () => {
    const req = get("/bad-url");
    const client = catchAll((e) => {
      const newErr = httpRequestError("Transport", req, `Mapped: ${e._tag}`);
      return ResultAsync.err(newErr);
    })(failingClient("InvalidUrl"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("Mapped:");
    }
  });

  it("does not call the handler when the request succeeds", async () => {
    let handlerCalled = false;
    const client = catchAll(() => {
      handlerCalled = true;
      return ResultAsync.ok(makeResponse());
    })(successClient());

    await client.execute(get("/test"));

    expect(handlerCalled).toBe(false);
  });

  it("passes successful responses through unchanged", async () => {
    const expected = makeResponse(202, "Accepted");
    const client = catchAll(() => ResultAsync.ok(makeResponse(500, "Should not reach")))(
      successClient(expected),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(202);
    }
  });

  it("passes the full error to the handler", async () => {
    let receivedError: { _tag: string } | undefined;

    const client = catchAll((e) => {
      receivedError = e;
      return ResultAsync.err(e as Parameters<typeof httpRequestError>[0] extends infer R
        ? R extends { _tag: string } ? R : never
        : never
      );
    })(failingClient("Transport", "Test error"));

    // Suppress the re-raise by catching the overall result
    const req = get("/test");
    const base = createHttpClient((r) =>
      ResultAsync.err(httpRequestError("Transport", r, "Test error")),
    );
    const client2 = catchAll((e) => {
      receivedError = e as { _tag: string };
      return ResultAsync.err(httpRequestError("Transport", req, "re-raised"));
    })(base);

    await client2.execute(req);

    expect(receivedError?._tag).toBe("HttpRequestError");
  });

  it("re-raises the error when handler returns Err", async () => {
    const client = catchAll((e) => ResultAsync.err(e))(
      failingClient("Transport", "Original"),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
  });
});

// ---------------------------------------------------------------------------
// catchError / catchAll — handler receives the request context
// ---------------------------------------------------------------------------

describe("catchError — handler error context", () => {
  it("the handler receives the error with request info intact", async () => {
    let receivedRequest: HttpRequest | undefined;

    const base = createHttpClient((req) =>
      ResultAsync.err(httpRequestError("Transport", req, "Network down")),
    );

    const client = catchError("HttpRequestError", (e) => {
      receivedRequest = e.request;
      return ResultAsync.ok(makeResponse());
    })(base);

    const req = get("/endpoint-path");
    await client.execute(req);

    expect(receivedRequest?.url).toBe("/endpoint-path");
  });
});

// ---------------------------------------------------------------------------
// catchError — tag mismatch (non-matching error passes through)
// ---------------------------------------------------------------------------

import { httpResponseError } from "../../src/errors/http-response-error.js";
import type { HttpClientError } from "../../src/errors/index.js";

describe("catchError — tag mismatch passes through unchanged", () => {
  it("passes through HttpRequestError when handler listens for HttpResponseError", async () => {
    // The client returns an HttpRequestError but we catch "HttpResponseError" —
    // the mismatch branch (clientErr._tag !== tag) should return the original error.
    const requestErrClient = failingClient("Transport", "original transport error");

    const client = catchError(
      "HttpResponseError",
      (_e) => ResultAsync.ok(makeResponse(200, "Should never be called")),
    )(requestErrClient);

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toBe("original transport error");
    }
  });

  it("tag mismatch does not invoke the handler at all", async () => {
    let handlerInvoked = false;
    const client = catchError(
      "HttpResponseError",
      (_e) => {
        handlerInvoked = true;
        return ResultAsync.ok(makeResponse());
      },
    )(failingClient("Timeout"));

    await client.execute(get("/test"));

    expect(handlerInvoked).toBe(false);
  });

  it("tag mismatch returns the exact same error object", async () => {
    const requestErrClient = failingClient("InvalidUrl", "bad url message");
    const client = catchError(
      "HttpResponseError",
      (_e) => ResultAsync.ok(makeResponse()),
    )(requestErrClient);

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("bad url message");
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });
});

// ---------------------------------------------------------------------------
// catchError — handler returning non-HttpRequestError triggers toRequestError
// ---------------------------------------------------------------------------

describe("catchError — toRequestError wrapping when handler returns non-HttpRequestError", () => {
  it("wraps HttpResponseError from handler into HttpRequestError with cause", async () => {
    // catchError handles "HttpRequestError"; the handler returns an HttpResponseError
    // (which is a valid HttpClientError), which must be wrapped by toRequestError.
    const req = get("/wrap-test");
    const dummyResponse = makeResponse(500, "Server Error");

    const client = catchError(
      "HttpRequestError",
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        const responseErr = httpResponseError(
          "StatusCode",
          req,
          dummyResponse,
          "server blew up",
        );
        return ResultAsync.err(responseErr);
      },
    )(failingClient("Transport", "network gone"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("HttpResponseError");
      expect(result.error.cause).toBeDefined();
      const cause = result.error.cause as { _tag: string };
      expect(cause._tag).toBe("HttpResponseError");
    }
  });

  it("toRequestError sets message to Error recovery produced: <original tag>", async () => {
    const req = get("/message-test");
    const dummyResponse = makeResponse(422, "Unprocessable");

    const client = catchError(
      "HttpRequestError",
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        const responseErr = httpResponseError(
          "Decode",
          req,
          dummyResponse,
          "decode failed",
        );
        return ResultAsync.err(responseErr);
      },
    )(failingClient("Transport"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Error recovery produced: HttpResponseError");
    }
  });

  it("toRequestError preserves the original error as cause", async () => {
    const req = get("/cause-test");
    const dummyResponse = makeResponse(500, "Error");
    const innerCause = new Error("inner problem");

    const client = catchError(
      "HttpRequestError",
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        const responseErr = httpResponseError(
          "EmptyBody",
          req,
          dummyResponse,
          "body was empty",
          innerCause,
        );
        return ResultAsync.err(responseErr);
      },
    )(failingClient("Transport"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      const cause = result.error.cause as { _tag: string; cause: unknown };
      expect(cause._tag).toBe("HttpResponseError");
      expect(cause.cause).toBe(innerCause);
    }
  });
});

// ---------------------------------------------------------------------------
// catchAll — handler returning non-HttpRequestError triggers toRequestError
// ---------------------------------------------------------------------------

describe("catchAll — toRequestError wrapping when handler returns non-HttpRequestError", () => {
  it("wraps HttpResponseError from handler into HttpRequestError with cause", async () => {
    const req = get("/catchall-wrap-test");
    const dummyResponse = makeResponse(503, "Service Unavailable");

    const client = catchAll(
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        const responseErr = httpResponseError(
          "StatusCode",
          req,
          dummyResponse,
          "service down",
        );
        return ResultAsync.err(responseErr);
      },
    )(failingClient("Transport", "connection refused"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("HttpResponseError");
      const cause = result.error.cause as { _tag: string };
      expect(cause._tag).toBe("HttpResponseError");
    }
  });

  it("toRequestError message is Error recovery produced: HttpResponseError", async () => {
    const req = get("/catchall-message-test");
    const dummyResponse = makeResponse(400, "Bad Request");

    const client = catchAll(
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        const responseErr = httpResponseError(
          "Decode",
          req,
          dummyResponse,
          "failed to decode",
        );
        return ResultAsync.err(responseErr);
      },
    )(failingClient("Timeout"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toBe("Error recovery produced: HttpResponseError");
    }
  });

  it("catchAll wrapping preserves the cause chain for all error reasons", async () => {
    const reasons = ["Transport", "Timeout", "Aborted", "InvalidUrl"] as const;

    for (const reason of reasons) {
      const req = get(`/test-${reason}`);
      const dummyResponse = makeResponse(500, "Error");

      const client = catchAll(
        (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
          const responseErr = httpResponseError(
            "StatusCode",
            req,
            dummyResponse,
            "always a response error",
          );
          return ResultAsync.err(responseErr);
        },
      )(failingClient(reason));

      const result = await client.execute(req);

      expect(result._tag).toBe("Err");
      if (result._tag === "Err") {
        expect(result.error._tag).toBe("HttpRequestError");
        expect(result.error.reason).toBe("Transport");
        const cause = result.error.cause as { _tag: string };
        expect(cause._tag).toBe("HttpResponseError");
      }
    }
  });

  it("catchAll wrapping sets reason to Transport regardless of original reason", async () => {
    const req = get("/reason-test");
    const dummyResponse = makeResponse(500, "Error");

    const client = catchAll(
      (_e): ReturnType<typeof ResultAsync.err<HttpClientError>> => {
        return ResultAsync.err(
          httpResponseError("StatusCode", req, dummyResponse, "response error"),
        );
      },
    )(failingClient("Aborted"));

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});
