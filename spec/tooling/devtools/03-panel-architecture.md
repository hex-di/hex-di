# 6. Panel Architecture

This section specifies the internal architecture of the `@hex-di/devtools` panel system: how panels are structured, how they plug into the shell, how state is managed, and how the component tree is organized. The devtools is a standalone web dashboard application that connects to one or more target applications over WebSocket, consuming a `RemoteInspectorAPI` that mirrors the `InspectorAPI` from `@hex-di/core`.

> **Previous**: [Section 5 -- Visual Design & Wireframes](./02-visual-design.md)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)

---

## 6.1 Architectural Overview

The dashboard is structured as four nested layers, each with a single responsibility:

```
+-----------------------------------------------------------------------+
|  <DashboardApp>                                                       |
|  Root entry point. Bootstraps the standalone application.             |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  |  <ConnectionProvider>                                              ||
|  |  Manages WebSocket connections to target applications.            ||
|  |  Maintains a registry of connected apps, handles reconnection,   ||
|  |  and exposes RemoteInspectorAPI instances per connection.         ||
|  |                                                                    ||
|  |  +---------------------------------------------------------------+||
|  |  |  <ThemeProvider>                                               |||
|  |  |  Resolves "system" theme to "light" or "dark" via             |||
|  |  |  matchMedia. Provides CSS custom properties.                  |||
|  |  |                                                                |||
|  |  |  +-----------------------------------------------------------+|||
|  |  |  |  <DashboardLayout>                                        ||||
|  |  |  |    <Sidebar>                                              ||||
|  |  |  |      <AppList />       (connected applications)           ||||
|  |  |  |      <PanelNav />      (panel navigation)                 ||||
|  |  |  |    </Sidebar>                                             ||||
|  |  |  |    <Main>                                                 ||||
|  |  |  |      <ConnectionHeader />  (active app name, status,     ||||
|  |  |  |                             latency)                      ||||
|  |  |  |      <PanelContent />      (active panel)                 ||||
|  |  |  |    </Main>                                                ||||
|  |  |  |  </DashboardLayout>                                       ||||
|  |  |  +-----------------------------------------------------------+|||
|  |  +---------------------------------------------------------------+||
|  +-------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

The key design decisions:

1. **Standalone application** -- The dashboard runs as its own web application, served by a lightweight local server. It connects to target applications over WebSocket, meaning the devtools never exist inside the target application's React tree, DOM, or JavaScript bundle.

2. **Multi-application support** -- The dashboard can connect to multiple running applications simultaneously. Each connection appears in the sidebar's AppList, and the user switches between them. Only one connection is active at a time; the active connection's `RemoteInspectorAPI` is passed to panels.

3. **Plugin panels** -- Each panel (Container, Graph, Scopes, Events, Tracing, and library-specific panels) implements a uniform `DevToolsPanel` interface. The shell does not know what panels exist at compile time; it discovers them at runtime.

4. **Lazy activation** -- Only the active panel is mounted. Inactive panels are fully unmounted, releasing their subscriptions and DOM nodes. The event log is the sole exception: it maintains a background ring buffer regardless of active tab.

---

## 6.2 Panel Plugin System

### 6.2.1 DevToolsPanel Interface

Every panel -- built-in or custom -- implements this interface:

```typescript
interface DevToolsPanel {
  /** Unique panel identifier. Used as the nav key and localStorage persistence key. */
  readonly id: string;

  /** Human-readable label displayed in the panel navigation. */
  readonly label: string;

  /**
   * Navigation icon. A single Unicode character, emoji, or a React component
   * that renders an inline SVG icon.
   */
  readonly icon: string | React.ComponentType<{ readonly size: number }>;

  /**
   * Navigation ordering. Lower numbers appear higher in the sidebar.
   * Built-in panels use multiples of 10 (0, 10, 20, 30, 40).
   * Custom panels should use values >= 100 to appear after built-ins.
   * Library panels are auto-assigned starting at 200.
   */
  readonly order: number;

  /** The React component that renders the panel content. */
  readonly component: React.ComponentType<PanelProps>;
}
```

### 6.2.2 PanelProps Interface

Every panel component receives these props from the shell:

```typescript
interface PanelProps {
  /** The remote inspector API for querying container state over WebSocket. */
  readonly remoteInspector: RemoteInspectorAPI;

  /** The active connection identifier. */
  readonly connectionId: string;

  /** The resolved theme (always "light" or "dark", never "system"). */
  readonly theme: ResolvedTheme;

  /** Current panel content width in pixels (updates on resize). */
  readonly width: number;

  /** Current panel content height in pixels (updates on resize). */
  readonly height: number;
}

