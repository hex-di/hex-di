/**
 * AsyncInitializer - Manages async adapter initialization with topological ordering.
 *
 * Uses dependency graph analysis to automatically determine initialization order:
 * - Adapters with no async dependencies initialize first
 * - Adapters are grouped into levels based on dependency depth
 * - Each level is initialized in parallel for maximum performance
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/core";
import { AsyncFactoryError } from "../../errors/index.js";
import type { RuntimeAdapter } from "../internal-types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving async ports during initialization.
 * @internal
 */
export type AsyncInitializationResolver = (port: Port<string, unknown>) => Promise<unknown>;

/**
 * A level of adapters that can be initialized in parallel.
 * All adapters in a level have their dependencies satisfied by previous levels.
 * @internal
 */
type InitLevel = RuntimeAdapter[];

// =============================================================================
// AsyncInitializer Class
// =============================================================================

/**
 * Manages async adapter initialization with automatic topological ordering.
 *
 * Key features:
 * - **Automatic ordering**: Uses dependency graph to compute initialization order
 * - **Parallel initialization**: Adapters at the same level initialize concurrently
 * - **Idempotent**: Multiple initialize() calls share the same promise
 * - **Error enhancement**: Adds initialization context to errors
 *
 * The initialization algorithm:
 * 1. Build adjacency list from adapter dependencies
 * 2. Compute initialization levels using Kahn's algorithm
 * 3. Initialize each level in parallel with Promise.all()
 *
 * @example
 * ```typescript
 * const initializer = new AsyncInitializer();
 *
 * // Register adapters during graph processing
 * initializer.registerAdapter(dbAdapter);
 * initializer.registerAdapter(cacheAdapter);
 *
 * // Finalize computes initialization levels
 * initializer.finalizeRegistration();
 *
 * // Initialize all async services (automatic ordering + parallel)
 * await initializer.initialize(port => container.resolveAsyncInternal(port));
 * ```
 *
 * @internal
 */
export class AsyncInitializer {
  /**
   * Set of ports that have async factories.
   */
  private readonly asyncPorts: Set<Port<string, unknown>> = new Set();

  /**
   * Registered async adapters (unordered, populated during registration).
   */
  private readonly asyncAdapters: RuntimeAdapter[] = [];

  /**
   * Initialization levels computed by topological sort.
   * Level 0 has no async dependencies, Level 1 depends only on Level 0, etc.
   */
  private initLevels: InitLevel[] = [];

  /**
   * Whether initialization has completed successfully.
   */
  private initialized: boolean = false;

  /**
   * Active initialization promise for deduplication.
   */
  private initializationPromise: Promise<void> | null = null;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Whether all async adapters have been initialized.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Registers an async adapter for initialization.
   *
   * @param adapter - The async adapter to register
   */
  registerAdapter(adapter: RuntimeAdapter): void {
    this.asyncPorts.add(adapter.provides);
    this.asyncAdapters.push(adapter);
  }

  /**
   * Finalizes adapter registration by computing initialization levels.
   *
   * Uses Kahn's algorithm to produce a topological ordering grouped into levels.
   * Adapters at the same level can be initialized in parallel.
   */
  finalizeRegistration(): void {
    this.initLevels = this.computeInitLevels();
  }

  /**
   * Checks if a port has an async factory requiring initialization.
   *
   * @param port - The port to check
   * @returns True if the port requires async initialization
   */
  hasAsyncPort(port: Port<string, unknown>): boolean {
    return this.asyncPorts.has(port);
  }

  /**
   * Marks the initializer as already initialized.
   *
   * Used for child containers that inherit initialization state from parent.
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Initializes all async adapters in topological order with parallel execution.
   *
   * This method is idempotent - multiple concurrent calls share the same promise.
   * Each level is initialized in parallel using Promise.all().
   *
   * @param resolveAsync - Callback to resolve each async port
   * @throws AsyncFactoryError if any adapter factory fails
   */
  async initialize(resolveAsync: AsyncInitializationResolver): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise !== null) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.executeInitialization(resolveAsync);

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Computes initialization levels using Kahn's algorithm.
   *
   * @returns Array of levels, where each level contains adapters that can be initialized in parallel
   */
  private computeInitLevels(): InitLevel[] {
    if (this.asyncAdapters.length === 0) {
      return [];
    }

    // Map port name to adapter for quick lookup
    const adapterByPortName = new Map<string, RuntimeAdapter>();
    for (const adapter of this.asyncAdapters) {
      adapterByPortName.set(adapter.provides.__portName, adapter);
    }

    // Compute in-degree for each async adapter (count of async dependencies)
    const inDegree = new Map<string, number>();
    for (const adapter of this.asyncAdapters) {
      const portName = adapter.provides.__portName;
      let degree = 0;

      for (const requiredPort of adapter.requires) {
        // Only count dependencies on other async adapters
        if (this.asyncPorts.has(requiredPort)) {
          degree++;
        }
      }

      inDegree.set(portName, degree);
    }

    // Kahn's algorithm: process nodes level by level
    const levels: InitLevel[] = [];
    const processed = new Set<string>();

    while (processed.size < this.asyncAdapters.length) {
      // Find all adapters with in-degree 0 (no unprocessed dependencies)
      const currentLevel: RuntimeAdapter[] = [];

      for (const adapter of this.asyncAdapters) {
        const portName = adapter.provides.__portName;
        if (!processed.has(portName) && inDegree.get(portName) === 0) {
          currentLevel.push(adapter);
        }
      }

      // Detect circular dependency (should never happen if graph validation passed)
      if (currentLevel.length === 0) {
        const remaining = this.asyncAdapters
          .filter(a => !processed.has(a.provides.__portName))
          .map(a => a.provides.__portName);
        throw new Error(
          `Circular dependency detected among async adapters: ${remaining.join(", ")}`
        );
      }

      // Mark current level as processed and update in-degrees
      for (const adapter of currentLevel) {
        const portName = adapter.provides.__portName;
        processed.add(portName);

        // Decrement in-degree for all adapters that depend on this one
        for (const otherAdapter of this.asyncAdapters) {
          if (processed.has(otherAdapter.provides.__portName)) {
            continue;
          }

          for (const requiredPort of otherAdapter.requires) {
            if (requiredPort.__portName === portName) {
              const otherPortName = otherAdapter.provides.__portName;
              inDegree.set(otherPortName, (inDegree.get(otherPortName) ?? 0) - 1);
            }
          }
        }
      }

      levels.push(currentLevel);
    }

    return levels;
  }

  /**
   * Executes the actual initialization sequence.
   */
  private async executeInitialization(resolveAsync: AsyncInitializationResolver): Promise<void> {
    const totalAdapters = this.asyncAdapters.length;
    let completedCount = 0;

    for (const level of this.initLevels) {
      // Initialize all adapters in this level in parallel
      const levelPromises = level.map(async adapter => {
        const portName = adapter.provides.__portName;

        try {
          await resolveAsync(adapter.provides);
        } catch (error) {
          // Enhance error with initialization context if not already an AsyncFactoryError
          if (error instanceof AsyncFactoryError) {
            throw error;
          }

          const contextMessage =
            error instanceof Error
              ? `${error.message} (initialization step ${completedCount + 1}/${totalAdapters})`
              : String(error);

          throw new AsyncFactoryError(portName, new Error(contextMessage));
        }
      });

      // Wait for entire level to complete before moving to next
      await Promise.all(levelPromises);
      completedCount += level.length;
    }

    this.initialized = true;
  }
}
