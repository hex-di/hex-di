# Overview and Data Model

_Next: [Layout and Wireframes](02-layout-and-wireframes.md)_

---

## 1. Purpose and Motivation

The existing basic implementation (SVG + dagre layout, single container, flat node shapes, no filtering) provides only a rudimentary view of the dependency graph. It is inadequate for the following debugging workflows that production applications require:

**Multi-container visibility**: Applications use root, child, and lazy containers. A developer debugging an adapter override in a child container needs to see both the parent and child graphs simultaneously, compare which adapters are inherited vs overridden, and understand how inheritance modes (shared/forked/isolated) affect resolution. The current implementation shows only a single flat graph with no container awareness.

**Library adapter differentiation**: The hex-di ecosystem includes Store (state, atom, derived, async-derived, linked-derived, effect), Query (query, mutation, streamed-query), Saga (saga, saga-management), Flow (flow, activity), Logger, and Tracing adapter kinds. When a graph contains 30+ nodes, the developer cannot tell at a glance which nodes are state machines, which are queries, and which are plain services. Visual shape differentiation by library kind solves this.

**Metadata inspection**: Ports carry description, category, tags, and direction (inbound/outbound). Adapters carry custom metadata including library-specific metadata (e.g., FlowAdapter transition maps, SagaAdapter step definitions). None of this is visible in the current implementation.

**Adapter injection tracing**: The current graph shows dependency edges (port A depends on port B) but does not show which concrete adapter is injected for each dependency. When an adapter is overridden in a child container, developers need to see the override chain.

**Filtering at scale**: A production graph with 50-100+ adapters is unreadable without filtering by lifetime, origin, library kind, category, tag, direction, error rate, or inheritance mode.

**Graph health analysis**: The `inspectGraph()` function produces captive dependency warnings, orphan ports, disposal warnings, complexity scores, and suggestions. These are not surfaced in the current UI.

---

## 2. Data Model

### 2.1 GraphPanelState

Client-side UI state managed within the Graph Panel component.

```typescript
interface GraphPanelState {
  /** Currently selected container (by name). Undefined = first available. */
  readonly selectedContainerName: string | undefined;

  /** Selected node port names (supports multi-select via Shift+Click). */
  readonly selectedNodes: ReadonlySet<string>;

  /** Currently hovered node, if any. */
  readonly hoveredNode: string | undefined;

  /** Viewport state: pan and zoom. */
  readonly viewport: GraphViewportState;

  /** Active filter configuration. */
  readonly filter: GraphFilterState;

  /** Whether the analysis sidebar is open. */
  readonly analysisSidebarOpen: boolean;

  /** Whether the metadata inspector panel is open. */
  readonly metadataInspectorOpen: boolean;

  /** Whether the filter panel drawer is open. */
  readonly filterPanelOpen: boolean;

  /** Layout direction for dagre. */
  readonly layoutDirection: "TB" | "LR";

  /** Whether the minimap is visible. */
  readonly minimapVisible: boolean;

  /** Active saved filter preset name, if any. */
  readonly activePreset: string | undefined;
}
```

### 2.2 MultiContainerGraphState

Aggregated state across all available containers.

```typescript
interface MultiContainerGraphState {
  /** All available container graph data, keyed by container name. */
  readonly containers: ReadonlyMap<string, ContainerGraphData>;

  /** Container hierarchy: child name -> parent name. */
  readonly parentMap: ReadonlyMap<string, string>;

  /** Active container's graph data (the one currently rendered). */
  readonly activeGraph: ContainerGraphData | undefined;
}
```

### 2.3 EnrichedGraphNode

Extends the raw `VisualizableAdapter` with runtime and computed data for rendering.

