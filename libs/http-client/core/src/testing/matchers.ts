/**
 * Custom assertion helpers for HTTP client testing.
 *
 * These are standalone assertion functions (not vitest matchers) that provide
 * concise HTTP-specific assertions. They throw descriptive errors on failure.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";

// =============================================================================
// Types
// =============================================================================

type HttpResult = Result<HttpResponse, HttpRequestError>;

// =============================================================================
// Assertion helpers
// =============================================================================

/**
 * Assert that the HTTP result is successful (Ok).
 */
export function assertOk(result: HttpResult): HttpResponse {
  if (result._tag !== "Ok") {
    throw new Error(
      `Expected Ok but got Err: ${result.error._tag} ${result.error.reason} — ${result.error.message}`,
    );
  }
  return result.value;
}

/**
 * Assert that the HTTP result is a failure (Err).
 */
export function assertErr(result: HttpResult): HttpRequestError {
  if (result._tag !== "Err") {
    throw new Error(
      `Expected Err but got Ok with status ${result.value.status}`,
    );
  }
  return result.error;
}

/**
 * Assert that the result is Ok with the given status code.
 */
export function assertStatus(result: HttpResult, expectedStatus: number): HttpResponse {
  const response = assertOk(result);
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}`,
    );
  }
  return response;
}

/**
 * Assert that the result is an error with the given reason.
 */
export function assertRequestError(
  result: HttpResult,
  expectedReason: HttpRequestError["reason"],
): HttpRequestError {
  const error = assertErr(result);
  if (error._tag !== "HttpRequestError") {
    throw new Error(
      `Expected HttpRequestError but got ${error._tag}`,
    );
  }
  if (error.reason !== expectedReason) {
    throw new Error(
      `Expected error reason "${expectedReason}" but got "${error.reason}"`,
    );
  }
  return error;
}

/**
 * Assert that the result is an error with HttpResponseError tag.
 */
export function assertResponseError(
  result: HttpResult,
): HttpRequestError {
  const error = assertErr(result);
  // HttpResponseError flows through the system as-is
  return error;
}

/**
 * Assert that the request has the expected HTTP method.
 */
export function assertMethod(
  response: HttpResponse,
  expectedMethod: string,
): void {
  if (response.request.method !== expectedMethod) {
    throw new Error(
      `Expected method "${expectedMethod}" but got "${response.request.method}"`,
    );
  }
}

/**
 * Assert that the request URL contains the expected substring.
 */
export function assertUrlContains(
  response: HttpResponse,
  expectedSubstring: string,
): void {
  if (!response.request.url.includes(expectedSubstring)) {
    throw new Error(
      `Expected URL to contain "${expectedSubstring}" but got "${response.request.url}"`,
    );
  }
}
