/**
 * Lazy container implementation for deferred graph loading.
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
import type { ResultAsync } from "@hex-di/result";
import { fromPromise } from "@hex-di/result";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import type { Container, LazyContainer, CreateChildOptions } from "../types.js";
import type { ContainerError, DisposalError } from "../errors/index.js";
import { DisposedScopeError } from "../errors/index.js";
import { mapToContainerError, mapToDisposalError } from "./result-helpers.js";

/**
 * Flag indicating the next child container creation originated from a lazy load.
 * Set before createChild is called, checked and cleared in registerChildContainer.
 * @internal
 */
export let nextChildIsLazy = stryMutAct_9fa48("776") ? true : (stryCov_9fa48("776"), false);

/**
 * Sets the lazy creation flag before creating a child container.
 * @internal
 */
export function markNextChildAsLazy(): void {
  if (stryMutAct_9fa48("777")) {
    {
    }
  } else {
    stryCov_9fa48("777");
    nextChildIsLazy = stryMutAct_9fa48("778") ? false : (stryCov_9fa48("778"), true);
  }
}

/**
 * Consumes and returns the lazy creation flag.
 * @internal
 */
export function consumeLazyFlag(): boolean {
  if (stryMutAct_9fa48("779")) {
    {
    }
  } else {
    stryCov_9fa48("779");
    const wasLazy = nextChildIsLazy;
    nextChildIsLazy = stryMutAct_9fa48("780") ? true : (stryCov_9fa48("780"), false);
    return wasLazy;
  }
}

/**
 * Internal container-like interface needed for lazy container operations.
 * @internal
 */
export interface LazyContainerParent<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  has(port: Port<unknown, string>): boolean;
  createChild<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    childGraph: TChildGraph,
    options: CreateChildOptions<TProvides>
  ): Container<
    TProvides,
    Exclude<InferGraphProvides<TChildGraph>, TProvides>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >;
}

/**
 * Lazy-loading container wrapper implementation.
 *
 * Defers graph loading until first `resolve()` or explicit `load()` call.
 * Concurrent loads share the same promise (deduplication).
 *
 * @internal
 */
export class LazyContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>> =
    Graph<TExtends, Port<unknown, string>, Port<unknown, string>>,
