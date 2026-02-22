/**
 * @hex-di/http-client-ky
 *
 * Ky transport adapter for @hex-di/http-client.
 * Uses ky as the HTTP transport (fetch-based). Universal: browsers and Node.js.
 *
 * @packageDocumentation
 */

export { createKyHttpClient, KyHttpClientAdapter } from "./adapter.js";
export type { KyHttpClientOptions } from "./adapter.js";
