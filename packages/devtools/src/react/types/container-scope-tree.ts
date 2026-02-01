/**
 * Unified tree types for container/scope hierarchy.
 *
 * These types enable rendering both containers and scopes in a single
 * hierarchical tree view. Uses discriminated union pattern with `kind`
 * field for type-safe rendering.
 *
 * @packageDocumentation
 */

import type { ContainerKind } from "@hex-di/core";

// =============================================================================
// Discriminated Union Types
// =============================================================================

/**
 * Discriminated union for nodes in the unified container/scope hierarchy.
 *
 * Use the `kind` field to discriminate between container and scope nodes:
 *
 * @example Type-safe rendering
 * ```typescript
 * function renderNode(node: ContainerScopeTreeNode) {
 *   switch (node.kind) {
 *     case "container":
 *       return <ContainerNode label={node.label} />;
 *     case "scope":
 *       return <ScopeNode id={node.id} />;
 *   }
 * }
 * ```
 */
export type ContainerScopeTreeNode = ContainerNode | ScopeNode;

/**
 * Container node in the unified hierarchy tree.
 *
 * Represents a DI container (root, child, lazy, or scope container).
 * Children can include both child containers AND direct scopes.
 */
export interface ContainerNode {
  /** Discriminant field - always "container" */
  readonly kind: "container";

  /** Unique identifier matching the container registry ID */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /** Container type (root, child, lazy, scope) */
  readonly containerKind: ContainerKind;

  /** Container lifecycle status */
  readonly status: "active" | "disposed";

  /** Number of resolved singleton services */
  readonly resolvedCount: number;

  /** Total number of services (adapters) */
  readonly totalCount: number;

  /** Names of resolved ports */
  readonly resolvedPorts: readonly string[];

  /** Child nodes - both child containers AND direct scopes */
  readonly children: readonly ContainerScopeTreeNode[];
}

/**
 * Scope node in the unified hierarchy tree.
 *
 * Represents a scope created within a container via `createScope()`.
 * Children can only be other scopes (nested scopes).
 */
export interface ScopeNode {
  /** Discriminant field - always "scope" */
  readonly kind: "scope";

  /** Unique scope identifier (e.g., "alice-session", "scope-1") */
  readonly id: string;

  /** Scope lifecycle status */
  readonly status: "active" | "disposed";

  /** Number of resolved scoped services in this scope */
  readonly resolvedCount: number;

  /** Total number of scoped services available */
  readonly totalCount: number;

  /** Names of resolved ports in this scope */
  readonly resolvedPorts: readonly string[];

  /** Child scopes (nested scopes only) */
  readonly children: readonly ScopeNode[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a node is a container node.
 *
 * @param node - The node to check
 * @returns true if node is a ContainerNode
 */
export function isContainerNode(node: ContainerScopeTreeNode): node is ContainerNode {
  return node.kind === "container";
}

/**
 * Type guard to check if a node is a scope node.
 *
 * @param node - The node to check
 * @returns true if node is a ScopeNode
 */
export function isScopeNode(node: ContainerScopeTreeNode): node is ScopeNode {
  return node.kind === "scope";
}
