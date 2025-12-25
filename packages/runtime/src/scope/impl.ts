/**
 * Internal Scope implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Scope } from "../types.js";
import { ScopeBrand } from "../types.js";
import { MemoMap } from "../common/memo-map.js";
import { INTERNAL_ACCESS } from "../inspector/symbols.js";
import type { ScopeInternalState, MemoMapSnapshot, MemoEntrySnapshot } from "../inspector/types.js";
import { DisposedScopeError } from "../common/errors.js";
import type { ScopeContainerAccess } from "../container/impl.js";
import { unreachable } from "../common/unreachable.js";
import {
  ScopeLifecycleEmitter,
  type ScopeLifecycleListener,
  type ScopeSubscription,
  type ScopeDisposalState,
} from "./lifecycle-events.js";

// Scope ID Generation
let scopeIdCounter = 0;
function generateScopeId(): string {
  return `scope-${scopeIdCounter++}`;
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

  constructor(
    container: ScopeContainerAccess<TProvides>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null
  ) {
    this.id = generateScopeId();
    this.container = container;
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
    this.lifecycleEmitter = new ScopeLifecycleEmitter();
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

  createScope(): Scope<TProvides, TAsyncPorts, TPhase> {
    const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
      this.container,
      this.container.getSingletonMemo(),
      this
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
    createScope: () => impl.createScope(),
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
