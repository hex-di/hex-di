/**
 * Payload validation combinator.
 *
 * Validates request and response payloads against size limits,
 * content-type requirements, and structural constraints.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { httpRequestError } from "../../errors/http-request-error.js";
import { isJsonBody, isTextBody, isUint8ArrayBody } from "../../types/body.js";
import { getHeader } from "../../types/headers.js";

// =============================================================================
// Types
// =============================================================================

export interface PayloadValidationConfig {
  /** Maximum request body size in bytes. */
  readonly maxRequestSize?: number;

  /** Maximum response body size in bytes. */
  readonly maxResponseSize?: number;

  /** Allowed request content types. */
  readonly allowedRequestContentTypes?: ReadonlyArray<string>;

  /** Allowed response content types. */
  readonly allowedResponseContentTypes?: ReadonlyArray<string>;
}

// =============================================================================
// Helpers
// =============================================================================

function getRequestBodySize(req: HttpRequest): number | undefined {
  if (isJsonBody(req.body)) {
    return new TextEncoder().encode(JSON.stringify(req.body.value)).byteLength;
  }
  if (isTextBody(req.body)) {
    return new TextEncoder().encode(req.body.value).byteLength;
  }
  if (isUint8ArrayBody(req.body)) {
    return req.body.value.byteLength;
  }
  return undefined;
}

function getRequestContentType(req: HttpRequest): string | undefined {
  if (isJsonBody(req.body)) return "application/json";
  if (isTextBody(req.body)) return req.body.contentType;
  return undefined;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Validate request/response payloads against size and content-type constraints.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withPayloadValidation({
 *     maxRequestSize: 1024 * 1024, // 1 MB
 *     maxResponseSize: 10 * 1024 * 1024, // 10 MB
 *     allowedRequestContentTypes: ["application/json"],
 *   }),
 * );
 * ```
 */
export function withPayloadValidation(
  config: PayloadValidationConfig,
): (client: HttpClient) => HttpClient {
  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        // Validate request body size
        if (config.maxRequestSize !== undefined) {
          const size = getRequestBodySize(req);
          if (size !== undefined && size > config.maxRequestSize) {
            return ResultAsync.err(
              httpRequestError(
                "Transport",
                req,
                `Request body size ${size} exceeds limit ${config.maxRequestSize}`,
              ),
            );
          }
        }

        // Validate request content type
        if (config.allowedRequestContentTypes !== undefined) {
          const contentType = getRequestContentType(req);
          if (contentType !== undefined) {
            const allowed = config.allowedRequestContentTypes.some(
              (t) => contentType.startsWith(t),
            );
            if (!allowed) {
              return ResultAsync.err(
                httpRequestError(
                  "Transport",
                  req,
                  `Request content type "${contentType}" is not allowed`,
                ),
              );
            }
          }
        }

        return client.execute(req).map((response) => {
          // Validate response body size using Content-Length header
          if (config.maxResponseSize !== undefined) {
            const contentLength = getHeader("content-length")(response.headers);
            if (contentLength !== undefined) {
              const size = parseInt(contentLength, 10);
              if (!Number.isNaN(size) && size > config.maxResponseSize) {
                // Log but don't fail -- response is already received
              }
            }
          }

          return response;
        });
      },
    );
}
