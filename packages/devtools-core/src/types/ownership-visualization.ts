/**
 * Adapter Ownership Visualization Types
 *
 * Type definitions for visualizing adapter ownership states in the dependency
 * graph. These types model how adapters are displayed based on their relationship
 * to containers (owned, inherited, or overridden).
 *
 * Design principles:
 * - Discriminated unions for exhaustive pattern matching
 * - Compile-time safety for visual styling decisions
 * - Zero runtime cost (all types erased at compile time)
 * - Separation of data model from visual representation
 *
 * @packageDocumentation
 */

import type { FactoryKind } from "../types.js";
import type { Lifetime, InheritanceMode } from "@hex-di/plugin";
import type { ContainerId } from "./unified-graph.js";

// =============================================================================
// Ownership State Types (Discriminated Union)
// =============================================================================

/**
 * Adapter is defined in this container (original registration).
 *
 * Visual characteristics:
 * - Solid border (no dashing)
 * - Full opacity
 * - Border color based on lifetime
 */
export interface OwnedOwnershipState {
  readonly ownership: "owned";
  /** Service lifetime determines border color */
  readonly lifetime: Lifetime;
  /** Factory kind affects background tint */
  readonly factoryKind: FactoryKind;
}

/**
 * Adapter is inherited from a parent container.
 *
 * Visual characteristics:
 * - Dashed border (indicates indirection)
 * - Slightly reduced opacity
 * - Inheritance mode badge in corner
 */
export interface InheritedOwnershipState {
  readonly ownership: "inherited";
  /** The container that originally owns the adapter */
  readonly sourceContainerId: ContainerId;
  /** Display name of the source container */
  readonly sourceContainerName: string;
  /** How the inherited instance is handled */
  readonly inheritanceMode: InheritanceMode;
}

/**
 * Adapter overrides a parent container's adapter.
 *
 * Visual characteristics:
 * - Solid border with double stroke
 * - Override indicator badge
 * - Border color based on overriding adapter's lifetime
 */
export interface OverriddenOwnershipState {
  readonly ownership: "overridden";
  /** Service lifetime of the overriding adapter */
  readonly lifetime: Lifetime;
  /** Factory kind of the overriding adapter */
  readonly factoryKind: FactoryKind;
  /** Container being overridden */
  readonly overridesContainerId: ContainerId;
  /** Display name of the overridden container */
  readonly overridesContainerName: string;
}

/**
 * Discriminated union of all adapter ownership states.
 *
 * Use `ownership` field for type-safe pattern matching:
 *
 * @example Exhaustive visual style computation
 * ```typescript
 * function getNodeStyle(state: OwnershipState): NodeStyle {
 *   switch (state.ownership) {
 *     case "owned":
 *       return { strokeDasharray: undefined, opacity: 1.0 };
 *     case "inherited":
 *       return { strokeDasharray: "4 2", opacity: 0.85 };
 *     case "overridden":
 *       return { strokeDasharray: undefined, strokeWidth: 4, opacity: 1.0 };
 *   }
 * }
 * ```
 */
export type OwnershipState =
  | OwnedOwnershipState
  | InheritedOwnershipState
  | OverriddenOwnershipState;

// =============================================================================
// Node Visual State Types
// =============================================================================

/**
 * Visual styling properties derived from ownership state.
 *
 * These properties map directly to SVG/CSS styling attributes.
 * Computed from OwnershipState via pure functions (no runtime cost).
 */
export interface NodeVisualStyle {
  /** SVG stroke-dasharray (undefined = solid, "4 2" = dashed) */
  readonly strokeDasharray: string | undefined;
  /** SVG stroke color (CSS variable or hex) */
  readonly strokeColor: string;
  /** SVG stroke width in pixels */
  readonly strokeWidth: number;
  /** Node opacity (0.0 to 1.0) */
  readonly opacity: number;
  /** Background fill color */
  readonly fillColor: string;
  /** Whether to show double border (for overrides) */
  readonly hasDoubleBorder: boolean;
}

/**
 * Complete node visual state combining data and computed styles.
 */
