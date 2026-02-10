/**
 * Container factory.
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Port, InferService, AdapterConstraint } from "@hex-di/core";
import { getPortMetadata, isLibraryInspector } from "@hex-di/core";
import { tryCatch, fromPromise, type ResultAsync } from "@hex-di/result";
import { OverrideBuilder, type ContainerForOverride } from "./override-builder.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { mapToContainerError, mapToDisposalError, emitResultEvent } from "./result-helpers.js";
import type { ContainerError } from "../errors/index.js";
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
  if (stryMutAct_9fa48("258")) {
    {
    }
  } else {
    stryCov_9fa48("258");
    return stryMutAct_9fa48("259")
      ? {}
      : (stryCov_9fa48("259"),
        {
          beforeResolve(ctx: ResolutionHookContext): void {
            if (stryMutAct_9fa48("260")) {
              {
              }
            } else {
              stryCov_9fa48("260");
              // Call beforeResolve in order of installation
              for (const source of holder.hookSources) {
                if (stryMutAct_9fa48("261")) {
                  {
                  }
                } else {
                  stryCov_9fa48("261");
                  stryMutAct_9fa48("262")
                    ? source.beforeResolve(ctx)
                    : (stryCov_9fa48("262"), source.beforeResolve?.(ctx));
                }
              }
            }
          },
          afterResolve(ctx: ResolutionResultContext): void {
            if (stryMutAct_9fa48("263")) {
              {
              }
            } else {
              stryCov_9fa48("263");
              // Call afterResolve in reverse order (middleware pattern)
              for (
                let i = stryMutAct_9fa48("264")
                  ? holder.hookSources.length + 1
                  : (stryCov_9fa48("264"), holder.hookSources.length - 1);
                stryMutAct_9fa48("267")
                  ? i < 0
                  : stryMutAct_9fa48("266")
                    ? i > 0
                    : stryMutAct_9fa48("265")
                      ? false
                      : (stryCov_9fa48("265", "266", "267"), i >= 0);
                stryMutAct_9fa48("268") ? i++ : (stryCov_9fa48("268"), i--)
              ) {
                if (stryMutAct_9fa48("269")) {
                  {
                  }
                } else {
                  stryCov_9fa48("269");
                  stryMutAct_9fa48("270")
                    ? holder.hookSources[i].afterResolve(ctx)
                    : (stryCov_9fa48("270"), holder.hookSources[i].afterResolve?.(ctx));
                }
              }
            }
          },
        });
  }
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
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  config: CreateContainerConfig<TProvides, TAsyncPorts>
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  if (stryMutAct_9fa48("271")) {
    {
    }
  } else {
    stryCov_9fa48("271");
    const { graph, name, hooks, performance } = config;

    // Create late-binding hooks holder with array for dynamic composition
    // This allows hooks to be installed AFTER container creation via wrappers
    const hooksHolder: HooksHolder = stryMutAct_9fa48("272")
      ? {}
      : (stryCov_9fa48("272"),
        {
          hookSources: stryMutAct_9fa48("273") ? ["Stryker was here"] : (stryCov_9fa48("273"), []),
        });

    // Always create late-binding hooks - wrappers may install hooks later
    const lateBindingHooks = createLateBindingHooks(hooksHolder);

    // Create config with late-binding hooks
    const rootConfig: RootContainerConfig<TProvides, TAsyncPorts> = stryMutAct_9fa48("274")
      ? {}
      : (stryCov_9fa48("274"),
        {
          kind: stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), "root"),
          graph,
          containerName: name,
          options: stryMutAct_9fa48("276")
            ? {}
            : (stryCov_9fa48("276"),
              {
                hooks: lateBindingHooks,
              }),
          performance,
        });
    const impl = new RootContainerImpl<TProvides, TAsyncPorts>(rootConfig);

    // Create wrapper with hooks holder for dynamic hook installation
    return createUninitializedContainerWrapper(impl, name, hooks, hooksHolder);
  }
}

/**
 * Internal type for uninitialized root container.
 *
 * Note: "inspector" is initially an optional placeholder.
 * It is set via Object.defineProperty for non-enumerability via attachBuiltinAPIs().
 */
