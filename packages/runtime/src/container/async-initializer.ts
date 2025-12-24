/**
 * AsyncInitializer - Manages async adapter initialization with priority ordering.
 *
 * Encapsulates the initialization lifecycle:
 * - Tracks which ports have async factories
 * - Sorts adapters by initialization priority
 * - Provides idempotent initialization with promise deduplication
 * - Enhances errors with initialization context
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/ports";
import { AsyncFactoryError } from "../common/errors.js";
import type { RuntimeAdapter } from "./internal-types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving async ports during initialization.
 *
 * Returns `Promise<unknown>` because initialization doesn't need the
 * specific service type - it just ensures the service is created.
 *
 * @internal
 */
export type AsyncInitializationResolver = (port: Port<unknown, string>) => Promise<unknown>;

// =============================================================================
// AsyncInitializer Class
// =============================================================================

/**
 * Manages async adapter initialization with priority-based ordering.
 *
 * Key features:
 * - **Priority sorting**: Adapters are initialized in priority order (lower first)
 * - **Stable ordering**: When priorities are equal, original registration order is preserved
 * - **Idempotent**: Multiple initialize() calls share the same promise
 * - **Error enhancement**: Adds initialization step context to errors
 *
 * @example
 * ```typescript
 * const initializer = new AsyncInitializer();
 *
 * // Register adapters during graph processing
 * initializer.registerAdapter(dbAdapter, 0);
 * initializer.registerAdapter(cacheAdapter, 1);
 *
 * // Initialize all async services
 * await initializer.initialize(port => container.resolveAsyncInternal(port));
 *
 * // Check if a port requires async initialization
 * if (initializer.hasAsyncPort(port)) {
 *   // Handle async port
 * }
 * ```
 *
 * @internal
 */
export class AsyncInitializer {
  /**
   * Set of ports that have async factories.
   */
  private readonly asyncPorts: Set<Port<unknown, string>> = new Set();

  /**
   * Async adapters sorted by initialization priority.
   */
  private readonly asyncAdapters: Array<{ adapter: RuntimeAdapter; index: number }> = [];

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
   * @param insertionIndex - Original insertion order for stable sorting
   */
  registerAdapter(adapter: RuntimeAdapter, insertionIndex: number): void {
    this.asyncPorts.add(adapter.provides);
    this.asyncAdapters.push({ adapter, index: insertionIndex });
  }

  /**
   * Finalizes adapter registration by sorting by priority.
   *
   * Call this after all adapters have been registered and before initialize().
   * Sorting is stable: when priorities are equal, original insertion order is preserved.
   */
  finalizeRegistration(): void {
    // Sort async adapters by priority with stable ordering:
    // 1. Lower priority values are initialized first
    // 2. When priorities are equal, original insertion order is preserved
    // This ensures deterministic initialization order, even after merge operations
    this.asyncAdapters.sort((a, b) => {
      const priorityA = a.adapter.initPriority ?? 100;
      const priorityB = b.adapter.initPriority ?? 100;
      const delta = priorityA - priorityB;
      return delta !== 0 ? delta : a.index - b.index;
    });
  }

  /**
   * Checks if a port has an async factory requiring initialization.
   *
   * @param port - The port to check
   * @returns True if the port requires async initialization
   */
  hasAsyncPort(port: Port<unknown, string>): boolean {
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
   * Initializes all async adapters in priority order.
   *
   * This method is idempotent - multiple concurrent calls share the same promise.
   * Each adapter is resolved sequentially to ensure proper dependency ordering.
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
   * Executes the actual initialization sequence.
   */
  private async executeInitialization(resolveAsync: AsyncInitializationResolver): Promise<void> {
    const totalAdapters = this.asyncAdapters.length;

    for (let i = 0; i < totalAdapters; i++) {
      const entry = this.asyncAdapters[i];
      const adapter = entry.adapter;

      try {
        await resolveAsync(adapter.provides);
      } catch (error) {
        // Enhance error with initialization context if not already an AsyncFactoryError
        if (error instanceof AsyncFactoryError) {
          throw error;
        }

        // Add initialization context to the error message
        const portName = adapter.provides.__portName;
        const contextMessage =
          error instanceof Error
            ? `${error.message} (initialization step ${i + 1}/${totalAdapters})`
            : String(error);

        throw new AsyncFactoryError(portName, new Error(contextMessage));
      }
    }

    this.initialized = true;
  }
}
