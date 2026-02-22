# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/devtools` is a standalone web dashboard for inspecting HexDI applications at runtime. It runs as its own process on a dedicated port (default `localhost:4200`) and connects to target applications over WebSocket. Target apps -- whether React frontends or Node.js backends -- install a lightweight client library (`@hex-di/devtools-client`) that wraps the container's self-knowledge and streams it to the dashboard.

Launch the dashboard with `npx @hex-di/devtools`. Connect a target app by adding a few lines of code:

```typescript
// In a Node.js app
import { connectDevTools } from "@hex-di/devtools-client";
connectDevTools(container.inspector, { appName: "api-server", appType: "node" });

// In a React app
import { DevToolsClientProvider } from "@hex-di/devtools-client/react";
<DevToolsClientProvider config={{ appName: "web-app", appType: "react" }}>
  <App />
</DevToolsClientProvider>
```

The dashboard provides visual access to everything the container knows about itself: registered services, dependency graphs, scope hierarchies, resolution traces, library-specific state, and the unified snapshot. Multiple apps can connect simultaneously, with a connection sidebar for switching between them.

The devtools consumes the existing inspection infrastructure built into `@hex-di/core` and `@hex-di/runtime`:

- **InspectorAPI** (`container.inspector`) -- pull-based queries for container snapshots, scope trees, adapter info, graph data, result statistics, and library inspector registry
- **UnifiedSnapshot** -- aggregated view combining `ContainerSnapshot` with all registered `LibraryInspector` snapshots
- **ContainerGraphData** -- adapter dependency information with origin/inheritance metadata for graph visualization
- **TracingAPI** -- resolution trace entries with filtering, statistics, and real-time subscription
- **LibraryInspector protocol** -- the extensible protocol that ecosystem libraries (Flow, Store, Query, Saga, Agent, Logger) implement to report their domain-specific state

The devtools does not add new inspection capabilities to the container. It visualizes the self-knowledge that already exists. Every panel in the dashboard maps directly to an `InspectorAPI` method or a `LibraryInspector` snapshot.

### 1.1 Goals

1. **Zero-config client** -- Install `@hex-di/devtools-client`, call `connectDevTools(inspector, config)`. No port registration, no adapter wiring. The client discovers available data automatically from the `InspectorAPI` and streams it to the dashboard.

2. **Framework-agnostic client** -- The transport client works in React, Node.js, Hono, Express, or any JavaScript environment. It has no React dependency at its core. A `DevToolsClientProvider` React component is provided as an optional convenience wrapper.

3. **Multi-target inspection** -- Connect multiple applications to a single dashboard simultaneously. A React frontend and its Node.js backend can both connect, giving a unified view of the entire system's DI state.

4. **Compile-time aware** -- The typed `LibraryInspector` protocol (Section 4) ensures that library snapshot shapes are known to TypeScript at build time. DevTools panels can render library-specific data with full type safety, not just `Record<string, unknown>`.

5. **Plugin-based panels** -- Each registered `LibraryInspector` gets its own panel in the dashboard. The container panel, graph panel, scope tree panel, and tracing panel are built-in. Library panels are auto-discovered from the inspector data arriving over WebSocket.

6. **Standalone application** -- The dashboard runs as its own process, completely decoupled from the target application's framework, build system, and runtime. No React dependency in the target app (unless it's already a React app). No style conflicts, no z-index battles, no bundle size impact on the target app.

### 1.2 Non-Goals (v0.1.0)

1. **Not a browser extension** -- The devtools is a standalone dashboard, not a Chrome/Firefox extension. A browser extension that communicates via the same WebSocket protocol is a future concern.

2. **Not time-travel debugging** -- Replaying past states requires the Store library's action history and Flow's serialization. This is deferred until those libraries ship their inspectors.

3. **Not a performance profiler** -- The tracing panel shows resolution timelines and statistics, but it is not a flame graph profiler. Deeper performance analysis is deferred.

4. **Not network/HTTP inspection** -- HTTP request/response monitoring is outside DI scope. Query library panels may show fetch status, but raw network traffic is not displayed.

