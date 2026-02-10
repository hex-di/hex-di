# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/devtools` is an in-app overlay panel for inspecting HexDI applications at runtime. It renders as a toggleable bottom panel with a floating trigger button -- the same pattern used by React Query DevTools, Jotai DevTools, and TanStack Router DevTools. Drop a single `<HexDevTools />` component into your React tree, and it provides visual access to everything the container knows about itself: registered services, dependency graphs, scope hierarchies, resolution traces, library-specific state, and the unified snapshot.

The devtools overlay consumes the existing inspection infrastructure built into `@hex-di/core` and `@hex-di/runtime`:

- **InspectorAPI** (`container.inspector`) -- pull-based queries for container snapshots, scope trees, adapter info, graph data, result statistics, and library inspector registry
- **UnifiedSnapshot** -- aggregated view combining `ContainerSnapshot` with all registered `LibraryInspector` snapshots
- **ContainerGraphData** -- adapter dependency information with origin/inheritance metadata for graph visualization
- **TracingAPI** -- resolution trace entries with filtering, statistics, and real-time subscription
- **LibraryInspector protocol** -- the extensible protocol that ecosystem libraries (Flow, Store, Query, Saga, Agent, Logger) implement to report their domain-specific state

The devtools does not add new inspection capabilities to the container. It visualizes the self-knowledge that already exists. Every panel in the devtools maps directly to an `InspectorAPI` method or a `LibraryInspector` snapshot.

### 1.1 Goals

1. **Zero-config** -- Drop `<HexDevTools />` into your component tree inside an `InspectorProvider`. No configuration, no port registration, no adapter wiring. The devtools discovers available data automatically from the `InspectorAPI`.

2. **Compile-time aware** -- The typed `LibraryInspector` protocol (Section 4) ensures that library snapshot shapes are known to TypeScript at build time. DevTools panels can render library-specific data with full type safety, not just `Record<string, unknown>`.

3. **Plugin-based panels** -- Each registered `LibraryInspector` gets its own panel tab in the devtools. The container panel, graph panel, scope tree panel, and tracing panel are built-in. Library panels are auto-discovered from `inspector.getLibraryInspectors()`.

4. **Production-safe** -- The entire `@hex-di/devtools` package tree-shakes away when the component is not rendered. The inspection infrastructure (`InspectorAPI`, hooks) remains available for MCP and other diagnostic consumers, but the visual overlay adds zero bytes to production bundles when conditionally excluded.

5. **Framework-aligned** -- Pure React components consuming the existing `@hex-di/react` hooks (`useInspector`, `useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary`). No custom state management, no external dependencies beyond React itself.

6. **Self-contained styling** -- All styles are inline or CSS-in-JS (no external stylesheets, no CSS modules, no build tool requirements). The devtools overlay renders in an isolated layer that does not interfere with application styles.

### 1.2 Non-Goals (v0.1.0)

1. **Not a browser extension** -- The devtools is an in-app overlay, not a Chrome/Firefox extension. A browser extension that communicates via `DevToolsBridge` and `window.postMessage` is a future concern.

2. **Not time-travel debugging** -- Replaying past states requires the Store library's action history and Flow's serialization. This is deferred until those libraries ship their inspectors.

3. **Not a performance profiler** -- The tracing panel shows resolution timelines and statistics, but it is not a flame graph profiler. Deeper performance analysis is deferred.

4. **Not remote inspection** -- Remote inspection over the network is MCP's responsibility (see VISION.md Phase 4). DevTools runs in the same browser tab as the application.

5. **Not network/HTTP inspection** -- HTTP request/response monitoring is outside DI scope. Query library panels may show fetch status, but raw network traffic is not displayed.

6. **Not a standalone/remote dashboard** -- DevTools 0.1.0 is in-process only: it runs in the same browser tab as the application. A remote standalone mode (WebSocket/SSE transport as described in VISION.md Phase 4) is deferred to a future `@hex-di/devtools-server` package. See Appendix C8 for rationale.

### 1.3 When to Use

| Use DevTools                                                        | Do Not Use DevTools                              |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| During development to understand container state                    | In production bundles (tree-shake it out)        |
| To debug resolution failures and missing adapters                   | For automated monitoring (use MCP/OTel instead)  |
| To visualize dependency graph topology                              | For network traffic analysis                     |
| To monitor library state (Flow machines, Store values, Query cache) | For performance profiling (use browser DevTools) |
| To inspect scope hierarchies and lifecycle                          | For CI/CD pipeline inspection                    |
| To trace resolution timing and cache hit rates                      | For log aggregation (use Logger inspectors)      |