type ResolvedTheme = "light" | "dark";
```

The `width` and `height` values represent the usable content area inside the main panel region (excluding the sidebar and connection header). Panels use these to make layout decisions -- for example, the Graph panel uses `width` and `height` to size its SVG viewport, and the Events panel uses `height` to calculate how many log entries to virtualize.

### 6.2.3 Panel Registration

Panels are registered through three channels, merged in this priority order:

1. **Built-in panels** -- Always present. Defined internally by the devtools package.
2. **Library panels** -- Auto-discovered from `remoteInspector.getLibraryInspectors()`. A new panel is created whenever a `library-registered` event fires, and removed on `library-unregistered`.
3. **Custom panels** -- Registered via the dashboard configuration. These are user-defined panels for application-specific debugging views.

The final navigation order is determined by sorting all registered panels by their `order` field. Ties are broken alphabetically by `id`.

### 6.2.4 Panel Deduplication

If a custom panel shares the same `id` as a built-in or library panel, the custom panel takes precedence. This allows users to override any built-in panel with a custom implementation. A console warning is emitted when this occurs (development mode only).

---

## 6.3 Built-in Panels

The devtools ships with seven built-in panels. Each panel is a self-contained React component that consumes `PanelProps` and internally uses the appropriate remote inspector hooks.

### 6.3.1 Panel Registry

| Order | ID          | Label     | Icon | Description                                                          |
| ----- | ----------- | --------- | ---- | -------------------------------------------------------------------- |
| 0     | `overview`  | Overview  | `O`  | Unified overview: container stats + library headline metrics         |
| 5     | `container` | Container | `C`  | Container overview: kind, phase, port count, singletons, error rates |
| 10    | `graph`     | Graph     | `G`  | Dependency graph visualization with force-directed layout            |
| 20    | `scopes`    | Scopes    | `S`  | Scope tree hierarchy with expand/collapse                            |
| 30    | `events`    | Events    | `E`  | Real-time event stream with filtering and search                     |
| 40    | `tracing`   | Tracing   | `T`  | Resolution tracing timeline with span waterfall                      |
| 50    | `health`    | Health    | `H`  | Synthesized diagnostics: graph health, blast radius, scope leaks     |

### 6.3.2 Container Panel (order: 5)

Data source: `remoteInspector.getSnapshot()` via `useRemoteSnapshot()` hook and `remoteInspector.getAllResultStatistics()`.

Displays:

- Container kind badge (`root` / `child` / `lazy`)
- Current phase indicator (`idle` / `initializing` / `ready` / `disposed`)
- Port count (total, resolved, unresolved)
- Singleton cache utilization
- Top error-rate ports (threshold > 0.1, sorted by error rate descending)
- Registered library badges
- Child container count with drill-down

### 6.3.3 Graph Panel (order: 10)

Data source: `remoteInspector.getGraphData()` -- called once on mount and refreshed on `snapshot-changed` events only when the adapter count changes.

Displays:

- Force-directed dependency graph using SVG
- Nodes colored by lifetime (`singleton` = blue, `scoped` = green, `transient` = gray)
- Edges colored by origin (`own` = solid, `inherited` = dashed, `overridden` = red)
- Hover tooltip showing port name, lifetime, factory kind, dependency list
- Click-to-select with detail sidebar
- Zoom and pan controls

### 6.3.4 Scopes Panel (order: 20)

Data source: `remoteInspector.getScopeTree()` via `useRemoteScopeTree()` hook.

Displays:

- Hierarchical tree view of scope nodes
- Each node shows: scope ID, scope name (if named), status (`active` / `disposed`), child count
- Expand/collapse controls per node
- Color coding: active scopes in green, disposed scopes in gray

### 6.3.5 Events Panel (order: 30)

Data source: `remoteInspector.subscribe()` -- events are buffered in a ring buffer that persists across panel switches.

Displays:

- Reverse-chronological event list (newest at top)
- Event type badge with color coding per event type
- Timestamp column
- Event detail expansion on click
- Filter bar: type checkboxes, text search across event properties
- Clear and pause/resume controls

The event ring buffer is the one piece of state that survives panel unmounting. It is owned by the `ConnectionProvider` context (per connection), not by the Events panel component. This ensures events are captured even while viewing other panels.

### 6.3.6 Tracing Panel (order: 40)

Data source: `remoteInspector.getLibraryInspector("tracing")` via `useRemoteTracingSummary()` hook.

**Conditional rendering**: This panel is only included in the navigation when a tracing library inspector is registered. The devtools listens for `library-registered` and `library-unregistered` events with `name === "tracing"` to toggle the panel's visibility.

Displays:

- Summary cards: total spans, error count, average duration, cache hit rate
- Span waterfall timeline (most recent resolutions)
- Error span highlighting

---

## 6.4 Library Panels (Auto-Discovered)

### 6.4.1 Discovery Mechanism

When the dashboard activates a connection, it reads `remoteInspector.getLibraryInspectors()` to get the initial set of registered libraries. It then subscribes to remote inspector events and watches for:

- `{ type: "library-registered", name }` -- Creates a new panel for the library
- `{ type: "library-unregistered", name }` -- Removes the library's panel

Each discovered library gets a panel with:

```typescript
{
  id: `library:${inspector.name}`,
  label: inspector.name,          // Capitalized in the navigation
  icon: inspector.name[0].toUpperCase(),
  order: 200 + alphabeticalIndex, // Sorted alphabetically, starting at 200
  component: LibraryPanel,        // Generic tree-view component
}
```

### 6.4.2 Generic LibraryPanel Component

The default `LibraryPanel` renders the library's snapshot as an interactive tree view:

```
+---------------------------------------------------------+
|  Library: flow                                          |
|  Last updated: 12:34:56.789                             |
+---------------------------------------------------------+
|  > machineCount: 3                                      |
|  v machines: Array(3)                                   |
|    v [0]:                                               |
|      portName: "OrderMachine"                           |
|      instanceId: "abc-123"                              |
|      machineId: "order"                                 |
|      state: "processing"                                |
|      scopeId: "root"                                    |
|    > [1]: {...}                                         |
|    > [2]: {...}                                         |
|  > healthEvents: Array(10)                              |
|  > effectStatistics: {...}                              |
+---------------------------------------------------------+
```

The tree view is a recursive component that handles:

- Primitive values: rendered inline with type-appropriate formatting
- Arrays: collapsible with item count badge
- Objects: collapsible with key count badge
- `null` and `undefined`: rendered as grayed-out keywords
- Large arrays (>100 items): virtualized to render only visible items

### 6.4.3 Custom Library Panel Components

Libraries can provide a dedicated panel component instead of the generic tree view. The mechanism is the `panelModule` field on the `LibraryInspector` interface:

```typescript
// In the library's inspector implementation:
const flowInspector: LibraryInspector = {
  name: "flow",
  getSnapshot() {
    /* ... */
  },
  panelModule: "@hex-di/flow/devtools",
};
```

When the devtools discovers a library inspector with a `panelModule` string, it dynamically imports the module:

```typescript
const mod = await import(inspector.panelModule);
const PanelComponent = mod.default; // React component conforming to LibraryPanelProps
```

If the import succeeds, the resolved component is used instead of the generic `LibraryPanel`. If the import fails (module not installed, invalid export), the dashboard falls back to the generic JSON tree viewer with a console warning. The import is attempted once per library per connection; the resolved component is cached.

This approach means:

- Library packages ship their panel components at a `/devtools` entry point (e.g., `@hex-di/flow/devtools`)
- The dashboard has no build-time dependency on any library package
- The panel module is resolved at runtime by the dashboard's bundler
- New libraries can ship custom panels without modifying `@hex-di/devtools`

---

## 6.5 Panel State Management

### 6.5.1 State Shape

The dashboard maintains internal state in a dedicated React context, completely isolated from any target application:

```typescript
interface DevToolsState {
  /** The id of the currently active panel. */
  readonly activePanel: string;

