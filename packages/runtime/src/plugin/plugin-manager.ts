/**
 * Plugin lifecycle manager for @hex-di/runtime.
 *
 * Manages plugin initialization, hook composition, and disposal:
 * - Topological sort for dependency-aware initialization order
 * - Hook composition with before/after ordering semantics
 * - Scope event emission to all plugins
 * - LIFO disposal order
 *
 * @packageDocumentation
 */

import type {
  AnyPlugin,
  PluginDependency,
  PluginHooks,
  ScopeEventEmitter,
  ScopeEventInfo,
  ChildContainerInfo,
  ContainerInfo,
} from "./types.js";
import type { ResolutionHookContext, ResolutionResultContext } from "../resolution/hooks.js";
import type { InternalAccessible } from "../inspector/types.js";
import {
  PluginDependencyMissingError,
  PluginCircularDependencyError,
  PluginInitializationError,
  PluginAlreadyRegisteredError,
  PluginNotFoundError,
} from "./errors.js";
import { extractRequiredSymbols, getDependencyName } from "./validation.js";

// =============================================================================
// Composed Hooks Type
// =============================================================================

/**
 * Composed hooks from all plugins.
 *
 * If any plugin provides hooks, this object contains the composed callbacks.
 * Returns null from getComposedHooks() when no plugins have hooks.
 */
export interface ComposedHooks {
  readonly beforeResolve?: (context: ResolutionHookContext) => void;
  readonly afterResolve?: (context: ResolutionResultContext) => void;
}

/**
 * Internal context type for plugin initialization.
 *
 * This is the runtime representation passed to plugin createApi functions.
 * Type safety is enforced at the definePlugin call site through the generic
 * PluginContext<TRequired, TOptional> type in the createApi signature.
 *
 * @internal
 */
interface InternalPluginContext {
  getDependency: (symbol: symbol) => unknown;
  getOptionalDependency: (symbol: symbol) => unknown | undefined;
  hasPlugin: (symbol: symbol) => boolean;
  readonly scopeEvents: ScopeEventEmitter;
  onDispose: (callback: () => void | Promise<void>) => void;
  getContainer: () => InternalAccessible;
}

// =============================================================================
// Scope Event Emitter Implementation
// =============================================================================

/**
 * Internal implementation of ScopeEventEmitter.
 * @internal
 */
class ScopeEventEmitterImpl implements ScopeEventEmitter {
  private readonly createdListeners: Array<(scope: ScopeEventInfo) => void> = [];
  private readonly disposingListeners: Array<(scope: ScopeEventInfo) => void> = [];
  private readonly disposedListeners: Array<(scope: ScopeEventInfo) => void> = [];

  onScopeCreated(listener: (scope: ScopeEventInfo) => void): () => void {
    this.createdListeners.push(listener);
    return () => {
      const idx = this.createdListeners.indexOf(listener);
      if (idx !== -1) this.createdListeners.splice(idx, 1);
    };
  }

  onScopeDisposing(listener: (scope: ScopeEventInfo) => void): () => void {
    this.disposingListeners.push(listener);
    return () => {
      const idx = this.disposingListeners.indexOf(listener);
      if (idx !== -1) this.disposingListeners.splice(idx, 1);
    };
  }

  onScopeDisposed(listener: (scope: ScopeEventInfo) => void): () => void {
    this.disposedListeners.push(listener);
    return () => {
      const idx = this.disposedListeners.indexOf(listener);
      if (idx !== -1) this.disposedListeners.splice(idx, 1);
    };
  }

  emitCreated(scope: ScopeEventInfo): void {
    for (const listener of this.createdListeners) {
      listener(scope);
    }
  }

  emitDisposing(scope: ScopeEventInfo): void {
    for (const listener of this.disposingListeners) {
      listener(scope);
    }
  }

  emitDisposed(scope: ScopeEventInfo): void {
    for (const listener of this.disposedListeners) {
      listener(scope);
    }
  }
}

// =============================================================================
// Plugin Manager
// =============================================================================

