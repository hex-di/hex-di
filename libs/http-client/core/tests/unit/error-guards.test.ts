/**
 * Tests for HTTP error type guards and classification functions.
 */

import { describe, it, expect } from "vitest";
import {
  isHttpRequestError,
  isHttpResponseError,
  isHttpBodyError,
  isHttpClientError,
  isTransientError,
  isRateLimitError,
} from "../../src/errors/guards.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { httpResponseError } from "../../src/errors/http-response-error.js";
import { httpBodyError } from "../../src/errors/http-body-error.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url = "https://api.example.com/test") {
  return get(url);
}

function makeResponse(status = 200) {
  const req = makeRequest();
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("{}"),
  });
}

function makeRequestError(reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl" = "Transport") {
  return httpRequestError(reason, makeRequest(), `${reason} error`);
}

function makeResponseError(
  reason: "StatusCode" | "Decode" | "EmptyBody" | "BodyAlreadyConsumed" = "StatusCode",
  status = 200,
) {
  const req = makeRequest();
  const res = makeResponse(status);
  return httpResponseError(reason, req, res, `${reason} error`);
}

function makeBodyError(reason: "JsonSerialize" | "Encode" = "JsonSerialize") {
  return httpBodyError(reason, `${reason} error`);
}

// ---------------------------------------------------------------------------
// isHttpRequestError
// ---------------------------------------------------------------------------

