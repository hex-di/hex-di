/**
 * Request scope implementation for HTTP request isolation.
 *
 * Provides request-bound resolution context where services with 'request'
 * lifetime are created once per request and cached within that request.
 * When the request ends, the scope is disposed and all request-scoped
 * instances are cleaned up.
 *
 * @packageDocumentation
 * @internal
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
import type { ScopeContainerAccess } from "../container/internal-types.js";
import { unreachable } from "../util/unreachable.js";
import {
  ScopeLifecycleEmitter,
  type ScopeLifecycleListener,
  type ScopeSubscription,
  type ScopeDisposalState,
} from "./lifecycle-events.js";

/**
 * Generates a unique request ID.
 *
 * Uses timestamp and random values for uniqueness. This approach is simple
 * and works across all JavaScript environments without relying on
 * crypto APIs that may not be available.
 *
 * @internal
 */
function generateRequestId(): string {
  // Simple but effective ID generation using timestamp and random
  // Format: req-{timestamp}-{random} gives ~36^9 combinations per millisecond
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Request scope counter for unique ID generation.
 * @internal
 */
let requestScopeCounter = 0;

/**
 * Generates a unique request scope ID.
 *
 * @param name - Optional explicit name for the scope
 * @returns A request scope ID (explicit name or generated "request-N" format)
 * @internal
 */
function generateRequestScopeId(name?: string): string {
  if (name !== undefined) {
    return name;
  }
  return `request-${requestScopeCounter++}`;
}

/**
 * Resets the request scope ID counter.
 *
 * This is useful for testing to ensure predictable scope IDs.
 *
 * @internal
 */
export function resetRequestScopeIdCounter(): void {
  requestScopeCounter = 0;
}

/**
 * Request scope implementation for HTTP request isolation.
 *
 * Request scopes provide a resolution context where:
 * - Services with 'request' lifetime are created once per request
 * - Scoped services are created once per request (treated as scoped)
 * - Singleton services are resolved from the container
 * - Transient services are created fresh for each resolution
 *
 * @example Basic usage
 * ```typescript
 * app.use(async (req, res, next) => {
 *   const requestScope = container.createRequestScope(`req-${req.id}`);
 *   req.scope = requestScope;
 *
 *   try {
 *     await next();
 *   } finally {
 *     await requestScope.dispose();
 *   }
 * });
 * ```
 *
 * @internal
 */
export class RequestScopeImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
> {
  /** Unique identifier for this request scope */
  readonly id: string;

  /** Unique request ID for tracing/logging */
  readonly requestId: string;

  private readonly container: ScopeContainerAccess<TProvides>;

  /**
   * Memo for request-scoped and scoped instances.
   * Both 'request' and 'scoped' lifetimes use this memo within a request context.
   */
  private readonly requestMemo: MemoMap;

  private disposed: boolean = false;
  private readonly childScopes: Set<RequestScopeImpl<TProvides, TAsyncPorts, TPhase>> = new Set();
  private readonly parentScope: RequestScopeImpl<TProvides, TAsyncPorts, TPhase> | null;
  private readonly lifecycleEmitter: ScopeLifecycleEmitter;
  private readonly unregisterFromContainer: (() => void) | undefined;

  constructor(
    container: ScopeContainerAccess<TProvides>,
    singletonMemo: MemoMap,
    parentScope: RequestScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null,
    unregisterFromContainer?: () => void,
    name?: string
  ) {
    this.id = generateRequestScopeId(name);
    this.requestId = generateRequestId();
    this.container = container;
    // Fork from singleton memo - this gives us access to singletons
    // while maintaining our own cache for request/scoped instances
    this.requestMemo = singletonMemo.fork();
    this.parentScope = parentScope;
    this.lifecycleEmitter = new ScopeLifecycleEmitter();
    this.unregisterFromContainer = unregisterFromContainer;
  }

  /**
   * Resolves a service instance within this request scope.
   *
   * Resolution follows these rules:
   * - Singleton: Resolved from container (shared across all requests)
   * - Request: Created once per request, cached in requestMemo
   * - Scoped: Created once per request scope (treated same as request)
   * - Transient: Created fresh on each resolution
   *
   * @param port - The port to resolve
   * @returns The resolved service instance
   * @throws {DisposedScopeError} If the scope has been disposed
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveInternal(port, this.requestMemo, this.id);
  }

  /**
   * Resolves a service instance asynchronously.
   *
   * @param port - The port to resolve
   * @returns Promise resolving to the service instance
   * @throws {DisposedScopeError} If the scope has been disposed
   */
  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    return this.container.resolveAsyncInternal(port, this.requestMemo, this.id);
  }

  /**
   * Creates a child request scope.
   *
   * Child scopes inherit from this scope's memo, allowing for
   * nested request contexts (e.g., sub-requests, batch operations).
   *
   * @param name - Optional name for the child scope
   * @returns A new child Scope instance
   */
  createScope(name?: string): Scope<TProvides, TAsyncPorts, TPhase> {
    const child = new RequestScopeImpl<TProvides, TAsyncPorts, TPhase>(
      this.container,
      this.requestMemo, // Children inherit from parent's request memo
      this,
      undefined,
      name
    );
    this.childScopes.add(child);
    return createRequestScopeWrapper(child);
  }

  /**
   * Disposes this request scope and all child scopes.
   *
   * After disposal:
   * - All request-scoped instances are cleaned up
   * - Finalizers are called in LIFO order
   * - The scope cannot be used for resolution
   *
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    // Emit 'disposing' synchronously before async disposal begins
    this.lifecycleEmitter.emit("disposing");

    this.disposed = true;

    // Dispose child scopes first
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();

    // Dispose request memo (calls finalizers)
    await this.requestMemo.dispose();

    // Unregister from parent
    if (this.parentScope !== null) {
      this.parentScope.childScopes.delete(this);
    } else if (this.unregisterFromContainer !== undefined) {
      this.unregisterFromContainer();
    }

    // Emit 'disposed' after async disposal completes
    this.lifecycleEmitter.emit("disposed");

    // Clear listeners to prevent memory leaks
    this.lifecycleEmitter.clear();
  }

  /**
   * Whether the scope has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Checks if a port is available for resolution.
   *
   * @param port - The port to check
   * @returns true if the port can be resolved
   */
  has(port: Port<unknown, string>): boolean {
    return this.container.hasAdapter(port);
  }

  /**
   * Gets the unique request ID for this scope.
   *
   * Useful for logging, tracing, and correlation across services.
   *
   * @returns The unique request identifier
   */
  getRequestId(): string {
    return this.requestId;
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

  /**
   * Gets internal state for DevTools inspection.
   *
   * @returns Frozen snapshot of internal state
   * @throws {DisposedScopeError} If the scope has been disposed
   * @internal
   */
  getInternalState(): ScopeInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(`request-scope:${this.id}`);
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
      scopedMemo: createMemoMapSnapshot(this.requestMemo),
      childScopes: Object.freeze(childSnapshots),
    };
    return Object.freeze(state);
  }
}

/**
 * Creates a snapshot of a MemoMap for DevTools inspection.
 * @internal
 */
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

/**
 * Creates a Scope wrapper around a RequestScopeImpl.
 *
 * @param impl - The RequestScopeImpl instance
 * @returns A frozen Scope object
 * @internal
 */
export function createRequestScopeWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(impl: RequestScopeImpl<TProvides, TAsyncPorts, TPhase>): Scope<TProvides, TAsyncPorts, TPhase> {
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