### 1.4 Key Insight

VISION.md describes two diagnostic interfaces for the self-aware application: the **diagnostic port** (MCP/A2A -- for AI agents and external tools) and the **dashboard** (for human developers). DevTools is the dashboard.

Both consume the same self-knowledge infrastructure. The `InspectorAPI` and `LibraryInspector` protocol are the shared data layer. MCP serializes this data as JSON resources and tools for AI consumption. DevTools renders it as interactive visual panels for human consumption. Neither adds new inspection capabilities -- they are both consumers of the container's existing self-knowledge.

```
                    +------------------------------------------+
                    |       Container Self-Knowledge            |
                    |                                          |
                    |  InspectorAPI    LibraryInspector[]       |
                    |  ContainerGraphData   TracingAPI          |
                    |  UnifiedSnapshot   ResultStatistics       |
                    +------------------+-----------------------+
                                       |
                          +------------+------------+
                          |                         |
                +---------v---------+     +---------v---------+
                |    MCP Server     |     |   DevTools Panel   |
                |                   |     |                    |
                |  AI agents query  |     |  Humans see live   |
                |  structured JSON  |     |  interactive UI    |
                |  resources        |     |  panels            |
                |                   |     |                    |
                |  (the OBD-II port)|     |  (the dashboard)   |
                +-------------------+     +--------------------+
```

### 1.5 Scope of Version 0.1.0

**Ships in 0.1.0:**

- `<HexDevTools />` main component with toggleable bottom panel
- Floating trigger button with position configuration
- Resizable panel shell with drag handle
- Tab bar for panel navigation
- Built-in panels: Container overview, Dependency graph, Scope tree, Tracing timeline, Event log
- Auto-discovered library panels from `LibraryInspector` registry
- Light and dark themes with system preference detection
- Design token system for consistent styling
- Keyboard shortcut to toggle panel (configurable, default: Ctrl+Shift+D)
- Panel state persistence via `localStorage` (open/closed, active tab, panel height)

**Deferred to future versions:**

- Browser extension with `DevToolsBridge` integration
- Time-travel debugging (requires Store action history)
- Performance profiling flame graphs
- Custom panel plugin API (beyond `LibraryInspector`)
- Search/filter across all panels
- Panel state export/import (for bug reports)

---

## 2. Philosophy

> "The dashboard shows what the nervous system knows."

### 2.1 Core Principles

**Principle 1: The Dashboard, Not the Port**

VISION.md defines MCP as the OBD-II diagnostic port -- the standardized interface through which AI agents and external tools query the application's self-knowledge. DevTools is the driver's dashboard -- a human-friendly, visual, real-time rendering of the same data. The dashboard does not create new diagnostic capabilities. It visualizes existing ones.

This separation means:

- DevTools never bypasses the `InspectorAPI`. It calls the same methods that MCP would call.
- DevTools never stores its own copy of application state. It subscribes to inspector events and re-renders.
- DevTools can be removed without losing any diagnostic capability. MCP, OTel export, and programmatic inspection all continue to work.

**Principle 2: Every Library Has a Voice**

Each library that implements the `LibraryInspector` protocol gets its own dedicated panel tab in the devtools. The devtools does not interpret or transform library data. It provides a rendering surface and lets each library present itself.

When `@hex-di/flow` registers a `FlowInspector`, the devtools discovers it via `inspector.getLibraryInspectors()` and renders a "Flow" tab. When `@hex-di/query` registers a `QueryInspector`, a "Query" tab appears. Libraries that are not installed produce no tabs. The panel set is dynamic and reflects the actual libraries registered with the container.

For built-in panels (Container, Graph, Scope Tree, Tracing), the devtools has first-party rendering logic. For library panels, it renders the library's snapshot data in a generic key-value explorer with the option for libraries to provide custom panel components via a `renderPanel` method on their inspector.

**Principle 3: Compile-Time Truth**

The typed `LibraryInspector` protocol (Section 4) ensures that TypeScript knows at build time which libraries are inspectable and what shape their snapshots take. This is not just a runtime convenience -- it is a compile-time contract.

When a developer registers a `FlowInspector` with the container, TypeScript knows the snapshot contains `machineCount`, `machines`, `healthEvents`. DevTools panels can render these fields with full type inference. No `unknown` casting, no runtime shape discovery, no "hope the data looks right" rendering.