### 1.3 When to Use

| Use DevTools                                                        | Do Not Use DevTools                               |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| During development to understand container state                    | In production bundles (tree-shake the client out) |
| To debug resolution failures and missing adapters                   | For automated monitoring (use MCP/OTel instead)   |
| To visualize dependency graph topology                              | For network traffic analysis                      |
| To monitor library state (Flow machines, Store values, Query cache) | For performance profiling (use browser DevTools)  |
| To inspect scope hierarchies and lifecycle                          | For CI/CD pipeline inspection                     |
| To trace resolution timing and cache hit rates                      | For log aggregation (use Logger inspectors)       |
| To inspect Node.js backend container state from a browser           | For production health dashboards (use Grafana)    |

### 1.4 Key Insight

VISION.md describes two diagnostic interfaces for the self-aware application: the **diagnostic port** (MCP/A2A -- for AI agents and external tools) and the **dashboard** (for human developers). DevTools is the dashboard.

All three consumers -- MCP, the DevTools client, and the DevTools dashboard -- consume the same self-knowledge infrastructure. The `InspectorAPI` and `LibraryInspector` protocol are the shared data layer. MCP serializes this data as JSON resources and tools for AI consumption. The DevTools client serializes and streams it over WebSocket. The DevTools dashboard renders it as interactive visual panels for human consumption. None of them add new inspection capabilities -- they are all consumers of the container's existing self-knowledge.

The MCP Server in the diagram below is built with the `@hex-di/mcp` framework (see [`spec/libs/mcp/`](../mcp/README.md)). `@hex-di/mcp` provides the typed port definitions (`McpResourcePort<T>`, `McpToolPort<I,O>`, `McpPromptPort<A>`), adapter contracts, server factory (`createMcpServer()`), and transport abstractions. The DevTools standalone server uses this framework to expose its 34 resources, 18 tools, and 5 prompts for container/library inspection as MCP capabilities alongside its WebSocket dashboard.

```
                    +------------------------------------------+
                    |       Container Self-Knowledge            |
                    |                                          |
                    |  InspectorAPI    LibraryInspector[]       |
                    |  ContainerGraphData   TracingAPI          |
                    |  UnifiedSnapshot   ResultStatistics       |
                    +------+---------------+-------------------+
                           |               |
              +------------+       +-------+--------+
              |                    |                |
    +---------v---------+  +------v------+  +------v--------------+
    |    MCP Server     |  |  DevTools   |  |  DevTools Dashboard |
    |                   |  |  Client     |  |                     |
    |  AI agents query  |  |  Serializes |  |  Receives data via  |
    |  structured JSON  |  |  & streams  |  |  WebSocket, renders |
    |  resources        |  |  over WS    |  |  interactive panels |
    |                   |  |             |  |                     |
    |  (the OBD-II port)|  | (the cable) |  |  (the dashboard)    |
    +-------------------+  +-------------+  +---------------------+
```

### 1.5 Scope of Version 0.1.0

**Ships in 0.1.0:**

- `@hex-di/devtools` standalone dashboard application
- CLI entry point: `npx @hex-di/devtools` (starts WebSocket server + Vite dev server)
- Built-in WebSocket server for receiving client connections
- Connection sidebar for managing multiple connected apps
- Full-page dashboard layout with sidebar navigation
- Built-in panels: Unified Overview, Container overview, Dependency graph, Scope tree, Tracing timeline, Health & Diagnostics, Event log
- Auto-discovered library panels from `LibraryInspector` data
- Instance identification (instanceId per tab/process, ConnectionMetadata, displayLabel)
- Subscription-based push protocol (subscribe/unsubscribe alongside request-response)
- Dedicated library panels via panelModule dynamic import (Flow statechart, Query cache table, Store state inspector, Saga pipeline, Logger log stream)
- localStorage/sessionStorage split for multi-dashboard-tab support
- Light and dark themes with system preference detection
- Design token system for consistent styling
- Keyboard shortcuts for panel navigation
- Dashboard state persistence: global prefs in localStorage (theme, sidebar width), per-tab navigation in sessionStorage (active connection, active panel)

