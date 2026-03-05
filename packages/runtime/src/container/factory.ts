/**
 * Container factory.
 * @packageDocumentation
 */

import type { Port, InferService, AdapterConstraint } from "@hex-di/core";
import { getPortMetadata, isLibraryInspector } from "@hex-di/core";
import { tryCatch, fromPromise, type ResultAsync } from "@hex-di/result";
import { OverrideBuilder, type ContainerForOverride } from "./override-builder.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { mapToContainerError, mapToDisposalError, emitResultEvent } from "./result-helpers.js";
import { ContainerError } from "../errors/index.js";
import type {
  HooksInstaller,
  HookType,
  HookHandler,
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";
import type {
  Container,
  ContainerMembers,
  Scope,
  InheritanceModeConfig,
  LazyContainer,
  CreateContainerConfig,
  CreateChildOptions,
  ContainerKind,
  RuntimePerformanceOptions,
} from "../types.js";
import { ContainerBrand } from "../types.js";
import {
  RootContainerImpl,
  ChildContainerImpl,
  type RootContainerConfig,
  type ParentContainerLike,
} from "./impl.js";
import type { InternalContainerMethods } from "./internal-types.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS } from "../inspection/symbols.js";
import { unreachable } from "../util/unreachable.js";
import { createChildContainerWrapper } from "./wrappers.js";
import type { InspectorAPI } from "../inspection/types.js";
import {
  attachBuiltinAPIs,
  assertInspectorAttached,
  parseChildGraph,
  parseInheritanceModes,
  createChildContainerConfig,
} from "./wrapper-utils.js";

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
 * Union type for hook handlers (beforeResolve or afterResolve).
 * Used as WeakMap key type for handler-to-uninstall mapping.
 * @internal
 */
type AnyHookHandler = HookHandler<"beforeResolve"> | HookHandler<"afterResolve">;

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
 * @param config - Configuration object containing graph, name, and optional hooks/performance settings
 * @returns A frozen Container instance
 *
 * @typeParam TProvides - Port union provided by the graph
 * @typeParam TAsyncPorts - Port union with async factories
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 * });
 * const logger = container.resolve(LoggerPort);
 * ```
 *
 * @example With hooks
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 */
export function createContainer<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
>(
  config: CreateContainerConfig<TProvides, TAsyncPorts>
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  const { graph, name, hooks, performance, safety } = config;

  // Emit tracing warning if no hooks configured
  emitTracingWarning(name, hooks, performance);

  // Create late-binding hooks holder with array for dynamic composition
  // This allows hooks to be installed AFTER container creation via wrappers
  const hooksHolder: HooksHolder = { hookSources: [] };

  // Always create late-binding hooks - wrappers may install hooks later
  const lateBindingHooks = createLateBindingHooks(hooksHolder);

  // Create config with late-binding hooks
  const rootConfig: RootContainerConfig<TProvides, TAsyncPorts> = {
    kind: "root",
    graph,
    containerName: name,
    options: { hooks: lateBindingHooks },
    performance,
    safety,
  };
  const impl = new RootContainerImpl<TProvides, TAsyncPorts>(rootConfig);

  // Create wrapper with hooks holder for dynamic hook installation
  return createUninitializedContainerWrapper(impl, name, hooks, hooksHolder);
}

/**
 * Emits a one-time warning when no resolution hooks are configured.
 * Suppressed in production (NODE_ENV=production) or when opted out
 * via performance.disableTracingWarnings.
 * @internal
 */
function emitTracingWarning(
  containerName: string,
  hooks: ResolutionHooks | undefined,
  performance: RuntimePerformanceOptions | undefined
): void {
  if (performance?.disableTracingWarnings === true) {
    return;
  }
  // Never warn in production
  const gp = globalThis as Record<string, unknown>;
  const proc = gp.process as { env?: Record<string, string | undefined> } | undefined;
  if (proc?.env?.NODE_ENV === "production") {
    return;
  }
  // Only warn if no hooks are configured at creation time
  if (hooks !== undefined) {
    return;
  }
  // Use globalThis.console to avoid TS issues in environments without dom lib
  const g = globalThis as Record<string, unknown>;
  const cons = g.console as { warn?: (msg: string) => void } | undefined;
  if (cons && typeof cons.warn === "function") {
    cons.warn(
      `[@hex-di/runtime] Container "${containerName}" created without resolution hooks. ` +
        `For GxP-compliant observability, configure hooks via createContainer({ hooks: ... }) ` +
        `or use @hex-di/tracing instrumentContainer(). ` +
        `Set performance.disableTracingWarnings to suppress this warning.`
    );
  }
}

/**
 * Internal type for uninitialized root container.
 *
 * Note: "inspector" is initially an optional placeholder.
 * It is set via Object.defineProperty for non-enumerability via attachBuiltinAPIs().
 */
type UninitializedContainerInternals<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "uninitialized">,
  "initialize" | "tryInitialize" | "inspector"
> &
  InternalContainerMethods<TProvides> & {
    initialize: () => Promise<Container<TProvides, never, TAsyncPorts, "initialized">>;
    tryInitialize: () => ResultAsync<
      Container<TProvides, never, TAsyncPorts, "initialized">,
      ContainerError
    >;
    // Placeholder - will be set by attachBuiltinAPIs before freeze
    inspector?: InspectorAPI;
  };

/**
 * Internal type for initialized root container.
 *
 * Note: "inspector" is initially an optional placeholder.
 * It is set via Object.defineProperty for non-enumerability via attachBuiltinAPIs().
 */
type InitializedContainerInternals<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
> = Omit<
  ContainerMembers<TProvides, never, TAsyncPorts, "initialized">,
  "initialize" | "tryInitialize" | "inspector"
> &
  InternalContainerMethods<TProvides> & {
    readonly initialize: never;
    readonly tryInitialize: never;
    // Placeholder - will be set by attachBuiltinAPIs before freeze
    inspector?: InspectorAPI;
  };

function createUninitializedContainerWrapper<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string,
  userHooks: ResolutionHooks | undefined,
  hooksHolder: HooksHolder
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  let initializedContainer: Container<TProvides, never, TAsyncPorts, "initialized"> | null = null;

  // Map from individual handlers to their uninstall functions
  // Using WeakMap to avoid memory leaks if handlers are garbage collected
  const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();

  function resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P): InferService<P> {
    try {
      const value = impl.resolve(port);
      if (container.inspector?.emit) {
        container.inspector.emit({
          type: "result:ok",
          portName: port.__portName,
          timestamp: Date.now(),
        });
      }
      return value;
    } catch (e: unknown) {
      if (container.inspector?.emit) {
        const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
        container.inspector.emit({
          type: "result:err",
          portName: port.__portName,
          errorCode,
          timestamp: Date.now(),
        });
      }
      throw e;
    }
  }

  // Override method defined using a function declaration pattern.
  // This avoids needing `let` + eslint-disable because function declarations
  // can reference variables declared later (hoisting), and when the function
  // is called, `container` will already be assigned.
  //
  // We create a ContainerForOverride object that captures only what OverrideBuilder
  // needs (name + createChild), avoiding type issues with the full container type.
  function overrideMethod<A extends AdapterConstraint>(
    adapter: A
  ): OverrideBuilder<TProvides, never, TAsyncPorts, "uninitialized"> {
    const containerThunk = (): ContainerForOverride<TProvides, TAsyncPorts> => ({
      name: containerName,
      createChild: (graph, options) => container.createChild(graph, options),
    });
    return new OverrideBuilder(containerThunk, [adapter]);
  }

  const container: UninitializedContainerInternals<TProvides, TAsyncPorts> = {
    resolve,
    resolveAsync: async <P extends TProvides>(port: P): Promise<InferService<P>> => {
      try {
        const value = await impl.resolveAsync(port);
        if (container.inspector?.emit) {
          container.inspector.emit({
            type: "result:ok",
            portName: port.__portName,
            timestamp: Date.now(),
          });
        }
        return value;
      } catch (e: unknown) {
        if (container.inspector?.emit) {
          const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
          container.inspector.emit({
            type: "result:err",
            portName: port.__portName,
            errorCode,
            timestamp: Date.now(),
          });
        }
        throw e;
      }
    },
    tryResolve: <P extends Exclude<TProvides, TAsyncPorts>>(port: P) => {
      const result = tryCatch(() => impl.resolve(port), mapToContainerError);
      emitResultEvent(container.inspector, port.__portName, result);
      return result;
    },
    tryResolveAsync: <P extends TProvides>(port: P) => {
      const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
      void resultAsync.then(result => {
        emitResultEvent(container.inspector, port.__portName, result);
      });
      return resultAsync;
    },
    tryDispose: () => fromPromise(impl.dispose(), mapToDisposalError),
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
          containerName,
          hooksHolder,
          handlerToUninstall
        );
      }
      return initializedContainer;
    },
    tryInitialize: () => {
      return fromPromise(
        (async () => {
          await impl.initialize();
          if (initializedContainer === null) {
            initializedContainer = createInitializedContainerWrapper<TProvides, TAsyncPorts>(
              impl,
              containerName,
              hooksHolder,
              handlerToUninstall
            );
          }
          return initializedContainer;
        })(),
        mapToContainerError
      );
    },
    createScope: (scopeName?: string) =>
      createRootScope<TProvides, TAsyncPorts, "uninitialized">(
        impl,
        scopeName,
        () => container.inspector
      ),
    createChild: <
      TChildGraph extends Graph<
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
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
        options.inheritanceModes,
        options.performance
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
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainer(container, containerName, graphLoader, options),
    dispose: async () => {
      container.inspector?.disposeLibraries?.();
      await impl.dispose();
      assertInspectorAttached(container);
      return container;
    },

    get isInitialized() {
      return impl.isInitialized;
    },
    get isDisposed() {
      return impl.isDisposed;
    },
    has: (port): port is TProvides => impl.has(port),
    hasAdapter: port => impl.hasAdapter(port),
    addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
      // Guard: If same handler already registered, uninstall previous first
      const existingUninstall = handlerToUninstall.get(handler);
      if (existingUninstall !== undefined) {
        existingUninstall();
        handlerToUninstall.delete(handler);
      }

      // Create a ResolutionHooks object with just this handler
      const hooks: ResolutionHooks =
        type === "beforeResolve"
          ? { beforeResolve: handler as (ctx: ResolutionHookContext) => void }
          : { afterResolve: handler as (ctx: ResolutionResultContext) => void };

      // Store uninstall function for later removal
      const uninstall = (): void => {
        const idx = hooksHolder.hookSources.indexOf(hooks);
        if (idx !== -1) {
          hooksHolder.hookSources.splice(idx, 1);
        }
      };
      handlerToUninstall.set(handler, uninstall);
      hooksHolder.hookSources.push(hooks);
    },
    removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
      const uninstall = handlerToUninstall.get(handler);
      if (uninstall) {
        uninstall();
        handlerToUninstall.delete(handler);
      }
    },
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
    // Type-safe override builder API
    override: overrideMethod,
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

  // Add built-in inspector API as non-enumerable property
  attachBuiltinAPIs(container);

  // Install auto-discovery hook for library inspectors
  hooksHolder.hookSources.push({
    afterResolve: ctx => {
      if (ctx.result !== undefined) {
        const portMeta = getPortMetadata(ctx.port);
        if (portMeta?.category === "library-inspector" && isLibraryInspector(ctx.result)) {
          container.inspector?.registerLibrary(ctx.result);
        }
      }
    },
  });

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

  // Set wrapper reference on impl so registerChildContainer can access parent inspector
  impl.setWrapper(container);

  Object.freeze(container);
  return container;
}

function createInitializedContainerWrapper<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string,
  hooksHolder: HooksHolder,
  handlerToUninstall: WeakMap<AnyHookHandler, () => void>
): Container<TProvides, never, TAsyncPorts, "initialized"> {
  function resolve<P extends TProvides>(port: P): InferService<P> {
    try {
      const value = impl.resolve(port);
      if (container.inspector?.emit) {
        container.inspector.emit({
          type: "result:ok",
          portName: port.__portName,
          timestamp: Date.now(),
        });
      }
      return value;
    } catch (e: unknown) {
      if (container.inspector?.emit) {
        const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
        container.inspector.emit({
          type: "result:err",
          portName: port.__portName,
          errorCode,
          timestamp: Date.now(),
        });
      }
      throw e;
    }
  }

  // Override method defined using a function declaration pattern.
  // This avoids needing `let` + eslint-disable because function declarations
  // can reference variables declared later (hoisting), and when the function
  // is called, `container` will already be assigned.
  //
  // We create a ContainerForOverride object that captures only what OverrideBuilder
  // needs (name + createChild), avoiding type issues with the full container type.
  function overrideMethod<A extends AdapterConstraint>(
    adapter: A
  ): OverrideBuilder<TProvides, never, TAsyncPorts, "initialized"> {
    const containerThunk = (): ContainerForOverride<TProvides, TAsyncPorts> => ({
      name: containerName,
      createChild: (graph, options) => container.createChild(graph, options),
    });
    return new OverrideBuilder(containerThunk, [adapter]);
  }

  const container: InitializedContainerInternals<TProvides, TAsyncPorts> = {
    resolve,
    resolveAsync: async <P extends TProvides>(port: P): Promise<InferService<P>> => {
      try {
        const value = await impl.resolveAsync(port);
        if (container.inspector?.emit) {
          container.inspector.emit({
            type: "result:ok",
            portName: port.__portName,
            timestamp: Date.now(),
          });
        }
        return value;
      } catch (e: unknown) {
        if (container.inspector?.emit) {
          const errorCode = e instanceof ContainerError ? e.code : "UNKNOWN";
          container.inspector.emit({
            type: "result:err",
            portName: port.__portName,
            errorCode,
            timestamp: Date.now(),
          });
        }
        throw e;
      }
    },
    tryResolve: <P extends TProvides>(port: P) => {
      const result = tryCatch(() => impl.resolve(port), mapToContainerError);
      emitResultEvent(container.inspector, port.__portName, result);
      return result;
    },
    tryResolveAsync: <P extends TProvides>(port: P) => {
      const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
      void resultAsync.then(result => {
        emitResultEvent(container.inspector, port.__portName, result);
      });
      return resultAsync;
    },
    tryDispose: () => fromPromise(impl.dispose(), mapToDisposalError),
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
    get tryInitialize(): never {
      return unreachable("Initialized containers cannot be initialized again");
    },
    createScope: (name?: string) =>
      createRootScope<TProvides, TAsyncPorts, "initialized">(impl, name, () => container.inspector),
    createChild: <
      TChildGraph extends Graph<
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
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
        options.inheritanceModes,
        options.performance
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
        Port<string, unknown>,
        Port<string, unknown>,
        Port<string, unknown>
      >,
    >(
      graphLoader: () => Promise<TChildGraph>,
      options: CreateChildOptions<TProvides>
    ): LazyContainer<
      TProvides,
      Exclude<InferGraphProvides<TChildGraph>, TProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    > => createLazyChildContainer(container, containerName, graphLoader, options),
    dispose: async () => {
      container.inspector?.disposeLibraries?.();
      await impl.dispose();
      assertInspectorAttached(container);
      return container;
    },

    get isInitialized() {
      return impl.isInitialized;
    },
    get isDisposed() {
      return impl.isDisposed;
    },
    has: (port): port is TProvides => impl.has(port),
    hasAdapter: port => impl.hasAdapter(port),
    addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
      // Guard: If same handler already registered, uninstall previous first
      const existingUninstall = handlerToUninstall.get(handler);
      if (existingUninstall !== undefined) {
        existingUninstall();
        handlerToUninstall.delete(handler);
      }

      // Create a ResolutionHooks object with just this handler
      const hooks: ResolutionHooks =
        type === "beforeResolve"
          ? { beforeResolve: handler as (ctx: ResolutionHookContext) => void }
          : { afterResolve: handler as (ctx: ResolutionResultContext) => void };

      // Store uninstall function for later removal
      const uninstall = (): void => {
        const idx = hooksHolder.hookSources.indexOf(hooks);
        if (idx !== -1) {
          hooksHolder.hookSources.splice(idx, 1);
        }
      };
      handlerToUninstall.set(handler, uninstall);
      hooksHolder.hookSources.push(hooks);
    },
    removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
      const uninstall = handlerToUninstall.get(handler);
      if (uninstall) {
        uninstall();
        handlerToUninstall.delete(handler);
      }
    },
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
    // Type-safe override builder API
    override: overrideMethod,
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

  // Add built-in inspector API as non-enumerable property
  attachBuiltinAPIs(container);

  // Set wrapper reference on impl so registerChildContainer can access parent inspector
  impl.setWrapper(container);

  Object.freeze(container);
  return container;
}

// Helper to avoid circular dependency issues if possible, or just import ScopeImpl
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";

function createRootScope<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TPhase extends "uninitialized" | "initialized",
>(
  containerImpl: RootContainerImpl<TProvides, TAsyncPorts>,
  name?: string,
  getInspector?: () => InspectorAPI | undefined
): Scope<TProvides, TAsyncPorts, TPhase> {
  const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
    containerImpl,
    containerImpl.getSingletonMemo(),
    null, // parentScope
    () => containerImpl.unregisterChildScope(scopeImpl), // unregister callback for disposal
    name
  );
  containerImpl.registerChildScope(scopeImpl);

  return createScopeWrapper(scopeImpl, getInspector);
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
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 * @param performance - Optional performance options
 *
 * @internal
 */
function createChildFromGraph<
  TParentProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>,
  childGraph: TChildGraph,
  childName: string,
  parentName: string,
  inheritanceModes?: InheritanceModeConfig<TParentProvides>,
  performance?: RuntimePerformanceOptions
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
    parentName,
    performance
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
  TParentProvides extends Port<string, unknown>,
  TParentExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
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
  TParentProvides extends Port<string, unknown>,
  TParentExtends extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
  TChildGraph extends Graph<Port<string, unknown>, Port<string, unknown>, Port<string, unknown>>,
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
