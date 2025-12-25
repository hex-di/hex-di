/**
 * Container wrapper functions for creating public API objects.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type {
  Container,
  Scope,
  InheritanceModeConfig,
  InheritanceMode,
  LazyContainer,
} from "../types.js";
import { ContainerBrand } from "../types.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS } from "../inspector/symbols.js";
import { unreachable } from "../common/unreachable.js";
import { isRecord } from "../common/type-guards.js";
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";
import { ChildContainerImpl, type RuntimeAdapter, type ChildContainerConfig } from "./impl.js";
import { isInheritanceMode } from "./helpers.js";
import { LazyContainerImpl, type LazyContainerParent } from "./lazy-impl.js";
import type {
  DisposableChild,
  ParentContainerLike,
  InternalContainerMethods,
} from "./internal-types.js";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value has internal container methods.
 * @internal
 */
export function hasInternalMethods(
  value: unknown
): value is InternalContainerMethods<Port<unknown, string>> {
  if (!isRecord(value)) {
    return false;
  }
  return (
    ADAPTER_ACCESS in value &&
    typeof value[ADAPTER_ACCESS] === "function" &&
    "registerChildContainer" in value &&
    typeof value["registerChildContainer"] === "function" &&
    "unregisterChildContainer" in value &&
    typeof value["unregisterChildContainer"] === "function" &&
    "resolveInternal" in value &&
    typeof value["resolveInternal"] === "function" &&
    "resolveAsyncInternal" in value &&
    typeof value["resolveAsyncInternal"] === "function" &&
    "hasAdapter" in value &&
    typeof value["hasAdapter"] === "function" &&
    "has" in value &&
    typeof value["has"] === "function"
  );
}

function isContainerParent<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(value: unknown): value is Container<TProvides, TExtends, TAsyncPorts>["parent"] {
  if (!isRecord(value)) {
    return false;
  }
  return (
    "resolve" in value &&
    typeof value["resolve"] === "function" &&
    "resolveAsync" in value &&
    typeof value["resolveAsync"] === "function" &&
    "createScope" in value &&
    typeof value["createScope"] === "function" &&
    "dispose" in value &&
    typeof value["dispose"] === "function" &&
    "has" in value &&
    typeof value["has"] === "function" &&
    "isDisposed" in value
  );
}

// =============================================================================
// Parent Container Extraction
// =============================================================================

/**
 * Extracts a ParentContainerLike from a Container wrapper.
 * @internal
 */
export function asParentContainerLike<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  wrapper: Container<TProvides, TExtends, TAsyncPorts>
): ParentContainerLike<TProvides | TExtends, TAsyncPorts> {
  if (!hasInternalMethods(wrapper)) {
    throw new Error(
      "Invalid Container wrapper: missing internal methods. " +
        "This indicates a bug in createChildContainerWrapper."
    );
  }
  return {
    resolveInternal: <P extends TProvides | TExtends>(port: P): InferService<P> =>
      wrapper.resolveInternal(port),
    resolveAsyncInternal: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      wrapper.resolveAsyncInternal(port),
    [ADAPTER_ACCESS]: wrapper[ADAPTER_ACCESS],
    registerChildContainer: wrapper.registerChildContainer,
    unregisterChildContainer: wrapper.unregisterChildContainer,
    originalParent: wrapper,
    has: (port: Port<unknown, string>): boolean => wrapper.has(port),
    hasAdapter: (port: Port<unknown, string>): boolean => wrapper.hasAdapter(port),
  };
}

// =============================================================================
// Child Container Wrapper
// =============================================================================

/**
 * Creates a frozen Container wrapper for child containers.
 * @internal
 */
