/**
 * ContainerHierarchyViewModel - Immutable view data for container hierarchy.
 *
 * Contains tree structure of parent/child containers with phase information
 * for visualizing container relationships.
 *
 * @packageDocumentation
 */

// =============================================================================
// Container Phase Type
// =============================================================================

/**
 * Phase of a container's lifecycle.
 */
export type ContainerPhase = "initializing" | "ready" | "disposing" | "disposed";

// =============================================================================
// Container Node Types
// =============================================================================

/**
 * A node in the container hierarchy tree.
 */
export interface ContainerNode {
  /** Container identifier */
  readonly id: string;
  /** Display name for the container */
  readonly name: string;
  /** Parent container ID, if any */
  readonly parentId: string | null;
  /** Child container IDs */
  readonly childIds: readonly string[];
  /** Current lifecycle phase */
  readonly phase?: ContainerPhase;
  /** Number of services registered */
  readonly serviceCount: number;
  /** Number of resolved singletons */
  readonly singletonCount?: number;
  /** Depth in hierarchy (0 = root) */
  readonly depth: number;
  /** Whether this container is selected/active */
  readonly isActive: boolean;
  /** Whether this container is expanded in tree view */
  readonly isExpanded: boolean;
}

// =============================================================================
// Container Hierarchy View Model
// =============================================================================

/**
 * Complete view model for container hierarchy visualization.
 */
export interface ContainerHierarchyViewModel {
  /** All containers in the hierarchy */
  readonly containers: readonly ContainerNode[];
  /** Currently active/selected container ID */
  readonly activeContainerId: string;
  /** Map of container IDs to their phases */
  readonly containerPhases: ReadonlyMap<string, ContainerPhase>;
  /** Root container ID */
  readonly rootContainerId: string | null;
  /** Total container count */
  readonly containerCount: number;
  /** Whether the hierarchy has data */
  readonly hasData: boolean;
  /** Whether the hierarchy is empty (no containers) */
  readonly isEmpty: boolean;
  /** Maximum depth in the container tree */
  readonly maxDepth: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty ContainerHierarchyViewModel.
 */
export function createEmptyContainerHierarchyViewModel(): ContainerHierarchyViewModel {
  return Object.freeze({
    containers: Object.freeze([]),
    activeContainerId: "",
    containerPhases: new Map(),
    rootContainerId: null,
    containerCount: 0,
    hasData: false,
    isEmpty: true,
    maxDepth: 0,
  });
}

// =============================================================================
// Factory Input Types
// =============================================================================

/**
 * Input for creating a ContainerHierarchyViewModel.
 */
export interface ContainerHierarchyViewModelInput {
  /** All containers in the hierarchy */
  readonly containers: readonly ContainerNode[];
  /** Currently active/selected container ID */
  readonly activeContainerId: string;
  /** Map of container IDs to their phases */
  readonly containerPhases: ReadonlyMap<string, ContainerPhase>;
}

/**
 * Creates a ContainerHierarchyViewModel from input data.
 *
 * @param input - The input data for creating the view model
 * @returns An immutable ContainerHierarchyViewModel
 */
export function createContainerHierarchyViewModel(
  input: ContainerHierarchyViewModelInput
): ContainerHierarchyViewModel {
  const { containers, activeContainerId, containerPhases } = input;

  if (containers.length === 0) {
    return createEmptyContainerHierarchyViewModel();
  }

  // Calculate max depth
  const maxDepth = containers.reduce((max, c) => Math.max(max, c.depth), 0);

  // Find root container
  const rootContainer = containers.find((c) => c.parentId === null);
  const rootContainerId = rootContainer?.id ?? null;

  // Freeze all containers
  const frozenContainers = Object.freeze(
    containers.map((c) =>
      Object.freeze({
        ...c,
        childIds: Object.freeze([...c.childIds]),
      })
    )
  );

  return Object.freeze({
    containers: frozenContainers,
    activeContainerId,
    containerPhases,
    rootContainerId,
    containerCount: containers.length,
    hasData: true,
    isEmpty: false,
    maxDepth,
  });
}
