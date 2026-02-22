# 01 — Overview

## 1. Overview

### 1.1 What Is the HexDi Playground?

The HexDi Playground is an interactive browser-based environment for writing, compiling, and executing HexDi dependency injection code. It combines a full-featured TypeScript editor with the same visualization panels used by HexDi DevTools, creating a self-contained experimentation tool that requires no server, no installation, and no target application.

Where DevTools inspects a _running_ application over WebSocket, the Playground runs user code _locally_ in a Web Worker sandbox and feeds the resulting container state into the same panel infrastructure. The panels cannot distinguish between the two sources — they consume the same `InspectorDataSource` interface.

### 1.2 Goals

1. **Zero-friction experimentation** — Open a URL, write HexDi code, see the dependency graph. No `npm install`, no `tsconfig.json`, no build step.
2. **Full TypeScript experience** — Autocomplete, type checking, inline errors, go-to-definition for all hex-di packages.
3. **Visual feedback** — Every panel from DevTools (graph, scope tree, tracing timeline, etc.) works identically in the playground.
4. **Shareable** — Encode the full multi-file workspace into a URL hash. Anyone with the link sees the same code and visualization.
5. **Embeddable** — Documentation sites can embed playground instances in iframes with pre-loaded examples.
6. **Static-hostable** — The entire playground is a static site. Deploy to any CDN, GitHub Pages, or serve from `npx`.
7. **Educational** — Curated examples cover every HexDi pattern from basic registration to saga orchestration.

### 1.3 Non-Goals

- **Production debugging** — Use DevTools for inspecting live applications. The playground executes throwaway experiments.
- **Full IDE replacement** — The playground supports multi-file editing but is not a VS Code alternative. No git integration, no terminal, no extensions.
- **Server-side execution** — All compilation and execution happens in the browser. There is no backend API.
- **Live-as-you-type execution** — v1 uses an explicit "Run" button. Auto-execution may be added later.
- **Package installation** — Only pre-bundled hex-di packages are available. Users cannot `import` arbitrary npm packages.

### 1.4 Version 0.1.0 Scope

Everything described in this specification is in scope for v0.1.0:

- Monaco editor with TypeScript language service
- Multi-file virtual filesystem with file tree
- esbuild-wasm compilation pipeline
- Web Worker sandbox with 5s timeout
- All 7 visualization panels from devtools-ui
- Console output capture and rendering
- ~12 curated example templates
- URL hash sharing (multi-file)
- Iframe-embeddable mode (`?embed=true`)
- Light/dark theme (shared with DevTools)
- Three-pane resizable layout

---

## 2. Philosophy

### 2.1 Playground as a DevTools Sibling

The playground and DevTools are siblings, not parent-child. They share the same visualization DNA (`@hex-di/devtools-ui`) but serve fundamentally different workflows:

| Aspect          | DevTools                              | Playground                              |
| --------------- | ------------------------------------- | --------------------------------------- |
| **User**        | Developer debugging a running app     | Developer learning or prototyping       |
| **Data source** | Remote process over WebSocket         | Local sandbox via postMessage           |
| **Lifecycle**   | Long-lived connections, multiple apps | Short-lived executions, single sandbox  |
| **Code**        | Read-only (inspects existing code)    | Read-write (user writes and edits code) |
| **Deployment**  | Alongside development server          | Standalone URL or embedded in docs      |

### 2.2 The Transport Abstraction

The architectural insight that enables panel sharing is that both devtools and playground consume the same `InspectorAPI` data — they differ only in _transport_:

```
DevTools:    Target App → devtools-client → WebSocket → RemoteInspectorAPI → panels
Playground:  User Code  → esbuild-wasm   → Worker     → PlaygroundBridge   → panels
```

Both `RemoteInspectorAPI` and `PlaygroundInspectorBridge` implement `InspectorDataSource`. Panels program against this interface and are transport-agnostic.

### 2.3 Design Principles

1. **Panels are reusable atoms** — A panel component receives `InspectorDataSource` and renders. It has no knowledge of how the data arrived.
2. **Compilation is fast, execution is isolated** — esbuild-wasm compiles in ~50ms. The Web Worker sandbox provides JavaScript-level isolation with a hard timeout.
3. **URLs are the save format** — The playground has no backend. The URL hash _is_ the persistence layer. If you have the URL, you have the workspace.
4. **Examples teach by showing** — Each example is a self-contained, runnable program. No progressive tutorials, no hidden setup code.
5. **Embed anywhere** — The playground adapts to any container size. Documentation sites embed it in iframes with pre-loaded examples that readers can modify and re-run.

---

## 3. Package Architecture

### 3.1 Dependency Graph