- `@hex-di/devtools-client` transport library
- `connectDevTools()` function for Node.js / plain JS usage
- `DevToolsClientProvider` React component for React usage
- Auto-reconnection with configurable interval
- Message buffering during disconnection (configurable buffer size)
- Instance identification: auto-generated instanceId + metadata (URL/title for browser, PID/argv for Node.js)
- Inspector event subscription and streaming

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

- DevTools never bypasses the `InspectorAPI`. The client calls the same methods that MCP would call.
- DevTools never stores its own copy of application state. The client subscribes to inspector events and streams them.
- DevTools can be removed without losing any diagnostic capability. MCP, OTel export, and programmatic inspection all continue to work.

**Principle 2: Every Library Has a Voice**

Each library that implements the `LibraryInspector` protocol gets its own dedicated panel in the dashboard. The devtools does not interpret or transform library data. It provides a rendering surface and lets each library present itself.

When `@hex-di/flow` registers a `FlowInspector`, the client streams its snapshot to the dashboard, which discovers it and renders a "Flow" panel. When `@hex-di/query` registers a `QueryInspector`, a "Query" panel appears. Libraries that are not installed produce no panels. The panel set is dynamic and reflects the actual libraries registered with each connected container.

For built-in panels (Container, Graph, Scope Tree, Tracing), the dashboard has first-party rendering logic. For library panels, it renders the library's snapshot data in a generic key-value explorer with the option for libraries to provide custom panel components.

Beyond the generic key-value explorer, each library can ship a dedicated panel component at a `/devtools` entry point (e.g., `@hex-di/flow/devtools`). The `LibraryInspector` protocol's `panelModule` field tells the dashboard which module to dynamically import. The Flow library provides a statechart visualizer, Query provides a cache table (like TanStack Query DevTools), Store provides a state inspector with diff viewer (like Redux DevTools), Saga provides a pipeline visualization, and Logger provides a structured log stream. Libraries that don't provide a `panelModule` fall back to the generic tree view.

**Principle 3: Compile-Time Truth**

The typed `LibraryInspector` protocol (Section 4) ensures that TypeScript knows at build time which libraries are inspectable and what shape their snapshots take. This is not just a runtime convenience -- it is a compile-time contract.

When a developer registers a `FlowInspector` with the container, TypeScript knows the snapshot contains `machineCount`, `machines`, `healthEvents`. The devtools-client serializes these fields with known shapes. The dashboard deserializes and renders them with full type inference. No `unknown` casting, no runtime shape discovery, no "hope the data looks right" rendering.

**Principle 4: Zero Cost = Separate Process**

The DevTools dashboard runs as a separate process, not embedded in the target application. This provides true zero-cost inspection:

- The dashboard's React components, theme system, visualization libraries, and WebSocket server add zero bytes to the target application's bundle.
- The `@hex-di/devtools-client` is the only dependency added to the target app. It is lightweight (serialization + WebSocket transport, no UI code).
- In production, excluding `connectDevTools()` (or guarding it with `process.env.NODE_ENV`) removes all devtools overhead. The inspection infrastructure (`InspectorAPI`, hooks) remains available for MCP and other diagnostic consumers.
- No style conflicts, no z-index battles, no React version conflicts, no SSR issues.

**Principle 5: Transport-Agnostic Architecture**

The dashboard consumes data through a `RemoteInspectorAPI` that mirrors the local `InspectorAPI` interface. The panels don't know (or care) whether their data comes from a local in-process inspector or a remote WebSocket connection. This architecture means:

