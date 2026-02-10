/**
 * Internal Scope implementation.
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
import type { Port, InferService } from "@hex-di/core";
import { tryCatch, fromPromise } from "@hex-di/result";
import type { Scope } from "../types.js";
import { ScopeBrand } from "../types.js";
import {
  mapToContainerError,
  mapToDisposalError,
  emitResultEvent,
} from "../container/result-helpers.js";
import type { InspectorAPI } from "../inspection/types.js";
import { MemoMap } from "../util/memo-map.js";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type {
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
} from "../inspection/internal-state-types.js";
import { DisposedScopeError } from "../errors/index.js";
import type { ScopeContainerAccess } from "../container/impl.js";
import { unreachable } from "../util/unreachable.js";
import {
  ScopeLifecycleEmitter,
  type ScopeLifecycleListener,
  type ScopeSubscription,
  type ScopeDisposalState,
} from "./lifecycle-events.js";

/**
 * Type for scope ID generator function.
 *
 * A generator produces unique scope IDs in the format "scope-N"
 * unless an explicit name is provided.
 */
export type ScopeIdGenerator = (name?: string) => string;

/**
 * Creates an isolated scope ID generator with its own internal counter.
 *
 * This factory function creates a generator that has its own independent state.
 * Each generator produces unique scope IDs in the format "scope-N".
 *
 * ## Use Cases
 *
 * - **Testing**: Each test can create its own generator for isolation
 * - **Dependency injection**: Pass generators as dependencies
 * - **Parallel trees**: Different scope trees get independent counters
 *
 * @returns A new `ScopeIdGenerator` function with its own counter
 *
 * @example Creating a generator for isolation
 * ```typescript
 * const idGenerator = createScopeIdGenerator();
 * idGenerator();           // "scope-0"
 * idGenerator();           // "scope-1"
 * idGenerator("named");    // "named" (explicit name bypasses counter)
 * idGenerator();           // "scope-2" (counter continues)
 * ```
 *
 * @internal
 */
export function createScopeIdGenerator(): ScopeIdGenerator {
  if (stryMutAct_9fa48("1965")) {
    {
    }
  } else {
    stryCov_9fa48("1965");
    let counter = 0;
    return (name?: string): string => {
      if (stryMutAct_9fa48("1966")) {
        {
        }
      } else {
        stryCov_9fa48("1966");
        if (
          stryMutAct_9fa48("1969")
            ? name === undefined
            : stryMutAct_9fa48("1968")
              ? false
              : stryMutAct_9fa48("1967")
                ? true
                : (stryCov_9fa48("1967", "1968", "1969"), name !== undefined)
        ) {
          if (stryMutAct_9fa48("1970")) {
            {
            }
          } else {
            stryCov_9fa48("1970");
            return name;
          }
        }
        return stryMutAct_9fa48("1971")
          ? ``
          : (stryCov_9fa48("1971"),
            `scope-${stryMutAct_9fa48("1972") ? counter-- : (stryCov_9fa48("1972"), counter++)}`);
      }
    };
  }
}

/**
 * Holder for the default scope ID generator.
 *
 * This is an object to allow resetting the generator while maintaining
 * the same reference from `generateScopeId()`.
 *
 * @internal
 */
const defaultGeneratorHolder = stryMutAct_9fa48("1973")
  ? {}
  : (stryCov_9fa48("1973"),
    {
      generator: createScopeIdGenerator(),
    });

/**
 * Generates a unique ID for a scope.
 *
 * Uses a default generator for backward compatibility.
 * For new code with testing needs, prefer using `createScopeIdGenerator()`
 * to create isolated generators.
 *
 * @param name - Optional explicit name for the scope
 * @returns A scope ID (explicit name or generated "scope-N" format)
 * @internal
 */
function generateScopeId(name?: string): string {
  if (stryMutAct_9fa48("1974")) {
    {
    }
  } else {
    stryCov_9fa48("1974");
    return defaultGeneratorHolder.generator(name);
  }
}

/**
 * Resets the default scope ID counter.
 *
 * Creates a new generator instance to reset the counter to 0.
 * This is useful for testing to ensure predictable scope IDs.
 *
 * Note: This only resets the default generator used by `generateScopeId()`.
 * Generators created via `createScopeIdGenerator()` are not affected.
 *
 * @internal
 */
export function resetScopeIdCounter(): void {
  if (stryMutAct_9fa48("1975")) {
    {
    }
  } else {
    stryCov_9fa48("1975");
    defaultGeneratorHolder.generator = createScopeIdGenerator();
  }
}

