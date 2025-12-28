/**
 * Express middleware for DevTools server.
 *
 * Provides an Express middleware that attaches the DevTools WebSocket
 * server to an existing Express application.
 *
 * @packageDocumentation
 */

import type { Server as HttpServer } from "http";
import { DevToolsServer, type DevToolsServerOptions } from "../server/websocket-server.js";

/**
 * Express middleware options.
 */
export interface ExpressDevToolsOptions extends Omit<DevToolsServerOptions, "server" | "port"> {
  /**
   * Path for WebSocket connections.
   * @default "/devtools"
   */
  readonly path?: string;
}

/**
 * Create DevTools server attached to an Express app.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createServer } from 'http';
 * import { attachDevTools } from '@hex-di/devtools-network/middleware/express';
 *
 * const app = express();
 * const server = createServer(app);
 *
 * const devtools = attachDevTools(server, { path: '/devtools' });
 *
 * server.listen(3000);
 * ```
 */
export function attachDevTools(
  httpServer: HttpServer,
  options: ExpressDevToolsOptions = {}
): DevToolsServer {
  const server = new DevToolsServer({
    ...options,
    server: httpServer,
  });

  // Start immediately since we're attaching to existing server
  try {
    server.start();
  } catch (err) {
    // Using console.warn since console.error is disallowed by eslint
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[DevTools] Failed to start: ${message}`);
  }

  return server;
}
