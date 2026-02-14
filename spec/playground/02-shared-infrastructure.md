# 02 — Shared Infrastructure

This document specifies `@hex-di/devtools-ui` — the shared package that both DevTools and Playground depend on. It defines the core abstraction (`InspectorDataSource`), the panel system, visualization components, theme system, and reactive hooks.

---

## 5. The `InspectorDataSource` Abstraction

### 5.1 Motivation

The devtools spec defines `RemoteInspectorAPI` — an interface that mirrors `InspectorAPI` but operates over WebSocket. The playground needs the same data shape but from a local Web Worker sandbox. Rather than having panels depend on `RemoteInspectorAPI` (which implies WebSocket transport), we extract the data-access surface into a transport-agnostic interface.

`InspectorDataSource` is the seam that makes panel reuse possible. It expresses "something that can provide container inspection data and notify me of changes" without prescribing _how_ the data arrives.

**Relationship to `InspectorAPI`**: `InspectorDataSource` is a **read-only subset** of `InspectorAPI`, not a 1:1 mapping. It includes only the methods that visualization panels need, excludes write operations (`registerLibrary()`, `emit()`), internal methods (`getContainer()`), and fine-grained query methods (`listPorts()`, `isResolved()`, `queryLibraries()`, etc.). All return types are `| undefined` to accommodate asynchronous transports where data may not have arrived yet — unlike `InspectorAPI` which returns data synchronously and never `undefined`.

### 5.2 Interface Definition

```typescript
/**
 * Transport-agnostic interface for accessing container inspection data.
 * Panels program against this interface and work identically in both
 * DevTools (WebSocket) and Playground (postMessage) contexts.
 */
interface InspectorDataSource {
  // Pull-based queries — return undefined when data is not yet available
  getSnapshot(): ContainerSnapshot | undefined;
  getScopeTree(): ScopeTree | undefined;
  getGraphData(): ContainerGraphData | undefined;
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;
  getAdapterInfo(): readonly AdapterInfo[] | undefined;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;

  // Push-based subscription — listener fires on any data change
  subscribe(listener: (event: InspectorEvent) => void): () => void;

  // Metadata
  readonly displayName: string;
  readonly sourceType: "remote" | "local";
}
```

### 5.3 Design Decisions

**Why `undefined` return types instead of throwing?**

Both WebSocket and postMessage transports have asynchronous data arrival. When a panel first mounts, data may not have arrived yet. Returning `undefined` lets panels render a loading state without try/catch. The local `InspectorAPI` always returns data synchronously, but the transport layer introduces latency.

**Why `sourceType` discriminant?**

Panels are transport-agnostic by default, but some UI elements may want to display "Connected to app-name" (devtools) vs "Sandbox" (playground). The `sourceType` discriminant enables this without importing transport-specific types.

**Why not extend `InspectorAPI` directly?**

`InspectorAPI` includes methods that are not relevant to visualization consumers:

- **Write operations**: `registerLibrary()`, `emit()`, `disposeLibraries()` — panels only read data
- **Internal methods**: `getContainer()` — exposes the underlying container, breaks abstraction
- **Fine-grained queries**: `listPorts()`, `isResolved()`, `getContainerKind()`, `getPhase()`, `getChildContainers()`, `getResultStatistics(portName)`, `getHighErrorRatePorts()`, `getLibraryInspector(name)`, `queryLibraries()`, `queryByLibrary()`, `queryByKey()` — panels access these through the composite snapshots (`getSnapshot()`, `getUnifiedSnapshot()`, `getGraphData()`) which contain the same data in aggregated form
- **Non-optional returns**: `InspectorAPI` returns data synchronously (the container is local), but transport-backed sources may not have data yet

`InspectorDataSource` is a purpose-built read surface: 7 data query methods + 1 subscription method + 2 metadata fields. This minimal surface is easier to implement correctly for new transports and easier to test.

### 5.4 Implementations

#### `RemoteInspectorAPI` (DevTools)

The existing devtools `RemoteInspectorAPI` is updated to implement `InspectorDataSource`. It already has the pull methods with optional returns and a `subscribe` method. The additions are:

```typescript
class RemoteInspectorAPI implements InspectorDataSource {
  // Existing fields
  readonly connectionId: string;
  readonly appName: string;
  // ...

  // New fields (InspectorDataSource)
  get displayName(): string {
    return this.appName;
  }

  get sourceType(): "remote" {
    return "remote";
  }

  // Existing methods already satisfy InspectorDataSource
  getSnapshot(): ContainerSnapshot | undefined {
    /* ... */
  }
  subscribe(listener: (event: InspectorEvent) => void): () => void {
    /* ... */
  }
  // ...
}
```