  /** The connection id of the currently active target application. */
  readonly activeConnectionId: string | undefined;

  /** Free-text filter applied to the connection list in the sidebar. */
  readonly connectionFilter: string;

  /** Theme preference. "system" resolves to light/dark via matchMedia. */
  readonly theme: "light" | "dark" | "system";

  /** Event log filter state. */
  readonly eventLogFilter: EventLogFilter;

  /** Whether event logging is paused. */
  readonly eventLogPaused: boolean;
}

interface EventLogFilter {
  /** Event types to include. Empty set means "show all". */
  readonly enabledTypes: ReadonlySet<string>;

  /** Free-text search query applied across all event properties. */
  readonly searchQuery: string;
}
```

### 6.5.2 Default State

```typescript
const DEFAULT_STATE: DevToolsState = {
  activePanel: "container",
  activeConnectionId: undefined,
  connectionFilter: "",
  theme: "system",
  eventLogFilter: {
    enabledTypes: new Set(),
    searchQuery: "",
  },
  eventLogPaused: false,
};
```

Defaults can be overridden by persisted localStorage state. localStorage overrides defaults for fields that are persisted.

### 6.5.3 Persistence Strategy

State is persisted across two storage mechanisms -- `localStorage` for global preferences shared across all dashboard tabs, and `sessionStorage` for per-tab state that should remain independent per dashboard instance:

| Field                | Storage        | Reason                                                 |
| -------------------- | -------------- | ------------------------------------------------------ |
| `activePanel`        | sessionStorage | Per-tab: each dashboard tab can view a different panel |
| `activeConnectionId` | sessionStorage | Per-tab: each tab can inspect a different app          |
| `connectionFilter`   | Not persisted  | Ephemeral per session                                  |
| `theme`              | localStorage   | Global: theme change propagates to all tabs            |
| `eventLogFilter`     | Not persisted  | Ephemeral per session                                  |
| `eventLogPaused`     | Not persisted  | Ephemeral per session                                  |

The persistence format is JSON. On read, the deserializer validates the shape and discards any corrupted or incompatible data, falling back to defaults. The serializer writes on every state change, debounced by 500ms to avoid excessive writes.

```typescript
// Global preferences (localStorage, shared across tabs)
const GLOBAL_STORAGE_KEYS = {
  sidebarWidth: "hex-devtools:sidebar-width",
  theme: "hex-devtools:theme",
};

// Per-tab state (sessionStorage, independent per dashboard instance)
const TAB_STORAGE_KEYS = {
  activePanel: "hex-devtools:tab",
  activeConnection: "hex-devtools:active-connection",
};
```

### 6.5.4 State Context

The state is managed via `useReducer` inside `DevToolsProvider` and exposed through a context:

```typescript
interface DevToolsContextValue {
  readonly state: DevToolsState;
  readonly dispatch: React.Dispatch<DevToolsAction>;
  readonly eventLog: EventLogBuffer;
  readonly registeredPanels: readonly DevToolsPanel[];
}
```

Actions follow a discriminated union pattern:

```typescript
type DevToolsAction =
  | { readonly type: "set-active-panel"; readonly panelId: string }
  | { readonly type: "set-active-connection"; readonly connectionId: string }
  | { readonly type: "set-connection-filter"; readonly filter: string }
  | { readonly type: "add-connection"; readonly connectionId: string; readonly appName: string }
  | { readonly type: "remove-connection"; readonly connectionId: string }
  | { readonly type: "set-theme"; readonly theme: "light" | "dark" | "system" }
  | { readonly type: "set-event-filter"; readonly filter: EventLogFilter }
  | { readonly type: "toggle-event-pause" }
  | { readonly type: "clear-event-log" };
```

When `add-connection` fires and there is no `activeConnectionId`, the newly added connection is automatically selected as active. When `remove-connection` fires for the active connection, the active connection is set to the next available connection, or `undefined` if none remain.

### 6.5.5 Event Log Buffer

The event log buffer is a fixed-size ring buffer maintained by the `ConnectionProvider` on a per-connection basis. Each connection subscribes to `remoteInspector.subscribe()` on establishment and captures all events regardless of which panel is active.

```typescript
interface EventLogBuffer {
  /** All events in the buffer, newest first. */
  readonly events: readonly TimestampedEvent[];

  /** Total number of events received (including dropped ones). */
  readonly totalReceived: number;

  /** Number of events dropped due to buffer overflow. */
  readonly totalDropped: number;
}

interface TimestampedEvent {
  /** Monotonically increasing sequence number. */
  readonly seq: number;

  /** Event timestamp (Date.now() at capture time). */
  readonly timestamp: number;

  /** The raw inspector event. */
  readonly event: InspectorEvent;
}
```

The buffer capacity is configurable via `DevToolsClientConfig`:

```typescript
interface DevToolsClientConfig {
  // ... other fields
  readonly bufferSize?: number; // Default: 1000
}
```

When the buffer is full, the oldest event is discarded (FIFO). The `totalDropped` counter increments to indicate data loss.

---

## 6.6 Configuration API

### 6.6.1 DevToolsServerConfig

The dashboard server is started with the following configuration:

```typescript
interface DevToolsServerConfig {
  /** Port to serve the dashboard UI and WebSocket endpoint on. Default: 4200 */
  readonly port?: number;

  /** Host to bind to. Default: "localhost" */
  readonly host?: string;

  /** Whether to automatically open the dashboard in the default browser on start. Default: true */
  readonly openBrowser?: boolean;
}
```

### 6.6.2 DevToolsClientConfig

Each target application configures its devtools client with the following:

```typescript
interface DevToolsClientConfig {
  /** WebSocket URL of the dashboard server. Default: "ws://localhost:4200" */
  readonly serverUrl?: string;

