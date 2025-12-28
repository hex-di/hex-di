/**
 * Container factory.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type { ContainerOptions, HooksInstaller } from "../resolution/hooks.js";
import type {
  Container,
  ContainerMembers,
  Scope,
  InheritanceModeConfig,
  InheritanceMode,
  LazyContainer,
} from "../types.js";
import { ContainerBrand } from "../types.js";
import {
  RootContainerImpl,
  ChildContainerImpl,
  type RootContainerConfig,
  type ParentContainerLike,
  type ChildContainerConfig,
  type RuntimeAdapter,
} from "./impl.js";
import type { InternalContainerMethods } from "./internal-types.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS } from "../inspector/symbols.js";
import { unreachable } from "../common/unreachable.js";
import { createChildContainerWrapper } from "./wrappers.js";
import { isInheritanceMode } from "./helpers.js";
import type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";

// =============================================================================
// Late-Binding Hooks
// =============================================================================

/**
 * Holder for late-bound hooks with dynamic composition.
 *
 * Supports multiple hook sources that are composed together:
 * - beforeResolve: Called in order of installation
 * - afterResolve: Called in reverse order (middleware pattern)
 *
 * @internal
 */
interface HooksHolder {
  /** Array of installed hook sources */
  readonly hookSources: ResolutionHooks[];
}

/**
 * Creates placeholder hooks that delegate to all installed hook sources.
 * This allows hooks to be installed dynamically via wrappers.
 * @internal
 */
function createLateBindingHooks(holder: HooksHolder): ResolutionHooks {
  return {
    beforeResolve(ctx: ResolutionHookContext): void {
      // Call beforeResolve in order of installation
      for (const source of holder.hookSources) {
        source.beforeResolve?.(ctx);
      }
    },
    afterResolve(ctx: ResolutionResultContext): void {
      // Call afterResolve in reverse order (middleware pattern)
      for (let i = holder.hookSources.length - 1; i >= 0; i--) {
        holder.hookSources[i].afterResolve?.(ctx);
      }
    },
  };
}

/**
 * Creates a new dependency injection container from a graph.
 *
 * @param graph - The validated ServiceGraph containing all adapters
 * @param options - Optional configuration including resolution hooks
 * @returns A frozen Container instance
 *
 * @typeParam TProvides - Port union provided by the graph
 * @typeParam TAsyncPorts - Port union with async factories
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer(graph);
 * const logger = container.resolve(LoggerPort);
 * ```
 *
 * @example With hooks
 * ```typescript
 * const container = createContainer(graph, {
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 *
 * @example With wrapper pattern for plugins
 * ```typescript
 * import { pipe, createPluginWrapper } from '@hex-di/runtime';
 * import { TracingPlugin, TRACING } from '@hex-di/tracing';
 *
 * const withTracing = createPluginWrapper(TracingPlugin);
 * const container = pipe(createContainer(graph), withTracing);
 *
 * // Type-safe plugin API access
 * const tracing = container[TRACING];
 * tracing.getTraces();
 * ```
 */
export function createContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  graph: Graph<TProvides, Port<unknown, string>>,
  options?: ContainerOptions
): Container<TProvides, never, TAsyncPorts, "uninitialized", readonly []> {
  // Create late-binding hooks holder with array for dynamic composition
  // This allows hooks to be installed AFTER container creation via wrappers
  const hooksHolder: HooksHolder = { hookSources: [] };

  // Always create late-binding hooks - wrappers may install hooks later
  const lateBindingHooks = createLateBindingHooks(hooksHolder);

  // Create config with late-binding hooks
  const config: RootContainerConfig<TProvides, TAsyncPorts> = {
    kind: "root",
    graph,
    options: { ...options, hooks: lateBindingHooks },
  };
  const impl = new RootContainerImpl<TProvides, TAsyncPorts>(config);

  // Create wrapper with hooks holder for dynamic hook installation
  return createUninitializedContainerWrapper(impl, options?.hooks, hooksHolder);
}

