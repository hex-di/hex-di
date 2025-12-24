/**
 * Container factory.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { ContainerOptions } from "../resolution/hooks.js";
import type { Container, Scope, ContainerBuilder } from "../types.js";
import { ContainerBrand } from "../types.js";
import { ContainerImpl, type RootContainerConfig, type ParentContainerLike } from "./impl.js";
import type { InternalContainerMethods } from "./internal-types.js";
import { createContainerBuilderFromLike } from "./builder.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../inspector/symbols.js";
import { unreachable } from "../common/unreachable.js";

/**
 * Creates a new dependency injection container from a graph.
 *
 * @param graph - The validated ServiceGraph containing all adapters
 * @param options - Optional configuration including resolution hooks
 * @returns A frozen Container instance (root container with TExtends = never)
 */
export function createContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  graph: Graph<TProvides, Port<unknown, string>>,
  options?: ContainerOptions
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  const config: RootContainerConfig<TProvides, TAsyncPorts> = {
    kind: "root",
    graph,
    options,
  };
  const impl = new ContainerImpl<TProvides, never, TAsyncPorts>(config);

  // Create wrapper
  return createUninitializedContainerWrapper(impl);
}

/**
 * Internal type for uninitialized root container.
 * Uses explicit initialize type instead of conditional to avoid TypeScript inference issues.
 */
type UninitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<Container<TProvides, never, TAsyncPorts, "uninitialized">, "initialize"> &
  InternalContainerMethods<TProvides> & {
    initialize: () => Promise<Container<TProvides, never, TAsyncPorts, "initialized">>;
  };

/**
 * Internal type for initialized root container.
 * Uses explicit never type instead of conditional to avoid TypeScript inference issues.
 */
type InitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = Omit<Container<TProvides, never, TAsyncPorts, "initialized">, "initialize"> &
  InternalContainerMethods<TProvides> & {
    readonly initialize: never;
  };

function createUninitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ContainerImpl<TProvides, never, TAsyncPorts>
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
    initialize: async () => {
      await impl.initialize();
      if (initializedContainer === null) {
        initializedContainer = createInitializedContainerWrapper(impl);
      }
      return initializedContainer;
    },
    createScope: () => createRootScope<TProvides, TAsyncPorts, "uninitialized">(impl),
    createChild: (): ContainerBuilder<TProvides, TAsyncPorts> => {
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
      return createContainerBuilderFromLike(parentLike);
    },
    dispose: () => impl.dispose(),
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

function createInitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ContainerImpl<TProvides, never, TAsyncPorts>
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
    get initialize(): never {
      return unreachable("Initialized containers cannot be initialized again");
    },
    createScope: () => createRootScope<TProvides, TAsyncPorts, "initialized">(impl),
    createChild: (): ContainerBuilder<TProvides, TAsyncPorts> => {
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
      return createContainerBuilderFromLike(parentLike);
    },
    dispose: () => impl.dispose(),
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
  containerImpl: ContainerImpl<TProvides, never, TAsyncPorts>
): Scope<TProvides, TAsyncPorts, TPhase> {
  const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo()
  );
  containerImpl.registerChildScope(scopeImpl);
  return createScopeWrapper(scopeImpl);
}
