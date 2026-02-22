# Query Panel -- Cache Table & Inspector

**Module**: `@hex-di/query/devtools`
**Entry point**: Shipped by `@hex-di/query` at `@hex-di/query/devtools`, discovered via `panelModule` field on `LibraryInspector`.
**Inspiration**: TanStack Query DevTools
**Parent spec**: [04-panels.md, Section 15.3](../04-panels.md#153-query-panel-cache-table)

---

## 1. Purpose and Motivation

The Query Panel provides a dedicated, purpose-built view into the `@hex-di/query` cache -- replacing the generic JSON tree fallback with a structured, interactive table that developers can sort, filter, and act upon. The generic tree viewer renders the `QueryLibrarySnapshot` as a collapsed JSON tree, which is adequate for quick glances but fails for real debugging work. The Query Panel solves four concrete problems:

**Debugging stale data.** When a component renders outdated information, the developer needs to see at a glance which queries are stale, when they were last updated, and what their configured stale time is. The staleness column and relative timestamp display ("2s ago", "5m ago") make this immediately visible without mental timestamp arithmetic.

**Understanding cache behavior.** Summary cards showing total queries, cache hit rate, average fetch duration, and in-flight count give an instant health check of the query layer. Developers can spot pathological patterns (0% hit rate, 50+ in-flight queries, runaway error counts) without digging into individual entries.

**Triggering manual refetches.** When a query is stuck in an error state or serving stale data, the developer needs to force a refetch without reloading the entire application. Per-row action buttons send commands to the target app over WebSocket, triggering refetch, invalidation, cancellation, or removal directly from the dashboard.

**Identifying slow or failing queries.** Error-state queries are color-coded red and sorted to prominence. Fetch history with duration data and error tags helps correlate failures with specific query ports and parameter combinations. The diagnostics and suggestions engine surfaces actionable warnings like "Query X has a 67% error rate" or "Invalidation storm detected on Y."

---

## 2. Data Model

### 2.1 QueryLibrarySnapshot

The lightweight snapshot surfaced through the `LibraryInspector` protocol. This is the top-level data structure the panel receives via `LibraryPanelProps.snapshot`.

```typescript
interface QueryLibrarySnapshot {
  readonly queryCount: number;
  readonly queries: readonly {
    readonly key: string;
    readonly status: "idle" | "loading" | "success" | "error";
    readonly lastUpdated: number | undefined;
    readonly isCached: boolean;
  }[];
  readonly cacheSize: number;
  readonly cacheHitRate: number;
}
```

### 2.2 QuerySnapshot (Full Inspector Snapshot)

The panel fetches richer data from the `QueryInspectorAPI` (resolved from the library inspector) for the detail pane, fetch history, and diagnostics. The full inspector snapshot is obtained via the `query:request-full-snapshot` WebSocket command.

```typescript
interface QuerySnapshot {
  readonly timestamp: number;
  readonly entries: ReadonlyArray<QueryEntrySnapshot>;
  readonly inFlight: ReadonlyArray<InFlightSnapshot>;
  readonly stats: CacheStats;
}
```

### 2.3 QueryEntrySnapshot

The complete state of a single cache entry, used in the detail pane when a row is selected.

```typescript
interface QueryEntrySnapshot {
  readonly kind: "query-entry";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: CacheKey;
  readonly status: string;
  readonly fetchStatus: "fetching" | "idle";
  readonly dataUpdatedAt: number | undefined;
  readonly errorUpdatedAt: number | undefined;
  readonly fetchCount: number;
  readonly hasSubscribers: boolean;
  readonly isInvalidated: boolean;
  readonly isStale: boolean;
  readonly data: unknown | "[truncated]";
  readonly error: unknown | null;
  readonly staleTime: number;
  readonly cacheTime: number;
}
```

### 2.4 InFlightSnapshot

Represents a currently executing fetch operation. Displayed with a loading indicator in the table and as a separate "In-Flight" section in the detail pane.

```typescript
interface InFlightSnapshot {
  readonly kind: "in-flight";
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: string;
  readonly startedAt: number;
  readonly elapsedMs: number;
  readonly retryAttempt: number;
}
```

### 2.5 CacheStats

Aggregate cache metrics displayed in the summary cards row.

```typescript
interface CacheStats {
  readonly totalEntries: number;
  readonly activeEntries: number;
  readonly staleEntries: number;
  readonly errorEntries: number;
  readonly inFlightCount: number;
  readonly cacheHitRate: number;
  readonly avgFetchDurationMs: number;
  readonly gcEligibleCount: number;
}
```

### 2.6 QueryDiagnosticSummary

Extended diagnostic data used by the summary cards and the diagnostics section of the detail pane.

```typescript
interface QueryDiagnosticSummary {
  readonly totalQueries: number;
  readonly activeQueries: number;
  readonly staleQueries: number;
  readonly errorQueries: number;
  readonly inFlightCount: number;
  readonly cacheHitRate: number;
  readonly avgFetchDurationMs: number;
  readonly gcEligibleCount: number;
  readonly totalFetches: number;
  readonly errorRate: number;
  readonly dedupSavings: number;
  readonly errorsByTag: ReadonlyMap<string, number>;
}
```

### 2.7 FetchHistoryEntry

Individual fetch history record, displayed in the fetch history tab of the detail pane.

```typescript
interface FetchHistoryEntry {
  readonly portName: string;
  readonly params: unknown;
  readonly cacheKey: string;
  readonly timestamp: number;
  readonly durationMs: number;
  readonly result: "ok" | "error";
  readonly errorTag?: string;
  readonly cacheHit: boolean;
  readonly deduplicated: boolean;
  readonly retryAttempt: number;
  readonly trigger: FetchTrigger;
}

type FetchTrigger =
  | "mount"
  | "refetch-manual"
  | "refetch-focus"
  | "refetch-interval"
  | "refetch-reconnect"
  | "invalidation"
  | "mutation-effect"
  | "prefetch"
  | "ensure";
```

### 2.8 QueryRowData (View Model)

Derived from `QueryEntrySnapshot` for table rendering. Computed client-side in the dashboard.

```typescript
interface QueryRowData {
  readonly key: string;
  readonly portName: string;
  readonly params: unknown;
  readonly status: "pending" | "success" | "error";
  readonly fetchStatus: "fetching" | "idle";
  readonly lastUpdated: number | undefined;
  readonly staleness: "fresh" | "stale" | "unknown";
  readonly isCached: boolean;
  readonly hasSubscribers: boolean;
  readonly fetchCount: number;
  readonly isInvalidated: boolean;
  readonly dataSize: number | undefined;
  readonly errorTag: string | undefined;
}
```

### 2.9 QueryFilterState

Local UI state for filtering and sorting the query table. Not persisted across panel switches.

```typescript
interface QueryFilterState {
  readonly statusFilter: ReadonlySet<"pending" | "success" | "error">;
  readonly fetchStatusFilter: ReadonlySet<"fetching" | "idle">;
  readonly stalenessFilter: ReadonlySet<"fresh" | "stale">;
  readonly keyFilter: string;
  readonly sortColumn: "key" | "status" | "updated" | "staleness" | "fetchCount" | "subscribers";
  readonly sortDirection: "asc" | "desc";
  readonly showOnlyWithSubscribers: boolean;
}
```

### 2.10 QueryAction

Commands sent from the dashboard to the connected application via WebSocket. Each action targets a specific query by port name and optional params.

```typescript
type QueryAction =
  | {
      readonly type: "query:refetch";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "query:invalidate";
      readonly portName: string;
      readonly params?: unknown;
    }
  | {
      readonly type: "query:remove";
      readonly portName: string;
      readonly params?: unknown;
    }
  | {
      readonly type: "query:cancel";
      readonly portName: string;
      readonly params?: unknown;
    };
```

### 2.11 QuerySuggestion

Diagnostic suggestions surfaced by the inspector, displayed in the detail pane's diagnostics tab.

```typescript
interface QuerySuggestion {
  readonly type:
    | "stale_query"
    | "invalidation_storm"
    | "high_error_rate"
    | "large_cache_entry"
    | "unused_subscriber"
    | "missing_adapter";
  readonly portName: string;
  readonly message: string;
  readonly action: string;
}
```

---

## 3. Layout and Wireframes

### 3.1 Full Panel Layout

```
+---------------------------------------------------------------------+
| QUERY CACHE                                          [Refresh] [?]   |
+---------------------------------------------------------------------+
|                                                                      |
| +-----------+ +-----------+ +-----------+ +-----------+ +---------+ |
| | Queries   | | Hit Rate  | | In-Flight | | Stale     | | Errors  | |
| |   24      | |   87.3%   | |   3       | |   5       | |   2     | |
| |           | | avg 42ms  | |           | |           | |  8.3%   | |
| +-----------+ +-----------+ +-----------+ +-----------+ +---------+ |
|                                                                      |
| [Status: all v] [Staleness: all v] [Search: ________________] [Sub] |
+---------------------------------------------------------------------+
| Port Name     | Params | Status  | Fetch   | Updated | Stale  | Act |
+---------------+--------+---------+---------+---------+--------+-----+
| /api/users    | --     | success | idle    | 2s ago  | fresh  | [R] |
| /api/orders   | {id:5} | success | fetchng | 45s ago | stale  | [C] |
| /api/auth     | --     | error   | idle    | 5m ago  | stale  | [R] |
| /api/cart     | --     | pending | fetchng | --      | --     | [C] |
| /api/products | {q:"a"}| success | idle    | 12s ago | fresh  | [R] |
| /api/settings | --     | success | idle    | 1h ago  | stale  | [R] |
+---------------+--------+---------+---------+---------+--------+-----+
|                                                                      |
| SELECTED: /api/users                           [Data] [History] [Dx] |
+---------------------------------+------------------------------------+
| Query Detail                    | Data Inspector                     |
|                                 |                                    |
| Port: /api/users                | {                                  |
| Status: success                 |   "users": [                       |
| Fetch Status: idle              |     { "id": 1, "name": "Alice" }, |
| Last Updated: 14:32:00          |     { "id": 2, "name": "Bob" },   |
| Stale Time: 30s                 |     ...                            |
| Cache Time: 5m                  |   ],                               |
| Fetch Count: 7                  |   "total": 42,                     |
| Subscribers: 3                  |   "page": 1                        |
| Invalidated: no                 | }                                  |
+---------------------------------+------------------------------------+
```

### 3.2 Summary Cards Row

Five metric cards displayed in a horizontal row below the panel header. Each card shows a primary value and an optional secondary value.

```
+-----------+ +-----------+ +-----------+ +-----------+ +---------+
| Queries   | | Hit Rate  | | In-Flight | | Stale     | | Errors  |
|   24      | |   87.3%   | |   3       | |   5       | |   2     |
| 18 active | | avg 42ms  | |           | | 3 GC-elig | |  8.3%   |
+-----------+ +-----------+ +-----------+ +-----------+ +---------+
```

- **Queries**: `stats.totalEntries` (primary), `stats.activeEntries` active (secondary)
- **Hit Rate**: `stats.cacheHitRate` as percentage (primary), `stats.avgFetchDurationMs` as "avg Xms" (secondary)
- **In-Flight**: `stats.inFlightCount` (primary), no secondary
- **Stale**: `stats.staleEntries` (primary), `stats.gcEligibleCount` GC-eligible (secondary)
- **Errors**: `stats.errorEntries` (primary), `diagnostics.errorRate` as percentage (secondary)

### 3.3 Filter/Search Toolbar

```
[Status: all v] [Staleness: all v] [Search: ________________] [Subscribers only]
```

- **Status dropdown**: Multi-select with options: pending, success, error. "All" when empty set.
- **Staleness dropdown**: Multi-select with options: fresh, stale. "All" when empty set.
- **Search input**: Free-text substring match against port name and serialized params. Debounced by 150ms.
- **Subscribers only toggle**: When active, filters to only entries with `hasSubscribers === true`.

### 3.4 Empty State

```
+---------------------------------------------------------------------+
| QUERY CACHE                                          [Refresh] [?]   |
+---------------------------------------------------------------------+
|                                                                      |
|                     No queries registered                            |
|                                                                      |
|    The connected application has no active queries in the cache.     |
|    Queries appear here when components call useQuery() or when       |
|    the QueryClient fetches data.                                     |
|                                                                      |
+---------------------------------------------------------------------+
```

Shown when `snapshot.queryCount === 0` and `entries.length === 0`.

### 3.5 Loading State

```
+---------------------------------------------------------------------+
| QUERY CACHE                                          [Refresh] [?]   |
+---------------------------------------------------------------------+
|                                                                      |
|                     [Spinner]  Loading query data...                  |
|                                                                      |
+---------------------------------------------------------------------+
```

Shown when the initial snapshot has not yet been received from the WebSocket connection (i.e., `snapshot === undefined`).

### 3.6 Detail Pane -- History Tab

When the "History" tab is selected in the detail pane, it shows the fetch history for the selected query:

```
| SELECTED: /api/users                           [Data] [History] [Dx] |
+----------------------------------------------------------------------+
| Fetch History (7 fetches)                                            |
+----------+---------+--------+-------+-----------+--------------------+
| Time     | Result  | Dur    | Retry | Trigger   | Cache Hit          |
+----------+---------+--------+-------+-----------+--------------------+
| 14:32:00 | ok      | 42ms   | 0     | mount     | no                 |
| 14:31:30 | ok      | 38ms   | 0     | refetch   | no                 |
| 14:31:00 | error   | 5002ms | 2     | interval  | no                 |
| 14:30:00 | ok      | 12ms   | 0     | mount     | yes (dedup)        |
+----------+---------+--------+-------+-----------+--------------------+
```

### 3.7 Detail Pane -- Diagnostics Tab

When the "Dx" (diagnostics) tab is selected, it shows suggestions from `getQuerySuggestions()`:

```
| SELECTED: /api/users                           [Data] [History] [Dx] |
+----------------------------------------------------------------------+
| Diagnostics                                                          |
|                                                                      |
| [!] Stale query with active subscribers                              |
|     Query "/api/users" has 3 active subscriber(s) but data is stale  |
|     > Consider reducing staleTime or triggering a refetch.           |
|                                                                      |
| [i] High fetch count                                                 |
|     Query "/api/users" has been fetched 47 times                     |
|     > Check for unnecessary invalidations or short staleTime.        |
+----------------------------------------------------------------------+
```

---

## 4. Component Tree

```
<QueryPanel>                              Root panel component
  |
  +-- <QuerySummaryCards>                 5 stat cards in horizontal row
  |     +-- <StatCard> x5                 Individual metric card
  |
  +-- <QueryFilterBar>                    Filter/search toolbar
  |     +-- <StatusFilterDropdown>        Multi-select status filter
  |     +-- <StalenessFilterDropdown>     Multi-select staleness filter
  |     +-- <SearchInput>                 Debounced text search
  |     +-- <SubscriberToggle>            Toggle for subscriber-only filter
  |
  +-- <QueryTable>                        Virtualized table with sticky header
  |     +-- <QueryTableHeader>            Sortable column headers
  |     +-- <QueryTableRow> x N           One row per filtered/sorted query
  |           +-- <QueryStatusBadge>      Colored status pill (pending/success/error)
  |           +-- <FetchStatusIndicator>  "fetching" spinner or "idle" indicator
  |           +-- <StalenessIndicator>    "fresh" (green) or "stale" (amber) badge
  |           +-- <RelativeTimestamp>     "2s ago", "5m ago" with live update
  |           +-- <QueryActionButtons>    Refetch, Cancel, Remove, Invalidate
  |
  +-- <QueryDetailPane>                   Expanded detail for selected query
  |     +-- <QueryDetailHeader>           Port name, status, metadata
  |     +-- <QueryDetailTabs>             Tab bar: Data | History | Diagnostics
  |     +-- <QueryDataTab>                Full query data as JSON tree
  |     |     +-- <JsonTreeViewer>        Reused from generic panel infrastructure
  |     +-- <QueryHistoryTab>             Fetch history table
  |     |     +-- <FetchHistoryRow> x N   Individual history entries
  |     +-- <QueryDiagnosticsTab>         Suggestions from getQuerySuggestions()
  |           +-- <SuggestionCard> x N    Individual diagnostic suggestions
  |
  +-- <QueryEmptyState>                   Shown when no queries registered
  +-- <QueryLoadingState>                 Shown when awaiting initial data
```

### Component Responsibilities

- **QueryPanel**: Root component. Receives `LibraryPanelProps` with `snapshot: QueryLibrarySnapshot`. Manages local `QueryFilterState`. Requests full `QuerySnapshot` from inspector API via WebSocket for detail pane data.
- **QuerySummaryCards**: Reads `CacheStats` and `QueryDiagnosticSummary`. Pure display component.
- **QueryFilterBar**: Owns filter state via controlled inputs. Emits filter changes to `QueryPanel` via callbacks.
- **QueryTable**: Receives filtered/sorted `QueryRowData[]`. Implements virtual scrolling when row count exceeds 50. Manages selected row state.
- **QueryTableRow**: Renders a single row. Handles click-to-select. Conditionally renders action buttons on hover or always for error/stale rows.
- **QueryStatusBadge**: Renders a colored pill with status text. Color mapped by status value.
- **StalenessIndicator**: Renders "fresh" or "stale" badge with appropriate color.
- **RelativeTimestamp**: Renders a relative time string ("2s ago") from an epoch timestamp. Updates every second via a shared interval timer (not per-row).
- **QueryActionButtons**: Renders context-appropriate action buttons. "Refetch" for success/error/pending rows. "Cancel" for fetching rows. "Remove" for any row. "Invalidate" for success rows.
- **QueryDetailPane**: Appears below the table when a row is selected. Uses a horizontal split layout with metadata on the left and data/history/diagnostics tabs on the right.
- **JsonTreeViewer**: Reused from the generic `LibraryPanel` infrastructure in `@hex-di/devtools`. Renders `unknown` data as a collapsible tree with type-colored values.

---

## 5. Interaction Model

### 5.1 Sorting by Column

- Click any column header to sort by that column.
- First click sorts ascending, second click toggles to descending, third click removes the sort (returns to default order by port name ascending).
- The active sort column shows an arrow indicator (up for asc, down for desc).
- Default sort: port name ascending.

### 5.2 Filtering by Status

- The status dropdown is a multi-select with checkboxes for each status value.
- When no statuses are selected, all rows are shown (equivalent to "all").
- When one or more statuses are selected, only matching rows appear.
- The dropdown button label shows the selected count: "Status: 2 selected" or "Status: all".

### 5.3 Text Search on Query Keys

- The search input matches against port name and serialized params using case-insensitive substring matching.
- Input is debounced by 150ms to avoid excessive re-filtering.
- Matching is performed client-side against the in-memory `QueryRowData[]` array.
- A clear button (X icon) appears inside the input when text is present.

### 5.4 Selecting a Row

- Click a row to select it and open the detail pane below the table.
- The selected row is highlighted with `--hex-bg-active` background.
- Click the same row again to deselect and close the detail pane.
- Only one row can be selected at a time.
- When the selected query is removed from the cache (via eviction or WebSocket update), the detail pane closes automatically.

### 5.5 Refetch Button

1. User clicks the "Refetch" button on a row.
2. Button enters a loading state (spinner replaces the icon).
3. Dashboard sends a `query:refetch` command via WebSocket to the connected app.
4. The connected app's devtools-client receives the command, calls `queryClient.fetchQuery()` on the target port/params.
5. The dashboard receives an updated snapshot showing the query in `fetchStatus: "fetching"`.
6. When the fetch completes, the dashboard receives another snapshot update with fresh data.
7. The button returns to its normal state.
8. If the WebSocket connection is lost during the operation, the button returns to normal with a toast notification: "Command may not have been delivered."

### 5.6 Cancel Button

- Visible only for rows where `fetchStatus === "fetching"`.
- Sends `query:cancel` to the connected app, which calls `queryClient.cancelQueries()` on the target.
- On success, the row transitions to its pre-fetch status.

### 5.7 Remove Button

- Available on all rows. Styled with `--hex-error` color (danger action).
- Requires confirmation: a small inline "Are you sure?" prompt appears with "Yes" / "No" buttons, auto-dismissing after 3 seconds.
- Sends `query:remove` to the connected app, which calls `queryClient.removeQueries()` on the target.
- The row disappears from the table on the next snapshot update.

### 5.8 Invalidate Button

- Available on rows with `status === "success"`.
- Sends `query:invalidate` to the connected app, which calls `queryClient.invalidateQueries()` on the target.
- The query transitions to stale and may immediately refetch if it has active subscribers.

### 5.9 Keyboard Navigation

| Key         | Action                                            |
| ----------- | ------------------------------------------------- |
| `ArrowDown` | Move selection to next row                        |
| `ArrowUp`   | Move selection to previous row                    |
| `Enter`     | Toggle detail pane for selected row               |
| `Escape`    | Close detail pane, or clear search if focused     |
| `r`         | Refetch selected query (when detail pane is open) |
| `d`         | Remove selected query (with confirmation)         |
| `/`         | Focus the search input                            |
| `Tab`       | Move focus between filter controls                |

Focus management: the table region is focusable (`tabindex="0"`) and traps arrow key navigation within the table body. Focus is indicated by a `--hex-shadow-focus` ring on the active row.

---

## 6. WebSocket Commands

### 6.1 Dashboard to Client (Actions)

Commands sent from the dashboard panel to the target application. All commands follow a request-acknowledgement pattern.

```typescript
// Dashboard sends:
type QueryPanelCommand =
  | {
      readonly type: "query:refetch";
      readonly requestId: string;
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "query:invalidate";
      readonly requestId: string;
      readonly portName: string;
      readonly params?: unknown;
    }
  | {
      readonly type: "query:remove";
      readonly requestId: string;
      readonly portName: string;
      readonly params?: unknown;
    }
  | {
      readonly type: "query:cancel";
      readonly requestId: string;
      readonly portName: string;
      readonly params?: unknown;
    }
  | {
      readonly type: "query:request-full-snapshot";
      readonly requestId: string;
    }
  | {
      readonly type: "query:request-entry-detail";
      readonly requestId: string;
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "query:request-fetch-history";
      readonly requestId: string;
      readonly portName: string;
      readonly filter?: FetchHistoryFilter;
    }
  | {
      readonly type: "query:request-diagnostics";
      readonly requestId: string;
    };
```

### 6.2 Client to Dashboard (Responses & Events)

```typescript
// Client sends:
type QueryPanelEvent =
  | {
      readonly type: "query:command-ack";
      readonly requestId: string;
      readonly success: boolean;
      readonly error?: string;
    }
  | {
      readonly type: "query:snapshot-update";
      readonly snapshot: QuerySnapshot;
    }
  | {
      readonly type: "query:entry-detail";
      readonly requestId: string;
      readonly entry: QueryEntrySnapshot | undefined;
    }
  | {
      readonly type: "query:fetch-history";
      readonly requestId: string;
      readonly entries: ReadonlyArray<FetchHistoryEntry>;
    }
  | {
      readonly type: "query:diagnostics";
      readonly requestId: string;
      readonly summary: QueryDiagnosticSummary;
      readonly suggestions: ReadonlyArray<QuerySuggestion>;
    }
  | {
      readonly type: "query:fetch-started";
      readonly portName: string;
      readonly params: unknown;
      readonly timestamp: number;
    }
  | {
      readonly type: "query:fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "query:fetch-error";
      readonly portName: string;
      readonly params: unknown;
      readonly errorTag?: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "query:cache-event";
      readonly event: QueryInspectorEvent;
    };
```

### 6.3 Command Acknowledgement Protocol

Every command includes a unique `requestId` (generated via `crypto.randomUUID()` on the dashboard side). The client responds with `query:command-ack` including the same `requestId`, a `success` boolean, and an optional `error` string on failure. The dashboard sets a 5-second timeout per command. If no ack arrives within the timeout, the UI shows a warning: "Command timed out. The target app may be unresponsive."

### 6.4 Error Handling for Failed Commands

| Failure Scenario                  | Dashboard Behavior                                             |
| --------------------------------- | -------------------------------------------------------------- |
| Command ack with `success: false` | Show error toast with the `error` string from the ack.         |
| Command timeout (5s)              | Show warning toast: "Command timed out."                       |
| WebSocket disconnected            | Disable all action buttons. Show "Disconnected" overlay.       |
| Query not found on client         | Ack returns `success: false, error: "Query not found"`. Toast. |
| Client disposed                   | Ack returns `success: false, error: "Client disposed"`. Toast. |

---

## 7. Real-Time Updates

### 7.1 Subscription Model

When the Query Panel becomes the active panel, the dashboard receives `QueryLibrarySnapshot` data via the `RemoteInspectorAPI` WebSocket subscription. Snapshot updates arrive as part of the unified library inspector data stream. Additionally, the panel issues a one-shot `query:request-full-snapshot` WebSocket command to get the richer `QuerySnapshot` data.

The devtools-client in the target app subscribes to `QueryClient.subscribeToEvents()` and forwards relevant events as `query:cache-event` WebSocket messages to the dashboard. These events arrive in real-time and are used to update individual rows without waiting for a full snapshot refresh.

### 7.2 Incremental Updates

The panel does not re-render the entire table on every snapshot. Instead:

1. When a `query:cache-event` arrives (e.g., `fetch-started`, `fetch-completed`), only the affected row is updated.
2. The `QueryRowData[]` array is compared by cache key. Only rows whose data has changed trigger a React re-render.
3. The summary cards recompute from the latest `CacheStats` on each update.

### 7.3 Status Transition Animations

When a query's status changes, the affected row shows a brief visual transition:

- **fetching start**: The row's fetch status column shows a small animated spinner. The row background pulses once with `--hex-info-muted`.
- **fetch complete (success)**: The status badge transitions from its previous color to `--hex-success`. The row background flashes with `--hex-success-muted` for 300ms.
- **fetch error**: The status badge transitions to `--hex-error`. The row background flashes with `--hex-error-muted` for 300ms.
- All animations respect `prefers-reduced-motion`. When reduced motion is active, transitions are instant with no flash.

### 7.4 Relative Timestamp Updates

The "Updated" column shows relative time ("2s ago", "1m ago", "1h ago"). A single shared `setInterval` timer fires every second and recalculates all visible relative timestamps. This avoids creating one timer per row. The timer is created when the panel mounts and cleared on unmount.

### 7.5 Cache Stats Recalculation

Summary card values update on every `query:snapshot-update` message. The `CacheStats` object embedded in the snapshot is used directly -- no client-side recomputation.

---

## 8. Table Rendering

### 8.1 Columns

| Column      | Width | Content                                         | Sortable |
| ----------- | ----- | ----------------------------------------------- | -------- |
| Port Name   | 25%   | Port name string, monospace font                | Yes      |
| Params      | 15%   | Serialized params preview, truncated to 30 char | No       |
| Status      | 10%   | `QueryStatusBadge` pill                         | Yes      |
| Fetch       | 8%    | `FetchStatusIndicator` (spinner or "idle")      | Yes      |
| Updated     | 12%   | `RelativeTimestamp` component                   | Yes      |
| Staleness   | 10%   | `StalenessIndicator` badge                      | Yes      |
| Subscribers | 8%    | Subscriber count number                         | Yes      |
| Actions     | 12%   | `QueryActionButtons`                            | No       |

### 8.2 Virtual Scrolling

When the query cache contains more than 50 entries, the table body switches to virtual scrolling. Only rows visible in the viewport (plus a 10-row overscan buffer above and below) are rendered as DOM nodes. The total scrollable height is calculated from `rowCount * rowHeight` (row height: 36px). This ensures smooth performance with 1000+ queries.

The implementation uses a simple position-based virtualizer: the table body is a `div` with `overflow-y: auto` and the rows are absolutely positioned within a container whose height equals the total virtual height.

### 8.3 Sticky Header

The column header row uses `position: sticky; top: 0` with a `--hex-bg-secondary` background and a bottom border to maintain visibility while scrolling.

### 8.4 Row Highlighting

- **Hover**: `--hex-bg-hover` background on mouse enter, cleared on mouse leave.
- **Selected**: `--hex-bg-active` background, `--hex-accent` 3px left border.
- **Status flash**: On status change, `--hex-{status}-muted` background for 300ms via CSS transition.
- **Error row emphasis**: Rows with `status === "error"` have a subtle `--hex-error-muted` left border (2px) at rest.

### 8.5 Data Size Formatting

When displaying data size in the detail pane, format bytes using standard units:

- < 1024: `"{n} B"`
- < 1024^2: `"{n} KB"` (1 decimal)
- > = 1024^2: `"{n} MB"` (2 decimals)

Data size is estimated from `JSON.stringify(data).length` in the inspector, which sends it as part of the entry snapshot.

---

## 9. Color and Styling

### 9.1 Status Badge Colors

| Status    | Background Token            | Text Token           | Badge Text |
| --------- | --------------------------- | -------------------- | ---------- |
| `pending` | `--hex-text-muted` (dimmed) | `--hex-text-inverse` | "pending"  |
| `success` | `--hex-success-muted`       | `--hex-success`      | "success"  |
| `error`   | `--hex-error-muted`         | `--hex-error`        | "error"    |

The badge uses `border-radius: var(--hex-radius-pill)` for pill shape, `font-size: var(--hex-font-size-xs)`, `font-weight: var(--hex-font-weight-medium)`, and `padding: var(--hex-space-xxs) var(--hex-space-xs)`.

### 9.2 Fetch Status Indicator

| Fetch Status | Visual                                            |
| ------------ | ------------------------------------------------- |
| `fetching`   | Small animated spinner (12px), `--hex-info` color |
| `idle`       | Muted dash or empty, `--hex-text-muted` color     |

### 9.3 Staleness Indicator Colors

| Staleness | Background Token      | Text Token         | Badge Text |
| --------- | --------------------- | ------------------ | ---------- |
| `fresh`   | `--hex-success-muted` | `--hex-success`    | "fresh"    |
| `stale`   | `--hex-warning-muted` | `--hex-warning`    | "stale"    |
| `unknown` | none                  | `--hex-text-muted` | "--"       |

### 9.4 Summary Card Styling

Each stat card uses:

- Background: `--hex-bg-secondary`
- Border: `1px solid var(--hex-border)`
- Border radius: `--hex-radius-md`
- Padding: `--hex-space-md`
- Primary value: `--hex-font-size-xl`, `--hex-font-weight-semibold`
- Secondary value: `--hex-font-size-xs`, `--hex-text-muted`
- Label: `--hex-font-size-xs`, `--hex-text-secondary`, uppercase

The Errors card uses `--hex-error` for the primary value when `errorEntries > 0`.

### 9.5 Action Button Styling

| Button     | Style                                     | Icon     |
| ---------- | ----------------------------------------- | -------- |
| Refetch    | Ghost button, `--hex-accent` on hover     | Refresh  |
| Invalidate | Ghost button, `--hex-warning` on hover    | Zap      |
| Cancel     | Ghost button, `--hex-text-muted` on hover | X-circle |
| Remove     | Ghost button, `--hex-error` on hover      | Trash    |

Ghost button: transparent background, no border, icon only at 14px. On hover: background changes to the token's muted variant.

### 9.6 Detail Pane Styling

- Background: `--hex-bg-tertiary`
- Top border: `1px solid var(--hex-border)`
- Padding: `--hex-space-lg`
- Tab bar: `--hex-font-size-sm`, active tab has `--hex-accent` bottom border (2px)
- Metadata labels: `--hex-text-secondary`, `--hex-font-size-xs`
- Metadata values: `--hex-text-primary`, `--hex-font-mono`

---

## 10. Cross-Panel Navigation

### 10.1 Port Name to Container Panel

When a query's `portName` references a DI port (which it always does, since queries resolve adapters from the container), clicking the port name in the detail pane invokes `navigateTo("container", { portName })`. The Container Panel activates and scrolls to / highlights the port row in its registry table.

### 10.2 Trace IDs to Tracing Panel

When the `@hex-di/tracing` library is registered and query fetches produce trace spans, the detail pane's history tab shows a "Trace" link on fetch history entries that have an associated `traceId`. Clicking this link navigates to the Tracing Panel with the trace ID pre-filtered, showing the full span waterfall for that fetch operation.

### 10.3 Mutation Effects to Invalidation Graph

When a query was invalidated by a mutation effect (visible in the fetch history with `trigger: "mutation-effect"`), the history entry shows a link to the mutation port name. Clicking navigates to the Container Panel focused on the mutation adapter.

---

## 11. Error States and Edge Cases

### 11.1 No Queries Registered

Display the empty state wireframe (Section 3.4). Summary cards show all zeros. Filter bar and table are hidden.

### 11.2 Query with Very Large Data Payload

The inspector truncates data payloads exceeding 100KB of serialized JSON, replacing them with the string `"[truncated]"`. In the detail pane's Data tab, the JSON tree viewer shows:

```
data: "[truncated]"
  (Query data exceeds 100KB. Data is not transmitted to the dashboard.)
```

A "View raw on client" note indicates the full data exists in the target app but is not sent over WebSocket to avoid bandwidth issues.

### 11.3 Cache Eviction During Viewing

When the selected query is garbage-collected or removed from the cache while the detail pane is open:

1. The row disappears from the table on the next snapshot update.
2. The detail pane shows a "Query removed" notice with the last-known data preserved (grayed out).
3. After 3 seconds, the detail pane closes automatically.

### 11.4 WebSocket Disconnection During Refetch Command

If the WebSocket connection drops after sending a `query:refetch` but before receiving the ack:

1. The action button reverts to its normal state (no loading spinner).
2. A toast notification appears: "Connection lost. Refetch command may not have been delivered."
3. All action buttons are disabled and show a "disconnected" tooltip.
4. When the connection is restored, the panel requests a fresh snapshot and re-enables buttons.

### 11.5 Query Key with Special Characters

Port names and params may contain characters that require special handling in display. All port names are rendered in a monospace `<code>` element with proper HTML escaping. Params are serialized via `JSON.stringify` and truncated to 30 characters in the table with a tooltip showing the full value.

### 11.6 1000+ Queries (Performance)

Virtual scrolling activates at 50+ rows. With 1000+ queries:

- Only ~20-30 DOM rows exist at any time (viewport height / 36px row height + 10 overscan).
- Sorting and filtering operate on the full `QueryRowData[]` array in memory. With 5000 entries, a sort takes <5ms on modern hardware.
- The shared relative timestamp timer updates only visible row timestamps, not the full array.
- Summary cards recompute from `CacheStats` (pre-aggregated by the inspector), not by iterating all entries.

### 11.7 Rapid Status Changes

When a query transitions through multiple statuses quickly (e.g., `pending` -> `success` -> `fetching` -> `success` in under 1 second due to invalidation + refetch), the flash animation is debounced: only the final status transition animation plays. Intermediate states are applied instantly without animation.

---

## 12. Accessibility

### 12.1 Table ARIA Roles

The query table uses proper ARIA table semantics:

```html
<div role="table" aria-label="Query cache entries">
  <div role="rowgroup">
    <div role="row">
      <div role="columnheader" aria-sort="ascending">Port Name</div>
      <div role="columnheader" aria-sort="none">Status</div>
      ...
    </div>
  </div>
  <div role="rowgroup">
    <div role="row" aria-selected="true" tabindex="0">
      <div role="cell">/api/users</div>
      <div role="cell"><span role="status">success</span></div>
      ...
    </div>
  </div>
</div>
```

### 12.2 Sortable Column Announcements

When a column sort changes, an `aria-live="polite"` region announces: "Sorted by {column name}, {ascending/descending}". The `aria-sort` attribute on the column header updates to `"ascending"`, `"descending"`, or `"none"`.

### 12.3 Status Badge Descriptions

Status badges include `aria-label` text: "Query status: success", "Query status: error", etc. Staleness badges similarly include "Staleness: fresh" or "Staleness: stale".

### 12.4 Action Button Labels

Each action button has an `aria-label` that includes the query identifier:

- "Refetch query /api/users"
- "Cancel fetch for /api/orders"
- "Remove query /api/auth from cache"
- "Invalidate query /api/users"

### 12.5 Detail Pane

The detail pane uses `role="region"` with `aria-label="Query detail for /api/users"`. The tab bar uses `role="tablist"` with `role="tab"` on each tab and `role="tabpanel"` on the content area. Tab selection is keyboard-navigable with left/right arrow keys.

### 12.6 Focus Management

When the detail pane opens, focus moves to the first tab in the tab bar. When the detail pane closes (via Escape or deselection), focus returns to the previously selected table row. The search input can be focused with `/` from anywhere in the panel.

### 12.7 Reduced Motion

All animations (status flash, spinner, loading indicators) are disabled when `prefers-reduced-motion: reduce` is active. Transitions complete instantly (0ms duration).

---

## 13. Testing Requirements

### 13.1 Rendering Tests

- Summary cards render correct values from `CacheStats` (total, hit rate, in-flight, stale, errors).
- Summary cards show zeros in empty state.
- Table renders the correct number of rows from `QueryRowData[]`.
- Status badges show correct color for each status value.
- Staleness indicators show correct color for "fresh" vs "stale".
- Relative timestamps render "just now", "Xs ago", "Xm ago", "Xh ago" correctly.
- Empty state renders when `queryCount === 0`.
- Loading state renders when snapshot is undefined.
- Detail pane opens when a row is clicked.
- Detail pane shows correct query metadata.
- Detail pane Data tab renders JSON tree for query data.
- Detail pane History tab renders fetch history entries.
- Detail pane Diagnostics tab renders suggestion cards.

### 13.2 Sorting and Filtering Tests

- Clicking a column header sorts by that column ascending.
- Clicking the same column header again sorts descending.
- Clicking a third time removes the sort.
- Sort indicator arrow shows on the active sort column.
- Status filter dropdown hides non-matching rows.
- Multiple status filters combine with OR logic.
- Text search filters by port name substring (case-insensitive).
- Text search filters by serialized params substring.
- Clearing search shows all rows.
- "Subscribers only" toggle hides rows with `hasSubscribers === false`.
- Combined filters (status + search + staleness) narrow results correctly.

### 13.3 WebSocket Command Tests

- Refetch button sends `query:refetch` with correct `portName` and `params`.
- Refetch button enters loading state on click and exits on ack.
- Cancel button sends `query:cancel` and is only visible for fetching rows.
- Remove button sends `query:remove` after confirmation.
- Remove confirmation auto-dismisses after 3 seconds.
- Invalidate button sends `query:invalidate` for success-status rows.
- All command messages include a unique `requestId`.
- Timeout handling: loading state reverts after 5 seconds with no ack.
- Error ack shows toast with error message.
- Buttons are disabled when WebSocket is disconnected.

### 13.4 Real-Time Update Tests

- `query:snapshot-update` messages update summary cards.
- `query:snapshot-update` messages add/remove rows from the table.
- `query:cache-event` with `fetch-started` updates the fetch status indicator to spinner.
- `query:cache-event` with `fetch-completed` updates status and clears spinner.
- Status transition flash animation triggers on status change.
- Selected row detail pane updates when its query data changes.
- Evicted query closes detail pane with "Query removed" notice.

### 13.5 Virtual Scroll Performance Tests

- Table renders without layout shifts when virtual scrolling activates (50+ rows).
- Scrolling through 1000 rows maintains 60fps (no jank in the paint profiler).
- Filtering a 1000-row table to 10 results completes in under 16ms.
- Sorting a 1000-row table completes in under 16ms.

### 13.6 Empty/Error State Tests

- Empty state renders with correct guidance text when no queries exist.
- Loading state renders with spinner when snapshot is undefined.
- Disconnected state disables all action buttons and shows overlay.
- Truncated data payload shows "[truncated]" with explanation in detail pane.
- Port names with special characters render correctly (no XSS, no broken layout).

### 13.7 Accessibility Tests

- Table has `role="table"` with proper `role="row"`, `role="cell"`, `role="columnheader"`.
- Sort changes announce via `aria-live` region.
- Action buttons have descriptive `aria-label` values.
- Keyboard navigation (arrow keys, Enter, Escape) works within the table.
- Detail pane tabs are navigable with arrow keys.
- Focus returns to table row when detail pane closes.
- All interactive elements are reachable via Tab.

---

> Previous: [04-panels.md, Section 15.3](../04-panels.md#153-query-panel-cache-table) | Parent: [04-panels.md, Section 15](../04-panels.md#section-15-dedicated-library-panel-specifications)
