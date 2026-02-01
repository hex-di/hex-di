/**
 * Ownership State Model Design for DevTools Debugging
 *
 * This module defines the optimal discriminated union structure for representing
 * service ownership in a DI container hierarchy. The design prioritizes clarity
 * for debugging over implementation simplicity.
 *
 * ## Developer Questions Answered
 *
 * | Question                                    | Answered By                              |
 * |---------------------------------------------|------------------------------------------|
 * | "Where is this adapter defined?"            | `source.containerId` + `source.path`     |
 * | "Is this the same instance as parent?"      | `kind: "inherited"` + `inheritanceMode`  |
 * | "Does this override something?"             | `kind: "override"` with `overrides` info |
 * | "What did it override?"                     | `overrides.originalSource`               |
 * | "If I change this, who else is affected?"   | `mutationScope` field                    |
 *
 * @packageDocumentation
 */

import type { Lifetime, FactoryKind } from "@hex-di/core";

// =============================================================================
// Core Branded Types for Explicitness
// =============================================================================

/**
 * Branded type for container identifiers.
 *
 * Using branded types prevents accidental string confusion
 * and makes the API self-documenting.
 */
export type ContainerId = string & { readonly __brand: "ContainerId" };

/**
 * Branded type for port names.
 *
 * Distinguishes port names from arbitrary strings in the type system.
 */
export type PortName = string & { readonly __brand: "PortName" };

// =============================================================================
// Source Location Types
// =============================================================================

/**
 * Describes the location where an adapter is defined.
 *
 * This answers: "Where is this adapter defined?"
 */
export interface AdapterSource {
  /**
   * ID of the container where this adapter is defined.
   *
   * For inherited adapters, this is the ancestor container ID.
   * For own/override adapters, this is the current container ID.
   */
  readonly containerId: ContainerId;

  /**
   * Human-readable name of the source container.
   */
  readonly containerName: string;

  /**
   * Path from root to source container for debugging.
   *
   * Example: ["App", "Dashboard", "ChatPanel"]
   *
   * Enables quick understanding of where in the hierarchy
   * an adapter lives without manual traversal.
   */
  readonly containerPath: readonly string[];

  /**
   * Distance from current container to source (0 = local, 1 = parent, etc.)
   *
   * Answers: "How many levels up is this defined?"
   */
  readonly depth: number;
}

// =============================================================================
// Override Information
// =============================================================================

/**
 * Details about what an override replaces.
 *
 * This answers: "What did it override?"
 */
export interface OverrideInfo {
  /**
   * Source of the original adapter that was overridden.
   */
  readonly originalSource: AdapterSource;

  /**
   * Original lifetime before override.
   *
   * Useful for detecting lifetime changes (e.g., singleton -> transient).
   */
  readonly originalLifetime: Lifetime;

  /**
   * Original factory kind before override.
   *
   * Detects sync -> async changes that could break consumers.
   */
  readonly originalFactoryKind: FactoryKind;

  /**
   * Whether the override changes the lifetime.
   *
   * Computed for quick detection of risky changes.
   */
  readonly lifetimeChanged: boolean;

  /**
   * Whether the override changes sync/async nature.
   *
   * Computed for quick detection of breaking changes.
   */
  readonly factoryKindChanged: boolean;
}

// =============================================================================
// Mutation Scope
// =============================================================================

/**
 * Describes the scope of impact if this adapter changes.
 *
 * This answers: "If I change this, who else is affected?"
 */
export interface MutationScope {
  /**
   * Containers that would be affected by a change to this adapter.
   *
   * For "own" adapters: Only the current container (unless shared by children)
   * For "inherited" with "shared": Current + all children using shared mode
   * For "inherited" with "forked": Only current (forked copy is independent)
   * For "inherited" with "isolated": Only current (creates own instance)
   */
  readonly affectedContainerIds: readonly ContainerId[];

  /**
   * Human-readable names for affected containers.
   */
  readonly affectedContainerNames: readonly string[];

  /**
   * Number of containers that would be affected.
   *
   * Quick check for mutation risk level:
   * - 1: Safe, local change
   * - 2+: Shared mutation, requires careful consideration
   */
  readonly affectedCount: number;

  /**
   * Whether this adapter's value is shared across multiple containers.
   *
   * true = changing the value in parent affects children
   * false = each container has its own copy/instance
   */
  readonly isShared: boolean;

  /**
   * IDs of child containers that share this instance.
   *
   * Only populated when `isShared` is true.
   */
  readonly sharingChildren: readonly ContainerId[];
}

// =============================================================================
// Ownership State Discriminated Union
// =============================================================================

/**
 * Base fields shared by all ownership states.
 */
