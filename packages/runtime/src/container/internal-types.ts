/**
 * Internal types for container implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Adapter, Lifetime, FactoryKind, AdapterConstraint } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { ContainerOptions, ResolutionHooks } from "../resolution/hooks.js";
import type { MemoMap } from "../util/memo-map.js";
import type { InheritanceMode, RuntimePerformanceOptions } from "../types.js";
import { AsyncInitializationRequiredError } from "../errors/index.js";
import { ADAPTER_ACCESS } from "../inspection/symbols.js";

// =============================================================================
// Runtime Adapter Types
// =============================================================================

/**
 * Type alias for adapters at runtime.
 * Uses AdapterConstraint from @hex-di/graph for structural compatibility with Graph.adapters.
 */
export type RuntimeAdapter = AdapterConstraint;

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
// Internal Access Type Guard
// =============================================================================

import type { InternalAccessible } from "../inspection/internal-state-types.js";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";

/**
 * Type guard to check if a value is InternalAccessible.
 *
 * Used for runtime validation before type-safe casts when:
 * - Converting unknown containers to InternalAccessible in wrapper pattern
 * - Validating container types at runtime boundaries
 *
 * @param value - Value to check
 * @returns True if value has INTERNAL_ACCESS as a function
 *
 * @example
 * ```typescript
 * function getState(container: unknown): ContainerInternalState {
 *   if (!isInternalAccessible(container)) {
 *     throw new Error('Not a valid container');
 *   }
 *   return container[INTERNAL_ACCESS]();
 * }
 * ```
 */
export function isInternalAccessible(value: unknown): value is InternalAccessible {
  return (
    value !== null &&
    typeof value === "object" &&
    INTERNAL_ACCESS in value &&
    typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] === "function"
  );
}

/**
 * Safely casts a value to InternalAccessible after runtime validation.
 *
 * This consolidates the InternalAccessible cast pattern used in wrapper code.
 * Throws if the value is not a valid InternalAccessible container.
 *
 * @param value - Value to convert
 * @param context - Context string for error messages
 * @returns The value typed as InternalAccessible
 * @throws Error if value is not InternalAccessible
 */
export function asInternalAccessible(value: unknown, context: string): InternalAccessible {
  if (!isInternalAccessible(value)) {
    throw new Error(`${context}: Expected InternalAccessible container`);
  }
  return value;
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
  /**
   * Human-readable container name for DevTools display.
   */
  containerName: string;
  options?: ContainerOptions;
  /**
   * Performance-related options for runtime behavior.
   */
  performance?: RuntimePerformanceOptions;
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
   * Unique identifier for this child container.
   * Used in hook context and DevTools tracking.
   */
  containerId: string;
  /**
   * Human-readable container name for DevTools display.
   */
  containerName: string;
  /**
   * Parent container's ID for hierarchy tracking.
   */
  parentContainerId: string;
  /**
   * Performance-related options for runtime behavior.
   */
  performance?: RuntimePerformanceOptions;
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
    scopeId?: string | null,
    scopeName?: string
  ): InferService<P>;
  resolveAsyncInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): Promise<InferService<P>>;
  getSingletonMemo(): MemoMap;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}
