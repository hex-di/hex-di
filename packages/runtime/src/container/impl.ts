/**
 * Container implementation facade.
 *
 * Provides backward-compatible API by delegating to specialized implementations:
 * - RootContainerImpl for root containers (created from Graph)
 * - ChildContainerImpl for child containers (created from parent)
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import { MemoMap } from "../common/memo-map.js";
import { ScopeImpl } from "../scope/impl.js";
import type { ContainerInternalState } from "../inspector/types.js";
import type { RuntimeAdapter, DisposableChild, ContainerConfig } from "./internal-types.js";
import { RootContainerImpl } from "./root-impl.js";
import { ChildContainerImpl } from "./child-impl.js";
import { BaseContainerImpl } from "./base-impl.js";

// Re-export types needed by other modules
export type {
  RuntimeAdapter,
  DisposableChild,
  ParentContainerLike,
  RootContainerConfig,
  ChildContainerConfig,
  ContainerConfig,
  ScopeContainerAccess,
} from "./internal-types.js";

// Re-export implementations for advanced use cases
export { RootContainerImpl } from "./root-impl.js";
export { ChildContainerImpl } from "./child-impl.js";
export { BaseContainerImpl } from "./base-impl.js";

/**
 * Container implementation that handles both root and child containers.
 *
 * This class is a facade that delegates to specialized implementations:
 * - RootContainerImpl for containers created from a Graph
 * - ChildContainerImpl for containers created from a parent
 *
 * For new code, consider using RootContainerImpl or ChildContainerImpl directly.
 *
 * @internal
 */
export class ContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  private readonly impl: BaseContainerImpl<TProvides, TExtends, TAsyncPorts>;

  constructor(config: ContainerConfig<TProvides, TAsyncPorts>) {
    if (config.kind === "root") {
      this.impl = new RootContainerImpl(config) as BaseContainerImpl<
        TProvides,
        TExtends,
        TAsyncPorts
      >;
    } else {
      this.impl = new ChildContainerImpl(config) as BaseContainerImpl<
        TProvides,
        TExtends,
        TAsyncPorts
      >;
    }
  }

  // ===========================================================================
  // Delegation
  // ===========================================================================

  setWrapper(wrapper: unknown): void {
    this.impl.setWrapper(wrapper);
  }

  getWrapper(): unknown {
    return this.impl.getWrapper();
  }

  get isDisposed(): boolean {
    return this.impl.isDisposed;
  }

  get isInitialized(): boolean {
    return this.impl.isInitialized;
  }

  async initialize(): Promise<void> {
    return this.impl.initialize();
  }

  registerChildContainer(child: DisposableChild): void {
    this.impl.registerChildContainer(child);
  }

  unregisterChildContainer(child: DisposableChild): void {
    this.impl.unregisterChildContainer(child);
  }

  hasAdapter(port: Port<unknown, string>): boolean {
    return this.impl.hasAdapter(port);
  }

  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    return this.impl.getAdapter(port);
  }

  has(port: Port<unknown, string>): boolean {
    return this.impl.has(port);
  }

  getParent(): unknown {
    return this.impl.getParent();
  }

  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    return this.impl.resolve(port);
  }

  resolveInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): InferService<P>;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): unknown;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): unknown {
    return this.impl.resolveInternal(port, scopedMemo, scopeId);
  }

  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    return this.impl.resolveAsync(port);
  }

  resolveAsyncInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<InferService<P>>;
  resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<unknown>;
  async resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): Promise<unknown> {
    return this.impl.resolveAsyncInternal(port, scopedMemo, scopeId);
  }

  registerChildScope(
    scope: ScopeImpl<TProvides | TExtends, TAsyncPorts, "uninitialized" | "initialized">
  ): void {
    this.impl.registerChildScope(scope);
  }

  getSingletonMemo(): MemoMap {
    return this.impl.getSingletonMemo();
  }

  async dispose(): Promise<void> {
    return this.impl.dispose();
  }

  getInternalState(): ContainerInternalState {
    return this.impl.getInternalState();
  }
}
