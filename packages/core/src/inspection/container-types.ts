/**
 * Container and scope types for inspection.
 *
 * These types define the core container inspection types used by
 * inspection and tracing systems.
 *
 * @packageDocumentation
 */

import type { Lifetime, FactoryKind } from "../adapters/types.js";

// Re-export for convenience
export type { Lifetime, FactoryKind };

/**
 * Inheritance mode for child containers.
 * - shared: Child shares parent's singleton instance (live reference)
 * - forked: Child gets a snapshot copy of parent's instance
 * - isolated: Child creates its own fresh instance
 */
export type InheritanceMode = "shared" | "forked" | "isolated";

/**
 * Origin of a service in a container.
 * - own: Service is defined in the current container (new local adapter)
 * - inherited: Service is inherited from a parent container
 * - overridden: Service replaces a parent adapter (child override)
 */
export type ServiceOrigin = "own" | "inherited" | "overridden";

// =============================================================================
// Container Types
// =============================================================================

/**
 * Container type discriminant for type-safe snapshot handling.
 */
export type ContainerKind = "root" | "child" | "lazy" | "scope";

/**
 * Phantom type parameter for tracking container disposal state at the type level.
 *
 * Used as a phantom type parameter on Container and Scope to encode lifecycle
 * state transitions. When `"active"`, resolution methods are available. When
 * `"disposed"`, resolution methods become `never` (type error to call them).
 *
 * This is separate from {@link ContainerPhase} which tracks detailed inspection
 * phases across all container types. `DisposalPhase` is specifically for
 * compile-time prevention of resolve-after-dispose via phantom type parameters.
 *
 * @see ADR-CO-003 for the design decision behind disposal state phantom types
 * @see BEH-CO-07 for the behavior specification
 */
export type DisposalPhase = "active" | "disposed";

/**
 * Container phase states across all container types.
 *
 * Different container types have different valid phases:
 * - Root: "uninitialized" | "initialized" | "disposing" | "disposed"
 * - Child: "initialized" | "disposing" | "disposed" (inherits init from parent)
 * - Lazy: "unloaded" | "loading" | "loaded" | "disposing" | "disposed"
 * - Scope: "active" | "disposing" | "disposed"
 */
export type ContainerPhase =
  | "uninitialized"
  | "initialized"
  | "unloaded"
  | "loading"
  | "loaded"
  | "active"
  | "disposing"
  | "disposed";

/**
 * Information about a resolved singleton.
 */
export interface SingletonEntry {
  /** Port name of the singleton */
  readonly portName: string;
  /** Timestamp when the singleton was resolved */
  readonly resolvedAt: number;
  /** Whether the singleton is currently resolved (has cached instance) */
  readonly isResolved: boolean;
}

/**
 * Information about an active scope.
 */
export interface ScopeInfo {
  readonly id: string;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly resolvedPorts: readonly string[];
  readonly createdAt: number;
  readonly isActive: boolean;
}

/**
 * Hierarchical tree structure for scopes.
 */
export interface ScopeTree {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly children: readonly ScopeTree[];
  /** Port names of resolved services in this scope */
  readonly resolvedPorts: readonly string[];
}

/**
 * Base snapshot fields shared by all container types.
 */
interface ContainerSnapshotBase {
  readonly singletons: readonly SingletonEntry[];
  readonly scopes: ScopeTree;
  readonly isDisposed: boolean;
  /** Human-readable container name for DevTools display */
  readonly containerName: string;
}

/**
 * Root container snapshot.
 *
 * Root containers are created via `createContainer(graph)` and own
 * the dependency graph. They manage async adapter initialization.
 */
export interface RootContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "root";
  readonly phase: "uninitialized" | "initialized" | "disposing" | "disposed";
  readonly isInitialized: boolean;
  readonly asyncAdaptersTotal: number;
  readonly asyncAdaptersInitialized: number;
}

/**
 * Child container snapshot.
 *
 * Child containers are created via `container.createChild(graph)` and
 * extend or override the parent's adapters.
 */
export interface ChildContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "child";
  readonly phase: "initialized" | "disposing" | "disposed";
  readonly parentId: string;
  /** Per-port inheritance modes (port name -> mode). Defaults to 'shared' if not specified. */
  readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;
}

/**
 * Lazy container snapshot.
 *
 * Lazy containers are created via `container.createLazyChild(loader)` and
 * defer graph loading until first use.
 */
export interface LazyContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "lazy";
  readonly phase: "unloaded" | "loading" | "loaded" | "disposing" | "disposed";
  readonly isLoaded: boolean;
}

/**
 * Scope snapshot.
 *
 * Scopes are created via `container.createScope()` and provide
 * isolated scoped service instances.
 */
export interface ScopeSnapshot extends ContainerSnapshotBase {
  readonly kind: "scope";
  readonly phase: "active" | "disposing" | "disposed";
  readonly scopeId: string;
  readonly parentScopeId: string | null;
}

/**
 * Discriminated union of all container snapshots.
 *
 * Use `snapshot.kind` for type-safe narrowing to specific container types.
 *
 * @example
 * ```typescript
 * function handleSnapshot(snapshot: ContainerSnapshot) {
 *   switch (snapshot.kind) {
 *     case "root":
 *       console.log(`Async adapters: ${snapshot.asyncAdaptersInitialized}/${snapshot.asyncAdaptersTotal}`);
 *       break;
 *     case "lazy":
 *       console.log(`Loaded: ${snapshot.isLoaded}`);
 *       break;
 *     case "child":
 *       console.log(`Inheritance modes: ${snapshot.inheritanceModes.size} configured`);
 *       break;
 *     case "scope":
 *       console.log(`Scope ID: ${snapshot.scopeId}`);
 *       break;
 *   }
 * }
 * ```
 */
export type ContainerSnapshot =
  | RootContainerSnapshot
  | ChildContainerSnapshot
  | LazyContainerSnapshot
  | ScopeSnapshot;