> implements LazyContainer<TProvides, TExtends, TAsyncPorts> {
  private container: Container<TProvides, TExtends, TAsyncPorts, "initialized"> | null = null;
  private loadPromise: Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> | null =
    null;
  private _isDisposed = stryMutAct_9fa48("781") ? true : (stryCov_9fa48("781"), false);
  constructor(
    private readonly parent: LazyContainerParent<TProvides, TAsyncPorts>,
    private readonly graphLoader: () => Promise<TChildGraph>,
    private readonly options: CreateChildOptions<TProvides>
  ) {}

  /**
   * Whether the graph has been loaded and the container is ready.
   */
  get isLoaded(): boolean {
    if (stryMutAct_9fa48("782")) {
      {
      }
    } else {
      stryCov_9fa48("782");
      return stryMutAct_9fa48("785")
        ? this.container === null
        : stryMutAct_9fa48("784")
          ? false
          : stryMutAct_9fa48("783")
            ? true
            : (stryCov_9fa48("783", "784", "785"), this.container !== null);
    }
  }

  /**
   * Whether the lazy container has been disposed.
   */
  get isDisposed(): boolean {
    if (stryMutAct_9fa48("786")) {
      {
      }
    } else {
      stryCov_9fa48("786");
      return this._isDisposed;
    }
  }

  /**
   * Explicitly loads the graph and returns the underlying container.
   *
   * Concurrent calls share the same loading promise (deduplication).
   */
  async load(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> {
    if (stryMutAct_9fa48("787")) {
      {
      }
    } else {
      stryCov_9fa48("787");
      if (
        stryMutAct_9fa48("789")
          ? false
          : stryMutAct_9fa48("788")
            ? true
            : (stryCov_9fa48("788", "789"), this._isDisposed)
      ) {
        if (stryMutAct_9fa48("790")) {
          {
          }
        } else {
          stryCov_9fa48("790");
          throw new DisposedScopeError(
            stryMutAct_9fa48("791") ? "" : (stryCov_9fa48("791"), "LazyContainer")
          );
        }
      }

      // Return cached container if already loaded
      if (
        stryMutAct_9fa48("794")
          ? this.container === null
          : stryMutAct_9fa48("793")
            ? false
            : stryMutAct_9fa48("792")
              ? true
              : (stryCov_9fa48("792", "793", "794"), this.container !== null)
      ) {
        if (stryMutAct_9fa48("795")) {
          {
          }
        } else {
          stryCov_9fa48("795");
          return this.container;
        }
      }

      // Deduplicate concurrent loads
      if (
        stryMutAct_9fa48("798")
          ? this.loadPromise !== null
          : stryMutAct_9fa48("797")
            ? false
            : stryMutAct_9fa48("796")
              ? true
              : (stryCov_9fa48("796", "797", "798"), this.loadPromise === null)
      ) {
        if (stryMutAct_9fa48("799")) {
          {
          }
        } else {
          stryCov_9fa48("799");
          this.loadPromise = this.performLoad();
        }
      }
      return this.loadPromise;
    }
  }

  /**
   * Internal load implementation.
   * @internal
   */
  private async performLoad(): Promise<Container<TProvides, TExtends, TAsyncPorts, "initialized">> {
    if (stryMutAct_9fa48("800")) {
      {
      }
    } else {
      stryCov_9fa48("800");
      try {
        if (stryMutAct_9fa48("801")) {
          {
          }
        } else {
          stryCov_9fa48("801");
          const graph = await this.graphLoader();

          // Check if disposed during load
          if (
            stryMutAct_9fa48("803")
              ? false
              : stryMutAct_9fa48("802")
                ? true
                : (stryCov_9fa48("802", "803"), this._isDisposed)
          ) {
            if (stryMutAct_9fa48("804")) {
              {
              }
            } else {
              stryCov_9fa48("804");
              throw new DisposedScopeError(
                stryMutAct_9fa48("805") ? "" : (stryCov_9fa48("805"), "LazyContainer")
              );
            }
          }

          // Mark the next child creation as lazy so registerChildContainer emits correct childKind
          markNextChildAsLazy();

          // Create child container using parent's createChild
          // SAFETY: Type assertion needed because createChild returns a computed type
          // based on the graph, but we know it produces Container<TProvides, TExtends, TAsyncPorts, "initialized">
          this.container = this.parent.createChild(graph, this.options) as unknown as Container<
            TProvides,
            TExtends,
            TAsyncPorts,
            "initialized"
          >;
          return this.container;
        }
      } catch (error) {
        if (stryMutAct_9fa48("806")) {
          {
          }
        } else {
          stryCov_9fa48("806");
          // Clear the promise on failure to allow retry
          this.loadPromise = null;
          throw error;
        }
      }
    }
  }

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * Loads the graph on first call, then delegates to the container.
   */
  async resolve<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    if (stryMutAct_9fa48("807")) {
      {
      }
    } else {
      stryCov_9fa48("807");
      const container = await this.load();
      // Use resolveAsync since graph loading is already async
      // This also handles any async ports properly
      return container.resolveAsync(port);
    }
  }

  /**
   * Alias for resolve() - both methods behave identically.
   */
  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    if (stryMutAct_9fa48("808")) {
      {
      }
    } else {
      stryCov_9fa48("808");
      const container = await this.load();
      return container.resolveAsync(port);
    }
  }

  /**
   * Resolves a service instance, returning a ResultAsync instead of throwing.
   */
  tryResolve<P extends TProvides | TExtends>(
    port: P
  ): ResultAsync<InferService<P>, ContainerError> {
    if (stryMutAct_9fa48("809")) {
      {
      }
    } else {
      stryCov_9fa48("809");
      return fromPromise(this.resolve(port), mapToContainerError);
    }
  }

  /**
   * Resolves a service instance asynchronously, returning a ResultAsync instead of throwing.
   */
  tryResolveAsync<P extends TProvides | TExtends>(
    port: P
  ): ResultAsync<InferService<P>, ContainerError> {
    if (stryMutAct_9fa48("810")) {
      {
      }
    } else {
      stryCov_9fa48("810");
      return fromPromise(this.resolveAsync(port), mapToContainerError);
    }
  }

  /**
   * Disposes the lazy container, returning a ResultAsync instead of throwing.
   */
  tryDispose(): ResultAsync<void, DisposalError> {
    if (stryMutAct_9fa48("811")) {
      {
      }
    } else {
      stryCov_9fa48("811");
      return fromPromise(this.dispose(), mapToDisposalError);
    }
  }

  /**
   * Checks if a port is available for resolution.
   *
   * Before loading: Delegates to parent container.
   * After loading: Delegates to loaded child container.
   */
  has(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("812")) {
      {
      }
    } else {
      stryCov_9fa48("812");
      if (
        stryMutAct_9fa48("815")
          ? this.container === null
          : stryMutAct_9fa48("814")
            ? false
            : stryMutAct_9fa48("813")
              ? true
              : (stryCov_9fa48("813", "814", "815"), this.container !== null)
      ) {
        if (stryMutAct_9fa48("816")) {
          {
          }
        } else {
          stryCov_9fa48("816");
          return this.container.has(port);
        }
      }
      // Before loading, we can only check parent's ports
      return this.parent.has(port);
    }
  }

  /**
   * Disposes the lazy container.
   *
   * Handles three cases:
   * 1. Not loaded: Marks as disposed, no cleanup needed
   * 2. Currently loading: Waits for load, then disposes
   * 3. Already loaded: Disposes the container
   */
  async dispose(): Promise<void> {
    if (stryMutAct_9fa48("817")) {
      {
      }
    } else {
      stryCov_9fa48("817");
      if (
        stryMutAct_9fa48("819")
          ? false
          : stryMutAct_9fa48("818")
            ? true
            : (stryCov_9fa48("818", "819"), this._isDisposed)
      ) {
        if (stryMutAct_9fa48("820")) {
          {
          }
        } else {
          stryCov_9fa48("820");
          return;
        }
      }
      this._isDisposed = stryMutAct_9fa48("821") ? false : (stryCov_9fa48("821"), true);

      // If loading is in progress, wait for it to complete then dispose
      if (
        stryMutAct_9fa48("824")
          ? this.loadPromise !== null || this.container === null
          : stryMutAct_9fa48("823")
            ? false
            : stryMutAct_9fa48("822")
              ? true
              : (stryCov_9fa48("822", "823", "824"),
                (stryMutAct_9fa48("826")
                  ? this.loadPromise === null
                  : stryMutAct_9fa48("825")
                    ? true
                    : (stryCov_9fa48("825", "826"), this.loadPromise !== null)) &&
                  (stryMutAct_9fa48("828")
                    ? this.container !== null
                    : stryMutAct_9fa48("827")
                      ? true
                      : (stryCov_9fa48("827", "828"), this.container === null)))
      ) {
        if (stryMutAct_9fa48("829")) {
          {
          }
        } else {
          stryCov_9fa48("829");
          try {
            if (stryMutAct_9fa48("830")) {
              {
              }
            } else {
              stryCov_9fa48("830");
              // Wait for the load to complete (or fail)
              await this.loadPromise;
            }
          } catch {
            if (stryMutAct_9fa48("831")) {
              {
              }
            } else {
              stryCov_9fa48("831");
              // Load failed - nothing to dispose
              this.loadPromise = null;
              return;
            }
          }
        }
      }

      // Dispose the container if loaded
      if (
        stryMutAct_9fa48("834")
          ? this.container === null
          : stryMutAct_9fa48("833")
            ? false
            : stryMutAct_9fa48("832")
              ? true
              : (stryCov_9fa48("832", "833", "834"), this.container !== null)
      ) {
        if (stryMutAct_9fa48("835")) {
          {
          }
        } else {
          stryCov_9fa48("835");
          await this.container.dispose();
          this.container = null;
        }
      }
      this.loadPromise = null;
    }
  }
}
