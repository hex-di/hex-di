/**
 * SSRF protection combinator — blocks requests to private/internal networks.
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { httpRequestError } from "../../errors/http-request-error.js";

// =============================================================================
// Types
// =============================================================================

export interface SsrfProtectionConfig {
  /** Domains that are allowed even if they resolve to private IPs. */
  readonly allowedDomains?: ReadonlyArray<string>;

  /** Block cloud metadata service endpoints (169.254.169.254, etc.). Default: true. */
  readonly blockMetadataEndpoints?: boolean;

  /** Block link-local addresses (169.254.x.x). Default: true. */
  readonly blockLinkLocal?: boolean;
}

// =============================================================================
// Private IP detection
// =============================================================================

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

const LOOPBACK = /^127\./;
const LINK_LOCAL = /^169\.254\./;
const METADATA_ENDPOINTS = [
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
];

function isPrivateIp(hostname: string): boolean {
  if (LOOPBACK.test(hostname) || hostname === "localhost") {
    return true;
  }
  return PRIVATE_RANGES.some((range) => range.test(hostname));
}

function isLinkLocal(hostname: string): boolean {
  return LINK_LOCAL.test(hostname);
}

function isMetadataEndpoint(hostname: string): boolean {
  return METADATA_ENDPOINTS.includes(hostname);
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Block requests to private/internal IP addresses to prevent SSRF attacks.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withSsrfProtection({ allowedDomains: ["internal-api.mycompany.com"] }),
 * );
 * ```
 */
export function withSsrfProtection(
  config?: SsrfProtectionConfig,
): (client: HttpClient) => HttpClient {
  const allowedDomains = new Set(config?.allowedDomains ?? []);
  const blockMetadata = config?.blockMetadataEndpoints !== false;
  const blockLinkLocalFlag = config?.blockLinkLocal !== false;

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        let hostname: string;
        try {
          hostname = new URL(req.url).hostname;
        } catch {
          return client.execute(req);
        }

        if (allowedDomains.has(hostname)) {
          return client.execute(req);
        }

        if (isPrivateIp(hostname)) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `SSRF protection: blocked request to private address ${hostname}`,
            ),
          );
        }

        if (blockLinkLocalFlag && isLinkLocal(hostname)) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `SSRF protection: blocked request to link-local address ${hostname}`,
            ),
          );
        }

        if (blockMetadata && isMetadataEndpoint(hostname)) {
          return ResultAsync.err(
            httpRequestError(
              "Transport",
              req,
              `SSRF protection: blocked request to metadata endpoint ${hostname}`,
            ),
          );
        }

        return client.execute(req);
      },
    );
}
