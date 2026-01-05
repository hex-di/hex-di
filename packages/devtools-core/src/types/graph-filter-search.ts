/**
 * Graph Filtering and Search Types for DevTools Visualization
 *
 * Provides comprehensive type definitions for filtering, searching, and
 * highlighting nodes/edges in the unified multi-container graph visualization.
 *
 * Design principles:
 * - Discriminated unions for exhaustive pattern matching
 * - Composable filter predicates with type-safe combination
 * - Compile-time validation of filter configurations
 * - Zero runtime cost (all types erased at compile time)
 * - Separation of filter state from filter application logic
 *
 * @packageDocumentation
 */

import type { FactoryKind } from "../types.js";
import type { Lifetime } from "@hex-di/plugin";
import type { ContainerId, PortId, UnifiedGraphNode, UnifiedGraphEdge } from "./unified-graph.js";
import type { OwnershipState } from "./ownership-visualization.js";

// =============================================================================
// Ownership Filter Types
// =============================================================================

/**
 * Ownership states that can be filtered.
 *
 * Maps directly to AdapterOwnership discriminant values.
 */
export type OwnershipFilterValue = OwnershipState["ownership"];

/**
 * Complete set of ownership filter options.
 *
 * When all are true, no ownership filtering is applied.
 * When all are false, no nodes pass the filter.
 */
export interface OwnershipFilterState {
  /** Include nodes with owned adapters */
  readonly owned: boolean;
  /** Include nodes with inherited adapters */
  readonly inherited: boolean;
  /** Include nodes with overridden adapters */
  readonly overridden: boolean;
}

// =============================================================================
// Lifetime Filter Types
// =============================================================================

/**
 * Complete set of lifetime filter options.
 *
 * When all are true, no lifetime filtering is applied.
 * When all are false, no nodes pass the filter.
 */
export interface LifetimeFilterState {
  /** Include singleton lifetime nodes */
  readonly singleton: boolean;
  /** Include scoped lifetime nodes */
  readonly scoped: boolean;
  /** Include transient lifetime nodes */
  readonly transient: boolean;
}

// =============================================================================
// Factory Kind Filter Types
// =============================================================================

/**
 * Complete set of factory kind filter options.
 */
export interface FactoryKindFilterState {
  /** Include synchronous factory nodes */
  readonly sync: boolean;
  /** Include asynchronous factory nodes */
  readonly async: boolean;
}

// =============================================================================
// Container Filter Types
// =============================================================================

/**
 * Container selection mode for filtering.
 *
 * - `all`: Show ports from all registered containers
 * - `selected`: Show only ports from explicitly selected containers
 * - `single`: Show ports from a single focused container
 */
export type ContainerSelectionMode = "all" | "selected" | "single";

/**
 * Container filter state.
 *
 * Controls which containers' ports are visible in the graph.
 */
export interface ContainerFilterState {
  /** Selection mode determining how containers are filtered */
  readonly mode: ContainerSelectionMode;
  /**
   * Selected container IDs.
   * - For `selected` mode: Array of explicitly selected containers
   * - For `single` mode: Array with exactly one container
   * - For `all` mode: Ignored (empty array recommended)
   */
  readonly selectedIds: readonly ContainerId[];
}

// =============================================================================
// Complete Filter State (Composition)
// =============================================================================

/**
 * Complete filter state combining all filter dimensions.
 *
 * Each dimension operates independently; nodes must pass ALL active filters
 * to be included in the filtered result (logical AND).
 *
 * @example Default (no filtering)
 * ```typescript
 * const defaultFilter: GraphFilterState = {
 *   ownership: { owned: true, inherited: true, overridden: true },
 *   lifetime: { singleton: true, scoped: true, transient: true },
 *   factoryKind: { sync: true, async: true },
 *   container: { mode: "all", selectedIds: [] },
 *   portNameQuery: "",
 * };
 * ```
 *
 * @example Filter to only owned singletons
 * ```typescript
 * const ownedSingletons: GraphFilterState = {
 *   ownership: { owned: true, inherited: false, overridden: false },
 *   lifetime: { singleton: true, scoped: false, transient: false },
 *   factoryKind: { sync: true, async: true },
 *   container: { mode: "all", selectedIds: [] },
 *   portNameQuery: "",
 * };
 * ```
 */
