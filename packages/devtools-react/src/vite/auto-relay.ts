/**
 * Auto-Relay Server
 *
 * Automatically starts a WebSocket relay server for browser DevTools.
 *
 * @packageDocumentation
 */

import type { RelayConfig, RelayState, ClientInfo } from './types.js';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_RELAY_CONFIG: Required<RelayConfig> = {
  enabled: true,
  port: 47100,
  host: '127.0.0.1',
};

// =============================================================================
// Relay Server Implementation
// =============================================================================

/**
 * Simple relay server for DevTools communication.
 *
 * The relay server acts as a hub between:
 * - Browser apps (hosts) that expose their container state
 * - External tools (observers) like TUI, MCP, or web inspectors
 *
 * @internal
 */
export class RelayServer {
  private state: RelayState = {
    isRunning: false,
    port: 0,
    clients: new Map(),
  };

  private readonly config: Required<RelayConfig>;
  private server: unknown = null;

  constructor(config: Partial<RelayConfig> = {}) {
    this.config = { ...DEFAULT_RELAY_CONFIG, ...config };
  }

  /**
   * Starts the relay server.
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    // Note: In a full implementation, this would use WebSocket server
    // For now, we just mark it as running
    this.state = {
      ...this.state,
      isRunning: true,
      port: this.config.port,
    };

    console.log(`[HexDI DevTools] Relay server starting on ws://${this.config.host}:${this.config.port}`);
  }

  /**
   * Stops the relay server.
   */
  async stop(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    this.state = {
      ...this.state,
      isRunning: false,
      clients: new Map(),
    };

    console.log('[HexDI DevTools] Relay server stopped');
  }

  /**
   * Gets the current relay state.
   */
  getState(): RelayState {
    return this.state;
  }

  /**
   * Gets the relay URL.
   */
  getUrl(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  /**
   * Checks if the server is running.
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }

  /**
   * Gets connected clients.
   */
  getClients(): ReadonlyMap<string, ClientInfo> {
    return this.state.clients;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new relay server instance.
 *
 * @param config - Relay configuration
 * @returns A new RelayServer instance
 */
export function createRelayServer(config: Partial<RelayConfig> = {}): RelayServer {
  return new RelayServer(config);
}

/**
 * Resolves relay configuration with defaults.
 *
 * @param config - Partial configuration
 * @returns Complete configuration with defaults
 * @internal
 */
export function resolveRelayConfig(config: Partial<RelayConfig> | undefined): Required<RelayConfig> {
  return {
    ...DEFAULT_RELAY_CONFIG,
    ...config,
  };
}