- The same panel components could be reused in a future in-app overlay mode.
- Different transport mechanisms (WebSocket, SSE, HTTP polling) could be swapped without changing panel code.
- The `RemoteInspectorAPI` adapter is the single integration point between transport and UI.

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
                         +---------------------------+
                         |    Diagnostic Consumers    |
                         |  MCP   Client   Dashboard  |
                         +-------------+-------------+
                                       |
                         +-------------v-------------+
                         |  Central Nerve Cluster     |
                         |  +---------------------+  |
                         |  | Container Panel     |  |
                         |  | Graph Panel         |  |
                         |  | Scope Tree Panel    |  |
                         |  +---------------------+  |
                         +-----+------+------+-------+
                               |      |      |
               +---------------+      |      +---------------+
               |                      |                      |
    +----------v----------+ +---------v--------+ +-----------v----------+
    |   Sensory Nerves    | |  Motor Nerves    | |   Reflex Arcs        |
    |                     | |                  | |                      |
    |  Tracing Panel      | |  Store Panel     | |  Saga Panel          |
    |  Query Panel        | |  Agent Panel     | |  Flow Panel          |
    |  Logger Panel       | |                  | |                      |
    +---------------------+ +------------------+ +----------------------+
               |                      |                      |
               +----------------------+----------------------+
                                      |
                         +------------v-------------+
                         |  Cross-Cutting Panels     |
                         |  Event Log (all signals)  |
                         |  Overview (convergence)   |
                         |  Health (diagnostics)     |
                         +---------------------------+
```

### 2.3 Architecture Overview

```
Target Application(s)                      DevTools Dashboard
(React / Node.js / Hono / Express)         (localhost:4200)

+---------------------------------------+  +---------------------------------------+
|                                       |  |                                       |
|  +--------+    @hex-di/devtools-client|  |  @hex-di/devtools                     |
|  |Container|                          |  |                                       |
|  |  .inspector                        |  |  +---+---------------------------+    |
|  |  InspectorAPI                      |  |  |   | Connection Header         |    |
|  +----+---+                           |  |  | S |  app: "api-server" (node) |    |
|       |                               |  |  | I |  status: connected        |    |
|       v                               |  |  | D +---------------------------+    |
|  +----+---+                           |  |  | E |                           |    |
|  |connectDevTools()                   |  |  | B | Active Panel Content      |    |
|  |  subscribes to events              |  |  | A |                           |    |
|  |  serializes snapshots    WebSocket |  |  | R | - Container overview      |    |
|  |  buffers on disconnect  ---------> |  |  |   | - Dependency graph        |    |
|  +--------+                           |  |  | A | - Scope tree             |    |
|           |                           |  |  | P | - Tracing timeline       |    |
|           v                           |  |  | P | - Library panels         |    |
|  Auto-reconnection                    |  |  | S | - Event log              |    |
|  on disconnect                        |  |  |   |                           |    |
|                                       |  |  +---+---------------------------+    |
+---------------------------------------+  +---------------------------------------+
```

### 2.4 Data Flow

```
  Target App                     Transport                 Dashboard
  (InspectorAPI)                 (devtools-client)          (RemoteInspectorAPI -> Panels)
       |                              |                          |
       v                              v                          v
  +----------+                 +--------------+           +---------------+
  | inspector|  subscribe     | connectDev   |  WebSocket | RemoteInspect |
  | .get     |--------------->| Tools()      |---------->| orAPI         |
  | Snapshot |   events       |              |  messages  |               |
  | .get     |                | serializes   |           | useRemote     |
  | ScopeTree|  pull on event | snapshots,   |           | Snapshot()    |
  | .get     |--------------->| events,      |---------->| useRemote     |
  | Unified  |                | graph data   |           | ScopeTree()   |
  | Snapshot |                |              |           | useRemote     |
  | .get     |                | buffers on   |           | UnifiedSnap() |
  | GraphData|                | disconnect   |           | useConnections|
  | .get     |                |              |           |  ()           |
  | Library  |                | reconnects   |           +-------+-------+
  | Inspector|                | automatically|                   |
  +----------+                +--------------+                   v
                                                          +---------------+
                                                          | ContainerPanel|
                                                          | GraphPanel    |
                                                          | ScopePanel    |
                                                          | TracingPanel  |
                                                          | LibraryPanel  |
                                                          | EventLogPanel |
                                                          +---------------+