**Principle 4: Zero Production Cost**

The `@hex-di/devtools` package is a React component library with no side effects at import time. If `<HexDevTools />` is not rendered (e.g., behind a `process.env.NODE_ENV === 'development'` check or a dynamic import), the entire package tree-shakes away from production bundles.

The inspection infrastructure (`InspectorAPI`, `useSnapshot`, `useUnifiedSnapshot`) remains in production because it serves other consumers (MCP, programmatic inspection, health checks). But the visual overlay -- components, themes, visualizations, styles -- adds zero bytes when not used.

**Principle 5: Composition Over Configuration**

DevTools follows the same architectural pattern as the rest of HexDI: ports and adapters. Each panel is conceptually an adapter that provides a visual representation of a port's inspection data.

- The `InspectorAPI` is the "port" -- it defines what data is queryable.
- Each panel is an "adapter" -- it defines how that data is rendered.
- The panel shell is the "container" -- it manages panel lifecycle and tab navigation.

This means new panels can be added by registering new `LibraryInspector` instances with the container. No devtools configuration changes are needed.

### 2.2 Nervous System Mapping

VISION.md §4 describes the DI container as a nervous system with distinct nerve types. DevTools panels map directly to these nerve categories, providing a visual surface for each part of the nervous system.

| Nerve Category                           | VISION.md Libraries                                  | DevTools Panel(s)                              |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| **Central Nerve Cluster** (DI Container) | `@hex-di/graph`, `@hex-di/runtime`                   | Container Panel, Graph Panel, Scope Tree Panel |
| **Sensory Nerves** (observation)         | `@hex-di/tracing`, `@hex-di/query`, `@hex-di/logger` | Tracing Panel, library panels (Query, Logger)  |
| **Motor Nerves** (action)                | `@hex-di/store`, `@hex-di/agent`                     | Library panels (Store, Agent)                  |
| **Reflex Arcs** (reactive orchestration) | `@hex-di/saga`, `@hex-di/flow`                       | Library panels (Saga, Flow)                    |

The Event Log Panel is cross-cutting: it captures nerve impulses from every category -- container events, library events, tracing spans, and scope lifecycle signals -- into a single chronological stream.

The Unified Overview Panel (Section 13) and Health & Diagnostics Panel (Section 14) sit at the convergence point described in VISION.md §5: they synthesize data from all nerve categories into a single diagnostic surface.

```
                         ┌─────────────────────────┐
                         │    Diagnostic Ports      │
                         │  MCP Server    DevTools  │
                         └────────────┬────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  Central Nerve Cluster   │
                         │  ┌─────────────────────┐ │
                         │  │ Container Panel     │ │
                         │  │ Graph Panel         │ │
                         │  │ Scope Tree Panel    │ │
                         │  └─────────────────────┘ │
                         └─────┬──────┬──────┬─────┘
                               │      │      │
               ┌───────────────┘      │      └───────────────┐
               │                      │                      │
    ┌──────────▼──────────┐ ┌────────▼────────┐ ┌──────────▼──────────┐
    │   Sensory Nerves    │ │  Motor Nerves   │ │   Reflex Arcs       │
    │                     │ │                 │ │                     │
    │  Tracing Panel      │ │  Store Panel    │ │  Saga Panel         │
    │  Query Panel        │ │  Agent Panel    │ │  Flow Panel         │
    │  Logger Panel       │ │                 │ │                     │
    └─────────────────────┘ └─────────────────┘ └─────────────────────┘
               │                      │                      │
               └──────────────────────┼──────────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  Cross-Cutting Panels    │
                         │  Event Log (all signals) │
                         │  Overview (convergence)  │
                         │  Health (diagnostics)    │
                         └─────────────────────────┘
```

### 2.3 Architecture Overview

