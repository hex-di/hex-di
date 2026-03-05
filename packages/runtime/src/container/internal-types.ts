/**
 * Internal types for container implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Adapter, Lifetime, FactoryKind, AdapterConstraint } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { ContainerOptions, ResolutionHooks } from "../resolution/hooks.js";
import type { MemoMap } from "../util/memo-map.js";
import type { InheritanceMode, RuntimePerformanceOptions, RuntimeSafetyOptions } from "../types.js";
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

export type RuntimeAdapterFor<P extends Port<string, unknown>> = Adapter<
  P,
  Port<string, unknown> | never,
  Lifetime,
  FactoryKind,
  boolean
>;

// =============================================================================
// Type Guards for Adapters
// =============================================================================

export function isAdapterForPort<P extends Port<string, unknown>>(
  adapter: RuntimeAdapter,
  port: P
): adapter is RuntimeAdapterFor<P> {
  return adapter.provides === port;
}

export function isAsyncAdapter<P extends Port<string, unknown>>(
  adapter: RuntimeAdapterFor<P>
): adapter is Adapter<P, Port<string, unknown> | never, Lifetime, "async"> {
  return adapter.factoryKind === "async";
}

export function assertSyncAdapter<P extends Port<string, unknown>>(
  adapter: RuntimeAdapterFor<P>,
  portName: string
): asserts adapter is Adapter<P, Port<string, unknown> | never, Lifetime, "sync"> {
  if (adapter.factoryKind === "async") {
    throw new AsyncInitializationRequiredError(portName);
  }
}

// =============================================================================
// Hooks State Types
// =============================================================================

export interface ParentStackEntry {
  readonly port: Port<string, unknown>;
  readonly startTime: number;
}

export interface HooksState {
  readonly hooks: ResolutionHooks;
  readonly parentStack: ParentStackEntry[];
}

// =============================================================================
// Forked Entry Types
// =============================================================================

export interface ForkedEntry<P extends Port<string, unknown>> {
  readonly port: P;
  readonly instance: InferService<P>;
}

export function isForkedEntryForPort<P extends Port<string, unknown>>(
  entry: ForkedEntry<Port<string, unknown>>,
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
  TProvides extends Port<string, unknown>,
  _TAsyncPorts extends Port<string, unknown>,
> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<string, unknown>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  originalParent: unknown;
  has(port: Port<string, unknown>): boolean;
  hasAdapter(port: Port<string, unknown>): boolean;
}

// =============================================================================
// Container Configuration Types
// =============================================================================

/**
 * Configuration for creating a root container from a Graph.
 */
export interface RootContainerConfig<
  TProvides extends Port<string, unknown>,
  _TAsyncPorts extends Port<string, unknown>,
> {
  kind: "root";
  graph: Graph<TProvides, Port<string, unknown>>;
  /**
   * Human-readable container name for DevTools display.
   */
  containerName: string;
  options?: ContainerOptions;
  /**
   * Performance-related options for runtime behavior.
   */
  performance?: RuntimePerformanceOptions;
  /**
   * Safety-related options including contract checking.
   */
  safety?: RuntimeSafetyOptions;
}

/**
 * Configuration for creating a child container from a parent.
 */
export interface ChildContainerConfig<
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
> {
  kind: "child";
  parent: ParentContainerLike<TProvides, TAsyncPorts>;
  overrides: ReadonlyMap<Port<string, unknown>, RuntimeAdapter>;
  extensions: ReadonlyMap<Port<string, unknown>, RuntimeAdapter>;
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
  TProvides extends Port<string, unknown>,
  TAsyncPorts extends Port<string, unknown>,
> = RootContainerConfig<TProvides, TAsyncPorts> | ChildContainerConfig<TProvides, TAsyncPorts>;

// =============================================================================
// Internal Container Methods Interface
// =============================================================================

/**
 * Internal methods shared by Container wrappers.
 * @internal
 */
export interface InternalContainerMethods<TProvides extends Port<string, unknown>> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<string, unknown>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  hasAdapter(port: Port<string, unknown>): boolean;
}

/**
 * Interface for the methods ScopeImpl needs from Container implementations.
 * Using an interface allows proper type variance.
 * @internal
 */
export interface ScopeContainerAccess<TProvides extends Port<string, unknown>> {
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
  has(port: Port<string, unknown>): boolean;
  hasAdapter(port: Port<string, unknown>): boolean;
}
