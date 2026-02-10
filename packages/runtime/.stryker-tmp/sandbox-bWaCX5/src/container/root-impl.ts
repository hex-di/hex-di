/**
 * Root container implementation.
 *
 * @packageDocumentation
 * @internal
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
import type { Port, InferService } from "@hex-di/core";
import { DisposedScopeError } from "../errors/index.js";
import type { RootContainerConfig } from "./internal-types.js";
import { HooksRunner, type ContainerMetadata } from "../resolution/hooks-runner.js";
import { AdapterRegistry } from "./internal/adapter-registry.js";
import { BaseContainerImpl } from "./base-impl.js";

/**
 * Root container created from a Graph.
 *
 * Features:
 * - Async adapter initialization
 * - Resolution hooks support
 * - No parent container
 *
 * @internal
 */
export class RootContainerImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> extends BaseContainerImpl<TProvides, never, TAsyncPorts> {
  protected readonly isRoot = true as const;
  private readonly containerNameValue: string;
  constructor(config: RootContainerConfig<TProvides, TAsyncPorts>) {
    const adapterRegistry = new AdapterRegistry<TProvides, TAsyncPorts>(null);
    const hooksRunner = RootContainerImpl.createHooksRunner(config);
    const memoMapConfig = stryMutAct_9fa48("886")
      ? {}
      : (stryCov_9fa48("886"),
        {
          captureTimestamps: stryMutAct_9fa48("889")
            ? config.performance?.disableTimestamps === true
            : stryMutAct_9fa48("888")
              ? false
              : stryMutAct_9fa48("887")
                ? true
                : (stryCov_9fa48("887", "888", "889"),
                  (stryMutAct_9fa48("890")
                    ? config.performance.disableTimestamps
                    : (stryCov_9fa48("890"), config.performance?.disableTimestamps)) !==
                    (stryMutAct_9fa48("891") ? false : (stryCov_9fa48("891"), true))),
        });
    super(adapterRegistry, hooksRunner, memoMapConfig);
    this.containerNameValue = config.containerName;
    this.initializeFromGraph(config);
  }
  protected getContainerName(): string {
    if (stryMutAct_9fa48("892")) {
      {
      }
    } else {
      stryCov_9fa48("892");
      return this.containerNameValue;
    }
  }
  private static createHooksRunner<
    TProvides extends Port<unknown, string>,
    TAsyncPorts extends Port<unknown, string>,
  >(config: RootContainerConfig<TProvides, TAsyncPorts>): HooksRunner | null {
    if (stryMutAct_9fa48("893")) {
      {
      }
    } else {
      stryCov_9fa48("893");
      const { options } = config;
      if (
        stryMutAct_9fa48("896")
          ? options?.hooks?.beforeResolve !== undefined &&
            options?.hooks?.afterResolve !== undefined
          : stryMutAct_9fa48("895")
            ? false
            : stryMutAct_9fa48("894")
              ? true
              : (stryCov_9fa48("894", "895", "896"),
                (stryMutAct_9fa48("898")
                  ? options?.hooks?.beforeResolve === undefined
                  : stryMutAct_9fa48("897")
                    ? false
                    : (stryCov_9fa48("897", "898"),
                      (stryMutAct_9fa48("900")
                        ? options.hooks?.beforeResolve
                        : stryMutAct_9fa48("899")
                          ? options?.hooks.beforeResolve
                          : (stryCov_9fa48("899", "900"), options?.hooks?.beforeResolve)) !==
                        undefined)) ||
                  (stryMutAct_9fa48("902")
                    ? options?.hooks?.afterResolve === undefined
                    : stryMutAct_9fa48("901")
                      ? false
                      : (stryCov_9fa48("901", "902"),
                        (stryMutAct_9fa48("904")
                          ? options.hooks?.afterResolve
                          : stryMutAct_9fa48("903")
                            ? options?.hooks.afterResolve
                            : (stryCov_9fa48("903", "904"), options?.hooks?.afterResolve)) !==
                          undefined)))
      ) {
        if (stryMutAct_9fa48("905")) {
          {
          }
        } else {
          stryCov_9fa48("905");
          const containerMetadata: ContainerMetadata = stryMutAct_9fa48("906")
            ? {}
            : (stryCov_9fa48("906"),
              {
                containerId: stryMutAct_9fa48("907") ? "" : (stryCov_9fa48("907"), "root"),
                containerKind: stryMutAct_9fa48("908") ? "" : (stryCov_9fa48("908"), "root"),
                parentContainerId: null,
              });
          return new HooksRunner(options.hooks, containerMetadata);
        }
      }
      return null;
    }
  }
  private initializeFromGraph(config: RootContainerConfig<TProvides, TAsyncPorts>): void {
    if (stryMutAct_9fa48("909")) {
      {
      }
    } else {
      stryCov_9fa48("909");
      const { graph } = config;
      for (const adapter of graph.adapters) {
        if (stryMutAct_9fa48("910")) {
          {
          }
        } else {
          stryCov_9fa48("910");
          // Root containers don't use "local" tracking - all adapters are root-level
          this.adapterRegistry.register(
            adapter.provides,
            adapter,
            stryMutAct_9fa48("911") ? true : (stryCov_9fa48("911"), false)
          );
          if (
            stryMutAct_9fa48("914")
              ? adapter.factoryKind !== "async"
              : stryMutAct_9fa48("913")
                ? false
                : stryMutAct_9fa48("912")
                  ? true
                  : (stryCov_9fa48("912", "913", "914"),
                    adapter.factoryKind ===
                      (stryMutAct_9fa48("915") ? "" : (stryCov_9fa48("915"), "async")))
          ) {
            if (stryMutAct_9fa48("916")) {
              {
              }
            } else {
              stryCov_9fa48("916");
              this.asyncInitializer.registerAdapter(adapter);
            }
          }
        }
      }

      // Finalize adapter registration (computes topological initialization levels)
      this.asyncInitializer.finalizeRegistration();
    }
  }