export interface GraphFilterState {
  /** Ownership-based filtering */
  readonly ownership: OwnershipFilterState;
  /** Lifetime-based filtering */
  readonly lifetime: LifetimeFilterState;
  /** Factory kind filtering */
  readonly factoryKind: FactoryKindFilterState;
  /** Container-based filtering */
  readonly container: ContainerFilterState;
  /**
   * Port name search query.
   * Empty string means no name filtering.
   * Non-empty applies case-insensitive partial match.
   */
  readonly portNameQuery: string;
}

// =============================================================================
// Filter Predicate Types
// =============================================================================

/**
 * Predicate function for filtering unified graph nodes.
 *
 * Returns `true` to include the node, `false` to exclude.
 * Pure function with no side effects.
 */
export type UnifiedNodePredicate = (node: UnifiedGraphNode) => boolean;

/**
 * Predicate function for filtering unified graph edges.
 *
 * Returns `true` to include the edge, `false` to exclude.
 * Typically used to remove edges referencing filtered-out nodes.
 */
export type UnifiedEdgePredicate = (edge: UnifiedGraphEdge) => boolean;

/**
 * Combined predicate for filtering both nodes and edges.
 *
 * The edge predicate should typically exclude edges whose endpoints
 * are not in the filtered node set.
 */
export interface GraphFilterPredicate {
  readonly node: UnifiedNodePredicate;
  readonly edge: UnifiedEdgePredicate;
}

// =============================================================================
// Search State Types
// =============================================================================

/**
 * Search match location within a node.
 *
 * Indicates where the search query matched.
 */
export type SearchMatchLocation = "port-name" | "container-name" | "label";

/**
 * A single search match result.
 *
 * Provides detailed information about where and how a match occurred.
 */
export interface SearchMatch {
  /** The port ID that matched */
  readonly portId: PortId;
  /** Location(s) where the match occurred */
  readonly matchLocations: readonly SearchMatchLocation[];
  /** Matched substring for highlighting */
  readonly matchedText: string;
  /** Start index of match in the matched field */
  readonly matchStart: number;
  /** Length of the matched text */
  readonly matchLength: number;
  /**
   * Relevance score for ranking (higher = more relevant).
   * Scoring heuristics:
   * - Exact match: 100
   * - Starts with query: 80
   * - Contains query: 60
   * - Fuzzy match: 40
   */
  readonly relevanceScore: number;
}

/**
 * Search mode determining how queries are interpreted.
 *
 * - `exact`: Query must match exactly (case-insensitive)
 * - `contains`: Query can appear anywhere in the target
 * - `prefix`: Query must appear at the start
 * - `regex`: Query is interpreted as a regular expression
 * - `fuzzy`: Fuzzy matching with typo tolerance
 */
export type SearchMode = "exact" | "contains" | "prefix" | "regex" | "fuzzy";

/**
 * Configuration for search behavior.
 */
export interface SearchConfig {
  /** How to interpret the search query */
  readonly mode: SearchMode;
  /** Whether to search in port names */
  readonly searchPortNames: boolean;
  /** Whether to search in container names */
  readonly searchContainerNames: boolean;
  /** Whether to search in node labels */
  readonly searchLabels: boolean;
  /** Maximum number of results to return (0 = unlimited) */
  readonly maxResults: number;
}

/**
 * Complete search state for the graph visualization.
 *
 * @example Active search with results
 * ```typescript
 * const activeSearch: SearchState = {
 *   query: "User",
 *   config: {
 *     mode: "contains",
 *     searchPortNames: true,
 *     searchContainerNames: false,
 *     searchLabels: true,
 *     maxResults: 50,
 *   },
 *   matches: [
 *     { portId: "UserService", matchLocations: ["port-name"], ... },
 *     { portId: "UserRepository", matchLocations: ["port-name"], ... },
 *   ],
 *   selectedMatchIndex: 0,
 *   isActive: true,
 * };
 * ```
 */
export interface SearchState {
  /** Current search query (empty = no active search) */
  readonly query: string;
  /** Search configuration */
  readonly config: SearchConfig;
  /** Ordered list of matches (sorted by relevance) */
  readonly matches: readonly SearchMatch[];
  /** Index of currently selected/focused match (-1 = none) */
  readonly selectedMatchIndex: number;
  /** Whether search is currently active */
  readonly isActive: boolean;
}

// =============================================================================
// Highlight State Types
// =============================================================================

/**
 * Highlight reason describing why a node/edge is highlighted.
 *
 * Different reasons can have different visual treatments.
 */
