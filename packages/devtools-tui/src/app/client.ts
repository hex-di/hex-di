/**
 * DevToolsClient setup with WsAdapter for Node.js TUI.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  DevToolsClient,
  WsAdapter,
  WebSocketPort,
  type ClientOptions,
} from "@hex-di/devtools-network";

export {
  DevToolsClient,
  type ClientOptions,
  type ClientEvent,
  type ClientEventListener,
} from "@hex-di/devtools-network";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of creating a DevToolsClient with dispose function.
 */
export interface DevToolsClientResult {
  /**
   * The DevToolsClient instance.
   */
  readonly client: DevToolsClient;

  /**
   * Dispose function to clean up resources.
   * Disconnects the client and disposes the container.
   */
  readonly dispose: () => Promise<void>;
}

// =============================================================================
// DevToolsClient Factory
// =============================================================================

/**
 * Create a DevToolsClient with Node.js WebSocket support.
 *
 * This is a convenience function that creates a DevToolsClient
 * with the WsAdapter for Node.js environments. It properly manages
 * the container lifecycle and returns a dispose function for cleanup.
 *
 * @param options - Client options (excluding webSocket, which is auto-configured)
 * @returns Object containing the DevToolsClient and a dispose function
 *
 * @example
 * ```typescript
 * const { client, dispose } = createDevToolsClient({
 *   url: 'ws://localhost:9229/devtools',
 *   autoReconnect: true,
 * });
 *
 * await client.connect();
 * const apps = await client.listApps();
 *
 * // Clean up when done
 * await dispose();
 * ```
 */
export function createDevToolsClient(
  options: Omit<ClientOptions, "webSocket"> = {}
): DevToolsClientResult {
  const graph = GraphBuilder.create().provide(WsAdapter).build();
  const container = createContainer(graph);
  const webSocket = container.resolve(WebSocketPort);
  const client = new DevToolsClient({
    ...options,
    webSocket,
  });

  return {
    client,
    dispose: async () => {
      client.disconnect();
      await container.dispose();
    },
  };
}
