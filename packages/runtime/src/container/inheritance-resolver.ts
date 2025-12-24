/**
 * InheritanceResolver - Handles child container inheritance modes.
 *
 * Encapsulates the resolution logic for child containers that inherit
 * from a parent container with different inheritance modes:
 * - shared: Use parent's instance directly
 * - forked: Shallow clone of parent's instance (cached per port)
 * - isolated: Delegated back to container (requires full type context)
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/ports";
import type { InheritanceMode } from "../types.js";
import type { ForkedEntry, ParentContainerLike, RuntimeAdapterFor } from "./internal-types.js";
import { isForkedEntryForPort, isAdapterForPort } from "./internal-types.js";
import { shallowClone } from "./helpers.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of inheritance resolution attempt.
 * Uses discriminated union for type-safe handling.
 * @internal
 */
export type InheritanceResult<T> =
  | { readonly resolved: true; readonly value: T }
  | { readonly resolved: false; readonly mode: "isolated" };

/**
 * Callback for creating isolated instances when an adapter is available.
 *
 * Called by InheritanceResolver when:
 * - Port is in isolated mode
 * - Parent has an adapter for the port
 *
 * The callback is responsible for:
 * - Resolving dependencies using the child container's resolution
 * - Creating the instance with the adapter's factory
 * - Memoization (typically in singleton memo)
 *
 * @internal
 */
export type IsolatedInstanceCreator<TProvides extends Port<unknown, string>> = <
  P extends TProvides,
>(
  port: P,
  adapter: RuntimeAdapterFor<P>
) => InferService<P>;

// =============================================================================
// InheritanceResolver Class
// =============================================================================

/**
 * Manages child container inheritance mode resolution for shared and forked modes.
 *
 * This class handles two of the three inheritance modes:
 * - **shared**: Returns parent's singleton instance directly
 * - **forked**: Creates and caches a shallow clone of parent's instance
 *
 * The **isolated** mode is handled by the container itself since it requires
 * full access to the container's resolution machinery and type parameters.
 *
 * @example
 * ```typescript
 * const resolver = new InheritanceResolver(parentContainer, inheritanceModes);
 *
 * const result = resolver.tryResolve(port);
 * if (result.resolved) {
 *   return result.value; // shared or forked instance
 * } else {
 *   return this.createIsolatedInstance(port); // handle in container
 * }
 * ```
 *
 * @internal
 */
export class InheritanceResolver<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  /**
   * Cache for forked instances (shallow clones of parent instances).
   */
  private readonly forkedInstances: Map<string, ForkedEntry<Port<unknown, string>>> = new Map();

  /**
   * Creates a new InheritanceResolver.
   *
   * @param parentContainer - The parent container to inherit from
   * @param inheritanceModes - Map of port names to their inheritance modes
   */
  constructor(
    private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts>,
    private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Gets the inheritance mode for a port.
   *
   * @param portName - The port name to check
   * @returns The inheritance mode, defaulting to 'shared'
   */
  getMode(portName: string): InheritanceMode {
    return this.inheritanceModes.get(portName) ?? "shared";
  }

  /**
   * Attempts to resolve a port using shared or forked mode.
   * Returns a discriminated union indicating success or need for isolated handling.
   *
   * @param port - The port to resolve
   * @returns Resolution result with value for shared/forked, or mode indicator for isolated
   * @deprecated Use resolveWithCallback for consistent callback pattern
   */
  tryResolve<P extends TProvides>(port: P): InheritanceResult<InferService<P>> {
    const portName = port.__portName;
    const mode = this.getMode(portName);

    switch (mode) {
      case "shared":
        return {
          resolved: true,
          value: this.resolveShared(port),
        };

      case "forked":
        return {
          resolved: true,
          value: this.resolveForked(port, portName),
        };

      case "isolated":
        return { resolved: false, mode: "isolated" };

      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
  }

  /**
   * Resolves a port using the appropriate inheritance mode with callback for isolated mode.
   *
   * This method encapsulates all inheritance resolution:
   * - **shared**: Returns parent's singleton instance directly
   * - **forked**: Returns cached shallow clone of parent's instance
   * - **isolated**: Creates new instance using callback (or clones parent as fallback)
   *
   * @example
   * ```typescript
   * const service = resolver.resolveWithCallback(port, (p, adapter) => {
   *   // Create isolated instance with adapter
   *   return createInstanceWithDeps(p, adapter);
   * });
   * ```
   *
   * @param port - The port to resolve
   * @param createIsolated - Callback to create instance when adapter is available
   * @returns The resolved service instance with full type inference
   */
  resolveWithCallback<P extends TProvides>(
    port: P,
    createIsolated: IsolatedInstanceCreator<TProvides>
  ): InferService<P> {
    const portName = port.__portName;
    const mode = this.getMode(portName);

    switch (mode) {
      case "shared":
        return this.resolveShared(port);

      case "forked":
        return this.resolveForked(port, portName);

      case "isolated":
        return this.resolveIsolated(port, createIsolated);

      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
  }

  /**
   * Resolves using shared mode for resolveInternal calls.
   * Used when a scope calls resolveInternal on the container.
   *
   * @param port - The port to resolve
   * @returns The resolved service from parent
   */
  resolveSharedInternal<P extends TProvides>(port: P): InferService<P> {
    return this.parentContainer.resolveInternal(port) as InferService<P>;
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Resolves using shared mode - delegates directly to parent.
   */
  private resolveShared<P extends TProvides>(port: P): InferService<P> {
    return this.parentContainer.resolveInternal(port) as InferService<P>;
  }

  /**
   * Resolves using forked mode - shallow clone of parent instance.
   */
  private resolveForked<P extends TProvides>(port: P, portName: string): InferService<P> {
    const cached = this.forkedInstances.get(portName);
    if (cached !== undefined && isForkedEntryForPort(cached, port)) {
      return cached.instance;
    }

    const parentInstance = this.parentContainer.resolveInternal(port);
    const forkedInstance = shallowClone(parentInstance) as InferService<P>;
    const entry: ForkedEntry<P> = { port, instance: forkedInstance };
    this.forkedInstances.set(portName, entry as ForkedEntry<Port<unknown, string>>);
    return forkedInstance;
  }

  /**
   * Resolves using isolated mode - new instance with child's dependency resolution.
   *
   * If parent has an adapter for the port, uses the callback to create the instance.
   * Otherwise, falls back to shallow cloning the parent's instance.
   */
  private resolveIsolated<P extends TProvides>(
    port: P,
    createIsolated: IsolatedInstanceCreator<TProvides>
  ): InferService<P> {
    const adapter = this.parentContainer[ADAPTER_ACCESS](port);

    if (adapter === undefined) {
      // Fallback: clone parent instance when no adapter is available
      const parentInstance = this.parentContainer.resolveInternal(port);
      return shallowClone(parentInstance) as InferService<P>;
    }

    if (!isAdapterForPort(adapter, port)) {
      throw new Error(`Adapter mismatch for port ${port.__portName}.`);
    }

    return createIsolated(port, adapter);
  }
}
