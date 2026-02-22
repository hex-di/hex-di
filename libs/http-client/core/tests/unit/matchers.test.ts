import { describe, it, expect } from "vitest";
import {
  assertOk,
  assertErr,
  assertStatus,
  assertRequestError,
  assertResponseError,
  assertMethod,
  assertUrlContains,
} from "../../src/testing/matchers.js";
import { mockResponse, mockJsonResponse } from "../../src/testing/response-factory.js";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { get, post } from "../../src/request/http-request.js";
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { HttpResponse } from "../../src/response/http-response.js";
import type { HttpRequestError } from "../../src/errors/http-request-error.js";

type HttpResult = Result<HttpResponse, HttpRequestError>;

describe("vitest matchers", () => {
  it("toRespondOk passes for 2xx responses", () => {
    const response = mockResponse(200);
    const result: HttpResult = ok(response);

    const returnedResponse = assertOk(result);
    expect(returnedResponse).toBe(response);
    expect(returnedResponse.status).toBe(200);
  });

  it("toRespondOk fails for non-2xx responses", () => {
    const request = get("https://api.example.com/fail");
    const error = httpRequestError("Transport", request, "Connection failed");
    const result: HttpResult = err(error);

    expect(() => assertOk(result)).toThrow("Expected Ok but got Err");
  });

  it("toRespondWith passes when status matches", () => {
    const response = mockResponse(201);
    const result: HttpResult = ok(response);

    const returned = assertStatus(result, 201);
    expect(returned.status).toBe(201);
  });

  it("toFailWithRequestError passes when error matches", () => {
    const request = get("https://api.example.com/data");
    const error = httpRequestError("Transport", request, "ECONNREFUSED");
    const result: HttpResult = err(error);

    const returned = assertRequestError(result, "Transport");
    expect(returned.reason).toBe("Transport");
    expect(returned.message).toBe("ECONNREFUSED");
  });

  it("toFailWithResponseError passes when response error matches", () => {
    const request = get("https://api.example.com/data");
    const error = httpRequestError("Timeout", request, "Request timed out");
    const result: HttpResult = err(error);

    const returned = assertResponseError(result);
    expect(returned._tag).toBe("HttpRequestError");
    expect(returned.reason).toBe("Timeout");
  });

  it("toHaveMethod passes when method matches", () => {
    const request = post("https://api.example.com/data");
    const response = mockResponse(200, { request });

    assertMethod(response, "POST");

    // Should throw for wrong method
    expect(() => assertMethod(response, "GET")).toThrow('Expected method "GET" but got "POST"');
  });

  it("toHaveUrl passes when URL matches", () => {
    const request = get("https://api.example.com/users/42");
    const response = mockResponse(200, { request });

    assertUrlContains(response, "/users/42");
    assertUrlContains(response, "api.example.com");

    // Should throw when URL does not contain the expected substring
    expect(() => assertUrlContains(response, "/products")).toThrow(
      'Expected URL to contain "/products"',
    );
  });
});
