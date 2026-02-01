/**
 * Container factory.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type { ContainerOptions, HooksInstaller } from "../resolution/hooks.js";
import type {
  Container,
  ContainerMembers,
  Scope,
  InheritanceModeConfig,
  InheritanceMode,
  LazyContainer,
  CreateContainerOptions,
  CreateChildOptions,
  ContainerKind,
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
import { INTERNAL_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS } from "../inspection/symbols.js";
import { unreachable } from "../util/unreachable.js";
import { createChildContainerWrapper } from "./wrappers.js";
import { isInheritanceMode } from "./helpers.js";
import type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";
import { createBuiltinInspectorAPI, createBuiltinTracerAPI } from "../inspection/builtin-api.js";
import type { InspectorAPI } from "../inspection/types.js";
import type { TracingAPI } from "@hex-di/core";
import type { InternalAccessible } from "../inspection/creation.js";

// =============================================================================
// Builtin API Attachment Helper
// =============================================================================

/**
 * Type for container objects that support INTERNAL_ACCESS and can have
 * inspector/tracer attached.
 *
 * @internal
 */
interface AttachableContainer extends InternalAccessible {
  inspector?: InspectorAPI;
  tracer?: TracingAPI;
}

/**
 * Type for container with required inspector and tracer properties.
 *
 * @internal
 */
interface ContainerWithBuiltinAPIs extends InternalAccessible {
  readonly inspector: InspectorAPI;
  readonly tracer: TracingAPI;
}

/**
 * Attaches built-in inspector and tracer APIs to a container object.
 *
 * Uses Object.defineProperty to make properties non-enumerable and readonly.
 *
 * @param container - Container object that implements INTERNAL_ACCESS
 *
 * @internal
 */
