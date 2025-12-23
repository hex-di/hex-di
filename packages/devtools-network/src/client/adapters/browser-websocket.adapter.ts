/**
 * Browser WebSocket adapter using native WebSocket API.
 *
 * This adapter implements WebSocketPort for browser environments.
 * It wraps the native browser WebSocket API to provide the WebSocketService contract.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import {
  WebSocketPort,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "@hex-di/devtools-core";

// =============================================================================
// BrowserWebSocketService Implementation
// =============================================================================

/**
 * WebSocket service implementation for browsers using native WebSocket.
 *
 * @internal
 */
class BrowserWebSocketService implements WebSocketService {
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

      this.ws.onopen = () => {
        this.currentState = "open";
        handlers.onOpen();
        resolve();
      };

      this.ws.onmessage = event => {
        handlers.onMessage(String(event.data));
      };

      this.ws.onclose = () => {
        this.currentState = "closed";
        this.ws = null;
        handlers.onClose();
      };

      this.ws.onerror = _event => {
        const err = new Error("WebSocket error");
        handlers.onError(err);
        if (this.currentState === "connecting") {
          this.currentState = "closed";
          reject(err);
        }
      };
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
// BrowserWebSocketAdapter
// =============================================================================

/**
 * Browser WebSocket adapter using native WebSocket API.
 *
 * This adapter provides WebSocket functionality for browser environments.
 * Use this adapter in browser applications like React DevTools UI.
 *
 * @example
 * ```typescript
 * import { GraphBuilder } from "@hex-di/graph";
 * import { BrowserWebSocketAdapter } from "@hex-di/devtools-network";
 *
 * const graph = GraphBuilder.create()
 *   .provide(BrowserWebSocketAdapter)
 *   .build();
 * ```
 */
export const BrowserWebSocketAdapter = createAdapter({
  provides: WebSocketPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new BrowserWebSocketService(),
});

/**
 * Type alias for the BrowserWebSocketAdapter.
 */
export type BrowserWebSocketAdapterType = typeof BrowserWebSocketAdapter;