export function createChildContainerWrapper<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>
): Container<TProvides, TExtends, TAsyncPorts> {
  type ChildContainerInternals = Container<TProvides, TExtends, TAsyncPorts> &
    InternalContainerMethods<TProvides | TExtends>;

  function resolve<P extends Exclude<TProvides | TExtends, TAsyncPorts>>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const childContainer: ChildContainerInternals = {
    resolve,
    resolveAsync: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    resolveInternal: <P extends TProvides | TExtends>(port: P): InferService<P> =>
      impl.resolve(port),
    resolveAsyncInternal: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    has: (port: Port<unknown, string>): boolean => impl.has(port),
    hasAdapter: (port: Port<unknown, string>): boolean => impl.hasAdapter(port),
    createScope: () => createChildContainerScope(impl),
    createChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      childGraph: TChildGraph,
      inheritanceModes?: InheritanceModeConfig<TProvides | TExtends>
    ): Container<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => {
      const parentLike: ParentContainerLike<TProvides | TExtends, TAsyncPorts> = {
        resolveInternal: <P extends TProvides | TExtends>(port: P) => impl.resolve(port),
        resolveAsyncInternal: <P extends TProvides | TExtends>(port: P) => impl.resolveAsync(port),
        has: port => impl.has(port),
        hasAdapter: port => impl.hasAdapter(port),
        [ADAPTER_ACCESS]: port => impl.getAdapter(port),
        registerChildContainer: child => impl.registerChildContainer(child),
        unregisterChildContainer: child => impl.unregisterChildContainer(child),
        originalParent: childContainer,
      };
      return createChildFromGraphInternal(parentLike, childGraph, inheritanceModes);
    },
    createChildAsync: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides | TExtends>
    ): Promise<
      Container<
        TProvides | TExtends,
        Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
      >
    > => createChildContainerAsyncInternal(childContainer, graphLoader, inheritanceModes),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<unknown, string>,
        Port<unknown, string>,
        Port<unknown, string>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      inheritanceModes?: InheritanceModeConfig<TProvides | TExtends>
    ): LazyContainer<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainerInternal(childContainer, graphLoader, inheritanceModes),
    dispose: () => impl.dispose(),
    get isDisposed() {
      return impl.isDisposed;
    },
    get isInitialized() {
      // Child containers inherit initialization state from parent
      return true;
    },
    // Child containers don't have initialize - this should return never
    get initialize(): never {
      return unreachable("Child containers cannot be initialized - they inherit state from parent");
    },
    get parent() {
      const parent = impl.getParent();
      if (!isContainerParent<TProvides, TExtends, TAsyncPorts>(parent)) {
        throw new Error("Invalid container parent reference.");
      }
      return parent;
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: (port: Port<unknown, string>) => impl.getAdapter(port),
    registerChildContainer: (child: DisposableChild) => impl.registerChildContainer(child),
    unregisterChildContainer: (child: DisposableChild) => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: TExtends }>(
        "Container brand is type-only"
      );
    },
  };

  impl.setWrapper(childContainer);
  Object.freeze(childContainer);
  return childContainer;
}

// =============================================================================
// Scope Creation
// =============================================================================

/**
 * Creates a scope from a unified container implementation.
 * @internal
 */
export function createChildContainerScope<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>
): Scope<TProvides | TExtends, TAsyncPorts, "initialized"> {
  const scopeImpl = new ScopeImpl<TProvides | TExtends, TAsyncPorts, "initialized">(
    impl,
    impl.getSingletonMemo()
  );
  impl.registerChildScope(scopeImpl);
  return createScopeWrapper(scopeImpl);
}

// =============================================================================
// Child Container Creation from Graph (internal for wrappers)
// =============================================================================

/**
 * Creates a child container from a Graph.
 * Internal version used by child containers' createChild method.
 *
 * @internal
 */
function createChildFromGraphInternal<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>,
  childGraph: TChildGraph,
  inheritanceModes?: InheritanceModeConfig<TParentProvides>
): Container<
  TParentProvides,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
> {
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
  };

  const impl = new ChildContainerImpl<
    TParentProvides,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >(config);

  return createChildContainerWrapper(impl);
}

// =============================================================================
// Async and Lazy Child Container Creation (internal for child containers)
// =============================================================================

/**
 * Creates a child container asynchronously from a graph loader.
 * Internal version used by child containers' createChildAsync method.
 *
 * @internal
 */
async function createChildContainerAsyncInternal<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  parent: Container<TParentProvides, TParentExtends, TAsyncPorts>,
  graphLoader: () => Promise<TChildGraph>,
  inheritanceModes?: InheritanceModeConfig<TParentProvides | TParentExtends>
): Promise<
  Container<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >
> {
  const graph = await graphLoader();
  return parent.createChild(graph, inheritanceModes);
}

/**
 * Creates a lazy-loading child container wrapper.
 * Internal version used by child containers' createLazyChild method.
 *
 * @internal
 */
function createLazyChildContainerInternal<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  parent: Container<TParentProvides, TParentExtends, TAsyncPorts>,
  graphLoader: () => Promise<TChildGraph>,
  inheritanceModes?: InheritanceModeConfig<TParentProvides | TParentExtends>
): LazyContainer<
  TParentProvides | TParentExtends,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
> {
  const parentLike: LazyContainerParent<TParentProvides | TParentExtends, TAsyncPorts> = {
    has: port => parent.has(port),
    createChild: (graph, modes) => parent.createChild(graph, modes),
  };

  return new LazyContainerImpl<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    TChildGraph
  >(parentLike, graphLoader, inheritanceModes);
}
