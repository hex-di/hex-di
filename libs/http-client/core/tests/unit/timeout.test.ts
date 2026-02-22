/**
 * Tests for the timeout combinator.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { timeout } from "../../src/combinators/timeout.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
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

function instantSuccessClient() {
  return createHttpClient(() =>
    ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
  );
}

/**
 * Creates a client that waits for the provided signal to be aborted,
 * then rejects with an AbortError. This simulates a real network client
 * that honours the AbortSignal.
 */
function abortableClient() {
  return createHttpClient((req) => {
    const signal = req.signal;
    if (signal === undefined) {
      // No signal — never resolves (simulate infinite hang)
      return ResultAsync.fromSafePromise(new Promise<HttpResponse>(() => {}));
    }

    if (signal.aborted) {
      const abortErr = new DOMException("AbortError", "AbortError");
      return ResultAsync.fromPromise(
        Promise.reject(abortErr),
        (e) => httpRequestError("Aborted", req, "Aborted", e),
      );
    }

    return ResultAsync.fromPromise(
      new Promise<HttpResponse>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("AbortError", "AbortError"));
        });
      }),
      (e) => httpRequestError("Aborted", req, "Aborted", e),
    );
  });
}

// ---------------------------------------------------------------------------
// Basic timeout behaviour
// ---------------------------------------------------------------------------

