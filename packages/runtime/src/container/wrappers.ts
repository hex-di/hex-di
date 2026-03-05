/**
 * Container wrapper functions for creating public API objects.
 * @packageDocumentation
 */

import type { Port, InferService, AdapterConstraint } from "@hex-di/core";
import { getPortMetadata, isLibraryInspector } from "@hex-di/core";
import { tryCatch, fromPromise } from "@hex-di/result";
import { OverrideBuilder, type ContainerForOverride } from "./override-builder.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { mapToContainerError, mapToDisposalError, emitResultEvent } from "./result-helpers.js";
import { ContainerError } from "../errors/index.js";
import type {
  Container,
  ContainerMembers,
  ContainerPhase,
  Scope,
  InheritanceModeConfig,
  LazyContainer,
  CreateChildOptions,
  ContainerKind,
} from "../types.js";
import { ContainerBrand } from "../types.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../inspection/symbols.js";
import type {
  ResolutionHooks,
  HooksInstaller,
  HookType,
  HookHandler,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";

/**
 * Union type for hook handlers (beforeResolve or afterResolve).
 * Used as WeakMap key type for handler-to-uninstall mapping.
 * @internal
 */
type AnyHookHandler = HookHandler<"beforeResolve"> | HookHandler<"afterResolve">;
import { unreachable } from "../util/unreachable.js";
import { isRecord } from "../util/type-guards.js";
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";
import { ChildContainerImpl } from "./impl.js";
import { LazyContainerImpl, type LazyContainerParent } from "./lazy-impl.js";
import type {
  DisposableChild,
  ParentContainerLike,
  InternalContainerMethods,
} from "./internal-types.js";
import type { InspectorAPI } from "../inspection/types.js";
import {
  attachBuiltinAPIs,
  assertInspectorAttached,
  parseChildGraph,
  parseInheritanceModes,
  createChildContainerConfig,
} from "./wrapper-utils.js";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value has internal container methods.
 * @internal
 */
export function hasInternalMethods(
  value: unknown
): value is InternalContainerMethods<Port<string, unknown>> {
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
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends ContainerPhase = "initialized",
>(value: unknown): value is Container<TProvides, TExtends, TAsyncPorts, TPhase>["parent"] {
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
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
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
    has: (port: Port<string, unknown>): boolean => wrapper.has(port),
    hasAdapter: (port: Port<string, unknown>): boolean => wrapper.hasAdapter(port),
  };
}

// =============================================================================
// Child Container Wrapper
// =============================================================================

/**
 * Creates a frozen Container wrapper for child containers.
 *
 * @param impl - The child container implementation
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @returns A frozen Container wrapper
 *
 * @internal
 */
export function createChildContainerWrapper<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown> = never,
  TAsyncPorts extends Port<string, unknown> = never,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>,
  childName: string,
  parentName: string
): Container<TProvides, TExtends, TAsyncPorts, "initialized"> {
  // Use ContainerMembers instead of Container for internal type
  // Note: "inspector" is set via Object.defineProperty after creation
  // for non-enumerability. Override is included directly with proper type.
  type ChildContainerInternals = Omit<
    ContainerMembers<TProvides, TExtends, TAsyncPorts, "initialized">,
    "inspector"
  > &
    InternalContainerMethods<TProvides | TExtends> & {
      // Placeholder - will be set by attachBuiltinAPIs before freeze
      inspector?: InspectorAPI;
    };

  // Child containers are always initialized, so resolve accepts all ports
  function resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    try {
      const value = impl.resolve(port);
      if (childContainer.inspector?.emit) {
        childContainer.inspector.emit({
          type: "result:ok",
          portName: port.__portName,
          timestamp: Date.now(),
        });
      }
      return value;
    } catch (e: unknown) {
      if (childContainer.inspector?.emit) {
        const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
        childContainer.inspector.emit({
          type: "result:err",
          portName: port.__portName,
          errorCode,
          timestamp: Date.now(),
        });
      }
      throw e;
    }
  }

  // Map from individual handlers to their uninstall functions
  // Using WeakMap to avoid memory leaks if handlers are garbage collected
  const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();

  // Hook sources for HOOKS_ACCESS (legacy) and addHook/removeHook (new)
  const hookSources: ResolutionHooks[] = [];

  // Override method defined using a deferred reference pattern.
  // The container is accessed at call-time (not definition-time), which avoids
  // forward reference issues without needing `let` or eslint-disable.
  // The explicit return type annotation ensures TypeScript infers the correct
  // type parameters for OverrideBuilder.
  //
  // We create a ContainerForOverride object that captures only what OverrideBuilder
  // needs (name + createChild), avoiding the type mismatch from the `parent` property
  // which differs between root containers (parent: never) and child containers.
  function overrideMethod<A extends AdapterConstraint>(
    adapter: A
  ): OverrideBuilder<TProvides | TExtends, never, TAsyncPorts, "initialized"> {
    // Create a minimal ContainerForOverride that exposes just name and createChild.
    // This avoids the parent property type mismatch between root and child containers.
    const containerThunk = (): ContainerForOverride<TProvides | TExtends, TAsyncPorts> => ({
      name: childName,
      createChild: (graph, options) => childContainer.createChild(graph, options),
    });
    return new OverrideBuilder(containerThunk, [adapter]);
  }

  const childContainer: ChildContainerInternals = {
    override: overrideMethod,
    resolve,
    resolveAsync: async <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> => {
      try {
        const value = await impl.resolveAsync(port);
        if (childContainer.inspector?.emit) {
          childContainer.inspector.emit({
            type: "result:ok",
            portName: port.__portName,
            timestamp: Date.now(),
          });
        }
        return value;
      } catch (e: unknown) {
        if (childContainer.inspector?.emit) {
          const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
          childContainer.inspector.emit({
            type: "result:err",
            portName: port.__portName,
            errorCode,
            timestamp: Date.now(),
          });
        }
        throw e;
      }
    },
    tryResolve: <P extends TProvides | TExtends>(port: P) => {
      const result = tryCatch(() => impl.resolve(port), mapToContainerError);
      emitResultEvent(childContainer.inspector, port.__portName, result);
      return result;
    },
    tryResolveAsync: <P extends TProvides | TExtends>(port: P) => {
      const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
      void resultAsync.then(result => {
        emitResultEvent(childContainer.inspector, port.__portName, result);
      });
      return resultAsync;
    },
    tryDispose: () => fromPromise(impl.dispose(), mapToDisposalError),
    resolveInternal: <P extends TProvides | TExtends>(port: P): InferService<P> =>
      impl.resolve(port),
    resolveAsyncInternal: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    // Container naming properties
    name: childName,
    parentName: parentName, // Derived from parent.name
    kind: "child" as ContainerKind,
    has: (port: Port<string, unknown>): boolean => impl.has(port),
    hasAdapter: (port: Port<string, unknown>): boolean => impl.hasAdapter(port),
    createScope: (name?: string) =>
      createChildContainerScope(impl, name, () => childContainer.inspector),
    createChild: <
      TChildGraph extends Graph<
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
      >,
    >(
      childGraph: TChildGraph,
      options: CreateChildOptions<TProvides | TExtends>
    ): Container<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized"
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
      return createChildFromGraphInternal<TProvides | TExtends, TAsyncPorts, TChildGraph>(
        parentLike,
        childGraph,
        options.name,
        childName, // This child's name becomes the grandchild's parentName
        options.inheritanceModes
      );
    },
    createChildAsync: <
      TChildGraph extends Graph<
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides | TExtends>
    ): Promise<
      Container<
        TProvides | TExtends,
        Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
        TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
        "initialized"
      >
    > => createChildContainerAsyncInternal(childContainer, childName, graphLoader, options),
    createLazyChild: <
      TChildGraph extends Graph<
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides | TExtends>
    ): LazyContainer<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainerInternal(childContainer, childName, graphLoader, options),
    dispose: async () => {
      childContainer.inspector?.disposeLibraries?.();
      await impl.dispose();
      assertInspectorAttached(childContainer);
      return childContainer;
    },

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
    get tryInitialize(): never {
      return unreachable("Child containers cannot be initialized - they inherit state from parent");
    },
    get parent() {
      const parent = impl.getParent();
      if (!isContainerParent<TProvides, TExtends, TAsyncPorts>(parent)) {
        throw new Error("Invalid container parent reference.");
      }
      return parent;
    },
    addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
      // Create a ResolutionHooks object with just this handler
      const hooks: ResolutionHooks =
        type === "beforeResolve"
          ? { beforeResolve: handler as (ctx: ResolutionHookContext) => void }
          : { afterResolve: handler as (ctx: ResolutionResultContext) => void };

      // Store uninstall function for later removal
      const uninstall = (): void => {
        const idx = hookSources.indexOf(hooks);
        if (idx !== -1) {
          hookSources.splice(idx, 1);
        }
        impl.uninstallHooks(hooks);
      };
      handlerToUninstall.set(handler, uninstall);
      hookSources.push(hooks);
      impl.installHooks(hooks);
    },
    removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
      const uninstall = handlerToUninstall.get(handler);
      if (uninstall) {
        uninstall();
        handlerToUninstall.delete(handler);
      }
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: (port: Port<string, unknown>) => impl.getAdapter(port),
    registerChildContainer: (child: DisposableChild) => impl.registerChildContainer(child),
    unregisterChildContainer: (child: DisposableChild) => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: TExtends }>(
        "Container brand is type-only"
      );
    },
  };

  // HOOKS_ACCESS installer for legacy support
  const hooksInstaller: HooksInstaller = {
    installHooks(hooks: ResolutionHooks): () => void {
      hookSources.push(hooks);
      // Also install hooks on the impl to actually fire them during resolution
      impl.installHooks(hooks);
      return () => {
        const idx = hookSources.indexOf(hooks);
        if (idx >= 0) {
          hookSources.splice(idx, 1);
        }
        impl.uninstallHooks(hooks);
      };
    },
  };
  Object.defineProperty(childContainer, HOOKS_ACCESS, {
    value: () => hooksInstaller,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Add built-in inspector API as non-enumerable property
  attachBuiltinAPIs(childContainer);

  // Install auto-discovery hook for library inspectors
  impl.installHooks({
    afterResolve: ctx => {
      if (ctx.result !== undefined) {
        const portMeta = getPortMetadata(ctx.port);
        if (portMeta?.category === "library-inspector" && isLibraryInspector(ctx.result)) {
          childContainer.inspector?.registerLibrary(ctx.result);
        }
      }
    },
  });

  impl.setWrapper(childContainer);
  Object.freeze(childContainer);
  return childContainer;
}

// =============================================================================
// Scope Creation
// =============================================================================

/**
 * Creates a scope from a unified container implementation.
 * @param impl - The child container implementation
 * @param name - Optional name for the scope (used for DevTools identification)
 * @internal
 */
export function createChildContainerScope<
  TProvides extends Port<string, unknown>,
  TExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>,
  name?: string,
  getInspector?: () => import("../inspection/types.js").InspectorAPI | undefined
): Scope<TProvides | TExtends, TAsyncPorts, "initialized"> {
  const scopeImpl = new ScopeImpl<TProvides | TExtends, TAsyncPorts, "initialized">(
    impl,
    impl.getSingletonMemo(),
    null, // parentScope
    () => impl.unregisterChildScope(scopeImpl), // unregister callback for disposal
    name // scope name
  );
  impl.registerChildScope(scopeImpl);
  return createScopeWrapper(scopeImpl, getInspector);
}

