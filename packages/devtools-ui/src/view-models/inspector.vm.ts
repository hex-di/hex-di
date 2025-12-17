/**
 * InspectorViewModel - Immutable view data for service and scope inspection.
 *
 * Contains detailed information about a selected service or scope,
 * including dependencies, dependents, and resolution history.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/devtools-core";

// =============================================================================
// Service Info
// =============================================================================

/**
 * Detailed service information for inspection.
 */
export interface ServiceInfoViewModel {
  /** Port name */
  readonly portName: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Factory type */
  readonly factoryKind: "sync" | "async";
  /** Whether the service has been resolved */
  readonly isResolved: boolean;
  /** Resolution count */
  readonly resolutionCount: number;
  /** Average resolution duration */
  readonly avgDurationMs: number;
  /** Formatted average duration */
  readonly avgDurationFormatted: string;
  /** Cache hit count */
  readonly cacheHitCount: number;
  /** Cache hit rate percentage */
  readonly cacheHitRate: number;
  /** Last resolved timestamp (formatted) */
  readonly lastResolved: string | null;
  /** Total resolution duration */
  readonly totalDurationMs: number;
}

/**
 * A dependency relationship.
 */
export interface DependencyViewModel {
  /** Port name of the dependency */
  readonly portName: string;
  /** Lifetime of the dependency */
  readonly lifetime: Lifetime;
  /** Whether this is a direct or transitive dependency */
  readonly isDirect: boolean;
  /** Depth in dependency tree (0 = direct) */
  readonly depth: number;
}

// =============================================================================
// Scope Info
// =============================================================================

/**
 * Scope information for inspection.
 */
export interface ScopeInfoViewModel {
  /** Scope identifier */
  readonly id: string;
  /** Display name for the scope */
  readonly name: string;
  /** Parent scope ID, if any */
  readonly parentId: string | null;
  /** Child scope IDs */
  readonly childIds: readonly string[];
  /** Number of services resolved in this scope */
  readonly resolvedCount: number;
  /** When the scope was created (formatted) */
  readonly createdAt: string;
  /** Whether the scope is active */
  readonly isActive: boolean;
  /** Whether this scope is selected */
  readonly isSelected: boolean;
  /** Whether this scope is expanded in tree view */
  readonly isExpanded: boolean;
  /** Depth in scope hierarchy (0 = root) */
  readonly depth: number;
}

// =============================================================================
// Inspector View Model
// =============================================================================

/**
 * What type of entity is being inspected.
 */
export type InspectorTarget = "none" | "service" | "scope";

/**
 * Complete view model for the inspector panel.
 */
export interface InspectorViewModel {
  /** What is being inspected */
  readonly target: InspectorTarget;
  /** Selected service info (when target is 'service') */
  readonly service: ServiceInfoViewModel | null;
  /** Direct dependencies of selected service */
  readonly dependencies: readonly DependencyViewModel[];
  /** Services that depend on the selected service */
  readonly dependents: readonly DependencyViewModel[];
  /** Selected scope info (when target is 'scope') */
  readonly scope: ScopeInfoViewModel | null;
  /** Services resolved in the selected scope */
  readonly scopeServices: readonly ServiceInfoViewModel[];
  /** Scope hierarchy (all scopes) */
  readonly scopeTree: readonly ScopeInfoViewModel[];
  /** Search/filter text */
  readonly filterText: string;
  /** Whether dependencies are expanded */
  readonly showDependencies: boolean;
  /** Whether dependents are expanded */
  readonly showDependents: boolean;
  /** Whether the inspector has data */
  readonly hasData: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty InspectorViewModel.
 */
export function createEmptyInspectorViewModel(): InspectorViewModel {
  return Object.freeze({
    target: "none" as const,
    service: null,
    dependencies: Object.freeze([]),
    dependents: Object.freeze([]),
    scope: null,
    scopeServices: Object.freeze([]),
    scopeTree: Object.freeze([]),
    filterText: "",
    showDependencies: true,
    showDependents: true,
    hasData: false,
  });
}
