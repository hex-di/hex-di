/**
 * Type-level tests for HttpRequest constructors and combinators.
 * Verifies that builder functions return the correct types and that the
 * HttpRequest brand prevents plain objects from being passed as requests.
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  get,
  post,
  put,
  patch,
  del,
  head,
  options,
  request,
  bodyJson,
  bodyText,
  bodyUint8Array,
  withSignal,
  withTimeout,
  setRequestHeader,
  setRequestHeaders,
  appendRequestHeader,
  removeRequestHeader,
  bearerToken,
  basicAuth,
  acceptJson,
  accept,
  contentType,
  prependUrl,
  appendUrl,
  setUrlParam,
  setUrlParams,
  appendUrlParams,
  requestMethodAndUrl,
} from "../src/request/http-request.js";
import type { HttpRequest } from "../src/request/http-request.js";
import type { Result } from "@hex-di/result";
import type { HttpBodyError } from "../src/errors/http-body-error.js";

// ---------------------------------------------------------------------------
// Constructor return types
// ---------------------------------------------------------------------------

describe("HttpRequest constructors — return types", () => {
  it("get(url) returns HttpRequest", () => {
    expectTypeOf(get("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("post(url) returns HttpRequest", () => {
    expectTypeOf(post("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("put(url) returns HttpRequest", () => {
    expectTypeOf(put("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("patch(url) returns HttpRequest", () => {
    expectTypeOf(patch("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("del(url) returns HttpRequest", () => {
    expectTypeOf(del("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("head(url) returns HttpRequest", () => {
    expectTypeOf(head("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("options(url) returns HttpRequest", () => {
    expectTypeOf(options("https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("request(method, url) returns HttpRequest", () => {
    expectTypeOf(request("GET", "https://example.com")).toEqualTypeOf<HttpRequest>();
  });

  it("accepts URL object as well as string", () => {
    const url = new URL("https://example.com/users");
    expectTypeOf(get(url)).toEqualTypeOf<HttpRequest>();
  });
});

// ---------------------------------------------------------------------------
// Body combinators
// ---------------------------------------------------------------------------

describe("bodyJson — return type", () => {
  it("bodyJson(value) returns a function from HttpRequest to Result<HttpRequest, HttpBodyError>", () => {
    expectTypeOf(bodyJson({ id: 1 })).toEqualTypeOf<
      (req: HttpRequest) => Result<HttpRequest, HttpBodyError>
    >();
  });

  it("the inner Result is parameterized as HttpRequest on success", () => {
    const combinator = bodyJson({ x: 1 });
    const req = get("https://example.com");
    const result = combinator(req);
    expectTypeOf(result).toEqualTypeOf<Result<HttpRequest, HttpBodyError>>();
  });

  it("bodyJson supports arbitrary unknown values", () => {
    const value: unknown = { arbitrary: true };
    expectTypeOf(bodyJson(value)).toEqualTypeOf<
      (req: HttpRequest) => Result<HttpRequest, HttpBodyError>
    >();
  });
});

describe("bodyText — return type", () => {
  it("bodyText(text) returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(bodyText("hello")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("bodyText(text, contentType) returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(bodyText("hello", "text/plain")).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });
});

describe("bodyUint8Array — return type", () => {
  it("bodyUint8Array(data) returns a function from HttpRequest to HttpRequest", () => {
    const data = new Uint8Array([1, 2, 3]);
    expectTypeOf(bodyUint8Array(data)).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });
});

// ---------------------------------------------------------------------------
// Signal and timeout combinators
// ---------------------------------------------------------------------------

describe("withSignal / withTimeout — return types", () => {
  it("withSignal(signal) returns a function from HttpRequest to HttpRequest", () => {
    const signal = new AbortController().signal;
    expectTypeOf(withSignal(signal)).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("withTimeout(ms) returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(withTimeout(5000)).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });
});

// ---------------------------------------------------------------------------
// Header combinators
// ---------------------------------------------------------------------------

describe("Header combinators — return types", () => {
  it("setRequestHeader returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(setRequestHeader("x-key", "val")).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });

  it("setRequestHeaders returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(setRequestHeaders({ "x-a": "1", "x-b": "2" })).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });

  it("appendRequestHeader returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(appendRequestHeader("accept", "text/html")).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });

  it("removeRequestHeader returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(removeRequestHeader("x-old-header")).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });

  it("bearerToken returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(bearerToken("my-token")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("basicAuth returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(basicAuth("user", "pass")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("acceptJson takes an HttpRequest and returns HttpRequest", () => {
    expectTypeOf(acceptJson).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("accept returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(accept("application/json")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("contentType returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(contentType("text/plain")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });
});

// ---------------------------------------------------------------------------
// URL combinators
// ---------------------------------------------------------------------------

describe("URL combinators — return types", () => {
  it("prependUrl returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(prependUrl("https://api.example.com")).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });

  it("appendUrl returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(appendUrl("/v2")).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("setUrlParam returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(setUrlParam("page", 1)).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("setUrlParams returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(setUrlParams({ page: "1" })).toEqualTypeOf<(req: HttpRequest) => HttpRequest>();
  });

  it("appendUrlParams returns a function from HttpRequest to HttpRequest", () => {
    expectTypeOf(appendUrlParams({ filter: "active" })).toEqualTypeOf<
      (req: HttpRequest) => HttpRequest
    >();
  });
});

// ---------------------------------------------------------------------------
// requestMethodAndUrl utility
// ---------------------------------------------------------------------------

describe("requestMethodAndUrl — return type", () => {
  it("returns a string", () => {
    expectTypeOf(requestMethodAndUrl(get("https://example.com"))).toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------
// Branding — HttpRequest is not assignable from plain objects
// ---------------------------------------------------------------------------

describe("HttpRequest branding", () => {
  it("a plain object is not assignable as HttpRequest", () => {
    // @ts-expect-error — plain objects are not branded as HttpRequest
    const _req: HttpRequest = { method: "GET", url: "/test" };
    void _req;
  });

  it("HttpRequest is assignable to itself", () => {
    const req = get("https://example.com");
    expectTypeOf(req).toEqualTypeOf<HttpRequest>();
  });
});
