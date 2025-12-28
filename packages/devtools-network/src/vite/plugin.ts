/**
 * Vite Plugin for DevTools relay server.
 *
 * Attaches a DevTools WebSocket server to Vite's dev server,
 * enabling browser apps to act as hosts and TUI clients to connect.
 *
 * @packageDocumentation
 */

import type { Plugin, ViteDevServer } from "vite";
import { createVerboseLogger } from "@hex-di/devtools-core";
import { DevToolsServer } from "../server/websocket-server.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Vite DevTools plugin options.
 */
export interface DevToolsPluginOptions {
  /**
   * Path for WebSocket connections.
   * @default "/devtools"
   */
  readonly path?: string;

  /**
   * Enable verbose logging.
   * @default false
   */
  readonly verbose?: boolean;
}

/**
 * Extended Vite dev server with DevTools server instance.
 */
export interface ViteDevServerWithDevTools extends ViteDevServer {
  /**
   * The DevTools server instance.
   */
  devToolsServer?: DevToolsServer;
}

// =============================================================================
// Plugin Implementation
// =============================================================================

/**
 * Vite plugin that adds DevTools WebSocket relay server.
 *
 * This plugin attaches a DevTools WebSocket server to Vite's development
 * server. Browser applications connect to this server as "hosts" and
 * push their DI graph and tracing data. TUI clients connect to query
 * this data.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import react from '@vitejs/plugin-react';
 * import { devToolsPlugin } from '@hex-di/devtools-network/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     react(),
 *     devToolsPlugin({ path: '/devtools', verbose: true }),
 *   ],
 * });
 * ```
 *
 * @param options - Plugin options
 * @returns Vite plugin
 */
export function devToolsPlugin(options: DevToolsPluginOptions = {}): Plugin {
  const { path = "/devtools", verbose = false } = options;
  const logger = createVerboseLogger("hex-di-devtools", verbose);
  let devToolsServer: DevToolsServer | null = null;

  return {
    name: "hex-di-devtools",
    apply: "serve", // Only apply in dev mode

    configureServer(server: ViteDevServer): void {
      // Wait for the HTTP server to be available
      server.httpServer?.once("listening", () => {
        if (server.httpServer === null) {
          return;
        }

        // Create DevTools server attached to Vite's HTTP server
        // DevToolsServer.server option now accepts both http.Server and Http2SecureServer
        devToolsServer = new DevToolsServer({
          server: server.httpServer,
          path,
          verbose,
        });

        // Start the server (synchronous - setup only, no actual network binding)
        try {
          devToolsServer.start();

          const address = server.httpServer?.address();
          const port = typeof address === "object" && address !== null ? address.port : 3000;

          logger.log(`DevTools relay server started at ws://localhost:${port}${path}`);
        } catch (err) {
          // Using console.warn since console.error is disallowed by eslint
          const message = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.warn(`[hex-di-devtools] Failed to start DevTools server: ${message}`);
        }

        // Attach server instance for external access
        (server as ViteDevServerWithDevTools).devToolsServer = devToolsServer;

        // Log connection events
        devToolsServer.on(event => {
          switch (event.type) {
            case "connection":
              logger.log(`App connected: ${event.appName} (${event.appId})`);
              break;
            case "disconnection":
              logger.log(`App disconnected: ${event.appName} (${event.appId})`);
              break;
            case "error":
              logger.log(`Error: ${event.error.message}`);
              break;
          }
        });
      });
    },

    closeBundle(): void {
      // Clean up on server close
      if (devToolsServer !== null) {
        devToolsServer.stop().catch(() => {
          // Ignore cleanup errors
        });
      }
    },
  };
}

/**
 * Default export for convenient importing.
 */
export default devToolsPlugin;