/**
 * Manages plugin lifecycle and hook composition.
 *
 * Responsibilities:
 * - Validates plugin dependencies (no missing, no circular)
 * - Topologically sorts plugins by dependencies
 * - Initializes plugins in dependency order
 * - Composes hooks from all plugins
 * - Disposes plugins in reverse order
 * - Emits scope lifecycle events
 *
 * @example
 * ```typescript
 * const manager = new PluginManager();
 * await manager.initialize([TracingPlugin, MetricsPlugin]);
 *
 * const tracingApi = manager.getApi<TracingAPI>(TRACING);
 * const hooks = manager.getComposedHooks();
 *
 * // Later...
 * await manager.dispose();
 * ```
 */
export class PluginManager {
  /** Plugins in initialization order (after topological sort) */
  private readonly initializedPlugins: AnyPlugin[] = [];

  /** Symbol -> API mapping */
  private readonly apis: Map<symbol, unknown> = new Map();

  /** Symbol -> Plugin mapping (for createChildApis lookup) */
  private readonly pluginsBySymbol: Map<symbol, AnyPlugin> = new Map();

  /** Disposal callbacks (LIFO order) */
  private readonly disposeCallbacks: Array<() => void | Promise<void>> = [];

  /** Scope event emitter shared with all plugins */
  private readonly scopeEvents = new ScopeEventEmitterImpl();

  /** Composed hooks, null if no plugins have hooks */
  private composedHooks: ComposedHooks | null = null;

  /** Whether the manager has been disposed */
  private isDisposed = false;

  /** Reference to the container for plugin access */
  private containerRef: InternalAccessible | null = null;

  /**
   * Initializes all plugins in dependency order.
   *
   * @param plugins - Array of plugins to initialize
   * @param container - The container being augmented (for plugin access)
   * @throws {PluginAlreadyRegisteredError} If a plugin symbol is duplicated
   * @throws {PluginDependencyMissingError} If a required dependency is missing
   * @throws {PluginCircularDependencyError} If circular dependencies exist
   * @throws {PluginInitializationError} If a plugin's createApi throws
   */
  initialize(plugins: readonly AnyPlugin[], container: InternalAccessible): void {
    // Store container reference for plugin access
    this.containerRef = container;

    if (plugins.length === 0) {
      return;
    }

    // Check for duplicates
    this.checkForDuplicates(plugins);

    // Topologically sort by dependencies
    const sorted = this.topologicalSort(plugins);

    // Initialize in sorted order
    for (const plugin of sorted) {
      this.initializePlugin(plugin);
    }

    // Compose hooks from all plugins
    this.composedHooks = this.composeHooks();
  }

  /**
   * Gets a plugin's API by its symbol.
   *
   * @typeParam T - The expected API type
   * @param symbol - The plugin's symbol
   * @returns The plugin's API
   * @throws {PluginNotFoundError} If no plugin is registered with that symbol
   */
  getApi<T>(symbol: symbol): T {
    const api = this.apis.get(symbol);
    if (api === undefined) {
      throw new PluginNotFoundError(symbol);
    }
    return api as T;
  }

  /**
   * Checks if a plugin is registered.
   *
   * @param symbol - The plugin's symbol
   * @returns true if the plugin is registered
   */
  hasPlugin(symbol: symbol): boolean {
    return this.apis.has(symbol);
  }

  /**
   * Gets composed hooks from all plugins.
   *
   * @returns Composed hooks object, or null if no plugins have hooks
   */
  getComposedHooks(): ComposedHooks | null {
    return this.composedHooks;
  }

  /**
   * Gets the symbol -> API map.
   *
   * @returns ReadonlyMap of symbol to API
   */
  getSymbolApis(): ReadonlyMap<symbol, unknown> {
    return this.apis;
  }

