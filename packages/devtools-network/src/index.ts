/**
 * @hex-di/devtools-network - Network Layer for HexDI DevTools
 *
 * Provides WebSocket server and client communication for DevTools.
 *
 * @packageDocumentation
 */

// =============================================================================
// Server Exports
// =============================================================================

export {
  DevToolsServer,
  type DevToolsServerOptions,
  type ServerEvent,
  type ServerEventListener,
} from './server/index.js';

export {
  ClientRegistry,
  type RegisteredApp,
  type AppInfo,
  type ClientRegistryListener,
} from './server/client-registry.js';

// =============================================================================
// Client Exports
// =============================================================================

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
// Middleware Exports
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
