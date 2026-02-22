/**
 * Type guards and classification functions for HTTP errors.
 * @packageDocumentation
 */

import type {
  HttpClientError,
  HttpRequestError,
  HttpResponseError,
  HttpBodyError,
} from "./index.js";

export function isHttpRequestError(value: unknown): value is HttpRequestError {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    value._tag === "HttpRequestError"
  );
}

export function isHttpResponseError(value: unknown): value is HttpResponseError {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    value._tag === "HttpResponseError"
  );
}

export function isHttpBodyError(value: unknown): value is HttpBodyError {
  return (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    value._tag === "HttpBodyError"
  );
}

export function isHttpClientError(value: unknown): value is HttpClientError {
  return isHttpRequestError(value) || isHttpResponseError(value) || isHttpBodyError(value);
}

/**
 * Check if an error is transient (worth retrying).
 * Returns true for:
 * - HttpRequestError with reason "Transport" or "Timeout"
 * - HttpResponseError with reason "StatusCode" and status 429 or 5xx (except 501, 505)
 */
export function isTransientError(error: HttpClientError): boolean {
  if (isHttpRequestError(error)) {
    return error.reason === "Transport" || error.reason === "Timeout";
  }
  if (isHttpResponseError(error) && error.reason === "StatusCode") {
    const { status } = error;
    if (status === 429) return true;
    if (status >= 500 && status <= 599 && status !== 501 && status !== 505) return true;
  }
  return false;
}

/** Check if an error is a rate limit (429). */
export function isRateLimitError(error: HttpClientError): boolean {
  return isHttpResponseError(error) && error.reason === "StatusCode" && error.status === 429;
}