export interface NodeVisualState {
  /** Port identifier */
  readonly portId: string;
  /** Display label */
  readonly label: string;
  /** Ownership state determining visual style */
  readonly ownershipState: OwnershipState;
  /** Computed visual styling properties */
  readonly visualStyle: NodeVisualStyle;
  /** Badges to display on the node */
  readonly badges: readonly NodeBadge[];
}

// =============================================================================
// Badge Types (Discriminated Union)
// =============================================================================

/**
 * Badge position on the node.
 * - top-left: Inheritance mode indicator
 * - top-right: Async factory indicator
 * - bottom-left: Override indicator
 * - bottom-right: Container count (aggregate view)
 */
export type BadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Badge showing async factory indicator.
 */
export interface AsyncBadge {
  readonly type: "async";
  readonly position: "top-right";
}

/**
 * Badge showing inheritance mode.
 */
export interface InheritanceModeBadge {
  readonly type: "inheritance-mode";
  readonly position: "top-left";
  /** Inheritance mode determines badge color and label */
  readonly mode: InheritanceMode;
}

/**
 * Badge indicating adapter overrides parent.
 */
export interface OverrideBadge {
  readonly type: "override";
  readonly position: "bottom-left";
  /** Name of container being overridden (for tooltip) */
  readonly overridesContainerName: string;
}

/**
 * Badge showing container count (aggregate multi-select view).
 */
export interface ContainerCountBadge {
  readonly type: "container-count";
  readonly position: "bottom-right";
  /** Number of containers providing this port */
  readonly count: number;
}

/**
 * Badge showing single container ownership (single-select view).
 */
export interface ContainerBadge {
  readonly type: "container";
  readonly position: "bottom-right";
  /** Container identifier */
  readonly containerId: ContainerId;
  /** Container display name */
  readonly containerName: string;
}

/**
 * Discriminated union of all badge types.
 *
 * Use `type` field for type-safe rendering:
 *
 * @example Exhaustive badge rendering
 * ```typescript
 * function renderBadge(badge: NodeBadge): ReactElement {
 *   switch (badge.type) {
 *     case "async":
 *       return <AsyncBadgeIcon />;
 *     case "inheritance-mode":
 *       return <InheritanceModeBadgeIcon mode={badge.mode} />;
 *     case "override":
 *       return <OverrideBadgeIcon />;
 *     case "container-count":
 *       return <CountBadge count={badge.count} />;
 *     case "container":
 *       return <ContainerNameBadge name={badge.containerName} />;
 *   }
 * }
 * ```
 */
export type NodeBadge =
  | AsyncBadge
  | InheritanceModeBadge
  | OverrideBadge
  | ContainerCountBadge
  | ContainerBadge;

// =============================================================================
// Badge Content per Container Types
// =============================================================================

/**
 * Badge content for a specific container's relationship to a port.
 *
 * Used in multi-container views where each container may have different
 * ownership relationships with the same port.
 */
export interface ContainerBadgeContent {
  /** Container this badge describes */
  readonly containerId: ContainerId;
  /** Container display name */
  readonly containerName: string;
  /** Ownership type for this container */
  readonly ownership: OwnershipState["ownership"];
  /** Badge color (computed from ownership) */
  readonly color: string;
  /** Short label for compact display */
  readonly shortLabel: string;
  /** Detailed label for tooltip */
  readonly detailedLabel: string;
}

/**
 * Collection of badge content for all containers related to a port.
 *
 * @example
 * ```typescript
 * const badgeContents: PortBadgeContents = {
 *   portId: "Logger",
 *   containers: [
 *     { containerId: "root", containerName: "Root", ownership: "owned", ... },
 *     { containerId: "child", containerName: "Child", ownership: "inherited", ... },
 *   ]
 * };
 * ```
 */
export interface PortBadgeContents {
  /** Port identifier */
  readonly portId: string;
  /** Badge content per container */
  readonly containers: readonly ContainerBadgeContent[];
}

// =============================================================================
// Aggregate Node Types (Multi-Container Selection)
// =============================================================================

/**
 * Ownership summary when multiple containers are selected.
 *
 * Aggregates ownership states across containers for unified display.
 */
