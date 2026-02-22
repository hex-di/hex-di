/**
 * @hex-di/http-client-undici
 *
 * Undici transport adapter for @hex-di/http-client.
 * Uses undici's fetch API. Node.js only. Supports HTTP/2 via ALPN negotiation.
 *
 * @packageDocumentation
 */

export { createUndiciHttpClient, UndiciHttpClientAdapter } from "./adapter.js";
export type { UndiciHttpClientOptions } from "./adapter.js";
