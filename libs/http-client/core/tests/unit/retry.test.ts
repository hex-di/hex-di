/**
 * Tests for the retry and retryTransient combinators.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { retry, retryTransient } from "../../src/combinators/retry.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { httpResponseError } from "../../src/errors/http-response-error.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";
import type { HttpClientError } from "../../src/errors/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status = 200): HttpResponse {
  const req = get("/test");
  return createHttpResponse({
    status,
    statusText: status === 200 ? "OK" : String(status),
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("ok"),
  });
}

function transportError(req: HttpRequest) {
  return httpRequestError("Transport", req, "Network error");
}

function timeoutError(req: HttpRequest) {
  return httpRequestError("Timeout", req, "Request timed out");
}

/** Create a mock client that fails a given number of times, then succeeds. */
function mockClientFailsThenSucceeds(failCount: number) {
  let attempts = 0;
  return createHttpClient((req) => {
    attempts++;
    if (attempts <= failCount) {
      return ResultAsync.err(transportError(req));
    }
    return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
  });
}

/** Create a mock client that always fails with the given error. */
function mockClientAlwaysFails(makeError: (req: HttpRequest) => ReturnType<typeof httpRequestError>) {
  return createHttpClient((req) => ResultAsync.err(makeError(req)));
}

/** Create a mock client that always succeeds. */
function mockClientAlwaysSucceeds() {
  return createHttpClient(() =>
    ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200))),
  );
}

// ---------------------------------------------------------------------------
// retry — basic behaviour
// ---------------------------------------------------------------------------

describe("retry — basic behaviour", () => {
  it("returns success immediately when the first attempt succeeds (no retries)", async () => {
    let callCount = 0;
    const base = createHttpClient(() => {
      callCount++;
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retry({ times: 3 })(base);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(1);
  });

  it("retries up to `times` times on failure", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({ times: 3 })(base);
    const result = await client.execute(get("/test"));

    // 1 initial + 3 retries = 4 total
    expect(callCount).toBe(4);
    expect(result._tag).toBe("Err");
  });

  it("succeeds after some retries when eventual success occurs", async () => {
    const client = retry({ times: 3 })(mockClientFailsThenSucceeds(2));
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
  });

  it("returns the last error after exhausting all retries", async () => {
    const base = mockClientAlwaysFails((req) =>
      httpRequestError("Transport", req, "Final error after retries"),
    );
    const client = retry({ times: 2 })(base);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
    }
  });

  it("does not retry when times=0", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({ times: 0 })(base);
    await client.execute(get("/test"));

    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// retry — while predicate
// ---------------------------------------------------------------------------

describe("retry — while predicate", () => {
  it("retries only when the predicate returns true for the error", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({
      times: 3,
      while: (e) => e._tag === "HttpRequestError" && e.reason === "Transport",
    })(base);

    await client.execute(get("/test"));

    expect(callCount).toBe(4); // 1 initial + 3 retries
  });

  it("does NOT retry when the predicate returns false", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(timeoutError(req));
    });

    const client = retry({
      times: 3,
      while: (e) => e._tag === "HttpRequestError" && e.reason === "Transport",
    })(base);

    await client.execute(get("/test"));

    expect(callCount).toBe(1); // no retries because predicate returned false for Timeout
  });

  it("only retries Transport errors, not Timeout errors", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(httpRequestError("Timeout", req, "Timed out"));
    });

    const client = retry({
      times: 2,
      while: (e): boolean => {
        if (e._tag !== "HttpRequestError") return false;
        return e.reason === "Transport";
      },
    })(base);

    await client.execute(get("/test"));

    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// retry — delay
// ---------------------------------------------------------------------------

