/**
 * Type definitions for the Graph Panel.
 *
 * All state, data, and configuration types used throughout the
 * graph panel subsystem.
 *
 * @packageDocumentation
 */

import type { VisualizableAdapter, ContainerGraphData, ResultStatistics } from "@hex-di/core";
import type {
  GraphInspection,
  GraphSuggestion,
  CaptiveDependencyResult,
  DirectionSummary,
} from "@hex-di/graph/advanced";

// =============================================================================
// Library Adapter Kind
// =============================================================================

/**
 * Discriminated union identifying the library and specific adapter kind.
 *
 * Used for shape-based visual encoding in graph nodes.
 */
type LibraryAdapterKind =
  | {
      readonly library: "store";
      readonly kind: "state" | "atom" | "derived" | "async-derived" | "linked-derived" | "effect";
    }
  | {
      readonly library: "query";
      readonly kind: "query" | "mutation" | "streamed-query";
    }
  | {
      readonly library: "saga";
      readonly kind: "saga" | "saga-management";
    }
  | {
      readonly library: "flow";
      readonly kind: "flow" | "activity";
    }
  | {
      readonly library: "logger";
      readonly kind: "logger" | "handler" | "formatter" | "inspector";
    }
  | {
      readonly library: "tracing";
      readonly kind: "tracer" | "processor" | "exporter" | "bridge";
    }
  | { readonly library: "core"; readonly kind: "generic" };

// =============================================================================
// Viewport State
// =============================================================================

interface GraphViewportState {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

// =============================================================================
// Filter State
// =============================================================================

interface GraphFilterState {
  readonly searchText: string;
  readonly lifetimes: ReadonlySet<"singleton" | "scoped" | "transient">;
  readonly origins: ReadonlySet<"own" | "inherited" | "overridden">;
  readonly libraryKinds: ReadonlySet<string>;
  readonly category: string;
  readonly tags: readonly string[];
  readonly tagMode: "any" | "all";
  readonly direction: "all" | "inbound" | "outbound";
  readonly minErrorRate: number;
  readonly inheritanceModes: ReadonlySet<"shared" | "forked" | "isolated">;
  readonly resolutionStatus: "all" | "resolved" | "unresolved";
  readonly compoundMode: "and" | "or";
}

// =============================================================================
// Saved Filter Preset
// =============================================================================

interface SavedFilterPreset {
  readonly name: string;
  readonly filter: GraphFilterState;
  readonly createdAt: number;
}

// =============================================================================
// Graph Panel State
// =============================================================================

interface GraphPanelState {
  readonly selectedContainerName: string | undefined;
  readonly selectedNodes: ReadonlySet<string>;
  readonly hoveredNode: string | undefined;
  readonly viewport: GraphViewportState;
  readonly filter: GraphFilterState;
  readonly analysisSidebarOpen: boolean;
  readonly metadataInspectorOpen: boolean;
  readonly filterPanelOpen: boolean;
  readonly layoutDirection: "TB" | "LR";
  readonly minimapVisible: boolean;
  readonly activePreset: string | undefined;
  readonly blastRadius: string | undefined;
}

// =============================================================================
// Multi-Container State
// =============================================================================

interface MultiContainerGraphState {
  readonly containers: ReadonlyMap<string, ContainerGraphData>;
  readonly parentMap: ReadonlyMap<string, string>;
  readonly activeGraph: ContainerGraphData | undefined;
}

// =============================================================================
// Enriched Node
// =============================================================================

interface EnrichedGraphNode {
  readonly adapter: VisualizableAdapter;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isResolved: boolean;
  readonly errorRate: number | undefined;
  readonly hasHighErrorRate: boolean;
  readonly totalCalls: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly errorsByCode: ReadonlyMap<string, number>;
  readonly direction: "inbound" | "outbound" | undefined;
  readonly category: string | undefined;
  readonly tags: readonly string[];
  readonly description: string | undefined;
  readonly libraryKind: LibraryAdapterKind | undefined;
  readonly dependentCount: number;
  readonly matchesFilter: boolean;
}

// =============================================================================
// Enriched Edge
// =============================================================================

interface EnrichedGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly points: readonly { readonly x: number; readonly y: number }[];
  readonly isHighlighted: boolean;
  readonly transitiveDepth: number;
  readonly isInherited: boolean;
  readonly isOverridden: boolean;
}

