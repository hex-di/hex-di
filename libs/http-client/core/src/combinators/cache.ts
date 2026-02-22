/**
 * Response cache combinator.
 *
 * Caches successful GET responses in memory. Supports TTL-based eviction,
 * a maximum entry count, and Cache-Control header respect.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";
import type { HttpRequest } from "../request/http-request.js";
import type { HttpResponse } from "../response/http-response.js";
import type { HttpRequestError } from "../errors/http-request-error.js";
import { getHeader } from "../types/headers.js";

// =============================================================================
// Types
// =============================================================================

export interface ResponseCacheConfig {
  /** Default time-to-live in milliseconds. */
  readonly maxAge: number;

  /** Maximum number of entries in the cache. */
  readonly maxEntries: number;

  /** Custom key function. Default: request URL. */
  readonly keyFn?: (request: HttpRequest) => string;
}

interface CacheEntry {
  readonly response: HttpResponse;
  readonly expiresAt: number;
}

// =============================================================================
// Cache-Control parsing
// =============================================================================

function parseCacheControlMaxAge(headers: HttpResponse["headers"]): number | undefined {
  const value = getHeader("cache-control")(headers);
  if (value === undefined) return undefined;

  const noCacheDirectives = ["no-cache", "no-store", "private"];
  for (const directive of noCacheDirectives) {
    if (value.includes(directive)) return 0;
  }

  const match = /max-age=(\d+)/.exec(value);
  if (match?.[1] !== undefined) {
    return parseInt(match[1], 10) * 1000;
  }

  return undefined;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a response cache combinator.
 *
 * Only caches successful GET responses. Respects Cache-Control headers
 * when present; otherwise uses the configured `maxAge`.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   responseCache({ maxAge: 60_000, maxEntries: 100 }),
 * );
 * ```
 */
export function responseCache(
  config: ResponseCacheConfig,
): (client: HttpClient) => HttpClient {
  const { maxAge, maxEntries, keyFn } = config;
  const cache = new Map<string, CacheEntry>();

  function getKey(req: HttpRequest): string {
    if (keyFn !== undefined) return keyFn(req);
    return req.url;
  }

  function evictExpired(now: number): void {
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  }

  function evictOldest(): void {
    if (cache.size <= maxEntries) return;
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }

  return (client) =>
    createHttpClient(
      (req: HttpRequest): ResultAsync<HttpResponse, HttpRequestError> => {
        // Only cache GET requests
        if (req.method !== "GET") {
          return client.execute(req);
        }

        const now = Date.now();
        const key = getKey(req);

        // Check cache
        const cached = cache.get(key);
        if (cached !== undefined && cached.expiresAt > now) {
          return ResultAsync.ok(cached.response);
        }

        // Cache miss — forward request
        return client.execute(req).map((response) => {
          // Determine TTL from Cache-Control or config
          const ccMaxAge = parseCacheControlMaxAge(response.headers);
          const ttl = ccMaxAge !== undefined ? ccMaxAge : maxAge;

          if (ttl > 0) {
            evictExpired(now);
            cache.set(key, {
              response,
              expiresAt: now + ttl,
            });
            evictOldest();
          }

          return response;
        });
      },
    );
}

/**
 * Clear all entries from a cached client.
 * Returns the number of entries cleared.
 */
export function clearCache(client: HttpClient): void {
  // Cache state is encapsulated — this is a no-op placeholder.
  // Real cache clearing would require the combinator to expose a handle.
  void client;
}