  // ===========================================================================
  // Abstract Method Implementations
  // ===========================================================================

  protected onWrapperSet(_wrapper: unknown): void {
    // Root containers don't register with a parent
  }
  getParent(): unknown {
    if (stryMutAct_9fa48("917")) {
      {
      }
    } else {
      stryCov_9fa48("917");
      return undefined;
    }
  }
  async initialize(): Promise<void> {
    if (stryMutAct_9fa48("918")) {
      {
      }
    } else {
      stryCov_9fa48("918");
      if (
        stryMutAct_9fa48("920")
          ? false
          : stryMutAct_9fa48("919")
            ? true
            : (stryCov_9fa48("919", "920"), this.lifecycleManager.isDisposed)
      ) {
        if (stryMutAct_9fa48("921")) {
          {
          }
        } else {
          stryCov_9fa48("921");
          throw new DisposedScopeError(
            stryMutAct_9fa48("922") ? "" : (stryCov_9fa48("922"), "container")
          );
        }
      }
      await this.asyncInitializer.initialize(
        stryMutAct_9fa48("923")
          ? () => undefined
          : (stryCov_9fa48("923"),
            port => this.resolveAsyncInternal(port, this.singletonMemo, null))
      );
    }
  }
  protected getParentUnregisterCallback(): undefined {
    if (stryMutAct_9fa48("924")) {
      {
      }
    } else {
      stryCov_9fa48("924");
      return undefined;
    }
  }
  protected resolveWithInheritance<P extends TProvides>(port: P): InferService<P> {
    if (stryMutAct_9fa48("925")) {
      {
      }
    } else {
      stryCov_9fa48("925");
      // Root containers have no inheritance - all ports should be local
      throw new Error(
        stryMutAct_9fa48("926")
          ? ``
          : (stryCov_9fa48("926"), `No adapter registered for port '${port.__portName}'`)
      );
    }
  }
  protected resolveInternalFallback(_port: Port<unknown, string>, portName: string): never {
    if (stryMutAct_9fa48("927")) {
      {
      }
    } else {
      stryCov_9fa48("927");
      throw new Error(
        stryMutAct_9fa48("928")
          ? ``
          : (stryCov_9fa48("928"), `No adapter registered for port '${portName}'`)
      );
    }
  }
  protected resolveAsyncInternalFallback(port: Port<unknown, string>): Promise<never> {
    if (stryMutAct_9fa48("929")) {
      {
      }
    } else {
      stryCov_9fa48("929");
      return Promise.reject(
        new Error(
          stryMutAct_9fa48("930")
            ? ``
            : (stryCov_9fa48("930"), `No adapter registered for port '${port.__portName}'`)
        )
      );
    }
  }
}
