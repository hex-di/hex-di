# Feature 7 -- Porygon's Brain (The Killer Feature)

A toggleable overlay that reveals the application's nervous system. This is the HexDI "Self-Aware Application" vision made visible. Every HexDI package is showcased here. The dependency graph pulses with live resolution activity. Trace spans fire like synaptic impulses. Container scopes appear and disappear. State machines tick through their thought processes. Health metrics display vital signs.

**HexDI packages exercised:** ALL -- `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/result`, `@hex-di/tracing`, `@hex-di/tracing-jaeger`, `@hex-di/flow`, `@hex-di/flow-react`, `@hex-di/store`, `@hex-di/saga`, `@hex-di/react`, `@hex-di/hono`

---

## 1. Feature Overview

Porygon's Brain is the existence proof of the HexDI vision. The app shows its own internals -- not through external tooling, but through the same inspection, tracing, and introspection APIs that HexDI provides to every application.

When Brain View is active, the bottom 40% of the viewport becomes a resizable overlay with five tab panels. Each panel maps a technical HexDI capability to a Porygon nervous system metaphor: the dependency graph is the Neural Map, trace spans are Synapse Activity, container scopes are Memory Banks, state machines are the Thought Process, and health metrics are Vital Signs.

Every panel sources its data from real HexDI inspection hooks -- `useSnapshot()`, `useScopeTree()`, `useTracingSummary()`, `useUnifiedSnapshot()`, and `useInspector()`. No synthetic data. The Brain View shows exactly what HexDI knows about the running application.

---

## 2. Brain View Toggle

### 2.1 Activation Mechanisms

Two ways to toggle Brain View:

- **Keyboard shortcut:** `Ctrl+Shift+B` (or `Cmd+Shift+B` on macOS). A global `keydown` listener registered once in `App.tsx`.
- **Header button:** A button in the application header with a Porygon silhouette icon. Visible on every page.

### 2.2 State Management

Brain View visibility is a boolean stored in a React context (`BrainViewContext`). The context also stores the currently selected panel tab index. Both values persist to `localStorage` so that refreshing the page retains the user's Brain View state and selected tab.

```typescript
interface BrainViewState {
  readonly isOpen: boolean;
  readonly activePanel: PanelId;
  readonly panelHeight: number;
}

type PanelId =
  | "neural-map"
  | "synapse-activity"
  | "memory-banks"
  | "thought-process"
  | "vital-signs";
```

### 2.3 Overlay Layout

```
+----------------------------------------------------------+
|  Header  [Discovery] [Evolution] [Type] [Battle] [Trade] |
|  [Research]                              [Porygon Brain]  |
+----------------------------------------------------------+
|                                                            |
|              Feature Content (top 60%)                     |
|                                                            |
+----------------------------------------------------------+ <-- drag handle
| [Neural Map] [Synapse Activity] [Memory Banks]             |
|              [Thought Process] [Vital Signs]               |
+----------------------------------------------------------+
|                                                            |
|              Panel Content (bottom 40%)                    |
|                                                            |
+----------------------------------------------------------+
```

- Default overlay height: 40% of the viewport
- Resizable via drag handle at the top edge of the overlay
- Minimum height: 200px; maximum height: 80% of viewport
- Panel height persisted to `localStorage`
- The five tab buttons use Porygon-themed icons with the metaphor name as label and the technical name in parentheses

### 2.4 Provider Architecture

Brain View components require an `InspectorProvider` ancestor. The root `App.tsx` wraps the entire application:

```typescript
import { InspectorProvider } from "@hex-di/react";

function App() {
  return (
    <HexDiContainerProvider container={container}>
      <InspectorProvider inspector={container.inspector}>
        <BrainViewProvider>
          <AppRoutes />
          <BrainOverlay />
        </BrainViewProvider>
      </InspectorProvider>
    </HexDiContainerProvider>
  );
}
```

---

## 3. Panel 1: Neural Map -- Live Dependency Graph

### 3.1 Data Source

The Neural Map reads from two primary hooks:

