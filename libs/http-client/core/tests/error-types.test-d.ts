/**
 * Type-level tests for HTTP error type discrimination.
 * Verifies union structure, _tag literal types, and type guard narrowing.
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  HttpClientError,
  HttpRequestError,
  HttpResponseError,
  HttpBodyError,
} from "../src/errors/index.js";
import {
  isHttpRequestError,
  isHttpResponseError,
  isHttpBodyError,
  isHttpClientError,
} from "../src/errors/guards.js";

// ---------------------------------------------------------------------------
// HttpClientError union
// ---------------------------------------------------------------------------

describe("HttpClientError — union type", () => {
  it("HttpClientError is assignable from HttpRequestError", () => {
    expectTypeOf<HttpRequestError>().toMatchTypeOf<HttpClientError>();
  });

  it("HttpClientError is assignable from HttpResponseError", () => {
    expectTypeOf<HttpResponseError>().toMatchTypeOf<HttpClientError>();
  });

  it("HttpClientError is assignable from HttpBodyError", () => {
    expectTypeOf<HttpBodyError>().toMatchTypeOf<HttpClientError>();
  });

  it("HttpClientError is not narrower than the full union", () => {
    // A value of type HttpClientError could be any of the three variants
    expectTypeOf<HttpClientError>().toMatchTypeOf<
      HttpRequestError | HttpResponseError | HttpBodyError
    >();
  });
});

// ---------------------------------------------------------------------------
// _tag literal types
// ---------------------------------------------------------------------------

describe("Error _tag literal types", () => {
  it("HttpRequestError._tag is the literal 'HttpRequestError'", () => {
    expectTypeOf<HttpRequestError["_tag"]>().toEqualTypeOf<"HttpRequestError">();
  });

  it("HttpResponseError._tag is the literal 'HttpResponseError'", () => {
    expectTypeOf<HttpResponseError["_tag"]>().toEqualTypeOf<"HttpResponseError">();
  });

  it("HttpBodyError._tag is the literal 'HttpBodyError'", () => {
    expectTypeOf<HttpBodyError["_tag"]>().toEqualTypeOf<"HttpBodyError">();
  });
});

// ---------------------------------------------------------------------------
// HttpRequestError shape
// ---------------------------------------------------------------------------

describe("HttpRequestError — shape", () => {
  it("reason is a union of known string literals", () => {
    expectTypeOf<HttpRequestError["reason"]>().toEqualTypeOf<
      "Transport" | "Timeout" | "Aborted" | "InvalidUrl"
    >();
  });

  it("message is a string", () => {
    expectTypeOf<HttpRequestError["message"]>().toEqualTypeOf<string>();
  });

  it("cause is unknown", () => {
    expectTypeOf<HttpRequestError["cause"]>().toEqualTypeOf<unknown>();
  });
});

// ---------------------------------------------------------------------------
// HttpResponseError shape
// ---------------------------------------------------------------------------

describe("HttpResponseError — shape", () => {
  it("reason is a union of known string literals", () => {
    expectTypeOf<HttpResponseError["reason"]>().toEqualTypeOf<
      "StatusCode" | "Decode" | "EmptyBody" | "BodyAlreadyConsumed"
    >();
  });

  it("status is a number", () => {
    expectTypeOf<HttpResponseError["status"]>().toEqualTypeOf<number>();
  });

  it("message is a string", () => {
    expectTypeOf<HttpResponseError["message"]>().toEqualTypeOf<string>();
  });

  it("cause is unknown", () => {
    expectTypeOf<HttpResponseError["cause"]>().toEqualTypeOf<unknown>();
  });
});

// ---------------------------------------------------------------------------
// HttpBodyError shape
// ---------------------------------------------------------------------------

describe("HttpBodyError — shape", () => {
  it("reason is a union of known string literals", () => {
    expectTypeOf<HttpBodyError["reason"]>().toEqualTypeOf<"JsonSerialize" | "Encode">();
  });

  it("message is a string", () => {
    expectTypeOf<HttpBodyError["message"]>().toEqualTypeOf<string>();
  });

  it("cause is unknown", () => {
    expectTypeOf<HttpBodyError["cause"]>().toEqualTypeOf<unknown>();
  });
});

// ---------------------------------------------------------------------------
// isHttpRequestError — type narrowing
// ---------------------------------------------------------------------------

describe("isHttpRequestError — type narrowing", () => {
  it("narrows unknown to HttpRequestError in the true branch", () => {
    const val: unknown = null;
    if (isHttpRequestError(val)) {
      expectTypeOf(val).toEqualTypeOf<HttpRequestError>();
    }
  });

  it("narrows HttpClientError to HttpRequestError in the true branch", () => {
    const error: HttpClientError = {
      _tag: "HttpRequestError",
      reason: "Transport",
      message: "err",
      cause: undefined,
      request: undefined as never,
    };
    if (isHttpRequestError(error)) {
      expectTypeOf(error).toEqualTypeOf<HttpRequestError>();
    }
  });

  it("return type is boolean", () => {
    expectTypeOf(isHttpRequestError).returns.toEqualTypeOf<boolean>();
  });
});

// ---------------------------------------------------------------------------
// isHttpResponseError — type narrowing
// ---------------------------------------------------------------------------

describe("isHttpResponseError — type narrowing", () => {
  it("narrows unknown to HttpResponseError in the true branch", () => {
    const val: unknown = null;
    if (isHttpResponseError(val)) {
      expectTypeOf(val).toEqualTypeOf<HttpResponseError>();
    }
  });

  it("narrows HttpClientError to HttpResponseError in the true branch", () => {
    const error: HttpClientError = {
      _tag: "HttpResponseError",
      reason: "StatusCode",
      status: 404,
      message: "err",
      cause: undefined,
      request: undefined as never,
      response: undefined as never,
    };
    if (isHttpResponseError(error)) {
      expectTypeOf(error).toEqualTypeOf<HttpResponseError>();
    }
  });
});

// ---------------------------------------------------------------------------
// isHttpBodyError — type narrowing
// ---------------------------------------------------------------------------

describe("isHttpBodyError — type narrowing", () => {
  it("narrows unknown to HttpBodyError in the true branch", () => {
    const val: unknown = null;
    if (isHttpBodyError(val)) {
      expectTypeOf(val).toEqualTypeOf<HttpBodyError>();
    }
  });
});

// ---------------------------------------------------------------------------
// isHttpClientError — type narrowing
// ---------------------------------------------------------------------------

describe("isHttpClientError — type narrowing", () => {
  it("narrows unknown to HttpClientError in the true branch", () => {
    const val: unknown = null;
    if (isHttpClientError(val)) {
      expectTypeOf(val).toEqualTypeOf<HttpClientError>();
    }
  });

  it("return type is boolean", () => {
    expectTypeOf(isHttpClientError).returns.toEqualTypeOf<boolean>();
  });
});
