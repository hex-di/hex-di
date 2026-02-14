_Previous: [13-filter-and-search.md](13-filter-and-search.md) | Next: [15-accessibility.md](15-accessibility.md)_

# 14. Integration

How the Result Panel registers with the DevTools infrastructure, connects to data sources, integrates with the Playground, and supports export.

## 14.1 Panel Registration

The Result Panel registers itself with the DevTools panel system:

```typescript
interface PanelRegistration {
  readonly id: "result";
  readonly label: "Result";
  readonly icon: ResultPanelIcon; // Two-track railway icon
  readonly order: 3; // After Container (1) and Graph (2)
  readonly component: typeof ResultPanel;
  readonly dataRequirements: readonly [
    "resultStatistics", // Level 0: per-port stats
    "resultChains", // Level 1: chain descriptors
    "resultExecutions", // Level 1: execution traces
  ];
}
```

### Panel Lifecycle

| Phase          | Behavior                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Mount          | Subscribe to data source, load localStorage preferences, render default view |
| Data available | Populate chain selector, render active view                                  |
| Data update    | Refresh affected views (debounced per Section 11.14)                         |
| Unmount        | Unsubscribe from data source, save preferences to localStorage               |

## 14.2 Data Source Interface

The Result Panel consumes data through a `ResultDataSource` interface, matching the existing DevTools data source pattern:

```typescript
interface ResultDataSource {
  /** Get all chain descriptors. */
  getChains(): ReadonlyMap<string, ResultChainDescriptor>;

  /** Get per-port statistics (Level 0 — always available). */
  getPortStatistics(): ReadonlyMap<string, ResultPortStatistics>;

  /** Get recent executions for a chain (Level 1 — requires tracing). */
  getExecutions(chainId: string): readonly ResultChainExecution[];

  /** Get computed paths for a chain. */
  getPaths(chainId: string): readonly ResultPathDescriptor[];

  /** Get the complete panel snapshot. */
  getSnapshot(): ResultPanelSnapshot;

  /** Subscribe to data changes. */
  subscribe(listener: (event: ResultDataEvent) => void): () => void;
}
```

### Data Events

```typescript
type ResultDataEvent =
  | { readonly type: "chain-registered"; readonly chainId: string }
  | { readonly type: "execution-added"; readonly chainId: string; readonly executionId: string }
  | { readonly type: "statistics-updated"; readonly portName: string }
  | { readonly type: "snapshot-changed" }
  | { readonly type: "connection-lost" }
  | { readonly type: "connection-restored" };
```

### Data Source Implementations

| Context            | Implementation           | Transport                        |
| ------------------ | ------------------------ | -------------------------------- |
| DevTools (remote)  | `RemoteResultDataSource` | WebSocket to container inspector |
| Playground (local) | `LocalResultDataSource`  | Direct in-memory access          |
| Tests              | `MockResultDataSource`   | Programmatic fixture data        |

## 14.3 Inspector Integration

The Result Panel data originates from the container inspector. The inspector is extended with Result-specific methods:

### Level 0 (No Code Changes Required)

The existing `ResultStatistics` from `@hex-di/core` already provides:

- `totalCalls`, `okCount`, `errCount` per port
- `errorsByCode` distribution
- `lastError` value

The Graph Panel already consumes this data for node badges. The Result Panel's Overview Dashboard and Sankey Statistics views use the same data.

### Level 1 (Opt-In Tracing)

New inspector methods for chain tracing:

```typescript
interface ResultInspectorExtension {
  /** Register a chain descriptor. */
  registerChain(descriptor: ResultChainDescriptor): void;

  /** Record a complete chain execution trace. */
  recordExecution(execution: ResultChainExecution): void;

  /** Get all registered chain descriptors. */
  getChains(): ReadonlyMap<string, ResultChainDescriptor>;

  /** Get recent executions (ring buffer, configurable size). */
  getRecentExecutions(chainId: string, limit?: number): readonly ResultChainExecution[];

  /** Compute all possible paths for a chain (static analysis). */
  computePaths(chainId: string): readonly ResultPathDescriptor[];
}
```

### Ring Buffer Configuration

| Setting                       | Default | Range            |
| ----------------------------- | ------- | ---------------- |
| Max executions per chain      | 100     | 10 - 1000        |
| Max value serialization depth | 3       | 1 - 10           |
| Max serialized value size     | 10KB    | 1KB - 100KB      |
| Execution retention time      | 1 hour  | 5 min - 24 hours |

## 14.4 Playground Integration

The Playground provides a rich local experience with automatic Result tracing.

### Auto-Tracing in Playground