function attachBuiltinAPIs(
  container: AttachableContainer
): asserts container is ContainerWithBuiltinAPIs {
  // Add built-in inspector API as non-enumerable property
  const inspectorAPI = createBuiltinInspectorAPI(container);
  Object.defineProperty(container, "inspector", {
    value: inspectorAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Add built-in tracer API as non-enumerable property
  const tracerAPI = createBuiltinTracerAPI();
  Object.defineProperty(container, "tracer", {
    value: tracerAPI,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

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
 */
export function createContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  graph: Graph<TProvides, Port<unknown, string>>,
  containerOptions: CreateContainerOptions,
  hookOptions?: ContainerOptions
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  // Create late-binding hooks holder with array for dynamic composition
  // This allows hooks to be installed AFTER container creation via wrappers
  const hooksHolder: HooksHolder = { hookSources: [] };

  // Always create late-binding hooks - wrappers may install hooks later
  const lateBindingHooks = createLateBindingHooks(hooksHolder);

  // Create config with late-binding hooks
  const config: RootContainerConfig<TProvides, TAsyncPorts> = {
    kind: "root",
    graph,
    containerName: containerOptions.name,
    options: { ...hookOptions, hooks: lateBindingHooks },
  };
  const impl = new RootContainerImpl<TProvides, TAsyncPorts>(config);

  // Create wrapper with hooks holder for dynamic hook installation
  return createUninitializedContainerWrapper(
    impl,
    containerOptions.name,
    hookOptions?.hooks,
    hooksHolder
  );
}

/**
 * Internal type for uninitialized root container.
 *
 * Note: "inspector" and "tracer" are initially optional placeholders.
 * They are set via Object.defineProperty for non-enumerability via attachBuiltinAPIs().
 */
type UninitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "uninitialized">,
  "initialize" | "inspector" | "tracer"
> &
  InternalContainerMethods<TProvides> & {
    initialize: () => Promise<Container<TProvides, never, TAsyncPorts, "initialized">>;
    // Placeholders - will be set by attachBuiltinAPIs before freeze
    inspector?: InspectorAPI;
    tracer?: TracingAPI;
  };

/**
 * Internal type for initialized root container.
 *
 * Note: "inspector" and "tracer" are initially optional placeholders.
 * They are set via Object.defineProperty for non-enumerability via attachBuiltinAPIs().
 */
type InitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "initialized">,
  "initialize" | "inspector" | "tracer"
> &
  InternalContainerMethods<TProvides> & {
    readonly initialize: never;
    // Placeholders - will be set by attachBuiltinAPIs before freeze
    inspector?: InspectorAPI;
    tracer?: TracingAPI;
  };

function createUninitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string,
  userHooks: ResolutionHooks | undefined,
  hooksHolder: HooksHolder
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  let initializedContainer: Container<TProvides, never, TAsyncPorts, "initialized"> | null = null;

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
    // Container naming properties
    name: containerName,
    parentName: null, // Root containers have no parent
    kind: "root" as ContainerKind,
    initialize: async () => {
      await impl.initialize();
      if (initializedContainer === null) {
        initializedContainer = createInitializedContainerWrapper<TProvides, TAsyncPorts>(
          impl,
          containerName
        );
      }
      return initializedContainer;
    },
    createScope: (scopeName?: string) =>
      createRootScope<TProvides, TAsyncPorts, "uninitialized">(impl, scopeName),
    createRequestScope: (scopeName?: string) =>
      createRootRequestScope<TProvides, TAsyncPorts, "uninitialized">(impl, scopeName),
    createChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      childGraph: TChildGraph,
      options: CreateChildOptions<TProvides>
    ): Container<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized"
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
        options.name,
        containerName, // parent's name
        options.inheritanceModes
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
      options: CreateChildOptions<TProvides>
    ): Promise<
      Container<
        TProvides,
        Exclude<InferGraphProvides<TChildGraph>, TProvides>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
        "initialized"
      >
    > => createChildContainerAsync(container, containerName, graphLoader, options),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainer(container, containerName, graphLoader, options),
    withOverrides: <TOverrides extends Record<string, (() => unknown) | undefined>, R>(
      overrides: TOverrides,
      fn: () => R
    ): R => impl.withOverrides(overrides, fn),
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
    // Placeholder getter - will be replaced with non-enumerable version below
    get parent(): never {
      return unreachable("Root containers do not have a parent");
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    // Placeholder getter - will be replaced with non-enumerable version below
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: never }>("Container brand is type-only");
    },
  };

  // Add .parent getter as non-enumerable to prevent React DevTools from triggering it
  // Root containers have no parent - accessing this property throws an error
  Object.defineProperty(container, "parent", {
    get(): never {
      return unreachable("Root containers do not have a parent");
    },
    enumerable: false,
    configurable: false,
  });

  // Add ContainerBrand getter as non-enumerable (type-only property)
  Object.defineProperty(container, ContainerBrand, {
    get(): never {
      return unreachable("Container brand is type-only");
    },
    enumerable: false,
    configurable: false,
  });

  // Add built-in inspector and tracer APIs as non-enumerable properties
  attachBuiltinAPIs(container);

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
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string
): Container<TProvides, never, TAsyncPorts, "initialized"> {
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
    // Container naming properties
    name: containerName,
    parentName: null, // Root containers have no parent
    kind: "root" as ContainerKind,
    get initialize(): never {
      return unreachable("Initialized containers cannot be initialized again");
    },
    createScope: (name?: string) =>
      createRootScope<TProvides, TAsyncPorts, "initialized">(impl, name),
    createRequestScope: (name?: string) =>
      createRootRequestScope<TProvides, TAsyncPorts, "initialized">(impl, name),
    createChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      childGraph: TChildGraph,
      options: CreateChildOptions<TProvides>
    ): Container<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized"
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
        options.name,
        containerName, // parent's name
        options.inheritanceModes
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
      options: CreateChildOptions<TProvides>
    ): Promise<
      Container<
        TProvides,
        Exclude<InferGraphProvides<TChildGraph>, TProvides>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
        "initialized"
      >
    > => createChildContainerAsync(container, containerName, graphLoader, options),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainer(container, containerName, graphLoader, options),
    withOverrides: <TOverrides extends Record<string, (() => unknown) | undefined>, R>(
      overrides: TOverrides,
      fn: () => R
    ): R => impl.withOverrides(overrides, fn),
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
    // Placeholder getter - will be replaced with non-enumerable version below
    get parent(): never {
      return unreachable("Root containers do not have a parent");
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    // Placeholder getter - will be replaced with non-enumerable version below
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: never }>("Container brand is type-only");
    },
  };

  // Add .parent getter as non-enumerable to prevent React DevTools from triggering it
  // Root containers have no parent - accessing this property throws an error
  Object.defineProperty(container, "parent", {
    get(): never {
      return unreachable("Root containers do not have a parent");
    },
    enumerable: false,
    configurable: false,
  });

  // Add ContainerBrand getter as non-enumerable (type-only property)
  Object.defineProperty(container, ContainerBrand, {
    get(): never {
      return unreachable("Container brand is type-only");
    },
    enumerable: false,
    configurable: false,
  });

  // Add built-in inspector and tracer APIs as non-enumerable properties
  attachBuiltinAPIs(container);

  Object.freeze(container);
  return container;
}

