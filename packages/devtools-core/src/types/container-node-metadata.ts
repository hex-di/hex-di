/**
 * Container Node Metadata Types for Tree View Display
 *
 * These types model metadata for container nodes in a hierarchical tree view.
 * They support:
 * - Clear required vs optional field separation
 * - Incremental async loading with type-safe loading states
 * - Discriminated unions for different container lifecycle states
 *
 * @packageDocumentation
 */

import type { ContainerKind, InheritanceMode } from "@hex-di/plugin";

// =============================================================================
// Core Metadata Types
// =============================================================================

/**
 * Scope type for containers in the hierarchy.
 *
 * - `root`: Top-level container created via `createContainer()`
 * - `child`: Child container created via `createChild()`
 * - `lazy`: Lazy-loaded child created via `createLazyChild()`
 * - `scope`: Scope created via `createScope()`
 */
export type ScopeType = ContainerKind;

/**
 * Disposed state for container lifecycle.
 *
 * - `active`: Container is operational
 * - `disposing`: Container is in disposal process
 * - `disposed`: Container has been fully disposed
 */
export type DisposedState = "active" | "disposing" | "disposed";

// =============================================================================
// Required Metadata (Always Available)
// =============================================================================

/**
 * Required metadata fields that are always available for a container node.
 *
 * These fields are available immediately when a container is discovered,
 * before any async data loading occurs.
 */
export interface ContainerNodeRequiredMetadata {
  /** Unique identifier for the container */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Container scope type (root, child, lazy, scope) */
  readonly scopeType: ScopeType;
}

// =============================================================================
// Optional Metadata (May Load Async)
// =============================================================================

/**
 * Optional metadata fields that may be loaded asynchronously.
 *
 * These fields may not be immediately available and can be populated
 * incrementally as data becomes available from the container inspector.
 */
export interface ContainerNodeOptionalMetadata {
  /** Number of adapters registered in this container */
  readonly adapterCount?: number;
  /** Current disposal state of the container */
  readonly disposedState?: DisposedState;
  /** Timestamp when the container was created (ms since epoch) */
  readonly createdAt?: number;
  /** Number of services that have been resolved */
  readonly resolvedCount?: number;
  /** Inheritance mode for child containers (how parent services are inherited) */
  readonly inheritanceMode?: InheritanceMode;
}

// =============================================================================
// Combined Metadata
// =============================================================================

/**
 * Complete container node metadata combining required and optional fields.
 *
 * Use this type when you have fully loaded metadata. For incremental
 * loading scenarios, use `ContainerNodeMetadataState` instead.
 */
export interface ContainerNodeMetadata
  extends ContainerNodeRequiredMetadata, ContainerNodeOptionalMetadata {}

// =============================================================================
// Loading State Types (Discriminated Union)
// =============================================================================

/**
 * Metadata loading state when data is being fetched.
 *
 * Only required fields are available; optional fields are not yet loaded.
 */
export interface MetadataLoading {
  readonly status: "loading";
  /** Required metadata (always available) */
  readonly data: ContainerNodeRequiredMetadata;
}

/**
 * Metadata loaded state with all available data.
 *
 * Both required and optional fields are populated.
 */
export interface MetadataLoaded {
  readonly status: "loaded";
  /** Complete metadata including optional fields */
  readonly data: ContainerNodeMetadata;
}

/**
 * Metadata error state when loading failed.
 *
 * Required metadata is still available; error information is provided.
 */
export interface MetadataError {
  readonly status: "error";
  /** Required metadata (still available despite error) */
  readonly data: ContainerNodeRequiredMetadata;
  /** Error that occurred during loading */
  readonly error: MetadataLoadError;
}

/**
 * Discriminated union for container metadata loading states.
 *
 * Use the `status` field to discriminate between states:
 *
 * @example Type-safe state handling
 * ```typescript
 * function renderMetadata(state: ContainerNodeMetadataState): JSX.Element {
 *   // Required fields always available
 *   const { id, name, scopeType } = state.data;
 *
 *   switch (state.status) {
 *     case "loading":
 *       return <Loading name={name} />;
 *     case "loaded":
 *       // Optional fields now available
 *       return <Loaded {...state.data} />;
 *     case "error":
 *       return <Error name={name} error={state.error} />;
 *   }
 * }
 * ```
 */