#### `PlaygroundInspectorBridge` (Playground)

The playground creates this adapter on the main thread. It maintains a local cache of the latest data received via `postMessage` from the Web Worker sandbox:

```typescript
class PlaygroundInspectorBridge implements InspectorDataSource {
  readonly displayName = "Playground Sandbox";
  readonly sourceType = "local";

  // Internal cache updated by postMessage handler
  private snapshot: ContainerSnapshot | undefined;
  private scopeTree: ScopeTree | undefined;
  private graphData: ContainerGraphData | undefined;
  // ...
  private listeners = new Set<(event: InspectorEvent) => void>();

  getSnapshot(): ContainerSnapshot | undefined {
    return this.snapshot;
  }

  subscribe(listener: (event: InspectorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Called by sandbox-manager when postMessage arrives
  handleWorkerMessage(message: WorkerMessage): void {
    // Update cache, notify listeners
  }
}
```

#### `LocalInspectorAdapter` (Direct wrapper)

For testing or embedding scenarios where a local `InspectorAPI` is available directly (no transport), `devtools-ui` provides a thin wrapper:

```typescript
class LocalInspectorAdapter implements InspectorDataSource {
  readonly sourceType = "local";

  constructor(
    private readonly inspector: InspectorAPI,
    readonly displayName: string
  ) {}

  getSnapshot(): ContainerSnapshot | undefined {
    return this.inspector.getSnapshot();
  }

  getScopeTree(): ScopeTree | undefined {
    return this.inspector.getScopeTree();
  }

  getGraphData(): ContainerGraphData | undefined {
    return this.inspector.getGraphData();
  }

  getUnifiedSnapshot(): UnifiedSnapshot | undefined {
    return this.inspector.getUnifiedSnapshot();
  }

  getAdapterInfo(): readonly AdapterInfo[] | undefined {
    return this.inspector.getAdapterInfo();
  }

  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined {
    return this.inspector.getLibraryInspectors();
  }

  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined {
    return this.inspector.getAllResultStatistics();
  }

  subscribe(listener: (event: InspectorEvent) => void): () => void {
    return this.inspector.subscribe(listener);
  }
}
```

---

## 6. `@hex-di/devtools-ui` Package

### 6.1 Package Identity

```json
{
  "name": "@hex-di/devtools-ui",
  "description": "Shared visualization panels, theme, and hooks for HexDi DevTools and Playground",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@hex-di/core": "workspace:*"
  }
}
```

### 6.2 Public Exports

```typescript
// Data source
export type { InspectorDataSource } from "./data/inspector-data-source";
export { LocalInspectorAdapter } from "./data/local-inspector-adapter";

// Panels
export type { DevToolsPanel, PanelProps } from "./panels/types";
export { PanelRegistry, getBuiltInPanels } from "./panels/registry";
export { OverviewPanel } from "./panels/overview-panel";
export { ContainerPanel } from "./panels/container-panel";
export { GraphPanel } from "./panels/graph-panel";
export { ScopeTreePanel } from "./panels/scope-tree-panel";
export { EventLogPanel } from "./panels/event-log-panel";
export { TracingPanel } from "./panels/tracing-panel";
export { HealthPanel } from "./panels/health-panel";

// Visualization
export { GraphRenderer } from "./visualization/graph/graph-renderer";
export { TreeRenderer } from "./visualization/tree/tree-renderer";
export { TimelineRenderer } from "./visualization/timeline/timeline-renderer";
export { JsonTree } from "./visualization/json-tree/json-tree";

// Theme
export { ThemeProvider } from "./theme/theme-provider";
export { useTheme } from "./theme/use-theme";
export { designTokens } from "./theme/tokens";

// Components
export { StatusBadge } from "./components/status-badge";
export { SearchInput } from "./components/search-input";
export { EmptyState } from "./components/empty-state";
export { ErrorBoundary } from "./components/error-boundary";
export { StatCard } from "./components/stat-card";
export { SortHeader } from "./components/sort-header";

// Hooks
export { useDataSourceSnapshot } from "./hooks/use-data-source-snapshot";
export { useDataSourceScopeTree } from "./hooks/use-data-source-scope-tree";
export { useDataSourceUnifiedSnapshot } from "./hooks/use-data-source-unified-snapshot";
export { useDataSourceTracingSummary } from "./hooks/use-data-source-tracing-summary";
export { useTableSort } from "./hooks/use-table-sort";
export { useTreeNavigation } from "./hooks/use-tree-navigation";
export { useAutoScroll } from "./hooks/use-auto-scroll";
export { usePersistedState } from "./hooks/use-persisted-state";
export { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
export { useResizeObserver } from "./hooks/use-resize-observer";

// Context
export { DataSourceProvider, useDataSource } from "./context/data-source-context";
export { PanelStateProvider, usePanelState } from "./context/panel-context";
```

