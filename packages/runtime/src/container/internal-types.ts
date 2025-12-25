/**
 * Internal types for container implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind, AdapterAny, Graph } from "@hex-di/graph";
import type { ContainerOptions, ResolutionHooks } from "../resolution/hooks.js";
import type { AnyPlugin } from "../plugin/types.js";
import type { MemoMap } from "../common/memo-map.js";
import type { InheritanceMode } from "../types.js";
import type { PluginManager } from "../plugin/plugin-manager.js";
import { AsyncInitializationRequiredError } from "../common/errors.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

// =============================================================================
// Runtime Adapter Types
// =============================================================================

/**
 * Type alias for adapters at runtime.
 * Uses AdapterAny from @hex-di/graph for structural compatibility with Graph.adapters.
 */
export type RuntimeAdapter = AdapterAny;

export type RuntimeAdapterFor<P extends Port<unknown, string>> = Adapter<
  P,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind,
  boolean
>;

// =============================================================================
// Type Guards for Adapters
// =============================================================================

export function isAdapterForPort<P extends Port<unknown, string>>(
  adapter: RuntimeAdapter,
  port: P
): adapter is RuntimeAdapterFor<P> {
  return adapter.provides === port;
}

export function isAsyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>
): adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "async"> {
  return adapter.factoryKind === "async";
}

export function assertSyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>,
  portName: string
): asserts adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "sync"> {
  if (adapter.factoryKind === "async") {
    throw new AsyncInitializationRequiredError(portName);
  }
}

// =============================================================================
// Hooks State Types
// =============================================================================

export interface ParentStackEntry {
  readonly port: Port<unknown, string>;
  readonly startTime: number;
}

export interface HooksState {
  readonly hooks: ResolutionHooks;
  readonly parentStack: ParentStackEntry[];
}

// =============================================================================
// Forked Entry Types
// =============================================================================

export interface ForkedEntry<P extends Port<unknown, string>> {
  readonly port: P;
  readonly instance: InferService<P>;
}

export function isForkedEntryForPort<P extends Port<unknown, string>>(
  entry: ForkedEntry<Port<unknown, string>>,
  port: P
): entry is ForkedEntry<P> {
  return entry.port === port;
}

// =============================================================================
// Disposable Child Interface
// =============================================================================

export interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

// =============================================================================
// Parent Container Interface (for child containers)
// =============================================================================

export interface ParentContainerLike<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string>,
> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  originalParent: unknown;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}

// =============================================================================
// Container Configuration Types
// =============================================================================

/**
 * Configuration for creating a root container from a Graph.
 */
export interface RootContainerConfig<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string>,
> {
  kind: "root";
  graph: Graph<TProvides, Port<unknown, string>>;
  options?: ContainerOptions<readonly AnyPlugin[]>;
}

/**
 * Configuration for creating a child container from a parent.
 */
export interface ChildContainerConfig<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  kind: "child";
  parent: ParentContainerLike<TProvides, TAsyncPorts>;
  overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  /**
   * Plugin manager inherited from parent container.
   * Used to create HooksRunner for child container hook integration.
   */
  pluginManager: PluginManager | null;
  /**
   * Unique identifier for this child container.
   * Used in hook context and DevTools tracking.
   */
  containerId: string;
  /**
   * Parent container's ID for hierarchy tracking.
   */
  parentContainerId: string;
}

export type ContainerConfig<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = RootContainerConfig<TProvides, TAsyncPorts> | ChildContainerConfig<TProvides, TAsyncPorts>;

// =============================================================================
// Internal Container Methods Interface
// =============================================================================

/**
 * Internal methods shared by Container wrappers.
 * @internal
 */
export interface InternalContainerMethods<TProvides extends Port<unknown, string>> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  hasAdapter(port: Port<unknown, string>): boolean;
}

/**
 * Interface for the methods ScopeImpl needs from Container implementations.
 * Using an interface allows proper type variance.
 * @internal
 */
export interface ScopeContainerAccess<TProvides extends Port<unknown, string>> {
  resolveInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): InferService<P>;
  resolveAsyncInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<InferService<P>>;
  getSingletonMemo(): MemoMap;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}