When running in Playground mode:

1. The `ok()` and `err()` constructors are patched to return `TracedResult` wrappers
2. Every chain operation is automatically traced without explicit `traced()` calls
3. Values are captured at every step (Level 1 tracing enabled by default)
4. The Result Panel opens automatically when a chain is executed

### Playground-Specific Features

| Feature                | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| Live re-execution      | Edit code in Playground → Result Panel updates immediately                 |
| Value editing          | Click a value in the Operation Log → edit it → re-run chain with new value |
| Step-through debugging | Breakpoint-like experience using playback mode                             |
| Example library        | Pre-built examples linked from educational content                         |

### Playground Data Flow

```
User Code (Playground Editor)
  ↓ executes
TracedResult (auto-patched ok/err)
  ↓ records
LocalResultDataSource (in-memory)
  ↓ emits events
ResultPanel (renders immediately)
```

## 14.5 Export

### Chain Export

| Format  | Description                                              |
| ------- | -------------------------------------------------------- |
| JSON    | Full `ResultChainDescriptor` + recent executions as JSON |
| Mermaid | Chain as Mermaid flowchart with Ok/Err tracks            |
| DOT     | Chain as Graphviz DOT with track coloring                |
| SVG     | Railway Pipeline view exported as SVG                    |
| PNG     | Railway Pipeline view rendered to PNG                    |

### Execution Export

| Format | Description                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| JSON   | Full `ResultChainExecution` with all step traces                             |
| CSV    | One row per step: index, method, inputTrack, outputTrack, duration, switched |

### Statistics Export

| Format | Description                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| JSON   | Full `ResultPanelSnapshot`                                                   |
| CSV    | Per-port: portName, totalCalls, okCount, errCount, errorRate, stabilityScore |

### Export Triggers

| UI Element                       | Export                                      |
| -------------------------------- | ------------------------------------------- |
| Toolbar "Export" dropdown        | Chain export (JSON, Mermaid, DOT, SVG, PNG) |
| Operation Log header "Export"    | Execution export (JSON, CSV)                |
| Overview Dashboard "Export"      | Statistics export (JSON, CSV)               |
| Right-click on chain in selector | Chain export context menu                   |

### Export File Naming

| Export          | Filename Pattern                             |
| --------------- | -------------------------------------------- |
| Chain JSON      | `hex-result-chain-{label}-{timestamp}.json`  |
| Chain Mermaid   | `hex-result-chain-{label}-{timestamp}.mmd`   |
| Chain DOT       | `hex-result-chain-{label}-{timestamp}.dot`   |
| Chain SVG       | `hex-result-chain-{label}-{timestamp}.svg`   |
| Chain PNG       | `hex-result-chain-{label}-{timestamp}.png`   |
| Execution JSON  | `hex-result-exec-{label}-{executionId}.json` |
| Execution CSV   | `hex-result-exec-{label}-{executionId}.csv`  |
| Statistics JSON | `hex-result-stats-{timestamp}.json`          |
| Statistics CSV  | `hex-result-stats-{timestamp}.csv`           |

## 14.6 URL State

The Result Panel encodes its state in URL parameters for shareable deep links:

| Parameter       | Type   | Description           |
| --------------- | ------ | --------------------- |
| `result-chain`  | string | Selected chain ID     |
| `result-exec`   | string | Selected execution ID |
| `result-step`   | number | Selected step index   |
| `result-view`   | string | Active view name      |
| `result-filter` | JSON   | Encoded filter state  |

### URL Example

```
#result-chain=validateUser&result-view=log&result-exec=847&result-step=2
```

### URL State Encoding

- Chain and execution IDs are used directly (no encoding needed for alphanumeric IDs)
- Filter state is JSON-encoded and base64url-encoded
- URL state is read on panel mount and applied
- URL state is updated on navigation (pushState, no page reload)

## 14.7 Structured Logging Integration

The Result Panel can export structured log entries compatible with the existing logger infrastructure:

```typescript
interface ResultStructuredLogEntry {
  readonly severity: "info" | "warn" | "error";
  readonly message: string;
  readonly fields: {
    readonly chainId: string;
    readonly chainLabel: string;
    readonly executionId: string;
    readonly stepIndex: number;
    readonly method: string;
    readonly inputTrack: "ok" | "err";
    readonly outputTrack: "ok" | "err";
    readonly switched: boolean;
    readonly durationMicros: number;
    readonly errorType?: string;
  };
}
```

### Log Severity Rules