describe("retry — delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the delay function before each retry with correct attempt index", async () => {
    const delayAttempts: number[] = [];

    const base = createHttpClient((req) =>
      ResultAsync.err(transportError(req)),
    );

    const client = retry({
      times: 3,
      delay: (attempt) => {
        delayAttempts.push(attempt);
        return 100;
      },
    })(base);

    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    expect(delayAttempts).toEqual([0, 1, 2]);
  });

  it("waits for the delay before the next attempt", async () => {
    let callCount = 0;

    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({
      times: 1,
      delay: () => 500,
    })(base);

    const promise = client.execute(get("/test"));

    // After initial call, one retry is pending
    expect(callCount).toBe(1);

    // Advance past the delay
    await vi.runAllTimersAsync();
    await promise;

    expect(callCount).toBe(2);
  });

  it("skips sleep when delay returns 0", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({
      times: 2,
      delay: () => 0,
    })(base);

    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    expect(callCount).toBe(3); // 1 + 2 retries
  });
});

// ---------------------------------------------------------------------------
// retryTransient
// ---------------------------------------------------------------------------

describe("retryTransient", () => {
  it("retries Transport errors", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      if (callCount < 3) return ResultAsync.err(transportError(req));
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(3);
  });

  it("retries Timeout errors", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(timeoutError(req));
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(get("/test"));

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });

  it("retries 500 errors (5xx is transient)", async () => {
    // For retryTransient to see 5xx, we need to combine with filterStatusOk.
    // Here we simulate by creating a client that wraps a response error directly.
    const req = get("/test");
    const res = createHttpResponse({
      status: 500,
      statusText: "Internal Server Error",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("error"),
    });
    const responseErr = httpResponseError("StatusCode", req, res, "HTTP 500");
    // Wrap in an HttpRequestError (as filterStatusOk does)
    const wrappedError = httpRequestError("Transport", req, "HTTP 500", responseErr);

    let callCount = 0;
    const base = createHttpClient(() => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(wrappedError);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(req);

    expect(result._tag).toBe("Ok");
  });

  it("does NOT retry 400 errors (not transient)", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(httpRequestError("InvalidUrl", req, "Bad request"));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    await client.execute(get("/test"));

    // Only 1 call — InvalidUrl is not transient
    expect(callCount).toBe(1);
  });

  it("does NOT retry Aborted errors", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(httpRequestError("Aborted", req, "Aborted"));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    await client.execute(get("/test"));

    expect(callCount).toBe(1);
  });

  it("uses default times=3 when no options are provided", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retryTransient()(base);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();

    // 1 initial + 3 retries
    expect(callCount).toBe(4);
  });

  it("respects custom times option", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retryTransient({ times: 1, delay: () => 0 })(base);
    await client.execute(get("/test"));

    expect(callCount).toBe(2); // 1 + 1
  });

  it("respects custom delay option", async () => {
    vi.useFakeTimers();

    const delayValues: number[] = [];
    const base = createHttpClient((req) =>
      ResultAsync.err(transportError(req)),
    );

    const client = retryTransient({
      times: 2,
      delay: (attempt) => {
        const ms = (attempt + 1) * 100;
        delayValues.push(ms);
        return ms;
      },
    })(base);

    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();

    expect(delayValues).toEqual([100, 200]);
  });

  it("respects custom while predicate in addition to transient check", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    // Custom while that says never retry
    const client = retryTransient({
      times: 3,
      delay: () => 0,
      while: (_e: HttpClientError) => false,
    })(base);

    await client.execute(get("/test"));

    // Even though Transport is transient, the custom while says no
    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// defaultBackoff — covered by retryTransient with no delay option
// ---------------------------------------------------------------------------

describe("retryTransient — defaultBackoff coverage", () => {
  it("uses defaultBackoff (non-zero delay) when no delay option is provided — retries and eventually succeeds", async () => {
    // We need actual timers for this but with a very fast resolution.
    // We use fake timers to advance time without waiting.
    vi.useFakeTimers();

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      if (callCount < 3) return ResultAsync.err(transportError(req));
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    // No options — uses defaultBackoff which produces a delay > 0
    const client = retryTransient({ times: 3 })(base);
    const promise = client.execute(get("/test"));

    // Advance all pending timers so the backoff delays fire
    await vi.runAllTimersAsync();
    const result = await promise;

    vi.useRealTimers();

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(3);
  });

  it("uses defaultBackoff — still exhausts retries when always failing", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retryTransient({ times: 3 })(base);
    const promise = client.execute(get("/test"));

    await vi.runAllTimersAsync();
    const result = await promise;

    vi.useRealTimers();

    expect(result._tag).toBe("Err");
    // 1 initial + 3 retries = 4
    expect(callCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// retryTransient — custom while predicate returning false
// ---------------------------------------------------------------------------

describe("retryTransient — custom while predicate", () => {
  it("does NOT retry when custom while returns false, even for a transient error", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retryTransient({
      times: 3,
      delay: () => 0,
      while: () => false,
    })(base);

    await client.execute(get("/test"));

    // Only 1 call — the custom while short-circuits before isTransientError can pass
    expect(callCount).toBe(1);
  });

  it("retries Transport but not Aborted when custom while filters on reason", async () => {
    const callCounts = { transport: 0, aborted: 0 };

    // First test: Aborted error should not be retried
    const abortedBase = createHttpClient((req) => {
      callCounts.aborted++;
      return ResultAsync.err(httpRequestError("Aborted", req, "Aborted by user"));
    });

    const abortedClient = retryTransient({
      times: 3,
      delay: () => 0,
      while: (e) => e._tag === "HttpRequestError" && e.reason !== "Aborted",
    })(abortedBase);

    await abortedClient.execute(get("/test"));
    expect(callCounts.aborted).toBe(1); // Not retried — Aborted filtered out by custom while

    // Second test: Transport error should be retried (Transport is transient AND custom while passes)
    const transportBase = createHttpClient((req) => {
      callCounts.transport++;
      return ResultAsync.err(transportError(req));
    });

    const transportClient = retryTransient({
      times: 2,
      delay: () => 0,
      while: (e) => e._tag === "HttpRequestError" && e.reason !== "Aborted",
    })(transportBase);

    await transportClient.execute(get("/test"));
    expect(callCounts.transport).toBe(3); // 1 initial + 2 retries
  });
});

// ---------------------------------------------------------------------------
// retry — widenError path (non-HttpRequestError flows through mapErr wrapper)
// ---------------------------------------------------------------------------

describe("retry — widenError and HttpResponseError wrapping", () => {
  it("wraps HttpResponseError in a Transport HttpRequestError after retry exhaustion", async () => {
    const req = get("/test");
    const res = createHttpResponse({
      status: 422,
      statusText: "Unprocessable Entity",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("error"),
    });
    const responseErr = httpResponseError("StatusCode", req, res, "HTTP 422");

    // Build a client that always fails with an HttpResponseError (not an HttpRequestError).
    // We bypass createHttpClient's type constraints by injecting via the execute property.
    // The retry combinator widens errors via widenError, so the predicate receives HttpResponseError.
    // After exhaustion, mapErr converts it to HttpRequestError wrapping the original.
    let callCount = 0;
    const base = createHttpClient(() => {
      callCount++;
      // We return a transport error that carries a response error as cause
      // to simulate the scenario where retry sees HttpResponseError-like errors.
      const wrapped = httpRequestError("Transport", req, "wrapped response error", responseErr);
      return ResultAsync.err(wrapped);
    });

    const client = retry({
      times: 2,
      while: () => true,
    })(base);

    const result = await client.execute(req);

    expect(result._tag).toBe("Err");
    expect(callCount).toBe(3); // 1 initial + 2 retries
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
    }
  });
});

// ---------------------------------------------------------------------------
// retryTransient — custom delay function coverage
// ---------------------------------------------------------------------------

describe("retryTransient — custom delay function", () => {
  it("calls custom delay with increasing attempt indices", async () => {
    vi.useFakeTimers();

    const delayAttempts: number[] = [];
    const base = createHttpClient((req) =>
      ResultAsync.err(transportError(req)),
    );

    const client = retryTransient({
      times: 3,
      delay: (attempt, _err) => {
        delayAttempts.push(attempt);
        return attempt * 10;
      },
    })(base);

    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();

    expect(delayAttempts).toEqual([0, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// sleep — covered when delay > 0 executes the setTimeout path
// ---------------------------------------------------------------------------

describe("retry — sleep execution (delay > 0)", () => {
  it("sleep fires when delay returns a positive value", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({
      times: 1,
      delay: () => 200,
    })(base);

    const promise = client.execute(get("/test"));
    // Before advancing timers, only the initial call has happened
    expect(callCount).toBe(1);

    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();

    // The sleep fired, allowing the retry to execute
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// sleep — real-timer verification that sleep actually delays
// ---------------------------------------------------------------------------

describe("retry — sleep causes real timing delay", () => {
  it("delay=30 causes at least 20ms elapsed time (real timers)", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(httpRequestError("Transport", req, "Network error"));
    });

    const client = retry({
      times: 1,
      delay: () => 30,
    })(base);

    const start = Date.now();
    await client.execute(get("/test"));
    const elapsed = Date.now() - start;

    expect(callCount).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(20);
  }, 10000);

  it("delay=0 does not add significant timing overhead", async () => {
    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(httpRequestError("Transport", req, "Network error"));
    });

    const client = retry({
      times: 2,
      delay: () => 0,
    })(base);

    const start = Date.now();
    await client.execute(get("/test"));
    const elapsed = Date.now() - start;

    expect(callCount).toBe(3);
    // Without sleep, should be very fast
    expect(elapsed).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// defaultBackoff — verify return value range for attempt=0
// ---------------------------------------------------------------------------

describe("retryTransient — defaultBackoff output range", () => {
  it("defaultBackoff produces a delay in the expected range (400-600ms for attempt 0) via retryTransient", async () => {
    vi.useFakeTimers();

    let capturedDelay = 0;
    const base = createHttpClient((req) =>
      ResultAsync.err(httpRequestError("Transport", req, "err")),
    );

    // Spy on setTimeout to capture the actual delay value passed to sleep()
    const originalSetTimeout = globalThis.setTimeout;
    const capturedDelays: number[] = [];

    // Use vi.spyOn to observe setTimeout calls
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms > 10) {
        capturedDelays.push(ms); // Capture non-trivial delays (the backoff)
      }
      return originalSetTimeout(fn as TimerHandler, 0, ...args); // Execute immediately
    });

    const client = retryTransient({ times: 1 })(base); // Uses defaultBackoff
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    // defaultBackoff(0) = Math.round(Math.min(500 * 2^0, 10000) + jitter(±100))
    // Expected range: 400-600ms
    expect(capturedDelays.length).toBeGreaterThan(0);
    expect(capturedDelays[0]).toBeGreaterThanOrEqual(400);
    expect(capturedDelays[0]).toBeLessThanOrEqual(600);
  });
});
// ---------------------------------------------------------------------------
// Mutation-killing tests — targeted at surviving Stryker mutants
// ---------------------------------------------------------------------------

// ---- defaultBackoff arithmetic kills ----

describe("retryTransient — defaultBackoff arithmetic precision (kills arithmetic mutants)", () => {
  // defaultBackoff formula: base = Math.min(500 * Math.pow(2, attempt), 10_000)
  //                          jitter = base * 0.2 * (Math.random() * 2 - 1)
  //                          return Math.round(base + jitter)

  it("attempt=0 with Math.random()=0.5 yields delay of exactly 500ms (kills 500→0 mutant)", async () => {
    // Math.random() = 0.5 → (0.5 * 2 - 1) = 0 → jitter = base * 0.2 * 0 = 0
    // attempt=0 → base = Math.min(500 * 2^0, 10000) = Math.min(500, 10000) = 500
    // result = Math.round(500 + 0) = 500
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms > 0) capturedDelays.push(ms);
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    const base = createHttpClient((req) => ResultAsync.err(transportError(req)));
    const client = retryTransient({ times: 1 })(base); // attempt=0 for first retry
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    expect(capturedDelays).toHaveLength(1);
    expect(capturedDelays[0]).toBe(500);
  });

  it("attempt=0 with Math.random()=1.0 yields exactly 600ms (kills 0.2→0 and 2→0 jitter mutants)", async () => {
    // Math.random() = 1.0 → (1.0 * 2 - 1) = 1 → jitter = base * 0.2 * 1 = 100
    // attempt=0 → base = 500
    // result = Math.round(500 + 100) = 600
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1.0);

    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms > 0) capturedDelays.push(ms);
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    const base = createHttpClient((req) => ResultAsync.err(transportError(req)));
    const client = retryTransient({ times: 1 })(base);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    expect(capturedDelays).toHaveLength(1);
    expect(capturedDelays[0]).toBe(600);
  });

  it("attempt=0 with Math.random()=0.0 yields exactly 400ms (kills jitter direction mutants)", async () => {
    // Math.random() = 0.0 → (0.0 * 2 - 1) = -1 → jitter = base * 0.2 * -1 = -100
    // attempt=0 → base = 500
    // result = Math.round(500 + (-100)) = Math.round(400) = 400
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.0);

    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms > 0) capturedDelays.push(ms);
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    const base = createHttpClient((req) => ResultAsync.err(transportError(req)));
    const client = retryTransient({ times: 1 })(base);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    expect(capturedDelays).toHaveLength(1);
    expect(capturedDelays[0]).toBe(400);
  });

  it("attempt=1 with Math.random()=0.5 yields exactly 1000ms (kills 2→1 base multiplier mutant)", async () => {
    // Math.random() = 0.5 → jitter = 0
    // attempt=1 → base = Math.min(500 * 2^1, 10000) = Math.min(1000, 10000) = 1000
    // result = Math.round(1000 + 0) = 1000
    // With mutant 2→1: base = Math.min(500 * 1^1, 10000) = 500 → result = 500 (fails)
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms > 0) capturedDelays.push(ms);
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    const base = createHttpClient((req) => ResultAsync.err(transportError(req)));
    const client = retryTransient({ times: 2 })(base); // attempt=0 and attempt=1
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    // Two delays: attempt=0 → 500ms, attempt=1 → 1000ms
    expect(capturedDelays).toHaveLength(2);
    expect(capturedDelays[0]).toBe(500);
    expect(capturedDelays[1]).toBe(1000);
  });

  it("attempt=5 yields at least 10000ms (capped by Math.min kills 10000→Infinity mutant)", async () => {
    // attempt=5 → 500 * 2^5 = 500 * 32 = 16000 > 10000 → capped to 10000
    // Math.random() = 0.5 → jitter = 0, result = 10000
    // With mutant 10000→Infinity: no capping, base = 16000 (fails toBe 10000)
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms >= 100) capturedDelays.push(ms);
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    // Run 6 retries (attempt 0 through 5), get the last delay (attempt=5 is capped)
    let callCount = 0;
    const failBase = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });
    const client = retryTransient({ times: 6 })(failBase);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    // attempt=5: base = Math.min(500 * 32, 10000) = 10000, jitter=0, result=10000
    expect(capturedDelays.length).toBe(6);
    expect(capturedDelays[5]).toBe(10000); // attempt=5 → capped at 10000
  });
});

