/**
 * Internal Scope implementation.
 * @packageDocumentation
 */

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
import { DisposedScopeError, ScopeDepthExceededError } from "../errors/index.js";
import type { DisposalOptions } from "../util/memo-map.js";
import type { ScopeContainerAccess } from "../container/internal-types.js";
import { unreachable } from "../util/unreachable.js";
import {
  ScopeLifecycleEmitter,
  type LifecycleErrorReporter,
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
 * @returns A new `ScopeIdGenerator` function with its own counter
 *
 * @internal
 */
export function createScopeIdGenerator(): ScopeIdGenerator {
  let counter = 0;

  return (name?: string): string => {
    if (name !== undefined) {
      return name;
    }
    return `scope-${counter++}`;
  };
}

/**
 * Holder for the default scope ID generator.
 * @internal
 */
const defaultGeneratorHolder = {
  generator: createScopeIdGenerator(),
};

/**
 * Generates a unique ID for a scope.
 * @param name - Optional explicit name for the scope
 * @returns A scope ID (explicit name or generated "scope-N" format)
 * @internal
 */
function generateScopeId(name?: string): string {
  return defaultGeneratorHolder.generator(name);
}

/**
 * Resets the default scope ID counter.
 * @internal
 */
export function resetScopeIdCounter(): void {
  defaultGeneratorHolder.generator = createScopeIdGenerator();
}

/**
 * Internal Scope implementation class.
 * @internal
 */
export class ScopeImpl<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
> {
  readonly id: string;
  readonly name: string | undefined;
  private readonly container: ScopeContainerAccess<TProvides>;
  private readonly scopedMemo: MemoMap;
  private disposed: boolean = false;
  private readonly childScopes: Set<ScopeImpl<TProvides, TAsyncPorts, TPhase>> = new Set();
  private readonly parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null;
  private readonly lifecycleEmitter: ScopeLifecycleEmitter;
  private readonly unregisterFromContainer: (() => void) | undefined;
  private readonly depth: number;
  private readonly maxDepth: number;
  private readonly disposalOptions: DisposalOptions | undefined;
  private readonly errorReporter: LifecycleErrorReporter | undefined;

  constructor(
    container: ScopeContainerAccess<TProvides>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null,
    unregisterFromContainer?: () => void,
    name?: string,
    maxDepth: number = 64,
    disposalOptions?: DisposalOptions,
    errorReporter?: LifecycleErrorReporter
  ) {
    this.name = name;
    this.id = generateScopeId(name);
    this.container = container;
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
    this.lifecycleEmitter = new ScopeLifecycleEmitter(errorReporter);
    this.unregisterFromContainer = unregisterFromContainer;
    this.depth = parentScope !== null ? parentScope.depth + 1 : 0;
    this.maxDepth = maxDepth;
    this.disposalOptions = disposalOptions;
    this.errorReporter = errorReporter;
  }

  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveInternal(port, this.scopedMemo, this.id, this.name);
  }

  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveAsyncInternal(port, this.scopedMemo, this.id, this.name);
  }

  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
    if (this.depth + 1 > this.maxDepth) {
      throw new ScopeDepthExceededError(this.depth + 1, this.maxDepth);
    }
    const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
      this.container,
      this.container.getSingletonMemo(),
      this,
      undefined,
      name,
      this.maxDepth,
      this.disposalOptions,
      this.errorReporter
    );
    this.childScopes.add(child);
    return createScopeWrapper(child);
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
    if (this.disposed) {
      return;
    }

    // Emit 'disposing' synchronously before async disposal begins
    // This allows React components to unmount immediately
    this.lifecycleEmitter.emit("disposing");

    this.disposed = true;
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();
    await this.scopedMemo.dispose(this.disposalOptions);
    if (this.parentScope !== null) {
      this.parentScope.childScopes.delete(this);
    } else if (this.unregisterFromContainer !== undefined) {
      // Root scope: unregister from container's LifecycleManager
      this.unregisterFromContainer();
    }

    // Emit 'disposed' after async disposal completes
    this.lifecycleEmitter.emit("disposed");

    // Clear listeners to prevent memory leaks
    this.lifecycleEmitter.clear();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  has(port: Port<string, unknown>): boolean {
    return this.container.hasAdapter(port);
  }

  /**
   * Subscribe to scope lifecycle events.
   *
   * @param listener - Callback for lifecycle events
   * @returns Unsubscribe function
   */
  subscribe(listener: ScopeLifecycleListener): ScopeSubscription {
    return this.lifecycleEmitter.subscribe(listener);
  }

  /**
   * Get current disposal state synchronously.
   * Used as getSnapshot for useSyncExternalStore in React.
   */
  getDisposalState(): ScopeDisposalState {
    return this.lifecycleEmitter.getState();
  }

  getInternalState(): ScopeInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(`scope:${this.id}`);
    }
    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
        // Skip disposed children
      }
    }
    const state: ScopeInternalState = {
      id: this.id,
      disposed: this.disposed,
      scopedMemo: createMemoMapSnapshot(this.scopedMemo),
      childScopes: Object.freeze(childSnapshots),
    };
    return Object.freeze(state);
  }
}

function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  const entries: MemoEntrySnapshot[] = [];
  for (const [port, metadata] of memo.entries()) {
    entries.push(
      Object.freeze({
        port,
        portName: port.__portName,
        resolvedAt: metadata.resolvedAt,
        resolutionOrder: metadata.resolutionOrder,
      })
    );
  }
  return Object.freeze({
    size: entries.length,
    entries: Object.freeze(entries),
  });
}

export function createScopeWrapper<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(
  impl: ScopeImpl<TProvides, TAsyncPorts, TPhase>,
  getInspector?: () => InspectorAPI | undefined
): Scope<TProvides, TAsyncPorts, TPhase> {
  function resolve<
    P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
  >(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const scope: Scope<TProvides, TAsyncPorts, TPhase> = {
    resolve,
    resolveAsync: port => impl.resolveAsync(port),
    tryResolve: <
      P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
    >(
      port: P
    ) => {
      const result = tryCatch(() => impl.resolve(port), mapToContainerError);
      emitResultEvent(getInspector?.(), port.__portName, result);
      return result;
    },
    tryResolveAsync: <P extends TProvides>(port: P) => {
      const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
      void resultAsync.then(result => {
        emitResultEvent(getInspector?.(), port.__portName, result);
      });
      return resultAsync;
    },
    tryDispose: () => fromPromise(impl.dispose(), mapToDisposalError),
    createScope: (name?: string) => impl.createScope(name),
    dispose: async () => {
      await impl.dispose();
      // Return the scope itself typed as disposed.
      // ActiveScopeMembers extends ScopeBase (= DisposedScopeMembers),
      // so the active scope satisfies the disposed container contract.
      return scope;
    },
    get isDisposed() {
      return impl.isDisposed;
    },
    has: port => impl.has(port),
    subscribe: listener => impl.subscribe(listener),
    getDisposalState: () => impl.getDisposalState(),
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    get [ScopeBrand]() {
      return unreachable<{ provides: TProvides }>("Scope brand is type-only");
    },
  };
  Object.freeze(scope);
  return scope;
}
