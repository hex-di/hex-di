/**
 * Unified Graph Types for Multi-Container Visualization
 *
 * These types model a unified view of ports across multiple containers,
 * enabling visualization of how adapters are owned, inherited, or overridden
 * across the container hierarchy.
 *
 * Key concepts:
 * - **Port**: A service interface that can be provided by adapters in multiple containers
 * - **Adapter Ownership**: How a container relates to a port (owned, inherited, overridden)
 * - **Unified Graph**: A single graph showing all ports with their container relationships
 *
 * @packageDocumentation
 */

import type { FactoryKind } from "../types.js";
import type { Lifetime, InheritanceMode } from "@hex-di/core";

// =============================================================================
// Container Identity
// =============================================================================

/**
 * Unique identifier for a container in the unified graph.
 *
 * Uses a branded type to prevent accidental string misuse.
 */
export type ContainerId = string & { readonly __brand: "ContainerId" };

/**
 * Creates a ContainerId from a string.
 *
 * @param id - The container identifier string
 * @returns Branded ContainerId
 */
export function containerId(id: string): ContainerId {
  return id as ContainerId;
}

/**
 * Metadata about a container participating in the unified graph.
 */
export interface ContainerInfo {
  /** Unique container identifier */
  readonly id: ContainerId;
  /** Human-readable display name */
  readonly name: string;
  /** Container kind (root, child, lazy, scope) */
  readonly kind: "root" | "child" | "lazy" | "scope";
  /** Parent container ID, null for root containers */
  readonly parentId: ContainerId | null;
  /** Depth in the container hierarchy (0 for root) */
  readonly depth: number;
}

// =============================================================================
// Adapter Ownership (Discriminated Union)
// =============================================================================

/**
 * Base fields shared by all adapter ownership variants.
 */
interface AdapterOwnershipBase {
  /** The container that this ownership describes */
  readonly containerId: ContainerId;
  /** Human-readable container name for display */
  readonly containerName: string;
}

/**
 * Adapter is directly owned by this container.
 *
 * The container defines its own adapter factory for this port.
 * This is the "original" registration.
 */
export interface OwnedAdapter extends AdapterOwnershipBase {
  readonly ownership: "owned";
  /** Service lifetime for the owned adapter */
  readonly lifetime: Lifetime;
  /** Factory kind (sync or async) */
  readonly factoryKind: FactoryKind;
}

/**
 * Adapter is inherited from a parent container.
 *
 * The container does not define its own adapter; it inherits from
 * an ancestor. The inheritance mode determines how instances are shared.
 */
export interface InheritedAdapter extends AdapterOwnershipBase {
  readonly ownership: "inherited";
  /** Container ID where the adapter is originally defined */
  readonly sourceContainerId: ContainerId;
  /** Name of the source container for display */
  readonly sourceContainerName: string;
  /** How the inherited instance is handled */
  readonly inheritanceMode: InheritanceMode;
}

/**
 * Adapter overrides a parent container's adapter.
 *
 * The container defines its own adapter for a port that already
 * has an adapter in an ancestor container.
 */
export interface OverriddenAdapter extends AdapterOwnershipBase {
  readonly ownership: "overridden";
  /** Service lifetime for the overriding adapter */
  readonly lifetime: Lifetime;
  /** Factory kind (sync or async) */
  readonly factoryKind: FactoryKind;
  /** Container ID of the adapter being overridden */
  readonly overridesContainerId: ContainerId;
  /** Name of the container being overridden for display */
  readonly overridesContainerName: string;
}

/**
 * Discriminated union representing how a container relates to a port's adapter.
 *
 * Use the `ownership` field for type-safe narrowing:
 *
 * @example Type-safe ownership handling
 * ```typescript
 * function describeOwnership(ownership: AdapterOwnership): string {
 *   switch (ownership.ownership) {
 *     case "owned":
 *       return `Defined in ${ownership.containerName}`;
 *     case "inherited":
 *       return `Inherited from ${ownership.sourceContainerName} (${ownership.inheritanceMode})`;
 *     case "overridden":
 *       return `Overrides ${ownership.overridesContainerName}`;
 *   }
 * }
 * ```
 */