export type ContainerNodeMetadataState = MetadataLoading | MetadataLoaded | MetadataError;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error category for metadata loading failures.
 */
export type MetadataLoadErrorCategory = "connection" | "timeout" | "inspection" | "internal";

/**
 * Structured error for metadata loading failures.
 *
 * Provides category-based error handling and recovery guidance.
 */
export interface MetadataLoadError {
  /** Error category for programmatic handling */
  readonly category: MetadataLoadErrorCategory;
  /** Human-readable error message */
  readonly message: string;
  /** Whether the error is recoverable via retry */
  readonly recoverable: boolean;
  /** Original error if available */
  readonly cause?: Error;
}

// =============================================================================
// Container Lifecycle State Types (Discriminated Union)
// =============================================================================

/**
 * Base fields shared by all container lifecycle states.
 */
interface ContainerStateBase {
  /** Required metadata (always available) */
  readonly metadata: ContainerNodeRequiredMetadata;
}

/**
 * Container in active state - fully operational.
 */
export interface ContainerActiveState extends ContainerStateBase {
  readonly state: "active";
  /** Optional metadata that may be partially loaded */
  readonly optionalMetadata: ContainerNodeOptionalMetadata;
}

/**
 * Container in disposing state - being torn down.
 */
export interface ContainerDisposingState extends ContainerStateBase {
  readonly state: "disposing";
  /** Timestamp when disposal started */
  readonly disposalStartedAt: number;
}

/**
 * Container in disposed state - fully torn down.
 */
export interface ContainerDisposedState extends ContainerStateBase {
  readonly state: "disposed";
  /** Timestamp when disposal completed */
  readonly disposedAt: number;
  /** Reason for disposal if available */
  readonly disposalReason?: string;
}

/**
 * Container in error state - encountered a fatal error.
 */
export interface ContainerErrorState extends ContainerStateBase {
  readonly state: "error";
  /** Error that caused the container to enter error state */
  readonly error: MetadataLoadError;
  /** Last known optional metadata before error */
  readonly lastKnownMetadata?: ContainerNodeOptionalMetadata;
}

/**
 * Discriminated union for container lifecycle states.
 *
 * Use the `state` field to discriminate between states:
 *
 * @example Exhaustive state handling
 * ```typescript
 * function getStatusBadge(container: ContainerLifecycleState): string {
 *   switch (container.state) {
 *     case "active":
 *       return `Active (${container.optionalMetadata.resolvedCount ?? 0} resolved)`;
 *     case "disposing":
 *       return "Disposing...";
 *     case "disposed":
 *       return `Disposed at ${new Date(container.disposedAt).toISOString()}`;
 *     case "error":
 *       return `Error: ${container.error.message}`;
 *   }
 * }
 * ```
 */
export type ContainerLifecycleState =
  | ContainerActiveState
  | ContainerDisposingState
  | ContainerDisposedState
  | ContainerErrorState;

// =============================================================================
// Tree Node Types
// =============================================================================

/**
 * Complete tree view node combining metadata state and lifecycle state.
 *
 * This type provides all information needed to render a container node
 * in a hierarchical tree view, including children.
 *
 * @example Tree rendering
 * ```typescript
 * function renderTreeNode(node: ContainerTreeViewNode): JSX.Element {
 *   const { id, name } = node.metadataState.data;
 *
 *   return (
 *     <TreeItem
 *       id={id}
 *       label={name}
 *       status={node.lifecycleState.state}
 *       isLoading={node.metadataState.status === "loading"}
 *     >
 *       {node.children.map(child => renderTreeNode(child))}
 *     </TreeItem>
 *   );
 * }
 * ```
 */
