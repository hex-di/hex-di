/**
 * HSTS enforcement combinator.
 *
 * Automatically upgrades HTTP -> HTTPS for known HSTS domains and processes
 * Strict-Transport-Security response headers.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../../ports/http-client-port.js";
import { createHttpClient } from "../../ports/http-client-factory.js";
import type { HttpRequest } from "../../request/http-request.js";
import type { HttpResponse } from "../../response/http-response.js";
import type { HttpRequestError } from "../../errors/http-request-error.js";
import { getHeader } from "../../types/headers.js";

// =============================================================================
// Types
// =============================================================================

export interface HstsConfig {
  /** Pre-loaded HSTS domains that should always use HTTPS. */
  readonly preloadedDomains?: ReadonlyArray<string>;

  /** Whether to include subdomains in HSTS policy. Default: false. */
  readonly includeSubdomains?: boolean;
}

interface HstsEntry {
  readonly expiresAt: number;
  readonly includeSubdomains: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Enforce HSTS policies on outgoing requests.
 *
 * HTTP URLs for known HSTS domains are automatically upgraded to HTTPS.
 * HSTS response headers are processed and cached.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   withHstsEnforcement({ preloadedDomains: ["example.com"] }),
 * );
 * ```
 */
export function withHstsEnforcement(
  config?: HstsConfig,
): (client: HttpClient) => HttpClient {
  const knownHosts = new Map<string, HstsEntry>();

  // Initialize preloaded domains
  if (config?.preloadedDomains !== undefined) {
    for (const domain of config.preloadedDomains) {
      knownHosts.set(domain, {
        expiresAt: Infinity,
        includeSubdomains: config.includeSubdomains ?? false,
      });
    }
  }

  function isHstsDomain(hostname: string): boolean {
    const entry = knownHosts.get(hostname);
    if (entry !== undefined && entry.expiresAt > Date.now()) {
      return true;
    }

    // Check parent domains for includeSubdomains
    const parts = hostname.split(".");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join(".");
      const parentEntry = knownHosts.get(parent);
      if (
        parentEntry !== undefined &&
        parentEntry.includeSubdomains &&
        parentEntry.expiresAt > Date.now()
      ) {
        return true;
      }
    }

    return false;
  }

  function processHstsHeader(hostname: string, headerValue: string | undefined): void {
    if (headerValue === undefined) return;

    const maxAgeMatch = /max-age=(\d+)/.exec(headerValue);
    if (maxAgeMatch?.[1] === undefined) return;

    const maxAge = parseInt(maxAgeMatch[1], 10);
    const includeSubdomains = headerValue.includes("includeSubDomains");

    knownHosts.set(hostname, {
      expiresAt: Date.now() + maxAge * 1000,
      includeSubdomains,
    });
  }

  function upgradeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" && isHstsDomain(parsed.hostname)) {
        parsed.protocol = "https:";
        return parsed.toString();
      }
    } catch {
      // Invalid URL -- pass through
    }
    return url;
  }

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        const upgradedUrl = upgradeUrl(req.url);
        const upgradedReq =
          upgradedUrl !== req.url
            ? Object.freeze({ ...req, url: upgradedUrl })
            : req;

        return client.execute(upgradedReq).map((response) => {
          // Process HSTS header from response
          try {
            const hostname = new URL(upgradedReq.url).hostname;
            const hstsHeader = getHeader("strict-transport-security")(response.headers);
            processHstsHeader(hostname, hstsHeader);
          } catch {
            // Ignore URL parse errors
          }
          return response;
        });
      },
    );
}