  /** Human-readable application name displayed in the dashboard sidebar. */
  readonly appName: string;

  /** Application type, used for icon and grouping in the sidebar. */
  readonly appType: "react" | "node" | "unknown";

  /**
   * Unique instance identifier for this app instance. Distinguishes
   * multiple browser tabs or Node.js processes running the same app.
   * Auto-generated if omitted (sessionStorage UUID for browser, process UUID for Node.js).
   */
  readonly instanceId?: string;

  /**
   * Environment metadata sent during handshake. Auto-populated if omitted:
   * - Browser: url from location.href, title from document.title
   * - Node.js: pid from process.pid, argv from process.argv.slice(0, 2)
   */
  readonly metadata?: ConnectionMetadata;

  /** Whether to automatically reconnect on disconnection. Default: true */
  readonly reconnect?: boolean;

  /** Interval between reconnection attempts in milliseconds. Default: 3000 */
  readonly reconnectInterval?: number;

  /** Maximum number of events retained in the client-side event buffer. Default: 1000 */
  readonly bufferSize?: number;
}
```

### 6.6.3 MCP Server Integration

The DevTools server can optionally expose its inspection data through MCP in addition to the WebSocket dashboard. This uses the `@hex-di/mcp` framework (see [`spec/libs/mcp/`](../mcp/README.md)) to compose the inspection MCP adapters into a server.

When `enableMcp` is true in the server config, the DevTools server:

1. Builds an MCP adapter graph from the inspection adapters (34 resources, 18 tools, 5 prompts).
2. Calls `createMcpServer(graph, options)` from `@hex-di/mcp` with the configured transport.
3. Starts the MCP server alongside the WebSocket dashboard server.

The MCP transport is configurable:

- **stdio** (default for CLI usage) -- `npx @hex-di/devtools --mcp` starts an MCP server on stdio for Claude Code integration.
- **SSE** -- `npx @hex-di/devtools --mcp --mcp-transport sse --mcp-port 3001` starts an SSE-based MCP server for web tools.

The MCP server and the WebSocket dashboard share the same `InspectorAPI` data. They are parallel consumers of the container's self-knowledge, running in the same process.

```typescript
interface DevToolsServerConfig {
  // ... existing fields (port, host, openBrowser)

  /** Whether to start an MCP server alongside the dashboard. Default: false */
  readonly enableMcp?: boolean;

  /** MCP transport type. Default: "stdio" */
  readonly mcpTransport?: "stdio" | "sse";

  /** Port for SSE MCP transport. Only used when mcpTransport is "sse". Default: 3001 */
  readonly mcpPort?: number;
}
```

### 6.6.4 Server Usage Example

```typescript
import { startDevToolsServer } from "@hex-di/devtools/server";

await startDevToolsServer({
  port: 4200,
  host: "localhost",
  openBrowser: true,
});
```

### 6.6.5 Client Usage Example

```typescript
import { connectDevTools } from "@hex-di/devtools/client";

const disconnect = connectDevTools(container.inspector, {
  appName: "Order Service",
  appType: "node",
  serverUrl: "ws://localhost:4200",
  reconnect: true,
  bufferSize: 1000,
});

// Later, to disconnect:
disconnect();
```

### 6.6.6 React Client Usage Example

```typescript
import { DevToolsClientProvider } from "@hex-di/devtools/react";