### 6.3 What Moves Out of `@hex-di/devtools`

The following modules currently specified in the devtools spec (see [08 — DevTools Spec Changes](./08-devtools-changes.md)) move to `devtools-ui`:

| From (devtools)                             | To (devtools-ui)           |
| ------------------------------------------- | -------------------------- |
| All 7 built-in panel components             | `panels/`                  |
| `DevToolsPanel` and `PanelProps` types      | `panels/types.ts`          |
| Panel registry logic                        | `panels/registry.ts`       |
| Graph renderer (dagre layout, SVG)          | `visualization/graph/`     |
| Tree renderer                               | `visualization/tree/`      |
| Timeline renderer                           | `visualization/timeline/`  |
| JSON tree viewer                            | `visualization/json-tree/` |
| Design tokens and theme values              | `theme/tokens.ts`          |
| `ThemeProvider` component                   | `theme/theme-provider.tsx` |
| `useTheme()` hook                           | `theme/use-theme.ts`       |
| CSS custom property generation              | `theme/css-variables.ts`   |
| Shared UI components (badges, search, etc.) | `components/`              |
| `useRemoteSnapshot()` etc. (renamed)        | `hooks/`                   |

What **stays** in `@hex-di/devtools`:

- WebSocket server and connection management
- `RemoteInspectorAPI` class (now implements `InspectorDataSource`)
- Dashboard shell: `DashboardApp`, `Sidebar`, `ConnectionList`, `AppList`
- CLI entry point (`npx @hex-di/devtools`)
- `DevToolsServerConfig`
- Connection lifecycle (handshake, heartbeat, reconnection)

---

## 7. Shared Panels

### 7.1 PanelProps (Updated)

The central change from the devtools spec: `PanelProps.remoteInspector` becomes `PanelProps.dataSource`.

```typescript
/**
 * Props received by every panel component.
 * Panels MUST NOT import transport-specific types.
 */
interface PanelProps {
  readonly dataSource: InspectorDataSource;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}

type ResolvedTheme = "light" | "dark";
```

Compared to the devtools spec's original `PanelProps`:

- `remoteInspector: RemoteInspectorAPI` → `dataSource: InspectorDataSource`
- `connectionId: string` → removed (panels should use `dataSource.displayName` if they need to show identity)
- `theme`, `width`, `height` — unchanged

### 7.2 DevToolsPanel Interface

```typescript
interface DevToolsPanel {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly order: number;
  readonly component: React.ComponentType<PanelProps>;
}
```

Unchanged from the devtools spec. Panels register with an `order` for tab positioning and provide a component that receives `PanelProps`.

### 7.3 Built-in Panel Set

| Order | ID          | Label     | Description                                      |
| ----- | ----------- | --------- | ------------------------------------------------ |
| 0     | `overview`  | Overview  | Container stats + library metrics convergence    |
| 5     | `container` | Container | Phase, port counts, singletons, error rates      |
| 10    | `graph`     | Graph     | Dagre-layouted dependency graph with pan/zoom    |
| 20    | `scopes`    | Scopes    | Scope tree hierarchy with expansion state        |
| 30    | `events`    | Events    | Real-time event stream with filtering            |
| 40    | `tracing`   | Tracing   | Resolution timeline with span waterfall          |
| 50    | `health`    | Health    | Graph health, blast radius, scope leak detection |

All panel specifications from [devtools/04-panels.md](../devtools/04-panels.md) and [devtools/panels/](../devtools/panels/) apply unchanged. The only difference is that panels now receive `dataSource: InspectorDataSource` instead of `remoteInspector: RemoteInspectorAPI`.

### 7.4 Panel Registry

```typescript
class PanelRegistry {
  private readonly panels = new Map<string, DevToolsPanel>();

  register(panel: DevToolsPanel): void;
  unregister(panelId: string): void;
  getAll(): readonly DevToolsPanel[]; // Sorted by order
  getById(id: string): DevToolsPanel | undefined;

  // Auto-discovery: registers panels from library inspectors
  // when they provide a panelModule
  registerFromLibrary(name: string, panelModule: DevToolsPanel): void;
  unregisterLibrary(name: string): void;
}
```

The registry is populated with the 7 built-in panels at initialization. Library panels are added/removed dynamically when `library-registered`/`library-unregistered` events fire from the data source.