```

The devtools-client subscribes to the target app's `InspectorAPI` events and performs pull queries when events fire. It serializes the data as JSON and streams it over WebSocket to the dashboard. The dashboard's `RemoteInspectorAPI` reconstructs the inspector interface from the incoming messages, and the dashboard's React hooks consume it identically to how the `@hex-di/react` hooks consume a local `InspectorAPI`.

**Shared data contract with Hono diagnostic routes**: The `@hex-di/hono` integration exposes the same `InspectorAPI` data through HTTP endpoints (`/hexdi/health`, `/hexdi/snapshot`, `/hexdi/ports`, `/hexdi/scopes`, `/hexdi/graph`, `/hexdi/unified`). DevTools, Hono routes, and MCP all consume the same underlying methods. This shared contract means any data visible in DevTools is also available programmatically through Hono routes and MCP resources.

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

Developer: "What's happening in my Node.js backend?"
  -> SSH into the server, add console.log statements
  -> Redeploy, reproduce the issue, read logs
```

**After DevTools: The Informed Developer**

The developer runs `npx @hex-di/devtools`, connects their apps, and sees everything at a glance:

```
Dashboard shows two connected apps: "web-app" (React) and "api-server" (Node)

Developer selects "api-server" in the sidebar:

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

Developer switches to "web-app" in the sidebar:
  -> Sees the React frontend's container state side-by-side

Developer opens Flow panel (auto-discovered):
  -> 3 active machines: OrderFlow (paying), CartFlow (idle), AuthFlow (authenticated)
  -> Running activities: payment-polling (12s elapsed)
```

### 2.6 Comparison with Similar Tools

| Feature             | React Query DevTools | Jotai DevTools  | Redux DevTools     | Jaeger UI      | HexDI DevTools                               |
| ------------------- | -------------------- | --------------- | ------------------ | -------------- | -------------------------------------------- |
| Deployment          | In-app overlay       | In-app overlay  | Browser extension  | Standalone app | Standalone dashboard                         |
| Scope               | Query cache only     | Atom state only | Redux store only   | Tracing only   | Entire DI ecosystem                          |
| Server inspection   | No                   | No              | No                 | Yes            | Yes                                          |
| Multi-app           | No                   | No              | No                 | Yes            | Yes                                          |
| Dependency graph    | No                   | No              | No                 | DAG view       | Yes (interactive)                            |
| Scope hierarchy     | No                   | No              | No                 | No             | Yes (tree view)                              |
| Resolution tracing  | No                   | No              | Action replay      | Yes            | Yes (timeline)                               |
| Library plugins     | No                   | No              | Middleware-based   | No             | LibraryInspector protocol + dedicated panels |
| Type safety         | Partial              | Partial         | Partial            | None           | Full (typed snapshots)                       |
| Production overhead | Tree-shakeable       | Tree-shakeable  | Separate extension | Separate app   | Separate app + client                        |

The key differentiator is scope: existing devtools inspect one library's state. HexDI DevTools inspects the entire application through the unified self-knowledge system. Because every library in the ecosystem reports through the `LibraryInspector` protocol, DevTools has visibility into all of them from a single dashboard. And because it's a standalone app, it works equally well with frontend and backend applications.

---

## 3. Package Structure

### 3.1 `@hex-di/devtools` (Dashboard)