export interface ContainerTreeViewNode {
  /** Metadata with loading state */
  readonly metadataState: ContainerNodeMetadataState;
  /** Container lifecycle state */
  readonly lifecycleState: ContainerLifecycleState;
  /** Child container nodes */
  readonly children: readonly ContainerTreeViewNode[];
  /** Depth in the tree (0 for root) */
  readonly depth: number;
  /** Whether this node is expanded in the UI */
  readonly isExpanded: boolean;
  /** Whether this node is currently selected */
  readonly isSelected: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if metadata state is loading.
 */
export function isMetadataLoading(state: ContainerNodeMetadataState): state is MetadataLoading {
  return state.status === "loading";
}

/**
 * Type guard to check if metadata state is loaded.
 */
export function isMetadataLoaded(state: ContainerNodeMetadataState): state is MetadataLoaded {
  return state.status === "loaded";
}

/**
 * Type guard to check if metadata state is error.
 */
export function isMetadataError(state: ContainerNodeMetadataState): state is MetadataError {
  return state.status === "error";
}

/**
 * Type guard to check if container is in active state.
 */
export function isContainerActive(state: ContainerLifecycleState): state is ContainerActiveState {
  return state.state === "active";
}

/**
 * Type guard to check if container is in disposed state.
 */
export function isContainerDisposed(
  state: ContainerLifecycleState
): state is ContainerDisposedState {
  return state.state === "disposed";
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates initial loading metadata state from required fields.
 *
 * Use this when a container is first discovered and optional
 * metadata has not yet been loaded.
 *
 * @param required - Required metadata fields
 * @returns Loading metadata state
 *
 * @example
 * ```typescript
 * const initialState = createLoadingMetadataState({
 *   id: "container-1",
 *   name: "AppContainer",
 *   scopeType: "root",
 * });
 * ```
 */
export function createLoadingMetadataState(
  required: ContainerNodeRequiredMetadata
): MetadataLoading {
  return {
    status: "loading",
    data: required,
  };
}

/**
 * Creates loaded metadata state from complete metadata.
 *
 * Use this when all metadata has been successfully loaded.
 *
 * @param metadata - Complete metadata including optional fields
 * @returns Loaded metadata state
 */
export function createLoadedMetadataState(metadata: ContainerNodeMetadata): MetadataLoaded {
  return {
    status: "loaded",
    data: metadata,
  };
}

/**
 * Creates error metadata state preserving required fields.
 *
 * Use this when metadata loading fails but required fields are still available.
 *
 * @param required - Required metadata fields
 * @param error - Error that occurred during loading
 * @returns Error metadata state
 */
export function createErrorMetadataState(
  required: ContainerNodeRequiredMetadata,
  error: MetadataLoadError
): MetadataError {
  return {
    status: "error",
    data: required,
    error,
  };
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extracts the data type from a metadata state.
 *
 * For loaded state, returns ContainerNodeMetadata.
 * For loading/error state, returns ContainerNodeRequiredMetadata.
 */
export type ExtractMetadataData<T extends ContainerNodeMetadataState> = T extends MetadataLoaded
  ? ContainerNodeMetadata
  : ContainerNodeRequiredMetadata;

/**
 * Type that represents partial optional metadata during incremental loading.
 *
 * Each field can be independently present or absent.
 */
export type PartialOptionalMetadata = {
  readonly [K in keyof ContainerNodeOptionalMetadata]?: ContainerNodeOptionalMetadata[K];
};

/**
 * Merges partial optional metadata updates into existing metadata.
 *
 * Use this when incrementally loading optional fields.
 */
export type MergeMetadata<
  TExisting extends ContainerNodeOptionalMetadata,
  TUpdate extends PartialOptionalMetadata,
> = {
  readonly [K in keyof ContainerNodeOptionalMetadata]: K extends keyof TUpdate
    ? TUpdate[K] extends undefined
      ? K extends keyof TExisting
        ? TExisting[K]
        : undefined
      : TUpdate[K]
    : K extends keyof TExisting
      ? TExisting[K]
      : undefined;
};
