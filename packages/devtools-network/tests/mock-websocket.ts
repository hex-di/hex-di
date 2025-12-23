/**
 * Mock WebSocket implementation for testing.
 *
 * Provides a type-safe, in-memory WebSocket implementation that can be used
 * in tests without requiring real network sockets.
 *
 * @packageDocumentation
 */

import {
  WebSocket,
  type Event as WsEvent,
  type CloseEvent as WsCloseEvent,
  type ErrorEvent as WsErrorEvent,
  type MessageEvent as WsMessageEvent,
} from "ws";

/**
 * WebSocket ready state type.
 */
type WebSocketReadyState = 0 | 1 | 2 | 3;

/**
 * WebSocket binary type for ws library.
 */
type WsBinaryType = "nodebuffer" | "arraybuffer" | "fragments";

/**
 * Mock CloseEvent for Node.js environments.
 */
class MockCloseEvent implements WsCloseEvent {
  readonly type: string = "close";
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;
  readonly target: WebSocket;

  constructor(
    type: string,
    init?: { code?: number; reason?: string; wasClean?: boolean; target?: WebSocket }
  ) {
    this.type = type;
    this.code = init?.code ?? 1000;
    this.reason = init?.reason ?? "";
    this.wasClean = init?.wasClean ?? false;
    this.target = init?.target ?? (null as unknown as WebSocket);
  }
}

/**
 * Event listener type for WebSocket events.
 */
type WebSocketEventListener = (
  event: WsEvent | WsMessageEvent | WsCloseEvent | WsErrorEvent
) => void;

/**
 * WebSocket event map for typed event listeners.
 */
interface MockWebSocketEventMap {
  open: WsEvent;
  close: WsCloseEvent;
  error: WsErrorEvent;
  message: WsMessageEvent;
}

/**
 * Event handler type for ws WebSocket.
 */
type WsEventHandler<K extends keyof MockWebSocketEventMap> =
  | ((event: MockWebSocketEventMap[K]) => void)
  | { handleEvent(event: MockWebSocketEventMap[K]): void };

/**
 * Mock WebSocket implementation for testing.
 *
 * This class provides a type-safe way to create mock WebSocket objects for testing
 * without requiring real network connections. It follows the WebSocket API pattern
 * but is intentionally a separate type to avoid complex type compatibility issues
 * with the ws library's WebSocket interface.
 */
export class MockWebSocket {
  /** WebSocket ready state: CONNECTING = 0, OPEN = 1, CLOSING = 2, CLOSED = 3 */
  readyState: WebSocketReadyState = WebSocket.OPEN as WebSocketReadyState;

  /** Binary type for received data */
  binaryType: WsBinaryType = "arraybuffer";

  /** Buffered amount of data waiting to be sent */
  bufferedAmount: number = 0;

  /** WebSocket extensions */
  extensions: string = "";

  /** WebSocket protocol */
  protocol: string = "";

  /** WebSocket URL */
  url: string = "";

  /** Event handlers */
  onopen: ((event: WsEvent) => void) | null = null;
  onclose: ((event: WsCloseEvent) => void) | null = null;
  onerror: ((event: WsErrorEvent) => void) | null = null;
  onmessage: ((event: WsMessageEvent) => void) | null = null;

  /** Map of event listeners for addEventListener/removeEventListener */
  private readonly eventListeners = new Map<string, Set<WebSocketEventListener>>();

  /** Peer socket for bidirectional communication */
  peer: MockWebSocket | null = null;

  constructor(url: string = "ws://localhost") {
    this.url = url;
  }

