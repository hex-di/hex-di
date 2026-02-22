import { describe, it, expectTypeOf } from "vitest";
import { mapRequest } from "../src/combinators/request.js";
import { mapResponse } from "../src/combinators/response.js";
import { baseUrl } from "../src/combinators/base-url.js";
import { bearerAuth, dynamicAuth } from "../src/combinators/auth.js";
import { defaultHeaders } from "../src/combinators/headers.js";
import { filterStatusOk, filterStatus } from "../src/combinators/status.js";
import { retry, retryTransient } from "../src/combinators/retry.js";
import { timeout } from "../src/combinators/timeout.js";
import type { HttpClient } from "../src/ports/http-client-port.js";
import type { HttpRequest } from "../src/request/http-request.js";
import type { HttpResponse } from "../src/response/http-response.js";
import type { HttpRequestError } from "../src/errors/http-request-error.js";
import { ResultAsync } from "@hex-di/result";

describe("combinator types", () => {
  it("mapRequest returns (HttpClient) => HttpClient", () => {
    const combinator = mapRequest((req: HttpRequest) => req);
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("mapResponse returns (HttpClient) => HttpClient", () => {
    const combinator = mapResponse((res: HttpResponse) => res);
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("baseUrl returns (HttpClient) => HttpClient", () => {
    const combinator = baseUrl("https://api.example.com");
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("bearerAuth returns (HttpClient) => HttpClient", () => {
    const combinator = bearerAuth("token");
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("dynamicAuth returns (HttpClient) => HttpClient", () => {
    const getToken = (_req: HttpRequest): ResultAsync<string, HttpRequestError> =>
      ResultAsync.ok("Bearer token");
    const combinator = dynamicAuth(getToken);
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("defaultHeaders returns (HttpClient) => HttpClient", () => {
    const combinator = defaultHeaders({ "x-api-key": "key" });
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("filterStatusOk is (HttpClient) => HttpClient", () => {
    expectTypeOf(filterStatusOk).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("filterStatus returns (HttpClient) => HttpClient", () => {
    const combinator = filterStatus((s) => s === 200 || s === 201);
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("retry returns (HttpClient) => HttpClient", () => {
    const combinator = retry({ times: 3 });
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("retryTransient returns (HttpClient) => HttpClient", () => {
    const combinator = retryTransient();
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });

  it("timeout returns (HttpClient) => HttpClient", () => {
    const combinator = timeout(5000);
    expectTypeOf(combinator).toMatchTypeOf<(client: HttpClient) => HttpClient>();
  });
});
