/**
 * ClientRegistry - Tracks connected DevTools clients.
 *
 * Manages registered apps and their WebSocket connections.
 *
 * @packageDocumentation
 */

import type { WebSocket } from "ws";

// =============================================================================
// Types
// =============================================================================

/**
 * Registered app information.
 */
export interface RegisteredApp {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly hexDIVersion: string;
  readonly connectedAt: number;
  readonly socket: WebSocket;
}

/**
 * App info without socket (for listing).
 */
export interface AppInfo {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly hexDIVersion: string;
  readonly connectedAt: number;
}

// =============================================================================
// ClientRegistry
// =============================================================================

/**
 * Registry for tracking connected DevTools clients.
 */
export class ClientRegistry {
  private readonly apps = new Map<string, RegisteredApp>();
  private readonly socketToApp = new Map<WebSocket, string>();
  private readonly listeners = new Set<ClientRegistryListener>();

  /**
   * Register an app connection.
   */
  registerApp(
    socket: WebSocket,
    appId: string,
    appName: string,
    appVersion: string,
    hexDIVersion: string
  ): void {
    // Remove existing registration for this socket if any
    const existingAppId = this.socketToApp.get(socket);
    if (existingAppId !== undefined) {
      this.apps.delete(existingAppId);
    }

    // Remove existing registration for this appId if any
    const existingApp = this.apps.get(appId);
    if (existingApp !== undefined) {
      this.socketToApp.delete(existingApp.socket);
    }

    const app: RegisteredApp = {
      appId,
      appName,
      appVersion,
      hexDIVersion,
      connectedAt: Date.now(),
      socket,
    };

    this.apps.set(appId, app);
    this.socketToApp.set(socket, appId);

    this.notifyListeners("connected", app);
  }

  /**
   * Unregister an app by socket.
   */
  unregisterBySocket(socket: WebSocket): void {
    const appId = this.socketToApp.get(socket);
    if (appId === undefined) return;

    const app = this.apps.get(appId);
    if (app !== undefined) {
      this.notifyListeners("disconnected", app);
    }

    this.socketToApp.delete(socket);
    this.apps.delete(appId);
  }

  /**
   * Unregister an app by ID.
   */
  unregisterById(appId: string): void {
    const app = this.apps.get(appId);
    if (app === undefined) return;

    this.notifyListeners("disconnected", app);
    this.socketToApp.delete(app.socket);
    this.apps.delete(appId);
  }

  /**
   * Get an app by ID.
   */
  getApp(appId: string): RegisteredApp | undefined {
    return this.apps.get(appId);
  }

  /**
   * Get an app by socket.
   */
  getAppBySocket(socket: WebSocket): RegisteredApp | undefined {
    const appId = this.socketToApp.get(socket);
    if (appId === undefined) return undefined;
    return this.apps.get(appId);
  }

  /**
   * List all connected apps.
   */
  listApps(): readonly AppInfo[] {
    return Array.from(this.apps.values()).map((app) => ({
      appId: app.appId,
      appName: app.appName,
      appVersion: app.appVersion,
      hexDIVersion: app.hexDIVersion,
      connectedAt: app.connectedAt,
    }));
  }

  /**
   * Check if an app is connected.
   */
  hasApp(appId: string): boolean {
    return this.apps.has(appId);
  }

  /**
   * Get the number of connected apps.
   */
  get size(): number {
    return this.apps.size;
  }

  /**
   * Add a listener for app connection events.
   */
  addListener(listener: ClientRegistryListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener.
   */
  removeListener(listener: ClientRegistryListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    for (const app of this.apps.values()) {
      this.notifyListeners("disconnected", app);
    }
    this.apps.clear();
    this.socketToApp.clear();
  }

  private notifyListeners(event: "connected" | "disconnected", app: RegisteredApp): void {
    for (const listener of this.listeners) {
      try {
        listener(event, {
          appId: app.appId,
          appName: app.appName,
          appVersion: app.appVersion,
          hexDIVersion: app.hexDIVersion,
          connectedAt: app.connectedAt,
        });
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * Listener for client registry events.
 */
export type ClientRegistryListener = (
  event: "connected" | "disconnected",
  app: AppInfo
) => void;