  /**
   * Send data through the WebSocket.
   *
   * @param data - The data to send
   */
  send(data: string | ArrayBufferLike | Blob): void {
    if (this.readyState !== WebSocket.OPEN) {
      return;
    }

    // Convert data to string for delivery to peer
    let messageData: string;
    if (typeof data === "string") {
      messageData = data;
    } else if (data instanceof ArrayBuffer) {
      // Decode ArrayBuffer to string using TextDecoder
      const decoder = new TextDecoder();
      messageData = decoder.decode(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
      // Handle Uint8Array directly
      const decoder = new TextDecoder();
      messageData = decoder.decode(data);
    } else if (data instanceof Blob) {
      // For testing purposes, we'll just convert blob to string
      messageData = "[Blob]";
    } else {
      messageData = String(data);
    }

    // Deliver to peer as an incoming message (simulates network)
    if (this.peer !== null && this.peer.readyState === WebSocket.OPEN) {
      this.peer.receiveMessage(messageData);
    }
  }

  /**
   * Close the WebSocket connection.
   *
   * @param code - Optional close code
   * @param reason - Optional close reason
   */
  close(code?: number, reason?: string): void {
    if (this.readyState === WebSocket.CLOSED || this.readyState === WebSocket.CLOSING) {
      return;
    }

    this.readyState = WebSocket.CLOSED as WebSocketReadyState;

    // Emit close event
    const closeEvent = new MockCloseEvent("close", {
      code: code ?? 1000,
      reason: reason ?? "",
      wasClean: true,
    });
    this.emitEvent("close", closeEvent);

    // Close peer if connected
    if (this.peer !== null && this.peer.readyState !== WebSocket.CLOSED) {
      this.peer.readyState = WebSocket.CLOSED as WebSocketReadyState;
      const peerCloseEvent = new MockCloseEvent("close", {
        code: code ?? 1000,
        reason: reason ?? "",
        wasClean: true,
      });
      this.peer.emitEvent("close", peerCloseEvent);
    }
  }

  /**
   * Add an event listener.
   *
   * @param type - Event type
   * @param listener - Event listener
   */
  addEventListener<K extends keyof MockWebSocketEventMap>(
    type: K,
    listener: WsEventHandler<K>,
    _options?: EventListenerOptions | undefined
  ): void {
    const listeners = this.eventListeners.get(type) ?? new Set<WebSocketEventListener>();
    const wrappedListener: WebSocketEventListener =
      typeof listener === "function"
        ? (listener as WebSocketEventListener)
        : event => {
            listener.handleEvent(event as MockWebSocketEventMap[K]);
          };
    listeners.add(wrappedListener);
    this.eventListeners.set(type, listeners);
  }

  /**
   * Remove an event listener.
   *
   * @param type - Event type
   * @param _listener - Event listener (unused - removes all listeners for type)
   */
  removeEventListener<K extends keyof MockWebSocketEventMap>(
    type: K,
    _listener: WsEventHandler<K>
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners !== undefined) {
      // Remove all listeners for this type
      listeners.clear();
    }
  }

  /**
   * Dispatch an event to registered listeners.
   *
   * Accepts both ws library events and DOM events for testing flexibility.
   *
   * @param event - Event to dispatch
   * @returns True (events are not cancellable in this mock)
   */
  dispatchEvent(event: { type: string; data?: unknown }): boolean {
    const listeners = this.eventListeners.get(event.type);
    if (listeners !== undefined) {
      for (const listener of listeners) {
        listener(event as WsEvent);
      }
    }
    return true;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Receive a message from the peer.
   *
   * @param data - Message data
   */
  private receiveMessage(data: string): void {
    const messageEvent = new MessageEvent("message", {
      data,
    }) as unknown as WsMessageEvent;
    this.emitEvent("message", messageEvent);
  }

  /**
   * Emit an event to both the handler and listeners.
   *
   * @param type - Event type
   * @param event - Event object
   */
  private emitEvent(
    type: string,
    event: WsEvent | WsMessageEvent | WsCloseEvent | WsErrorEvent
  ): void {
    // Call the handler if set using type-safe lookup
    switch (type) {
      case "open":
        if (this.onopen !== null) {
          this.onopen(event as WsEvent);
        }
        break;
      case "close":
        if (this.onclose !== null) {
          this.onclose(event as WsCloseEvent);
        }
        break;
      case "error":
        if (this.onerror !== null) {
          this.onerror(event as WsErrorEvent);
        }
        break;
      case "message":
        if (this.onmessage !== null) {
          this.onmessage(event as WsMessageEvent);
        }
        break;
    }

    // Dispatch to listeners - cast is needed as ws Event differs from DOM Event
    const listeners = this.eventListeners.get(type);
    if (listeners !== undefined) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}

/**
 * Create a pair of connected mock WebSockets.
 *
 * @param clientUrl - URL for the client socket
 * @param serverUrl - URL for the server socket
 * @returns Object with client and server sockets
 */
export function createMockWebSocketPair(
  clientUrl: string = "ws://localhost/client",
  serverUrl: string = "ws://localhost/server"
): { client: MockWebSocket; server: MockWebSocket } {
  const client = new MockWebSocket(clientUrl);
  const server = new MockWebSocket(serverUrl);
  client.peer = server;
  server.peer = client;
  return { client, server };
}

/**
 * Create a single mock WebSocket.
 *
 * @param url - WebSocket URL
 * @returns Mock WebSocket instance
 */
export function createMockWebSocket(url: string = "ws://localhost"): MockWebSocket {
  return new MockWebSocket(url);
}