describe("isHttpRequestError", () => {
  it("returns true for HttpRequestError", () => {
    expect(isHttpRequestError(makeRequestError())).toBe(true);
  });

  it("returns false for HttpResponseError", () => {
    expect(isHttpRequestError(makeResponseError())).toBe(false);
  });

  it("returns false for HttpBodyError", () => {
    expect(isHttpRequestError(makeBodyError())).toBe(false);
  });

  it("returns false for plain objects without _tag", () => {
    expect(isHttpRequestError({ message: "error" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isHttpRequestError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isHttpRequestError(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isHttpRequestError("HttpRequestError")).toBe(false);
  });

  it("returns false for an object with the wrong _tag", () => {
    expect(isHttpRequestError({ _tag: "SomethingElse" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isHttpResponseError
// ---------------------------------------------------------------------------

describe("isHttpResponseError", () => {
  it("returns true for HttpResponseError", () => {
    expect(isHttpResponseError(makeResponseError())).toBe(true);
  });

  it("returns false for HttpRequestError", () => {
    expect(isHttpResponseError(makeRequestError())).toBe(false);
  });

  it("returns false for HttpBodyError", () => {
    expect(isHttpResponseError(makeBodyError())).toBe(false);
  });

  it("returns false for null", () => {
    expect(isHttpResponseError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isHttpResponseError(undefined)).toBe(false);
  });

  it("returns false for object with wrong _tag", () => {
    expect(isHttpResponseError({ _tag: "HttpRequestError" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isHttpBodyError
// ---------------------------------------------------------------------------

describe("isHttpBodyError", () => {
  it("returns true for HttpBodyError", () => {
    expect(isHttpBodyError(makeBodyError())).toBe(true);
  });

  it("returns false for HttpRequestError", () => {
    expect(isHttpBodyError(makeRequestError())).toBe(false);
  });

  it("returns false for HttpResponseError", () => {
    expect(isHttpBodyError(makeResponseError())).toBe(false);
  });

  it("returns false for null", () => {
    expect(isHttpBodyError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isHttpBodyError(undefined)).toBe(false);
  });

  it("returns false for object with wrong _tag", () => {
    expect(isHttpBodyError({ _tag: "HttpResponseError" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isHttpClientError
// ---------------------------------------------------------------------------

describe("isHttpClientError", () => {
  it("returns true for HttpRequestError", () => {
    expect(isHttpClientError(makeRequestError())).toBe(true);
  });

  it("returns true for HttpResponseError", () => {
    expect(isHttpClientError(makeResponseError())).toBe(true);
  });

  it("returns true for HttpBodyError", () => {
    expect(isHttpClientError(makeBodyError())).toBe(true);
  });

  it("returns false for a generic Error", () => {
    expect(isHttpClientError(new Error("oops"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isHttpClientError(null)).toBe(false);
  });

  it("returns false for plain objects without _tag", () => {
    expect(isHttpClientError({ reason: "Transport" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTransientError
// ---------------------------------------------------------------------------

describe("isTransientError", () => {
  it("returns true for HttpRequestError with reason Transport", () => {
    expect(isTransientError(makeRequestError("Transport"))).toBe(true);
  });

  it("returns true for HttpRequestError with reason Timeout", () => {
    expect(isTransientError(makeRequestError("Timeout"))).toBe(true);
  });

  it("returns false for HttpRequestError with reason Aborted", () => {
    expect(isTransientError(makeRequestError("Aborted"))).toBe(false);
  });

  it("returns false for HttpRequestError with reason InvalidUrl", () => {
    expect(isTransientError(makeRequestError("InvalidUrl"))).toBe(false);
  });

  it("returns true for HttpResponseError StatusCode 429", () => {
    expect(isTransientError(makeResponseError("StatusCode", 429))).toBe(true);
  });

  it("returns true for HttpResponseError StatusCode 500", () => {
    expect(isTransientError(makeResponseError("StatusCode", 500))).toBe(true);
  });

  it("returns true for HttpResponseError StatusCode 502", () => {
    expect(isTransientError(makeResponseError("StatusCode", 502))).toBe(true);
  });

  it("returns true for HttpResponseError StatusCode 503", () => {
    expect(isTransientError(makeResponseError("StatusCode", 503))).toBe(true);
  });

  it("returns true for HttpResponseError StatusCode 504", () => {
    expect(isTransientError(makeResponseError("StatusCode", 504))).toBe(true);
  });

  it("returns false for HttpResponseError StatusCode 400", () => {
    expect(isTransientError(makeResponseError("StatusCode", 400))).toBe(false);
  });

  it("returns false for HttpResponseError StatusCode 401", () => {
    expect(isTransientError(makeResponseError("StatusCode", 401))).toBe(false);
  });

  it("returns false for HttpResponseError StatusCode 501", () => {
    expect(isTransientError(makeResponseError("StatusCode", 501))).toBe(false);
  });

  it("returns false for HttpResponseError StatusCode 505", () => {
    expect(isTransientError(makeResponseError("StatusCode", 505))).toBe(false);
  });

  it("returns false for HttpResponseError with reason Decode (not StatusCode)", () => {
    expect(isTransientError(makeResponseError("Decode", 500))).toBe(false);
  });

  it("returns false for HttpBodyError", () => {
    expect(isTransientError(makeBodyError())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRateLimitError
// ---------------------------------------------------------------------------

describe("isRateLimitError", () => {
  it("returns true for HttpResponseError StatusCode 429", () => {
    expect(isRateLimitError(makeResponseError("StatusCode", 429))).toBe(true);
  });

  it("returns false for HttpResponseError StatusCode 200", () => {
    expect(isRateLimitError(makeResponseError("StatusCode", 200))).toBe(false);
  });

  it("returns false for HttpResponseError StatusCode 503", () => {
    expect(isRateLimitError(makeResponseError("StatusCode", 503))).toBe(false);
  });

  it("returns false for HttpResponseError with reason Decode even if status 429", () => {
    expect(isRateLimitError(makeResponseError("Decode", 429))).toBe(false);
  });

  it("returns false for HttpRequestError", () => {
    expect(isRateLimitError(makeRequestError())).toBe(false);
  });

  it("returns false for HttpBodyError", () => {
    expect(isRateLimitError(makeBodyError())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTransientError — boundary conditions (mutation-killing)
// ---------------------------------------------------------------------------

describe("isTransientError — status boundary conditions", () => {
  it("returns false for HttpResponseError StatusCode 499 (just below 5xx)", () => {
    // Kills the `status >= 500` boundary mutant: if mutated to `status >= 499`,
    // this test would catch it.
    expect(isTransientError(makeResponseError("StatusCode", 499))).toBe(false);
  });

  it("returns false for HttpResponseError StatusCode 600 (just above 5xx)", () => {
    // Kills the `status <= 599` boundary mutant: if mutated to `status <= 600`,
    // this test would catch it.
    expect(isTransientError(makeResponseError("StatusCode", 600))).toBe(false);
  });

  it("returns true for HttpResponseError StatusCode 599 (upper boundary of 5xx range)", () => {
    // Kills the `status <= 599` → `status < 599` mutant.
    // With `< 599`, status 599 would NOT be in range, so isTransientError would return false.
    // The correct behaviour: 599 is within [500, 599], is not 501 or 505, so it IS transient.
    expect(isTransientError(makeResponseError("StatusCode", 599))).toBe(true);
  });
});
