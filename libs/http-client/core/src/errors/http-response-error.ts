/**
 * HttpResponseError - errors derived from the response.
 * @packageDocumentation
 */

import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";

export interface HttpResponseError {
  readonly _tag: "HttpResponseError";
  readonly reason: "StatusCode" | "Decode" | "EmptyBody" | "BodyAlreadyConsumed";
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly status: number;
  readonly message: string;
  readonly cause: unknown;
}

/**
 * Construct a frozen HttpResponseError.
 * Follows populate-freeze-return sequence (ALCOA+, INV-HC-3).
 */
export function httpResponseError(
  reason: HttpResponseError["reason"],
  request: HttpRequest,
  response: HttpResponse,
  message: string,
  cause?: unknown,
): HttpResponseError {
  return Object.freeze({
    _tag: "HttpResponseError" as const,
    reason,
    request,
    response,
    status: response.status,
    message,
    cause,
  });
}