```
@hex-di/core (InspectorAPI, types)
       │
@hex-di/devtools-ui  ← NEW, SHARED
(panels, visualization, theme, hooks)
       │                    │
@hex-di/devtools       @hex-di/playground  ← NEW
(WS dashboard + CLI)   (code editor + sandbox)
       │
@hex-di/devtools-client
(WS transport for target apps)
```

### 3.2 Package Boundaries

| Package                   | Contains                                                                                                                                                           | Does NOT Contain                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `@hex-di/devtools-ui`     | Panels, graph/tree/timeline renderers, theme system, design tokens, shared UI components, `InspectorDataSource` interface, `LocalInspectorAdapter`, reactive hooks | WebSocket code, connection management, code editor, sandbox, CLI |
| `@hex-di/devtools`        | WS server, `RemoteInspectorAPI`, connection manager, dashboard shell (sidebar, app list), CLI entry point                                                          | Panels, visualization components, theme tokens                   |
| `@hex-di/devtools-client` | `connectDevTools()`, WS transport, serialization, React wrapper                                                                                                    | Everything else                                                  |
| `@hex-di/playground`      | Monaco editor, esbuild-wasm compiler, Web Worker sandbox, virtual FS, example library, URL sharing, console capture, embeddable mode, playground layout            | WebSocket code, connection management, panels, visualization     |

### 3.3 Module Structure: `@hex-di/devtools-ui`

```
packages/devtools-ui/src/
  index.ts                              # Public API barrel export
  data/
    inspector-data-source.ts            # InspectorDataSource interface
    local-inspector-adapter.ts          # Direct InspectorAPI → InspectorDataSource wrapper
  panels/
    types.ts                            # DevToolsPanel, PanelProps interfaces
    registry.ts                         # Panel registry (built-in + library + custom)
    overview-panel.tsx                   # Order 0
    container-panel.tsx                  # Order 5
    graph-panel.tsx                      # Order 10
    scope-tree-panel.tsx                # Order 20
    event-log-panel.tsx                 # Order 30
    tracing-panel.tsx                   # Order 40
    health-panel.tsx                    # Order 50
  visualization/
    graph/                              # Dagre SVG graph renderer
      graph-renderer.tsx
      graph-node.tsx
      graph-edge.tsx
      graph-layout.ts                   # Dagre layout computation
      graph-controls.tsx                # Pan/zoom/fit controls
    tree/
      tree-renderer.tsx                 # Recursive tree view
      tree-node.tsx
      tree-keyboard.ts                  # Keyboard navigation
    timeline/
      timeline-renderer.tsx             # Tracing span bars
      timeline-row.tsx
      timeline-scale.tsx
    json-tree/
      json-tree.tsx                     # JSON object tree viewer
      json-value.tsx                    # Primitive/array/object renderers
  components/
    status-badge.tsx                    # Lifetime/status badges
    search-input.tsx                    # Filterable search
    empty-state.tsx                     # No-data placeholder
    error-boundary.tsx                  # Panel error isolation
    stat-card.tsx                       # Numeric stat display
    sort-header.tsx                     # Sortable table headers
    sidebar-resize-handle.tsx           # Drag-to-resize handle
  hooks/
    use-data-source-snapshot.ts         # useSyncExternalStore for snapshots
    use-data-source-scope-tree.ts       # useSyncExternalStore for scope tree
    use-data-source-unified-snapshot.ts # useSyncExternalStore for unified snapshot
    use-data-source-tracing-summary.ts  # useSyncExternalStore for tracing
    use-table-sort.ts                   # Column sort state
    use-tree-navigation.ts             # Keyboard tree traversal
    use-auto-scroll.ts                 # Auto-scroll to bottom
    use-persisted-state.ts             # localStorage/sessionStorage backed state
    use-keyboard-shortcuts.ts          # Global keyboard shortcut registry
    use-resize-observer.ts             # Element size tracking
  theme/
    tokens.ts                          # Design token definitions
    theme-provider.tsx                 # ThemeProvider component
    use-theme.ts                       # useTheme() hook
    css-variables.ts                   # CSS custom property generation
    system-preference.ts               # Prefers-color-scheme detection
  context/
    data-source-context.tsx            # React context for InspectorDataSource
    panel-context.tsx                  # React context for panel state
```

### 3.4 Module Structure: `@hex-di/playground`