interface OwnershipStateBase {
  /**
   * The port name this ownership describes.
   */
  readonly portName: PortName;

  /**
   * Current lifetime of the adapter.
   */
  readonly lifetime: Lifetime;

  /**
   * Current factory kind (sync/async).
   */
  readonly factoryKind: FactoryKind;

  /**
   * Source location of the adapter definition.
   */
  readonly source: AdapterSource;

  /**
   * Scope of impact for mutations.
   */
  readonly mutationScope: MutationScope;
}

/**
 * State: Adapter is defined locally in this container.
 *
 * This is the simplest case - the adapter was registered directly
 * in the current container's graph.
 */
export interface OwnedState extends OwnershipStateBase {
  readonly kind: "owned";

  /**
   * Whether this adapter could be overridden by child containers.
   *
   * Hint for developers: if false, child containers cannot shadow this.
   */
  readonly overridable: boolean;
}

/**
 * State: Adapter is inherited from a parent container.
 *
 * The child container uses this adapter through inheritance,
 * with behavior determined by the inheritance mode.
 */
export interface InheritedState extends OwnershipStateBase {
  readonly kind: "inherited";

  /**
   * How inheritance is handled for this adapter.
   *
   * - "shared": Same instance as parent (live reference)
   * - "forked": Shallow copy of parent's instance at resolution time
   * - "isolated": Fresh instance created with child's dependency resolution
   */
  readonly inheritanceMode: "shared" | "forked" | "isolated";

  /**
   * Whether the instance is the exact same object as parent's.
   *
   * true = modifying this affects parent (shared mode)
   * false = independent copy (forked/isolated modes)
   */
  readonly sameInstanceAsParent: boolean;

  /**
   * Full inheritance chain from current container to source.
   *
   * Answers: "How did we get this adapter?"
   *
   * Example: For a grandchild inheriting from grandparent:
   * [
   *   { containerId: "child", containerName: "Dashboard", inheritanceMode: "shared" },
   *   { containerId: "parent", containerName: "App", inheritanceMode: "shared" }
   * ]
   *
   * The last entry's parent is the source (where adapter is defined).
   */
  readonly inheritanceChain: readonly InheritanceChainEntry[];
}

/**
 * Entry in the inheritance chain.
 */
export interface InheritanceChainEntry {
  readonly containerId: ContainerId;
  readonly containerName: string;
  readonly inheritanceMode: "shared" | "forked" | "isolated";
}

/**
 * State: Adapter overrides an inherited adapter.
 *
 * The container has locally registered an adapter for a port that
 * exists in a parent container, effectively shadowing it.
 */
export interface OverrideState extends OwnershipStateBase {
  readonly kind: "override";

  /**
   * Information about what was overridden.
   *
   * Contains the original source and any detected changes.
   */
  readonly overrides: OverrideInfo;

  /**
   * Whether this override is safe or potentially breaking.
   *
   * "safe": Same lifetime and factory kind
   * "lifetime-change": Lifetime differs (e.g., singleton -> transient)
   * "async-change": Factory kind differs (sync -> async or vice versa)
   * "breaking": Both lifetime and factory kind changed
   */
  readonly overrideSeverity: "safe" | "lifetime-change" | "async-change" | "breaking";
}

/**
 * State: Adapter extends parent (new port in child graph).
 *
 * The child container adds a completely new adapter that doesn't
 * exist in any parent container.
 */
export interface ExtendedState extends OwnershipStateBase {
  readonly kind: "extended";

  /**
   * Whether this extension depends on inherited adapters.
   *
   * If true, the extension's dependencies include inherited ports,
   * creating a cross-container dependency relationship.
   */
  readonly dependsOnInherited: boolean;

  /**
   * Names of inherited ports this extension depends on.
   *
   * Useful for understanding the integration surface with parent containers.
   */
  readonly inheritedDependencies: readonly PortName[];
}

/**
 * Discriminated union of all ownership states.
 *
 * Use `state.kind` for exhaustive type narrowing:
 *
 * @example
 * ```typescript
 * function describeOwnership(state: OwnershipState): string {
 *   switch (state.kind) {
 *     case "owned":
 *       return `Locally defined in ${state.source.containerName}`;
 *     case "inherited":
 *       return `Inherited (${state.inheritanceMode}) from ${state.source.containerName}`;
 *     case "override":
 *       return `Overrides ${state.overrides.originalSource.containerName} adapter`;
 *     case "extended":
 *       return `New in ${state.source.containerName}`;
 *   }
 * }
 * ```
 */
export type OwnershipState = OwnedState | InheritedState | OverrideState | ExtendedState;

// =============================================================================
// Container Ownership Summary
// =============================================================================