export type HighlightReason =
  | "search-match" // Node matches current search query
  | "search-selected" // Currently selected search result
  | "hover" // Mouse is hovering over node
  | "selected" // Node is explicitly selected
  | "dependency-of" // Node is a dependency of selected node
  | "dependent-on" // Node depends on selected node
  | "same-container" // Node is in the same container as selected
  | "override-chain"; // Node is part of an override chain

/**
 * Highlight intensity level.
 *
 * Used to create visual hierarchy among highlighted elements.
 */
export type HighlightIntensity = "primary" | "secondary" | "tertiary";

/**
 * Highlight state for a single node.
 */
export interface NodeHighlightState {
  /** Port ID of the highlighted node */
  readonly portId: PortId;
  /** Reasons why this node is highlighted (can be multiple) */
  readonly reasons: readonly HighlightReason[];
  /** Visual intensity based on combined reasons */
  readonly intensity: HighlightIntensity;
}

/**
 * Highlight state for a single edge.
 */
export interface EdgeHighlightState {
  /** Source port ID */
  readonly from: PortId;
  /** Target port ID */
  readonly to: PortId;
  /** Reasons why this edge is highlighted */
  readonly reasons: readonly HighlightReason[];
  /** Visual intensity */
  readonly intensity: HighlightIntensity;
}

/**
 * Dim state for non-highlighted elements.
 *
 * When some elements are highlighted, others should be dimmed
 * to create visual focus.
 */
export interface DimState {
  /** Whether dimming is active */
  readonly isActive: boolean;
  /** Opacity level for dimmed elements (0.0 to 1.0) */
  readonly dimOpacity: number;
}

/**
 * Complete highlight state for the graph visualization.
 *
 * @example Node selected with dependencies highlighted
 * ```typescript
 * const highlightState: HighlightState = {
 *   nodes: new Map([
 *     ["UserService", { portId: "UserService", reasons: ["selected"], intensity: "primary" }],
 *     ["Logger", { portId: "Logger", reasons: ["dependency-of"], intensity: "secondary" }],
 *     ["Database", { portId: "Database", reasons: ["dependency-of"], intensity: "secondary" }],
 *   ]),
 *   edges: new Map([
 *     ["UserService->Logger", { from: "UserService", to: "Logger", reasons: ["dependency-of"], intensity: "secondary" }],
 *   ]),
 *   dim: { isActive: true, dimOpacity: 0.3 },
 * };
 * ```
 */
export interface HighlightState {
  /** Map of port ID to node highlight state */
  readonly nodes: ReadonlyMap<PortId, NodeHighlightState>;
  /** Map of edge key ("from->to") to edge highlight state */
  readonly edges: ReadonlyMap<string, EdgeHighlightState>;
  /** Dim state for non-highlighted elements */
  readonly dim: DimState;
}

// =============================================================================
// Combined Visualization State
// =============================================================================

/**
 * Complete visualization state combining filter, search, and highlight.
 *
 * This is the top-level state object for graph visualization controls.
 * Each sub-state is independent and can be updated separately.
 */
export interface GraphVisualizationState {
  /** Current filter state */
  readonly filter: GraphFilterState;
  /** Current search state */
  readonly search: SearchState;
  /** Current highlight state */
  readonly highlight: HighlightState;
}

// =============================================================================
// Filter Result Types
// =============================================================================

/**
 * Result of applying filters to a unified graph.
 *
 * Provides both the filtered graph and metadata about what was filtered.
 */
export interface FilterResult {
  /** Port IDs of nodes that passed all filters */
  readonly visibleNodeIds: ReadonlySet<PortId>;
  /** Edge keys ("from->to") that passed filters */
  readonly visibleEdgeKeys: ReadonlySet<string>;
  /** Count of nodes filtered out by each filter dimension */
  readonly filterCounts: FilterCounts;
  /** Whether any filtering is active */
  readonly isFiltered: boolean;
}

/**
 * Counts of nodes filtered out by each dimension.
 *
 * Useful for showing filter badges and understanding filter impact.
 */
export interface FilterCounts {
  /** Nodes hidden by ownership filter */
  readonly hiddenByOwnership: number;
  /** Nodes hidden by lifetime filter */
  readonly hiddenByLifetime: number;
  /** Nodes hidden by factory kind filter */
  readonly hiddenByFactoryKind: number;
  /** Nodes hidden by container filter */
  readonly hiddenByContainer: number;
  /** Nodes hidden by port name query */
  readonly hiddenByQuery: number;
  /** Total nodes hidden */
  readonly totalHidden: number;
  /** Total nodes visible */
  readonly totalVisible: number;
}