export type AdapterOwnership = OwnedAdapter | InheritedAdapter | OverriddenAdapter;

// =============================================================================
// Unified Graph Node
// =============================================================================

/**
 * Unique identifier for a port in the unified graph.
 *
 * Uses a branded type to prevent accidental string misuse.
 */
export type PortId = string & { readonly __brand: "PortId" };

/**
 * Creates a PortId from a string.
 *
 * @param id - The port identifier string (typically port name)
 * @returns Branded PortId
 */
export function portId(id: string): PortId {
  return id as PortId;
}

/**
 * A port node in the unified multi-container graph.
 *
 * Represents a single port/service interface that may be provided by
 * adapters in multiple containers. Tracks which containers provide this
 * port and their ownership relationships.
 *
 * @example Single container (owned)
 * ```typescript
 * const loggerNode: UnifiedGraphNode = {
 *   id: portId("Logger"),
 *   label: "Logger",
 *   containers: [{
 *     ownership: "owned",
 *     containerId: containerId("root"),
 *     containerName: "Root",
 *     lifetime: "singleton",
 *     factoryKind: "sync"
 *   }]
 * };
 * ```
 *
 * @example Multi-container with override
 * ```typescript
 * const dbNode: UnifiedGraphNode = {
 *   id: portId("Database"),
 *   label: "Database",
 *   containers: [
 *     {
 *       ownership: "owned",
 *       containerId: containerId("root"),
 *       containerName: "Root",
 *       lifetime: "singleton",
 *       factoryKind: "async"
 *     },
 *     {
 *       ownership: "overridden",
 *       containerId: containerId("test"),
 *       containerName: "TestContainer",
 *       lifetime: "transient",
 *       factoryKind: "sync",
 *       overridesContainerId: containerId("root"),
 *       overridesContainerName: "Root"
 *     }
 *   ]
 * };
 * ```
 */
export interface UnifiedGraphNode {
  /** Unique port identifier */
  readonly id: PortId;
  /** Display label (typically port name or alias) */
  readonly label: string;
  /**
   * Containers providing adapters for this port.
   *
   * Each entry describes how a specific container relates to this port.
   * The array contains one entry per container that either owns, inherits,
   * or overrides an adapter for this port.
   *
   * Ordering: Owned adapters first, then overrides in hierarchy order,
   * then inherited in hierarchy order.
   */
  readonly containers: readonly AdapterOwnership[];
}

// =============================================================================
// Unified Graph Edge
// =============================================================================

/**
 * A dependency edge in the unified graph.
 *
 * Represents a dependency relationship between two ports.
 * The edge indicates that adapters for `from` port require the `to` port.
 *
 * For multi-container graphs, an edge may exist in multiple containers
 * with different characteristics.
 */
export interface UnifiedGraphEdge {
  /** Source port (the dependent) */
  readonly from: PortId;
  /** Target port (the dependency) */
  readonly to: PortId;
  /**
   * Containers where this dependency exists.
   *
   * A dependency can exist in multiple containers, potentially with
   * different ownership patterns. This allows visualizing which
   * containers actually use this dependency.
   */
  readonly containerIds: readonly ContainerId[];
}

// =============================================================================
// Unified Graph Structure
// =============================================================================

/**
 * Complete unified graph for multi-container visualization.
 *
 * Combines ports from multiple containers into a single graph view,
 * showing ownership relationships and cross-container dependencies.
 *
 * @example Basic usage
 * ```typescript
 * const graph: UnifiedGraph = {
 *   nodes: [loggerNode, dbNode, userServiceNode],
 *   edges: [
 *     { from: portId("UserService"), to: portId("Logger"), containerIds: [rootId] },
 *     { from: portId("UserService"), to: portId("Database"), containerIds: [rootId, testId] }
 *   ],
 *   containers: [rootContainer, testContainer],
 *   selectedContainerIds: [rootId, testId]
 * };
 * ```
 */