```
+----------------------------------------------------------------------+
|                        APPLICATION LAYER                              |
|                                                                       |
|  function App() {                                                     |
|    return (                                                           |
|      <HexDiContainerProvider container={container}>                   |
|        <InspectorProvider inspector={container.inspector}>            |
|          <MainContent />                                              |
|          <HexDevTools />    <-- Single line to add devtools           |
|        </InspectorProvider>                                           |
|      </HexDiContainerProvider>                                        |
|    );                                                                 |
|  }                                                                    |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
                  renders as    |
                                v
+-------------------------------+--------------------------------------+
|                                                                       |
|  +------------------------------------------------------------------+|
|  |                    Application Content                            ||
|  |                                                                    ||
|  |  (Your app renders here, unaffected by devtools)                  ||
|  |                                                                    ||
|  +------------------------------------------------------------------+|
|  +------------------------------------------------------------------+|
|  |  HexDI DevTools                                          [_][X]  ||
|  |  +------+-------+--------+--------+--------+--------+           ||
|  |  | Home | Graph | Scopes | Traces | Flow   | Events |           ||
|  |  +------+-------+--------+--------+--------+--------+           ||
|  |                                                                    ||
|  |  [Active panel content rendered here]                             ||
|  |                                                                    ||
|  |  - Container overview with phase, singleton count, scope count    ||
|  |  - OR dependency graph visualization                              ||
|  |  - OR scope tree hierarchy                                        ||
|  |  - OR tracing timeline with resolution spans                      ||
|  |  - OR library-specific panel (auto-discovered)                    ||
|  |  - OR real-time event log                                         ||
|  |                                                                    ||
|  +------------------------------------------------------------------+|
|                                                         [HexDI Logo] | <-- Trigger button
+----------------------------------------------------------------------+
```

### 2.4 Data Flow

```
  InspectorAPI                @hex-di/react hooks           DevTools panels
  (pull + push)               (reactive bridge)             (visual rendering)
       |                           |                              |
       v                           v                              v
  +----------+              +--------------+              +---------------+
  | inspector|  subscribe   | useSnapshot  |  re-render   | ContainerPanel|
  | .get     |------------->| useScopeTree |------------->| GraphPanel    |
  | Snapshot |   events     | useUnified   |   on state   | ScopePanel    |
  | .get     |              | Snapshot     |   change     | TracingPanel  |
  | ScopeTree|              | useTracing   |              | LibraryPanel  |
  | .get     |              | Summary      |              | EventLogPanel |
  | Unified  |              | useInspector |              +---------------+
  | Snapshot |              +--------------+
  | .get     |
  | GraphData|     Library inspectors
  | .get     |     also flow through
  | Library  |     getLibraryInspectors()
  | Inspector|     and getUnifiedSnapshot()
  +----------+
```

All data flows through the existing `InspectorAPI` and `@hex-di/react` hooks. DevTools adds no new data sources, no new subscriptions to the container, and no new event types. It is a pure consumer of the inspection infrastructure.

**Shared data contract with Hono diagnostic routes**: The `@hex-di/hono` integration exposes the same `InspectorAPI` data through HTTP endpoints (`/hexdi/health`, `/hexdi/snapshot`, `/hexdi/ports`, `/hexdi/scopes`, `/hexdi/graph`, `/hexdi/unified`). DevTools panels and Hono diagnostic routes consume the same underlying methods (`inspector.getSnapshot()`, `inspector.getScopeTree()`, `inspector.getGraphData()`, `inspector.getUnifiedSnapshot()`). This shared contract means any data visible in DevTools is also available programmatically through Hono routes, and vice versa. The future REST Diagnostic API (Phase 4) will formalize this alignment.

### 2.5 Before and After

**Before DevTools: The Blind Developer**

The developer reads source files, adds `console.log` statements, inspects the container snapshot programmatically, and reconstructs the application's internal state from scattered clues:

```
Developer: "What services are registered?"
  -> Read source files, find all createAdapter() calls
  -> Hope nothing was added dynamically

Developer: "What's the dependency graph?"
  -> Read all `requires` arrays in adapter configs
  -> Draw the graph mentally or on a whiteboard

Developer: "What scope hierarchy exists?"
  -> console.log(container.inspector.getScopeTree())
  -> Parse JSON output manually

Developer: "Why did this resolution fail?"
  -> Read error messages in the console
  -> Guess at the dependency chain that caused the failure

Developer: "What's the Flow machine state?"
  -> Resolve the FlowPort manually, call snapshot()
  -> Repeat for every machine instance
```

**After DevTools: The Informed Developer**

The developer opens the devtools overlay and sees everything at a glance:

```
Developer opens Container panel:
  -> Phase: initialized, 12 singletons resolved, 3 scopes active
  -> Error rate: 0.2% (PaymentPort at 2.1% -- highlighted)

Developer opens Graph panel:
  -> Interactive dependency graph with all 24 ports
  -> Color-coded by lifetime (singleton=blue, scoped=green, transient=gray)
  -> Click a node to see its dependencies and dependents

Developer opens Scope Tree panel:
  -> Root scope with 2 child scopes (user-session, request-42)
  -> Each scope shows resolved ports and active/disposed status

Developer opens Tracing panel:
  -> Timeline of last 100 resolutions
  -> Average duration: 2.4ms, cache hit rate: 78%
  -> Slow resolutions highlighted (PaymentPort: 340ms avg)

Developer opens Flow panel (auto-discovered):
  -> 3 active machines: OrderFlow (paying), CartFlow (idle), AuthFlow (authenticated)
  -> Running activities: payment-polling (12s elapsed)
```

### 2.6 Comparison with Similar Tools

| Feature             | React Query DevTools | Jotai DevTools  | Redux DevTools     | HexDI DevTools            |
| ------------------- | -------------------- | --------------- | ------------------ | ------------------------- |
| Deployment          | In-app overlay       | In-app overlay  | Browser extension  | In-app overlay            |
| Scope               | Query cache only     | Atom state only | Redux store only   | Entire DI ecosystem       |
| Dependency graph    | No                   | No              | No                 | Yes (interactive)         |
| Scope hierarchy     | No                   | No              | No                 | Yes (tree view)           |
| Resolution tracing  | No                   | No              | Action replay      | Yes (timeline)            |
| Library plugins     | No                   | No              | Middleware-based   | LibraryInspector protocol |
| Type safety         | Partial              | Partial         | Partial            | Full (typed snapshots)    |
| Production overhead | Tree-shakeable       | Tree-shakeable  | Separate extension | Tree-shakeable            |

The key differentiator is scope: existing devtools inspect one library's state. HexDI DevTools inspects the entire application through the unified self-knowledge system. Because every library in the ecosystem reports through the `LibraryInspector` protocol, DevTools has visibility into all of them from a single panel.

---

## 3. Package Structure

```
integrations/devtools/
+-- src/
|   +-- index.ts                    # Public API exports
|   +-- components/
|   |   +-- hex-devtools.tsx        # Main entry component <HexDevTools />
|   |   +-- trigger-button.tsx      # Floating toggle button
|   |   +-- panel-shell.tsx         # Bottom panel container with resize
|   |   +-- tab-bar.tsx             # Horizontal tab navigation
|   |   +-- panel-content.tsx       # Active panel renderer (switch on tab)
|   |   +-- status-badge.tsx        # Phase/health status indicator
|   |   +-- search-bar.tsx          # Panel-level search/filter input
|   |   +-- empty-state.tsx         # Placeholder for panels with no data
|   |   +-- error-boundary.tsx      # Per-panel error boundary
|   +-- panels/
|   |   +-- container-panel.tsx     # Container overview (phase, singletons, scopes, stats)
|   |   +-- graph-panel.tsx         # Dependency graph visualization
|   |   +-- scope-tree-panel.tsx    # Scope hierarchy (tree view)
|   |   +-- tracing-panel.tsx       # Resolution tracing timeline
|   |   +-- library-panel.tsx       # Generic library inspector panel renderer
|   |   +-- event-log-panel.tsx     # Real-time event stream
|   +-- hooks/
|   |   +-- use-devtools-state.ts   # Internal devtools state (open/closed, active tab, height)
|   |   +-- use-panel-registry.ts   # Registered panel plugins (built-in + library)
|   |   +-- use-library-panels.ts   # Auto-detected library panels from inspector
|   |   +-- use-persisted-state.ts  # localStorage persistence for panel state
|   |   +-- use-keyboard-shortcut.ts # Keyboard shortcut listener
|   +-- context/
|   |   +-- devtools-context.tsx    # Internal devtools context (state, dispatch)
|   |   +-- theme-context.tsx       # Theme (light/dark) context
|   +-- visualization/
|   |   +-- graph-renderer.tsx      # Dependency graph rendering (dagre layout + SVG)
|   |   +-- graph-layout.ts         # dagre-based layout computation
|   |   +-- graph-node.tsx          # Individual node in the graph (port box)
|   |   +-- graph-edge.tsx          # Dependency edge (arrow with label)
|   |   +-- scope-tree-renderer.tsx # Tree visualization (nested expandable nodes)
|   |   +-- timeline-renderer.tsx   # Tracing timeline (horizontal bar chart)
|   |   +-- timeline-entry.tsx      # Single trace entry in the timeline
|   +-- theme/
|   |   +-- tokens.ts              # Design tokens (colors, spacing, typography, radii)
|   |   +-- light.ts               # Light theme token values
|   |   +-- dark.ts                # Dark theme token values
|   |   +-- use-theme.ts           # Hook for accessing current theme tokens
|   +-- types.ts                    # Panel plugin types, DevToolsConfig, internal types
|   +-- constants.ts                # Default config values, z-index, animation durations
+-- package.json
+-- tsconfig.json
+-- tsconfig.build.json
+-- vitest.config.ts
+-- eslint.config.js
```

