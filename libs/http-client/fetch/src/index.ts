/**
 * @hex-di/http-client-fetch
 *
 * Fetch API transport adapter for @hex-di/http-client.
 * Uses `globalThis.fetch`, available in browsers, Node.js 18+, Deno, Bun,
 * and Cloudflare Workers.
 *
 * @packageDocumentation
 */

export { createFetchHttpClient, FetchHttpClientAdapter } from "./adapter.js";
export type { FetchHttpClientOptions } from "./adapter.js";
