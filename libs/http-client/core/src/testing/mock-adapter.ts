/**
 * Mock HTTP client adapter for DI integration.
 *
 * Provides a pre-built HexDI adapter that can be registered in a graph
 * for testing scenarios. The adapter wraps `createMockHttpClient` and
 * follows the same route-matching semantics.
 *
 * @packageDocumentation
 */

import { createAdapter, SINGLETON } from "@hex-di/core";
import { HttpClientPort } from "../ports/http-client-port.js";
import { createMockHttpClient } from "./mock-client.js";
import type { MockRoutes, MockHandler } from "./mock-client.js";

// =============================================================================
// Types
// =============================================================================

export interface MockAdapterConfig {
  /** Static routes or dynamic handler for the mock client. */
  readonly routesOrHandler: MockRoutes | MockHandler;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a mock `HttpClient` adapter suitable for DI registration.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 *
 * const graph = GraphBuilder.create()
 *   .provide(createMockHttpClientAdapter({
 *     routesOrHandler: {
 *       "GET /api/users": { status: 200, body: [] },
 *       "POST /api/users": { status: 201, body: { id: 1 } },
 *     },
 *   }))
 *   .provide(UserServiceAdapter) // requires HttpClientPort
 *   .build();
 * ```
 */
export function createMockHttpClientAdapter(config: MockAdapterConfig) {
  return createAdapter({
    provides: HttpClientPort,
    lifetime: SINGLETON,
    factory: () => createMockHttpClient(config.routesOrHandler),
  });
}