// Helper to avoid circular dependency issues if possible, or just import ScopeImpl
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";
import { RequestScopeImpl, createRequestScopeWrapper } from "../scope/request-scope.js";

function createRootScope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends "uninitialized" | "initialized",
>(
  containerImpl: RootContainerImpl<TProvides, TAsyncPorts>,
  name?: string
): Scope<TProvides, TAsyncPorts, TPhase> {
  const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo(),
    null, // parentScope
    () => containerImpl.unregisterChildScope(scopeImpl), // unregister callback for disposal
    name
  );
  containerImpl.registerChildScope(scopeImpl);

  return createScopeWrapper(scopeImpl);
}

/**
 * Creates a request scope from a root container.
 *
 * Request scopes provide HTTP request isolation where services with 'request'
 * lifetime are created once per request and cached within that request.
 *
 * @param containerImpl - The root container implementation
 * @param name - Optional name for the request scope
 * @returns A new request Scope instance
 *
 * @internal
 */
function createRootRequestScope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends "uninitialized" | "initialized",
>(
  containerImpl: RootContainerImpl<TProvides, TAsyncPorts>,
  name?: string
): Scope<TProvides, TAsyncPorts, TPhase> {
  const requestScopeImpl = new RequestScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo(),
    null, // parentScope
    () => containerImpl.unregisterChildScope(requestScopeImpl), // unregister callback for disposal
    name
  );
  containerImpl.registerChildScope(requestScopeImpl);

  return createRequestScopeWrapper(requestScopeImpl);
}

// =============================================================================
// Child Container ID Generation
// =============================================================================

import { generateChildContainerId } from "./id-generator.js";

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
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param inheritanceModes - Optional per-port inheritance mode configuration
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
  childName: string,
  parentName: string,
  inheritanceModes?: InheritanceModeConfig<TParentProvides>
): Container<
  TParentProvides,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
  "initialized"
> {
  // Generate unique ID for this child container (used internally)
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
    containerName: childName,
    parentContainerId: parentName, // Use parent name for internal tracking
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
  >(impl, childName, parentName);
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
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param graphLoader - Async function that returns the child graph
 * @param options - Child container options including name and optional inheritance modes
 * @returns A Promise that resolves to the child container
 *
 * @example
 * ```typescript
 * const pluginContainer = await createChildContainerAsync(
 *   container,
 *   "Root",
 *   () => import('./plugin-graph').then(m => m.PluginGraph),
 *   { name: "Plugin" }
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
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized">,
    "createChild"
  >,
  _parentName: string,
  graphLoader: () => Promise<TChildGraph>,
  options: CreateChildOptions<TParentProvides | TParentExtends>
): Promise<
  Container<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >
> {
  const graph = await graphLoader();
  return parent.createChild(graph, options);
}

/**
 * Creates a lazy-loading child container wrapper.
 *
 * The graph is not loaded until the first call to `resolve()` or `load()`.
 * Use this for optional features that may never be accessed, maximizing
 * code-splitting benefits.
 *
 * @param parent - The parent container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param graphLoader - Async function that returns the child graph
 * @param options - Child container options including name and optional inheritance modes
 * @returns A LazyContainer that loads on first use
 *
 * @example
 * ```typescript
 * const lazyPlugin = createLazyChildContainer(
 *   container,
 *   "Root",
 *   () => import('./plugin-graph').then(m => m.PluginGraph),
 *   { name: "LazyPlugin" }
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
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized">,
    "has" | "createChild"
  >,
  _parentName: string,
  graphLoader: () => Promise<TChildGraph>,
  options: CreateChildOptions<TParentProvides | TParentExtends>
): LazyContainer<
  TParentProvides | TParentExtends,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
> {
  // Parent implements LazyContainerParent interface via its has() and createChild() methods
  const parentLike: LazyContainerParent<TParentProvides | TParentExtends, TAsyncPorts> = {
    has: port => parent.has(port),
    createChild: (graph, opts) => parent.createChild(graph, opts),
  };

  return new LazyContainerImpl<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    TChildGraph
  >(parentLike, graphLoader, options);
}
