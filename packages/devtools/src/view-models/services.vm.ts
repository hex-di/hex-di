/**
 * ServicesViewModel - Immutable view data for Services Tab.
 *
 * Contains all data needed to render the Services Tab including service list,
 * sorting, filtering, container grouping, and captive dependency warnings.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/devtools-core";
import type { AsyncFactoryStatus } from "./inspector.vm.js";
import type { ContainerPhase } from "./container-hierarchy.vm.js";

// =============================================================================
// Service Row View Model
// =============================================================================

/**
 * A single service row in the services table.
 */
export interface ServiceRowViewModel {
  /** Port name of the service */
  readonly portName: string;
  /** Service lifetime (singleton, scoped, transient) */
  readonly lifetime: Lifetime;
  /** Factory type (sync or async) */
  readonly factoryKind: "sync" | "async";
  /** Number of times this service has been resolved */
  readonly resolutionCount: number;
  /** Number of cache hits */
  readonly cacheHitCount: number;
  /** Cache hit rate (0-1) */
  readonly cacheHitRate: number;
  /** Average resolution duration in ms */
  readonly avgDurationMs: number;
  /** Formatted average duration */
  readonly avgDurationFormatted: string;
  /** Number of dependencies (out edges) */
  readonly dependencyCount: number;
  /** Number of dependents (in edges) */
  readonly dependentCount: number;
  /** Container ID this service belongs to */
  readonly containerId: string;
  /** Container name */
  readonly containerName: string;
  /** Whether this is an async factory */
  readonly isAsync: boolean;
  /** Async factory status (null for sync factories) */
  readonly asyncStatus: AsyncFactoryStatus;
  /** Whether this service has a captive dependency warning */
  readonly hasCaptiveWarning: boolean;
  /** Captive warning message, if any */
  readonly captiveWarningMessage: string | null;
}

// =============================================================================
// Container Group View Model
// =============================================================================

/**
 * A container group in the services list.
 */
export interface ContainerGroupViewModel {
  /** Container identifier */
  readonly containerId: string;
  /** Display name for the container */
  readonly containerName: string;
  /** Current lifecycle phase */
  readonly containerPhase: ContainerPhase;
  /** Number of services in this container */
  readonly serviceCount: number;
  /** Whether this group is expanded */
  readonly isExpanded: boolean;
}

// =============================================================================
// Sort Types
// =============================================================================

/**
 * Sortable columns in the services table.
 */
export type ServicesSortColumn = "name" | "lifetime" | "count" | "duration" | "cacheHit" | "dependencies";

/**
 * Sort direction.
 */
export type SortDirection = "asc" | "desc";

// =============================================================================
// Services View Model
// =============================================================================

/**
 * Complete view model for the Services Tab.
 */
export interface ServicesViewModel {
  /** All services to display */
  readonly services: readonly ServiceRowViewModel[];
  /** Container groups for hierarchical display */
  readonly containerGroups: readonly ContainerGroupViewModel[];
  /** Total number of services */
  readonly totalServiceCount: number;
  /** Currently sorted column */
  readonly sortColumn: ServicesSortColumn;
  /** Sort direction */
  readonly sortDirection: SortDirection;
  /** Current filter/search text */
  readonly filterText: string;
  /** Whether to show only services with captive warnings */
  readonly showOnlyCaptive: boolean;
  /** Whether to show only async services */
  readonly showOnlyAsync: boolean;
  /** Whether the view is empty */
  readonly isEmpty: boolean;
  /** Number of services matching current filters */
  readonly filteredCount: number;
  /** Whether there are any captive warnings */
  readonly hasCaptiveWarnings: boolean;
  /** Whether there are any async services */
  readonly hasAsyncServices: boolean;
  /** Whether there are multiple containers */
  readonly hasMultipleContainers: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty ServicesViewModel.
 */
export function createEmptyServicesViewModel(): ServicesViewModel {
  return Object.freeze({
    services: Object.freeze([]),
    containerGroups: Object.freeze([]),
    totalServiceCount: 0,
    sortColumn: "name" as const,
    sortDirection: "asc" as const,
    filterText: "",
    showOnlyCaptive: false,
    showOnlyAsync: false,
    isEmpty: true,
    filteredCount: 0,
    hasCaptiveWarnings: false,
    hasAsyncServices: false,
    hasMultipleContainers: false,
  });
}

// =============================================================================
// Factory Input Types
// =============================================================================

/**
 * Input for creating a ServicesViewModel.
 */
export interface ServicesViewModelInput {
  /** All services */
  readonly services: readonly ServiceRowViewModel[];
  /** Container groups */
  readonly containerGroups: readonly ContainerGroupViewModel[];
  /** Current sort column */
  readonly sortColumn: ServicesSortColumn;
  /** Current sort direction */
  readonly sortDirection: SortDirection;
  /** Current filter text */
  readonly filterText: string;
  /** Whether to show only captive services */
  readonly showOnlyCaptive: boolean;
  /** Whether to show only async services */
  readonly showOnlyAsync: boolean;
}

/**
 * Creates a ServicesViewModel from input data.
 *
 * @param input - The input data for creating the view model
 * @returns An immutable ServicesViewModel
 */
export function createServicesViewModel(
  input: ServicesViewModelInput
): ServicesViewModel {
  const {
    services,
    containerGroups,
    sortColumn,
    sortDirection,
    filterText,
    showOnlyCaptive,
    showOnlyAsync,
  } = input;

  if (services.length === 0) {
    return createEmptyServicesViewModel();
  }

  // Check for captive warnings
  const hasCaptiveWarnings = services.some((s) => s.hasCaptiveWarning);

  // Check for async services
  const hasAsyncServices = services.some((s) => s.isAsync);

  // Check for multiple containers
  const hasMultipleContainers = containerGroups.length > 1;

  // Freeze all services
  const frozenServices = Object.freeze(services.map((s) => Object.freeze(s)));

  // Freeze all container groups
  const frozenContainerGroups = Object.freeze(
    containerGroups.map((g) => Object.freeze(g))
  );

  return Object.freeze({
    services: frozenServices,
    containerGroups: frozenContainerGroups,
    totalServiceCount: services.length,
    sortColumn,
    sortDirection,
    filterText,
    showOnlyCaptive,
    showOnlyAsync,
    isEmpty: false,
    filteredCount: services.length,
    hasCaptiveWarnings,
    hasAsyncServices,
    hasMultipleContainers,
  });
}
