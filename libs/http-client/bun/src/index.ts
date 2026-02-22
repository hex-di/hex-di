/**
 * @hex-di/http-client-bun
 *
 * Bun fetch transport adapter for @hex-di/http-client.
 * Uses Bun's native fetch for Bun-native performance optimizations.
 *
 * @packageDocumentation
 */

export { createBunHttpClient, BunHttpClientAdapter } from "./adapter.js";
export type { BunHttpClientOptions } from "./adapter.js";
