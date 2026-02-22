/**
 * @hex-di/http-client-ofetch
 *
 * Ofetch transport adapter for @hex-di/http-client.
 * Uses ofetch as the HTTP transport. Universal: browsers, Node.js, Deno, Bun, Workers.
 *
 * @packageDocumentation
 */

export { createOfetchHttpClient, OfetchHttpClientAdapter } from "./adapter.js";
export type { OfetchHttpClientOptions } from "./adapter.js";
