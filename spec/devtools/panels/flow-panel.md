# Flow Panel -- Statechart Visualization

**Module**: `@hex-di/flow/devtools`
**Inspiration**: Stately (stately.ai), XState Inspector
**Parent Spec**: [04-panels.md Section 15.2](../04-panels.md#152-flow-panel-statechart-visualization)

This document is the detailed specification for the Flow Panel, a dedicated DevTools panel shipped by `@hex-di/flow` at the entry point `@hex-di/flow/devtools`. The dashboard discovers it via the `panelModule` field on the Flow library's `LibraryInspector`. When the module is unavailable or fails to load, the dashboard falls back to the generic JSON tree viewer described in [04-panels.md Section 12](../04-panels.md#section-12-library-panels-and-event-log).

---

## 1. Purpose and Motivation

Flow machines are statecharts -- directed graphs of states connected by event-driven transitions, with guards, entry/exit effects, and long-running activities. The generic JSON tree viewer from Section 12 can display the raw `FlowLibrarySnapshot` but lacks the spatial structure that makes statecharts useful: you cannot see which state is active, which transitions are possible, or how the machine evolves over time.

The Flow Panel solves this by rendering an interactive SVG statechart as the primary view. At a glance, developers can see:

- **Where the machine is now** -- the current state is highlighted, with all outgoing transitions visible as arrows.
- **How it got there** -- the activity log shows a chronological list of recent state transitions with timestamps.
- **What it can do next** -- available transitions from the current state are visually distinct from unreachable paths.
- **What went wrong** -- effect statistics surface ok/err rates per effect name, and health events flag machines that have entered error or degraded states.
- **How machines relate to scopes** -- clicking a `scopeId` navigates to the Scope Tree panel, and clicking a `portName` navigates to the Container panel.

Without the statechart visualization, developers must mentally reconstruct the machine topology from raw state names, transition event types, and guard conditions. The Flow Panel eliminates this cognitive overhead by making the machine structure directly visible and interactive.

---

## 2. Data Model

All interfaces in this section describe the data flowing from the target application's `FlowInspector` through the WebSocket transport into the dashboard's `RemoteInspectorAPI`. The dashboard reconstructs these structures from serialized JSON messages.

### 2.1 FlowLibrarySnapshot

The top-level snapshot returned by the Flow library's `LibraryInspector.getSnapshot()`. This is the `snapshot` prop passed to the `FlowPanel` component.

```typescript
interface FlowLibrarySnapshot {
  /** Total number of registered machine instances across all ports. */
  readonly machineCount: number;

  /** All registered machine entries, one per live instance. */
  readonly machines: readonly FlowMachineEntry[];

  /** Recent health events (errors, degradations, recoveries). */
  readonly healthEvents: readonly FlowHealthEvent[];

  /** Aggregate effect execution statistics keyed by "portName.method". */
  readonly effectStatistics: readonly FlowEffectStatistic[];

  /** Recent transition events from the FlowCollector. */
  readonly recentTransitions: readonly FlowTransitionEntry[];

  /** Aggregate transition stats from FlowStats. */
  readonly stats: FlowAggregateStats;
}
```

### 2.2 FlowMachineEntry

One entry per live machine instance. Derived from `RegistryEntry` combined with the machine's structural definition. The `definition` field is populated from the graph metadata (compile-time structural data from `VisualizableAdapter.metadata`) so the statechart can be rendered even when the machine is idle.

```typescript
interface FlowMachineEntry {
  /** The port name this machine was registered under. */
  readonly portName: string;

  /** Unique instance identifier (e.g., "OrderFlow-1"). */
  readonly instanceId: string;

  /** The machine's `id` property from its definition. */
  readonly machineId: string;

  /** The current top-level state name. */
  readonly currentState: string;

  /**
   * The full active state value. For flat machines this equals currentState.
   * For compound machines this is a nested object (e.g., { active: "loading" }).
   */
  readonly stateValue: string | { readonly [key: string]: unknown };

  /** The scope ID where this machine lives. */
  readonly scopeId: string;

  /** Running activity instances tracked by the machine. */
  readonly activities: readonly FlowActivityEntry[];

  /** Events valid from the current state. */
  readonly validEvents: readonly string[];

  /**
   * The machine's structural definition for statechart rendering.
   * Populated from graph metadata at registration time.
   */
  readonly definition: FlowMachineDefinition;

  /**
   * Health status derived from healthEvents for this machine.
   * "healthy" = no recent errors; "degraded" = recent effect failures;
   * "error" = machine is in a final error state.
   */
  readonly health: "healthy" | "degraded" | "error";
}
```

### 2.3 FlowMachineDefinition

The structural definition of a machine, extracted at adapter registration time and attached to the graph node as metadata. This is compile-time data -- it does not change at runtime.

```typescript
interface FlowMachineDefinition {
  /** The machine's unique identifier. */
  readonly machineId: string;

  /** The initial state name. */
  readonly initialState: string;

  /** All state names in the machine. */
  readonly stateNames: readonly string[];

  /** Final state names (states with type: "final" or no outgoing transitions). */
  readonly finalStates: readonly string[];

  /** Per-state structural information. */
  readonly states: Readonly<Record<string, FlowStateDefinition>>;

  /** All event type names handled by the machine. */
  readonly eventNames: readonly string[];
}

interface FlowStateDefinition {
  /** The state node type. */
  readonly type: "atomic" | "compound" | "parallel" | "final" | "history";

  /** Outgoing transitions from this state. */
  readonly transitions: readonly FlowTransitionDefinition[];

  /** Entry effect descriptors (tag names only, for display). */
  readonly entryEffects: readonly string[];

  /** Exit effect descriptors (tag names only, for display). */
  readonly exitEffects: readonly string[];

  /** Activity port names spawned in this state. */
  readonly activityPortNames: readonly string[];

  /** For compound states: the initial child state name. */
  readonly initial?: string;

  /** For compound states: nested child state definitions. */
  readonly children?: Readonly<Record<string, FlowStateDefinition>>;
}

interface FlowTransitionDefinition {
  /** The event type that triggers this transition. */
  readonly event: string;

  /** The target state name. */
  readonly target: string;

  /** Whether a guard function is defined (name or boolean). */
  readonly hasGuard: boolean;

  /** The guard name, if available. */
  readonly guardName?: string;

  /** Whether effects are produced by this transition. */
  readonly hasEffects: boolean;
}
```

### 2.4 FlowTransitionEntry

A single observed state transition from the FlowCollector. These feed the activity log.

```typescript
interface FlowTransitionEntry {
  /** Unique transition event ID. */
  readonly id: string;

  /** The machine that transitioned. */
  readonly machineId: string;

  /** Unix timestamp (milliseconds). */
  readonly timestamp: number;

  /** The state before the transition. */
  readonly fromState: string;

  /** The state after the transition. */
  readonly toState: string;

  /** The event type that triggered the transition. */
  readonly event: string;

  /** Duration of the transition in milliseconds. */
  readonly duration: number;

  /** Number of effects produced by this transition. */
  readonly effectCount: number;
}
```

### 2.5 FlowEffectStatistic

Aggregate ok/err counts for a specific effect, derived from `FlowInspector.getEffectResultStatistics()`.

```typescript
interface FlowEffectStatistic {
  /** The effect key in "portName.method" format. */
  readonly effectName: string;

  /** Number of successful executions. */
  readonly okCount: number;

  /** Number of failed executions. */
  readonly errCount: number;

  /** Average execution duration in milliseconds. */
  readonly avgDurationMs: number;
}
```

### 2.6 FlowHealthEvent

Health events emitted when machines enter error, degraded, or recovered states. Serialized from the `HealthEvent` discriminated union in `libs/flow/core/src/introspection/types.ts`.

```typescript
type FlowHealthEvent =
  | {
      readonly kind: "flow-error";
      readonly machineId: string;
      readonly state: string;
      readonly message: string;
      readonly timestamp: number;
    }
  | {
      readonly kind: "flow-degraded";
      readonly machineId: string;
      readonly failureCount: number;
      readonly message: string;
      readonly timestamp: number;
    }
  | {
      readonly kind: "flow-recovered";
      readonly machineId: string;
      readonly fromState: string;
      readonly message: string;
      readonly timestamp: number;
    };
```

### 2.7 FlowActivityEntry

Serialized from `ActivityInstance` for display in the statechart and machine detail.

```typescript
interface FlowActivityEntry {
  /** Unique activity instance ID. */
  readonly id: string;

  /** Current lifecycle status. */
  readonly status: "pending" | "running" | "completed" | "failed" | "cancelled";

  /** Timestamp when the activity started. */
  readonly startTime: number;

  /** Timestamp when the activity ended. Undefined if still running. */
  readonly endTime: number | undefined;
}
```

### 2.8 FlowAggregateStats

Summary statistics from `FlowStats`.

```typescript
interface FlowAggregateStats {
  readonly totalTransitions: number;
  readonly averageDuration: number;
  readonly slowCount: number;
}
```

### 2.9 StatechartNode and StatechartEdge

Computed layout data for SVG rendering. These are not transmitted over WebSocket -- they are computed client-side by the layout algorithm from `FlowMachineDefinition` and `FlowMachineEntry.currentState`.

```typescript
interface StatechartNode {
  /** The state identifier (dot-path for nested states, e.g., "active.loading"). */
  readonly stateId: string;

  /** Display label (the leaf state name). */
  readonly label: string;

  /** Whether this state is the currently active state. */
  readonly isCurrent: boolean;

  /** Whether this is the machine's initial state. */
  readonly isInitial: boolean;

  /** Whether this is a final state. */
  readonly isFinal: boolean;

  /** State node type from the definition. */
  readonly type: "atomic" | "compound" | "parallel" | "final" | "history";

  /** Computed x position in SVG coordinate space. */
  readonly x: number;

  /** Computed y position in SVG coordinate space. */
  readonly y: number;

  /** Computed width based on label and contained children. */
  readonly width: number;

  /** Computed height based on label and contained children. */
  readonly height: number;

  /** Entry effect names for the detail overlay. */
  readonly entryEffects: readonly string[];

  /** Exit effect names for the detail overlay. */
  readonly exitEffects: readonly string[];

  /** Activity port names spawned in this state. */
  readonly activityPortNames: readonly string[];
}

interface StatechartEdge {
  /** Source state identifier. */
  readonly from: string;

  /** Target state identifier. */
  readonly to: string;

  /** The event type that triggers this transition. */
  readonly event: string;

  /** Guard name, if defined. */
  readonly guard?: string;

  /**
   * Computed path points for SVG rendering.
   * Array of {x, y} points defining the edge route.
   */
  readonly points: readonly { readonly x: number; readonly y: number }[];

  /** Whether this is a self-transition (from === to). */
  readonly isSelfTransition: boolean;
}
```

### 2.10 StatechartLayout

The complete computed layout for a single machine's statechart.

```typescript
interface StatechartLayout {
  /** All state nodes with computed positions. */
  readonly nodes: readonly StatechartNode[];

  /** All transition edges with computed routes. */
  readonly edges: readonly StatechartEdge[];

  /** Total width of the layout bounding box. */
  readonly width: number;

  /** Total height of the layout bounding box. */
  readonly height: number;

  /** Padding applied around the layout for viewport fitting. */
  readonly padding: number;
}
```

---

## 3. Layout and Wireframes

### 3.1 Main Two-Pane Layout

The Flow Panel uses a horizontal split layout: a left sidebar (fixed width, 280px default, resizable) containing the machine list and activity log, and a right main area containing the statechart viewer, effect statistics, and state detail overlay.

```
+-------------------------------------------------------------+
| FLOW MACHINES (3)                                [Refresh]   |
+----------------------+--------------------------------------+
| MACHINE LIST         | STATECHART: OrderFlow                |
|                      | [Zoom +] [Zoom -] [Fit] [Reset]     |
| * OrderFlow          |                                       |
|   state: processing  |    [*]---> +----------+               |
|   scope: req-123     |           |   idle   |               |
|                      |           +----+-----+               |
| . CartFlow           |                | START                |
|   state: idle        |           +----v-----+  +----------+ |
|                      |           |processing+->| complete | |
| . AuthFlow           |           +----+-----+  +==========+ |
|   state: authenticated           | ERROR                     |
|                      |      +----v-----+                     |
+----------------------+      |  failed  |                     |
|                      |      +==========+                     |
| ACTIVITY LOG         |                                       |
| -------------------- | Current: processing                   |
| 14:30:05 processing  | Activities: [payment-poll] (12s)      |
|  <- validating       |                                       |
| 14:29:58 validating  | EFFECT STATISTICS                     |
|  <- idle (START)     | +------------------+-----+-----+----+ |
| 14:29:55 idle        | | Effect           | Ok  | Err | Avg| |
|  (initial)           | +------------------+-----+-----+----+ |
|                      | | processPayment   |  4  |  1  | 45 | |
|                      | | validateOrder    | 12  |  0  | 12 | |
+----------------------+--------------------------------------+
```

### 3.2 Machine List Item Anatomy

Each machine in the list renders as a compact row:

```
+----------------------------------------------------+
| [*] OrderFlow                        [processing]  |
|     scope: req-123                                  |
+----------------------------------------------------+

Legend:
  [*] = Status dot (filled circle). Color:
        green = healthy, amber = degraded, red = error
  "OrderFlow" = portName (monospace, --hex-font-mono)
  [processing] = Current state badge (pill shape, --hex-radius-pill)
  "scope: req-123" = Scope ID (clickable link, --hex-text-secondary)
```

The selected machine has a `--hex-bg-active` background and a left accent border (`--hex-accent`, 3px).

### 3.3 Statechart SVG Anatomy

States are rendered as rounded rectangles. Transitions are arrows with event labels.

```
State Node (atomic):
+------------------+
|                  |  Rounded corners: --hex-radius-md (6px)
|   state-name     |  Border: 2px solid --hex-border
|                  |  Fill: --hex-bg-secondary
+------------------+  Font: --hex-font-mono, --hex-font-size-sm

State Node (current, highlighted):
+==================+
|                  |  Border: 3px solid --hex-accent
|   state-name     |  Fill: --hex-accent-muted
|                  |  Text: --hex-accent (bold)
+==================+

State Node (initial indicator):
  [*]---> +----------+     A filled circle (8px diameter, --hex-text-primary)
          |  idle    |     connected by an arrow to the initial state.
          +----------+

State Node (final):
+=================+
||               ||  Double border: outer 2px + inner 2px with 2px gap.
||  completed    ||  No outgoing transitions.
||               ||
+=================+

Compound State (container):
+------------------------------+
| active                       |  Dashed border: 2px dashed --hex-border
| +-----------+ +-----------+  |  Label in top-left corner
| | loading   | | editing   |  |  Children laid out inside
| +-----------+ +-----------+  |
+------------------------------+

Transition Arrow:
  +-------+   EVENT_NAME   +-------+
  | from  |--------------->| to    |
  +-------+  [guardName]   +-------+

  Arrow: --hex-text-secondary, 1.5px stroke
  Event label: --hex-font-mono, --hex-font-size-xs, above the arrow
  Guard label: --hex-font-mono, --hex-font-size-xs, below arrow in brackets, italic

Self-Transition (loop arrow):
  +-------+
  | state |<--+
  +---+---+   |
      |       |
      +-------+
      EVENT_NAME
```

### 3.4 Activity Log Section

Below the machine list. Shows the most recent transitions for the currently selected machine, newest at top.

```
+----------------------------------------------------+
| ACTIVITY LOG                          [Clear] [|>]  |
+----------------------------------------------------+
| 14:30:05  processing                                |
|           <- validating (VALIDATE_OK)               |
| 14:29:58  validating                                |
|           <- idle (START)                            |
| 14:29:55  idle                                      |
|           (initial state)                            |
+----------------------------------------------------+

Legend:
  Timestamp: --hex-font-size-xs, --hex-text-muted
  State name: --hex-font-mono, --hex-font-size-sm, --hex-text-primary
  Arrow + source: --hex-font-size-xs, --hex-text-secondary
  Event name in parentheses: --hex-font-mono
  [|>] = Pause/resume auto-scroll toggle
```

### 3.5 Effect Statistics Table

Displayed below the statechart in the right pane when effect data is available.

```
+--------------------------------------------------+
| EFFECT STATISTICS                                 |
+---------------------------+------+------+---------+
| Effect                    |  Ok  |  Err | Avg (ms)|
+---------------------------+------+------+---------+
| processPayment            |    4 |    1 |    45   |
| validateOrder             |   12 |    0 |    12   |
| sendNotification          |    8 |    2 |    89   |
+---------------------------+------+------+---------+

Error cells: --hex-error when errCount > 0
```

### 3.6 State Detail Overlay

Shown when a state node in the statechart is clicked. Appears as a floating panel anchored near the clicked state, below the statechart toolbar.

```
+-------------------------------------------+
| STATE: processing                    [X]  |
+-------------------------------------------+
| Type: atomic                              |
|                                           |
| Entry Effects:                            |
|   - Invoke: LoggerPort.info              |
|   - Spawn: paymentPollActivity            |
|                                           |
| Exit Effects:                             |
|   - Stop: paymentPollActivity             |
|                                           |
| Transitions:                              |
|   VALIDATE_OK  -> complete  (no guard)    |
|   ERROR        -> failed    (no guard)    |
|   TIMEOUT      -> failed    [isExpired]   |
|                                           |
| Activities Running:                       |
|   payment-poll (12s, running)             |
+-------------------------------------------+
```

### 3.7 Empty State (No Machines Registered)

```
+-------------------------------------------------------------+
| FLOW MACHINES (0)                                [Refresh]   |
+-------------------------------------------------------------+
|                                                              |
|                    (statechart icon, 48px, muted)            |
|                                                              |
|          No flow machines registered.                        |
|                                                              |
|    Register a FlowAdapter in your container to see           |
|    statechart visualizations here.                           |
|                                                              |
+-------------------------------------------------------------+
```

### 3.8 Loading State

While the initial snapshot is being received:

```
+-------------------------------------------------------------+
| FLOW MACHINES                                                |
+-------------------------------------------------------------+
|                                                              |
|                    (spinner, --hex-accent)                    |
|                                                              |
|              Loading flow machine data...                    |
|                                                              |
+-------------------------------------------------------------+
```

---

## 4. Component Tree

```
FlowPanel (root)
  props: FlowPanelProps { snapshot, remoteInspector, theme }
  |
  +-- FlowPanelHeader
  |     "FLOW MACHINES (N)" title + Refresh button
  |
  +-- SplitPane (horizontal, left/right)
  |   |
  |   +-- [Left Pane]
  |   |   |
  |   |   +-- MachineList
  |   |   |     props: { machines, selectedId, onSelect, onNavigateToScope }
  |   |   |     |
  |   |   |     +-- MachineListItem (repeated)
  |   |   |           props: { machine, isSelected, onSelect, onScopeClick }
  |   |   |           Renders: status dot, portName, state badge, scopeId link
  |   |   |
  |   |   +-- ActivityLog
  |   |         props: { transitions, isPaused, onTogglePause, onClear }
  |   |         |
  |   |         +-- ActivityLogEntry (repeated)
  |   |               props: { entry }
  |   |               Renders: timestamp, state name, source arrow, event name
  |   |
  |   +-- [Right Pane]
  |       |
  |       +-- StatechartViewer
  |       |     props: { layout, onStateClick, onTransitionHover, width, height }
  |       |     Renders: SVG viewport with zoom/pan controls
  |       |     |
  |       |     +-- StatechartToolbar
  |       |     |     [Zoom +] [Zoom -] [Fit] [Reset]
  |       |     |
  |       |     +-- <svg> element
  |       |         |
  |       |         +-- InitialStateIndicator
  |       |         |     Filled circle + arrow to initial state
  |       |         |
  |       |         +-- StatechartState (repeated per node)
  |       |         |     props: { node, onClick }
  |       |         |     Renders: <rect> with rounded corners + <text> label
  |       |         |     Variants: atomic, compound, parallel, final, current
  |       |         |
  |       |         +-- StatechartTransition (repeated per edge)
  |       |               props: { edge, onHover }
  |       |               Renders: <path> arrow + <text> event label + optional guard
  |       |
  |       +-- MachineInfoBar
  |       |     "Current: processing" + running activities summary
  |       |
  |       +-- EffectStatsTable
  |       |     props: { statistics }
  |       |     Renders: table of effect name, ok, err, avg duration
  |       |
  |       +-- StateDetailOverlay (conditional, shown on state click)
  |             props: { node, definition, activities, onClose }
  |             Renders: floating panel with entry/exit effects, transitions, guards
  |
  +-- TransitionHighlightLayer (overlay on SVG)
        Briefly highlights transition arrows when live transitions fire
```

### 4.1 Component Responsibilities

**FlowPanel**: Root component. Receives `FlowPanelProps`, computes derived state (selected machine, layout), manages selection state. Subscribes to snapshot updates.

**MachineList**: Renders the scrollable list of machines. Supports keyboard navigation (arrow up/down to move selection, Enter to confirm). Filters machines by health status if a filter is active.

**MachineListItem**: A single machine row. Renders the health status dot, port name, current state badge, and scope ID link. The scope ID is a clickable navigation link to the Scope Tree panel.

**StatechartViewer**: The core SVG rendering component. Receives a `StatechartLayout` and renders it as an interactive SVG. Manages zoom/pan state internally. Handles click events on state nodes and hover events on transition edges.

**StatechartState**: A single state node rendered as an SVG `<rect>` + `<text>`. Visual treatment varies by type (atomic, compound, final) and active status (current vs. inactive).

**StatechartTransition**: A single transition edge rendered as an SVG `<path>` (arrow) + `<text>` (event label). On hover, shows a tooltip with the guard condition (if any) and effect count.

**ActivityLog**: Chronological list of recent transitions for the selected machine. Auto-scrolls to newest entry unless paused. Virtualized for performance when many transitions exist.

**EffectStatsTable**: Simple table rendering `FlowEffectStatistic[]`. Error counts are highlighted in `--hex-error`.

**StateDetailOverlay**: Floating overlay shown when a state node is clicked. Displays entry/exit effects, outgoing transitions with guards, and running activities in that state. Closed by clicking X or pressing Escape.

---

## 5. Interaction Model

### 5.1 Selecting a Machine

**Trigger**: Click a `MachineListItem`, or press Enter on a focused item.

**Behavior**:

1. The clicked machine becomes the `selectedMachineId` in component state.
2. The `StatechartViewer` computes a new `StatechartLayout` from the selected machine's `definition` and `currentState`.
3. The `ActivityLog` filters to show only transitions for the selected machine's `machineId`.
4. The `EffectStatsTable` updates (effect stats are global, not per-machine, so the table remains the same but could be filtered in future).
5. The `StatechartViewer` calls `fitToViewport()` to ensure the full statechart is visible.

**Default**: The first machine in the list is selected automatically on mount.

### 5.2 Clicking a State Node

**Trigger**: Click a `StatechartState` rectangle in the SVG.

**Behavior**:

1. The `StateDetailOverlay` opens, anchored near the clicked node.
2. The overlay shows the state's type, entry effects, exit effects, outgoing transitions (with guard names and target states), and any running activities.
3. The clicked state node receives a temporary visual emphasis (thicker border).

**Dismiss**: Click the X button in the overlay, press Escape, or click another state node (which opens a new overlay for that state).

### 5.3 Hovering a Transition Arrow

**Trigger**: Mouse enters a `StatechartTransition` path element.

**Behavior**:

1. A tooltip appears near the cursor showing:
   - Event name (bold)
   - Guard condition name (if defined)
   - Target state name
   - "Has effects" indicator (if the transition produces effects)
2. The hovered arrow is visually emphasized: stroke width increases from 1.5px to 2.5px and color changes to `--hex-accent`.

**Dismiss**: Mouse leaves the path element.

### 5.4 Activity Log Auto-Scroll

**Behavior**: When `isPaused` is false, the activity log scrolls to show the newest entry whenever a new transition arrives for the selected machine. A subtle scroll animation (200ms ease-out) is used.

**Pause**: Clicking the pause button (`[||]`) stops auto-scroll. The button changes to a play icon (`[>]`). While paused, new entries still appear in the list but the scroll position is preserved.

**Resume**: Clicking play resumes auto-scroll and immediately scrolls to the newest entry.

**Manual scroll**: If the user manually scrolls the activity log upward (away from the bottom), auto-scroll pauses automatically. When the user scrolls back to the bottom (within 20px threshold), auto-scroll resumes.

### 5.5 Cross-Panel Navigation

**scopeId -> Scope Tree**: Clicking the `scopeId` text on a `MachineListItem` invokes the shared navigation context: `navigateTo("scopes", { scopeId })`. The Scope Tree panel activates and selects/highlights the specified scope node.

**portName -> Container**: Clicking the `portName` text on a `MachineListItem` (when it is rendered as a link) invokes `navigateTo("container", { portName })`. The Container panel activates and scrolls to the port row.

**traceId -> Tracing**: If a transition entry in the activity log has an associated `traceId` (from flow tracing hook spans), clicking it invokes `navigateTo("tracing", { traceId })`. The Tracing panel activates and filters by that trace.

### 5.6 Keyboard Navigation

**Machine list**:

- `ArrowDown` / `ArrowUp`: Move selection to the next/previous machine in the list.
- `Enter`: Confirm selection (equivalent to click).
- `Home` / `End`: Jump to first/last machine.

**Statechart viewer**:

- `+` / `-`: Zoom in / zoom out.
- `0`: Reset zoom to fit viewport.
- Arrow keys (when viewer is focused): Pan the viewport.

**State detail overlay**:

- `Escape`: Close the overlay.
- `Tab`: Cycle through interactive elements within the overlay (transition target links, activity names).

---

## 6. Statechart Layout Algorithm

The layout algorithm transforms a `FlowMachineDefinition` into a `StatechartLayout` with positioned nodes and routed edges. The algorithm runs client-side in the dashboard, not in the target application.

### 6.1 Algorithm Choice

Use a layered (Sugiyama-style) graph layout, consistent with the approach used in the Graph Panel (Section 9). The preferred implementation is **dagre** (a JavaScript library implementing Sugiyama layout). If dagre is unavailable or too large, a simplified layered layout can be implemented:

1. **Topological ordering**: Assign layers based on longest path from the initial state.
2. **Crossing minimization**: Reorder nodes within each layer to minimize edge crossings (barycenter heuristic).
3. **Coordinate assignment**: Assign x/y positions with fixed inter-layer spacing and intra-layer spacing.

### 6.2 State Node Sizing

- **Width**: `max(MIN_NODE_WIDTH, labelWidth + 2 * HORIZONTAL_PADDING)` where `labelWidth` is measured using a hidden `<canvas>` text measurement or a pre-computed character width table. `MIN_NODE_WIDTH = 80px`, `HORIZONTAL_PADDING = 16px`.
- **Height**: `LABEL_HEIGHT + 2 * VERTICAL_PADDING` where `LABEL_HEIGHT = 16px` (single line), `VERTICAL_PADDING = 12px`. Result: 40px for atomic states.
- **Compound states**: Width and height expand to contain all child nodes plus a title bar (24px) and padding (12px on each side).

### 6.3 Edge Routing

- **Orthogonal routing**: Edges are routed as sequences of horizontal and vertical segments. This produces clean, professional diagrams.
- **Spline fallback**: If orthogonal routing produces excessive bends (more than 4 segments), fall back to cubic bezier splines.
- **Label placement**: Event labels are placed at the midpoint of the edge, offset 8px above the line. Guard labels are placed 8px below.

### 6.4 Self-Transitions

Self-transitions (where `from === to`) are rendered as a loop arrow that exits the top-right corner of the state node, arcs upward, and re-enters the top-left corner. The loop height is 30px above the node. The event label is placed at the apex of the loop.

### 6.5 Compound State Handling

Compound states (type: "compound") are rendered as containers:

1. The compound state's label appears in the top-left corner of the container rectangle.
2. Child states are laid out inside the compound using the same layered algorithm, with the compound's `initial` child as the starting node.
3. The compound rectangle's size is computed as the bounding box of all children plus padding.
4. Transitions targeting the compound state itself are routed to the compound's border, not to any child.

### 6.6 Parallel State Handling

Parallel states (type: "parallel") are rendered as a container with dashed horizontal dividers separating each region. Each region contains one child compound state and is laid out independently. Region heights are proportional to their content.

### 6.7 Viewport Fitting and Zoom/Pan

- **Fit to viewport**: On initial render and when the `[Fit]` button is clicked, compute the scale factor that fits the entire `StatechartLayout` within the available `width` x `height` with 24px padding on all sides. Apply the scale as an SVG `viewBox` adjustment.
- **Zoom**: Increment/decrement zoom level by 20% per step. Zoom range: 25% to 400%. Zoom is centered on the cursor position (for scroll-wheel zoom) or on the viewport center (for button zoom).
- **Pan**: Click-and-drag on the SVG background (not on a node or edge) pans the viewport. Touch drag is also supported.
- **Scroll-wheel zoom**: Ctrl+scroll (or Cmd+scroll on macOS) zooms. Plain scroll pans vertically.

### 6.8 Layout Caching

The layout for a given `FlowMachineDefinition` is cached by `machineId`. The cache is invalidated only when the definition structure changes (which should never happen at runtime since definitions are compile-time data). The `currentState` highlight is applied as a post-processing step on the cached layout, not by re-running the full algorithm.

---

## 7. Real-Time Updates

### 7.1 WebSocket Subscription

The Flow Panel receives data through the standard `RemoteInspectorAPI` subscription mechanism. When the target application's `FlowInspector` emits events (via the `ContainerInspector` event system), the devtools-client serializes the updated `FlowLibrarySnapshot` and sends it over WebSocket. The dashboard's `RemoteInspectorAPI` updates its internal state and triggers a re-render via `useSyncExternalStore`.

No polling is used. All updates are event-driven.

### 7.2 State Transition Animation

When a new transition arrives for the currently selected machine:

1. **Edge flash**: The transition edge that matches `{ from: transition.fromState, to: transition.toState, event: transition.event }` is briefly highlighted. The edge color changes to `--hex-accent` and stroke width increases to 3px for 600ms, then fades back to normal over 200ms.
2. **State pulse**: The target state node receives a brief pulse animation -- a scale-up to 105% and back over 400ms.
3. **Current state update**: The `isCurrent` flag shifts from the old state to the new state, updating border/fill colors immediately.
4. **Activity log append**: The new transition is prepended to the activity log list with a subtle fade-in animation (200ms).

When `prefers-reduced-motion: reduce` is active, all animations are disabled. The visual updates (color changes, state highlight) still occur instantly without motion.

### 7.3 Machine List Re-Ordering

The machine list is sorted by last activity time (most recently transitioned machine first) by default. When a transition fires for a machine, that machine moves to the top of the list. A CSS transition (`--hex-transition-normal`, 200ms) animates the reorder.

Alternative sort options (accessible via a dropdown):

- **By name**: Alphabetical by portName (stable order).
- **By activity**: Most recently transitioned first (default).
- **By health**: Error first, then degraded, then healthy.

### 7.4 Incremental Updates

The `FlowLibrarySnapshot` is sent as a complete replacement on each update. The dashboard uses referential equality checks on `snapshot.machines` array items (by `instanceId`) to avoid unnecessary re-renders of `MachineListItem` components that have not changed.

The `StatechartLayout` is not recomputed on every snapshot update. Only the `currentState` highlight and running activity badges are updated. Full layout recomputation occurs only when a machine is first selected or when the machine definition changes.

---

## 8. Color and Styling

### 8.1 Machine Health Status Colors

| Status     | Dot Color               | Background            | Usage                                    |
| ---------- | ----------------------- | --------------------- | ---------------------------------------- |
| `healthy`  | `--hex-success` (green) | none                  | Machine operating normally               |
| `degraded` | `--hex-warning` (amber) | `--hex-warning-muted` | Recent effect failures, not yet in error |
| `error`    | `--hex-error` (red)     | `--hex-error-muted`   | Machine in a final error state           |

### 8.2 Statechart State Styling

| State Type      | Border                                | Fill                 | Text                   |
| --------------- | ------------------------------------- | -------------------- | ---------------------- |
| Inactive atomic | `2px solid var(--hex-border)`         | `--hex-bg-secondary` | `--hex-text-primary`   |
| Current atomic  | `3px solid var(--hex-accent)`         | `--hex-accent-muted` | `--hex-accent`         |
| Initial         | Same as atomic + filled dot indicator | `--hex-bg-secondary` | `--hex-text-primary`   |
| Final           | Double border (`--hex-border`)        | `--hex-bg-secondary` | `--hex-text-secondary` |
| Compound        | `2px dashed var(--hex-border)`        | `--hex-bg-primary`   | `--hex-text-secondary` |
| Parallel        | `2px dashed var(--hex-border)`        | `--hex-bg-primary`   | `--hex-text-secondary` |

### 8.3 Transition Arrow Styling

| State               | Stroke Color       | Stroke Width | Label Color            |
| ------------------- | ------------------ | ------------ | ---------------------- |
| Default             | `--hex-text-muted` | 1.5px        | `--hex-text-secondary` |
| Hovered             | `--hex-accent`     | 2.5px        | `--hex-accent`         |
| Flash (live update) | `--hex-accent`     | 3px          | `--hex-accent`         |
| Self-transition     | `--hex-text-muted` | 1.5px        | `--hex-text-secondary` |

### 8.4 Activity Log Level Coloring

| Transition Type     | Color                |
| ------------------- | -------------------- |
| Normal transition   | `--hex-text-primary` |
| To error state      | `--hex-error`        |
| Recovery transition | `--hex-success`      |
| Initial state entry | `--hex-text-muted`   |

### 8.5 Initial State Indicator

A filled circle, 8px diameter, colored `--hex-text-primary`. Connected by a 1.5px solid arrow to the initial state node. Positioned 24px to the left of the initial state.

### 8.6 Final State Indicator

Rendered as a double-bordered rounded rectangle: an outer border (2px, `--hex-border`) and an inner border (2px, `--hex-border`) with a 2px gap between them. This is achieved with a nested `<rect>` pair in SVG or a box-shadow technique.

---

## 9. Cross-Panel Navigation

The Flow Panel provides three outbound navigation links and receives one inbound navigation target.

### 9.1 Outbound

| Source Element         | Target Panel | Navigation Payload               |
| ---------------------- | ------------ | -------------------------------- |
| `scopeId` on machine   | Scope Tree   | `{ scopeId: machine.scopeId }`   |
| `portName` on machine  | Container    | `{ portName: machine.portName }` |
| `traceId` on log entry | Tracing      | `{ traceId: entry.traceId }`     |

Navigation is implemented via the shared `NavigationContext`:

```typescript
interface NavigationContext {
  navigateTo(panelId: string, selection?: Record<string, string>): void;
}
```

### 9.2 Inbound

When other panels navigate to the Flow Panel (e.g., from the Overview Panel clicking the Flow library summary card), the panel activates and optionally pre-selects a machine if a `machineId` or `portName` is provided in the navigation payload.

---

## 10. Error States and Edge Cases

### 10.1 No Machines Registered

Display the empty state wireframe (Section 3.7). The statechart viewer area shows a placeholder message and icon. The activity log and effect statistics sections are hidden.

### 10.2 Machine With No Transitions

A single-state machine (one state, no transitions) renders as a single highlighted rectangle with the initial state indicator. The statechart viewer still works -- zoom/pan is available but there are no edges. The activity log shows only the initial state entry.

### 10.3 Machine With 50+ States

For large machines, the statechart may not fit in the viewport at default zoom. The panel automatically fits the layout on first render (Section 6.7). The zoom-out limit (25%) should accommodate machines up to ~100 states. For extremely large machines:

- Node labels are truncated with ellipsis when zoom is below 50%.
- At zoom below 30%, node labels are hidden entirely and only rectangles are shown (minimap mode).
- A "This machine has N states" info banner appears above the statechart when N > 30.

### 10.4 Machine Definition Missing

If a machine's `FlowMachineEntry.definition` is absent (e.g., the graph metadata was not enriched), the statechart viewer cannot render. In this case, fall back to a JSON tree view of the machine's snapshot data, matching the generic `LibraryPanel` behavior from Section 12. An info banner appears: "Machine definition not available. Showing raw state data."

### 10.5 WebSocket Disconnection

When the WebSocket connection is lost:

1. A "Disconnected" banner appears at the top of the panel (consistent with all other panels).
2. The last known snapshot remains visible but grayed out (opacity 0.6).
3. The activity log stops receiving new entries.
4. The Refresh button shows a "Reconnecting..." state.
5. When the connection is restored, the snapshot updates automatically and the grayed-out overlay is removed.

### 10.6 Machine Disposed During View

If a machine is unregistered (scope disposed) while selected:

1. The machine list item shows a strikethrough on the port name and a "disposed" badge.
2. The statechart remains visible (static snapshot of last known state) but all interactive elements are disabled.
3. A banner appears in the statechart area: "Machine disposed. Showing last known state."
4. If the disposed machine was the only machine, the empty state is shown after a 2-second delay.

### 10.7 Custom Panel Render Error

If the FlowPanel component throws during render, the dashboard's error boundary catches it and falls back to the generic JSON tree viewer with an error banner: "Custom panel failed to render. Showing raw snapshot." (per Section 12.5 of 04-panels.md).

---

## 11. Accessibility

### 11.1 ARIA Roles

| Component            | Role                      | ARIA Attributes                                      |
| -------------------- | ------------------------- | ---------------------------------------------------- |
| Machine list         | `listbox`                 | `aria-label="Flow machines"`                         |
| Machine list item    | `option`                  | `aria-selected`, `aria-label="{portName}: {state}"`  |
| Statechart SVG       | `img`                     | `aria-label="Statechart diagram for {machineId}"`    |
| State node           | (none, decorative in SVG) | `<title>` element with state name and status         |
| Transition edge      | (none, decorative in SVG) | `<title>` element with "event from source to target" |
| Activity log         | `log`                     | `aria-label="Activity log"`, `aria-live="polite"`    |
| State detail overlay | `dialog`                  | `aria-modal="true"`, `aria-label="State detail"`     |
| Effect stats table   | `table`                   | `aria-label="Effect statistics"`                     |
| Zoom buttons         | `button`                  | `aria-label="Zoom in"` / `"Zoom out"` / `"Fit view"` |

### 11.2 Keyboard Navigation

Full keyboard accessibility is provided as described in Section 5.6. Focus management follows these rules:

- When the panel mounts, focus goes to the machine list.
- When a machine is selected, focus remains in the machine list.
- Tab order: machine list -> statechart toolbar -> statechart SVG -> activity log -> effect stats table.
- Shift+Tab reverses the order.

### 11.3 Screen Reader Announcements

- When a new transition fires (live update), announce via `aria-live="polite"` on the activity log: "Machine {machineId} transitioned from {from} to {to} via {event}."
- When a machine is selected, announce: "Selected machine {portName}, current state: {state}."
- When the state detail overlay opens, focus moves to the overlay and announces: "State detail: {stateName}."

### 11.4 Color Independence

All information conveyed by color is also conveyed by text or shape:

- Health status: colored dot AND text label ("healthy", "degraded", "error").
- Current state: colored highlight AND bold text weight.
- Final state: double border (shape) in addition to muted text color.
- Error counts in effect stats: red color AND numeric value.

---

## 12. Testing Requirements

### 12.1 Rendering Tests

- Machine list renders correct number of items from `FlowLibrarySnapshot.machines`.
- Machine list item displays portName, current state badge, scope ID, and health status dot.
- Statechart SVG renders correct number of state rectangles and transition arrows for a given definition.
- Current state receives the highlighted visual treatment (accent border and muted fill).
- Initial state indicator (filled dot + arrow) renders for the initial state.
- Final states render with double-border treatment.
- Compound states render as dashed containers with nested children.
- Activity log renders transition entries in reverse chronological order.
- Effect stats table renders all statistics with correct ok/err/avg values.
- Empty state renders when `machines` array is empty.

### 12.2 Interaction Tests

- Clicking a machine list item updates the selected machine and re-renders the statechart.
- Clicking a state node in the SVG opens the state detail overlay with correct data.
- Clicking the overlay X button or pressing Escape closes the overlay.
- Hovering a transition edge shows a tooltip with event name and guard.
- Zoom in/out buttons change the SVG viewBox scale.
- Fit button resets zoom to fit the full layout.
- Activity log auto-scrolls on new transition when not paused.
- Pause button stops auto-scroll; play button resumes it.
- Arrow keys navigate the machine list selection.

### 12.3 Cross-Panel Navigation Tests

- Clicking a scopeId invokes `navigateTo("scopes", { scopeId })`.
- Clicking a portName invokes `navigateTo("container", { portName })`.
- Inbound navigation with `{ portName }` pre-selects the matching machine.

### 12.4 Layout Tests

- Layout algorithm produces valid positions (no overlapping nodes at same layer).
- Self-transition edges render as loop arrows above the node.
- Compound state container fully encloses all child nodes.
- Viewport fit correctly scales the layout to fit within given width/height.
- Layout is cached by machineId and not recomputed on currentState changes.

### 12.5 Real-Time Update Tests

- New transition triggers edge flash animation on the correct edge.
- New transition updates currentState highlight from old state to new state.
- New transition prepends an entry to the activity log.
- Machine list reorders by last activity time after a transition.
- Snapshot referential equality check prevents unnecessary MachineListItem re-renders.

### 12.6 Error/Edge Case Tests

- Machine with no transitions renders a single state node without edges.
- Missing machine definition falls back to JSON tree view with info banner.
- WebSocket disconnection shows the disconnected banner and grays out content.
- Disposed machine shows strikethrough and disabled statechart.
- Large machine (50+ states) renders without overflow and zoom controls work.
- Panel render error triggers error boundary fallback to JSON tree viewer.

### 12.7 Accessibility Tests

- Machine list has `role="listbox"` and items have `role="option"` with `aria-selected`.
- State detail overlay has `role="dialog"` and `aria-modal="true"`.
- Activity log has `aria-live="polite"` and receives screen reader announcements on updates.
- All interactive elements are reachable via keyboard Tab navigation.
- Focus moves to overlay on open and returns to trigger element on close.
