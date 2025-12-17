/**
 * Types for the Vite DevTools Plugin
 *
 * @packageDocumentation
 */

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Relay server configuration.
 */
export interface RelayConfig {
  /**
   * Enable relay server for browser apps.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Port for the relay server.
   * @default 47100
   */
  readonly port?: number;

  /**
   * Host for the relay server.
   * @default '127.0.0.1'
   */
  readonly host?: string;
}

/**
 * Overlay configuration for the DevTools panel.
 */
export interface OverlayConfig {
  /**
   * Enable the DevTools overlay in the browser.
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Position of the overlay button.
   * @default 'bottom-right'
   */
  readonly position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Keyboard shortcut to toggle the DevTools panel.
   * @default 'ctrl+shift+d'
   */
  readonly hotkey?: string;

  /**
   * Initial panel visibility.
   * @default false
   */
  readonly defaultOpen?: boolean;
}

/**
 * Main plugin options.
 */
export interface HexDIDevToolsOptions {
  /**
   * Relay server configuration.
   */
  readonly relay?: RelayConfig;

  /**
   * Overlay configuration.
   */
  readonly overlay?: OverlayConfig;

  /**
   * Auto-inject DevTools client script into entry HTML.
   * @default true
   */
  readonly autoInject?: boolean;

  /**
   * Open DevTools panel on server start.
   * @default false
   */
  readonly open?: boolean;

  /**
   * Include DevTools in production builds.
   * @default false
   */
  readonly includeInProduction?: boolean;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Resolved configuration with defaults applied.
 * @internal
 */
export interface ResolvedConfig {
  readonly relay: Required<RelayConfig>;
  readonly overlay: Required<OverlayConfig>;
  readonly autoInject: boolean;
  readonly open: boolean;
  readonly includeInProduction: boolean;
}

/**
 * Client information for connected apps.
 * @internal
 */
export interface ClientInfo {
  readonly id: string;
  readonly role: 'host' | 'observer' | 'controller' | 'admin';
  readonly appName?: string;
  readonly connectedAt: number;
}

/**
 * Relay server state.
 * @internal
 */
export interface RelayState {
  readonly isRunning: boolean;
  readonly port: number;
  readonly clients: Map<string, ClientInfo>;
}
