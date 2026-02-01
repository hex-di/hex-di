/**
 * Internal Scope implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Scope } from "../types.js";
import { ScopeBrand } from "../types.js";
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
 *
 * This is an object to allow resetting the generator while maintaining
 * the same reference from `generateScopeId()`.
 *
 * @internal
 */
const defaultGeneratorHolder = {
  generator: createScopeIdGenerator(),
};

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
  return defaultGeneratorHolder.generator(name);
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
  defaultGeneratorHolder.generator = createScopeIdGenerator();
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
  private readonly container: ScopeContainerAccess<TProvides>;
  private readonly scopedMemo: MemoMap;
  private disposed: boolean = false;
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
    this.id = generateScopeId(name);
    this.container = container;
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
    this.lifecycleEmitter = new ScopeLifecycleEmitter();
    this.unregisterFromContainer = unregisterFromContainer;
  }

  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveInternal(port, this.scopedMemo, this.id);
  }

  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveAsyncInternal(port, this.scopedMemo, this.id);
  }

  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
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
    await this.scopedMemo.dispose();
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

  has(port: Port<unknown, string>): boolean {
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
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(impl: ScopeImpl<TProvides, TAsyncPorts, TPhase>): Scope<TProvides, TAsyncPorts, TPhase> {
  function resolve<
    P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
  >(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const scope: Scope<TProvides, TAsyncPorts, TPhase> = {
    resolve,
    resolveAsync: port => impl.resolveAsync(port),
    createScope: (name?: string) => impl.createScope(name),
    dispose: () => impl.dispose(),
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
