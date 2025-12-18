/**
 * Mock implementation of WebSocketService for testing.
 *
 * @internal This module is for internal testing only and is not part of the public API.
 * @packageDocumentation
 */

import type {
  WebSocketService,
  WebSocketState,
  WebSocketEventHandlers,
} from "../ports/websocket.port.js";

// =============================================================================
// Mock Actions Interface
// =============================================================================

/**
 * Actions available on the mock WebSocket for controlling behavior in tests.
 *
 * @internal
 */
export interface MockWebSocketActions {
  /**
   * Simulate receiving a message from the server.
   *
   * @param data - The message data to receive
   * @throws Error if not connected
   */
  simulateMessage(data: string): void;

  /**
   * Simulate the WebSocket connection opening.
   * Call this after connect() to complete the connection.
   */
  simulateOpen(): void;

  /**
   * Simulate the WebSocket connection closing.
   */
  simulateClose(): void;

  /**
   * Simulate a WebSocket error.
   *
   * @param error - The error to simulate
   */
  simulateError(error: Error): void;

  /**
   * Get all messages that have been sent via send().
   */
  getSentMessages(): readonly string[];

  /**
   * Get the current connection state.
   */
  getState(): WebSocketState;

  /**
   * Get the URL that was connected to.
   */
  getConnectedUrl(): string | null;

  /**
   * Clear the list of sent messages.
   */
  clearSentMessages(): void;

  /**
   * Get the count of connect() calls.
   */
  getConnectCallCount(): number;

  /**
   * Get the count of disconnect() calls.
   */
  getDisconnectCallCount(): number;

  /**
   * Configure auto-open behavior.
   * When enabled, simulateOpen() is automatically called after connect().
   *
   * @param enabled - Whether to auto-open (default: false)
   */
  setAutoOpen(enabled: boolean): void;

  /**
   * Configure auto-fail behavior.
   * When enabled, connect() will reject with the provided error.
   *
   * @param error - The error to reject with, or null to disable
   */
  setAutoFail(error: Error | null): void;
}

// =============================================================================
// Mock Configuration
// =============================================================================

/**
 * Configuration options for creating a mock WebSocket.
 *
 * @internal
 */
export interface MockWebSocketConfig {
  /**
   * Initial connection state. Defaults to "closed".
   */
  readonly initialState?: WebSocketState;

  /**
   * Whether to automatically open after connect(). Defaults to false.
   */
  readonly autoOpen?: boolean;

  /**
   * Error to automatically reject connect() with. Defaults to null.
   */
  readonly autoFailError?: Error | null;
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Schedule a callback to run asynchronously in the next microtask.
 * Uses Promise.resolve().then() for broad compatibility.
 */
function scheduleMicrotask(callback: () => void): void {
  void Promise.resolve().then(callback);
}

// =============================================================================
// Mock Implementation
// =============================================================================

/**
 * Create a mock WebSocket service for testing.
 *
 * @internal This function is for internal testing only.
 *
 * @example Basic usage
 * ```typescript
 * const mockWs = createMockWebSocket();
 *
 * // Connect and simulate connection opening
 * const connectPromise = mockWs.connect("ws://localhost:8080", {
 *   onOpen: () => console.log("opened"),
 *   onMessage: (data) => console.log("message:", data),
 *   onClose: () => console.log("closed"),
 *   onError: (error) => console.error("error:", error),
 * });
 *
 * mockWs.simulateOpen();
 * await connectPromise;
 *
 * // Send and verify
 * mockWs.send('{"type":"test"}');
 * expect(mockWs.getSentMessages()).toEqual(['{"type":"test"}']);
 *
 * // Simulate receiving a message
 * mockWs.simulateMessage('{"type":"response"}');
 * ```
 *
 * @param config - Optional configuration for initial state
 * @returns A mock WebSocket service with test control actions
 */
export function createMockWebSocket(
  config: MockWebSocketConfig = {}
): WebSocketService & MockWebSocketActions {
  // Internal state
  let state: WebSocketState = config.initialState ?? "closed";
  let handlers: WebSocketEventHandlers | null = null;
  let connectedUrl: string | null = null;
  const sentMessages: string[] = [];
  let connectCallCount = 0;
  let disconnectCallCount = 0;
  let autoOpen = config.autoOpen ?? false;
  let autoFailError: Error | null = config.autoFailError ?? null;

  // Pending connection promise handlers
  let pendingResolve: (() => void) | null = null;
  let pendingReject: ((error: Error) => void) | null = null;

  return {
    // WebSocketService implementation
    async connect(url: string, eventHandlers: WebSocketEventHandlers): Promise<void> {
      connectCallCount++;

      if (autoFailError !== null) {
        return Promise.reject(autoFailError);
      }

      connectedUrl = url;
      handlers = eventHandlers;
      state = "connecting";

      if (autoOpen) {
        // Auto-open: immediately transition to open state
        state = "open";
        // Call onOpen asynchronously to match real WebSocket behavior
        scheduleMicrotask(() => {
          handlers?.onOpen();
        });
        return Promise.resolve();
      }

      // Return a promise that resolves when simulateOpen() is called
      return new Promise<void>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    },

    disconnect(): void {
      disconnectCallCount++;
      if (state === "open" || state === "connecting") {
        state = "closing";
        // Transition to closed and notify
        scheduleMicrotask(() => {
          state = "closed";
          handlers?.onClose();
          handlers = null;
          pendingResolve = null;
          pendingReject = null;
        });
      }
    },

    send(data: string): void {
      if (state !== "open") {
        throw new Error("WebSocket is not connected");
      }
      sentMessages.push(data);
    },

    get state(): WebSocketState {
      return state;
    },

    get isConnected(): boolean {
      return state === "open";
    },

    // MockWebSocketActions implementation
    simulateMessage(data: string): void {
      if (state !== "open") {
        throw new Error("Cannot simulate message: WebSocket is not open");
      }
      handlers?.onMessage(data);
    },

    simulateOpen(): void {
      if (state !== "connecting") {
        throw new Error(
          `Cannot simulate open: WebSocket is in "${state}" state, expected "connecting"`
        );
      }
      state = "open";
      handlers?.onOpen();
      pendingResolve?.();
      pendingResolve = null;
      pendingReject = null;
    },

    simulateClose(): void {
      const previousState = state;
      state = "closed";
      if (previousState === "connecting") {
        pendingReject?.(new Error("Connection closed before opening"));
        pendingResolve = null;
        pendingReject = null;
      }
      handlers?.onClose();
      handlers = null;
    },

    simulateError(error: Error): void {
      handlers?.onError(error);
      if (state === "connecting") {
        pendingReject?.(error);
        pendingResolve = null;
        pendingReject = null;
      }
    },

    getSentMessages(): readonly string[] {
      return [...sentMessages];
    },

    getState(): WebSocketState {
      return state;
    },

    getConnectedUrl(): string | null {
      return connectedUrl;
    },

    clearSentMessages(): void {
      sentMessages.length = 0;
    },

    getConnectCallCount(): number {
      return connectCallCount;
    },

    getDisconnectCallCount(): number {
      return disconnectCallCount;
    },

    setAutoOpen(enabled: boolean): void {
      autoOpen = enabled;
    },

    setAutoFail(error: Error | null): void {
      autoFailError = error;
    },
  };
}