function App() {
  return (
    <InspectorProvider inspector={container.inspector}>
      <DevToolsClientProvider
        appName="Shopping App"
        appType="react"
        serverUrl="ws://localhost:4200"
      />
      <MainApplication />
    </InspectorProvider>
  );
}
```

The `<DevToolsClientProvider>` component reads the inspector from the nearest `InspectorProvider` context and establishes the WebSocket connection on mount. It renders no visible DOM elements.

### 6.6.7 Production Gating

The client-side `connectDevTools` function and `<DevToolsClientProvider>` component both accept an optional `enabled` parameter (defaults to `process.env.NODE_ENV !== "production"`). When `enabled` is `false`:

- No WebSocket connection is established
- No event subscriptions are created
- No data is transmitted
- The function/component tree-shakes cleanly if the bundler eliminates dead code

---

## 6.7 Theme System

### 6.7.1 Theme Resolution

The `ThemeProvider` resolves the `"system"` theme to either `"light"` or `"dark"` using `window.matchMedia("(prefers-color-scheme: dark)")`. It subscribes to the media query's `change` event to react to OS-level theme switches in real time.

```typescript
type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  readonly preference: ThemePreference; // What the user chose
  readonly resolved: ResolvedTheme; // What is actually applied
}
```

### 6.7.2 CSS Strategy

The dashboard uses CSS custom properties scoped to a root wrapper element. The wrapper has a unique `data-hex-devtools` attribute that all internal selectors scope to.

```
[data-hex-devtools] {
  --hdt-bg-primary: ...;
  --hdt-bg-secondary: ...;
  --hdt-text-primary: ...;
  --hdt-text-secondary: ...;
  --hdt-border: ...;
  --hdt-accent: ...;
  --hdt-error: ...;
  --hdt-warning: ...;
  --hdt-success: ...;
  --hdt-font-mono: ui-monospace, "Cascadia Code", "Fira Code", monospace;
  --hdt-font-sans: system-ui, -apple-system, sans-serif;
  --hdt-radius: 6px;
  --hdt-shadow: ...;
}
```

Two sets of values are defined -- one for `[data-hex-devtools="light"]` and one for `[data-hex-devtools="dark"]`. The `ThemeProvider` sets the attribute value on the wrapper element.

### 6.7.3 Style Isolation

Since the dashboard is a standalone application, style isolation from a host application is not a concern. However, the `[data-hex-devtools]` scoping is still used to maintain a clean CSS architecture and to allow the same component library to be reused if embedded tooling is ever needed. Styles are delivered as a standard CSS file loaded by the dashboard application.

---

# 7. Component Tree

This section details the full component hierarchy, data flow, lifecycle, and performance characteristics of the dashboard component tree.

> **Previous**: [Section 6 -- Panel Architecture](#6-panel-architecture)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)

---

## 7.1 Full Component Tree

```
<DashboardApp>
  |
  <ConnectionProvider>                       [1] WebSocket connection manager
    |
    <DevToolsProvider>                       [2] Internal state context + event buffers
      |
      <PanelRegistry>                        [3] Merges built-in + library + custom panels
        |
        <ThemeProvider>                       [4] Resolves system theme, provides CSS vars
          |
          <DashboardWrapper                  [5] Root DOM node with data-hex-devtools attr
            data-hex-devtools={resolvedTheme}>
            |
            +-- <KeyboardHandler />          [6] Global keyboard shortcut listener
            |
            <DashboardLayout>                [7] CSS grid: sidebar + main
              |
              +-- <Sidebar>                  [8] Left sidebar panel
              |     |
              |     +-- <ConnectionFilter    [9] Text input for filtering connections
              |     |     value={connectionFilter}
              |     |     onChange={setConnectionFilter}
              |     |   />
              |     |
              |     +-- <AppList>            [10] Connected application list
              |     |     |
              |     |     +-- {connections.map(conn =>
              |     |           <AppListItem
              |     |             key={conn.connectionId}
              |     |             displayLabel={conn.displayLabel}
              |     |             appType={conn.appType}
              |     |             status={conn.status}       ("connected" | "stale" | "disconnected")
              |     |             latency={conn.latencyMs}
              |     |             metadata={conn.metadata}   (url, title, pid, argv)
              |     |             active={conn.connectionId === activeConnectionId}
              |     |             onClick={() => setActiveConnection(conn.connectionId)}
              |     |           />
              |     |         )}
              |     |
              |     +-- <PanelNav>           [11] Vertical panel navigation
              |           |
              |           +-- <NavItem id="overview"   order={0}   active={...} />
              |           +-- <NavItem id="container"  order={5}   active={...} />
              |           +-- <NavItem id="graph"      order={10}  active={...} />
              |           +-- <NavItem id="scopes"     order={20}  active={...} />
              |           +-- <NavItem id="events"     order={30}  active={...} />
              |           +-- <NavItem id="tracing"    order={40}  active={...} />
              |           |     [conditional: only if tracing inspector registered]
              |           +-- <NavItem id="health"     order={50}  active={...} />
              |           |
              |           +-- {libraryPanels.map(panel =>
              |           |     <NavItem id={panel.id} order={panel.order} active={...} />
              |           |   )}
              |           |
              |           +-- {customPanels.map(panel =>
              |                 <NavItem id={panel.id} order={panel.order} active={...} />
              |               )}
              |
              +-- <Main>                     [12] Main content area
                    |
                    +-- <ConnectionHeader>   [13] Active connection info bar
                    |     |
                    |     +-- <AppNameBadge   [14] App name + type icon
                    |     |     name={activeConnection.appName}
                    |     |     type={activeConnection.appType}
                    |     |   />
                    |     +-- <ConnectionStatus  [15] Live status indicator
                    |     |     status={activeConnection.status}
                    |     |     latency={activeConnection.latency}
                    |     |   />
                    |     +-- <HeaderActions>  [16] Right-aligned action buttons
                    |           |
                    |           +-- <ThemeToggle />    [17] Light/dark toggle icon
                    |
                    +-- [if !activeConnectionId]:
                    |   <EmptyState            [18] No connection placeholder
                    |     message="No application connected."
                    |     instructions="Start a target app with devtools client enabled."
                    |   />
                    |
                    +-- [if activeConnectionId]:
                        <PanelContent>         [19] Active panel renderer
                          |
                          +-- {React.createElement(
                                activePanel.component,
                                { remoteInspector, connectionId, theme, width, height }
                              )}
                          |
                          |  One of:
                          |  +-- <OverviewPanel />       (id: "overview")
                          |  +-- <ContainerPanel />      (id: "container")
                          |  +-- <GraphPanel />          (id: "graph")
                          |  +-- <ScopesPanel />         (id: "scopes")
                          |  +-- <EventsPanel />         (id: "events")
                          |  +-- <TracingPanel />        (id: "tracing")
                          |  +-- <HealthPanel />         (id: "health")
                          |  +-- <LibraryPanel />        (id: "library:*")
                          |  +-- <CustomPanel />         (user-provided)
```

### Component Numbering Key

| #   | Component          | Responsibility                                                   |
| --- | ------------------ | ---------------------------------------------------------------- |
| 1   | ConnectionProvider | WebSocket connection lifecycle, reconnection, RemoteInspectorAPI |
| 2   | DevToolsProvider   | useReducer for state, event ring buffers, localStorage sync      |
| 3   | PanelRegistry      | Merges panel sources, handles library panel auto-discovery       |
| 4   | ThemeProvider      | matchMedia subscription, system theme resolution                 |
| 5   | DashboardWrapper   | Root DOM element, style scope                                    |
| 6   | KeyboardHandler    | useEffect with global keydown listener                           |
| 7   | DashboardLayout    | CSS grid defining sidebar + main areas                           |
| 8   | Sidebar            | Left sidebar containing app list and panel navigation            |
| 9   | ConnectionFilter   | Text input for filtering the connection list                     |
| 10  | AppList            | List of connected target applications with status indicators     |
| 11  | PanelNav           | Vertical navigation listing all available panels                 |
| 12  | Main               | Main content area to the right of the sidebar                    |
| 13  | ConnectionHeader   | Top bar showing active connection name, status, and latency      |
| 14  | AppNameBadge       | App name with type icon (React, Node, etc.)                      |
| 15  | ConnectionStatus   | Live connection status dot + latency display                     |
| 16  | HeaderActions      | Grouped action buttons (theme toggle, etc.)                      |
| 17  | ThemeToggle        | Dispatches set-theme action, cycles light/dark/system            |
| 18  | EmptyState         | Placeholder shown when no connection is active                   |
| 19  | PanelContent       | Measures dimensions, renders active panel component              |

---

## 7.2 Data Flow

### 7.2.1 Remote Inspector Data Flow

Data flows from target applications through WebSocket into the dashboard. The full path is:

```
Target Application
    |
    +-- InspectorAPI (local, in target app process)
    |
    v