```
packages/playground/src/
  index.ts                              # Public API
  app.tsx                               # Root PlaygroundApp component
  layout/
    playground-layout.tsx               # Three-pane layout orchestrator
    editor-pane.tsx                     # Left: code editor + file tree
    visualization-pane.tsx              # Right: panel host + tab nav
    console-pane.tsx                    # Bottom: console output
    resizable-split.tsx                 # Drag splitter component
  editor/
    code-editor.tsx                     # Monaco wrapper component
    editor-config.ts                    # TypeScript language configuration
    type-definitions.ts                 # Bundled .d.ts file content
    file-tree.tsx                       # Multi-file sidebar tree
    virtual-fs.ts                       # In-memory filesystem
    tab-bar.tsx                         # Open file tabs
  sandbox/
    sandbox-manager.ts                  # Orchestrates compile + execute lifecycle
    compiler.ts                         # esbuild-wasm TypeScript compilation
    executor.ts                         # Web Worker lifecycle management
    container-bridge.ts                 # Extracts InspectorAPI from worker
    worker-protocol.ts                  # postMessage type definitions
    worker-entry.ts                     # Web Worker entry point (runs in worker)
  adapter/
    playground-inspector-bridge.ts      # InspectorDataSource over postMessage
  examples/
    example-registry.ts                 # Example catalog and metadata
    templates/                          # ~12 example template files
      basic-registration.ts
      lifetime-management.ts
      dependency-graph.ts
      scope-hierarchy.ts
      child-containers.ts
      resolution-tracing.ts
      flow-state-machine.ts
      store-state-management.ts
      query-cache-patterns.ts
      saga-orchestration.ts
      error-handling-result.ts
      multi-library-composition.ts
  sharing/
    url-encoder.ts                      # Multi-file state → URL hash
    url-decoder.ts                      # URL hash → multi-file state
  console/
    console-renderer.tsx                # Renders captured console output
    console-interceptor.ts              # Intercepts sandbox console calls
  embed/
    embed-mode.tsx                      # Compact embeddable variant
    embed-detector.ts                   # Detects ?embed=true query param
  context/
    playground-context.tsx              # Top-level playground state
    sandbox-context.tsx                 # Sandbox lifecycle state
  hooks/
    use-playground-state.ts             # Playground-level state management
    use-sandbox.ts                      # Sandbox lifecycle hook
    use-examples.ts                     # Example loading hook
  public/
    index.html                          # Entry HTML (static hosting root)
```

---

## 4. Data Flow Comparison

### 4.1 DevTools Data Flow

```
┌─────────────────────┐    WebSocket     ┌──────────────────────┐
│   Target App        │ ──────────────── │  DevTools Dashboard   │
│                     │                  │                       │
│  InspectorAPI       │   serialize/     │  RemoteInspectorAPI   │
│  (live container)   │   deserialize    │  (InspectorDataSource)│
│                     │                  │         │             │
│  devtools-client    │                  │    devtools-ui        │
│  connectDevTools()  │                  │    panels render      │
└─────────────────────┘                  └──────────────────────┘
```

1. Target app calls `connectDevTools(inspector)` — opens WebSocket
2. `devtools-client` serializes `InspectorAPI` data and events over the wire
3. `RemoteInspectorAPI` on the dashboard side reconstructs the data
4. Panels in `devtools-ui` consume `RemoteInspectorAPI` as `InspectorDataSource`
5. Latency: 2–50ms (network)

### 4.2 Playground Data Flow

```
┌─────────────────────┐   postMessage    ┌──────────────────────┐
│   Web Worker        │ ──────────────── │  Main Thread          │
│                     │                  │                       │
│  User code executes │   structured     │  PlaygroundBridge     │
│  InspectorAPI       │   clone          │  (InspectorDataSource)│
│  (sandbox container)│                  │         │             │
│                     │                  │    devtools-ui        │
│  worker-entry.ts    │                  │    panels render      │
└─────────────────────┘                  └──────────────────────┘
```

1. User clicks "Run" — `sandbox-manager` compiles TS with esbuild-wasm
2. Compiled JS sent to Web Worker via `postMessage`
3. Worker executes code, creates hex-di container, obtains `InspectorAPI`
4. Worker sends snapshot/event data back to main thread via `postMessage`
5. `PlaygroundInspectorBridge` wraps messages into `InspectorDataSource`
6. Panels in `devtools-ui` consume the bridge identically to devtools
7. Latency: <1ms (structured clone)

### 4.3 Side-by-Side Comparison

| Aspect                   | DevTools                          | Playground                        |
| ------------------------ | --------------------------------- | --------------------------------- |
| Data origin              | Remote process (WebSocket)        | Local sandbox (Web Worker)        |
| InspectorDataSource impl | `RemoteInspectorAPI`              | `PlaygroundInspectorBridge`       |
| Latency                  | 2–50ms (network)                  | <1ms (postMessage)                |
| Multiple sources         | Yes (multi-app sidebar)           | No (single sandbox)               |
| Server required          | Yes (WebSocket server)            | No (static site)                  |
| Panel rendering          | Identical (`@hex-di/devtools-ui`) | Identical (`@hex-di/devtools-ui`) |
| Data freshness           | Continuous (live connection)      | On-demand (after each "Run")      |
| Reconnection logic       | Yes (auto-reconnect, buffering)   | No (worker is disposable)         |