---

## 8. Shared Visualization Components

### 8.1 Graph Renderer

The graph renderer visualizes the container's dependency graph as an interactive SVG diagram.

**Input**: `ContainerGraphData` from `dataSource.getGraphData()`

**Layout**: [Dagre](https://github.com/dagrejs/dagre) for directed acyclic graph layout. Nodes represent ports/adapters, edges represent dependencies.

```typescript
interface GraphRendererProps {
  readonly graphData: ContainerGraphData | undefined;
  readonly selectedNode?: string;
  readonly onNodeSelect?: (portName: string) => void;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}
```

**Features**:

- SVG-based rendering with `<g>` transform for pan/zoom
- Node shapes: rounded rectangles colored by lifetime (singleton=indigo, scoped=green, transient=amber)
- Edge rendering: curved paths with directional arrows
- Interaction: click to select, drag to pan, scroll/pinch to zoom
- Controls: zoom in/out buttons, fit-to-view button, reset button
- Empty state when `graphData` is undefined

### 8.2 Tree Renderer

The tree renderer displays hierarchical data (scope trees, JSON structures) with expand/collapse and keyboard navigation.

```typescript
interface TreeRendererProps<T> {
  readonly root: T;
  readonly getChildren: (node: T) => readonly T[];
  readonly getKey: (node: T) => string;
  readonly renderNode: (node: T, depth: number) => React.ReactNode;
  readonly defaultExpanded?: ReadonlySet<string>;
  readonly onSelect?: (key: string) => void;
  readonly selectedKey?: string;
}
```

**Features**:

- Recursive rendering with indentation guides
- Expand/collapse per node with chevron indicators
- Keyboard navigation: arrow keys for traversal, Enter to toggle expand, Home/End for first/last
- Virtualization for large trees (only renders visible nodes)
- Expansion state preserved across re-renders

### 8.3 Timeline Renderer

The timeline renderer displays tracing spans as horizontal bars on a time axis.

```typescript
interface TimelineRendererProps {
  readonly spans: readonly TracingSpan[];
  readonly onSpanSelect?: (spanId: string) => void;
  readonly selectedSpanId?: string;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}

interface TracingSpan {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly parentId?: string;
  readonly status: "ok" | "error";
  readonly depth: number;
}
```

**Features**:

- Horizontal bar chart with time axis
- Nested spans indented by depth
- Color coding: ok=accent, error=error token
- Hover tooltip with span details (name, duration, status)
- Click to select span
- Auto-scale time axis to fit all spans

### 8.4 JSON Tree Viewer

The JSON tree viewer renders arbitrary JSON data with collapse/expand for objects and arrays.

```typescript
interface JsonTreeProps {
  readonly data: unknown;
  readonly defaultExpandDepth?: number; // Default: 2
  readonly rootLabel?: string;
}
```

**Features**:

- Syntax-colored values: strings (green), numbers (blue), booleans (purple), null (muted)
- Object/array collapse with item count badge
- Copy-to-clipboard on value click
- Recursive rendering with depth tracking

---

## 9. Shared Theme System

The theme system from [devtools/05-visual-design.md](../devtools/05-visual-design.md) moves entirely into `devtools-ui`.

### 9.1 Design Tokens

All design tokens defined in devtools spec Section 13.1 are preserved unchanged:

**Color tokens** (CSS custom properties scoped to `[data-hex-devtools]`):

- Background: `--hex-bg-primary`, `--hex-bg-secondary`, `--hex-bg-tertiary`
- Text: `--hex-text-primary`, `--hex-text-secondary`, `--hex-text-muted`
- Semantic: `--hex-success`, `--hex-warning`, `--hex-error`, `--hex-info`
- Accent: `--hex-accent`
- Lifetime: `--hex-lifetime-singleton`, `--hex-lifetime-scoped`, `--hex-lifetime-transient`
- Status: `--hex-status-resolved`, `--hex-status-unresolved`, `--hex-status-error`, `--hex-status-disposed`

**Typography tokens**:

- `--hex-font-mono`, `--hex-font-sans`
- `--hex-font-size-xs` (11px) through `--hex-font-size-xl` (16px)

**Spacing tokens**: 4px base unit, `--hex-space-xxs` (2px) through `--hex-space-xl` (24px)

**Radius tokens**: `--hex-radius-sm` (4px), `--hex-radius-md` (6px), `--hex-radius-lg` (8px), `--hex-radius-pill` (9999px)

**Shadow and transition tokens**: As specified in devtools spec.

### 9.2 ThemeProvider

```typescript
interface ThemeProviderProps {
  readonly theme?: "light" | "dark" | "system";
  readonly persist?: boolean; // Default: true, uses localStorage
  readonly storageKey?: string; // Default: "hex-devtools-theme"
  readonly children: React.ReactNode;
}

function ThemeProvider(props: ThemeProviderProps): React.ReactElement;
```

The `ThemeProvider`:

1. Resolves `"system"` to `"light"` or `"dark"` based on `prefers-color-scheme`
2. Sets `data-hex-devtools` and `data-hex-theme` attributes on a wrapper element
3. Injects CSS custom properties matching the resolved theme
4. Persists choice to `localStorage` when `persist` is true
5. Listens for system preference changes and updates when theme is `"system"`

### 9.3 useTheme Hook

```typescript
interface ThemeContext {
  readonly resolved: "light" | "dark";
  readonly preference: "light" | "dark" | "system";
  setTheme(theme: "light" | "dark" | "system"): void;
}

function useTheme(): ThemeContext;
```

---

## 10. Shared Hooks

### 10.1 Data Source Hooks

These hooks use `useSyncExternalStore` to provide reactive access to `InspectorDataSource` data. They follow the same pattern as the existing React integration hooks in `integrations/react/src/hooks/`.

```typescript
/**
 * Reactive container snapshot from the current data source.
 * Returns undefined when data hasn't arrived yet.
 */
function useDataSourceSnapshot(): ContainerSnapshot | undefined;

/**
 * Reactive scope tree from the current data source.
 */
function useDataSourceScopeTree(): ScopeTree | undefined;

/**
 * Reactive unified snapshot (container + all library snapshots).
 */
function useDataSourceUnifiedSnapshot(): UnifiedSnapshot | undefined;

/**
 * Reactive tracing summary computed from the data source.
 */
function useDataSourceTracingSummary(): TracingSummary | undefined;
```

All hooks read `InspectorDataSource` from `DataSourceContext`. They subscribe via `dataSource.subscribe()` and re-read data on each event, matching the `useSyncExternalStore` pattern from the React integration.

### 10.2 Utility Hooks

```typescript
/**
 * Column sort state for tables. Manages active column, direction, and comparator.
 */
function useTableSort<T>(
  defaultColumn: keyof T,
  defaultDirection?: "asc" | "desc"
): {
  sortColumn: keyof T;
  sortDirection: "asc" | "desc";
  setSortColumn: (column: keyof T) => void;
  toggleDirection: () => void;
  comparator: (a: T, b: T) => number;
};

/**
 * Keyboard-driven tree navigation. Tracks focused node and handles arrow keys.
 */
function useTreeNavigation(
  rootId: string,
  getChildren: (id: string) => readonly string[],
  getParent: (id: string) => string | undefined
): {
  focusedId: string;
  expandedIds: ReadonlySet<string>;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  setFocused: (id: string) => void;
  toggleExpanded: (id: string) => void;
};

/**
 * Auto-scrolls a container element to bottom when new content arrives.
 * Pauses auto-scroll when user scrolls up manually.
 */
function useAutoScroll(ref: React.RefObject<HTMLElement>): {
  isAutoScrolling: boolean;
  scrollToBottom: () => void;
};

/**
 * State backed by localStorage or sessionStorage.
 * Falls back to in-memory state if storage is unavailable.
 */
function usePersistedState<T>(
  key: string,
  defaultValue: T,
  storage?: "local" | "session"
): [T, (value: T | ((prev: T) => T)) => void];

/**
 * Global keyboard shortcut registration with conflict detection.
 */
function useKeyboardShortcuts(shortcuts: ReadonlyMap<string, () => void>, enabled?: boolean): void;

/**
 * Tracks element dimensions via ResizeObserver.
 */
function useResizeObserver(ref: React.RefObject<HTMLElement>): { width: number; height: number };
```

### 10.3 DataSourceProvider

```typescript
interface DataSourceProviderProps {
  readonly dataSource: InspectorDataSource;
  readonly children: React.ReactNode;
}

/**
 * Provides InspectorDataSource to all descendant panels and hooks.
 */
function DataSourceProvider(props: DataSourceProviderProps): React.ReactElement;

/**
 * Access the current InspectorDataSource from context.
 * Throws if used outside DataSourceProvider.
 */
function useDataSource(): InspectorDataSource;
```

The `DataSourceProvider` replaces the devtools' `ConnectionProvider` as the data context for panels. DevTools wraps its `RemoteInspectorAPI` in a `DataSourceProvider`; Playground wraps its `PlaygroundInspectorBridge` in the same provider. Panels beneath either provider work identically.