devtools-client (in target app)
    |
    +-- Serializes inspector events and query responses
    +-- Sends over WebSocket connection
    |
    v
WebSocket Transport
    |
    v
Dashboard WebSocket Server
    |
    +-- Receives messages, routes to correct connection
    |
    v
RemoteInspectorAPI (in dashboard, per connection)
    |
    +-- Mirrors the InspectorAPI interface
    +-- Methods return Promises (async over WebSocket)
    +-- Event subscription delivers events as they arrive
    |
    v
Dashboard React hooks
    |
    |  Pull-based (via hooks wrapping RemoteInspectorAPI)
    |  +=======================================================+
    |  |                                                       |
    |  +-- useRemoteSnapshot()                                       |
    |  |     Returns: ContainerSnapshot                        |
    |  |     Consumers: ContainerPanel                         |
    |  |     Re-renders: on any snapshot-changed event         |
    |  |                                                       |
    |  +-- useRemoteScopeTree()                                      |
    |  |     Returns: ScopeTree                                |
    |  |     Consumers: ScopesPanel                            |
    |  |     Re-renders: on scope-created, scope-disposed      |
    |  |                                                       |
    |  +-- useRemoteUnifiedSnapshot()                                |
    |  |     Returns: UnifiedSnapshot                          |
    |  |     Consumers: LibraryPanel (generic tree view)       |
    |  |     Re-renders: on any snapshot-changed event         |
    |  |                                                       |
    |  +-- useRemoteTracingSummary()                                 |
    |  |     Returns: TracingSummary | undefined                |
    |  |     Consumers: TracingPanel                           |
    |  |     Re-renders: on tracing snapshot change            |
    |  |     Note: Returns undefined when no tracing inspector |
    |  |                                                       |
    |  +=======================================================+
    |
    |  One-time queries (async, called imperatively)
    |  +=======================================================+
    |  |                                                       |
    |  +-- remoteInspector.getGraphData()                      |
    |  |     Returns: Promise<ContainerGraphData>              |
    |  |     Consumers: GraphPanel                             |
    |  |     Called: on mount + when adapter count changes      |
    |  |                                                       |
    |  +-- remoteInspector.getAllResultStatistics()             |
    |  |     Returns: Promise<ReadonlyMap<string, ResultStats>>|
    |  |     Consumers: ContainerPanel                         |
    |  |     Called: on mount + on result:ok/result:err events  |
    |  |                                                       |
    |  +-- remoteInspector.getLibraryInspectors()              |
    |  |     Returns: Promise<ReadonlyMap<string, LibInspector>|
    |  |     Consumers: PanelRegistry                          |
    |  |     Called: on mount + on library-registered events    |
    |  |                                                       |
    |  +=======================================================+
    |
    |  Push-based (subscription via WebSocket)
    |  +=======================================================+
    |  |                                                       |
    |  +-- remoteInspector.subscribe(listener)                 |
    |        Returns: () => void (unsubscribe)                 |
    |        Consumers: ConnectionProvider (event ring buffer)  |
    |        Lifetime: connection open to connection close      |
    |        Note: Single subscription per connection           |
    |                                                          |
    |  +=======================================================+
    |
    v
Panels (ContainerPanel, GraphPanel, EventsPanel, etc.)
```

### 7.2.2 State Data Flow

Internal state flows from the `DevToolsProvider` through context to all child components:

```
DevToolsProvider (useReducer)
    |
    +-- state.activeConnectionId -> AppList (active highlight)
    |                         +--> ConnectionHeader (which connection to display)
    |                         +--> PanelContent (which RemoteInspectorAPI to pass)
    |
    +-- state.connectionFilter --> AppList (filtered connection list)
    |
    +-- state.activePanel -------> PanelNav (active nav highlight)
    |                        +---> PanelContent (which component to render)
    |
    +-- state.theme -------------> ThemeProvider (resolved theme)
    |                        +---> PanelContent (theme prop to active panel)
    |
    +-- state.eventLogFilter ----> EventsPanel (filter state)
    |
    +-- state.eventLogPaused ----> EventsPanel (pause indicator)
    |
    +-- eventLog.events ---------> EventsPanel (rendered event list)
```

### 7.2.3 User Interaction Flow

```
User clicks an application in the AppList
    |
    v
AppListItem.onClick
    |
    v
dispatch({ type: "set-active-connection", connectionId })
    |
    v
Reducer: activeConnectionId = connectionId
    |
    v
DevToolsProvider re-renders
    |
    +-- AppList highlights the selected connection
    +-- ConnectionHeader updates with new app name and status
    +-- PanelContent remounts active panel with new RemoteInspectorAPI
         |
         +-- Active panel component re-subscribes to the new connection's data
```

```
User clicks a panel in the PanelNav
    |
    v
NavItem.onClick
    |
    v
dispatch({ type: "set-active-panel", panelId })
    |
    v
Reducer: activePanel = panelId
    |
    v
DevToolsProvider re-renders
    |
    +-- PanelNav highlights the selected panel
    +-- PanelContent unmounts previous panel, mounts new panel
         |
         +-- New panel component mounts and subscribes to data via hooks
```

---

## 7.3 Lifecycle

### 7.3.1 Mount Phase

```
1. <DashboardApp> renders
   |
2. <ConnectionProvider> mounts
   |
   +-- Opens WebSocket server listener (if running in Electron or server mode)
   |   OR connects to existing server (if running as web client)
   |
   +-- Initializes empty connection registry
   |
3. <DevToolsProvider> mounts
   |
   +-- Read localStorage("hex-di:devtools")
   |   Parse JSON, validate shape, merge with defaults
   |
   +-- Initialize useReducer with merged initial state
   |
4. <PanelRegistry> mounts
   |
   +-- Build initial sorted panel list from built-in panels
   |   (Library panels are discovered per-connection when one becomes active)
   |