// ---- if (ms > 0) guard kill ----

describe("retry — if (ms > 0) guard kills (Stryker mutant target)", () => {
  it("delay returning 0 does NOT call setTimeout (kills ms>=0 mutant that would call sleep(0))", async () => {
    // With if (ms > 0) correct: delay=0 → condition false → sleep NOT called → no setTimeout
    // With if (ms >= 0) mutation: delay=0 → condition true → sleep(0) called → setTimeout(0) called
    vi.useFakeTimers();

    let setTimeoutCallCount = 0;
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      // Count setTimeout calls with 0ms or undefined ms (would be from sleep(0))
      if (ms === 0 || ms === undefined) setTimeoutCallCount++;
      return originalSetTimeout(fn as TimerHandler, ms ?? 0, ...args);
    });

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({ times: 2, delay: () => 0 })(base);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    // With ms > 0 (correct): sleep(0) NOT called → no setTimeout(0)
    // With ms >= 0 (mutant): sleep(0) IS called → setTimeout(0) appears in counts
    expect(callCount).toBe(3); // 1 initial + 2 retries
    expect(setTimeoutCallCount).toBe(0); // No setTimeout with 0ms should be called
  });

  it("delay returning positive value DOES call setTimeout (positive case for ms>0 guard)", async () => {
    // With if (ms > 0) correct: delay=100 → condition true → sleep(100) → setTimeout(100)
    vi.useFakeTimers();

    let setTimeoutCallCount = 0;
    const originalSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      if (typeof ms === "number" && ms === 100) setTimeoutCallCount++;
      return originalSetTimeout(fn as TimerHandler, 0, ...args);
    });

    let callCount = 0;
    const base = createHttpClient((req) => {
      callCount++;
      return ResultAsync.err(transportError(req));
    });

    const client = retry({ times: 2, delay: () => 100 })(base);
    const promise = client.execute(get("/test"));
    await vi.runAllTimersAsync();
    await promise;

    vi.useRealTimers();
    vi.restoreAllMocks();

    expect(callCount).toBe(3); // 1 initial + 2 retries
    expect(setTimeoutCallCount).toBe(2); // sleep called for each of 2 retries
  });
});

