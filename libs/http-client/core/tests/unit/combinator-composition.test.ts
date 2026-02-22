/**
 * Tests for combinator composition — applying multiple combinators in sequence.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { defaultHeaders } from "../../src/combinators/headers.js";
import { filterStatusOk } from "../../src/combinators/status.js";
import { retry } from "../../src/combinators/retry.js";
import { timeout } from "../../src/combinators/timeout.js";
import { mapRequest } from "../../src/combinators/request.js";
import { wrapClient } from "../../src/combinators/wrap.js";
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

/**
 * A client that honours the AbortSignal on the request.
 * When the signal fires, the pending promise rejects.
 */
function abortableClient() {
  return createHttpClient((req) => {
    const signal = req.signal;
    if (signal?.aborted === true) {
      return ResultAsync.err(httpRequestError("Aborted", req, "Already aborted"));
    }
    if (signal === undefined) {
      return ResultAsync.fromSafePromise(new Promise<HttpResponse>(() => {}));
    }
    return ResultAsync.fromPromise(
      new Promise<HttpResponse>((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("AbortError", "AbortError")),
        );
      }),
      (e) => httpRequestError("Aborted", req, "Aborted by signal", e),
    );
  });
}

// ---------------------------------------------------------------------------
// Sequential combinator application
// ---------------------------------------------------------------------------

describe("combinator composition — sequential application", () => {
  it("baseUrl + bearerAuth: both transformations are applied to the request", async () => {
    let capturedUrl = "";
    let capturedAuth = "";

    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      capturedAuth = req.headers.entries["authorization"] ?? "";
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    // Apply combinators manually (simulating a pipe)
    const withBase = baseUrl("https://api.example.com")(base);
    const client = bearerAuth("my-token")(withBase);

    await client.execute(get("/users"));

    expect(capturedUrl).toBe("https://api.example.com/users");
    expect(capturedAuth).toBe("Bearer my-token");
  });

  it("baseUrl + defaultHeaders + bearerAuth: all three transformations apply", async () => {
    let capturedReq: HttpRequest | undefined;

    const base = createHttpClient((req) => {
      capturedReq = req;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = bearerAuth("tok")(
      defaultHeaders({ "X-Version": "2" })(
        baseUrl("https://api.example.com")(base),
      ),
    );

    await client.execute(get("/items"));

    expect(capturedReq?.url).toBe("https://api.example.com/items");
    expect(capturedReq?.headers.entries["authorization"]).toBe("Bearer tok");
    expect(capturedReq?.headers.entries["x-version"]).toBe("2");
  });

  it("the outermost combinator wraps the inner ones: outer transform executes first", async () => {
    // When combinators are nested as: outerFn(innerFn(base)),
    // execution order is: outerFn transform → innerFn transform → base
    const appliedOrder: string[] = [];

    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    // Build: outer(inner(base))
    // outer wraps inner: outer's transform runs first, then inner's transform
    const inner = mapRequest((req) => {
      appliedOrder.push("inner");
      return req;
    })(base);

    const client = mapRequest((req) => {
      appliedOrder.push("outer");
      return req;
    })(inner);

    await client.execute(get("/test"));

    // Outer runs first (it intercepts the request before passing to inner)
    expect(appliedOrder).toEqual(["outer", "inner"]);
  });

  it("cumulative URL transformations: each baseUrl layer prepends to what it receives", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    // First add a path suffix via mapRequest (inner)
    const withSuffix = mapRequest((req) => ({
      ...req,
      url: req.url + "/extra",
    }))(base);

    // Then prepend a base URL on top (outer)
    const client = baseUrl("https://api.example.com")(withSuffix);

    await client.execute(get("/test"));

    // baseUrl runs first (outer), prepends "https://api.example.com" to "/test"
    // → "https://api.example.com/test"
    // Then mapRequest appends "/extra"
    // → "https://api.example.com/test/extra"
    expect(capturedUrl).toBe("https://api.example.com/test/extra");
  });
});

// ---------------------------------------------------------------------------
// filterStatusOk in composition
// ---------------------------------------------------------------------------

describe("combinator composition — filterStatusOk", () => {
  it("baseUrl + bearerAuth + filterStatusOk: success passes through", async () => {
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
    );

    const client = filterStatusOk(bearerAuth("tok")(baseUrl("https://api.example.com")(base)));
    const result = await client.execute(get("/users"));

    expect(result._tag).toBe("Ok");
  });

  it("baseUrl + bearerAuth + filterStatusOk: 4xx becomes Err", async () => {
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse(404, "Not Found"))),
    );

    const client = filterStatusOk(bearerAuth("tok")(baseUrl("https://api.example.com")(base)));
    const result = await client.execute(get("/missing"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Transport");
    }
  });
});

