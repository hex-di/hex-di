/**
 * @hex-di/devtools-network - Network Layer for HexDI DevTools.
 *
 * @deprecated This package's exports are being consolidated. Some exports will move
 * to `@hex-di/devtools` in the next major version (v2.0).
 *
 * ## Migration Guide
 *
 * | Old Import | New Import |
 * |------------|------------|
 * | `ClientRegistry` | `ClientRegistry` from `@hex-di/devtools` |
 * | `DevToolsClient` | `RemoteDataSource` from `@hex-di/devtools` (for consumers) |
 * | `DevToolsServer` | `DevToolsServer` from `@hex-di/devtools-network` (unchanged) |
 * | Protocol utilities | `@hex-di/devtools` (createRequest, Methods, etc.) |
 *
 * Note: Server-side utilities (DevToolsServer, middleware) remain in this package.
 * Client-side consumers should migrate to the unified `@hex-di/devtools` package.
 *
 * ## Example Migration
 *
 * Before (client-side):
 * ```typescript
 * import { DevToolsClient, ClientRegistry } from '@hex-di/devtools-network';
 * ```
 *
 * After (client-side):
 * ```typescript
 * import { RemoteDataSource, ClientRegistry } from '@hex-di/devtools';
 * ```
 *
 * Server-side usage remains unchanged:
 * ```typescript
 * import { DevToolsServer, attachExpressDevTools } from '@hex-di/devtools-network';
 * ```
 *
 * Provides WebSocket server and client communication for DevTools.
 *
 * @packageDocumentation
 */

// =============================================================================
// Server Exports (Not deprecated - server-side only)
// =============================================================================

export {
  DevToolsServer,
  type DevToolsServerOptions,
  type ServerEvent,
  type ServerEventListener,
} from './server/index.js';

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed from this package in v2.0.
 */
export {
  ClientRegistry,
  type RegisteredApp,
  type AppInfo,
  type ClientRegistryListener,
} from './server/client-registry.js';

// =============================================================================
// Client Exports
// =============================================================================

/**
 * @deprecated Use `RemoteDataSource` from `@hex-di/devtools` for client-side usage.
 * Will be removed in v2.0.
 */
export {
  DevToolsClient,
  type ClientOptions,
  type ClientEvent,
  type ClientEventListener,
} from './client/client.js';

export {
  WebSocketPort,
  type WebSocketService,
} from './client/ports/index.js';

export {
  BrowserWebSocketAdapter,
  WsAdapter,
} from './client/adapters/index.js';

// =============================================================================
// Middleware Exports (Not deprecated - server-side only)
// =============================================================================

export {
  attachDevTools as attachExpressDevTools,
  type ExpressDevToolsOptions,
} from './middleware/express.js';

export {
  attachDevTools as attachFastifyDevTools,
  type FastifyDevToolsOptions,
} from './middleware/fastify.js';

// =============================================================================
// Protocol Re-exports (for convenience)
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools` or `@hex-di/devtools-core` instead.
 * Will be removed from this package in v2.0.
 */
export {
  Methods,
  ErrorCodes,
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
} from '@hex-di/devtools-core';