export interface AggregateOwnershipSummary {
  /** Number of containers that own this port */
  readonly ownedCount: number;
  /** Number of containers that inherit this port */
  readonly inheritedCount: number;
  /** Number of containers that override this port */
  readonly overriddenCount: number;
  /** Total containers where this port exists */
  readonly totalCount: number;
}

/**
 * Visual priority for aggregate nodes.
 *
 * Determines which ownership state takes visual precedence when
 * multiple containers have different relationships to a port.
 *
 * Priority order: overridden > owned > inherited
 * (Show the most "active" relationship)
 */
export type AggregateVisualPriority = "owned" | "inherited" | "overridden";

/**
 * Aggregate node state for multi-container visualization.
 *
 * When multiple containers are selected, ports may have different
 * ownership relationships across containers. This type models the
 * aggregated state for unified visualization.
 *
 * @example Multi-container aggregate
 * ```typescript
 * const aggregateNode: AggregateNodeState = {
 *   portId: "Database",
 *   label: "Database",
 *   summary: { ownedCount: 1, inheritedCount: 2, overriddenCount: 1, totalCount: 4 },
 *   visualPriority: "overridden",
 *   containers: [
 *     { containerId: "root", ownership: "owned", ... },
 *     { containerId: "test", ownership: "overridden", ... },
 *     // ...
 *   ],
 *   primaryVisualStyle: { ... },
 *   badges: [{ type: "container-count", count: 4, position: "bottom-right" }]
 * };
 * ```
 */
export interface AggregateNodeState {
  /** Port identifier */
  readonly portId: string;
  /** Display label */
  readonly label: string;
  /** Aggregate ownership summary */
  readonly summary: AggregateOwnershipSummary;
  /** Which ownership type determines primary visual style */
  readonly visualPriority: AggregateVisualPriority;
  /** Per-container ownership details */
  readonly containers: readonly ContainerOwnershipDetail[];
  /** Primary visual style (based on visual priority) */
  readonly primaryVisualStyle: NodeVisualStyle;
  /** Badges for aggregate display */
  readonly badges: readonly NodeBadge[];
}

/**
 * Detailed ownership information for one container in an aggregate view.
 */