### 3.1 Dependency Graph

```
@hex-di/devtools -------> @hex-di/react -------> @hex-di/core
       |                       |                       |
       |                       v                       v
       |                  @hex-di/runtime         @hex-di/graph
       |
       +--- dagre (layout only, no rendering framework)
```

`@hex-di/devtools` has exactly one non-HexDI dependency: `dagre` (or a lightweight equivalent) for computing dependency graph layouts. All rendering is pure SVG generated by React components. No D3, no Canvas libraries, no heavy visualization frameworks.

### 3.2 Package Roles

| Package            | Role                                                                                                        | Framework Dependency |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| `@hex-di/devtools` | Visual overlay: panels, visualization, theme system                                                         | `react` >= 18        |
| `@hex-di/core`     | Inspection types: `InspectorAPI`, `UnifiedSnapshot`, `LibraryInspector`, `ContainerGraphData`, `TracingAPI` | None                 |
| `@hex-di/react`    | Reactive hooks: `useInspector`, `useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary`    | `react` >= 18        |
| `@hex-di/runtime`  | Container implementation: `container.inspector` accessor                                                    | None                 |

### 3.3 Peer Dependencies

| Package            | Dependencies            | Peer Dependencies                                                 |
| ------------------ | ----------------------- | ----------------------------------------------------------------- |
| `@hex-di/devtools` | `dagre` (layout engine) | `react` >= 18, `@hex-di/core`, `@hex-di/runtime`, `@hex-di/react` |

### 3.4 Exports

The public API surface of `@hex-di/devtools` is intentionally minimal:

```
Exports from @hex-di/devtools:

Components:
  HexDevTools          -- Main entry component (the only required export)

Types:
  HexDevToolsProps     -- Props for the main component
  DevToolsConfig       -- Configuration options (position, theme, shortcuts)
  PanelDefinition      -- Panel plugin interface for custom panels
  DevToolsTheme        -- Theme token type (for custom themes)
```

Users import `HexDevTools` and render it inside an `InspectorProvider`. Everything else is internal.

### 3.5 What Exists Today vs. What is New

```
EXISTING INFRASTRUCTURE             NEW in @hex-di/devtools
+-----------------------------------+-----------------------------------+
| @hex-di/core                      | <HexDevTools /> overlay component |
|   InspectorAPI                    | Trigger button (floating toggle)  |
|   ContainerSnapshot               | Panel shell (resizable bottom)    |
|   ScopeTree                       | Tab bar navigation                |
|   UnifiedSnapshot                 | Container overview panel          |
|   LibraryInspector protocol       | Dependency graph visualization    |
|   LibraryEvent                    | Scope tree panel                  |
|   ContainerGraphData              | Tracing timeline panel            |
|   VisualizableAdapter             | Library panel (auto-discovered)   |
|   TracingAPI / TraceEntry         | Event log panel                   |
|   ResultStatistics                | Light/dark theme system           |
| @hex-di/react                     | Design token architecture         |
|   InspectorProvider               | dagre-based graph layout          |
|   useInspector                    | SVG graph renderer                |
|   useSnapshot                     | Keyboard shortcut handling        |
|   useScopeTree                    | localStorage panel persistence    |
|   useUnifiedSnapshot              |                                   |
|   useTracingSummary               | DEFERRED                          |
|   DevToolsBridge                  +-----------------------------------+
| @hex-di/runtime                   | Browser extension                 |
|   container.inspector accessor    | Time-travel debugging             |
+-----------------------------------+ Performance flame graphs           |
                                    | Custom panel plugin API (rich)    |
                                    | Panel export/import               |
                                    +-----------------------------------+
```

The key point: all inspection data already exists. DevTools is a pure rendering layer on top of the existing infrastructure. No new container APIs, no new event types, no new inspection protocols are needed for v0.1.0 (the typed `LibraryInspector` protocol enhancement in Section 4 improves the existing protocol but does not replace it).

---

_Next: [02 - Compile-Time Protocol](./02-compile-time-protocol.md)_