/**
 * Internal type for uninitialized root container.
 * Uses readonly [] for TPlugins because plugin APIs are added via wrappers (withInspector, etc.)
 * which provide compile-time type safety through intersection types.
 */
type UninitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "uninitialized", readonly []>,
  "initialize"
> &
  InternalContainerMethods<TProvides> & {
    initialize: () => Promise<Container<TProvides, never, TAsyncPorts, "initialized", readonly []>>;
  };

/**
 * Internal type for initialized root container.
 * Uses readonly [] for TPlugins because plugin APIs are added via wrappers (withInspector, etc.)
 * which provide compile-time type safety through intersection types.
 */
type InitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "initialized", readonly []>,
  "initialize"
> &
  InternalContainerMethods<TProvides> & {
    readonly initialize: never;
  };

function createUninitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  userHooks: ResolutionHooks | undefined,
  hooksHolder: HooksHolder
): Container<TProvides, never, TAsyncPorts, "uninitialized", readonly []> {
  let initializedContainer: Container<
    TProvides,
    never,
    TAsyncPorts,
    "initialized",
    readonly []
  > | null = null;

  function resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const container: UninitializedContainerInternals<TProvides, TAsyncPorts> = {
    resolve,
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    resolveInternal: <P extends TProvides>(port: P): InferService<P> => impl.resolve(port),
    resolveAsyncInternal: <P extends TProvides>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    initialize: async () => {
      await impl.initialize();
      if (initializedContainer === null) {
        initializedContainer = createInitializedContainerWrapper<TProvides, TAsyncPorts>(impl);
      }
      return initializedContainer;
    },
    createScope: () => createRootScope<TProvides, TAsyncPorts, "uninitialized">(impl),
    createChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      childGraph: TChildGraph,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): Container<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized",
      readonly []
    > => {
      const parentLike: ParentContainerLike<TProvides, TAsyncPorts> = {
        resolveInternal: <P extends TProvides>(port: P) => impl.resolve(port),
        resolveAsyncInternal: <P extends TProvides>(port: P) => impl.resolveAsync(port),
        has: port => impl.has(port),
        hasAdapter: port => impl.hasAdapter(port),
        [ADAPTER_ACCESS]: port => impl.getAdapter(port),
        registerChildContainer: child => impl.registerChildContainer(child),
        unregisterChildContainer: child => impl.unregisterChildContainer(child),
        originalParent: container,
      };
      return createChildFromGraph<TProvides, TAsyncPorts, TChildGraph>(
        parentLike,
        childGraph,
        inheritanceModes
      );
    },
    createChildAsync: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): Promise<
      Container<
        TProvides,
        Exclude<InferGraphProvides<TChildGraph>, TProvides>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
        "initialized",
        readonly []
      >
    > => createChildContainerAsync(container, graphLoader, inheritanceModes),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      readonly []
    > => createLazyChildContainer(container, graphLoader, inheritanceModes),
    dispose: async () => {
      await impl.dispose();
    },
    get isInitialized() {
      return impl.isInitialized;
    },
    get isDisposed() {
      return impl.isDisposed;
    },
    has: (port): port is TProvides => impl.has(port),
    hasAdapter: port => impl.hasAdapter(port),
    // Root containers have no parent - this property should return never
    get parent(): never {
      return unreachable("Root containers do not have a parent");
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: never }>("Container brand is type-only");
    },
  };

  // Add user hooks to hookSources (if any)
  if (userHooks !== undefined) {
    hooksHolder.hookSources.push(userHooks);
  }

  // Add HOOKS_ACCESS for dynamic hook installation via wrappers
  const hooksInstaller: HooksInstaller = {
    installHooks(hooks: ResolutionHooks): () => void {
      hooksHolder.hookSources.push(hooks);
      return () => {
        const idx = hooksHolder.hookSources.indexOf(hooks);
        if (idx !== -1) {
          hooksHolder.hookSources.splice(idx, 1);
        }
      };
    },
  };
  Object.defineProperty(container, HOOKS_ACCESS, {
    value: () => hooksInstaller,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  Object.freeze(container);
  return container;
}

function createInitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>
): Container<TProvides, never, TAsyncPorts, "initialized", readonly []> {
  function resolve<P extends TProvides>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const container: InitializedContainerInternals<TProvides, TAsyncPorts> = {
    resolve,
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    resolveInternal: <P extends TProvides>(port: P): InferService<P> => impl.resolve(port),
    resolveAsyncInternal: <P extends TProvides>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    get initialize(): never {
      return unreachable("Initialized containers cannot be initialized again");
    },
    createScope: () => createRootScope<TProvides, TAsyncPorts, "initialized">(impl),
    createChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      childGraph: TChildGraph,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): Container<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized",
      readonly []
    > => {
      const parentLike: ParentContainerLike<TProvides, TAsyncPorts> = {
        resolveInternal: <P extends TProvides>(port: P) => impl.resolve(port),
        resolveAsyncInternal: <P extends TProvides>(port: P) => impl.resolveAsync(port),
        has: port => impl.has(port),
        hasAdapter: port => impl.hasAdapter(port),
        [ADAPTER_ACCESS]: port => impl.getAdapter(port),
        registerChildContainer: child => impl.registerChildContainer(child),
        unregisterChildContainer: child => impl.unregisterChildContainer(child),
        originalParent: container,
      };
      return createChildFromGraph<TProvides, TAsyncPorts, TChildGraph>(
        parentLike,
        childGraph,
        inheritanceModes
      );
    },
    createChildAsync: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): Promise<
      Container<
        TProvides,
        Exclude<InferGraphProvides<TChildGraph>, TProvides>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
        "initialized",
        readonly []
      >
    > => createChildContainerAsync(container, graphLoader, inheritanceModes),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      readonly []
    > => createLazyChildContainer(container, graphLoader, inheritanceModes),
    dispose: async () => {
      await impl.dispose();
    },
    get isInitialized() {
      return impl.isInitialized;
    },
    get isDisposed() {
      return impl.isDisposed;
    },
    has: (port): port is TProvides => impl.has(port),
    hasAdapter: port => impl.hasAdapter(port),
    // Root containers have no parent - this property should return never
    get parent(): never {
      return unreachable("Root containers do not have a parent");
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: never }>("Container brand is type-only");
    },
  };

  Object.freeze(container);
  return container;
}

