/**
 * Type-level tests for HttpClientPort, HttpClient interface shape,
 * RequestOptions, RequestOptionsWithBody, and InferHttpClient utility.
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  HttpClient,
  RequestOptions,
  RequestOptionsWithBody,
  InferHttpClient,
} from "../src/ports/http-client-port.js";
import { HttpClientPort } from "../src/ports/http-client-port.js";
import type { DirectedPort } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";
import type { HttpResponse } from "../src/response/http-response.js";
import type { HttpRequest } from "../src/request/http-request.js";
import type { HttpRequestError } from "../src/errors/http-request-error.js";
import type { HttpBody } from "../src/types/body.js";
import type { UrlParamsInput } from "../src/types/url-params.js";

// ---------------------------------------------------------------------------
// HttpClientPort token
// ---------------------------------------------------------------------------

describe("HttpClientPort — port token", () => {
  it("HttpClientPort is a DirectedPort pointing to HttpClient service", () => {
    expectTypeOf(HttpClientPort).toMatchTypeOf<DirectedPort<HttpClient, string, "outbound">>();
  });

  it("HttpClientPort __portName is typed as 'HttpClient'", () => {
    expectTypeOf(HttpClientPort.__portName).toEqualTypeOf<"HttpClient">();
  });

  it("HttpClientPort is assignable to a DirectedPort with HttpClient service type", () => {
    type Port = typeof HttpClientPort;
    expectTypeOf<Port>().toMatchTypeOf<DirectedPort<HttpClient, "HttpClient", "outbound">>();
  });
});

// ---------------------------------------------------------------------------
// HttpClient interface — method shapes
// ---------------------------------------------------------------------------

describe("HttpClient — interface shape", () => {
  it("execute takes an HttpRequest and returns ResultAsync<HttpResponse, HttpRequestError>", () => {
    expectTypeOf<HttpClient["execute"]>().toEqualTypeOf<
      (request: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("get takes url and optional RequestOptions and returns ResultAsync", () => {
    expectTypeOf<HttpClient["get"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptions) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("post takes url and optional RequestOptionsWithBody and returns ResultAsync", () => {
    expectTypeOf<HttpClient["post"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptionsWithBody) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("put takes url and optional RequestOptionsWithBody and returns ResultAsync", () => {
    expectTypeOf<HttpClient["put"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptionsWithBody) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("patch takes url and optional RequestOptionsWithBody and returns ResultAsync", () => {
    expectTypeOf<HttpClient["patch"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptionsWithBody) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("del takes url and optional RequestOptions and returns ResultAsync", () => {
    expectTypeOf<HttpClient["del"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptions) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("head takes url and optional RequestOptions and returns ResultAsync", () => {
    expectTypeOf<HttpClient["head"]>().toEqualTypeOf<
      (url: string | URL, options?: RequestOptions) => ResultAsync<HttpResponse, HttpRequestError>
    >();
  });

  it("HttpClient has all six convenience methods plus execute", () => {
    type Keys = keyof HttpClient;
    expectTypeOf<Keys>().toEqualTypeOf<"execute" | "get" | "post" | "put" | "patch" | "del" | "head">();
  });
});

// ---------------------------------------------------------------------------
// RequestOptions
// ---------------------------------------------------------------------------

describe("RequestOptions — type shape", () => {
  it("allows headers as optional readonly record", () => {
    expectTypeOf<RequestOptions["headers"]>().toEqualTypeOf<
      Readonly<Record<string, string>> | undefined
    >();
  });

  it("allows signal as optional AbortSignal", () => {
    expectTypeOf<RequestOptions["signal"]>().toEqualTypeOf<AbortSignal | undefined>();
  });

  it("allows timeout as optional number", () => {
    expectTypeOf<RequestOptions["timeout"]>().toEqualTypeOf<number | undefined>();
  });

  it("allows urlParams as optional UrlParamsInput", () => {
    expectTypeOf<RequestOptions["urlParams"]>().toEqualTypeOf<UrlParamsInput | undefined>();
  });

  it("a full RequestOptions object is assignable", () => {
    const opts: RequestOptions = {
      headers: { "x-trace": "abc" },
      signal: new AbortController().signal,
      timeout: 5000,
    };
    expectTypeOf(opts).toMatchTypeOf<RequestOptions>();
  });

  it("empty object is assignable (all fields optional)", () => {
    const opts: RequestOptions = {};
    expectTypeOf(opts).toMatchTypeOf<RequestOptions>();
  });
});

// ---------------------------------------------------------------------------
// RequestOptionsWithBody
// ---------------------------------------------------------------------------

describe("RequestOptionsWithBody — type shape", () => {
  it("extends RequestOptions", () => {
    expectTypeOf<RequestOptionsWithBody>().toMatchTypeOf<RequestOptions>();
  });

  it("allows json as optional unknown", () => {
    expectTypeOf<RequestOptionsWithBody["json"]>().toEqualTypeOf<unknown | undefined>();
  });

  it("allows body as optional HttpBody", () => {
    expectTypeOf<RequestOptionsWithBody["body"]>().toEqualTypeOf<HttpBody | undefined>();
  });

  it("inherits headers from RequestOptions", () => {
    expectTypeOf<RequestOptionsWithBody["headers"]>().toEqualTypeOf<
      Readonly<Record<string, string>> | undefined
    >();
  });

  it("inherits signal from RequestOptions", () => {
    expectTypeOf<RequestOptionsWithBody["signal"]>().toEqualTypeOf<AbortSignal | undefined>();
  });

  it("empty object is assignable (all fields optional)", () => {
    const opts: RequestOptionsWithBody = {};
    expectTypeOf(opts).toMatchTypeOf<RequestOptionsWithBody>();
  });

  it("full RequestOptionsWithBody object with json is assignable", () => {
    const opts: RequestOptionsWithBody = {
      headers: { "content-type": "application/json" },
      json: { key: "value" },
    };
    expectTypeOf(opts).toMatchTypeOf<RequestOptionsWithBody>();
  });
});

// ---------------------------------------------------------------------------
// InferHttpClient
// ---------------------------------------------------------------------------

describe("InferHttpClient — type utility", () => {
  it("InferHttpClient<typeof HttpClientPort> resolves to HttpClient", () => {
    type Inferred = InferHttpClient<typeof HttpClientPort>;
    expectTypeOf<Inferred>().toEqualTypeOf<HttpClient>();
  });

  it("HttpClient is assignable to InferHttpClient<typeof HttpClientPort>", () => {
    type Inferred = InferHttpClient<typeof HttpClientPort>;
    expectTypeOf<HttpClient>().toMatchTypeOf<Inferred>();
  });

  it("InferHttpClient on a non-port type produces an InferenceError (not HttpClient)", () => {
    type Bad = InferHttpClient<string>;
    expectTypeOf<Bad>().not.toEqualTypeOf<HttpClient>();
  });

  it("InferHttpClient on a number type produces an InferenceError (not HttpClient)", () => {
    type Bad = InferHttpClient<number>;
    expectTypeOf<Bad>().not.toEqualTypeOf<HttpClient>();
  });
});
