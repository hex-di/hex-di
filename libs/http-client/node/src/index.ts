/**
 * @hex-di/http-client-node
 *
 * Node.js built-in HTTP transport adapter for @hex-di/http-client.
 * Uses node:http and node:https modules directly. No external dependencies.
 *
 * @packageDocumentation
 */

export { createNodeHttpClient, NodeHttpClientAdapter } from "./adapter.js";
export type { NodeHttpClientOptions } from "./adapter.js";
