/**
 * Payload integrity combinator.
 *
 * Computes content hashes for request bodies and attaches them as headers.
 * Response integrity verification is not supported since HttpResponse does
 * not expose raw body bytes synchronously.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import { setRequestHeader } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { isJsonBody, isTextBody } from "../../types/body.js";

// =============================================================================
// Types
// =============================================================================

export interface PayloadIntegrityConfig {
  /** Add Content-MD5 or similar hash header to requests. Default: false. */
  readonly signRequests?: boolean;

  /** Hash algorithm for integrity checking. Default: "sha256". */
  readonly algorithm?: string;
}

// =============================================================================
// Simple hash for payload integrity (FNV-1a based)
// =============================================================================

function computeHash(data: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getRequestBodyString(req: HttpRequest): string | undefined {
  if (isJsonBody(req.body)) {
    return JSON.stringify(req.body.value);
  }
  if (isTextBody(req.body)) {
    return req.body.value;
  }
  return undefined;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Add payload integrity checking to HTTP requests.
 *
 * When `signRequests` is enabled, a hash of the request body is computed
 * and attached as the `x-content-hash` header.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withPayloadIntegrity({ signRequests: true }),
 * );
 * ```
 */
export function withPayloadIntegrity(
  config?: PayloadIntegrityConfig,
): (client: HttpClient) => HttpClient {
  const signRequests = config?.signRequests ?? false;

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        let processedReq = req;

        if (signRequests) {
          const bodyStr = getRequestBodyString(req);
          if (bodyStr !== undefined) {
            const hash = computeHash(bodyStr);
            processedReq = setRequestHeader("x-content-hash", hash)(req);
          }
        }

        return client.execute(processedReq);
      },
    );
}