type UninitializedContainerInternals<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
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
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
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
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string,
  userHooks: ResolutionHooks | undefined,
  hooksHolder: HooksHolder
): Container<TProvides, never, TAsyncPorts, "uninitialized"> {
  if (stryMutAct_9fa48("277")) {
    {
    }
  } else {
    stryCov_9fa48("277");
    let initializedContainer: Container<TProvides, never, TAsyncPorts, "initialized"> | null = null;

    // Map from individual handlers to their uninstall functions
    // Using WeakMap to avoid memory leaks if handlers are garbage collected
    const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();
    function resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P): InferService<P> {
      if (stryMutAct_9fa48("278")) {
        {
        }
      } else {
        stryCov_9fa48("278");
        return impl.resolve(port);
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
      if (stryMutAct_9fa48("279")) {
        {
        }
      } else {
        stryCov_9fa48("279");
        const containerThunk = stryMutAct_9fa48("280")
          ? () => undefined
          : (stryCov_9fa48("280"),
            (() => {
              const containerThunk = (): ContainerForOverride<TProvides, TAsyncPorts> =>
                stryMutAct_9fa48("281")
                  ? {}
                  : (stryCov_9fa48("281"),
                    {
                      name: containerName,
                      createChild: stryMutAct_9fa48("282")
                        ? () => undefined
                        : (stryCov_9fa48("282"),
                          (graph, options) => container.createChild(graph, options)),
                    });
              return containerThunk;
            })());
        return new OverrideBuilder(
          containerThunk,
          stryMutAct_9fa48("283") ? [] : (stryCov_9fa48("283"), [adapter])
        );
      }
    }
    const container: UninitializedContainerInternals<TProvides, TAsyncPorts> = stryMutAct_9fa48(
      "284"
    )
      ? {}
      : (stryCov_9fa48("284"),
        {
          resolve,
          resolveAsync: stryMutAct_9fa48("285")
            ? () => undefined
            : (stryCov_9fa48("285"),
              <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port)),
          tryResolve: <P extends Exclude<TProvides, TAsyncPorts>>(port: P) => {
            if (stryMutAct_9fa48("286")) {
              {
              }
            } else {
              stryCov_9fa48("286");
              const result = tryCatch(
                stryMutAct_9fa48("287")
                  ? () => undefined
                  : (stryCov_9fa48("287"), () => impl.resolve(port)),
                mapToContainerError
              );
              emitResultEvent(container.inspector, port.__portName, result);
              return result;
            }
          },
          tryResolveAsync: <P extends TProvides>(port: P) => {
            if (stryMutAct_9fa48("288")) {
              {
              }
            } else {
              stryCov_9fa48("288");
              const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
              void resultAsync.then(result => {
                if (stryMutAct_9fa48("289")) {
                  {
                  }
                } else {
                  stryCov_9fa48("289");
                  emitResultEvent(container.inspector, port.__portName, result);
                }
              });
              return resultAsync;
            }
          },
          tryDispose: stryMutAct_9fa48("290")
            ? () => undefined
            : (stryCov_9fa48("290"), () => fromPromise(impl.dispose(), mapToDisposalError)),
          resolveInternal: stryMutAct_9fa48("291")
            ? () => undefined
            : (stryCov_9fa48("291"),
              <P extends TProvides>(port: P): InferService<P> => impl.resolve(port)),
          resolveAsyncInternal: stryMutAct_9fa48("292")
            ? () => undefined
            : (stryCov_9fa48("292"),
              <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port)),
          // Container naming properties
          name: containerName,
          parentName: null,
          // Root containers have no parent
          kind: "root" as ContainerKind,
          initialize: async () => {
            if (stryMutAct_9fa48("293")) {
              {
              }
            } else {
              stryCov_9fa48("293");
              await impl.initialize();
              if (
                stryMutAct_9fa48("296")
                  ? initializedContainer !== null
                  : stryMutAct_9fa48("295")
                    ? false
                    : stryMutAct_9fa48("294")
                      ? true
                      : (stryCov_9fa48("294", "295", "296"), initializedContainer === null)
              ) {
                if (stryMutAct_9fa48("297")) {
                  {
                  }
                } else {
                  stryCov_9fa48("297");
                  initializedContainer = createInitializedContainerWrapper<TProvides, TAsyncPorts>(
                    impl,
                    containerName,
                    hooksHolder,
                    handlerToUninstall
                  );
                }
              }
              return initializedContainer;
            }
          },
          tryInitialize: () => {
            if (stryMutAct_9fa48("298")) {
              {
              }
            } else {
              stryCov_9fa48("298");
              return fromPromise(
                (async () => {
                  if (stryMutAct_9fa48("299")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("299");
                    await impl.initialize();
                    if (
                      stryMutAct_9fa48("302")
                        ? initializedContainer !== null
                        : stryMutAct_9fa48("301")
                          ? false
                          : stryMutAct_9fa48("300")
                            ? true
                            : (stryCov_9fa48("300", "301", "302"), initializedContainer === null)
                    ) {
                      if (stryMutAct_9fa48("303")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("303");
                        initializedContainer = createInitializedContainerWrapper<
                          TProvides,
                          TAsyncPorts
                        >(impl, containerName, hooksHolder, handlerToUninstall);
                      }
                    }
                    return initializedContainer;
                  }
                })(),
                mapToContainerError
              );
            }
          },
          createScope: stryMutAct_9fa48("304")
            ? () => undefined
            : (stryCov_9fa48("304"),
              (scopeName?: string) =>
                createRootScope<TProvides, TAsyncPorts, "uninitialized">(
                  impl,
                  scopeName,
                  stryMutAct_9fa48("305")
                    ? () => undefined
                    : (stryCov_9fa48("305"), () => container.inspector)
                )),
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
            if (stryMutAct_9fa48("306")) {
              {
              }
            } else {
              stryCov_9fa48("306");
              const parentLike: ParentContainerLike<TProvides, TAsyncPorts> = stryMutAct_9fa48(
                "307"
              )
                ? {}
                : (stryCov_9fa48("307"),
                  {
                    resolveInternal: stryMutAct_9fa48("308")
                      ? () => undefined
                      : (stryCov_9fa48("308"),
                        <P extends TProvides>(port: P) => impl.resolve(port)),
                    resolveAsyncInternal: stryMutAct_9fa48("309")
                      ? () => undefined
                      : (stryCov_9fa48("309"),
                        <P extends TProvides>(port: P) => impl.resolveAsync(port)),
                    has: stryMutAct_9fa48("310")
                      ? () => undefined
                      : (stryCov_9fa48("310"), port => impl.has(port)),
                    hasAdapter: stryMutAct_9fa48("311")
                      ? () => undefined
                      : (stryCov_9fa48("311"), port => impl.hasAdapter(port)),
                    [ADAPTER_ACCESS]: stryMutAct_9fa48("312")
                      ? () => undefined
                      : (stryCov_9fa48("312"), port => impl.getAdapter(port)),
                    registerChildContainer: stryMutAct_9fa48("313")
                      ? () => undefined
                      : (stryCov_9fa48("313"), child => impl.registerChildContainer(child)),
                    unregisterChildContainer: stryMutAct_9fa48("314")
                      ? () => undefined
                      : (stryCov_9fa48("314"), child => impl.unregisterChildContainer(child)),
                    originalParent: container,
                  });
              return createChildFromGraph<TProvides, TAsyncPorts, TChildGraph>(
                parentLike,
                childGraph,
                options.name,
                containerName,
                // parent's name
                options.inheritanceModes,
                options.performance
              );
            }
          },
          createChildAsync: stryMutAct_9fa48("315")
            ? () => undefined
            : (stryCov_9fa48("315"),
              <
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
              > => createChildContainerAsync(container, containerName, graphLoader, options)),
          createLazyChild: stryMutAct_9fa48("316")
            ? () => undefined
            : (stryCov_9fa48("316"),
              <
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
              > => createLazyChildContainer(container, containerName, graphLoader, options)),
          dispose: async () => {
            if (stryMutAct_9fa48("317")) {
              {
              }
            } else {
              stryCov_9fa48("317");
              stryMutAct_9fa48("319")
                ? container.inspector.disposeLibraries?.()
                : stryMutAct_9fa48("318")
                  ? container.inspector?.disposeLibraries()
                  : (stryCov_9fa48("318", "319"), container.inspector?.disposeLibraries?.());
              await impl.dispose();
            }
          },
          get isInitialized() {
            if (stryMutAct_9fa48("320")) {
              {
              }
            } else {
              stryCov_9fa48("320");
              return impl.isInitialized;
            }
          },
          get isDisposed() {
            if (stryMutAct_9fa48("321")) {
              {
              }
            } else {
              stryCov_9fa48("321");
              return impl.isDisposed;
            }
          },
          has: stryMutAct_9fa48("322")
            ? () => undefined
            : (stryCov_9fa48("322"), (port): port is TProvides => impl.has(port)),
          hasAdapter: stryMutAct_9fa48("323")
            ? () => undefined
            : (stryCov_9fa48("323"), port => impl.hasAdapter(port)),
          addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("324")) {
              {
              }
            } else {
              stryCov_9fa48("324");
              // Create a ResolutionHooks object with just this handler
              const hooks: ResolutionHooks = (
                stryMutAct_9fa48("327")
                  ? type !== "beforeResolve"
                  : stryMutAct_9fa48("326")
                    ? false
                    : stryMutAct_9fa48("325")
                      ? true
                      : (stryCov_9fa48("325", "326", "327"),
                        type ===
                          (stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), "beforeResolve")))
              )
                ? stryMutAct_9fa48("329")
                  ? {}
                  : (stryCov_9fa48("329"),
                    {
                      beforeResolve: handler as (ctx: ResolutionHookContext) => void,
                    })
                : stryMutAct_9fa48("330")
                  ? {}
                  : (stryCov_9fa48("330"),
                    {
                      afterResolve: handler as (ctx: ResolutionResultContext) => void,
                    });

              // Store uninstall function for later removal
              const uninstall = (): void => {
                if (stryMutAct_9fa48("331")) {
                  {
                  }
                } else {
                  stryCov_9fa48("331");
                  const idx = hooksHolder.hookSources.indexOf(hooks);
                  if (
                    stryMutAct_9fa48("334")
                      ? idx === -1
                      : stryMutAct_9fa48("333")
                        ? false
                        : stryMutAct_9fa48("332")
                          ? true
                          : (stryCov_9fa48("332", "333", "334"),
                            idx !== (stryMutAct_9fa48("335") ? +1 : (stryCov_9fa48("335"), -1)))
                  ) {
                    if (stryMutAct_9fa48("336")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("336");
                      hooksHolder.hookSources.splice(idx, 1);
                    }
                  }
                }
              };
              handlerToUninstall.set(handler, uninstall);
              hooksHolder.hookSources.push(hooks);
            }
          },
          removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("337")) {
              {
              }
            } else {
              stryCov_9fa48("337");
              const uninstall = handlerToUninstall.get(handler);
              if (
                stryMutAct_9fa48("339")
                  ? false
                  : stryMutAct_9fa48("338")
                    ? true
                    : (stryCov_9fa48("338", "339"), uninstall)
              ) {
                if (stryMutAct_9fa48("340")) {
                  {
                  }
                } else {
                  stryCov_9fa48("340");
                  uninstall();
                  handlerToUninstall.delete(handler);
                }
              }
            }
          },
          // Placeholder getter - will be replaced with non-enumerable version below
          get parent(): never {
            if (stryMutAct_9fa48("341")) {
              {
              }
            } else {
              stryCov_9fa48("341");
              return unreachable(
                stryMutAct_9fa48("342")
                  ? ""
                  : (stryCov_9fa48("342"), "Root containers do not have a parent")
              );
            }
          },
          [INTERNAL_ACCESS]: stryMutAct_9fa48("343")
            ? () => undefined
            : (stryCov_9fa48("343"), () => impl.getInternalState()),
          [ADAPTER_ACCESS]: stryMutAct_9fa48("344")
            ? () => undefined
            : (stryCov_9fa48("344"), port => impl.getAdapter(port)),
          registerChildContainer: stryMutAct_9fa48("345")
            ? () => undefined
            : (stryCov_9fa48("345"), child => impl.registerChildContainer(child)),
          unregisterChildContainer: stryMutAct_9fa48("346")
            ? () => undefined
            : (stryCov_9fa48("346"), child => impl.unregisterChildContainer(child)),
          // Placeholder getter - will be replaced with non-enumerable version below
          get [ContainerBrand]() {
            if (stryMutAct_9fa48("347")) {
              {
              }
            } else {
              stryCov_9fa48("347");
              return unreachable<{
                provides: TProvides;
                extends: never;
              }>(
                stryMutAct_9fa48("348")
                  ? ""
                  : (stryCov_9fa48("348"), "Container brand is type-only")
              );
            }
          },
          // Type-safe override builder API
          override: overrideMethod,
        });

    // Add .parent getter as non-enumerable to prevent React DevTools from triggering it
    // Root containers have no parent - accessing this property throws an error
    Object.defineProperty(
      container,
      stryMutAct_9fa48("349") ? "" : (stryCov_9fa48("349"), "parent"),
      stryMutAct_9fa48("350")
        ? {}
        : (stryCov_9fa48("350"),
          {
            get(): never {
              if (stryMutAct_9fa48("351")) {
                {
                }
              } else {
                stryCov_9fa48("351");
                return unreachable(
                  stryMutAct_9fa48("352")
                    ? ""
                    : (stryCov_9fa48("352"), "Root containers do not have a parent")
                );
              }
            },
            enumerable: stryMutAct_9fa48("353") ? true : (stryCov_9fa48("353"), false),
            configurable: stryMutAct_9fa48("354") ? true : (stryCov_9fa48("354"), false),
          })
    );

    // Add ContainerBrand getter as non-enumerable (type-only property)
    Object.defineProperty(
      container,
      ContainerBrand,
      stryMutAct_9fa48("355")
        ? {}
        : (stryCov_9fa48("355"),
          {
            get(): never {
              if (stryMutAct_9fa48("356")) {
                {
                }
              } else {
                stryCov_9fa48("356");
                return unreachable(
                  stryMutAct_9fa48("357")
                    ? ""
                    : (stryCov_9fa48("357"), "Container brand is type-only")
                );
              }
            },
            enumerable: stryMutAct_9fa48("358") ? true : (stryCov_9fa48("358"), false),
            configurable: stryMutAct_9fa48("359") ? true : (stryCov_9fa48("359"), false),
          })
    );

    // Add built-in inspector API as non-enumerable property
    attachBuiltinAPIs(container);

    // Install auto-discovery hook for library inspectors
    hooksHolder.hookSources.push(
      stryMutAct_9fa48("360")
        ? {}
        : (stryCov_9fa48("360"),
          {
            afterResolve: ctx => {
              if (stryMutAct_9fa48("361")) {
                {
                }
              } else {
                stryCov_9fa48("361");
                if (
                  stryMutAct_9fa48("364")
                    ? ctx.result === undefined
                    : stryMutAct_9fa48("363")
                      ? false
                      : stryMutAct_9fa48("362")
                        ? true
                        : (stryCov_9fa48("362", "363", "364"), ctx.result !== undefined)
                ) {
                  if (stryMutAct_9fa48("365")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("365");
                    const portMeta = getPortMetadata(ctx.port);
                    if (
                      stryMutAct_9fa48("368")
                        ? portMeta?.category === "library-inspector" ||
                          isLibraryInspector(ctx.result)
                        : stryMutAct_9fa48("367")
                          ? false
                          : stryMutAct_9fa48("366")
                            ? true
                            : (stryCov_9fa48("366", "367", "368"),
                              (stryMutAct_9fa48("370")
                                ? portMeta?.category !== "library-inspector"
                                : stryMutAct_9fa48("369")
                                  ? true
                                  : (stryCov_9fa48("369", "370"),
                                    (stryMutAct_9fa48("371")
                                      ? portMeta.category
                                      : (stryCov_9fa48("371"), portMeta?.category)) ===
                                      (stryMutAct_9fa48("372")
                                        ? ""
                                        : (stryCov_9fa48("372"), "library-inspector")))) &&
                                isLibraryInspector(ctx.result))
                    ) {
                      if (stryMutAct_9fa48("373")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("373");
                        stryMutAct_9fa48("374")
                          ? container.inspector.registerLibrary(ctx.result)
                          : (stryCov_9fa48("374"),
                            container.inspector?.registerLibrary(ctx.result));
                      }
                    }
                  }
                }
              }
            },
          })
    );

    // Add user hooks to hookSources (if any)
    if (
      stryMutAct_9fa48("377")
        ? userHooks === undefined
        : stryMutAct_9fa48("376")
          ? false
          : stryMutAct_9fa48("375")
            ? true
            : (stryCov_9fa48("375", "376", "377"), userHooks !== undefined)
    ) {
      if (stryMutAct_9fa48("378")) {
        {
        }
      } else {
        stryCov_9fa48("378");
        hooksHolder.hookSources.push(userHooks);
      }
    }

    // Add HOOKS_ACCESS for dynamic hook installation via wrappers
    const hooksInstaller: HooksInstaller = stryMutAct_9fa48("379")
      ? {}
      : (stryCov_9fa48("379"),
        {
          installHooks(hooks: ResolutionHooks): () => void {
            if (stryMutAct_9fa48("380")) {
              {
              }
            } else {
              stryCov_9fa48("380");
              hooksHolder.hookSources.push(hooks);
              return () => {
                if (stryMutAct_9fa48("381")) {
                  {
                  }
                } else {
                  stryCov_9fa48("381");
                  const idx = hooksHolder.hookSources.indexOf(hooks);
                  if (
                    stryMutAct_9fa48("384")
                      ? idx === -1
                      : stryMutAct_9fa48("383")
                        ? false
                        : stryMutAct_9fa48("382")
                          ? true
                          : (stryCov_9fa48("382", "383", "384"),
                            idx !== (stryMutAct_9fa48("385") ? +1 : (stryCov_9fa48("385"), -1)))
                  ) {
                    if (stryMutAct_9fa48("386")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("386");
                      hooksHolder.hookSources.splice(idx, 1);
                    }
                  }
                }
              };
            }
          },
        });
    Object.defineProperty(
      container,
      HOOKS_ACCESS,
      stryMutAct_9fa48("387")
        ? {}
        : (stryCov_9fa48("387"),
          {
            value: stryMutAct_9fa48("388")
              ? () => undefined
              : (stryCov_9fa48("388"), () => hooksInstaller),
            writable: stryMutAct_9fa48("389") ? true : (stryCov_9fa48("389"), false),
            enumerable: stryMutAct_9fa48("390") ? true : (stryCov_9fa48("390"), false),
            configurable: stryMutAct_9fa48("391") ? true : (stryCov_9fa48("391"), false),
          })
    );

    // Set wrapper reference on impl so registerChildContainer can access parent inspector
    impl.setWrapper(container);
    Object.freeze(container);
    return container;
  }
}
function createInitializedContainerWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: RootContainerImpl<TProvides, TAsyncPorts>,
  containerName: string,
  hooksHolder: HooksHolder,
  handlerToUninstall: WeakMap<AnyHookHandler, () => void>
): Container<TProvides, never, TAsyncPorts, "initialized"> {
  if (stryMutAct_9fa48("392")) {
    {
    }
  } else {
    stryCov_9fa48("392");
    function resolve<P extends TProvides>(port: P): InferService<P> {
      if (stryMutAct_9fa48("393")) {
        {
        }
      } else {
        stryCov_9fa48("393");
        return impl.resolve(port);
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
      if (stryMutAct_9fa48("394")) {
        {
        }
      } else {
        stryCov_9fa48("394");
        const containerThunk = stryMutAct_9fa48("395")
          ? () => undefined
          : (stryCov_9fa48("395"),
            (() => {
              const containerThunk = (): ContainerForOverride<TProvides, TAsyncPorts> =>
                stryMutAct_9fa48("396")
                  ? {}
                  : (stryCov_9fa48("396"),
                    {
                      name: containerName,
                      createChild: stryMutAct_9fa48("397")
                        ? () => undefined
                        : (stryCov_9fa48("397"),
                          (graph, options) => container.createChild(graph, options)),
                    });
              return containerThunk;
            })());
        return new OverrideBuilder(
          containerThunk,
          stryMutAct_9fa48("398") ? [] : (stryCov_9fa48("398"), [adapter])
        );
      }
    }
    const container: InitializedContainerInternals<TProvides, TAsyncPorts> = stryMutAct_9fa48("399")
      ? {}
      : (stryCov_9fa48("399"),
        {
          resolve,
          resolveAsync: stryMutAct_9fa48("400")
            ? () => undefined
            : (stryCov_9fa48("400"),
              <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port)),
          tryResolve: <P extends TProvides>(port: P) => {
            if (stryMutAct_9fa48("401")) {
              {
              }
            } else {
              stryCov_9fa48("401");
              const result = tryCatch(
                stryMutAct_9fa48("402")
                  ? () => undefined
                  : (stryCov_9fa48("402"), () => impl.resolve(port)),
                mapToContainerError
              );
              emitResultEvent(container.inspector, port.__portName, result);
              return result;
            }
          },
          tryResolveAsync: <P extends TProvides>(port: P) => {
            if (stryMutAct_9fa48("403")) {
              {
              }
            } else {
              stryCov_9fa48("403");
              const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
              void resultAsync.then(result => {
                if (stryMutAct_9fa48("404")) {
                  {
                  }
                } else {
                  stryCov_9fa48("404");
                  emitResultEvent(container.inspector, port.__portName, result);
                }
              });
              return resultAsync;
            }
          },
          tryDispose: stryMutAct_9fa48("405")
            ? () => undefined
            : (stryCov_9fa48("405"), () => fromPromise(impl.dispose(), mapToDisposalError)),
          resolveInternal: stryMutAct_9fa48("406")
            ? () => undefined
            : (stryCov_9fa48("406"),
              <P extends TProvides>(port: P): InferService<P> => impl.resolve(port)),
          resolveAsyncInternal: stryMutAct_9fa48("407")
            ? () => undefined
            : (stryCov_9fa48("407"),
              <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port)),
          // Container naming properties
          name: containerName,
          parentName: null,
          // Root containers have no parent
          kind: "root" as ContainerKind,
          get initialize(): never {
            if (stryMutAct_9fa48("408")) {
              {
              }
            } else {
              stryCov_9fa48("408");
              return unreachable(
                stryMutAct_9fa48("409")
                  ? ""
                  : (stryCov_9fa48("409"), "Initialized containers cannot be initialized again")
              );
            }
          },
          get tryInitialize(): never {
            if (stryMutAct_9fa48("410")) {
              {
              }
            } else {
              stryCov_9fa48("410");
              return unreachable(
                stryMutAct_9fa48("411")
                  ? ""
                  : (stryCov_9fa48("411"), "Initialized containers cannot be initialized again")
              );
            }
          },
          createScope: stryMutAct_9fa48("412")
            ? () => undefined
            : (stryCov_9fa48("412"),
              (name?: string) =>
                createRootScope<TProvides, TAsyncPorts, "initialized">(
                  impl,
                  name,
                  stryMutAct_9fa48("413")
                    ? () => undefined
                    : (stryCov_9fa48("413"), () => container.inspector)
                )),
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
            if (stryMutAct_9fa48("414")) {
              {
              }
            } else {
              stryCov_9fa48("414");
              const parentLike: ParentContainerLike<TProvides, TAsyncPorts> = stryMutAct_9fa48(
                "415"
              )
                ? {}
                : (stryCov_9fa48("415"),
                  {
                    resolveInternal: stryMutAct_9fa48("416")
                      ? () => undefined
                      : (stryCov_9fa48("416"),
                        <P extends TProvides>(port: P) => impl.resolve(port)),
                    resolveAsyncInternal: stryMutAct_9fa48("417")
                      ? () => undefined
                      : (stryCov_9fa48("417"),
                        <P extends TProvides>(port: P) => impl.resolveAsync(port)),
                    has: stryMutAct_9fa48("418")
                      ? () => undefined
                      : (stryCov_9fa48("418"), port => impl.has(port)),
                    hasAdapter: stryMutAct_9fa48("419")
                      ? () => undefined
                      : (stryCov_9fa48("419"), port => impl.hasAdapter(port)),
                    [ADAPTER_ACCESS]: stryMutAct_9fa48("420")
                      ? () => undefined
                      : (stryCov_9fa48("420"), port => impl.getAdapter(port)),
                    registerChildContainer: stryMutAct_9fa48("421")
                      ? () => undefined
                      : (stryCov_9fa48("421"), child => impl.registerChildContainer(child)),
                    unregisterChildContainer: stryMutAct_9fa48("422")
                      ? () => undefined
                      : (stryCov_9fa48("422"), child => impl.unregisterChildContainer(child)),
                    originalParent: container,
                  });
              return createChildFromGraph<TProvides, TAsyncPorts, TChildGraph>(
                parentLike,
                childGraph,
                options.name,
                containerName,
                // parent's name
                options.inheritanceModes,
                options.performance
              );
            }
          },
          createChildAsync: stryMutAct_9fa48("423")
            ? () => undefined
            : (stryCov_9fa48("423"),
              <
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
              > => createChildContainerAsync(container, containerName, graphLoader, options)),
          createLazyChild: stryMutAct_9fa48("424")
            ? () => undefined
            : (stryCov_9fa48("424"),
              <
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
              > => createLazyChildContainer(container, containerName, graphLoader, options)),
          dispose: async () => {
            if (stryMutAct_9fa48("425")) {
              {
              }
            } else {
              stryCov_9fa48("425");
              stryMutAct_9fa48("427")
                ? container.inspector.disposeLibraries?.()
                : stryMutAct_9fa48("426")
                  ? container.inspector?.disposeLibraries()
                  : (stryCov_9fa48("426", "427"), container.inspector?.disposeLibraries?.());
              await impl.dispose();
            }
          },
          get isInitialized() {
            if (stryMutAct_9fa48("428")) {
              {
              }
            } else {
              stryCov_9fa48("428");
              return impl.isInitialized;
            }
          },
          get isDisposed() {
            if (stryMutAct_9fa48("429")) {
              {
              }
            } else {
              stryCov_9fa48("429");
              return impl.isDisposed;
            }
          },
          has: stryMutAct_9fa48("430")
            ? () => undefined
            : (stryCov_9fa48("430"), (port): port is TProvides => impl.has(port)),
          hasAdapter: stryMutAct_9fa48("431")
            ? () => undefined
            : (stryCov_9fa48("431"), port => impl.hasAdapter(port)),
          addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("432")) {
              {
              }
            } else {
              stryCov_9fa48("432");
              // Create a ResolutionHooks object with just this handler
              const hooks: ResolutionHooks = (
                stryMutAct_9fa48("435")
                  ? type !== "beforeResolve"
                  : stryMutAct_9fa48("434")
                    ? false
                    : stryMutAct_9fa48("433")
                      ? true
                      : (stryCov_9fa48("433", "434", "435"),
                        type ===
                          (stryMutAct_9fa48("436") ? "" : (stryCov_9fa48("436"), "beforeResolve")))
              )
                ? stryMutAct_9fa48("437")
                  ? {}
                  : (stryCov_9fa48("437"),
                    {
                      beforeResolve: handler as (ctx: ResolutionHookContext) => void,
                    })
                : stryMutAct_9fa48("438")
                  ? {}
                  : (stryCov_9fa48("438"),
                    {
                      afterResolve: handler as (ctx: ResolutionResultContext) => void,
                    });

              // Store uninstall function for later removal
              const uninstall = (): void => {
                if (stryMutAct_9fa48("439")) {
                  {
                  }
                } else {
                  stryCov_9fa48("439");
                  const idx = hooksHolder.hookSources.indexOf(hooks);
                  if (
                    stryMutAct_9fa48("442")
                      ? idx === -1
                      : stryMutAct_9fa48("441")
                        ? false
                        : stryMutAct_9fa48("440")
                          ? true
                          : (stryCov_9fa48("440", "441", "442"),
                            idx !== (stryMutAct_9fa48("443") ? +1 : (stryCov_9fa48("443"), -1)))
                  ) {
                    if (stryMutAct_9fa48("444")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("444");
                      hooksHolder.hookSources.splice(idx, 1);
                    }
                  }
                }
              };
              handlerToUninstall.set(handler, uninstall);
              hooksHolder.hookSources.push(hooks);
            }
          },
          removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("445")) {
              {
              }
            } else {
              stryCov_9fa48("445");
              const uninstall = handlerToUninstall.get(handler);
              if (
                stryMutAct_9fa48("447")
                  ? false
                  : stryMutAct_9fa48("446")
                    ? true
                    : (stryCov_9fa48("446", "447"), uninstall)
              ) {
                if (stryMutAct_9fa48("448")) {
                  {
                  }
                } else {
                  stryCov_9fa48("448");
                  uninstall();
                  handlerToUninstall.delete(handler);
                }
              }
            }
          },
          // Placeholder getter - will be replaced with non-enumerable version below
          get parent(): never {
            if (stryMutAct_9fa48("449")) {
              {
              }
            } else {
              stryCov_9fa48("449");
              return unreachable(
                stryMutAct_9fa48("450")
                  ? ""
                  : (stryCov_9fa48("450"), "Root containers do not have a parent")
              );
            }
          },
          [INTERNAL_ACCESS]: stryMutAct_9fa48("451")
            ? () => undefined
            : (stryCov_9fa48("451"), () => impl.getInternalState()),
          [ADAPTER_ACCESS]: stryMutAct_9fa48("452")
            ? () => undefined
            : (stryCov_9fa48("452"), port => impl.getAdapter(port)),
          registerChildContainer: stryMutAct_9fa48("453")
            ? () => undefined
            : (stryCov_9fa48("453"), child => impl.registerChildContainer(child)),
          unregisterChildContainer: stryMutAct_9fa48("454")
            ? () => undefined
            : (stryCov_9fa48("454"), child => impl.unregisterChildContainer(child)),
          // Placeholder getter - will be replaced with non-enumerable version below
          get [ContainerBrand]() {
            if (stryMutAct_9fa48("455")) {
              {
              }
            } else {
              stryCov_9fa48("455");
              return unreachable<{
                provides: TProvides;
                extends: never;
              }>(
                stryMutAct_9fa48("456")
                  ? ""
                  : (stryCov_9fa48("456"), "Container brand is type-only")
              );
            }
          },
          // Type-safe override builder API
          override: overrideMethod,
        });

    // Add .parent getter as non-enumerable to prevent React DevTools from triggering it
    // Root containers have no parent - accessing this property throws an error
    Object.defineProperty(
      container,
      stryMutAct_9fa48("457") ? "" : (stryCov_9fa48("457"), "parent"),
      stryMutAct_9fa48("458")
        ? {}
        : (stryCov_9fa48("458"),
          {
            get(): never {
              if (stryMutAct_9fa48("459")) {
                {
                }
              } else {
                stryCov_9fa48("459");
                return unreachable(
                  stryMutAct_9fa48("460")
                    ? ""
                    : (stryCov_9fa48("460"), "Root containers do not have a parent")
                );
              }
            },
            enumerable: stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461"), false),
            configurable: stryMutAct_9fa48("462") ? true : (stryCov_9fa48("462"), false),
          })
    );

    // Add ContainerBrand getter as non-enumerable (type-only property)
    Object.defineProperty(
      container,
      ContainerBrand,
      stryMutAct_9fa48("463")
        ? {}
        : (stryCov_9fa48("463"),
          {
            get(): never {
              if (stryMutAct_9fa48("464")) {
                {
                }
              } else {
                stryCov_9fa48("464");
                return unreachable(
                  stryMutAct_9fa48("465")
                    ? ""
                    : (stryCov_9fa48("465"), "Container brand is type-only")
                );
              }
            },
            enumerable: stryMutAct_9fa48("466") ? true : (stryCov_9fa48("466"), false),
            configurable: stryMutAct_9fa48("467") ? true : (stryCov_9fa48("467"), false),
          })
    );

    // Add built-in inspector API as non-enumerable property
    attachBuiltinAPIs(container);

    // Set wrapper reference on impl so registerChildContainer can access parent inspector
    impl.setWrapper(container);
    Object.freeze(container);
    return container;
  }
}

