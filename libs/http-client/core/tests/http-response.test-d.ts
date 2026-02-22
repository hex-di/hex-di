import { describe, it, expectTypeOf } from "vitest";
import { createHttpResponse } from "../src/response/http-response.js";
import type { HttpResponse } from "../src/response/http-response.js";
import type { ResultAsync } from "@hex-di/result";
import type { HttpResponseError } from "../src/errors/http-response-error.js";
import { get } from "../src/request/http-request.js";
import { createHeaders } from "../src/types/headers.js";

describe("HttpResponse types", () => {
  const response = createHttpResponse({
    status: 200,
    statusText: "OK",
    headers: createHeaders(),
    request: get("https://example.com/"),
    rawBody: new TextEncoder().encode("{}"),
  });

  it("json accessor returns ResultAsync", () => {
    expectTypeOf(response.json).toMatchTypeOf<ResultAsync<unknown, HttpResponseError>>();
  });

  it("text accessor returns ResultAsync<string, HttpResponseError>", () => {
    expectTypeOf(response.text).toMatchTypeOf<ResultAsync<string, HttpResponseError>>();
  });

  it("arrayBuffer accessor returns ResultAsync<ArrayBuffer, HttpResponseError>", () => {
    expectTypeOf(response.arrayBuffer).toMatchTypeOf<ResultAsync<ArrayBuffer, HttpResponseError>>();
  });

  it("blob accessor returns ResultAsync<Blob, HttpResponseError>", () => {
    expectTypeOf(response.blob).toMatchTypeOf<ResultAsync<Blob, HttpResponseError>>();
  });

  it("stream is a ReadableStream", () => {
    expectTypeOf(response.stream).toMatchTypeOf<ReadableStream<Uint8Array>>();
  });

  it("status is a number", () => {
    expectTypeOf(response.status).toBeNumber();
  });

  it("statusText is a string", () => {
    expectTypeOf(response.statusText).toBeString();
  });
});
