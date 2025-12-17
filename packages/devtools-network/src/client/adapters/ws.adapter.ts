/**
 * Node.js WebSocket adapter using the `ws` package.
 *
 * This adapter implements WebSocketPort for Node.js environments.
 * It wraps the `ws` package to provide the WebSocketService contract.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import WebSocket from "ws";
import {
  WebSocketPort,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "@hex-di/devtools-core";

// =============================================================================
// WsWebSocketService Implementation
// =============================================================================

/**
 * WebSocket service implementation for Node.js using the `ws` package.
 *
 * @internal
 */
class WsWebSocketService implements WebSocketService {
  private ws: WebSocket | null = null;
  private currentHandlers: WebSocketEventHandlers | null = null;
  private currentState: WebSocketState = "closed";

  /**
   * Connect to a WebSocket server.
   */
  async connect(url: string, handlers: WebSocketEventHandlers): Promise<void> {
    if (this.ws !== null) {
      throw new Error("WebSocket is already connected or connecting");
    }

    this.currentHandlers = handlers;
    this.currentState = "connecting";

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        this.currentState = "open";
        handlers.onOpen();
        resolve();
      });

      this.ws.on("message", (data) => {
        handlers.onMessage(data.toString());
      });

      this.ws.on("close", () => {
        this.currentState = "closed";
        this.ws = null;
        handlers.onClose();
      });

      this.ws.on("error", (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        handlers.onError(err);
        if (this.currentState === "connecting") {
          this.currentState = "closed";
          reject(err);
        }
      });
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    if (this.ws !== null) {
      this.currentState = "closing";
      this.ws.close();
      this.ws = null;
    }
    this.currentState = "closed";
  }

  /**
   * Send data to the server.
   */
  send(data: string): void {
    if (this.ws === null || this.currentState !== "open") {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(data);
  }

  /**
   * Get the current connection state.
   */
  get state(): WebSocketState {
    return this.currentState;
  }

  /**
   * Check if the WebSocket is connected.
   */
  get isConnected(): boolean {
    return this.currentState === "open";
  }
}

// =============================================================================
// WsAdapter
// =============================================================================

/**
 * Node.js WebSocket adapter using the `ws` package.
 *
 * This adapter provides WebSocket functionality for Node.js environments.
 * Use this adapter in Node.js applications like TUI or MCP server.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { WsAdapter } from "@hex-di/devtools-network";
 *
 * const graph = GraphBuilder.create()
 *   .provide(WsAdapter)
 *   .build();
 * ```
 */
export const WsAdapter = createAdapter({
  provides: WebSocketPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new WsWebSocketService(),
});

/**
 * Type alias for the WsAdapter.
 */
export type WsAdapterType = typeof WsAdapter;