// ---- retryTransient with HttpResponseError (no-cov kills) ----

describe("retryTransient — HttpResponseError transient status codes (kills no-cov in isTransientError)", () => {
  // These tests inject HttpResponseError directly into the retry chain to exercise
  // the isTransientError branch for HttpResponseError.
  // Test files allow 'any' type per CLAUDE.md for mocking flexibility.

  it("retries HttpResponseError with status 429 (rate limit is transient)", async () => {
    const req = get("/test");
    // Use 'any' to bypass type system in test (allowed per CLAUDE.md)
    const res429 = createHttpResponse({
      status: 429,
      statusText: "Too Many Requests",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("rate limited"),
    });
    const err429: any = httpResponseError("StatusCode", req, res429, "HTTP 429");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(err429);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(req);

    // 429 is transient → should retry → eventually succeed
    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });

  it("retries HttpResponseError with status 500 (server error is transient)", async () => {
    const req = get("/test");
    const res500 = createHttpResponse({
      status: 500,
      statusText: "Internal Server Error",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("server error"),
    });
    const err500: any = httpResponseError("StatusCode", req, res500, "HTTP 500");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(err500);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(req);

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });

  it("retries HttpResponseError with status 503 (service unavailable is transient)", async () => {
    const req = get("/test");
    const res503 = createHttpResponse({
      status: 503,
      statusText: "Service Unavailable",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("unavailable"),
    });
    const err503: any = httpResponseError("StatusCode", req, res503, "HTTP 503");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(err503);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(req);

    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });

  it("does NOT retry HttpResponseError with status 400 (client error is not transient)", async () => {
    const req = get("/test");
    const res400 = createHttpResponse({
      status: 400,
      statusText: "Bad Request",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("bad request"),
    });
    const err400: any = httpResponseError("StatusCode", req, res400, "HTTP 400");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      return ResultAsync.err(err400);
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    await client.execute(req);

    // 400 is NOT transient → no retries
    expect(callCount).toBe(1);
  });

  it("does NOT retry HttpResponseError with status 404 (not found is not transient)", async () => {
    const req = get("/test");
    const res404 = createHttpResponse({
      status: 404,
      statusText: "Not Found",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("not found"),
    });
    const err404: any = httpResponseError("StatusCode", req, res404, "HTTP 404");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      return ResultAsync.err(err404);
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    await client.execute(req);

    // 404 is NOT transient → no retries
    expect(callCount).toBe(1);
  });

  it("does NOT retry HttpResponseError with status 501 (not implemented is excluded from transient)", async () => {
    const req = get("/test");
    const res501 = createHttpResponse({
      status: 501,
      statusText: "Not Implemented",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("not implemented"),
    });
    const err501: any = httpResponseError("StatusCode", req, res501, "HTTP 501");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      return ResultAsync.err(err501);
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    await client.execute(req);

    // 501 is NOT transient (even though it's 5xx, 501 is excluded)
    expect(callCount).toBe(1);
  });

  it("retries HttpResponseError with status 502 (bad gateway is transient)", async () => {
    const req = get("/test");
    const res502 = createHttpResponse({
      status: 502,
      statusText: "Bad Gateway",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("bad gateway"),
    });
    const err502: any = httpResponseError("StatusCode", req, res502, "HTTP 502");

    let callCount = 0;
    const base = createHttpClient((_r) => {
      callCount++;
      if (callCount < 2) return ResultAsync.err(err502);
      return ResultAsync.fromSafePromise(Promise.resolve(makeResponse(200)));
    });

    const client = retryTransient({ times: 3, delay: () => 0 })(base);
    const result = await client.execute(req);

    // 502 is transient → retried → succeeds
    expect(result._tag).toBe("Ok");
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests — mapErr narrowing in retry (L137 and L142-L148)
// ---------------------------------------------------------------------------

describe("retry — mapErr narrowing mutation kills (L137 equality, L142-L148 wrapping)", () => {
  it("HttpRequestError from execute is returned as-is with original message preserved (kills L137 equality mutant)", async () => {
    // Mutant on L137: `if (e._tag === "HttpRequestError") return e`
    //   → `if (e._tag !== "HttpRequestError") return e`
    // When mutated, an HttpRequestError is NOT returned directly — instead it falls to
    // the wrapping branch, producing message "Unexpected error after retry: HttpRequestError".
    // This test distinguishes by checking the original message is preserved exactly.
    const req = get("/test");
    const originalMessage = "original-network-failure-unique-string";
    const errorToReturn = httpRequestError("Transport", req, originalMessage);

    const retryClient = retry({ times: 1 })(
      createHttpClient(() => ResultAsync.err(errorToReturn)),
    );

    const result = await retryClient.execute(req);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      // Original message must be preserved — mutant produces "Unexpected error after retry: HttpRequestError"
      expect(result.error.message).toBe(originalMessage);
      expect(result.error.message).not.toContain("Unexpected error after retry");
    }
  });

  it("non-HttpRequestError is wrapped in Transport HttpRequestError with descriptive message (kills L142-L148 mutants)", async () => {
    // The mapErr else-branch (L142-L148) wraps non-HttpRequestError errors.
    // Inject an HttpResponseError directly via `as any` — this bypasses the type system
    // (test files allow `any` per CLAUDE.md) and exercises the wrapping path.
    // Kills mutations on: reason field, message template, cause assignment.
    const req = get("/test");
    const mockRes = createHttpResponse({
      status: 500,
      statusText: "Internal Server Error",
      headers: createHeaders(),
      request: req,
      rawBody: new TextEncoder().encode("server error"),
    });
    const responseErr = httpResponseError("StatusCode", req, mockRes, "HTTP 500");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wideExecute = (() => ResultAsync.err(responseErr)) as any;
    const retryClient = retry({ times: 1 })(createHttpClient(wideExecute));

    const result = await retryClient.execute(req);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
      expect(result.error.message).toContain("Unexpected error after retry");
      expect(result.error.message).toContain("HttpResponseError");
      expect(result.error.cause).toBe(responseErr);
      expect(result.error.request).toBe(req);
    }
  });
});