// Helper to avoid circular dependency issues if possible, or just import ScopeImpl
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";
function createRootScope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends "uninitialized" | "initialized",
>(
  containerImpl: RootContainerImpl<TProvides, TAsyncPorts>,
  name?: string,
  getInspector?: () => InspectorAPI | undefined
): Scope<TProvides, TAsyncPorts, TPhase> {
  if (stryMutAct_9fa48("468")) {
    {
    }
  } else {
    stryCov_9fa48("468");
    const scopeImpl = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
      containerImpl,
      containerImpl.getSingletonMemo(),
      null, // parentScope
      stryMutAct_9fa48("469")
        ? () => undefined
        : (stryCov_9fa48("469"), () => containerImpl.unregisterChildScope(scopeImpl)),
      // unregister callback for disposal
      name
    );
    containerImpl.registerChildScope(scopeImpl);
    return createScopeWrapper(scopeImpl, getInspector);
  }
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
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
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
  if (stryMutAct_9fa48("470")) {
    {
    }
  } else {
    stryCov_9fa48("470");
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
  if (stryMutAct_9fa48("471")) {
    {
    }
  } else {
    stryCov_9fa48("471");
    const graph = await graphLoader();
    return parent.createChild(graph, options);
  }
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
  if (stryMutAct_9fa48("472")) {
    {
    }
  } else {
    stryCov_9fa48("472");
    // Parent implements LazyContainerParent interface via its has() and createChild() methods
    const parentLike: LazyContainerParent<TParentProvides | TParentExtends, TAsyncPorts> =
      stryMutAct_9fa48("473")
        ? {}
        : (stryCov_9fa48("473"),
          {
            has: stryMutAct_9fa48("474")
              ? () => undefined
              : (stryCov_9fa48("474"), port => parent.has(port)),
            createChild: stryMutAct_9fa48("475")
              ? () => undefined
              : (stryCov_9fa48("475"), (graph, opts) => parent.createChild(graph, opts)),
          });
    return new LazyContainerImpl<
      TParentProvides | TParentExtends,
      Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      TChildGraph
    >(parentLike, graphLoader, options);
  }
}