// =============================================================================
// Filter Update Types (Actions)
// =============================================================================

/**
 * Base interface for filter update actions.
 *
 * Follows Redux-style action pattern for predictable state updates.
 */
interface FilterActionBase {
  readonly type: string;
}

/**
 * Toggle a single ownership filter value.
 */
export interface ToggleOwnershipFilterAction extends FilterActionBase {
  readonly type: "toggle-ownership";
  readonly value: OwnershipFilterValue;
}

/**
 * Toggle a single lifetime filter value.
 */
export interface ToggleLifetimeFilterAction extends FilterActionBase {
  readonly type: "toggle-lifetime";
  readonly value: Lifetime;
}

/**
 * Toggle a single factory kind filter value.
 */
export interface ToggleFactoryKindFilterAction extends FilterActionBase {
  readonly type: "toggle-factory-kind";
  readonly value: FactoryKind;
}

/**
 * Set container selection mode.
 */
export interface SetContainerModeAction extends FilterActionBase {
  readonly type: "set-container-mode";
  readonly mode: ContainerSelectionMode;
}

/**
 * Toggle a container in the selection.
 */
export interface ToggleContainerAction extends FilterActionBase {
  readonly type: "toggle-container";
  readonly containerId: ContainerId;
}

/**
 * Set the port name search query.
 */
export interface SetPortNameQueryAction extends FilterActionBase {
  readonly type: "set-port-name-query";
  readonly query: string;
}

/**
 * Reset all filters to default (show all).
 */
export interface ResetFiltersAction extends FilterActionBase {
  readonly type: "reset-filters";
}

/**
 * Set complete filter state (for restoring saved filters).
 */
export interface SetFilterStateAction extends FilterActionBase {
  readonly type: "set-filter-state";
  readonly state: GraphFilterState;
}

/**
 * Discriminated union of all filter actions.
 *
 * @example Type-safe action handling
 * ```typescript
 * function filterReducer(state: GraphFilterState, action: FilterAction): GraphFilterState {
 *   switch (action.type) {
 *     case "toggle-ownership":
 *       return {
 *         ...state,
 *         ownership: {
 *           ...state.ownership,
 *           [action.value]: !state.ownership[action.value],
 *         },
 *       };
 *     case "reset-filters":
 *       return DEFAULT_FILTER_STATE;
 *     // ... exhaustive handling
 *   }
 * }
 * ```
 */
export type FilterAction =
  | ToggleOwnershipFilterAction
  | ToggleLifetimeFilterAction
  | ToggleFactoryKindFilterAction
  | SetContainerModeAction
  | ToggleContainerAction
  | SetPortNameQueryAction
  | ResetFiltersAction
  | SetFilterStateAction;

// =============================================================================
// Search Update Types (Actions)
// =============================================================================

/**
 * Set the search query.
 */
export interface SetSearchQueryAction {
  readonly type: "set-search-query";
  readonly query: string;
}

/**
 * Update search configuration.
 */
export interface SetSearchConfigAction {
  readonly type: "set-search-config";
  readonly config: Partial<SearchConfig>;
}

/**
 * Navigate to next search result.
 */
export interface NextSearchResultAction {
  readonly type: "next-search-result";
}

/**
 * Navigate to previous search result.
 */
export interface PreviousSearchResultAction {
  readonly type: "previous-search-result";
}

/**
 * Select a specific search result by index.
 */
export interface SelectSearchResultAction {
  readonly type: "select-search-result";
  readonly index: number;
}

/**
 * Clear search state.
 */
export interface ClearSearchAction {
  readonly type: "clear-search";
}

/**
 * Discriminated union of all search actions.
 */
export type SearchAction =
  | SetSearchQueryAction
  | SetSearchConfigAction
  | NextSearchResultAction
  | PreviousSearchResultAction
  | SelectSearchResultAction
  | ClearSearchAction;

// =============================================================================
// Highlight Update Types (Actions)
// =============================================================================

/**
 * Set hover highlight on a node.
 */
export interface SetHoverNodeAction {
  readonly type: "set-hover-node";
  readonly portId: PortId | null;
}

/**
 * Set selected node (with dependency highlighting).
 */
export interface SetSelectedNodeAction {
  readonly type: "set-selected-node";
  readonly portId: PortId | null;
}

/**
 * Clear all highlights.
 */