/**
 * Complete ownership information for a container.
 *
 * Provides a full picture of all adapters and their ownership states
 * for DevTools visualization and debugging.
 */
export interface ContainerOwnershipSummary {
  /**
   * Container this summary describes.
   */
  readonly containerId: ContainerId;
  readonly containerName: string;

  /**
   * Kind of container.
   */
  readonly containerKind: "root" | "child" | "lazy";

  /**
   * Parent container ID, if any.
   */
  readonly parentContainerId: ContainerId | null;

  /**
   * All ownership states indexed by port name.
   */
  readonly adapters: ReadonlyMap<PortName, OwnershipState>;

  /**
   * Summary statistics for quick overview.
   */
  readonly stats: OwnershipStats;
}

/**
 * Quick statistics about ownership distribution.
 */
export interface OwnershipStats {
  /** Number of locally owned adapters */
  readonly ownedCount: number;
  /** Number of inherited adapters */
  readonly inheritedCount: number;
  /** Number of overridden adapters */
  readonly overrideCount: number;
  /** Number of extension adapters */
  readonly extendedCount: number;

  /** Breakdown of inheritance modes */
  readonly inheritanceModes: {
    readonly shared: number;
    readonly forked: number;
    readonly isolated: number;
  };

  /** Number of overrides with breaking changes */
  readonly breakingOverrides: number;

  /** Total number of adapters */
  readonly total: number;
}

// =============================================================================
// Helper Functions (Type Guards)
// =============================================================================

/**
 * Type guard for owned state.
 */
export function isOwned(state: OwnershipState): state is OwnedState {
  return state.kind === "owned";
}

/**
 * Type guard for inherited state.
 */
export function isInherited(state: OwnershipState): state is InheritedState {
  return state.kind === "inherited";
}

/**
 * Type guard for override state.
 */
export function isOverride(state: OwnershipState): state is OverrideState {
  return state.kind === "override";
}

/**
 * Type guard for extended state.
 */
export function isExtended(state: OwnershipState): state is ExtendedState {
  return state.kind === "extended";
}

/**
 * Checks if an ownership state represents a shared instance.
 *
 * Returns true if changes to this adapter would affect other containers.
 */
export function isSharedInstance(state: OwnershipState): boolean {
  if (state.kind === "inherited") {
    return state.inheritanceMode === "shared";
  }
  return state.mutationScope.isShared;
}

/**
 * Checks if an ownership state represents a potentially breaking change.
 */
export function hasBreakingChange(state: OwnershipState): boolean {
  if (state.kind === "override") {
    return state.overrideSeverity === "breaking" || state.overrideSeverity === "async-change";
  }
  return false;
}

// =============================================================================
// Design Rationale
// =============================================================================

/**
 * ## Design Decisions
 *
 * ### 1. Four-way discriminated union (owned/inherited/override/extended)
 *
 * Rationale: These are semantically distinct states with different implications:
 * - `owned`: Local definition, simple case
 * - `inherited`: Using parent's definition, mode matters
 * - `override`: Explicitly shadows parent, original info needed
 * - `extended`: New functionality, dependency analysis useful
 *
 * ### 2. Full inheritance chain for inherited state
 *
 * Rationale: For debugging deep hierarchies, knowing just the immediate
 * parent isn't enough. The chain shows exactly how the adapter flows
 * through the container tree.
 *
 * ### 3. Override includes original info
 *
 * Rationale: Developers need to know:
 * - What they're replacing (original source)
 * - Whether the change is safe (severity classification)
 * - What properties changed (lifetime/async comparison)
 *
 * ### 4. Mutation scope is explicit
 *
 * Rationale: The most dangerous bugs come from unexpected shared mutation.
 * Making scope explicit prevents "I changed this and broke everything" scenarios.
 *
 * ### 5. Branded types for IDs
 *
 * Rationale: Prevents accidental string confusion and makes types self-documenting.
 * TypeScript's structural typing means we need brands to distinguish ContainerId
 * from PortName from arbitrary strings.
 *
 * ### 6. Pre-computed boolean helpers
 *
 * Rationale: Fields like `sameInstanceAsParent`, `lifetimeChanged`, etc.
 * are derived from other data but computed once. This trades a tiny amount
 * of memory for O(1) access and clearer semantics.
 *
 * ## Trade-offs
 *
 * ### Verbosity vs Clarity
 * The model is intentionally verbose. Each field has a single responsibility
 * and clear naming. This is optimized for debugging, not code golf.
 *
 * ### Memory vs Speed
 * Pre-computing derived fields and storing the full chain uses more memory
 * but enables instant debugging access without re-computation.
 *
 * ### Richness vs Simplicity
 * A simpler model (just origin + mode) would be easier to implement but
 * would require the debugging UI to re-derive crucial information.
 */