// Helper to avoid circular dependency issues if possible, or just import ScopeImpl
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";

function createRootScope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends "uninitialized" | "initialized",
>(
  containerImpl: RootContainerImpl<TProvides, TAsyncPorts>
): Scope<TProvides, TAsyncPorts, TPhase, readonly []> {
  const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo()
  );
  containerImpl.registerChildScope(scopeImpl);

  return createScopeWrapper(scopeImpl);
}

// =============================================================================
// Child Container ID Generation
// =============================================================================

let childContainerCounter = 0;

function generateChildContainerId(): string {
  return `child-${++childContainerCounter}`;
}

// =============================================================================
// Child Container Creation from Graph
// =============================================================================

/**
 * Creates a child container from a Graph.
 *
 * This function parses the child graph to separate overrides from extensions,
 * creates a ChildContainerImpl, and wraps it.
 *
 * @param parentLike - Parent container interface for resolution and registration
 * @param childGraph - The child graph containing adapters
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 * @param parentContainerId - ID of the parent container for hierarchy tracking (defaults to "root")
 *
 * @internal
 */
function createChildFromGraph<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>,
  childGraph: TChildGraph,
  inheritanceModes?: InheritanceModeConfig<TParentProvides>,
  parentContainerId: string = "root"
): Container<
  TParentProvides,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
  "initialized",
  readonly []