export interface ContainerOwnershipDetail {
  /** Container identifier */
  readonly containerId: ContainerId;
  /** Container display name */
  readonly containerName: string;
  /** Full ownership state for this container */
  readonly ownershipState: OwnershipState;
  /** Whether this container has the visual priority */
  readonly isPrimary: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for owned ownership state.
 */
export function isOwnedOwnership(state: OwnershipState): state is OwnedOwnershipState {
  return state.ownership === "owned";
}

/**
 * Type guard for inherited ownership state.
 */
export function isInheritedOwnership(state: OwnershipState): state is InheritedOwnershipState {
  return state.ownership === "inherited";
}

/**
 * Type guard for overridden ownership state.
 */
export function isOverriddenOwnership(state: OwnershipState): state is OverriddenOwnershipState {
  return state.ownership === "overridden";
}

/**
 * Type guard for async badge.
 */
export function isAsyncBadge(badge: NodeBadge): badge is AsyncBadge {
  return badge.type === "async";
}

/**
 * Type guard for inheritance mode badge.
 */
export function isInheritanceModeBadge(badge: NodeBadge): badge is InheritanceModeBadge {
  return badge.type === "inheritance-mode";
}

/**
 * Type guard for override badge.
 */
export function isOverrideBadge(badge: NodeBadge): badge is OverrideBadge {
  return badge.type === "override";
}

/**
 * Type guard for container count badge.
 */
export function isContainerCountBadge(badge: NodeBadge): badge is ContainerCountBadge {
  return badge.type === "container-count";
}

// =============================================================================
// Visual Style Constants
// =============================================================================

/**
 * CSS color values for ownership states.
 *
 * Uses the project's Catppuccin Mocha color palette for consistency
 * with existing DevTools styling.
 */
export const OWNERSHIP_COLORS = {
  /** Color for owned adapters - uses lifetime color */
  owned: {
    singleton: "#a6e3a1", // Green
    scoped: "#89b4fa", // Blue
    transient: "#fab387", // Peach
  },
  /** Color for inherited adapters - muted version */
  inherited: {
    shared: "#89b4fa", // Blue (shared with parent)
    forked: "#fab387", // Peach (forked copy)
    isolated: "#f38ba8", // Red (isolated instance)
  },
  /** Color for overridden adapters - accent color */
  overridden: "#cba6f7", // Mauve (indicates override)
} as const;

/**
 * Visual opacity values for ownership states.
 */
export const OWNERSHIP_OPACITY = {
  owned: 1.0,
  inherited: 0.85,
  overridden: 1.0,
} as const;

/**
 * Stroke configuration for ownership states.
 */
export const OWNERSHIP_STROKE = {
  owned: {
    dasharray: undefined,
    width: 2,
  },
  inherited: {
    dasharray: "4 2",
    width: 2,
  },
  overridden: {
    dasharray: undefined,
    width: 4, // Thicker to indicate override
  },
} as const;

/**
 * Badge appearance configuration per type.
 */
export const BADGE_CONFIG = {
  async: {
    color: "#cba6f7", // Mauve
    textColor: "#1e1e2e", // Dark background
    label: "A",
    tooltip: "Async Factory",
  },
  "inheritance-mode": {
    shared: {
      color: "#89b4fa",
      textColor: "#1e1e2e",
      label: "S",
      tooltip: "Shared (uses parent instance)",
    },
    forked: {
      color: "#fab387",
      textColor: "#1e1e2e",
      label: "F",
      tooltip: "Forked (snapshot copy)",
    },
    isolated: {
      color: "#f38ba8",
      textColor: "#1e1e2e",
      label: "I",
      tooltip: "Isolated (fresh instance)",
    },
  },
  override: {
    color: "#cba6f7",
    textColor: "#1e1e2e",
    label: "O",
    tooltip: "Overrides parent adapter",
  },
  "container-count": {
    color: "#6c7086", // Overlay0 (neutral)
    textColor: "#cdd6f4",
    tooltip: "Containers providing this port",
  },
  container: {
    color: "#45475a", // Surface0
    textColor: "#cdd6f4",
    tooltip: "Container name",
  },
} as const;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Maps ownership type to its full type.
 */
export interface OwnershipTypeMap {
  readonly owned: OwnedOwnershipState;
  readonly inherited: InheritedOwnershipState;
  readonly overridden: OverriddenOwnershipState;
}

/**
 * Extracts the ownership type literal from an OwnershipState.
 */
export type OwnershipType = OwnershipState["ownership"];

/**
 * Extracts the specific ownership type by discriminant.
 */
export type ExtractOwnershipState<T extends OwnershipType> = OwnershipTypeMap[T];

/**
 * Maps badge type to its full type.
 */
export interface BadgeTypeMap {
  readonly async: AsyncBadge;
  readonly "inheritance-mode": InheritanceModeBadge;
  readonly override: OverrideBadge;
  readonly "container-count": ContainerCountBadge;
  readonly container: ContainerBadge;
}

/**
 * Extracts the badge type literal from a NodeBadge.
 */
export type BadgeType = NodeBadge["type"];

/**
 * Extracts the specific badge type by discriminant.
 */
export type ExtractBadge<T extends BadgeType> = BadgeTypeMap[T];

/**
 * Validates that a badge position is valid for a badge type.
 *
 * @example Type-safe position validation
 * ```typescript
 * type ValidAsyncPosition = ValidBadgePosition<"async">;
 * // Result: "top-right" (only valid position for async badges)
 * ```
 */
export type ValidBadgePosition<T extends BadgeType> = BadgeTypeMap[T]["position"];

/**
 * Filters badges by position.
 *
 * @example Getting badges for a specific position
 * ```typescript
 * type TopLeftBadges = BadgesAtPosition<NodeBadge, "top-left">;
 * // Result: InheritanceModeBadge
 * ```
 */
export type BadgesAtPosition<B extends NodeBadge, P extends BadgePosition> = B extends {
  position: P;
}
  ? B
  : never;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an owned ownership state.
 *
 * @param lifetime - Service lifetime
 * @param factoryKind - Factory kind (sync/async)
 * @returns OwnedOwnershipState
 */
export function createOwnedOwnership(
  lifetime: Lifetime,
  factoryKind: FactoryKind
): OwnedOwnershipState {
  return {
    ownership: "owned",
    lifetime,
    factoryKind,
  };
}

/**
 * Creates an inherited ownership state.
 *
 * @param sourceContainerId - Container that owns the adapter
 * @param sourceContainerName - Display name of source container
 * @param inheritanceMode - How inheritance is handled
 * @returns InheritedOwnershipState
 */
export function createInheritedOwnership(
  sourceContainerId: ContainerId,
  sourceContainerName: string,
  inheritanceMode: InheritanceMode
): InheritedOwnershipState {
  return {
    ownership: "inherited",
    sourceContainerId,
    sourceContainerName,
    inheritanceMode,
  };
}

/**
 * Creates an overridden ownership state.
 *
 * @param lifetime - Service lifetime of override
 * @param factoryKind - Factory kind of override
 * @param overridesContainerId - Container being overridden
 * @param overridesContainerName - Display name of overridden container
 * @returns OverriddenOwnershipState
 */
export function createOverriddenOwnership(
  lifetime: Lifetime,
  factoryKind: FactoryKind,
  overridesContainerId: ContainerId,
  overridesContainerName: string
): OverriddenOwnershipState {
  return {
    ownership: "overridden",
    lifetime,
    factoryKind,
    overridesContainerId,
    overridesContainerName,
  };
}

/**
 * Creates an async badge.
 *
 * @returns AsyncBadge
 */
export function createAsyncBadge(): AsyncBadge {
  return {
    type: "async",
    position: "top-right",
  };
}

/**
 * Creates an inheritance mode badge.
 *
 * @param mode - Inheritance mode
 * @returns InheritanceModeBadge
 */
export function createInheritanceModeBadge(mode: InheritanceMode): InheritanceModeBadge {
  return {
    type: "inheritance-mode",
    position: "top-left",
    mode,
  };
}

/**
 * Creates an override badge.
 *
 * @param overridesContainerName - Name of container being overridden
 * @returns OverrideBadge
 */
export function createOverrideBadge(overridesContainerName: string): OverrideBadge {
  return {
    type: "override",
    position: "bottom-left",
    overridesContainerName,
  };
}

/**
 * Creates a container count badge.
 *
 * @param count - Number of containers
 * @returns ContainerCountBadge
 */
export function createContainerCountBadge(count: number): ContainerCountBadge {
  return {
    type: "container-count",
    position: "bottom-right",
    count,
  };
}

/**
 * Creates a container badge.
 *
 * @param containerId - Container identifier
 * @param containerName - Container display name
 * @returns ContainerBadge
 */
export function createContainerBadge(
  containerId: ContainerId,
  containerName: string
): ContainerBadge {
  return {
    type: "container",
    position: "bottom-right",
    containerId,
    containerName,
  };
}

/**
 * Computes aggregate ownership summary from container details.
 *
 * @param containers - Array of container ownership details
 * @returns AggregateOwnershipSummary
 */
export function computeAggregateSummary(
  containers: readonly ContainerOwnershipDetail[]
): AggregateOwnershipSummary {
  let ownedCount = 0;
  let inheritedCount = 0;
  let overriddenCount = 0;

  for (const container of containers) {
    switch (container.ownershipState.ownership) {
      case "owned":
        ownedCount++;
        break;
      case "inherited":
        inheritedCount++;
        break;
      case "overridden":
        overriddenCount++;
        break;
    }
  }

  return {
    ownedCount,
    inheritedCount,
    overriddenCount,
    totalCount: containers.length,
  };
}

/**
 * Determines visual priority for aggregate node.
 *
 * Priority: overridden > owned > inherited
 *
 * @param summary - Aggregate ownership summary
 * @returns AggregateVisualPriority
 */
export function determineVisualPriority(
  summary: AggregateOwnershipSummary
): AggregateVisualPriority {
  if (summary.overriddenCount > 0) return "overridden";
  if (summary.ownedCount > 0) return "owned";
  return "inherited";
}