export interface ClearHighlightsAction {
  readonly type: "clear-highlights";
}

/**
 * Set dim state.
 */
export interface SetDimStateAction {
  readonly type: "set-dim-state";
  readonly dim: DimState;
}

/**
 * Discriminated union of all highlight actions.
 */
export type HighlightAction =
  | SetHoverNodeAction
  | SetSelectedNodeAction
  | ClearHighlightsAction
  | SetDimStateAction;

// =============================================================================
// Combined Action Type
// =============================================================================

/**
 * All visualization-related actions.
 */
export type VisualizationAction = FilterAction | SearchAction | HighlightAction;

// =============================================================================
// Default State Constants
// =============================================================================

/**
 * Default ownership filter state (all enabled).
 */
export const DEFAULT_OWNERSHIP_FILTER: OwnershipFilterState = {
  owned: true,
  inherited: true,
  overridden: true,
} as const;

/**
 * Default lifetime filter state (all enabled).
 */
export const DEFAULT_LIFETIME_FILTER: LifetimeFilterState = {
  singleton: true,
  scoped: true,
  transient: true,
} as const;

/**
 * Default factory kind filter state (all enabled).
 */
export const DEFAULT_FACTORY_KIND_FILTER: FactoryKindFilterState = {
  sync: true,
  async: true,
} as const;

/**
 * Default container filter state (show all).
 */
export const DEFAULT_CONTAINER_FILTER: ContainerFilterState = {
  mode: "all",
  selectedIds: [],
} as const;

/**
 * Default complete filter state (no filtering applied).
 */
export const DEFAULT_FILTER_STATE: GraphFilterState = {
  ownership: DEFAULT_OWNERSHIP_FILTER,
  lifetime: DEFAULT_LIFETIME_FILTER,
  factoryKind: DEFAULT_FACTORY_KIND_FILTER,
  container: DEFAULT_CONTAINER_FILTER,
  portNameQuery: "",
} as const;

/**
 * Default search configuration.
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  mode: "contains",
  searchPortNames: true,
  searchContainerNames: true,
  searchLabels: true,
  maxResults: 100,
} as const;

/**
 * Default search state (inactive).
 */
export const DEFAULT_SEARCH_STATE: SearchState = {
  query: "",
  config: DEFAULT_SEARCH_CONFIG,
  matches: [],
  selectedMatchIndex: -1,
  isActive: false,
} as const;

/**
 * Default dim state.
 */
export const DEFAULT_DIM_STATE: DimState = {
  isActive: false,
  dimOpacity: 0.3,
} as const;

/**
 * Default highlight state (nothing highlighted).
 */
export const DEFAULT_HIGHLIGHT_STATE: HighlightState = {
  nodes: new Map(),
  edges: new Map(),
  dim: DEFAULT_DIM_STATE,
} as const;

/**
 * Default complete visualization state.
 */
export const DEFAULT_VISUALIZATION_STATE: GraphVisualizationState = {
  filter: DEFAULT_FILTER_STATE,
  search: DEFAULT_SEARCH_STATE,
  highlight: DEFAULT_HIGHLIGHT_STATE,
} as const;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a filter action is ownership-related.
 */
export function isOwnershipFilterAction(
  action: FilterAction
): action is ToggleOwnershipFilterAction {
  return action.type === "toggle-ownership";
}

/**
 * Type guard to check if a filter action is lifetime-related.
 */
export function isLifetimeFilterAction(action: FilterAction): action is ToggleLifetimeFilterAction {
  return action.type === "toggle-lifetime";
}

/**
 * Type guard to check if a filter action is container-related.
 */
export function isContainerFilterAction(
  action: FilterAction
): action is SetContainerModeAction | ToggleContainerAction {
  return action.type === "set-container-mode" || action.type === "toggle-container";
}

/**
 * Type guard to check if search is active.
 */
export function isSearchActive(state: SearchState): boolean {
  return state.isActive && state.query.length > 0;
}

/**
 * Type guard to check if any filtering is applied.
 */
export function isFilterActive(state: GraphFilterState): boolean {
  return (
    !state.ownership.owned ||
    !state.ownership.inherited ||
    !state.ownership.overridden ||
    !state.lifetime.singleton ||
    !state.lifetime.scoped ||
    !state.lifetime.transient ||
    !state.factoryKind.sync ||
    !state.factoryKind.async ||
    state.container.mode !== "all" ||
    state.portNameQuery.length > 0
  );
}

/**
 * Type guard to check if any highlighting is active.
 */
