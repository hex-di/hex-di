/**
 * Fastify plugin for DevTools server.
 *
 * Provides a Fastify plugin that attaches the DevTools WebSocket
 * server to an existing Fastify application.
 *
 * @packageDocumentation
 */

import type { Server as HttpServer } from "http";
import { DevToolsServer, type DevToolsServerOptions } from "../server/websocket-server.js";

/**
 * Fastify plugin options.
 */
export interface FastifyDevToolsOptions extends Omit<DevToolsServerOptions, "server" | "port"> {
  /**
   * Path for WebSocket connections.
   * @default "/devtools"
   */
  readonly path?: string;
}

/**
 * Create DevTools server attached to a Fastify app.
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { attachDevTools } from '@hex-di/devtools-network/middleware/fastify';
 *
 * const app = Fastify();
 *
 * app.ready().then(() => {
 *   const devtools = attachDevTools(app.server, { path: '/devtools' });
 * });
 *
 * app.listen({ port: 3000 });
 * ```
 */
export function attachDevTools(
  httpServer: HttpServer,
  options: FastifyDevToolsOptions = {}
): DevToolsServer {
  const server = new DevToolsServer({
    ...options,
    server: httpServer,
  });

  // Start immediately since we're attaching to existing server
  server.start().catch((err) => {
    console.error("[DevTools] Failed to start:", err);
  });

  return server;
}
