/**
 * ClientRegistry - Platform-agnostic client tracking for DevTools.
 *
 * Manages registered apps and their connections without coupling to
 * specific WebSocket implementations.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Registered app information.
 */
export interface RegisteredApp<TSocket = unknown> {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly hexDIVersion: string;
  readonly connectedAt: number;
  readonly socket: TSocket;
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

/**
 * Listener for client registry events.
 */
export type ClientRegistryListener = (
  event: "connected" | "disconnected",
  app: AppInfo
) => void;

// =============================================================================
// ClientRegistry
// =============================================================================

/**
 * Registry for tracking connected DevTools clients.
 *
 * Platform-agnostic implementation that works with any socket type.
 * The socket type is generic to support both Node.js WebSocket and
 * browser WebSocket implementations.
 *
 * @example
 * ```typescript
 * const registry = new ClientRegistry<WebSocket>();
 *
 * registry.addListener((event, app) => {
 *   console.log(`App ${app.appId} ${event}`);
 * });
 *
 * registry.registerApp(socket, 'my-app', 'My App', '1.0.0', '1.0.0');
 * ```
 */
export class ClientRegistry<TSocket = unknown> {
  private readonly apps = new Map<string, RegisteredApp<TSocket>>();
  private readonly socketToApp = new Map<TSocket, string>();
  private readonly listeners = new Set<ClientRegistryListener>();

  /**
   * Register an app connection.
   *
   * @param socket - The socket connection for this app
   * @param appId - Unique identifier for the app
   * @param appName - Display name of the app
   * @param appVersion - Version of the app
   * @param hexDIVersion - Version of HexDI being used
   */
  registerApp(
    socket: TSocket,
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

    const app: RegisteredApp<TSocket> = {
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
   *
   * @param socket - The socket connection to unregister
   */
  unregisterBySocket(socket: TSocket): void {
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
   *
   * @param appId - The app ID to unregister
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
   *
   * @param appId - The app ID to look up
   * @returns The registered app or undefined
   */
  getApp(appId: string): RegisteredApp<TSocket> | undefined {
    return this.apps.get(appId);
  }

  /**
   * Get an app by socket.
   *
   * @param socket - The socket to look up
   * @returns The registered app or undefined
   */
  getAppBySocket(socket: TSocket): RegisteredApp<TSocket> | undefined {
    const appId = this.socketToApp.get(socket);
    if (appId === undefined) return undefined;
    return this.apps.get(appId);
  }

  /**
   * List all connected apps.
   *
   * @returns Array of app info (without socket references)
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
   *
   * @param appId - The app ID to check
   * @returns True if the app is connected
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
   *
   * @param listener - Function to call on connect/disconnect events
   */
  addListener(listener: ClientRegistryListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener.
   *
   * @param listener - The listener to remove
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

  /**
   * Notify listeners of an event.
   */
  private notifyListeners(event: "connected" | "disconnected", app: RegisteredApp<TSocket>): void {
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