/**
 * Internal Scope implementation class.
 * @internal
 */
export class ScopeImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
> {
  readonly id: string;
  readonly name: string | undefined;
  private readonly container: ScopeContainerAccess<TProvides>;
  private readonly scopedMemo: MemoMap;
  private disposed: boolean = stryMutAct_9fa48("1976") ? true : (stryCov_9fa48("1976"), false);
  private readonly childScopes: Set<ScopeImpl<TProvides, TAsyncPorts, TPhase>> = new Set();
  private readonly parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null;
  private readonly lifecycleEmitter: ScopeLifecycleEmitter;
  private readonly unregisterFromContainer: (() => void) | undefined;
  constructor(
    container: ScopeContainerAccess<TProvides>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null,
    unregisterFromContainer?: () => void,
    name?: string
  ) {
    if (stryMutAct_9fa48("1977")) {
      {
      }
    } else {
      stryCov_9fa48("1977");
      this.name = name;
      this.id = generateScopeId(name);
      this.container = container;
      this.scopedMemo = singletonMemo.fork();
      this.parentScope = parentScope;
      this.lifecycleEmitter = new ScopeLifecycleEmitter();
      this.unregisterFromContainer = unregisterFromContainer;
    }
  }
  resolve<P extends TProvides>(port: P): InferService<P> {
    if (stryMutAct_9fa48("1978")) {
      {
      }
    } else {
      stryCov_9fa48("1978");
      const portName = port.__portName;
      if (
        stryMutAct_9fa48("1980")
          ? false
          : stryMutAct_9fa48("1979")
            ? true
            : (stryCov_9fa48("1979", "1980"), this.disposed)
      ) {
        if (stryMutAct_9fa48("1981")) {
          {
          }
        } else {
          stryCov_9fa48("1981");
          throw new DisposedScopeError(portName);
        }
      }
      return this.container.resolveInternal(port, this.scopedMemo, this.id, this.name);
    }
  }
  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1982")) {
      {
      }
    } else {
      stryCov_9fa48("1982");
      const portName = port.__portName;
      if (
        stryMutAct_9fa48("1984")
          ? false
          : stryMutAct_9fa48("1983")
            ? true
            : (stryCov_9fa48("1983", "1984"), this.disposed)
      ) {
        if (stryMutAct_9fa48("1985")) {
          {
          }
        } else {
          stryCov_9fa48("1985");
          throw new DisposedScopeError(portName);
        }
      }
      return this.container.resolveAsyncInternal(port, this.scopedMemo, this.id, this.name);
    }
  }
  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
    if (stryMutAct_9fa48("1986")) {
      {
      }
    } else {
      stryCov_9fa48("1986");
      const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
        this.container,
        this.container.getSingletonMemo(),
        this,
        undefined,
        name
      );
      this.childScopes.add(child);
      return createScopeWrapper(child);
    }
  }

  /**
   * Disposes this scope and all child scopes.
   *
   * Disposal behavior (per RUN-02 requirements):
   * - **Idempotent**: Subsequent calls return immediately without effect
   * - **Cascade**: Disposes all child scopes first (deepest first)
   * - **LIFO Order**: Scoped services disposed in reverse creation order
   * - **Scoped Only**: Does not dispose singleton services
   * - **Error Aggregation**: All finalizers called even if some throw
   *
   * Lifecycle events:
   * - 'disposing' emitted synchronously before async disposal begins
   * - 'disposed' emitted after all finalizers complete
   *
   * @returns Promise that resolves when disposal is complete
   * @throws {AggregateError} If one or more finalizers threw errors
   */
  async dispose(): Promise<void> {
    if (stryMutAct_9fa48("1987")) {
      {
      }
    } else {
      stryCov_9fa48("1987");
      if (
        stryMutAct_9fa48("1989")
          ? false
          : stryMutAct_9fa48("1988")
            ? true
            : (stryCov_9fa48("1988", "1989"), this.disposed)
      ) {
        if (stryMutAct_9fa48("1990")) {
          {
          }
        } else {
          stryCov_9fa48("1990");
          return;
        }
      }

      // Emit 'disposing' synchronously before async disposal begins
      // This allows React components to unmount immediately
      this.lifecycleEmitter.emit(
        stryMutAct_9fa48("1991") ? "" : (stryCov_9fa48("1991"), "disposing")
      );
      this.disposed = stryMutAct_9fa48("1992") ? false : (stryCov_9fa48("1992"), true);
      for (const child of this.childScopes) {
        if (stryMutAct_9fa48("1993")) {
          {
          }
        } else {
          stryCov_9fa48("1993");
          await child.dispose();
        }
      }
      this.childScopes.clear();
      await this.scopedMemo.dispose();
      if (
        stryMutAct_9fa48("1996")
          ? this.parentScope === null
          : stryMutAct_9fa48("1995")
            ? false
            : stryMutAct_9fa48("1994")
              ? true
              : (stryCov_9fa48("1994", "1995", "1996"), this.parentScope !== null)
      ) {
        if (stryMutAct_9fa48("1997")) {
          {
          }
        } else {
          stryCov_9fa48("1997");
          this.parentScope.childScopes.delete(this);
        }
      } else if (
        stryMutAct_9fa48("2000")
          ? this.unregisterFromContainer === undefined
          : stryMutAct_9fa48("1999")
            ? false
            : stryMutAct_9fa48("1998")
              ? true
              : (stryCov_9fa48("1998", "1999", "2000"), this.unregisterFromContainer !== undefined)
      ) {
        if (stryMutAct_9fa48("2001")) {
          {
          }
        } else {
          stryCov_9fa48("2001");
          // Root scope: unregister from container's LifecycleManager
          this.unregisterFromContainer();
        }
      }

      // Emit 'disposed' after async disposal completes
      this.lifecycleEmitter.emit(
        stryMutAct_9fa48("2002") ? "" : (stryCov_9fa48("2002"), "disposed")
      );

      // Clear listeners to prevent memory leaks
      this.lifecycleEmitter.clear();
    }
  }
  get isDisposed(): boolean {
    if (stryMutAct_9fa48("2003")) {
      {
      }
    } else {
      stryCov_9fa48("2003");
      return this.disposed;
    }
  }
  has(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("2004")) {
      {
      }
    } else {
      stryCov_9fa48("2004");
      return this.container.hasAdapter(port);
    }
  }

  /**
   * Subscribe to scope lifecycle events.
   *
   * @param listener - Callback for lifecycle events
   * @returns Unsubscribe function
   */
  subscribe(listener: ScopeLifecycleListener): ScopeSubscription {
    if (stryMutAct_9fa48("2005")) {
      {
      }
    } else {
      stryCov_9fa48("2005");
      return this.lifecycleEmitter.subscribe(listener);
    }
  }

  /**
   * Get current disposal state synchronously.
   * Used as getSnapshot for useSyncExternalStore in React.
   */
  getDisposalState(): ScopeDisposalState {
    if (stryMutAct_9fa48("2006")) {
      {
      }
    } else {
      stryCov_9fa48("2006");
      return this.lifecycleEmitter.getState();
    }
  }
  getInternalState(): ScopeInternalState {
    if (stryMutAct_9fa48("2007")) {
      {
      }
    } else {
      stryCov_9fa48("2007");
      if (
        stryMutAct_9fa48("2009")
          ? false
          : stryMutAct_9fa48("2008")
            ? true
            : (stryCov_9fa48("2008", "2009"), this.disposed)
      ) {
        if (stryMutAct_9fa48("2010")) {
          {
          }
        } else {
          stryCov_9fa48("2010");
          throw new DisposedScopeError(
            stryMutAct_9fa48("2011") ? `` : (stryCov_9fa48("2011"), `scope:${this.id}`)
          );
        }
      }
      const childSnapshots: ScopeInternalState[] = stryMutAct_9fa48("2012")
        ? ["Stryker was here"]
        : (stryCov_9fa48("2012"), []);
      for (const child of this.childScopes) {
        if (stryMutAct_9fa48("2013")) {
          {
          }
        } else {
          stryCov_9fa48("2013");
          try {
            if (stryMutAct_9fa48("2014")) {
              {
              }
            } else {
              stryCov_9fa48("2014");
              childSnapshots.push(child.getInternalState());
            }
          } catch {
            // Skip disposed children
          }
        }
      }
      const state: ScopeInternalState = stryMutAct_9fa48("2015")
        ? {}
        : (stryCov_9fa48("2015"),
          {
            id: this.id,
            disposed: this.disposed,
            scopedMemo: createMemoMapSnapshot(this.scopedMemo),
            childScopes: Object.freeze(childSnapshots),
          });
      return Object.freeze(state);
    }
  }
}
function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  if (stryMutAct_9fa48("2016")) {
    {
    }
  } else {
    stryCov_9fa48("2016");
    const entries: MemoEntrySnapshot[] = stryMutAct_9fa48("2017")
      ? ["Stryker was here"]
      : (stryCov_9fa48("2017"), []);
    for (const [port, metadata] of memo.entries()) {
      if (stryMutAct_9fa48("2018")) {
        {
        }
      } else {
        stryCov_9fa48("2018");
        entries.push(
          Object.freeze(
            stryMutAct_9fa48("2019")
              ? {}
              : (stryCov_9fa48("2019"),
                {
                  port,
                  portName: port.__portName,
                  resolvedAt: metadata.resolvedAt,
                  resolutionOrder: metadata.resolutionOrder,
                })
          )
        );
      }
    }
    return Object.freeze(
      stryMutAct_9fa48("2020")
        ? {}
        : (stryCov_9fa48("2020"),
          {
            size: entries.length,
            entries: Object.freeze(entries),
          })
    );
  }
}
export function createScopeWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(
  impl: ScopeImpl<TProvides, TAsyncPorts, TPhase>,
  getInspector?: () => InspectorAPI | undefined
): Scope<TProvides, TAsyncPorts, TPhase> {
  if (stryMutAct_9fa48("2021")) {
    {
    }
  } else {
    stryCov_9fa48("2021");
    function resolve<
      P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
    >(port: P): InferService<P> {
      if (stryMutAct_9fa48("2022")) {
        {
        }
      } else {
        stryCov_9fa48("2022");
        return impl.resolve(port);
      }
    }
    const scope: Scope<TProvides, TAsyncPorts, TPhase> = stryMutAct_9fa48("2023")
      ? {}
      : (stryCov_9fa48("2023"),
        {
          resolve,
          resolveAsync: stryMutAct_9fa48("2024")
            ? () => undefined
            : (stryCov_9fa48("2024"), port => impl.resolveAsync(port)),
          tryResolve: <
            P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
          >(
            port: P
          ) => {
            if (stryMutAct_9fa48("2025")) {
              {
              }
            } else {
              stryCov_9fa48("2025");
              const result = tryCatch(
                stryMutAct_9fa48("2026")
                  ? () => undefined
                  : (stryCov_9fa48("2026"), () => impl.resolve(port)),
                mapToContainerError
              );
              emitResultEvent(
                stryMutAct_9fa48("2027")
                  ? getInspector()
                  : (stryCov_9fa48("2027"), getInspector?.()),
                port.__portName,
                result
              );
              return result;
            }
          },
          tryResolveAsync: <P extends TProvides>(port: P) => {
            if (stryMutAct_9fa48("2028")) {
              {
              }
            } else {
              stryCov_9fa48("2028");
              const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
              void resultAsync.then(result => {
                if (stryMutAct_9fa48("2029")) {
                  {
                  }
                } else {
                  stryCov_9fa48("2029");
                  emitResultEvent(
                    stryMutAct_9fa48("2030")
                      ? getInspector()
                      : (stryCov_9fa48("2030"), getInspector?.()),
                    port.__portName,
                    result
                  );
                }
              });
              return resultAsync;
            }
          },
          tryDispose: stryMutAct_9fa48("2031")
            ? () => undefined
            : (stryCov_9fa48("2031"), () => fromPromise(impl.dispose(), mapToDisposalError)),
          createScope: stryMutAct_9fa48("2032")
            ? () => undefined
            : (stryCov_9fa48("2032"), (name?: string) => impl.createScope(name)),
          dispose: stryMutAct_9fa48("2033")
            ? () => undefined
            : (stryCov_9fa48("2033"), () => impl.dispose()),
          get isDisposed() {
            if (stryMutAct_9fa48("2034")) {
              {
              }
            } else {
              stryCov_9fa48("2034");
              return impl.isDisposed;
            }
          },
          has: stryMutAct_9fa48("2035")
            ? () => undefined
            : (stryCov_9fa48("2035"), port => impl.has(port)),
          subscribe: stryMutAct_9fa48("2036")
            ? () => undefined
            : (stryCov_9fa48("2036"), listener => impl.subscribe(listener)),
          getDisposalState: stryMutAct_9fa48("2037")
            ? () => undefined
            : (stryCov_9fa48("2037"), () => impl.getDisposalState()),
          [INTERNAL_ACCESS]: stryMutAct_9fa48("2038")
            ? () => undefined
            : (stryCov_9fa48("2038"), () => impl.getInternalState()),
          get [ScopeBrand]() {
            if (stryMutAct_9fa48("2039")) {
              {
              }
            } else {
              stryCov_9fa48("2039");
              return unreachable<{
                provides: TProvides;
              }>(
                stryMutAct_9fa48("2040") ? "" : (stryCov_9fa48("2040"), "Scope brand is type-only")
              );
            }
          },
        });
    Object.freeze(scope);
    return scope;
  }
}