```
packages/devtools/
+-- src/
|   +-- index.ts                    # Public API exports
|   +-- cli.ts                      # CLI entry point (npx @hex-di/devtools)
|   +-- server/
|   |   +-- websocket-server.ts    # WebSocket server for client connections
|   |   +-- connection-manager.ts  # Manages connected clients, heartbeat, stale detection
|   |   +-- message-router.ts     # Routes incoming messages to RemoteInspectorAPI instances
|   +-- remote/
|   |   +-- remote-inspector.ts   # RemoteInspectorAPI implementation (from WS messages)
|   |   +-- message-types.ts      # ClientToServerMessage, ServerToClientMessage unions
|   |   +-- deserializer.ts       # JSON deserialization for inspector data types
|   +-- components/
|   |   +-- dashboard-app.tsx     # Root dashboard component
|   |   +-- dashboard-layout.tsx  # Sidebar + Main layout
|   |   +-- sidebar/
|   |   |   +-- app-list.tsx      # Connected applications list
|   |   |   +-- panel-nav.tsx     # Vertical panel navigation
|   |   |   +-- connection-status.tsx # Connection status indicator
|   |   +-- main/
|   |   |   +-- connection-header.tsx # Active app name, status, latency
|   |   |   +-- panel-content.tsx    # Active panel renderer
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
|   |   +-- overview-panel.tsx      # Unified overview (convergence point)
|   |   +-- health-panel.tsx        # Health & diagnostics
|   +-- hooks/
|   |   +-- use-remote-inspector.ts  # RemoteInspectorAPI for a connection
|   |   +-- use-remote-snapshot.ts   # ContainerSnapshot from remote
|   |   +-- use-remote-scope-tree.ts # ScopeTree from remote
|   |   +-- use-remote-unified-snapshot.ts # UnifiedSnapshot from remote
|   |   +-- use-connections.ts       # All active connections
|   |   +-- use-active-connection.ts # Currently selected connection
|   |   +-- use-dashboard-state.ts   # Internal dashboard state (active panel, sidebar)
|   |   +-- use-panel-registry.ts    # Registered panels (built-in + library)
|   |   +-- use-library-panels.ts    # Auto-detected library panels from remote data
|   |   +-- use-persisted-state.ts   # localStorage persistence for dashboard state
|   |   +-- use-keyboard-shortcut.ts # Keyboard shortcut listener
|   +-- context/
|   |   +-- connection-context.tsx  # Connection management context
|   |   +-- dashboard-context.tsx   # Dashboard state context (active panel, etc.)
|   |   +-- navigation-context.tsx  # Cross-panel navigation context
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
|   +-- types.ts                    # Panel plugin types, config, internal types
|   +-- constants.ts                # Default config values, animation durations
+-- package.json
+-- tsconfig.json
+-- tsconfig.build.json
+-- vitest.config.ts
+-- eslint.config.js
+-- vite.config.ts                  # Vite config for dashboard app
```

### 3.2 `@hex-di/devtools-client` (Transport Client)

```
packages/devtools-client/
+-- src/
|   +-- index.ts                    # Public API: connectDevTools, DevToolsClientConfig, etc.
|   +-- react.ts                    # React entry: DevToolsClientProvider
|   +-- transport/
|   |   +-- websocket-transport.ts # WebSocket connection, send, reconnect
|   |   +-- message-buffer.ts     # Ring buffer for messages during disconnect
|   |   +-- serializer.ts         # Serializes InspectorAPI data to JSON messages
|   +-- bridge/
|   |   +-- inspector-bridge.ts   # Subscribes to InspectorAPI, triggers serialization
|   |   +-- event-forwarder.ts    # Forwards InspectorEvents to transport
|   +-- react/
|   |   +-- devtools-client-provider.tsx  # React convenience wrapper
|   +-- types.ts                    # DevToolsClientConfig, DevToolsConnection, message types
|   +-- constants.ts                # Default server URL, reconnect interval, buffer size
+-- package.json
+-- tsconfig.json
+-- tsconfig.build.json
+-- vitest.config.ts
+-- eslint.config.js
```

### 3.3 Dependency Graph

```
@hex-di/devtools (dashboard)           @hex-di/devtools-client (transport)
       |                                       |
       +--- react (dashboard UI)               +--- @hex-di/core (peer: InspectorAPI types)
       +--- ws (WebSocket server)              +--- @hex-di/runtime (peer: Container types)
       +--- vite (dev server + build)          +--- @hex-di/react (optional peer: Provider)
       +--- dagre (graph layout)
                                               No dependency on @hex-di/devtools
@hex-di/devtools has NO dependency             @hex-di/devtools has NO dependency
on @hex-di/core, runtime, or react.            on @hex-di/devtools-client.
It receives all data over WebSocket.           They communicate only via WebSocket protocol.
```

### 3.4 Package Roles