- `useSnapshot()` from `@hex-di/react` -- provides the `ContainerSnapshot` with singleton entries, scope tree, and phase
- `useInspector()` from `@hex-di/react` -- provides direct access to `InspectorAPI` for `getGraphData()` and `getAdapterInfo()` calls, plus `subscribe()` for real-time resolution events

The `InspectorAPI.getGraphData()` method returns a `ContainerGraphData` object:

```typescript
// From @hex-di/core
interface ContainerGraphData {
  readonly adapters: readonly VisualizableAdapter[];
  readonly containerName: string;
  readonly kind: "root" | "child" | "lazy";
  readonly parentName: string | null;
}

interface VisualizableAdapter {
  readonly portName: string;
  readonly lifetime: Lifetime; // "singleton" | "scoped" | "transient"
  readonly factoryKind: FactoryKind; // "sync" | "async"
  readonly dependencyNames: readonly string[];
  readonly origin: ServiceOrigin; // "own" | "inherited" | "overridden"
  readonly inheritanceMode?: InheritanceMode;
  readonly isOverride?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
```

For graph inspection metrics, the component calls `inspectGraph()` from `@hex-di/graph/advanced` on the graph instance (obtained via a `GraphPort` or passed through context). This provides:

```typescript
import {
  inspectGraph,
  computeTypeComplexity,
  buildDependencyMap,
  topologicalSort,
} from "@hex-di/graph/advanced";

// Full graph inspection with metrics
const inspection: GraphInspection = inspectGraph(graph);
// Properties: adapterCount, provides, dependencyMap, maxChainDepth,
//   typeComplexityScore, orphanPorts, suggestions, ports, directionSummary
```

### 3.2 Visualization

The dependency graph is rendered as a force-directed graph on an HTML Canvas element.

**Node representation:**

