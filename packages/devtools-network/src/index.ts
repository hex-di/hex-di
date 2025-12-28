/**
 * @hex-di/devtools-network - Network Layer for HexDI DevTools.
 *
 * Provides WebSocket server and middleware for DevTools communication.
 *
 * ## Server-Side Usage
 *
 * ```typescript
 * import { DevToolsServer, attachExpressDevTools } from '@hex-di/devtools-network';
 *
 * // Create WebSocket server
 * const server = new DevToolsServer({ port: 9000 });
 *
 * // Or attach to Express
 * attachExpressDevTools(app, { path: '/devtools' });
 * ```
 *
 * ## Client-Side Usage
 *
 * For client-side consumers, use `RemoteDataSource` from `@hex-di/devtools`:
 * ```typescript
 * import { RemoteDataSource, ClientRegistry } from '@hex-di/devtools';
 * ```
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
} from "./server/index.js";

// =============================================================================
// Client Exports
// =============================================================================

export { WebSocketPort, type WebSocketService } from "./client/ports/index.js";

export { BrowserWebSocketAdapter, WsAdapter } from "./client/adapters/index.js";

// =============================================================================
// Middleware Exports
// =============================================================================

export {
  attachDevTools as attachExpressDevTools,
  type ExpressDevToolsOptions,
} from "./middleware/express.js";

export {
  attachDevTools as attachFastifyDevTools,
  type FastifyDevToolsOptions,
} from "./middleware/fastify.js";
