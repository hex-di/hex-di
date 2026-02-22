/**
 * Credential protection combinator.
 *
 * Prevents accidental credential leakage by stripping sensitive headers
 * on cross-origin redirects and ensuring credentials are only sent to
 * trusted origins.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import { removeRequestHeader } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { httpRequestError } from "../../errors/http-request-error.js";
import { headersToRecord } from "../../types/headers.js";

// =============================================================================
// Types
// =============================================================================

export interface CredentialProtectionConfig {
  /** Origins that are trusted to receive credentials. */
  readonly trustedOrigins: ReadonlyArray<string>;

  /** Headers considered sensitive. Default: Authorization, Cookie, X-API-Key. */
  readonly sensitiveHeaders?: ReadonlyArray<string>;

  /** Block requests with credentials to untrusted origins. Default: true. */
  readonly blockUntrusted?: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

const DEFAULT_SENSITIVE_HEADERS = ["authorization", "cookie", "x-api-key"];

/**
 * Prevent credential leakage by enforcing origin-based access control.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withCredentialProtection({
 *     trustedOrigins: ["https://api.example.com"],
 *   }),
 * );
 * ```
 */
export function withCredentialProtection(
  config: CredentialProtectionConfig,
): (client: HttpClient) => HttpClient {
  const trustedOrigins = new Set(config.trustedOrigins.map((o) => o.toLowerCase()));
  const sensitiveHeadersList = (config.sensitiveHeaders ?? DEFAULT_SENSITIVE_HEADERS).map(
    (h) => h.toLowerCase(),
  );
  const sensitiveHeaders = new Set(sensitiveHeadersList);
  const blockUntrusted = config.blockUntrusted !== false;

  function getOrigin(url: string): string | undefined {
    try {
      return new URL(url).origin.toLowerCase();
    } catch {
      return undefined;
    }
  }

  function hasSensitiveHeaders(headers: HttpRequest["headers"]): boolean {
    const record = headersToRecord(headers);
    return Object.keys(record).some((key) => sensitiveHeaders.has(key.toLowerCase()));
  }

  function stripSensitiveHeaders(req: HttpRequest): HttpRequest {
    let result = req;
    for (const headerKey of sensitiveHeadersList) {
      result = removeRequestHeader(headerKey)(result);
    }
    return result;
  }

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        const origin = getOrigin(req.url);

        if (origin === undefined) {
          return client.execute(req);
        }

        if (trustedOrigins.has(origin)) {
          return client.execute(req);
        }

        // Check if request has sensitive headers going to untrusted origin
        if (hasSensitiveHeaders(req.headers)) {
          if (blockUntrusted) {
            return ResultAsync.err(
              httpRequestError(
                "Transport",
                req,
                `Credential protection: blocked sensitive headers to untrusted origin ${origin}`,
              ),
            );
          }

          // Strip sensitive headers instead of blocking
          const cleanedReq = stripSensitiveHeaders(req);
          return client.execute(cleanedReq);
        }

        return client.execute(req);
      },
    );
}
