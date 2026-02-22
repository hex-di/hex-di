/**
 * Base URL combinator.
 * @packageDocumentation
 */

import type { HttpClient } from "../ports/http-client-port.js";
import { mapRequest } from "./request.js";
import { prependUrl } from "../request/http-request.js";

/**
 * Prepend a base URL to every outgoing request's URL.
 *
 * Internally calls `mapRequest(req => prependUrl(url)(req))`.
 *
 * @example
 * ```typescript
 * const client = pipe(baseClient, baseUrl("https://api.example.com/v2"));
 *
 * // client.get("/users")       → GET https://api.example.com/v2/users
 * // client.get("/orders/123")  → GET https://api.example.com/v2/orders/123
 * ```
 */
export function baseUrl(url: string): (client: HttpClient) => HttpClient {
  return mapRequest(prependUrl(url));
}
