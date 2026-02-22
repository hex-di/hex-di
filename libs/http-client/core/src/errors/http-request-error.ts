/**
 * HttpRequestError - errors before a response is received.
 * @packageDocumentation
 */

import type { HttpRequest } from "../request/http-request.js";

export interface HttpRequestError {
  readonly _tag: "HttpRequestError";
  readonly reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl";
  readonly request: HttpRequest;
  readonly message: string;
  readonly cause: unknown;
}

/**
 * Construct a frozen HttpRequestError.
 * Follows populate-freeze-return sequence (ALCOA+, INV-HC-3).
 */
export function httpRequestError(
  reason: HttpRequestError["reason"],
  request: HttpRequest,
  message: string,
  cause?: unknown,
): HttpRequestError {
  return Object.freeze({
    _tag: "HttpRequestError" as const,
    reason,
    request,
    message,
    cause,
  });
}