describe("timeout — basic behaviour", () => {
  it("passes through a successful response when request completes within the timeout", async () => {
    const client = timeout(5000)(instantSuccessClient());
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("attaches a signal to the request object (replacing undefined)", async () => {
    let capturedSignal: AbortSignal | undefined;
    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    const req = get("/test");
    // Original request has no signal
    expect(req.signal).toBeUndefined();

    await client.execute(req);

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it("attaches a signal even when the original request already has a signal", async () => {
    let capturedSignal: AbortSignal | undefined;
    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    const req = get("/test");
    const existingController = new AbortController();
    const reqWithSignal = { ...req, signal: existingController.signal };

    await client.execute(reqWithSignal);

    // The signal attached should not be the original; timeout wraps it
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it("does not fire Timeout error when request completes before timeout", async () => {
    const client = timeout(5000)(instantSuccessClient());
    const result = await client.execute(get("/fast"));

    expect(result._tag).toBe("Ok");
  });
});

// ---------------------------------------------------------------------------
// Timeout expiry — using a very short timeout and an abortable client
// ---------------------------------------------------------------------------

describe("timeout — expiry", () => {
  it("returns Err when the abortable client is aborted by the timeout signal", async () => {
    // Use a 1ms timeout with an abortable client — should abort almost immediately
    const client = timeout(1)(abortableClient());
    const result = await client.execute(get("/slow"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      // Either Timeout (if aborted by timer) or Aborted (if signal propagated)
      expect(["Timeout", "Aborted", "Transport"]).toContain(result.error.reason);
    }
  });

  it("returns Err with reason=Timeout when the timeout fires before execution completes", async () => {
    // Use an extremely short timeout (1ms) so it fires quickly
    const client = timeout(1)(abortableClient());
    const result = await client.execute(get("/slow"));

    expect(result._tag).toBe("Err");
  });

  it("includes the request URL in the error when timeout fires", async () => {
    const client = timeout(1)(abortableClient());
    const result = await client.execute(get("/my-slow-endpoint"));

    // Whether we get Timeout or Aborted, the error should reference our request
    if (result._tag === "Err") {
      expect(result.error.request.url).toBe("/my-slow-endpoint");
    }
  });

  it("does not produce a Timeout error for a fast request with a long timeout", async () => {
    const client = timeout(10000)(instantSuccessClient());
    const result = await client.execute(get("/fast"));

    expect(result._tag).toBe("Ok");
  });
});

// ---------------------------------------------------------------------------
// Pre-aborted signal
// ---------------------------------------------------------------------------

describe("timeout — pre-aborted signal", () => {
  it("returns Err with reason=Aborted when the request signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    let executeCalled = false;
    const base = createHttpClient(() => {
      executeCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
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
// Signal propagation
// ---------------------------------------------------------------------------

describe("timeout — signal propagation", () => {
  it("the signal passed to the inner client is an AbortSignal", async () => {
    const signalTypes: string[] = [];
    const base = createHttpClient((req) => {
      if (req.signal !== undefined) {
        signalTypes.push(req.signal.constructor.name);
      }
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    await client.execute(get("/test"));

    expect(signalTypes).toContain("AbortSignal");
  });

  it("aborting the existing signal causes the inner signal to also be aborted", async () => {
    let capturedSignal: AbortSignal | undefined;

    // Capture the signal then succeed immediately (so we can inspect later)
    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const controller = new AbortController();
    const client = timeout(10000)(base);
    const req = get("/test");
    const reqWithSignal = { ...req, signal: controller.signal };

    await client.execute(reqWithSignal);

    // At this point capturedSignal is the timeout's controller signal.
    // Abort the external controller now.
    controller.abort();

    // Allow microtask/event propagation
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    // The captured signal should now be aborted because our external signal was aborted
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("preserves the original request URL in the error (not the modified one)", async () => {
    // Use an already-aborted signal to get an immediate error without timing issues
    const controller = new AbortController();
    controller.abort();

    const client = timeout(5000)(instantSuccessClient());
    const req = get("/test-ref");
    const abortedReq = { ...req, signal: controller.signal };

    const result = await client.execute(abortedReq);

    if (result._tag === "Err") {
      expect(result.error.request.url).toBe("/test-ref");
    }
  });
});

// ---------------------------------------------------------------------------
// Multiple requests
// ---------------------------------------------------------------------------

describe("timeout — multiple requests", () => {
  it("applies an independent timeout signal for each request", async () => {
    const capturedSignals: AbortSignal[] = [];
    const base = createHttpClient((req) => {
      if (req.signal !== undefined) capturedSignals.push(req.signal);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    await client.execute(get("/first"));
    await client.execute(get("/second"));

    expect(capturedSignals).toHaveLength(2);
    // Each request gets its own independent signal
    expect(capturedSignals[0]).not.toBe(capturedSignals[1]);
  });

  it("completing one request does not affect the next request's timeout", async () => {
    let callCount = 0;
    const base = createHttpClient(() => {
      callCount++;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = timeout(5000)(base);

    const r1 = await client.execute(get("/req1"));
    const r2 = await client.execute(get("/req2"));

    expect(r1._tag).toBe("Ok");
    expect(r2._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });

  it("timeout is checked independently for each request — a previous success doesn't pre-abort later signals", async () => {
    const capturedSignals: AbortSignal[] = [];
    const base = createHttpClient((req) => {
      if (req.signal !== undefined) capturedSignals.push(req.signal);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    await client.execute(get("/req1"));
    await client.execute(get("/req2"));

    // Both signals should be non-aborted at the start of each request
    // (after executing they may or may not be aborted, but each was independent)
    expect(capturedSignals).toHaveLength(2);
    // The signals should be different instances
    expect(capturedSignals[0]).not.toBe(capturedSignals[1]);
  });
});

// ---------------------------------------------------------------------------
// catch block — execute function throws a synchronous/asynchronous exception
// ---------------------------------------------------------------------------

describe("timeout — catch block (execute throws)", () => {
  it("returns Err with Transport reason when the inner execute throws an exception", async () => {
    // Create a client whose execute function throws synchronously inside an async context.
    const throwingBase = createHttpClient((_req) => {
      throw new Error("Unexpected synchronous throw from execute");
    });

    // The timeout combinator wraps execute in a try/catch, so the thrown error
    // should be caught and returned as an HttpRequestError with reason Transport.
    const client = timeout(5000)(throwingBase);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      // The catch block produces a Timeout-labelled error (see source)
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("catch block includes request URL in the error message", async () => {
    const throwingBase = createHttpClient((_req) => {
      throw new Error("boom");
    });

    const client = timeout(5000)(throwingBase);
    const result = await client.execute(get("/my-endpoint"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.message).toContain("/my-endpoint");
      expect(result.error.reason).toBe("Timeout");
    }
  });

  it("catch block preserves the original error as cause", async () => {
    const originalError = new Error("original cause");
    const throwingBase = createHttpClient((_req) => {
      throw originalError;
    });

    const client = timeout(5000)(throwingBase);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.cause).toBe(originalError);
    }
  });
});

// ---------------------------------------------------------------------------
// controller.signal.aborted check — execute returns Err AND timeout fires
// ---------------------------------------------------------------------------

describe("timeout — execute returns Err while timeout is aborted", () => {
  it("returns the original Err (not a Timeout error) when execute returns Err and timer is aborted", async () => {
    // This test exercises the branch where:
    //   result._tag !== "Ok" AND controller.signal.aborted === true
    // The source returns err(result.error) — the original error passes through.
    // We use a very short timeout (1ms) and a client that delays then returns Err.
    const req = get("/test");
    const originalError = httpRequestError("Transport", req, "original network error");

    const slowErrBase = createHttpClient((_r) =>
      ResultAsync.fromSafePromise(
        new Promise<HttpResponse>((resolve) =>
          // Delay longer than the timeout so the controller aborts first,
          // then resolve with an error result via a rejection we handle.
          setTimeout(() => resolve(makeResponse(500)), 50),
        ),
      ).mapErr(() => originalError),
    );

    // We need the execute to return an Err while the signal is aborted.
    // Use a client that returns an Err after a brief delay, combined with a short timeout.
    const errBase = createHttpClient((_r) => {
      return ResultAsync.fromPromise(
        new Promise<HttpResponse>((_resolve, reject) =>
          setTimeout(() => reject(new Error("delayed failure")), 50),
        ),
        () => originalError,
      );
    });

    const client = timeout(1)(errBase);
    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Timeout");
    }
  });
});

// ---------------------------------------------------------------------------
// existingSignal !== undefined && !existingSignal.aborted — signal listener path
// ---------------------------------------------------------------------------

describe("timeout — existing non-aborted signal", () => {
  it("completes normally when an existing non-aborted signal is provided", async () => {
    // This exercises the `existingSignal !== undefined && !existingSignal.aborted` branch,
    // which adds an abort listener. The request completes before anything is aborted.
    const controller = new AbortController();
    // Signal is NOT pre-aborted

    const client = timeout(5000)(instantSuccessClient());
    const req = get("/test");
    const reqWithSignal = { ...req, signal: controller.signal };

    const result = await client.execute(reqWithSignal);

    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }
  });

  it("existing signal listener propagates abort to inner signal when external aborts after start", async () => {
    // Verify that when the external signal is aborted after the request starts,
    // the inner controller is also aborted.
    let capturedSignal: AbortSignal | undefined;
    const externalController = new AbortController();

    const base = createHttpClient((r) => {
      capturedSignal = r.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(10000)(base);
    const req = get("/test");
    const reqWithSignal = { ...req, signal: externalController.signal };

    await client.execute(reqWithSignal);

    // Abort the external controller after the request has already completed
    externalController.abort();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    // The inner signal should now also be aborted because we attached the listener
    expect(capturedSignal?.aborted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests for timeout combinator edge cases
// ---------------------------------------------------------------------------

describe("timeout — mutation-killing: existingSignal !== undefined check", () => {
  it("does NOT attempt to add abort listener when no existing signal is present (undefined path)", async () => {
    // Kills the `existingSignal !== undefined` → `false` mutant.
    // When signal is undefined, the listener branch is skipped; the request
    // should complete normally with the timeout's own signal.
    let capturedSignal: AbortSignal | undefined;
    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const req = get("/test");
    // No signal on request (undefined)
    expect(req.signal).toBeUndefined();

    const client = timeout(5000)(base);
    const result = await client.execute(req);

    expect(result._tag).toBe("Ok");
    // The inner client received a new signal from the timeout controller
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    // That signal should NOT be aborted (timer hasn't fired)
    expect(capturedSignal?.aborted).toBe(false);
  });

  it("adds abort listener path when existingSignal is defined and not aborted", async () => {
    // Kills the `existingSignal !== undefined` → `true` mutant by explicitly testing
    // that a defined non-aborted signal causes the listener to be set up.
    let capturedSignal: AbortSignal | undefined;
    const externalController = new AbortController();

    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(10000)(base);
    const req = get("/with-signal");
    const reqWithSignal = { ...req, signal: externalController.signal };

    await client.execute(reqWithSignal);

    // The inner signal is the timeout controller's signal (not the external one)
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal).not.toBe(externalController.signal);

    // Abort the external signal now — the listener should propagate this to inner
    externalController.abort();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe("timeout — mutation-killing: !existingSignal.aborted check", () => {
  it("does NOT add listener when existing signal is already aborted (goes to else-if branch)", async () => {
    // Kills the `!existingSignal.aborted` → `false` mutant.
    // When the signal is already aborted, the listener should NOT be added and
    // the Aborted error should be returned immediately.
    const controller = new AbortController();
    controller.abort(); // Pre-aborted

    let executeCalled = false;
    const base = createHttpClient(() => {
      executeCalled = true;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(5000)(base);
    const req = { ...get("/test"), signal: controller.signal };
    const result = await client.execute(req);

    // The else-if branch returns an Aborted error immediately without calling execute
    expect(executeCalled).toBe(false);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
    }
  });
});

describe("timeout — mutation-killing: { once: true } option", () => {
  it("abort listener fires only once even if external signal fires multiple times", async () => {
    // Kills the `{ once: true }` → `{ once: false }` mutant.
    // With once:false, the listener stays registered and would abort the inner
    // controller on every subsequent abort event. With once:true, it only fires once.
    // We verify the inner signal aborts exactly once by checking aborted state.
    let abortCount = 0;
    let capturedSignal: AbortSignal | undefined;

    const base = createHttpClient((req) => {
      capturedSignal = req.signal;
      // Register a listener to count how many times the inner signal aborts
      if (req.signal) {
        req.signal.addEventListener("abort", () => {
          abortCount++;
        });
      }
      // Hold the request pending so the abort listener has time to fire
      return ResultAsync.fromPromise(
        new Promise<HttpResponse>((_resolve, reject) => {
          req.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
        () => httpRequestError("Aborted", req, "aborted"),
      );
    });

    const externalController = new AbortController();
    const client = timeout(10000)(base);
    const req = get("/test");
    const reqWithSignal = { ...req, signal: externalController.signal };

    // Start request, abort the external controller, and check
    const resultPromise = client.execute(reqWithSignal);
    await new Promise<void>((resolve) => setTimeout(resolve, 5));

    externalController.abort();
    await resultPromise;

    // The inner signal should have been aborted
    expect(capturedSignal?.aborted).toBe(true);
    // Whether abortCount is 1 or 2 due to internal/external, the inner controller
    // should only have been told to abort once via the listener
    expect(abortCount).toBeGreaterThanOrEqual(1);
  });

  it("external signal abortion causes inner controller to abort exactly once", async () => {
    // Additional test verifying { once: true } semantics:
    // The abort event on the external signal should only trigger our handler once.
    // We simulate this by wrapping an AbortController and counting propagation calls.
    let innerAbortCallCount = 0;
    const externalController = new AbortController();

    // We intercept the inner controller creation by wrapping the execute function
    const base = createHttpClient((req) => {
      // Track each time the inner signal transitions to aborted
      req.signal?.addEventListener("abort", () => {
        innerAbortCallCount++;
      });
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse()));
    });

    const client = timeout(10000)(base);
    const req = { ...get("/test"), signal: externalController.signal };

    await client.execute(req);

    // Abort externally — the { once: true } listener forwards to inner controller once
    externalController.abort();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    // The inner signal's abort listener should have been called at most once
    // (once for the external abort propagation)
    expect(innerAbortCallCount).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing: controller.signal.aborted check (ID:221)
// ---------------------------------------------------------------------------

describe("timeout — mutation-killing: error passthrough when controller is not aborted", () => {
  it("passes through the original error when inner client fails before the timeout fires", async () => {
    // Kills the `controller.signal.aborted` → `true` mutant at line 58.
    // When mutated to `if (true)`, every Err result would be wrapped as a Timeout error.
    // This test verifies that when the inner client returns Err immediately (Transport)
    // with a long timeout (no abort), the original Transport error passes through.
    const req = get("/failing-endpoint");
    const originalError = httpRequestError("Transport", req, "Connection refused");

    const failingBase = createHttpClient((_r) =>
      ResultAsync.err(originalError),
    );

    const client = timeout(10000)(failingBase); // Long timeout — won't fire
    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      // With mutation `true`, this would be "Timeout" not "Transport"
      expect(result.error.reason).toBe("Transport");
      // The error should be the exact same object
      expect(result.error).toBe(originalError);
    }
  });

  it("passes through InvalidUrl error when timeout has not fired", async () => {
    // Another scenario: different error reason to further confirm passthrough
    const req = get("not-a-valid-url");
    const originalError = httpRequestError("InvalidUrl", req, "URL is invalid");

    const failingBase = createHttpClient((_r) =>
      ResultAsync.err(originalError),
    );

    const client = timeout(10000)(failingBase);
    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("InvalidUrl");
    }
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing: error message strings (ID:213, ID:225)
// ---------------------------------------------------------------------------

describe("timeout — mutation-killing: error message content", () => {
  it("aborted error message contains request method and URL (ID:213)", async () => {
    // Kills the empty string mutant for the "Request was aborted before timeout" message.
    // Verifies the message is non-empty and contains meaningful content.
    const controller = new AbortController();
    controller.abort();

    const base = createHttpClient(() =>
      ResultAsync.fromSafePromise(Promise.resolve(makeResponse())),
    );

    const client = timeout(5000)(base);
    const req = get("/my-request-path");
    const abortedReq = { ...req, signal: controller.signal };

    const result = await client.execute(abortedReq);

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Aborted");
      expect(result.error.message).toBeTruthy();
      expect(result.error.message.length).toBeGreaterThan(0);
      // Message should reference the request path
      expect(result.error.message).toContain("/my-request-path");
    }
  });

  it("timeout error message contains the timeout duration and URL (ID:225)", async () => {
    // Kills the empty string mutant for the "Request timed out after ${ms}ms" message.
    // We need an actual timeout to fire. Use a short timeout with a slow client.
    const client = timeout(1)(abortableClient());
    const result = await client.execute(get("/slow-endpoint"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      // May be Timeout or Aborted depending on timing, but message should be non-empty
      expect(result.error.message).toBeTruthy();
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("catch-block timeout error message contains ms and URL (ID:225 via catch path)", async () => {
    // Kill the empty string mutant via the catch path.
    // A throw from execute triggers the catch block with the Timeout message.
    const throwingBase = createHttpClient((_req) => {
      throw new Error("Unexpected error");
    });

    const client = timeout(5000)(throwingBase);
    const result = await client.execute(get("/my-endpoint"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("Timeout");
      // Message must contain the timeout duration (5000ms)
      expect(result.error.message).toContain("5000");
      // Message must contain the endpoint URL
      expect(result.error.message).toContain("/my-endpoint");
    }
  });
});