```typescript
interface EnrichedGraphNode {
  /** Original adapter data. */
  readonly adapter: VisualizableAdapter;

  /** Dagre-computed layout position. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  /** Runtime resolution status. */
  readonly isResolved: boolean;

  /** Error rate from ResultStatistics (0.0 to 1.0), or undefined. */
  readonly errorRate: number | undefined;

  /** Whether error rate exceeds the high-error threshold (10%). */
  readonly hasHighErrorRate: boolean;

  /** Total number of calls from ResultStatistics. */
  readonly totalCalls: number;

  /** Successful call count from ResultStatistics. */
  readonly okCount: number;

  /** Failed call count from ResultStatistics. */
  readonly errCount: number;

  /** Error counts keyed by error code string. */
  readonly errorsByCode: ReadonlyMap<string, number>;

  /** Port direction from PortInfo. */
  readonly direction: "inbound" | "outbound" | undefined;

  /** Port category from PortInfo. */
  readonly category: string | undefined;

  /** Port tags from PortInfo. */
  readonly tags: readonly string[];

  /** Port description from metadata. */
  readonly description: string | undefined;

  /** Detected library adapter kind, if identifiable. */
  readonly libraryKind: LibraryAdapterKind | undefined;

  /** Number of direct dependents (nodes that depend on this node). */
  readonly dependentCount: number;

  /** Whether this node passes the current filter. */
  readonly matchesFilter: boolean;
}
```

### 2.4 EnrichedGraphEdge

```typescript
interface EnrichedGraphEdge {
  /** Source port name (dependency provider). */
  readonly source: string;

  /** Target port name (dependent). */
  readonly target: string;

  /** Dagre-computed path points. */
  readonly points: readonly { readonly x: number; readonly y: number }[];

  /** Whether this edge connects to or from a selected node. */
  readonly isHighlighted: boolean;

  /** Depth relative to the selected node (0 = direct, 1+ = transitive). */
  readonly transitiveDepth: number;

  /** Whether the source adapter is inherited in the active container. */
  readonly isInherited: boolean;

  /** Whether the source adapter is overridden. */
  readonly isOverridden: boolean;
}
```

### 2.5 GraphFilterState

```typescript
interface GraphFilterState {
  /** Text search on port name (case-insensitive substring). */
  readonly searchText: string;

  /** Filter by lifetime. Empty set = show all. */
  readonly lifetimes: ReadonlySet<"singleton" | "scoped" | "transient">;

  /** Filter by origin. Empty set = show all. */
  readonly origins: ReadonlySet<"own" | "inherited" | "overridden">;

  /** Filter by library adapter kind. Empty set = show all. */
  readonly libraryKinds: ReadonlySet<string>;

  /** Filter by category prefix. Empty string = no filter. */
  readonly category: string;

  /** Filter by tags (any match). Empty array = no filter. */
  readonly tags: readonly string[];

  /** Tag match mode: "any" = match any tag, "all" = match all tags. */
  readonly tagMode: "any" | "all";

  /** Filter by direction. "all" = no filter. */
  readonly direction: "all" | "inbound" | "outbound";

  /** Minimum error rate threshold to show (0.0 to 1.0). 0 = no filter. */
  readonly minErrorRate: number;

  /** Filter by inheritance mode. Empty set = show all. */
  readonly inheritanceModes: ReadonlySet<"shared" | "forked" | "isolated">;

  /** Filter by resolution status. "all" = no filter. */
  readonly resolutionStatus: "all" | "resolved" | "unresolved";

  /** Compound mode for combining filters. */
  readonly compoundMode: "and" | "or";
}
```

### 2.6 GraphViewportState

```typescript
interface GraphViewportState {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}
```

### 2.7 LibraryAdapterKind

Discriminated union identifying the library and specific adapter kind.

```typescript
type LibraryAdapterKind =
  | {
      readonly library: "store";
      readonly kind: "state" | "atom" | "derived" | "async-derived" | "linked-derived" | "effect";
    }
  | { readonly library: "query"; readonly kind: "query" | "mutation" | "streamed-query" }
  | { readonly library: "saga"; readonly kind: "saga" | "saga-management" }
  | { readonly library: "flow"; readonly kind: "flow" | "activity" }
  | { readonly library: "logger"; readonly kind: "console" | "memory" | "noop" | "scoped" }
  | { readonly library: "tracing"; readonly kind: "console" | "memory" | "noop" }
  | { readonly library: "core"; readonly kind: "generic" };
```

### 2.8 MetadataDisplayState

```typescript
interface MetadataDisplayState {
  /** Port name whose metadata is displayed. */
  readonly portName: string;

  /** Expanded sections in the metadata inspector. */
  readonly expandedSections: ReadonlySet<"port" | "adapter" | "library" | "custom">;
}
```

### 2.9 SavedFilterPreset

```typescript
interface SavedFilterPreset {
  readonly name: string;
  readonly filter: GraphFilterState;
  readonly createdAt: number;
}
```

### 2.10 GraphAnalysisState

```typescript
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
```