export interface UnifiedGraph {
  /** All port nodes in the unified view */
  readonly nodes: readonly UnifiedGraphNode[];
  /** All dependency edges in the unified view */
  readonly edges: readonly UnifiedGraphEdge[];
  /** Metadata about participating containers */
  readonly containers: readonly ContainerInfo[];
  /** IDs of containers currently included in this view */
  readonly selectedContainerIds: readonly ContainerId[];
}

// =============================================================================
// View Configuration
// =============================================================================

/**
 * Filter options for the unified graph view.
 */
export interface UnifiedGraphFilter {
  /** Show only ports present in these containers (empty = show all) */
  readonly containerIds?: readonly ContainerId[];
  /** Show only ports with these lifetimes */
  readonly lifetimes?: readonly Lifetime[];
  /** Show only owned adapters (hide inherited) */
  readonly ownedOnly?: boolean;
  /** Show only ports with overrides */
  readonly overriddenOnly?: boolean;
  /** Port name filter (case-insensitive partial match) */
  readonly portNameFilter?: string;
}

/**
 * Options for unified graph construction.
 */
export interface UnifiedGraphOptions {
  /** Containers to include in the unified view */
  readonly containerIds: readonly ContainerId[];
  /** Whether to include inherited adapters in child containers */
  readonly showInherited?: boolean;
  /** Filter to apply to the resulting graph */
  readonly filter?: UnifiedGraphFilter;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if adapter ownership is "owned".
 */
export function isOwnedAdapter(ownership: AdapterOwnership): ownership is OwnedAdapter {
  return ownership.ownership === "owned";
}

/**
 * Type guard to check if adapter ownership is "inherited".
 */
export function isInheritedAdapter(ownership: AdapterOwnership): ownership is InheritedAdapter {
  return ownership.ownership === "inherited";
}

/**
 * Type guard to check if adapter ownership is "overridden".
 */
export function isOverriddenAdapter(ownership: AdapterOwnership): ownership is OverriddenAdapter {
  return ownership.ownership === "overridden";
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extracts the ownership type from an AdapterOwnership.
 */
export type OwnershipType = AdapterOwnership["ownership"];

/**
 * Maps ownership types to their full types.
 */
export interface OwnershipTypeMap {
  readonly owned: OwnedAdapter;
  readonly inherited: InheritedAdapter;
  readonly overridden: OverriddenAdapter;
}

/**
 * Extracts the specific ownership type by discriminant.
 */
export type ExtractOwnership<T extends OwnershipType> = OwnershipTypeMap[T];

/**
 * Port IDs present in a given container.
 */
export type ContainerPorts<G extends UnifiedGraph, C extends ContainerId> = {
  readonly [K in keyof G["nodes"]]: G["nodes"][K] extends UnifiedGraphNode
    ? G["nodes"][K]["containers"][number]["containerId"] extends C
      ? G["nodes"][K]["id"]
      : never
    : never;
}[keyof G["nodes"]];

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty unified graph with the specified containers.
 *
 * @param containers - Container metadata for the graph
 * @param selectedIds - IDs of containers to include in the view
 * @returns Empty unified graph structure
 */
export function createEmptyUnifiedGraph(
  containers: readonly ContainerInfo[],
  selectedIds: readonly ContainerId[]
): UnifiedGraph {
  return {
    nodes: [],
    edges: [],
    containers,
    selectedContainerIds: selectedIds,
  };
}

/**
 * Creates an OwnedAdapter ownership entry.
 *
 * @param containerId - Container that owns the adapter
 * @param containerName - Display name for the container
 * @param lifetime - Service lifetime
 * @param factoryKind - Factory kind (sync/async)
 * @returns OwnedAdapter ownership entry
 */
export function createOwnedAdapter(
  id: ContainerId,
  containerName: string,
  lifetime: Lifetime,
  factoryKind: FactoryKind
): OwnedAdapter {
  return {
    ownership: "owned",
    containerId: id,
    containerName,
    lifetime,
    factoryKind,
  };
}

/**
 * Creates an InheritedAdapter ownership entry.
 *
 * @param containerId - Container that inherits the adapter
 * @param containerName - Display name for the inheriting container
 * @param sourceContainerId - Container where adapter is defined
 * @param sourceContainerName - Display name for source container
 * @param inheritanceMode - How inheritance is handled
 * @returns InheritedAdapter ownership entry
 */
export function createInheritedAdapter(
  id: ContainerId,
  containerName: string,
  sourceContainerId: ContainerId,
  sourceContainerName: string,
  inheritanceMode: InheritanceMode
): InheritedAdapter {
  return {
    ownership: "inherited",
    containerId: id,
    containerName,
    sourceContainerId,
    sourceContainerName,
    inheritanceMode,
  };
}

/**
 * Creates an OverriddenAdapter ownership entry.
 *
 * @param containerId - Container that overrides the adapter
 * @param containerName - Display name for the overriding container
 * @param lifetime - Service lifetime for override
 * @param factoryKind - Factory kind for override
 * @param overridesContainerId - Container being overridden
 * @param overridesContainerName - Display name for overridden container
 * @returns OverriddenAdapter ownership entry
 */
export function createOverriddenAdapter(
  id: ContainerId,
  containerName: string,
  lifetime: Lifetime,
  factoryKind: FactoryKind,
  overridesContainerId: ContainerId,
  overridesContainerName: string
): OverriddenAdapter {
  return {
    ownership: "overridden",
    containerId: id,
    containerName,
    lifetime,
    factoryKind,
    overridesContainerId,
    overridesContainerName,
  };
}

// =============================================================================
// Query Utilities
// =============================================================================

/**
 * Gets all container IDs that own or override a port (not inherited).
 *
 * @param node - The unified graph node
 * @returns Array of container IDs that define adapters for this port
 */
export function getDefiningContainers(node: UnifiedGraphNode): readonly ContainerId[] {
  return node.containers
    .filter((c): c is OwnedAdapter | OverriddenAdapter => c.ownership !== "inherited")
    .map(c => c.containerId);
}

/**
 * Gets the primary ownership for a node (first owned, or first override).
 *
 * Used when displaying a single "canonical" ownership for the port.
 *
 * @param node - The unified graph node
 * @returns Primary adapter ownership, or undefined if no containers
 */
export function getPrimaryOwnership(node: UnifiedGraphNode): AdapterOwnership | undefined {
  // Prefer owned, then overridden, then inherited
  return (
    node.containers.find(isOwnedAdapter) ??
    node.containers.find(isOverriddenAdapter) ??
    node.containers[0]
  );
}

/**
 * Checks if a port has any overrides in the unified view.
 *
 * @param node - The unified graph node
 * @returns true if any container overrides this port's adapter
 */
export function hasOverrides(node: UnifiedGraphNode): boolean {
  return node.containers.some(isOverriddenAdapter);
}

/**
 * Gets the canonical lifetime for a port across containers.
 *
 * Returns the lifetime from the primary (owned/overridden) adapter.
 * Falls back to the first container's inheritance source if all inherited.
 *
 * @param node - The unified graph node
 * @returns The canonical lifetime, or undefined if no adapters
 */
export function getCanonicalLifetime(node: UnifiedGraphNode): Lifetime | undefined {
  const primary = getPrimaryOwnership(node);
  if (!primary) return undefined;

  if (primary.ownership === "inherited") {
    // For inherited-only nodes, we don't have direct lifetime info
    // The consumer should look up the source container's adapter
    return undefined;
  }

  return primary.lifetime;
}