5. <ThemeProvider> mounts
   |
   +-- If theme === "system": subscribe to matchMedia change event
   +-- Resolve initial theme
   |
6. <KeyboardHandler> mounts
   |
   +-- Attach global keydown listener for shortcuts
   |
7. <DashboardLayout> mounts
   |
   +-- <Sidebar> renders with empty AppList (no connections yet)
   +-- <Main> renders with EmptyState placeholder
```

### 7.3.2 Connection Established Phase

```
1. Target application calls connectDevTools(inspector, config)
   |
2. Client establishes WebSocket connection to dashboard server
   |
3. Handshake: client sends { appName, appType, instanceId, metadata } identification
   |
4. ConnectionProvider receives new connection
   |
   +-- Creates RemoteInspectorAPI instance for the connection
   +-- Creates event ring buffer for the connection
   +-- Subscribes to remoteInspector.subscribe() for event capture
   |
5. dispatch({ type: "add-connection", connectionId, appName })
   |
6. If no activeConnectionId exists:
   |
   +-- Auto-select this connection as active
   +-- Read remoteInspector.getLibraryInspectors() for library panels
   +-- PanelRegistry updates with library panels for this connection
   +-- ConnectionHeader displays app name and status
   +-- Active panel component mounts with the new RemoteInspectorAPI
```

### 7.3.3 Tab Switch Phase

```
1. User clicks a different panel in PanelNav
   |
2. dispatch({ type: "set-active-panel", panelId: newId })
   |
3. state.activePanel changes
   |
4. <PanelContent> re-renders
   |
   +-- Previous panel component UNMOUNTS
   |   All hooks unsubscribe, DOM cleaned up
   |
   +-- New panel component MOUNTS
   |   Fresh hook subscriptions established
   |
5. localStorage write (debounced)
```

Panels are not cached or kept alive. Each mount is a fresh render. This trades a small mount cost for significant memory savings -- inactive panels hold no DOM nodes, no subscriptions, and no stale data.

### 7.3.4 Connection Switch Phase

```
1. User clicks a different application in AppList
   |
2. dispatch({ type: "set-active-connection", connectionId: newId })
   |
3. state.activeConnectionId changes
   |
4. PanelRegistry re-reads library inspectors for the new connection
   |
5. ConnectionHeader updates with new app name, status, latency
   |
6. <PanelContent> re-renders with the new connection's RemoteInspectorAPI
   |
   +-- Active panel component unmounts (old connection hooks unsubscribe)
   +-- Active panel component mounts (new connection hooks subscribe)
   |
7. Event log switches to the new connection's ring buffer
```

### 7.3.5 Connection Lost Phase

```
1. WebSocket connection drops (network error, target app exits)
   |
2. ConnectionProvider updates connection status to "reconnecting"
   |
3. AppList shows reconnecting indicator for the affected connection
   |
4. If reconnect is enabled (default: true):
   |
   +-- Retry connection at reconnectInterval (default: 3000ms)
   +-- On success: status returns to "connected", data streams resume
   +-- On failure: continue retrying
   |
5. If target app is gone permanently:
   |
   +-- After sustained failure, status remains "reconnecting"
   +-- User can manually remove the connection
   +-- OR: connection is removed automatically when the target app sends a clean disconnect
   |
6. dispatch({ type: "remove-connection", connectionId })
   |
   +-- If this was the active connection:
       +-- Auto-select next available connection, or undefined
       +-- Panel content updates accordingly
```

### 7.3.6 Unmount Phase

```
1. Dashboard window/tab closes
   |
2. <DevToolsProvider> unmounts
   |
   +-- Save state to localStorage (immediate, not debounced)
   |
3. <ConnectionProvider> unmounts
   |
   +-- All WebSocket connections are closed cleanly
   +-- All event ring buffer subscriptions unsubscribe
   |
4. <ThemeProvider> unmounts
   |
   +-- matchMedia change listener removed
   |
5. <KeyboardHandler> unmounts
   |
   +-- Global keydown listener removed
