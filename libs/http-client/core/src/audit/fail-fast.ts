/**
 * Fail-fast audit mode.
 *
 * When enabled, audit failures (hash chain corruption, sink write failures)
 * cause the HTTP client to reject all subsequent requests.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { httpRequestError } from "../errors/http-request-error.js";
import type { AuditBridge } from "./bridge.js";
import { verifyChain } from "./integrity.js";

// =============================================================================
// Types
// =============================================================================

export interface FailFastConfig {
  /** The audit bridge to monitor. */
  readonly bridge: AuditBridge;

  /** Verify chain integrity every N entries. Default: 10. */
  readonly verifyInterval?: number;

  /** Called when the audit chain fails verification. */
  readonly onFailure?: (error: string) => void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a fail-fast audit combinator.
 *
 * Periodically verifies the audit chain integrity. If verification fails,
 * all subsequent requests are rejected.
 *
 * @example
 * ```typescript
 * const bridge = createAuditBridge();
 * const client = pipe(
 *   baseClient,
 *   createFailFastAudit({ bridge, verifyInterval: 5 }),
 * );
 * ```
 */
export function createFailFastAudit(
  config: FailFastConfig,
): (client: HttpClient) => HttpClient {
  const verifyInterval = config.verifyInterval ?? 10;
  let failed = false;
  let failureReason: string | undefined;
  let checksPerformed = 0;

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        if (failed) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `Audit fail-fast: ${failureReason ?? "chain integrity verification failed"}`,
            ),
          );
        }

        // Periodic verification
        const entryCount = config.bridge.entryCount();
        if (entryCount > 0 && entryCount % verifyInterval === 0 && checksPerformed < entryCount) {
          checksPerformed = entryCount;
          const chain = config.bridge.getChain();
          if (!verifyChain(chain)) {
            failed = true;
            failureReason = `Audit chain corruption detected at entry ${entryCount}`;
            if (config.onFailure !== undefined) {
              config.onFailure(failureReason);
            }
            return ResultAsync.err(
              httpRequestError("Transport", req, `Audit fail-fast: ${failureReason}`),
            );
          }
        }

        return client.execute(req);
      },
    );
}
