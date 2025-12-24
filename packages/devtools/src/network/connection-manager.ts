/**
 * Connection Manager - Manages WebSocket connections with auto-reconnection.
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Connection status tracking
 * - Graceful degradation on disconnect
 * - Support for multiple concurrent connections
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Connection state.
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/**
 * Connection event types.
 */
export type ConnectionEvent =
  | { type: "connected"; url: string; timestamp: number }
  | { type: "disconnected"; reason: string; timestamp: number }
  | { type: "reconnecting"; attempt: number; delay: number; timestamp: number }
  | { type: "error"; error: Error; timestamp: number }
  | { type: "message"; data: string; timestamp: number };

/**
 * Connection event listener.
 */
export type ConnectionEventListener = (event: ConnectionEvent) => void;

/**
 * WebSocket factory function.
 */
export type WebSocketFactory = (url: string) => WebSocket;

/**
 * Configuration for connection manager.
 */
export interface ConnectionManagerConfig {
  /** WebSocket URL */
  readonly url: string;
  /** Enable auto-reconnection */
  readonly autoReconnect?: boolean;
  /** Initial reconnection delay (ms) */
  readonly initialReconnectDelay?: number;
  /** Maximum reconnection delay (ms) */
  readonly maxReconnectDelay?: number;
  /** Backoff multiplier for reconnection delay */
  readonly reconnectBackoffMultiplier?: number;
  /** Maximum number of reconnection attempts (0 = infinite) */
  readonly maxReconnectAttempts?: number;
  /** Connection timeout (ms) */
  readonly connectionTimeout?: number;
  /** Enable verbose logging */
  readonly verbose?: boolean;
  /** WebSocket factory (for testing) */
  readonly webSocketFactory?: WebSocketFactory;
}

/**
 * Resolved configuration with all values present.
 */
type ResolvedConfig = Required<Omit<ConnectionManagerConfig, "webSocketFactory">> & {
  readonly webSocketFactory?: WebSocketFactory;
};

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: Omit<ConnectionManagerConfig, "url"> = {
  autoReconnect: true,
  initialReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectBackoffMultiplier: 2,
  maxReconnectAttempts: 0, // Infinite
  connectionTimeout: 10000,
  verbose: false,
};

// =============================================================================
// Connection Manager
// =============================================================================

/**
 * Manages WebSocket connections with auto-reconnection and error handling.
 *
 * @example
 * ```typescript
 * const manager = new ConnectionManager({
 *   url: 'ws://localhost:9229/devtools',
 *   autoReconnect: true,
 * });
 *
 * manager.on((event) => {
 *   if (event.type === 'connected') {
 *     console.log('Connected!');
 *   }
 * });
 *
 * await manager.connect();
 * manager.send(JSON.stringify({ method: 'ping' }));
 * ```
 */
export class ConnectionManager {
  private readonly config: ResolvedConfig;
  private socket: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<ConnectionEventListener>();
  private lastConnectedTime = 0;
  private lastDisconnectReason = "";

  constructor(config: ConnectionManagerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ResolvedConfig;
  }

  /**
   * Connect to the WebSocket server.
   */
  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      this.log("Already connected or connecting");
      return;
    }

    this.state = "connecting";
    this.log(`Connecting to ${this.config.url}`);

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket
        const factory = this.config.webSocketFactory ?? ((url: string) => new WebSocket(url));
        this.socket = factory(this.config.url);

        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.state === "connecting") {
            this.handleError(new Error("Connection timeout"));
            reject(new Error("Connection timeout"));
          }
        }, this.config.connectionTimeout);

        // Set up event handlers
        this.socket.onopen = () => {
          this.clearConnectionTimer();
          this.state = "connected";
          this.reconnectAttempts = 0;
          this.lastConnectedTime = Date.now();
          this.log("Connected");
          this.emit({
            type: "connected",
            url: this.config.url,
            timestamp: Date.now(),
          });
          resolve();
        };

        this.socket.onclose = event => {
          this.clearConnectionTimer();
          const reason = event.reason || "Connection closed";
          this.lastDisconnectReason = reason;
          this.log(`Disconnected: ${reason}`);
          this.emit({
            type: "disconnected",
            reason,
            timestamp: Date.now(),
          });
          this.handleDisconnect();
        };

        this.socket.onerror = () => {
          this.clearConnectionTimer();
          const error = new Error("WebSocket error");
          this.handleError(error);
          if (this.state === "connecting") {
            reject(error);
          }
        };

        this.socket.onmessage = event => {
          this.emit({
            type: "message",
            data: String(event.data),
            timestamp: Date.now(),
          });
        };
      } catch (error) {
        this.clearConnectionTimer();
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server.
   *
   * @param reason - Reason for disconnection
   */
  disconnect(reason = "Manual disconnect"): void {
    this.log(`Disconnecting: ${reason}`);

    // Cancel any pending reconnection
    this.cancelReconnect();

    // Close the socket
    if (this.socket !== null) {
      this.socket.close(1000, reason);
      this.socket = null;
    }

    this.state = "disconnected";
    this.lastDisconnectReason = reason;
  }

  /**
   * Send a message through the WebSocket.
   *
   * @param data - Message data to send
   * @returns True if sent successfully, false otherwise
   */
  send(data: string): boolean {
    if (this.socket === null || this.state !== "connected") {
      this.log("Cannot send: not connected");
      return false;
    }

    try {
      this.socket.send(data);
      return true;
    } catch (error) {
      this.log(`Send error: ${error}`);
      return false;
    }
  }

  /**
   * Add an event listener.
   *
   * @param listener - Event listener function
   */
  on(listener: ConnectionEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   *
   * @param listener - Event listener function
   */
  off(listener: ConnectionEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if currently connected.
   */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * Get time connected in milliseconds.
   */
  getTimeConnected(): number {
    if (this.state !== "connected") {
      return 0;
    }
    return Date.now() - this.lastConnectedTime;
  }

  /**
   * Get last disconnect reason.
   */
  getLastDisconnectReason(): string {
    return this.lastDisconnectReason;
  }

  /**
   * Get current reconnection attempt count.
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private handleDisconnect(): void {
    this.state = "disconnected";
    this.socket = null;

    // Attempt reconnection if enabled
    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.log(`Error: ${error.message}`);
    this.state = "error";
    this.emit({
      type: "error",
      error,
      timestamp: Date.now(),
    });
  }

  private scheduleReconnect(): void {
    // Check if we've exceeded max attempts
    if (
      this.config.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.config.maxReconnectAttempts
    ) {
      this.log("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    this.state = "reconnecting";

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialReconnectDelay *
        Math.pow(this.config.reconnectBackoffMultiplier, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.emit({
      type: "reconnecting",
      attempt: this.reconnectAttempts,
      delay,
      timestamp: Date.now(),
    });

    this.reconnectTimer = setTimeout(() => {
      this.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.log(`Reconnection failed: ${message}`);
        // Will schedule next attempt via handleDisconnect
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer !== null) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private emit(event: ConnectionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        this.log(`Listener error: ${error}`);
      }
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.warn(`[ConnectionManager] ${message}`);
    }
  }
}
