/**
 * Container factory.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { ContainerOptions } from "../resolution/hooks.js";
import type { Container, Scope } from "../types.js";
import { ContainerBrand } from "../types.js";
import { ContainerImpl } from "./impl.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../inspector/symbols.js";
import { unreachable } from "../common/unreachable.js";

/**
 * Creates a new dependency injection container from a graph.
 *
 * @param graph - The validated ServiceGraph containing all adapters
 * @param options - Optional configuration including resolution hooks
 * @returns A frozen Container instance
 */
export function createContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  graph: Graph<TProvides, Port<unknown, string>>,
  options?: ContainerOptions
): Container<TProvides, TAsyncPorts, "uninitialized"> {
  const impl = new ContainerImpl<TProvides, TAsyncPorts>(graph, options);

  // Create wrapper
  return createUninitializedContainerWrapper(impl);
}

import { createChildContainerBuilderFromLike } from "../child-container/impl.js";
import type {
  ParentContainerLike,
  InternalContainerMethods,
} from "../child-container/internal-types.js";

type ContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends "uninitialized" | "initialized",
> = Container<TProvides, TAsyncPorts, TPhase> & InternalContainerMethods<TProvides>;

function createUninitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(impl: ContainerImpl<TProvides, TAsyncPorts>): Container<TProvides, TAsyncPorts, "uninitialized"> {
  let initializedContainer: Container<TProvides, TAsyncPorts, "initialized"> | null = null;

  function resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const container: ContainerInternals<TProvides, TAsyncPorts, "uninitialized"> = {
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
    createChild: () => {
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
      return createChildContainerBuilderFromLike(parentLike);
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
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides }>("Container brand is type-only");
    },
  };

  Object.freeze(container);
  return container;
}

function createInitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(impl: ContainerImpl<TProvides, TAsyncPorts>): Container<TProvides, TAsyncPorts, "initialized"> {
  function resolve<P extends TProvides>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const container: ContainerInternals<TProvides, TAsyncPorts, "initialized"> = {
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
    createChild: () => {
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
      return createChildContainerBuilderFromLike(parentLike);
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
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    get [ContainerBrand]() {
      return unreachable<{ provides: TProvides }>("Container brand is type-only");
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
>(containerImpl: ContainerImpl<TProvides, TAsyncPorts>): Scope<TProvides, TAsyncPorts, TPhase> {
  const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo()
  );
  containerImpl.registerChildScope(scopeImpl);
  return createScopeWrapper(scopeImpl);
}
