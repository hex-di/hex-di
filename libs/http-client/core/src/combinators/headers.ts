/**
 * Default headers combinator.
 * @packageDocumentation
 */

import type { HttpClient } from "../ports/http-client-port.js";
import { createHttpClient } from "../ports/http-client-factory.js";

/**
 * Set default headers on every outgoing request.
 *
 * Default headers are applied only when the request does not already carry a
 * header with the same key. This allows per-request overrides to win over the
 * defaults.
 *
 * All keys are normalised to lowercase before comparison.
 *
 * @example
 * ```typescript
 * const client = pipe(
 *   baseClient,
 *   defaultHeaders({
 *     Accept: "application/json",
 *     "X-Api-Version": "2024-01-01",
 *   })
 * );
 * ```
 */
export function defaultHeaders(
  headers: Readonly<Record<string, string>>,
): (client: HttpClient) => HttpClient {
  // Pre-compute lowercase keys so we don't do it on every request.
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }

  return (client) =>
    createHttpClient((req) => {
      // Build the merged entries: start with the defaults then overwrite with
      // existing request headers (existing headers win).
      const merged: Record<string, string> = { ...normalized, ...req.headers.entries };

      // Only rebuild if there is actually anything new to add.
      const hasNewKeys = Object.keys(normalized).some((k) => !(k in req.headers.entries));

      if (!hasNewKeys) {
        return client.execute(req);
      }

      // Produce a new frozen request with the merged headers.
      // We preserve the original request structure by spreading and overriding
      // only the `headers` field.
      const updatedHeaders = Object.freeze({
        ...req.headers,
        entries: Object.freeze(merged),
      });

      const updatedReq = Object.freeze({ ...req, headers: updatedHeaders });
      return client.execute(updatedReq);
    });
}