export function isHighlightActive(state: HighlightState): boolean {
  return state.nodes.size > 0 || state.edges.size > 0;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extracts the value type from a toggle filter action.
 */
export type ToggleFilterValue<T extends FilterAction> = T extends { value: infer V } ? V : never;

/**
 * Maps filter action types to their action interfaces.
 */
export interface FilterActionMap {
  readonly "toggle-ownership": ToggleOwnershipFilterAction;
  readonly "toggle-lifetime": ToggleLifetimeFilterAction;
  readonly "toggle-factory-kind": ToggleFactoryKindFilterAction;
  readonly "set-container-mode": SetContainerModeAction;
  readonly "toggle-container": ToggleContainerAction;
  readonly "set-port-name-query": SetPortNameQueryAction;
  readonly "reset-filters": ResetFiltersAction;
  readonly "set-filter-state": SetFilterStateAction;
}

/**
 * Extracts the specific action type by action type literal.
 */
export type ExtractFilterAction<T extends FilterAction["type"]> = FilterActionMap[T];

/**
 * All possible filter dimension keys.
 */
export type FilterDimension =
  | "ownership"
  | "lifetime"
  | "factoryKind"
  | "container"
  | "portNameQuery";

/**
 * Maps filter dimensions to their state types.
 */
export interface FilterDimensionStateMap {
  readonly ownership: OwnershipFilterState;
  readonly lifetime: LifetimeFilterState;
  readonly factoryKind: FactoryKindFilterState;
  readonly container: ContainerFilterState;
  readonly portNameQuery: string;
}

/**
 * Extracts the state type for a specific filter dimension.
 */
export type FilterDimensionState<D extends FilterDimension> = FilterDimensionStateMap[D];

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a node highlight state.
 *
 * @param portId - Port ID to highlight
 * @param reasons - Reasons for highlighting
 * @param intensity - Visual intensity
 * @returns NodeHighlightState
 */
export function createNodeHighlight(
  portId: PortId,
  reasons: readonly HighlightReason[],
  intensity: HighlightIntensity = "primary"
): NodeHighlightState {
  return { portId, reasons, intensity };
}

/**
 * Creates an edge highlight state.
 *
 * @param from - Source port ID
 * @param to - Target port ID
 * @param reasons - Reasons for highlighting
 * @param intensity - Visual intensity
 * @returns EdgeHighlightState
 */
export function createEdgeHighlight(
  from: PortId,
  to: PortId,
  reasons: readonly HighlightReason[],
  intensity: HighlightIntensity = "secondary"
): EdgeHighlightState {
  return { from, to, reasons, intensity };
}

/**
 * Creates an edge key from port IDs.
 *
 * @param from - Source port ID
 * @param to - Target port ID
 * @returns Edge key string
 */
export function createEdgeKey(from: PortId, to: PortId): string {
  return `${from}->${to}`;
}

/**
 * Creates a search match result.
 *
 * @param portId - Matching port ID
 * @param matchLocations - Where the match occurred
 * @param matchedText - The matched text
 * @param matchStart - Start index of match
 * @param relevanceScore - Relevance score
 * @returns SearchMatch
 */
export function createSearchMatch(
  portId: PortId,
  matchLocations: readonly SearchMatchLocation[],
  matchedText: string,
  matchStart: number,
  relevanceScore: number
): SearchMatch {
  return {
    portId,
    matchLocations,
    matchedText,
    matchStart,
    matchLength: matchedText.length,
    relevanceScore,
  };
}

/**
 * Computes highlight intensity from reasons.
 *
 * Priority: selected/search-selected > hover/search-match > dependency/dependent
 *
 * @param reasons - Array of highlight reasons
 * @returns Appropriate intensity level
 */
export function computeHighlightIntensity(reasons: readonly HighlightReason[]): HighlightIntensity {
  if (reasons.includes("selected") || reasons.includes("search-selected")) {
    return "primary";
  }
  if (reasons.includes("hover") || reasons.includes("search-match")) {
    return "secondary";
  }
  return "tertiary";
}

/**
 * Merges highlight reasons, removing duplicates.
 *
 * @param existing - Existing reasons
 * @param additional - Additional reasons to add
 * @returns Combined unique reasons
 */
export function mergeHighlightReasons(
  existing: readonly HighlightReason[],
  additional: readonly HighlightReason[]
): readonly HighlightReason[] {
  const combined = new Set([...existing, ...additional]);
  return [...combined];
}