| Lifetime      | Color           | Shape                  |
| ------------- | --------------- | ---------------------- |
| `"singleton"` | Gold (#F59E0B)  | Circle, larger radius  |
| `"scoped"`    | Blue (#3B82F6)  | Circle, medium radius  |
| `"transient"` | Green (#10B981) | Circle, smaller radius |

**Edge representation:**

- Directed edges from dependent port to dependency port
- Arrow indicates "depends on" direction
- Edge color: gray (#6B7280) default, animated highlight during active resolution

**Node interaction:**

- Hover: Show tooltip with port name, lifetime, adapter origin
- Click: Open a sidebar detail panel with full port info:
  - Port name, lifetime, factory kind (sync/async)
  - Adapter origin (own, inherited, overridden)
  - Dependencies list (ports this service depends on)
  - Dependents list (ports that depend on this service)
  - Resolution count and average resolution time (from inspector subscription events)
  - Category and tags (from `VisualizableAdapter.metadata`)

**Live animation:**

- Subscribe to `InspectorAPI.subscribe()` and listen for `"resolution"` events
- On `{ type: "resolution", portName, duration, isCacheHit }`: pulse the corresponding node (scale up briefly, glow effect)
- On adapter swap (graph reconfiguration): animate edge additions/removals with fade transitions

### 3.3 Graph Metrics Overlay

A translucent badge in the top-right of the Neural Map canvas displays live metrics:

- **Nodes:** `inspection.adapterCount`
- **Edges:** Computed from `inspection.dependencyMap` (sum of all dependency arrays)
- **Max Depth:** `inspection.maxChainDepth`
- **Complexity:** `inspection.typeComplexityScore` with color coding (green < 50, yellow < 100, red >= 100)

### 3.4 Component Interface

```typescript
interface NeuralMapProps {
  readonly className?: string;
}

// Internal state
interface GraphNode {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly origin: ServiceOrigin;
  readonly factoryKind: FactoryKind;
  readonly metadata?: Readonly<Record<string, unknown>>;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulseIntensity: number;
}

interface GraphEdge {
  readonly from: string;
  readonly to: string;
  highlightIntensity: number;
}

interface NodeDetailData {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly origin: ServiceOrigin;
  readonly dependencies: readonly string[];
  readonly dependents: readonly string[];
  readonly resolutionCount: number;
  readonly avgResolutionMs: number;
  readonly category?: string;
  readonly tags: readonly string[];
}
```

---

## 4. Panel 2: Synapse Activity -- Live Trace Waterfall

### 4.1 Data Source

The Synapse Activity panel combines two data sources:

- `useTracingSummary()` from `@hex-di/react` -- provides aggregate metrics (`TracingSummary` with `totalSpans`, `errorCount`, `averageDuration`, `cacheHitRate`)
- A custom trace span buffer that captures individual spans from the `MemoryTracer` or the `TracingQueryAPI`

The tracing query API is created from `@hex-di/tracing`:

```typescript
import {
  createTracingQueryApi,
  filterSpans,
  buildTraceTree,
  computePercentiles,
  computeAverageDuration,
  computeErrorCount,
  computeCacheHitRate,
} from "@hex-di/tracing";

import type { TracingQueryAPI, SpanFilter, TraceTree, SpanSource } from "@hex-di/tracing";

// Access via the library inspector protocol
const tracingInspector = inspector.getLibraryInspector("tracing");
```

The `TracingQueryAPI` interface provides:

```typescript
interface TracingQueryAPI {
  getSpans(filter?: SpanFilter): readonly SpanData[];
  getTraceTree(traceId: string): TraceTree | undefined;
  getStatistics(): {
    totalSpans: number;
    errorCount: number;
    averageDuration: number;
    cacheHitRate: number;
  };
}
```

The `TraceTree` structure represents hierarchical span relationships:

```typescript
interface TraceTree {
  readonly span: SpanData;
  readonly children: readonly TraceTree[];
}
```

### 4.2 Span Buffer

A circular buffer of the most recent 500 `SpanData` objects. Spans are pushed into the buffer from the `MemoryTracer` subscription or by polling the `TracingQueryAPI`. The buffer is implemented as a ring buffer with O(1) insertion and automatic eviction of the oldest spans.

```typescript
interface SpanBufferEntry {
  readonly span: SpanData;
  readonly traceId: string;
  readonly parentSpanId: string | undefined;
  readonly operationName: string;
  readonly startTime: number;
  readonly duration: number;
  readonly status: SpanStatus;
  readonly attributes: Attributes;
  readonly service: "frontend" | "backend" | "pokeapi";
}
```

### 4.3 Waterfall Rendering

Each span is rendered as a horizontal bar in a scrollable timeline view.

**Bar positioning:**

- X-axis: time (left = earliest span start, right = latest span end)
- Y-axis: nesting level (parent spans above children, indented)
- Bar width: proportional to span duration
- Bar left offset: proportional to span start time relative to the earliest visible span

**Color by service:**

| Service     | Color                                |
| ----------- | ------------------------------------ |
| frontend    | Blue (#3B82F6)                       |
| backend     | Green (#10B981)                      |
| pokeapi     | Orange (#F97316)                     |
| error spans | Red (#EF4444), regardless of service |

**Nesting:**

- Parent-child relationships are shown by indentation
- Collapsible tree nodes for deep hierarchies
- Build tree structure using `buildTraceTree(traceId)` from `@hex-di/tracing`

**Span detail on click:**

Clicking a span bar opens a detail panel showing:

- Operation name (e.g., `resolve:PokemonList`, `flow:battle/idle->turn_start`)
- Duration in milliseconds
- All span attributes as key-value pairs
- Span events (errors, annotations)
- Trace ID and Span ID
- "Open in Jaeger" link: `http://localhost:16686/trace/{traceId}`

### 4.4 Filters and Controls

- **Port name filter:** Text input to filter spans by `hex-di.port.name` attribute
- **Status filter:** Dropdown with "All", "OK", "Error" options
- **Min duration filter:** Number input for minimum span duration in milliseconds
- **Auto-scroll toggle:** When enabled, the waterfall automatically scrolls to show the newest spans. Disabled when the user manually scrolls.
- **Clear buffer button:** Resets the circular buffer

### 4.5 Component Interface

```typescript
interface SynapseActivityProps {
  readonly className?: string;
}

interface WaterfallSpan {
  readonly id: string;
  readonly traceId: string;
  readonly parentId: string | undefined;
  readonly operationName: string;
  readonly service: "frontend" | "backend" | "pokeapi";
  readonly startTime: number;
  readonly duration: number;
  readonly status: "ok" | "error";
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly depth: number;
}

interface SpanDetailData {
  readonly operationName: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly duration: number;
  readonly status: "ok" | "error";
  readonly attributes: ReadonlyArray<{ key: string; value: unknown }>;
  readonly events: ReadonlyArray<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }>;
  readonly jaegerUrl: string;
}

interface WaterfallFilters {
  portName: string;
  status: "all" | "ok" | "error";
  minDuration: number;
}
```

---

## 5. Panel 3: Memory Banks -- Container Scope Tree

### 5.1 Data Source

- `useScopeTree()` from `@hex-di/react` -- returns the reactive `ScopeTree` structure, re-rendering when scopes are created or disposed
- `useInspector()` for subscribing to `"scope-created"` and `"scope-disposed"` events

The `ScopeTree` type from `@hex-di/core`:

```typescript
interface ScopeTree {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly children: readonly ScopeTree[];
  readonly resolvedPorts: readonly string[];
}
```

The `InspectorEvent` scope events:

```typescript
// From InspectorAPI.subscribe()
type InspectorEvent =
  | { readonly type: "scope-created"; readonly scope: ScopeEventInfo }
  | { readonly type: "scope-disposed"; readonly scopeId: string }
  | ...;

interface ScopeEventInfo {
  readonly id: string;
  readonly parentId: string | undefined;
  readonly createdAt: number;
  readonly scopeId: string;
  readonly scopeName: string | undefined;
}
```

### 5.2 Tree Rendering

The scope tree is rendered as an indented tree with connecting lines:

```
Root Container "PokeNerve" (12 singletons)
+-- Session Scope (3 services)
|   +-- Battle Scope [active] (5 services)
|   +-- Trading Scope [disposed] (4 services)
+-- Request Scope #47 [active] (2 services)
+-- Request Scope #48 [active] (1 service)
```

**Status indicators:**

| Status    | Indicator                                 |
| --------- | ----------------------------------------- |
| Active    | Green dot, full opacity                   |
| Disposing | Yellow dot, pulsing opacity               |
| Disposed  | Gray dot, 50% opacity, strikethrough text |

**Real-time transitions:**

- New scopes appear with a slide-in + fade-in animation (200ms ease-out)
- Disposed scopes transition to 50% opacity with strikethrough over 500ms, then optionally collapse after 3 seconds
- The `ScopeEventInfo.createdAt` timestamp is displayed as relative time ("2s ago", "5m ago")

### 5.3 Scope Detail

Clicking a scope node shows a detail panel:

- Scope ID
- Scope name (if named, e.g., "Battle Scope")
- Creation timestamp (absolute and relative)
- Parent scope ID
- Service count: `resolvedCount` / `totalCount`
- Resolved port names list (from `ScopeTree.resolvedPorts`)
- Status: active / disposed

### 5.4 Component Interface

```typescript
interface MemoryBanksProps {
  readonly className?: string;
}

interface ScopeNodeData {
  readonly id: string;
  readonly name: string | undefined;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly resolvedPorts: readonly string[];
  readonly createdAt: number;
  readonly parentId: string | undefined;
  readonly children: readonly ScopeNodeData[];
  readonly depth: number;
}
```

---

## 6. Panel 4: Thought Process -- Flow State Machine Inspector

### 6.1 Data Source

The Thought Process panel reads from the Flow library's introspection system, accessed through the library inspector protocol:

```typescript
// Access the Flow library inspector
const flowInspector = inspector.getLibraryInspector("flow");

// Or use the FlowInspector directly if resolved from container
import type { FlowInspector, FlowRegistry, RegistryEntry, HealthEvent } from "@hex-di/flow";
```

The `FlowInspector` provides:

```typescript
interface FlowInspector {
  getMachineState(portName: string, instanceId: string): MachineStateSnapshot | undefined;
  getValidTransitions(portName: string, instanceId: string): readonly string[];
  getRunningActivities(portName: string, instanceId: string): readonly ActivityInstance[];
  getEventHistory(
    portName: string,
    instanceId: string,
    options?: { limit?: number }
  ): readonly FlowTransitionEvent[];
  getStateHistory(portName: string, instanceId: string): readonly string[];
  getAllMachinesSnapshot(): ReadonlyMap<string, readonly RegistryEntry[]>;
  getMachinesByState(stateName: string): readonly RegistryEntry[];
  getHealthEvents(): readonly HealthEvent[];
}
```

The `FlowRegistry` tracks all active machine instances:

```typescript
interface FlowRegistry {
  getAllPortNames(): readonly string[];
  getAllMachines(portName: string): readonly RegistryEntry[];
  getMachine(portName: string, instanceId: string): RegistryEntry | undefined;
  getTotalMachineCount(): number;
}
```

The `RegistryEntry` provides the `MachineRunner` and metadata:

```typescript
interface RegistryEntry {
  readonly portName: string;
  readonly instanceId: string;
  readonly runner: MachineRunnerAny;
  readonly machineId: string;
  readonly registeredAt: number;
}
```

The `MachineRunner` provides snapshots:

```typescript
interface MachineSnapshot {
  readonly state: string;
  readonly context: unknown;
  readonly activities: ReadonlyMap<string, ActivityInstance>;
  readonly pendingEvents: readonly PendingEvent[];
}
```

### 6.2 Machine List

The panel shows all currently active machines grouped by type:

```
Battle Machine (battle-1)        [active: move_execution]
Evolution Machine (eevee-evo)    [active: selecting_stone]
Navigation Machine (nav)         [active: battle_page]
```

Each machine entry shows:

- Machine ID (from `defineMachine({ id: ... })`)
- Instance ID (from `RegistryEntry.instanceId`)
- Current state name (from `runner.snapshot().state`)
- Status badge: active (green), final (blue), error (red)

### 6.3 Machine State Diagram

For the selected machine, render a state diagram as connected nodes:

**State node rendering:**

- Each state is a rounded rectangle with the state name inside
- The current state has a glow effect (colored border, subtle shadow)
- Final states have a double border
- States with `type: "parallel"` regions show sub-region boxes

**Transition edges:**

- Arrows from source state to target state
- Edge label shows the event name
- Guard conditions shown as `[guardName]` on the edge label
- Edges from the current state are highlighted; other edges are dimmed

**Machine metadata extraction:**

Use `computeFlowMetadata()` from `@hex-di/flow` to extract the machine structure:

```typescript
import { computeFlowMetadata, type FlowAdapterMetadata } from "@hex-di/flow";

// FlowAdapterMetadata provides:
interface FlowAdapterMetadata {
  readonly machineId: string;
  readonly stateNames: readonly string[];
  readonly eventNames: readonly string[];
  readonly initialState: string;
  readonly finalStates: readonly string[];
  readonly transitionsPerState: Readonly<Record<string, readonly TransitionDetail[]>>;
  readonly activityPortNames: readonly string[];
}

interface TransitionDetail {
  readonly event: string;
  readonly target: string;
  readonly hasGuard: boolean;
}
```

### 6.4 Valid Transitions and Guards

Below the state diagram, show a table of valid transitions from the current state:

| Event       | Target      | Guard   | Status                     |
| ----------- | ----------- | ------- | -------------------------- |
| SELECT_MOVE | move_select | --      | Ready                      |
| FLEE        | battle_end  | canFlee | Blocked (friendship < 100) |

Guard status is determined by evaluating the guard against the current context. Display "Ready" (green) when the guard passes or is absent, "Blocked" (red) with the reason when it fails.

### 6.5 Running Activities

For each running activity in the machine:

- Activity port name
- Status: running (spinner), completed (check), failed (x), cancelled (stop)
- Progress indicator if the activity emits progress events

### 6.6 State History Timeline

A chronological list of past transitions:

```
14:32:05.123  idle -> team_preview        [START_BATTLE]
14:32:07.456  team_preview -> turn_start  [CONFIRM_TEAM]
14:32:12.789  turn_start -> move_select   [TURN_READY]
14:32:15.012  move_select -> move_execute [SELECT_MOVE { move: "thunderbolt" }]
```

Each entry shows: timestamp, source state -> target state, triggering event with payload summary.

### 6.7 Component Interface

```typescript
interface ThoughtProcessProps {
  readonly className?: string;
}

interface MachineListEntry {
  readonly machineId: string;
  readonly instanceId: string;
  readonly portName: string;
  readonly currentState: string;
  readonly isFinal: boolean;
  readonly registeredAt: number;
}

interface MachineDetailData {
  readonly metadata: FlowAdapterMetadata;
  readonly currentState: string;
  readonly context: unknown;
  readonly validTransitions: readonly TransitionDetail[];
  readonly activities: readonly ActivityInstanceData[];
  readonly stateHistory: readonly StateHistoryEntry[];
}

interface ActivityInstanceData {
  readonly id: string;
  readonly portName: string;
  readonly status: ActivityStatus;
}

interface StateHistoryEntry {
  readonly timestamp: number;
  readonly fromState: string;
  readonly toState: string;
  readonly event: string;
  readonly payload?: unknown;
}
```

---

## 7. Panel 5: Vital Signs -- Health Metrics Dashboard

### 7.1 Data Source

Vital Signs aggregates data from multiple sources:

- `useTracingSummary()` from `@hex-di/react` -- provides `TracingSummary { totalSpans, errorCount, averageDuration, cacheHitRate }`
- `useSnapshot()` for container phase and singleton count
- `useScopeTree()` for active scope count
- `useInspector()` for `subscribe()` to resolution events (timing data), `getAllResultStatistics()` for per-port error rates, and `getHighErrorRatePorts(threshold)` for alerting
- The `computePercentiles()` function from `@hex-di/tracing` for p50/p95/p99 computation

```typescript
import { computePercentiles, computeAverageDuration, computeErrorCount } from "@hex-di/tracing";

// computePercentiles(durations: number[], percentiles: number[]): number[]
// Example: computePercentiles(allDurations, [50, 95, 99]) => [2.1, 15.3, 45.8]
```

The `ResultStatistics` from `InspectorAPI`:

```typescript
interface ResultStatistics {
  readonly portName: string;
  readonly totalCalls: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly errorRate: number;
  readonly errorsByCode: ReadonlyMap<string, number>;
  readonly lastError?: { readonly code: string; readonly timestamp: number };
}
```

### 7.2 Metrics Cards

Each metric is displayed as a card with a label, current value, sparkline chart, and status color.

**Resolution Performance:**

- Label: "Neural Response Time" (Resolution Performance)
- Values: p50, p95, p99 latencies in milliseconds
- Computed from a rolling window of the last 60 seconds of resolution events
- Sparkline: p95 over time (60 data points, 1 per second)
- Thresholds: green (p95 < 10ms), yellow (p95 < 50ms), red (p95 >= 50ms)

**Cache Hit Rate:**

- Label: "Memory Efficiency" (Cache Hit Rate)
- Value: percentage from `TracingSummary.cacheHitRate`
- Sparkline: cache hit rate over time
- Thresholds: green (> 80%), yellow (> 50%), red (<= 50%)

**Error Rate:**

- Label: "Pain Signals" (Error Rate)
- Value: `errorCount / totalSpans` from `TracingSummary`
- Sparkline: error rate over time
- Thresholds: green (< 1%), yellow (< 5%), red (>= 5%)
- Clicking shows `getHighErrorRatePorts(0.05)` results -- ports with error rates above 5%

**Active Scope Count:**

- Label: "Active Memory Banks" (Active Scopes)
- Value: count of `ScopeTree` nodes with `status === "active"`
- Sparkline: active scope count over time
- Thresholds: green (< 20), yellow (< 50), red (>= 50)

**Trace Export Health:**

- Label: "Synapse Throughput" (Trace Export)
- Value: total spans exported (from `TracingSummary.totalSpans`)
- Sparkline: spans per second over time
- Thresholds: always green (informational metric)

**Uptime:**

- Label: "Time Alive" (Uptime)
- Value: elapsed time since the root container was created
- Format: "Xh Ym Zs"
- Thresholds: always green (informational)

### 7.3 Sparkline Implementation

Each sparkline is a 120px wide, 30px tall inline SVG. The data is a circular buffer of 60 samples, updated every 1 second. Each sample is a snapshot of the metric value at that point in time.

```typescript
interface SparklineData {
  readonly values: readonly number[];
  readonly maxValue: number;
  readonly minValue: number;
  readonly currentIndex: number;
}

type HealthStatus = "healthy" | "warning" | "critical";

interface MetricCardData {
  readonly label: string;
  readonly technicalLabel: string;
  readonly value: string;
  readonly sparkline: SparklineData;
  readonly status: HealthStatus;
}
```

### 7.4 Component Interface

```typescript
interface VitalSignsProps {
  readonly className?: string;
}

interface VitalSignsState {
  readonly resolutionP50: number;
  readonly resolutionP95: number;
  readonly resolutionP99: number;
  readonly cacheHitRate: number;
  readonly errorRate: number;
  readonly activeScopeCount: number;
  readonly totalSpansExported: number;
  readonly uptimeMs: number;
  readonly sparklines: Readonly<Record<string, SparklineData>>;
}
```

---

## 8. Porygon Narrative Integration

### 8.1 Panel Headers

Each panel tab and header uses the Porygon metaphor name with the technical name in parentheses:

| Panel | Metaphor Name    | Technical Name   | Icon                |
| ----- | ---------------- | ---------------- | ------------------- |
| 1     | Neural Map       | Dependency Graph | Brain network icon  |
| 2     | Synapse Activity | Trace Waterfall  | Lightning bolt icon |
| 3     | Memory Banks     | Scope Tree       | Memory chip icon    |
| 4     | Thought Process  | State Machines   | Gear/cog icon       |
| 5     | Vital Signs      | Health Metrics   | Heart pulse icon    |

### 8.2 Animations

- **Node pulse (Neural Map):** When a port is resolved, the corresponding node briefly scales up (1.0 -> 1.3 -> 1.0 over 300ms) with a glow effect. This represents a "neuron firing."
- **Edge highlight (Neural Map):** During dependency traversal, edges light up in sequence from the resolved node through its dependency chain. This represents "synaptic impulse propagation."
- **Scope appear (Memory Banks):** New scopes fade in with a blue glow, representing "memory allocation."
- **Scope dispose (Memory Banks):** Disposed scopes fade to gray with a dissolve effect, representing "memory release."
- **State glow (Thought Process):** The current state node has a soft pulsing glow (opacity 0.6 -> 1.0 -> 0.6 over 2 seconds), representing "active thought."
- **Error highlight (Synapse Activity):** Error spans flash red briefly on appearance, representing "pain signals."

### 8.3 Brain View Header

The overlay header bar contains:

- Porygon silhouette icon (left-aligned)
- "Porygon's Brain" title text
- Tab buttons for the five panels
- Minimize button (right-aligned) that collapses the overlay
- Close button (right-aligned) that hides Brain View entirely

---

## 9. Performance Considerations

### 9.1 Lazy Mounting

Brain View components only mount when the overlay is visible. When Brain View is closed, the `BrainOverlay` component renders `null`. This ensures zero CPU or memory overhead when Brain View is not in use.

Within the overlay, only the active panel is mounted. The other four panels render `null`. Panel state (scroll position, selected items) is preserved in the `BrainViewContext` so switching tabs does not lose user context.

### 9.2 Trace Buffer Cap

The span circular buffer is capped at 500 entries. When the buffer is full, the oldest span is evicted on each new insertion. This bounds memory usage regardless of application activity volume.

### 9.3 Graph Visualization Throttle

The Neural Map canvas rendering is throttled to 30fps using `requestAnimationFrame` with frame skipping. Force simulation updates run at 60 iterations per second but canvas paint is limited to every other frame. Node pulse animations are accumulated and batched into the next paint frame.

### 9.4 Scope Tree Debounce

Scope tree updates from `useScopeTree()` are debounced at 100ms. Multiple rapid scope creation or disposal events within a 100ms window are batched into a single re-render. This prevents layout thrashing during high-frequency scope operations (e.g., rapid API request handling).

### 9.5 Sparkline Sampling

Vital Signs sparkline data is sampled at 1-second intervals using a `setInterval` inside a `useEffect`. The sampling callback reads the latest metric values and pushes them into the sparkline circular buffer. The sparkline SVG only re-renders when the buffer is updated (once per second).

### 9.6 Inspector Subscription Consolidation

All five panels share a single `InspectorAPI.subscribe()` call in the `BrainOverlay` parent component. Events are dispatched to child panels via React context rather than each panel maintaining its own subscription. This reduces the number of active listeners on the inspector.

---

## 10. Acceptance Criteria

### 10.1 Toggle

- [ ] `Ctrl+Shift+B` toggles Brain View overlay visibility
- [ ] Header button toggles Brain View overlay visibility
- [ ] Overlay defaults to 40% viewport height
- [ ] Overlay is resizable via drag handle
- [ ] Selected panel tab persists across navigation and page refresh

### 10.2 Neural Map

- [ ] Dependency graph renders all registered ports as nodes
- [ ] Edges connect ports to their dependencies
- [ ] Nodes are colored by lifetime: singleton=gold, scoped=blue, transient=green
- [ ] Clicking a node opens a detail sidebar with port info, resolution count, and avg time
- [ ] Node pulse animation fires on port resolution events
- [ ] Graph metrics (node count, edge count, depth, complexity) display correctly
- [ ] Adapter switch causes visible graph edge changes

### 10.3 Synapse Activity

- [ ] Trace spans appear as horizontal bars in a waterfall layout
- [ ] Bars are color-coded by service (frontend=blue, backend=green, pokeapi=orange)
- [ ] Error spans render in red
- [ ] Nesting shows parent-child span relationships
- [ ] Clicking a span shows detail panel with attributes and events
- [ ] "Open in Jaeger" link navigates to `http://localhost:16686/trace/{traceId}`
- [ ] Filter by port name, status, and minimum duration works
- [ ] Auto-scroll follows newest spans
- [ ] Buffer is capped at 500 spans

### 10.4 Memory Banks

- [ ] Scope tree renders with proper indentation and connecting lines
- [ ] Active scopes show green status dot
- [ ] Disposed scopes show gray status dot with reduced opacity
- [ ] New scopes appear with fade-in animation
- [ ] Disposed scopes fade out over 500ms
- [ ] Clicking a scope shows detail panel with ID, name, service count, resolved ports
- [ ] Navigating between features creates and destroys scopes visibly

### 10.5 Thought Process

- [ ] All active Flow machines are listed
- [ ] Selecting a machine shows its state diagram
- [ ] Current state has glow highlight
- [ ] Valid transitions are listed with guard status
- [ ] Running activities are shown with status
- [ ] State history timeline shows past transitions with timestamps
- [ ] Battle machine updates in real-time during a battle

### 10.6 Vital Signs

- [ ] Resolution performance (p50, p95, p99) displays correctly
- [ ] Cache hit rate displays as percentage
- [ ] Error rate displays correctly
- [ ] Active scope count matches actual scope count
- [ ] Sparkline charts update every second
- [ ] Color thresholds change correctly (green/yellow/red)
- [ ] Uptime counter increments continuously

### 10.7 Performance

- [ ] Brain View components do not mount when overlay is closed
- [ ] Only the active panel is mounted
- [ ] Graph visualization runs at 30fps without dropped frames
- [ ] Scope tree updates are debounced at 100ms
- [ ] No memory leaks after toggling Brain View open/closed 50 times

---

_End of Feature 7 specification._