| Condition             | Severity |
| --------------------- | -------- |
| Ok → Ok step          | `info`   |
| Ok → Err switch       | `warn`   |
| Err → Err passthrough | `info`   |
| Err → Ok recovery     | `info`   |
| Terminal with Err     | `error`  |
| Duration > p90        | `warn`   |

## 14.8 Component Architecture

### React Component Hierarchy

```typescript
// Top-level panel component
function ResultPanel(props: {
  readonly dataSource: ResultDataSource;
  readonly theme: "light" | "dark";
  readonly navigateTo: (panel: string, context: Record<string, unknown>) => void;
  readonly initialState?: ResultPanelNavigation;
}): JSX.Element;
```

### Internal State Management

The Result Panel uses React context for shared state. Uses `ResultViewId` and `ResultFilterState` from [Section 1.4.11-1.4.12](01-overview.md):

```typescript
interface ResultPanelState {
  /** Currently selected chain. */
  readonly selectedChainId: string | undefined;

  /** Currently selected execution. */
  readonly selectedExecutionId: string | undefined;

  /** Currently selected step (for log and pipeline). */
  readonly selectedStepIndex: number | undefined;

  /** Currently active view. */
  readonly activeView: ResultViewId;

  /** Filter state (see Section 1.4.11). */
  readonly filter: ResultFilterState;

  /** Educational sidebar open/closed. */
  readonly educationalSidebarOpen: boolean;

  /** Live connection status. */
  readonly connectionStatus: "connected" | "disconnected";
}
```

### Data Hooks

Custom hooks for each data concern:

```typescript
function useResultChains(): ReadonlyMap<string, ResultChainDescriptor>;
function useResultExecutions(chainId: string): readonly ResultChainExecution[];
function useResultPaths(chainId: string): readonly ResultPathDescriptor[];
function useResultPortStats(): ReadonlyMap<string, ResultPortStatistics>;
function useResultSnapshot(): ResultPanelSnapshot;
function useResultConnection(): "connected" | "disconnected";
```

Each hook subscribes to the data source and re-renders on relevant events.

### Error Boundary Strategy

The Result Panel wraps each view in an independent `ErrorBoundary` so a crash in one view does not take down the entire panel.

#### Boundary Hierarchy

```
ResultPanel
  ErrorBoundary (panel-level — catches toolbar/status bar errors)
    ResultPanelToolbar
    ResultPanelStatusBar
    ErrorBoundary (view-level — catches view rendering errors)
      ActiveView (Railway, Log, Cases, etc.)
    ErrorBoundary (sidebar-level — catches educational sidebar errors)
      EducationalSidebar
```

#### State Preserved After Crash

| State                        | Preserved | Rationale                                                     |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| `selectedChainId`            | Yes       | User context should not be lost                               |
| `selectedExecutionId`        | Yes       | Same                                                          |
| `selectedStepIndex`          | Yes       | Same                                                          |
| `activeView`                 | Yes       | The crashed view is still the active view (shows fallback UI) |
| `filter`                     | Yes       | Filters are panel-level state, not view-local                 |
| `educationalSidebarOpen`     | Yes       | Sidebar state is independent                                  |
| `connectionStatus`           | Yes       | Data source subscription is panel-level                       |
| Data source subscriptions    | Yes       | Managed at panel level, not per-view                          |
| In-flight animations         | No        | Playback state resets on recovery                             |
| Scroll position / zoom level | No        | View-local state is lost                                      |

#### Fallback UI

When a view crashes:

```
+─── Something went wrong ─────────────────────────+
│                                                    │
│  The Railway Pipeline view encountered an error.   │
│                                                    │
│  Error: Cannot read properties of undefined        │
│         (reading 'operations')                     │
│                                                    │
│  What you can do:                                  │
│  [Retry This View]  [Switch to Overview]           │
│                                                    │
│  If this persists, try selecting a different chain. │
│                                                    │
│  [Copy Error Details]                              │
+────────────────────────────────────────────────────+
```

#### Recovery Behavior

| Action                    | Behavior                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Retry This View"         | Unmounts and remounts the crashed view component. Preserved state is re-applied.                                                                             |
| "Switch to Overview"      | Navigates to the Overview Dashboard (least likely to crash since it uses simple stat cards).                                                                 |
| "Copy Error Details"      | Copies error name, message, and component stack to clipboard.                                                                                                |
| Auto-retry on data update | When the data source emits a new event (e.g., new execution), the crashed view automatically attempts a re-render. If it succeeds, the fallback is replaced. |

#### Data Source Reconnection

When `connectionStatus` transitions to `"disconnected"`:

