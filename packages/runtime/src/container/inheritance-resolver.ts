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
import type { ForkedEntry, ParentContainerLike } from "./internal-types.js";
import { isForkedEntryForPort } from "./internal-types.js";

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
    const forkedInstance = this.shallowClone(parentInstance) as InferService<P>;
    const entry: ForkedEntry<P> = { port, instance: forkedInstance };
    this.forkedInstances.set(portName, entry as ForkedEntry<Port<unknown, string>>);
    return forkedInstance;
  }

  /**
   * Creates a shallow clone of an object, preserving its prototype.
   */
  private shallowClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    const prototype: object | null = Reflect.getPrototypeOf(obj);
    const shell: Record<PropertyKey, never> = {};
    Reflect.setPrototypeOf(shell, prototype);
    return Object.assign(shell, obj);
  }
}
