/**
 * WebSocket port definition for platform-agnostic WebSocket connections.
 *
 * This port enables HexDI DevTools client to work in both Node.js and browser
 * environments by abstracting the WebSocket implementation.
 *
 * Adapters for this port are provided by @hex-di/devtools-network:
 * - `WsAdapter` for Node.js (uses `ws` package)
 * - `BrowserWebSocketAdapter` for browsers (uses native WebSocket)
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";

// =============================================================================
// WebSocket Event Types
// =============================================================================

/**
 * WebSocket connection state.
 */
export type WebSocketState = "connecting" | "open" | "closing" | "closed";

/**
 * Event handler signatures for WebSocket events.
 */
export interface WebSocketEventHandlers {
  /**
   * Called when the connection is established.
   */
  onOpen: () => void;

  /**
   * Called when a message is received.
   */
  onMessage: (data: string) => void;

  /**
   * Called when the connection is closed.
   */
  onClose: () => void;

  /**
   * Called when an error occurs.
   */
  onError: (error: Error) => void;
}

// =============================================================================
// WebSocket Service Contract
// =============================================================================

/**
 * WebSocket service contract for platform-agnostic WebSocket communication.
 *
 * This contract defines the interface that both Node.js and browser WebSocket
 * adapters must implement. It provides a simple, event-based API for WebSocket
 * communication.
 */
export interface WebSocketService {
  /**
   * Connect to a WebSocket server.
   *
   * @param url - The WebSocket server URL
   * @param handlers - Event handlers for connection lifecycle
   * @returns A promise that resolves when connected, or rejects on error
   */
  connect(url: string, handlers: WebSocketEventHandlers): Promise<void>;

  /**
   * Disconnect from the server.
   */
  disconnect(): void;

  /**
   * Send data to the server.
   *
   * @param data - The string data to send
   * @throws Error if not connected
   */
  send(data: string): void;

  /**
   * Get the current connection state.
   */
  readonly state: WebSocketState;

  /**
   * Check if the WebSocket is connected.
   */
  readonly isConnected: boolean;
}

// =============================================================================
// WebSocket Port
// =============================================================================

/**
 * Port token for WebSocket service.
 *
 * Use this port to inject platform-specific WebSocket implementations:
 * - `WsAdapter` for Node.js (uses `ws` package)
 * - `BrowserWebSocketAdapter` for browsers (uses native WebSocket)
 *
 * @example Node.js usage
 * ```typescript
 * import { WebSocketPort } from "@hex-di/devtools-core";
 * import { WsAdapter } from "@hex-di/devtools-network";
 *
 * const graph = GraphBuilder.create()
 *   .provide(WsAdapter)
 *   .build();
 * ```
 *
 * @example Browser usage
 * ```typescript
 * import { WebSocketPort } from "@hex-di/devtools-core";
 * import { BrowserWebSocketAdapter } from "@hex-di/devtools-network";
 *
 * const graph = GraphBuilder.create()
 *   .provide(BrowserWebSocketAdapter)
 *   .build();
 * ```
 */
export const WebSocketPort = createPort<"WebSocket", WebSocketService>("WebSocket");

/**
 * Type alias for the WebSocket port.
 */
export type WebSocketPortType = typeof WebSocketPort;