```

---

## 7.4 Performance Considerations

### 7.4.1 Lazy Panel Rendering

Only the active panel's component is mounted. All other panels have zero runtime cost. When switching panels, the previous panel fully unmounts and the new panel mounts fresh. This means:

- **Memory**: Only one panel's DOM tree and hook subscriptions exist at any time
- **CPU**: Only one panel processes remote inspector events
- **Trade-off**: Panel switches incur a small mount cost (~1-5ms for built-in panels)

### 7.4.2 Event Log Ring Buffer

The event log uses a fixed-capacity ring buffer implemented as a pre-allocated array with head/tail pointers:

- **Insertion**: O(1) -- write at tail, increment tail mod capacity
- **Iteration**: O(n) -- read from head to tail
- **Memory**: Fixed at `capacity * sizeof(TimestampedEvent)`, never grows
- **Default capacity**: 1000 events per connection
- **Overflow**: Oldest events silently discarded, `totalDropped` counter incremented

The buffer is a plain object (not React state) to avoid re-rendering the ConnectionProvider on every event. The EventsPanel reads from the buffer in its render cycle via a ref.

### 7.4.3 Graph Layout

The Graph panel computes a force-directed layout using `requestAnimationFrame`:

- **Initial layout**: Computed on mount, takes ~50-200ms for typical graphs (10-100 nodes)
- **Incremental updates**: Only triggered when the adapter count changes (detected by comparing `getGraphData().adapters.length`). Position changes (zoom, pan) do not re-run layout.
- **Layout stabilization**: The force simulation runs until energy drops below a threshold, then stops. Typical stabilization: 50-100 frames.
- **Large graphs**: For graphs with >200 nodes, the panel displays a warning and offers a "simplified view" that groups nodes by lifetime.

### 7.4.4 Subscription Management

Each connection creates exactly one `remoteInspector.subscribe()` subscription, managed by the `ConnectionProvider`. Individual panels do not subscribe directly to the remote inspector's event stream. Instead:

- **Event buffering**: All events flow into the per-connection ring buffer via the single subscription
- **Hook-based data**: Panels use hooks (useSnapshot, useScopeTree, etc.) which internally manage subscriptions to the `RemoteInspectorAPI`. These subscriptions are created/destroyed with panel mount/unmount.
- **Connection switching**: When the active connection changes, the active panel unmounts and remounts, causing hook subscriptions to cleanly transfer to the new connection's `RemoteInspectorAPI`.

### 7.4.5 WebSocket Message Batching

The devtools client in the target application batches inspector events before sending them over the WebSocket to reduce message overhead:

- **Batch window**: 16ms (one frame at 60fps). Events are collected during the window and sent as a single WebSocket message.
- **Batch size limit**: 50 events. If 50 events accumulate before the window closes, the batch is sent immediately.
- **Flush on disconnect**: Any pending events are flushed when the WebSocket connection is closing.
- **Binary encoding**: Event batches are serialized as JSON arrays. Individual events are not compressed, but batching reduces per-message overhead (WebSocket framing, TCP headers).

### 7.4.6 Connection Multiplexing

The dashboard server handles multiple simultaneous connections efficiently:

- **Per-connection isolation**: Each connection has its own WebSocket, RemoteInspectorAPI, and event buffer. A slow or misbehaving connection does not affect others.
- **Inactive connection throttling**: Connections that are not currently active (not selected in the sidebar) still receive and buffer events, but their data is not processed by React hooks. This means inactive connections consume only buffer memory, not CPU.
- **Connection limit**: The server accepts up to 20 simultaneous connections. Additional connection attempts are rejected with a descriptive error message.

### 7.4.7 Stale Connection Detection

The dashboard detects and handles stale connections:

- **Heartbeat**: The WebSocket connection sends a ping every 5 seconds. If no pong is received within 10 seconds, the connection is marked as stale.
- **Latency tracking**: Round-trip time is measured on each heartbeat and displayed in the ConnectionHeader and AppList. Latency above 500ms triggers a warning indicator.
- **Auto-cleanup**: Connections that have been in "reconnecting" state for more than 60 seconds without successful reconnection are automatically removed from the sidebar (with a notification).

### 7.4.8 Tree View Virtualization

The generic `LibraryPanel` tree view and the `ScopesPanel` tree view both use windowed rendering for large data sets:

- Arrays with more than 100 items render only the visible window (computed from scroll position and item height)
- Objects with more than 50 keys render only the visible window
- Expansion state is tracked per-path (e.g., `machines[0].state`) in a Set

---

## 7.5 Keyboard Shortcuts

### 7.5.1 Global Shortcuts

These shortcuts work regardless of focus state, captured via a `keydown` listener on `document`:

| Shortcut                  | Action                             | Condition               |
| ------------------------- | ---------------------------------- | ----------------------- |
| `Ctrl+1` through `Ctrl+9` | Switch to connection N (1-indexed) | At least one connection |

Connection numbering follows the visual order in the AppList (top to bottom). If connection N does not exist (e.g., `Ctrl+5` when there are only 3 connections), the shortcut is ignored.

### 7.5.2 Panel Navigation Shortcuts

These shortcuts are always active since the dashboard is a standalone application:

| Shortcut                        | Action                        | Condition                 |
| ------------------------------- | ----------------------------- | ------------------------- |
| `Alt+1` through `Alt+9`         | Switch to panel N (1-indexed) | At least one panel exists |
| `Alt+ArrowUp` / `Alt+ArrowDown` | Move to previous/next panel   | Always                    |
| `/`                             | Focus event log search input  | Events panel is active    |
| `Ctrl+K`                        | Focus event log search input  | Events panel is active    |

Panel numbering follows the visual navigation order (top to bottom in the sidebar). If panel N does not exist, the shortcut is ignored.

### 7.5.3 Implementation

The `KeyboardHandler` component attaches a single `keydown` listener to `document` in a `useEffect`. The handler:

1. Checks if the event matches `Ctrl+1..9` -- if so, switch to connection N and `preventDefault()`
2. Checks if the event matches `Alt+1..9` -- if so, switch to panel N and `preventDefault()`
3. Checks if the event matches `Alt+ArrowUp/Down` -- if so, move to previous/next panel
4. Checks for `/` or `Ctrl+K` shortcuts for event log search

The handler does not call `preventDefault()` for panel-scoped shortcuts if the event target is an `<input>` or `<textarea>` (to avoid interfering with text input). The `/` shortcut is only intercepted when the active element is not an input field.

---

## 7.6 Responsive Behavior

### 7.6.1 Breakpoints

The dashboard adapts to viewport width using two responsive breakpoints. These are checked via `ResizeObserver` on the dashboard wrapper element.

| Viewport Width | Behavior                                                      |
| -------------- | ------------------------------------------------------------- |
| >= 800px       | **Full layout** -- Sidebar visible + main content area.       |
| < 800px        | **Collapsed layout** -- Sidebar collapses to icons-only rail. |

### 7.6.2 Full Layout (>= 800px)

Standard layout as described in the component tree. The sidebar displays the full AppList with connection names, status indicators, and latency values. The PanelNav shows icon + label for each panel. The main content area takes the remaining width.

The sidebar width is fixed at 260px. The main content area fills the remaining space.

### 7.6.3 Collapsed Layout (< 800px)

The sidebar collapses to a narrow rail (48px wide):

- AppList shows only the app type icon (React, Node, unknown) with a colored status dot
- PanelNav shows only icons, no labels
- Hovering over a sidebar item shows a tooltip with the full name/label
- Clicking a connection or panel item works identically to the full layout
- A toggle button at the top of the sidebar allows temporarily expanding it as a floating overlay (not an app-wide overlay, just the sidebar expanding over the main content). Clicking outside or selecting an item collapses it again.

### 7.6.4 Panel Content Responsive Behavior

Individual panels receive `width` and `height` props and are responsible for their own internal responsive behavior. The Graph panel, for example, adjusts its SVG viewport, and the Events panel adjusts its column layout. Panel-specific responsive breakpoints are defined in each panel's specification (Section 8).

---

> **Previous**: [Section 5 -- Visual Design & Wireframes](./02-visual-design.md)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)