| Package                   | Role                                                                                                        | Framework Dependency  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------- |
| `@hex-di/devtools`        | Standalone dashboard: panels, visualization, theme, WebSocket server, CLI                                   | `react` >= 18         |
| `@hex-di/devtools-client` | Transport client: serialization, WebSocket transport, reconnection, buffering                               | None (React optional) |
| `@hex-di/core`            | Inspection types: `InspectorAPI`, `UnifiedSnapshot`, `LibraryInspector`, `ContainerGraphData`, `TracingAPI` | None                  |
| `@hex-di/react`           | Reactive hooks: `useInspector`, `useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary`    | `react` >= 18         |
| `@hex-di/runtime`         | Container implementation: `container.inspector` accessor                                                    | None                  |

### 3.5 Exports

**`@hex-di/devtools` exports:**

```
CLI:
  npx @hex-di/devtools             -- Starts the dashboard (WS server + Vite dev server)

Types (for panel plugin authors):
  PanelDefinition                  -- Panel plugin interface for custom panels
  PanelProps                       -- Props received by panel components
  RemoteInspectorAPI               -- Remote inspector interface
  DevToolsServerConfig             -- Server configuration options
  DevToolsTheme                    -- Theme token type (for custom themes)
```

**`@hex-di/devtools-client` exports:**

```
Functions:
  connectDevTools                  -- Connect an InspectorAPI to the dashboard

React Components:
  DevToolsClientProvider           -- React convenience wrapper (from "@hex-di/devtools-client/react")

Types:
  DevToolsClientConfig             -- Client configuration options
  DevToolsConnection               -- Connection handle (status, disconnect)
```

### 3.6 What Exists Today vs. What is New

```
EXISTING INFRASTRUCTURE             NEW in @hex-di/devtools + devtools-client
+-----------------------------------+-----------------------------------+
| @hex-di/core                      | @hex-di/devtools (dashboard)      |
|   InspectorAPI                    |   CLI entry point                 |
|   ContainerSnapshot               |   WebSocket server                |
|   ScopeTree                       |   RemoteInspectorAPI              |
|   UnifiedSnapshot                 |   Connection management           |
|   LibraryInspector protocol       |   Full-page dashboard layout      |
|   LibraryEvent                    |   Sidebar (apps + panel nav)      |
|   ContainerGraphData              |   Container overview panel        |
|   VisualizableAdapter             |   Dependency graph visualization  |
|   TracingAPI / TraceEntry         |   Scope tree panel                |
|   ResultStatistics                |   Tracing timeline panel          |
| @hex-di/react                     |   Library panels (auto-discovered)|
|   InspectorProvider               |   Event log panel                 |
|   useInspector                    |   Overview panel                  |
|   useSnapshot                     |   Health & Diagnostics panel      |
|   useScopeTree                    |   Light/dark theme system         |
|   useUnifiedSnapshot              |   Design token architecture       |
|   useTracingSummary               |   dagre-based graph layout        |
|   DevToolsBridge                  |   SVG graph renderer              |
| @hex-di/runtime                   |                                   |
|   container.inspector accessor    | @hex-di/devtools-client           |
+-----------------------------------+   connectDevTools() function      |
                                    |   DevToolsClientProvider          |
                                    |   WebSocket transport             |
                                    |   Auto-reconnection               |
                                    |   Message buffering               |
                                    |   Inspector event forwarding      |
                                    |                                   |
                                    | DEFERRED                          |
                                    +-----------------------------------+
                                    | Browser extension                 |
                                    | Time-travel debugging             |
                                    | Performance flame graphs          |
                                    | Custom panel plugin API (rich)    |
                                    | Panel export/import               |
                                    +-----------------------------------+
```

The key point: all inspection data already exists. The devtools-client is a serialization + transport layer, and the dashboard is a rendering layer. No new container APIs, no new event types, no new inspection protocols are needed for v0.1.0 (the typed `LibraryInspector` protocol enhancement in Section 4 improves the existing protocol but does not replace it).

---

_Next: [02 - Compile-Time Protocol](./02-compile-time-protocol.md)_