// =============================================================================
// Metadata Display State
// =============================================================================

type MetadataSection = "port" | "adapter" | "library" | "custom";

interface MetadataDisplayState {
  readonly portName: string;
  readonly expandedSections: ReadonlySet<MetadataSection>;
}

// =============================================================================
// Analysis State
// =============================================================================

interface GraphAnalysisState {
  readonly isOpen: boolean;
  readonly complexityScore: number;
  readonly recommendation: "safe" | "monitor" | "consider-splitting";
  readonly suggestions: readonly GraphSuggestion[];
  readonly captiveDependencies: readonly CaptiveDependencyResult[];
  readonly orphanPorts: readonly string[];
  readonly disposalWarnings: readonly string[];
  readonly unnecessaryLazyPorts: readonly string[];
  readonly portsWithFinalizers: readonly string[];
  readonly directionSummary: DirectionSummary;
  readonly maxChainDepth: number;
  readonly isComplete: boolean;
  readonly unsatisfiedRequirements: readonly string[];
  readonly correlationId: string;
  readonly depthWarning?: string;
  readonly depthLimitExceeded: boolean;
  readonly actor?: {
    readonly type: "user" | "system" | "process";
    readonly id: string;
    readonly name?: string;
  };
}

// =============================================================================
// Navigation
// =============================================================================

interface GraphNavigationSelection {
  readonly portName: string;
  readonly containerName?: string;
}

// =============================================================================
// Reducer Actions
// =============================================================================

type GraphPanelAction =
  | { readonly type: "SELECT_NODE"; readonly portName: string }
  | {
      readonly type: "TOGGLE_MULTI_SELECT";
      readonly portName: string;
    }
  | { readonly type: "CLEAR_SELECTION" }
  | { readonly type: "SET_HOVERED"; readonly portName: string | undefined }
  | { readonly type: "SET_VIEWPORT"; readonly viewport: GraphViewportState }
  | { readonly type: "SET_FILTER"; readonly filter: Partial<GraphFilterState> }
  | { readonly type: "RESET_FILTER" }
  | { readonly type: "TOGGLE_ANALYSIS" }
  | { readonly type: "TOGGLE_METADATA" }
  | { readonly type: "TOGGLE_FILTER_PANEL" }
  | {
      readonly type: "SET_LAYOUT_DIRECTION";
      readonly direction: "TB" | "LR";
    }
  | { readonly type: "TOGGLE_MINIMAP" }
  | {
      readonly type: "SET_CONTAINER";
      readonly containerName: string | undefined;
    }
  | {
      readonly type: "SET_BLAST_RADIUS";
      readonly portName: string | undefined;
    }
  | {
      readonly type: "SET_ACTIVE_PRESET";
      readonly preset: string | undefined;
    };

// =============================================================================
// Layout Types
// =============================================================================

interface LayoutNode {
  readonly adapter: VisualizableAdapter;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LayoutEdge {
  readonly source: string;
  readonly target: string;
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

interface GraphLayout {
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
  readonly width: number;
  readonly height: number;
}

// =============================================================================
// Export Format
// =============================================================================

type GraphExportFormat = "dot" | "mermaid" | "svg" | "png" | "json" | "structured-logs";

// =============================================================================
// Exports
// =============================================================================

export type {
  LibraryAdapterKind,
  GraphViewportState,
  GraphFilterState,
  SavedFilterPreset,
  GraphPanelState,
  MultiContainerGraphState,
  EnrichedGraphNode,
  EnrichedGraphEdge,
  MetadataSection,
  MetadataDisplayState,
  GraphAnalysisState,
  GraphNavigationSelection,
  GraphPanelAction,
  LayoutNode,
  LayoutEdge,
  GraphLayout,
  GraphExportFormat,
  // Re-exports for convenience
  VisualizableAdapter,
  ContainerGraphData,
  ResultStatistics,
  GraphInspection,
  GraphSuggestion,
  CaptiveDependencyResult,
  DirectionSummary,
};
