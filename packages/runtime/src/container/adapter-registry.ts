/**
 * AdapterRegistry - Centralized adapter lookup and registration.
 *
 * Simple registry that owns adapter storage and lookup logic:
 * - Local adapters (registered directly or via overrides/extensions)
 * - Parent fallback (for child containers)
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/ports";
import type { RuntimeAdapter, ParentContainerLike } from "./internal-types.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

/**
 * Centralized registry for adapter lookup and registration.
 *
 * Simplifies the scattered adapter access in ContainerImpl by providing:
 * - **register**: Add an adapter for a port
 * - **get**: Get adapter, checking local first then parent
 * - **isLocal**: Check if port was registered locally (not inherited)
 * - **entries**: Iterate over local adapters
 *
 * @example
 * ```typescript
 * const registry = new AdapterRegistry(parentContainer);
 *
 * // Register local adapters
 * registry.register(port, adapter);
 *
 * // Get adapter (checks local, then parent)
 * const adapter = registry.get(port);
 *
 * // Check if locally registered
 * if (registry.isLocal(port)) {
 *   // Handle local resolution
 * }
 * ```
 *
 * @internal
 */
export class AdapterRegistry<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  /**
   * Local adapter map (overrides, extensions, or root adapters).
   */
  private readonly adapters: Map<Port<unknown, string>, RuntimeAdapter> = new Map();

  /**
   * Set of ports registered locally (not inherited from parent).
   */
  private readonly localPorts: Set<Port<unknown, string>> = new Set();

  /**
   * Creates a new AdapterRegistry.
   *
   * @param parent - Optional parent container for fallback lookup
   */
  constructor(
    private readonly parent: ParentContainerLike<TParentProvides, TAsyncPorts> | null = null
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Registers an adapter for a port.
   *
   * @param port - The port to register
   * @param adapter - The adapter providing the service
   * @param markLocal - Whether to mark this as a local registration (default: true)
   */
  register(port: Port<unknown, string>, adapter: RuntimeAdapter, markLocal: boolean = true): void {
    this.adapters.set(port, adapter);
    if (markLocal) {
      this.localPorts.add(port);
    }
  }

  /**
   * Gets an adapter for a port, checking local first then parent.
   *
   * @param port - The port to look up
   * @returns The adapter or undefined if not found
   */
  get(port: Port<unknown, string>): RuntimeAdapter | undefined {
    const local = this.adapters.get(port);
    if (local !== undefined) {
      return local;
    }
    if (this.parent !== null) {
      return this.parent[ADAPTER_ACCESS](port);
    }
    return undefined;
  }

  /**
   * Checks if a port has an adapter registered (locally or in parent).
   *
   * @param port - The port to check
   * @returns True if an adapter exists
   */
  has(port: Port<unknown, string>): boolean {
    return this.get(port) !== undefined;
  }

  /**
   * Checks if a port was registered locally (not inherited from parent).
   *
   * @param port - The port to check
   * @returns True if registered locally
   */
  isLocal(port: Port<unknown, string>): boolean {
    return this.localPorts.has(port);
  }

  /**
   * Checks if a port should be resolved locally.
   *
   * For root containers: all adapters are local.
   * For child containers: only overrides and extensions are local.
   *
   * @param port - The port to check
   * @param isRoot - Whether this is a root container
   * @returns True if should resolve locally
   */
  shouldResolveLocally(port: Port<unknown, string>, isRoot: boolean): boolean {
    if (isRoot) {
      return this.adapters.has(port);
    }
    return this.localPorts.has(port);
  }

  /**
   * Gets the local adapter for a port (ignores parent).
   *
   * @param port - The port to look up
   * @returns The local adapter or undefined
   */
  getLocal(port: Port<unknown, string>): RuntimeAdapter | undefined {
    return this.adapters.get(port);
  }

  /**
   * Iterates over local adapters.
   */
  entries(): IterableIterator<[Port<unknown, string>, RuntimeAdapter]> {
    return this.adapters.entries();
  }

  /**
   * Gets the number of locally registered adapters.
   */
  get size(): number {
    return this.adapters.size;
  }
}