// =============================================================================
// Child Container Creation from Graph (internal for wrappers)
// =============================================================================

/**
 * Creates a child container from a Graph.
 * Internal version used by child containers' createChild method.
 *
 * @param parentLike - Parent container interface for resolution and registration
 * @param childGraph - The child graph containing adapters
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 *
 * @internal
 */
function createChildFromGraphInternal<
  TParentProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
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
  const { overrides, extensions } = parseChildGraph(childGraph);
  const inheritanceModesMap = parseInheritanceModes(inheritanceModes);
  const config = createChildContainerConfig(
    parentLike,
    overrides,
    extensions,
    inheritanceModesMap,
    childName,
    parentName
  );

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
// Async and Lazy Child Container Creation (internal for child containers)
// =============================================================================

/**
 * Creates a child container asynchronously from a graph loader.
 * Internal version used by child containers' createChildAsync method.
 *
 * @internal
 */
async function createChildContainerAsyncInternal<
  TParentProvides extends Port<string, unknown>,
  TParentExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
>(
  // Using Pick to accept ContainerMembers (used by child container wrappers) as well as Container
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
 * Internal version used by child containers' createLazyChild method.
 *
 * @internal
 */
function createLazyChildContainerInternal<
  TParentProvides extends Port<string, unknown>,
  TParentExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
>(
  // Using Pick to accept ContainerMembers (used by child container wrappers) as well as Container
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