| Phase                | Behavior                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Immediate            | "Disconnected" banner shown. All views remain interactive with stale data.                                                                                   |
| Retry schedule       | Reconnection attempted at 1s, 2s, 4s, 8s, 16s, then every 30s (exponential backoff with cap).                                                                |
| On reconnect         | Full snapshot fetched via `getSnapshot()`. All views re-render with fresh data. Banner removed. Screen reader announces "Connection restored. Data updated." |
| On permanent failure | After 5 minutes of failed retries, the banner changes to "Connection lost. Showing stale data from {timestamp}." with a manual [Reconnect] button.           |

## 14.9 Performance and Scalability

### Rendering Budgets

All views must render within these frame budgets measured on a mid-range laptop (4-core, 8 GB RAM, Chrome DevTools open):

| View               | Initial Render         | Re-render (data update) | Interaction (hover/click) |
| ------------------ | ---------------------- | ----------------------- | ------------------------- |
| Railway Pipeline   | < 100ms for 50 nodes   | < 50ms                  | < 16ms (60fps)            |
| Operation Log      | < 50ms for 100 steps   | < 30ms                  | < 16ms                    |
| Case Explorer      | < 100ms for 32 paths   | < 50ms                  | < 16ms                    |
| Sankey Statistics  | < 150ms for 20 columns | < 80ms                  | < 16ms                    |
| Async Waterfall    | < 80ms for 50 rows     | < 40ms                  | < 16ms                    |
| Combinator Matrix  | < 50ms for 10 inputs   | < 30ms                  | < 16ms                    |
| Overview Dashboard | < 80ms                 | < 40ms                  | < 16ms                    |

### Virtualization Strategy

| View              | Trigger              | Strategy                                                                                                                                        |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway Pipeline  | > 50 operation nodes | Viewport culling: only render nodes within the visible SVG viewport plus a 200px buffer. Off-screen nodes replaced with placeholder rectangles. |
| Operation Log     | > 100 steps          | Virtual scrolling: render only the visible rows plus 10 overscan rows. Row height fixed at 36px for predictable scroll.                         |
| Case Explorer     | > 16 paths           | Pagination: show top-N paths by frequency. Remaining grouped under "N more paths..." expandable.                                                |
| Sankey Statistics | > 20 operations      | Column condensing: consecutive non-switch operations collapsed into a single aggregate column.                                                  |
| Async Waterfall   | > 50 rows            | Virtual scrolling: same strategy as Operation Log. Row height fixed at 32px.                                                                    |
| Combinator Matrix | > 20 inputs          | Scrollable input list with sticky combinator and output boxes.                                                                                  |

### DOM Node Limits

| Component   | Max DOM Nodes | Strategy                                                                 |
| ----------- | ------------- | ------------------------------------------------------------------------ |
| Railway SVG | 500           | Viewport culling + simplified node rendering (hide labels) at zoom < 0.5 |
| Sankey SVG  | 300           | Merge low-traffic links (< 0.5%) into "other" aggregate                  |
| Path tree   | 200           | Pagination + lazy expand                                                 |
| Log rows    | 50 visible    | Virtual scroll                                                           |

### Data Size Limits

| Concern                   | Limit             | Behavior When Exceeded                               |
| ------------------------- | ----------------- | ---------------------------------------------------- |
| Operations per chain      | 200               | Render first 200, show "N more operations truncated" |
| Executions in ring buffer | 1000              | Oldest evicted (FIFO)                                |
| Paths per chain           | 128               | Show top 128 by frequency, hide remainder            |
| Serialized value size     | 10 KB per value   | Truncated with `truncated: true` flag                |
| Chains per container      | 500               | Chain selector virtualizes the dropdown list         |
| Sankey history window     | 10,000 executions | Oldest evicted per time range window                 |

### Minimum Panel Dimensions

| Dimension | Minimum | Behavior Below Minimum                                         |
| --------- | ------- | -------------------------------------------------------------- |
| Width     | 480px   | Horizontal scroll on the active view. Toolbar wraps to 2 rows. |
| Height    | 320px   | Vertical scroll. Detail panels collapse to overlay mode.       |

### Responsive Layout Breakpoints

| Width Range | Layout Adaptation                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| >= 1200px   | Full layout: view area + detail panel side-by-side                                                                                                   |
| 800-1199px  | Detail panel overlays (slides over view, not beside it)                                                                                              |
| 480-799px   | Compact mode: toolbar icons only (no labels), educational sidebar becomes full-screen overlay, value inspector stacks below log instead of beside it |
| < 480px     | Not supported. "Expand panel" message shown.                                                                                                         |

_Previous: [13-filter-and-search.md](13-filter-and-search.md) | Next: [15-accessibility.md](15-accessibility.md)_