> {
  // Generate unique ID for this child container
  const containerId = generateChildContainerId();

  // Parse the child graph to separate overrides from extensions
  const overrides = new Map<Port<unknown, string>, RuntimeAdapter>();
  const extensions = new Map<Port<unknown, string>, RuntimeAdapter>();

  for (const adapter of childGraph.adapters) {
    const portName = adapter.provides.__portName;
    if (childGraph.overridePortNames.has(portName)) {
      // This is an override - replaces parent's adapter
      overrides.set(adapter.provides, adapter);
    } else {
      // This is an extension - new adapter not in parent
      extensions.set(adapter.provides, adapter);
    }
  }

  // Convert inheritance modes config to Map
  const inheritanceModesMap = new Map<string, InheritanceMode>();
  if (inheritanceModes !== undefined) {
    for (const [portName, mode] of Object.entries(inheritanceModes)) {
      if (isInheritanceMode(mode)) {
        inheritanceModesMap.set(portName, mode);
      }
    }
  }

  const config: ChildContainerConfig<TParentProvides, TAsyncPorts> = {
    kind: "child",
    parent: parentLike,
    overrides,
    extensions,
    inheritanceModes: inheritanceModesMap,
    containerId,
    parentContainerId,
  };

  const impl = new ChildContainerImpl<
    TParentProvides,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >(config);

  return createChildContainerWrapper<
    TParentProvides,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >(impl, containerId, parentContainerId);
}

// =============================================================================
// Async and Lazy Child Container Creation
// =============================================================================

import { LazyContainerImpl, type LazyContainerParent } from "./lazy-impl.js";

/**
 * Creates a child container asynchronously from a graph loader.
 *
 * Use this when the child graph is loaded via dynamic import for code-splitting.
 * The returned Promise resolves to a normal Container that can be used synchronously.
 *
 * @param parent - The parent container
 * @param graphLoader - Async function that returns the child graph
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 * @returns A Promise that resolves to the child container
 *
 * @example
 * ```typescript
 * const pluginContainer = await createChildContainerAsync(
 *   container,
 *   () => import('./plugin-graph').then(m => m.PluginGraph)
 * );
 *
 * // Use like a normal container
 * const service = pluginContainer.resolve(PluginPort);
 * ```
 *
 * @internal
 */
export async function createChildContainerAsync<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  // Using Pick to accept ContainerMembers (used by internal wrappers) as well as Container
  parent: Pick<
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized", readonly []>,
    "createChild"
  >,
  graphLoader: () => Promise<TChildGraph>,
  inheritanceModes?: InheritanceModeConfig<TParentProvides | TParentExtends>
): Promise<
  Container<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized",
    readonly []
  >
> {
  const graph = await graphLoader();
  return parent.createChild(graph, inheritanceModes);
}

/**
 * Creates a lazy-loading child container wrapper.
 *
 * The graph is not loaded until the first call to `resolve()` or `load()`.
 * Use this for optional features that may never be accessed, maximizing
 * code-splitting benefits.
 *
 * @param parent - The parent container
 * @param graphLoader - Async function that returns the child graph
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 * @returns A LazyContainer that loads on first use
 *
 * @example
 * ```typescript
 * const lazyPlugin = createLazyChildContainer(
 *   container,
 *   () => import('./plugin-graph').then(m => m.PluginGraph)
 * );
 *
 * // Graph not loaded yet
 * console.log(lazyPlugin.isLoaded); // false
 *
 * // Graph loaded on first resolve
 * const service = await lazyPlugin.resolve(PluginPort);
 * console.log(lazyPlugin.isLoaded); // true
 * ```
 *
 * @internal
 */
export function createLazyChildContainer<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  // Using Pick to accept ContainerMembers (used by internal wrappers) as well as Container
  parent: Pick<
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized", readonly []>,
    "has" | "createChild"
  >,
  graphLoader: () => Promise<TChildGraph>,
  inheritanceModes?: InheritanceModeConfig<TParentProvides | TParentExtends>
): LazyContainer<
  TParentProvides | TParentExtends,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
  readonly []
> {
  // Parent implements LazyContainerParent interface via its has() and createChild() methods
  const parentLike: LazyContainerParent<
    TParentProvides | TParentExtends,
    TAsyncPorts,
    readonly []
  > = {
    has: port => parent.has(port),
    createChild: (graph, modes) => parent.createChild(graph, modes),
  };

  return new LazyContainerImpl<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    readonly [],
    TChildGraph
  >(parentLike, graphLoader, inheritanceModes);
}