  /**
   * Creates plugin APIs for a child container.
   *
   * For plugins that implement `createApiForChild`, creates new API instances
   * bound to the child container. For plugins without this method, returns
   * the parent's API (shared behavior).
   *
   * @param childContainer - The child container being created
   * @returns Map of symbol to API for the child container
   */
  createChildApis(childContainer: InternalAccessible): ReadonlyMap<symbol, unknown> {
    const childApis = new Map<symbol, unknown>();

    for (const [symbol, parentApi] of this.apis.entries()) {
      const plugin = this.pluginsBySymbol.get(symbol);

      if (plugin?.createApiForChild !== undefined && this.containerRef !== null) {
        // Create child-specific API
        const childApi = plugin.createApiForChild(childContainer, parentApi, this.containerRef);
        childApis.set(symbol, Object.freeze(childApi));
      } else {
        // Share parent's API (existing behavior)
        childApis.set(symbol, parentApi);
      }
    }

    return childApis;
  }

  /**
   * Disposes all plugins in reverse initialization order.
   *
   * Calls each plugin's dispose method (if any) and then all
   * registered disposal callbacks in LIFO order.
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    // Dispose plugins in reverse order
    for (let i = this.initializedPlugins.length - 1; i >= 0; i--) {
      const plugin = this.initializedPlugins[i];
      if (plugin.dispose) {
        try {
          await plugin.dispose();
        } catch {
          // Plugin disposal errors are swallowed to ensure all plugins get disposed
        }
      }
    }

    // Run disposal callbacks in LIFO order
    for (let i = this.disposeCallbacks.length - 1; i >= 0; i--) {
      try {
        await this.disposeCallbacks[i]();
      } catch {
        // Disposal callback errors are swallowed
      }
    }

    // Clear state
    this.apis.clear();
    this.initializedPlugins.length = 0;
    this.disposeCallbacks.length = 0;
    this.composedHooks = null;
  }

  /**
   * Emits scope created event to all plugins.
   *
   * @param scope - Information about the created scope
   */
  emitScopeCreated(scope: ScopeEventInfo): void {
    this.scopeEvents.emitCreated(scope);

    // Also call plugin hooks
    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.onScopeCreated) {
        plugin.hooks.onScopeCreated(scope);
      }
    }
  }

  /**
   * Emits scope disposing event to all plugins.
   *
   * @param scope - Information about the scope being disposed
   */
  emitScopeDisposing(scope: ScopeEventInfo): void {
    this.scopeEvents.emitDisposing(scope);

    // Also call plugin hooks
    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.onScopeDisposing) {
        plugin.hooks.onScopeDisposing(scope);
      }
    }
  }

  /**
   * Emits scope disposed event to all plugins.
   *
   * @param scope - Information about the disposed scope
   */
  emitScopeDisposed(scope: ScopeEventInfo): void {
    this.scopeEvents.emitDisposed(scope);

    // Also call plugin hooks
    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.onScopeDisposed) {
        plugin.hooks.onScopeDisposed(scope);
      }
    }
  }

  /**
   * Emits child container created event to all plugins.
   *
   * @param info - Information about the created child container
   */
  emitChildCreated(info: ChildContainerInfo): void {
    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.onChildCreated) {
        plugin.hooks.onChildCreated(info);
      }
    }
  }

  /**
   * Emits container disposed event to all plugins.
   *
   * @param info - Information about the disposed container
   */
  emitContainerDisposed(info: ContainerInfo): void {
    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.onContainerDisposed) {
        plugin.hooks.onContainerDisposed(info);
      }
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Checks for duplicate plugin symbols.
   */
  private checkForDuplicates(plugins: readonly AnyPlugin[]): void {
    const seen = new Map<symbol, string>();
    for (const plugin of plugins) {
      const existing = seen.get(plugin.symbol);
      if (existing !== undefined) {
        throw new PluginAlreadyRegisteredError(plugin.name, plugin.symbol);
      }
      seen.set(plugin.symbol, plugin.name);
    }
  }

  /**
   * Performs topological sort using Kahn's algorithm.
   *
   * @returns Plugins sorted in dependency order
   */
  private topologicalSort(plugins: readonly AnyPlugin[]): AnyPlugin[] {
    // Build symbol -> plugin map
    const pluginBySymbol = new Map<symbol, AnyPlugin>();
    for (const plugin of plugins) {
      pluginBySymbol.set(plugin.symbol, plugin);
    }

    // Calculate in-degrees (number of dependencies)
    const inDegree = new Map<symbol, number>();
    const dependents = new Map<symbol, symbol[]>();

    for (const plugin of plugins) {
      const symbol = plugin.symbol;
      if (!inDegree.has(symbol)) {
        inDegree.set(symbol, 0);
      }
      if (!dependents.has(symbol)) {
        dependents.set(symbol, []);
      }

      const requiredSymbols = extractRequiredSymbols(plugin);
      for (const reqSymbol of requiredSymbols) {
        // Check if required plugin exists
        if (!pluginBySymbol.has(reqSymbol)) {
          const dep = plugin.requires.find(d => d.symbol === reqSymbol);
          const depName = dep?.name ?? "unknown";
          const reason = dep?.reason ?? "required dependency";
          throw new PluginDependencyMissingError(plugin.name, depName, reqSymbol, reason);
        }

        // Increment in-degree
        inDegree.set(symbol, (inDegree.get(symbol) ?? 0) + 1);

        // Track dependents for processing
        const deps = dependents.get(reqSymbol) ?? [];
        deps.push(symbol);
        dependents.set(reqSymbol, deps);
      }
    }

    // Find all plugins with no dependencies (in-degree = 0)
    const queue: symbol[] = [];
    for (const [symbol, degree] of inDegree) {
      if (degree === 0) {
        queue.push(symbol);
      }
    }

    // Process queue
    const sorted: AnyPlugin[] = [];
    while (queue.length > 0) {
      const symbol = queue.shift()!;
      const plugin = pluginBySymbol.get(symbol);
      if (plugin) {
        sorted.push(plugin);
      }

      // Reduce in-degree of dependents
      const deps = dependents.get(symbol) ?? [];
      for (const depSymbol of deps) {
        const newDegree = (inDegree.get(depSymbol) ?? 1) - 1;
        inDegree.set(depSymbol, newDegree);
        if (newDegree === 0) {
          queue.push(depSymbol);
        }
      }
    }

    // Check for cycle (not all plugins were sorted)
    if (sorted.length !== plugins.length) {
      // Find the cycle for error message
      const cycle = this.findCycle(plugins, pluginBySymbol);
      throw new PluginCircularDependencyError(cycle);
    }

    return sorted;
  }

  /**
   * Finds a cycle in the plugin dependency graph.
   */
  private findCycle(
    plugins: readonly AnyPlugin[],
    pluginBySymbol: Map<symbol, AnyPlugin>
  ): string[] {
    const visited = new Set<symbol>();
    const stack = new Set<symbol>();
    const path: string[] = [];

    const dfs = (symbol: symbol): string[] | null => {
      if (stack.has(symbol)) {
        // Found cycle - extract it from path
        const plugin = pluginBySymbol.get(symbol);
        const name = plugin?.name ?? "unknown";
        const cycleStart = path.indexOf(name);
        if (cycleStart !== -1) {
          return [...path.slice(cycleStart), name];
        }
        return [name, name];
      }

      if (visited.has(symbol)) {
        return null;
      }

      visited.add(symbol);
      stack.add(symbol);

      const plugin = pluginBySymbol.get(symbol);
      if (plugin) {
        path.push(plugin.name);
        const requiredSymbols = extractRequiredSymbols(plugin);
        for (const reqSymbol of requiredSymbols) {
          if (pluginBySymbol.has(reqSymbol)) {
            const cycle = dfs(reqSymbol);
            if (cycle) return cycle;
          }
        }
        path.pop();
      }

      stack.delete(symbol);
      return null;
    };

    for (const plugin of plugins) {
      const cycle = dfs(plugin.symbol);
      if (cycle) return cycle;
    }

    return ["unknown"];
  }

  /**
   * Initializes a single plugin.
   */
  private initializePlugin(plugin: AnyPlugin): void {
    // Create plugin context
    // The InternalPluginContext is structurally compatible at runtime with the
    // generic PluginContext<TRequired, TOptional> expected by createApi.
    // Type safety is enforced at the definePlugin call site.
    const context = this.createPluginContext(plugin);

    try {
      // Call createApi and store result
      // Type assertion needed because AnyPlugin.createApi expects PluginContext
      // with `never` return types (due to ApiFromSymbol with generic symbols),
      // but InternalPluginContext returns `unknown`. Runtime behavior is correct.
      const api = plugin.createApi(context as Parameters<typeof plugin.createApi>[0]);
      // Freeze the API to prevent modification
      const frozenApi = Object.freeze(api);
      this.apis.set(plugin.symbol, frozenApi);
      this.pluginsBySymbol.set(plugin.symbol, plugin);
      this.initializedPlugins.push(plugin);
    } catch (error) {
      throw new PluginInitializationError(plugin.name, error);
    }
  }

  /**
   * Creates the PluginContext for a plugin.
   *
   * Returns an InternalPluginContext that is compatible with the generic
   * PluginContext<TRequired, TOptional> type expected by createApi.
   * Type safety is enforced at the definePlugin call site.
   */
  private createPluginContext(plugin: AnyPlugin): InternalPluginContext {
    const requiredSymbols = new Set(extractRequiredSymbols(plugin));
    const optionalSymbols = new Set(plugin.enhancedBy.map(d => d.symbol));

    return {
      getDependency: (sym: symbol): unknown => {
        if (!requiredSymbols.has(sym)) {
          const depName = getDependencyName(plugin, sym) ?? String(sym);
          throw new Error(
            `Plugin "${plugin.name}" tried to access undeclared dependency "${depName}". ` +
              `Add it to the "requires" array.`
          );
        }
        return this.apis.get(sym);
      },

      getOptionalDependency: (sym: symbol): unknown | undefined => {
        if (!optionalSymbols.has(sym)) {
          const depName = getDependencyName(plugin, sym) ?? String(sym);
          throw new Error(
            `Plugin "${plugin.name}" tried to access undeclared optional dependency "${depName}". ` +
              `Add it to the "enhancedBy" array.`
          );
        }
        return this.apis.get(sym);
      },

      hasPlugin: (sym: symbol) => this.apis.has(sym),

      scopeEvents: this.scopeEvents,

      onDispose: (callback: () => void | Promise<void>) => {
        this.disposeCallbacks.push(callback);
      },

      getContainer: (): InternalAccessible => {
        if (this.containerRef === null) {
          throw new Error(
            `Plugin "${plugin.name}" called getContainer() before initialize(). ` +
              `This is an internal error.`
          );
        }
        return this.containerRef;
      },
    };
  }

  /**
   * Composes hooks from all plugins.
   */
  private composeHooks(): ComposedHooks | null {
    const beforeHooks: Array<(ctx: ResolutionHookContext) => void> = [];
    const afterHooks: Array<(ctx: ResolutionResultContext) => void> = [];

    for (const plugin of this.initializedPlugins) {
      if (plugin.hooks?.beforeResolve) {
        beforeHooks.push(plugin.hooks.beforeResolve);
      }
      if (plugin.hooks?.afterResolve) {
        afterHooks.push(plugin.hooks.afterResolve);
      }
    }

    // No hooks at all
    if (beforeHooks.length === 0 && afterHooks.length === 0) {
      return null;
    }

    const composed: ComposedHooks = {};

    // beforeResolve: Call in registration order
    if (beforeHooks.length > 0) {
      (composed as { beforeResolve: (ctx: ResolutionHookContext) => void }).beforeResolve = (
        ctx: ResolutionHookContext
      ) => {
        for (const hook of beforeHooks) {
          hook(ctx);
        }
      };
    }

    // afterResolve: Call in REVERSE order (middleware pattern)
    if (afterHooks.length > 0) {
      (composed as { afterResolve: (ctx: ResolutionResultContext) => void }).afterResolve = (
        ctx: ResolutionResultContext
      ) => {
        for (let i = afterHooks.length - 1; i >= 0; i--) {
          afterHooks[i](ctx);
        }
      };
    }

    return composed;
  }
}