// ---------------------------------------------------------------------------
// retry in composition
// ---------------------------------------------------------------------------

describe("combinator composition — retry", () => {
  it("baseUrl + bearerAuth + filterStatusOk + retry: retries on Transport error", async () => {
    let callCount = 0;

    const base = createHttpClient((req) => {
      callCount++;
      if (callCount < 3) {
        return ResultAsync.err(httpRequestError("Transport", req, "Network error"));
      }
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retry({ times: 3 })(
      filterStatusOk(
        bearerAuth("tok")(
          baseUrl("https://api.example.com")(base),
        ),
      ),
    );

    const result = await client.execute(get("/endpoint"));

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// timeout in composition
// ---------------------------------------------------------------------------

describe("combinator composition — timeout", () => {
  it("timeout wrapping an abortable slow client produces an error", async () => {
    // Use a 1ms timeout so it fires quickly with the abortable client
    const client = timeout(1)(
      baseUrl("https://api.example.com")(abortableClient()),
    );

    const result = await client.execute(get("/slow"));

    // Either Aborted or Timeout — both are Err
    expect(result._tag).toBe("Err");
  });

  it("timeout wrapping an instant client returns success", async () => {
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
    );

    const client = timeout(5000)(base);
    const result = await client.execute(get("/fast"));

    expect(result._tag).toBe("Ok");
  });

  it("pre-aborted signal with timeout composition returns Aborted immediately", async () => {
    const controller = new AbortController();
    controller.abort();

    let executeCalled = false;
    const base = createHttpClient(() => {
      executeCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(baseUrl("https://api.example.com")(base));
    const req = get("/test");
    const abortedReq = { ...req, signal: controller.signal };

    const result = await client.execute(abortedReq);

    expect(executeCalled).toBe(false);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});

// ---------------------------------------------------------------------------
// wrapClient
// ---------------------------------------------------------------------------

describe("wrapClient", () => {
  it("creates a new client that delegates to the inner client via the wrapper", async () => {
    let wrapperCalled = false;
    let innerCalled = false;

    const base = createHttpClient(() => {
      innerCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = wrapClient(base, (execute, req) => {
      wrapperCalled = true;
      return execute(req);
    });

    await client.execute(get("/test"));

    expect(wrapperCalled).toBe(true);
    expect(innerCalled).toBe(true);
  });

  it("wrapper can transform the request before delegating", async () => {
    let capturedUrl = "";
    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = wrapClient(base, (execute, req) =>
      execute({ ...req, url: "/wrapped" }),
    );

    await client.execute(get("/original"));

    expect(capturedUrl).toBe("/wrapped");
  });

  it("wrapper can transform the response after delegation", async () => {
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
    );

    const client = wrapClient(base, (execute, req) =>
      execute(req).map((res) => ({ ...res, status: 201 })),
    );

    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(201);
    }
  });

  it("is compatible with other combinators — can be composed", async () => {
    let capturedUrl = "";

    const base = createHttpClient((req) => {
      capturedUrl = req.url;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    // wrapClient in the middle of a chain
    const wrapped = wrapClient(base, (execute, req) => execute(req));
    const client = baseUrl("https://api.example.com")(wrapped);

    await client.execute(get("/test"));

    expect(capturedUrl).toBe("https://api.example.com/test");
  });
});

// ---------------------------------------------------------------------------
// Real-world-like chain
// ---------------------------------------------------------------------------

describe("combinator composition — real-world-like chain", () => {
  it("full chain: baseUrl + defaultHeaders + bearerAuth + filterStatusOk + retry + timeout succeeds", async () => {
    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
    );

    const client = timeout(30000)(
      retry({ times: 2 })(
        filterStatusOk(
          bearerAuth("tok_abc")(
            defaultHeaders({ Accept: "application/json" })(
              baseUrl("https://api.example.com")(base),
            ),
          ),
        ),
      ),
    );

    const result = await client.execute(get("/users/1"));

    expect(result._tag).toBe("Ok");
  });

  it("full chain: all request transformations are applied in the right order", async () => {
    let capturedReq: HttpRequest | undefined;

    const base = createHttpClient((req) => {
      capturedReq = req;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = timeout(30000)(
      retry({ times: 0 })(
        filterStatusOk(
          bearerAuth("tok_xyz")(
            defaultHeaders({ "x-app-version": "1.0.0" })(
              baseUrl("https://api.example.com/v1")(base),
            ),
          ),
        ),
      ),
    );

    await client.execute(get("/orders"));

    expect(capturedReq?.url).toBe("https://api.example.com/v1/orders");
    expect(capturedReq?.headers.entries["authorization"]).toBe("Bearer tok_xyz");
    expect(capturedReq?.headers.entries["x-app-version"]).toBe("1.0.0");
  });
});
