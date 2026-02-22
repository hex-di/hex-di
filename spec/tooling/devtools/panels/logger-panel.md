# Logger Panel -- Dedicated Library Panel Specification

**Module**: `@hex-di/logger/devtools`
**Inspiration**: pino-pretty, Datadog Log Explorer
**Parent spec**: [04-panels.md Section 15.6](../04-panels.md#156-logger-panel-log-stream)

> Previous: [04-panels.md](../04-panels.md) | Related: [05-visual-design.md](../05-visual-design.md), [03-panel-architecture.md](../03-panel-architecture.md)

---

## Table of Contents

- [1. Purpose and Motivation](#1-purpose-and-motivation)
- [2. Data Model](#2-data-model)
- [3. Layout and Wireframes](#3-layout-and-wireframes)
- [4. Component Tree](#4-component-tree)
- [5. Interaction Model](#5-interaction-model)
- [6. Virtual Scrolling](#6-virtual-scrolling)
- [7. Real-Time Updates](#7-real-time-updates)
- [8. Sparkline Implementation](#8-sparkline-implementation)
- [9. Color and Styling](#9-color-and-styling)
- [10. Cross-Panel Navigation](#10-cross-panel-navigation)
- [11. Error States and Edge Cases](#11-error-states-and-edge-cases)
- [12. Log Correlation](#12-log-correlation)
- [13. Accessibility](#13-accessibility)
- [14. Testing Requirements](#14-testing-requirements)

---

## 1. Purpose and Motivation

The Logger Panel provides a dedicated real-time log stream viewer for the `@hex-di/logger` library, replacing the generic JSON tree fallback from the Libraries panel (Section 12 of the parent spec). While the generic viewer renders `LoggingSnapshot` as a static collapsible tree, the Logger Panel renders individual log entries as a scrollable, filterable, color-coded stream -- the format developers actually use when reading logs.

Problems this panel solves:

- **Real-time log monitoring**: Developers need to see log entries as they happen, not as a flat snapshot count. The streaming view with auto-scroll provides the same experience as tailing a production log file, but integrated into the DevTools dashboard.
- **Error triaging**: Level-based coloring (ERROR in red, WARN in amber) and level filtering allow developers to isolate error entries instantly without scanning through noise. The error rate sparkline gives a 60-second trend view that reveals spikes.
- **Source-based filtering**: In applications with many logger instances (e.g., per-service loggers created via `logger.child()`), source filtering lets developers narrow the stream to a specific service or subsystem.
- **Structured data inspection**: Log entries in `@hex-di/logger` carry structured `annotations` and `context` objects. Clicking a row expands it to reveal this data as a JSON tree, providing the same structured inspection as Datadog Log Explorer or Kibana.
- **Tracing correlation**: Log entries enriched via `withSpanInjection()` carry `traceId` and `spanId`. The panel renders these as clickable links to the Tracing panel, connecting log investigation to distributed tracing.

---

## 2. Data Model

### 2.1 LoggerLibrarySnapshot

The library inspector snapshot passed to the panel from `LoggerInspector.getSnapshot()` via the `LibraryInspector` bridge. This is the existing `LoggingSnapshot` type from `@hex-di/logger/inspection`:

```typescript
interface LoggerLibrarySnapshot {
  /** Timestamp when the snapshot was taken. */
  readonly timestamp: number;
  /** Total number of log entries recorded since application start. */
  readonly totalEntries: number;
  /** Breakdown of entry counts per log level. */
  readonly entriesByLevel: Readonly<Record<LogLevel, number>>;
  /** Current error rate (errors + fatals / total). */
  readonly errorRate: number;
  /** Registered log handlers with metadata. */
  readonly handlers: readonly HandlerInfo[];
  /** Whether sampling is active on the logging pipeline. */
  readonly samplingActive: boolean;
  /** Whether redaction is active on the logging pipeline. */
  readonly redactionActive: boolean;
  /** Current context nesting depth. */
  readonly contextDepth: number;
}
```

The `LogLevel` type from `@hex-di/logger` includes six levels: `"trace" | "debug" | "info" | "warn" | "error" | "fatal"`.

### 2.2 LogEntryRow

A single rendered log entry in the stream. Derived from the `LogEntry` type in `@hex-di/logger`:

```typescript
interface LogEntryRow {
  /** Monotonic sequence number for stable ordering and gap detection. */
  readonly seq: number;
  /** Epoch timestamp when the entry was logged. */
  readonly timestamp: number;
  /** Log level severity. */
  readonly level: LogLevel;
  /** Source identifier (derived from LogContext.service or "unknown"). */
  readonly source: string;
  /** Human-readable log message. */
  readonly message: string;
  /** Structured data (merged annotations + context). */
  readonly data?: Readonly<Record<string, unknown>>;
  /** Trace ID from span injection, if present. */
  readonly traceId?: string;
  /** Span ID from span injection, if present. */
  readonly spanId?: string;
  /** Correlation ID from log context, if present. */
  readonly correlationId?: string;
  /** Scope ID from log context, if present. */
  readonly scopeId?: string;
  /** Whether the entry was flagged by an error (has Error object attached). */
  readonly hasError: boolean;
}
```

`LogEntryRow` is derived from `LogEntry` by extracting `context.service` into `source`, merging `annotations` into `data`, and pulling `traceId`/`spanId` from `spans[0]` and `correlationId`/`scopeId` from `context`.

### 2.3 LogStreamBuffer

Client-side ring buffer holding recent log entries for display. Entries arrive via the `entry-logged` inspector event and are expanded by calling `getRecentEntries()` on the inspector to hydrate the full `LogEntry` data.

```typescript
interface LogStreamBuffer {
  /** Maximum number of entries retained. */
  readonly capacity: number;
  /** All entries in chronological order (oldest first). */
  getEntries(): readonly LogEntryRow[];
  /** Total entries ever received (including evicted). */
  getTotalReceived(): number;
  /** Number of entries evicted from the buffer due to overflow. */
  getTotalEvicted(): number;
  /** Current number of entries in the buffer. */
  getSize(): number;
  /** Append a batch of entries. Evicts oldest if over capacity. */
  pushBatch(entries: readonly LogEntryRow[]): void;
  /** Clear all entries. */
  clear(): void;
}
```

Default capacity: `10000` entries. This is higher than the Event Log's 500-entry buffer because log entries are the primary content of this panel, and developers expect to scroll back through substantial history.

### 2.4 LogLevelStats

Derived statistics per log level, computed from `entriesByLevel` on the snapshot:

```typescript
interface LogLevelStats {
  readonly level: LogLevel;
  /** Absolute count of entries at this level. */
  readonly count: number;
  /** Percentage of total entries (0-100). */
  readonly percentage: number;
  /** Approximate entries per second at this level (computed over trailing 10s window). */
  readonly ratePerSecond: number;
}
```

### 2.5 LogSourceEntry

Dynamically collected source metadata for the source filter dropdown:

```typescript
interface LogSourceEntry {
  /** Source name (from LogContext.service). */
  readonly source: string;
  /** Total entries from this source. */
  readonly entryCount: number;
  /** Entries at error or fatal level from this source. */
  readonly errorCount: number;
}
```

Sources are collected incrementally as entries arrive. The source list is never pruned during the panel's lifetime.

### 2.6 ErrorRateDataPoint

One data point in the error rate sparkline time series:

```typescript
interface ErrorRateDataPoint {
  /** Epoch timestamp at the start of this 1-second bucket. */
  readonly timestamp: number;
  /** Number of error + fatal entries in this second. */
  readonly errorCount: number;
  /** Total entries in this second. */
  readonly totalCount: number;
}
```

The sparkline maintains a sliding window of 60 data points (one per second). Each second, a new data point is appended and the oldest is removed.

### 2.7 LogFilterState

All active filter and UI state for the panel:

```typescript
interface LogFilterState {
  /** Selected log levels to display. Empty set means "show all". */
  readonly levelFilter: ReadonlySet<LogLevel>;
  /** Selected sources to display. Empty set means "show all". */
  readonly sourceFilter: ReadonlySet<string>;
  /** Free-text search query. Empty string means no filter. */
  readonly searchQuery: string;
  /** Whether to show timestamp column. Default: true. */
  readonly showTimestamps: boolean;
  /** Whether auto-scroll is enabled. Default: true. */
  readonly autoScroll: boolean;
}
```

---

## 3. Layout and Wireframes

### 3.1 Full Panel Layout

```
+---------------------------------------------------------------------+
|  LOGGER                                                   [Refresh] |
+---------------------------------------------------------------------+
|                                                                      |
|  +-------------+ +------------------+ +-----------+ +-------------+ |
|  | Total       | | Errors           | | Rate      | |  Sparkline  | |
|  |  8,412      | |  24 (0.3%)       | |  ~12/s    | |  _/\_ /\_  | |
|  +-------------+ +------------------+ +-----------+ +-------------+ |
|                                                                      |
+---------------------------------------------------------------------+
| [Level: all v] [Source: all v]  [Search: ____________]  [Auto: ON]  |
+---------------------------------------------------------------------+
| Time       Level   Source          Message                           |
| ---------- ------  -------------- --------------------------------- |
| 14:32:05   INFO    OrderService   Order created: #1234              |
| 14:32:04   DEBUG   PaymentSvc     Processing payment...             |
| 14:32:03   ERROR   PaymentSvc     Payment timeout: PAY_001         |
| 14:32:02   WARN    CacheManager   Cache miss ratio high: 34%       |
| 14:32:01   INFO    AuthService    User authenticated: u-789         |
| 14:32:01   TRACE   AuthService    Token validation start            |
| 14:32:00   INFO    OrderService   Request received: POST /orders    |
| 14:31:59   DEBUG   DbPool         Connection acquired (pool: 3/10)  |
| 14:31:58   FATAL   PaymentSvc     Circuit breaker OPEN: PAY_GW     |
| 14:31:57   INFO    HealthCheck    Probe OK: /healthz                |
|                                                                      |
+---------------------------------------------------------------------+
```

### 3.2 Summary Cards Row

```
+-------------+  +------------------+  +-----------+  +------------------+
| Total       |  | Errors           |  | Rate      |  |   Error Rate     |
| Entries     |  |                  |  |           |  |   (60s window)   |
|             |  |                  |  |           |  |                  |
|   8,412     |  |   24  (0.3%)    |  |   ~12/s   |  |   __/\_  _/\__  |
|             |  |                  |  |           |  |  /    \/      \ |
+-------------+  +------------------+  +-----------+  +------------------+
```

- **Total Entries**: `totalEntries` from snapshot. Font: `--hex-font-size-lg`, `--hex-font-weight-semibold`.
- **Errors**: `entriesByLevel.error + entriesByLevel.fatal`. Percentage: `(errors / total * 100).toFixed(1)%`. Uses `--hex-error` color for the count.
- **Rate**: Approximate entries per second, computed from entries received in the last 10 seconds. Prefixed with `~`.
- **Error Rate Sparkline**: Inline SVG chart, 60-second window (see Section 8).

### 3.3 Filter Toolbar

```
+---------------------------------------------------------------------+
| [Level: all v] [Source: all v]  [Search: ____________]  [Auto: ON]  |
+---------------------------------------------------------------------+
```

- **Level dropdown**: Multi-select. Options: "All", "FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE". Each option has its level color as a left-border indicator.
- **Source dropdown**: Multi-select. Options: "All" plus dynamically populated source names from `LogSourceEntry` list. Shows entry count next to each source name.
- **Search input**: Text input with magnifying glass icon prefix. Placeholder: "Search messages...". Debounced by 200ms.
- **Auto-scroll toggle**: Button with `ArrowDown` icon. Green when ON, muted when OFF.

### 3.4 Log Stream Table

```
+---------------------------------------------------------------------+
| Time       Level   Source          Message                           |
| ---------- ------  -------------- --------------------------------- |
| 14:32:05   INFO    OrderService   Order created: #1234              |
| 14:32:04   DEBUG   PaymentSvc     Processing payment...             |
| 14:32:03   ERROR   PaymentSvc     Payment timeout: PAY_001         |
+---------------------------------------------------------------------+
```

- **Time**: `HH:MM:SS.mmm` format (24h, millisecond precision). Font: `--hex-font-mono`, `--hex-font-size-xs`, `--hex-text-muted`.
- **Level**: Colored badge (see Section 9). Font: `--hex-font-mono`, `--hex-font-size-xs`, `--hex-font-weight-medium`.
- **Source**: Truncated at 14 characters with ellipsis. Font: `--hex-font-mono`, `--hex-font-size-sm`, `--hex-text-secondary`.
- **Message**: Fills remaining width. Single-line, truncated with ellipsis. Font: `--hex-font-mono`, `--hex-font-size-sm`, `--hex-text-primary`.
- Row height: `28px` collapsed. Variable when expanded.

### 3.5 Expanded Row Detail

```
| 14:32:03   ERROR   PaymentSvc     Payment timeout: PAY_001         |
|   +---------------------------------------------------------------+ |
|   | {                                                              | |
|   |   "errorCode": "PAY_001",                                     | |
|   |   "duration": 5002,                                           | |
|   |   "retries": 3,                                               | |
|   |   "gateway": "stripe",                                        | |
|   |   "traceId": "abc-123-def"    <-- clickable link             | |
|   |   "spanId": "span-456"        <-- clickable link             | |
|   |   "correlationId": "req-789"  <-- clickable link             | |
|   | }                                                              | |
|   +---------------------------------------------------------------+ |
```

- Background: `--hex-bg-tertiary`.
- JSON tree uses the same renderer as the Libraries panel (Section 12.4 of the parent spec): string values in `--hex-success`, numbers in `--hex-info`, booleans in `--hex-accent`, null/undefined in `--hex-text-muted`.
- `traceId`, `spanId`, and `correlationId` values are rendered as clickable links (underlined, `--hex-accent` color).
- Only one row can be expanded at a time (accordion behavior).

### 3.6 Error Rate Sparkline

```
+------------------+
|   Error Rate     |
|   (60s window)   |
|                  |
|      __          |
|     /  \   _     |
|  __/    \_/ \__  |
|                  |
+------------------+
```

- Dimensions: 120px wide, 36px tall (fits inside a summary card).
- SVG path with `--hex-error` stroke and `--hex-error-muted` fill below the line.
- Y-axis: 0 to max(errorCount) in the window, auto-scaled.
- No visible axis labels. Tooltip on hover shows timestamp and count.

### 3.7 Empty State

```
+---------------------------------------------------------------------+
|                                                                      |
|  +-------------+ +------------------+ +-----------+ +-------------+ |
|  | Total       | | Errors           | | Rate      | | Sparkline   | |
|  |  0          | |  0 (0%)          | |  0/s      | |  ________   | |
|  +-------------+ +------------------+ +-----------+ +-------------+ |
|                                                                      |
+---------------------------------------------------------------------+
| [Level: all v] [Source: all v]  [Search: ____________]  [Auto: ON]  |
+---------------------------------------------------------------------+
|                                                                      |
|                                                                      |
|              Waiting for log entries...                               |
|              Logs will appear here as the application runs.          |
|                                                                      |
|                                                                      |
+---------------------------------------------------------------------+
```

- Centered message in `--hex-text-muted`, `--hex-font-size-md`.
- Filter toolbar is still present but dropdowns are disabled.

### 3.8 Paused State (Auto-scroll OFF)

```
+---------------------------------------------------------------------+
| 14:31:50   INFO    OrderService   Older entry visible               |
| 14:31:49   DEBUG   AuthService    Token refresh                     |
| 14:31:48   INFO    HealthCheck    Probe OK                          |
+---------------------------------------------------------------------+
|            [ 47 new entries -- click to scroll to bottom ]           |
+---------------------------------------------------------------------+
```

- The indicator is a sticky bar at the bottom of the log stream area.
- Background: `--hex-accent-muted`. Text: `--hex-accent`, `--hex-font-size-sm`.
- Count updates in real time as new entries arrive.
- Clicking the bar scrolls to the bottom and re-enables auto-scroll.

---

## 4. Component Tree

```
<LoggerPanel>                              [1] Root panel component
  |
  +-- <LogSummaryCards>                    [2] Stat cards row
  |     |
  |     +-- <StatCard label="Total" />     [3] Total entries card
  |     +-- <StatCard label="Errors" />    [4] Error count + percentage
  |     +-- <StatCard label="Rate" />      [5] Approximate rate
  |     +-- <ErrorRateSparkline />         [6] 60-second mini chart
  |
  +-- <LogFilterBar>                       [7] Filter toolbar
  |     |
  |     +-- <LevelFilterDropdown />        [8] Multi-select level filter
  |     +-- <SourceFilterDropdown />       [9] Multi-select source filter
  |     +-- <SearchInput />                [10] Debounced text search
  |     +-- <AutoScrollToggle />           [11] Auto-scroll on/off button
  |
  +-- <LogStream>                          [12] Virtual-scrolled log list
        |
        +-- {filteredEntries.map(entry =>
        |     <LogEntryRow                 [13] Individual log line
        |       key={entry.seq}
        |       entry={entry}
        |       isExpanded={entry.seq === expandedSeq}
        |       onToggleExpand={...}
        |     >
        |       +-- <LogLevelBadge />      [14] Colored level indicator
        |       +-- {isExpanded &&
        |             <LogEntryExpander /> } [15] Expanded JSON tree
        |     </LogEntryRow>
        |   )}
        |
        +-- <NewEntriesIndicator />        [16] "N new entries" sticky bar
```

### Component Responsibilities

| #   | Component              | Responsibility                                                                             |
| --- | ---------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `LoggerPanel`          | Root. Receives `LoggerPanelProps`. Manages `LogFilterState`, buffer, sparkline data.       |
| 2   | `LogSummaryCards`      | Horizontal flex row of stat cards. Reads `LoggerLibrarySnapshot` for counts.               |
| 3-5 | `StatCard`             | Reusable stat card: label + value. Style matches Container panel summary cards.            |
| 6   | `ErrorRateSparkline`   | SVG sparkline rendering 60 `ErrorRateDataPoint` entries.                                   |
| 7   | `LogFilterBar`         | Toolbar row. Dispatches filter state changes up to `LoggerPanel`.                          |
| 8   | `LevelFilterDropdown`  | Multi-select dropdown with level colors. Manages `levelFilter` set.                        |
| 9   | `SourceFilterDropdown` | Multi-select dropdown populated from `LogSourceEntry[]`. Manages `sourceFilter` set.       |
| 10  | `SearchInput`          | Text input with debounce. Manages `searchQuery`.                                           |
| 11  | `AutoScrollToggle`     | Toggle button with state indicator. Manages `autoScroll`.                                  |
| 12  | `LogStream`            | Virtual-scrolled container. Handles scroll position, viewport calculation, auto-scroll.    |
| 13  | `LogEntryRow`          | Single row. Renders time, level badge, source, message. Click handler for expand.          |
| 14  | `LogLevelBadge`        | Colored badge (pill shape) with level text. Color from level-to-token mapping.             |
| 15  | `LogEntryExpander`     | JSON tree view of `entry.data`. Uses same tree renderer as Libraries panel (Section 12.4). |
| 16  | `NewEntriesIndicator`  | Sticky bar shown when `autoScroll === false` and new entries exist below viewport.         |

---

## 5. Interaction Model

### 5.1 Level Filtering

- **Type**: Multi-select dropdown.
- **Options**: FATAL, ERROR, WARN, INFO, DEBUG, TRACE. Each option displays its colored badge.
- **Default**: All levels selected (no filter).
- **Behavior**: Deselecting a level hides entries at that level from the stream. Selecting "All" re-enables all levels. The filter applies to both existing buffered entries and incoming entries.
- **URL-friendly state**: The selected levels are stored as a comma-separated string (e.g., `"error,warn,fatal"`) for potential URL persistence.

### 5.2 Source Filtering

- **Type**: Multi-select dropdown.
- **Options**: Dynamically populated from the `LogSourceEntry[]` list as entries arrive. Each option shows `sourceName (count)`.
- **Default**: All sources selected (no filter).
- **Behavior**: Deselecting a source hides entries from that source. New sources appear in the dropdown as they are first seen.

### 5.3 Text Search

- **Debounce**: 200ms after the last keystroke.
- **Search scope**: Searches across `message` field and string values within `data` (shallow, top-level keys only). Case-insensitive substring match.
- **Highlighting**: Matching substrings in the message column are highlighted with `--hex-accent-muted` background.
- **Clear**: Pressing Escape when the search input is focused clears the search query.

### 5.4 Auto-scroll

- **Default**: ON.
- **ON behavior**: When new entries arrive, the log stream smoothly scrolls to the bottom. The scroll uses `scrollTo({ behavior: "smooth" })` capped at 100ms animation duration.
- **Auto-disable**: When the user scrolls upward (scroll position is more than 100px from the bottom), auto-scroll is automatically disabled. The `NewEntriesIndicator` appears.
- **Auto-re-enable**: Scrolling back to the bottom (within 50px) automatically re-enables auto-scroll.
- **Toggle button**: Clicking the `AutoScrollToggle` button explicitly enables or disables auto-scroll.
- **"N new entries" indicator**: Clicking the `NewEntriesIndicator` scrolls to the bottom and re-enables auto-scroll.

### 5.5 Row Expansion

- **Click**: Click anywhere on a log entry row to expand/collapse it.
- **Accordion**: Only one row is expanded at a time. Expanding a new row collapses the previously expanded one.
- **Expanded content**: The `LogEntryExpander` renders the full `data` object as a collapsible JSON tree. If the entry has `traceId`, `spanId`, `correlationId`, or `scopeId`, these are rendered as clickable links (see Section 10).
- **Scroll preservation**: Expanding a row adjusts the scroll position to keep the expanded row visible.

### 5.6 Keyboard Shortcuts

| Shortcut           | Action                                               | Condition               |
| ------------------ | ---------------------------------------------------- | ----------------------- |
| `Ctrl+F` / `Cmd+F` | Focus the search input                               | Panel is active         |
| `Escape`           | Clear search query and blur search input             | Search input is focused |
| `ArrowDown`        | Select next visible log entry                        | A log entry is focused  |
| `ArrowUp`          | Select previous visible log entry                    | A log entry is focused  |
| `Enter`            | Toggle expand/collapse on the focused log entry      | A log entry is focused  |
| `Home`             | Scroll to the oldest entry in the buffer             | Panel is active         |
| `End`              | Scroll to the newest entry and re-enable auto-scroll | Panel is active         |

---

## 6. Virtual Scrolling

### 6.1 Windowed Rendering

The `LogStream` component uses windowed rendering to maintain smooth performance regardless of buffer size. Only rows visible in the viewport, plus a buffer zone, are mounted as DOM nodes.

- **Row height**: Fixed at 28px for collapsed rows. Variable for the single expanded row (measured dynamically after mount).
- **Overscan**: 20 rows above and 20 rows below the visible viewport.
- **Sentinel elements**: A top spacer and bottom spacer element fill the height of unmounted rows, maintaining accurate scroll bar proportions.
- **Performance target**: 60fps smooth scrolling at 50,000 entries in the buffer.

### 6.2 Variable Row Height Handling

Since exactly one row can be expanded at a time, the virtual scroller only needs to account for one variable-height row. The implementation:

1. Measures the expanded row height after render via `ResizeObserver`.
2. Adjusts the spacer heights and scroll position to accommodate the expanded row.
3. Collapses the row (resetting to 28px) before the row is scrolled out of the viewport.

### 6.3 Scroll Position Restoration

When filter criteria change:

1. The visible entry list is recomputed.
2. If the previously focused/selected entry is still in the filtered list, scroll position is restored to keep it visible.
3. If the previously focused entry is filtered out, scroll position jumps to the nearest surviving entry.
4. If the filtered list is empty, the empty state message is shown.

### 6.4 Memory Management

- Row DOM nodes are recycled (unmounted when scrolled out, re-mounted when scrolled back in).
- The `LogStreamBuffer` itself is a fixed-capacity ring buffer. When entries exceed capacity, the oldest entries are evicted from the buffer and become inaccessible. A notice is shown: "Showing last 10,000 entries. Oldest entries have been evicted."
- Filter operations iterate the buffer directly without creating intermediate arrays.

---

## 7. Real-Time Updates

### 7.1 WebSocket Subscription

The Logger Panel receives data through two channels:

1. **Snapshot updates**: `LoggerLibrarySnapshot` arrives via the `useRemoteUnifiedSnapshot()` hook whenever a `snapshot-changed` event fires. This provides aggregate counts (`totalEntries`, `entriesByLevel`, `errorRate`).

2. **Individual entries**: `entry-logged` events arrive via the `remoteInspector.subscribe()` event stream. Each event contains `level`, `message`, and `timestamp`. The panel calls `remoteInspector.getLibraryInspector("logger").getRecentEntries()` to hydrate the full `LogEntry` data (with annotations, context, spans).

### 7.2 Entry Arrival Pipeline

```
WebSocket message received
    |
    v
RemoteInspectorAPI dispatches "library" event
    |
    v
LoggerPanel event handler receives entry-logged event
    |
    v
Accumulate in 100ms batch window
    |
    v
Batch window closes (or batch reaches 50 entries)
    |
    v
Call getRecentEntries({ since: lastSeenTimestamp, limit: batchSize })
    |
    v
Convert LogEntry[] to LogEntryRow[]
    |
    v
Push batch into LogStreamBuffer
    |
    v
Update sparkline data points
    |
    v
Update source list (if new sources seen)
    |
    v
React re-render (filtered entries recalculated)
    |
    v
If autoScroll: smooth scroll to bottom
```

### 7.3 Batch Rendering

To avoid per-entry React re-renders during high-throughput logging:

- **Batch window**: 100ms. Entries that arrive within the window are collected into an array.
- **Batch size limit**: 50 entries. If 50 entries arrive before the 100ms window closes, the batch is flushed immediately.
- **Single re-render**: Each batch triggers one React state update, not one per entry.
- **Flush on filter change**: When filter criteria change, any pending batch is flushed immediately to ensure the view is consistent.

### 7.4 Buffer Overflow

When the `LogStreamBuffer` exceeds its capacity (default: 10,000):

- Oldest entries are evicted in FIFO order.
- The `totalEvicted` counter increments.
- If the user is viewing entries near the top of the buffer (oldest entries), a notice appears: "Some entries have been evicted. Total received: X."
- Evicted entries are not recoverable.

### 7.5 Summary Stats Updates

Summary cards are updated from the `LoggerLibrarySnapshot`, not from the local buffer. This ensures the "Total Entries" count reflects the full application lifetime, even when the buffer has evicted old entries.

The "Rate" card is computed locally from entries received in the last 10 seconds, using a sliding window counter.

---

## 8. Sparkline Implementation

### 8.1 Data Structure

The sparkline maintains an array of 60 `ErrorRateDataPoint` values, representing the last 60 seconds of error rate data.

### 8.2 Update Cadence

- Every 1 second, a `setInterval` callback creates a new `ErrorRateDataPoint`:
  - `timestamp`: current second (floored to nearest second).
  - `errorCount`: number of error + fatal entries received in the last second (from local arrival tracking).
  - `totalCount`: number of all entries received in the last second.
- The oldest data point is removed if the array exceeds 60 elements.
- When the panel unmounts, the interval is cleared.

### 8.3 SVG Rendering

- **No chart library dependency**. The sparkline is a pure SVG `<path>` element.
- **Dimensions**: 120px wide, 36px tall.
- **Coordinate mapping**: X-axis maps seconds (0-59) to pixels (0-120). Y-axis maps error count (0 to max) to pixels (36 to 0).
- **Line path**: Constructed using `M` (move to first point) and `L` (line to subsequent points) SVG path commands. No curves -- straight line segments between data points for clarity.
- **Fill area**: A closed path from the line down to the baseline, filled with `--hex-error-muted`.
- **Line stroke**: `--hex-error` color, 1.5px stroke width.
- **Empty state**: When all data points have `errorCount === 0`, the sparkline shows a flat line at the baseline.

### 8.4 Tooltip

- **Trigger**: Mouse hover on the sparkline SVG.
- **Content**: "X errors at HH:MM:SS" where X is the `errorCount` for the hovered second.
- **Position**: Above the sparkline, centered on the hovered X position.
- **Style**: Uses `--hex-shadow-tooltip` for the tooltip container. Text in `--hex-font-size-xs`.

---

## 9. Color and Styling

### 9.1 Level Badge Colors

| Level   | Badge Background           | Badge Text                | Row Indicator                         |
| ------- | -------------------------- | ------------------------- | ------------------------------------- |
| `fatal` | `--hex-error` (solid fill) | `--hex-text-inverse`      | `--hex-error` left border (3px)       |
| `error` | `--hex-error-muted`        | `--hex-error`             | `--hex-error-muted` left border (3px) |
| `warn`  | `--hex-warning-muted`      | `--hex-warning`           | None                                  |
| `info`  | `--hex-bg-badge`           | `--hex-text-primary`      | None                                  |
| `debug` | transparent                | `--hex-text-muted`        | None                                  |
| `trace` | transparent                | `--hex-text-muted` italic | None                                  |

The `fatal` level uses a solid filled badge to stand out as the most severe level.

### 9.2 Row Styling

- **Default row**: Background `--hex-bg-primary`. Border bottom: `1px solid --hex-border`.
- **Hover**: Background changes to `--hex-bg-hover` via `--hex-transition-fast`.
- **Selected/expanded**: Background `--hex-bg-secondary`.
- **Error/fatal row**: Subtle `--hex-error-muted` left border (3px solid). This provides a visual scan line for quickly spotting errors in the stream.

### 9.3 Column Typography

| Column  | Font              | Size                 | Color                  |
| ------- | ----------------- | -------------------- | ---------------------- |
| Time    | `--hex-font-mono` | `--hex-font-size-xs` | `--hex-text-muted`     |
| Level   | `--hex-font-mono` | `--hex-font-size-xs` | (per-level, see 9.1)   |
| Source  | `--hex-font-mono` | `--hex-font-size-sm` | `--hex-text-secondary` |
| Message | `--hex-font-mono` | `--hex-font-size-sm` | `--hex-text-primary`   |

### 9.4 Expanded Data Area

- Background: `--hex-bg-tertiary`.
- Border: `1px solid --hex-border` top and bottom.
- Padding: `--hex-space-sm` on all sides.
- JSON tree uses the standard value type coloring from the Libraries panel: strings in `--hex-success`, numbers in `--hex-info`, booleans in `--hex-accent`, null/undefined in `--hex-text-muted`.
- `traceId`, `spanId`, `correlationId`, and `scopeId` values are styled as links: `--hex-accent` color, underlined, cursor: pointer.

### 9.5 Filter Toolbar

- Background: `--hex-bg-secondary`.
- Border bottom: `1px solid --hex-border`.
- Padding: `--hex-space-sm` vertical, `--hex-space-md` horizontal.
- Dropdown buttons: `--hex-bg-primary` background, `--hex-border` border, `--hex-radius-sm` border-radius.
- Search input: `--hex-bg-primary` background, `--hex-border` border, `--hex-radius-sm`, `--hex-font-mono` font.
- Auto-scroll toggle active: `--hex-success` icon color. Inactive: `--hex-text-muted` icon color.

### 9.6 Summary Cards

- Card container: `--hex-bg-secondary` background, `--hex-radius-md` border-radius, `--hex-space-md` padding.
- Label: `--hex-text-secondary`, `--hex-font-size-xs`, `--hex-font-weight-medium`, uppercase.
- Value: `--hex-text-primary`, `--hex-font-size-lg`, `--hex-font-weight-semibold`.
- Error count card: value uses `--hex-error` color when error rate > 5%.

---

## 10. Cross-Panel Navigation

The Logger Panel participates in the dashboard's cross-panel navigation system via the shared `navigateTo(panel, selection)` context.

### 10.1 Outbound Navigation (Logger -> Other Panels)

| Trigger                                  | Target Panel | Target Selection                   |
| ---------------------------------------- | ------------ | ---------------------------------- |
| Click `traceId` value in expanded entry  | Tracing      | Filter by that trace ID            |
| Click `spanId` value in expanded entry   | Tracing      | Select that span in timeline       |
| Click `scopeId` value in expanded entry  | Scope Tree   | Select that scope node             |
| Click `source` if it matches a port name | Container    | Scroll to and select that port row |

### 10.2 Inbound Navigation (Other Panels -> Logger)

| From Panel | Trigger                         | Logger Panel Action                         |
| ---------- | ------------------------------- | ------------------------------------------- |
| Tracing    | Click "View logs" on a span     | Filter by `traceId` matching the span trace |
| Health     | Click error hotspot "View logs" | Filter by `source` matching the port name   |

### 10.3 Correlation-Based In-Panel Navigation

- Clicking a `correlationId` value in an expanded entry sets the search filter to `correlationId:VALUE`, showing all log entries with the same correlation ID.
- This is a same-panel filter operation, not a cross-panel navigation.

---

## 11. Error States and Edge Cases

### 11.1 No Log Entries

When `totalEntries === 0` and no entries have arrived:

- Summary cards show zeroes.
- Sparkline shows flat baseline.
- Log stream area shows centered message: "Waiting for log entries..." in `--hex-text-muted`.
- Filter dropdowns are rendered but disabled.

### 11.2 Extremely High Log Rate (> 1000 entries/second)

When the incoming entry rate exceeds 1000/s:

- Batch rendering accumulates entries for the full 100ms window before rendering (100+ entries per batch).
- If the rate exceeds 5000/s, the panel switches to **sampling mode**: only 1 in N entries are displayed (where N is chosen to target ~1000 displayed entries per second), with a notice: "High log rate detected. Showing sampled entries (~1000/s of ~5200/s)."
- The sampling indicator is a warning badge next to the Rate card with `--hex-warning` coloring.
- Summary stats (total, errors) continue to reflect the full unsampled count.

### 11.3 Very Long Log Messages

- Messages longer than the column width are truncated with ellipsis in the collapsed row view.
- Expanding the row shows the full message text, wrapped to the container width.
- Messages longer than 10,000 characters are truncated in the expanded view with a "Show full message" button that renders the full text in a scrollable container.

### 11.4 Deeply Nested Structured Data

- The JSON tree in `LogEntryExpander` renders up to 10 levels deep (matching the Libraries panel depth limit from Section 12.4).
- Beyond 10 levels, a `"..."` indicator is shown with tooltip: "Maximum depth reached."
- Arrays with more than 100 items are virtualized (only visible items rendered).
- Objects with more than 50 keys are virtualized.

### 11.5 WebSocket Disconnection

When the WebSocket connection to the target app drops:

- Buffered entries remain visible and scrollable.
- Summary cards show the last known values.
- A disconnection banner appears at the top of the panel: "Connection lost. Showing last known data. Reconnecting..." with a `--hex-status-disconnected` indicator.
- When the connection is restored, new entries resume streaming and the banner disappears.
- Entries that occurred during disconnection are lost (the inspector buffer on the target app may have evicted them).

### 11.6 Filter Combination With Zero Matches

When active filters (level + source + search) result in zero matching entries:

- The log stream area shows: "No entries match the current filters." in `--hex-text-muted`, centered.
- Below the message: "Clear filters" link that resets all filters to defaults.
- Summary cards continue to show unfiltered totals from the snapshot.

---

## 12. Log Correlation

### 12.1 Correlation ID Grouping

When `LogEntryRow.correlationId` is present:

- The expanded view shows the `correlationId` value as a clickable link.
- Clicking it sets the search filter to `correlationId:VALUE`, which filters the stream to all entries sharing that correlation ID.
- Entries with the same `correlationId` receive a subtle visual grouping indicator: a thin vertical line in `--hex-accent-muted` along the left gutter when consecutive rows share the same correlation ID.

### 12.2 Trace and Span Linkage

When `LogEntryRow.traceId` or `LogEntryRow.spanId` is present (populated by `withSpanInjection()`):

- The expanded view shows these as clickable links.
- Clicking `traceId` navigates to the Tracing panel with that trace ID as the active filter.
- Clicking `spanId` navigates to the Tracing panel and selects the specific span.
- A small `Activity` icon indicator appears in the collapsed row (right-aligned, `--hex-text-muted`) to indicate tracing data is available.

### 12.3 "Show Related" Action

When a log entry is expanded, a "Show related" dropdown appears in the expanded area with options:

- **"Same correlation"**: Sets search filter to `correlationId:VALUE`. Only shown when `correlationId` is present.
- **"Same source"**: Sets source filter to include only this entry's source.
- **"Same trace"**: Navigates to the Tracing panel filtered by `traceId`. Only shown when `traceId` is present.

---

## 13. Accessibility

### 13.1 ARIA Roles and Attributes

| Element                | Role/Attribute                           | Purpose                                               |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------- |
| Log stream container   | `role="log"`, `aria-live="polite"`       | Announces new entries to screen readers               |
| Log stream (paused)    | `aria-live="off"`                        | Stops announcements when auto-scroll is off           |
| Level filter dropdown  | `role="listbox"`, `aria-multiselectable` | Multi-select semantic                                 |
| Source filter dropdown | `role="listbox"`, `aria-multiselectable` | Multi-select semantic                                 |
| Search input           | `role="searchbox"`, `aria-label`         | Identifies search purpose                             |
| Log entry row          | `role="row"`, `aria-expanded`            | Indicates expand/collapse state                       |
| Expanded data tree     | `role="tree"`, `aria-label`              | Identifies structured data tree                       |
| Auto-scroll toggle     | `aria-pressed`                           | Indicates toggle state                                |
| New entries indicator  | `role="status"`, `aria-live="polite"`    | Announces count of new entries                        |
| Sparkline              | `role="img"`, `aria-label`               | Describes error trend ("3 errors in last 60 seconds") |
| Summary card values    | `aria-label` with descriptive text       | "Total entries: 8412"                                 |

### 13.2 ARIA Live Region Behavior

- When `autoScroll` is ON: the log stream container has `aria-live="polite"`. New batches of entries are announced as they arrive, summarized as "N new log entries" rather than reading each entry.
- When `autoScroll` is OFF: `aria-live` is set to `"off"` to prevent excessive announcements while the user is reading.
- The `NewEntriesIndicator` has its own `aria-live="polite"` region that announces the count of pending entries.

### 13.3 Level Badge Descriptions

Each level badge includes an `aria-label` with the full level name (e.g., `aria-label="Error level"`) to ensure screen readers convey the level information that is otherwise communicated through color alone.

### 13.4 Keyboard Navigation

Full keyboard navigation follows the patterns established in Section 15.5 of the parent spec (Table Interactions):

- `Tab`: Moves between filter toolbar controls and the log stream.
- `ArrowUp`/`ArrowDown` within the log stream: Moves focus between visible rows.
- `Enter` on a focused row: Toggle expand/collapse.
- `Escape`: Clear search, collapse expanded row, or blur focused element.

### 13.5 Color Contrast

All level badge color combinations meet WCAG 2.1 AA contrast requirements (4.5:1 minimum). The `debug` and `trace` levels, which use muted colors, are supplemented with italic styling (trace) to provide a non-color visual distinction.

---

## 14. Testing Requirements

### 14.1 Rendering Tests

- Summary cards render correct values from `LoggerLibrarySnapshot`.
- Error percentage is computed correctly (`(error + fatal) / total * 100`).
- Rate card shows approximate entries per second.
- Log stream renders `LogEntryRow` data in correct columns.
- Level badges display correct colors for each of the six log levels.
- Expanded row shows structured JSON data with correct value type coloring.
- Timestamp column formats as `HH:MM:SS.mmm`.
- Source column truncates at 14 characters with ellipsis.
- Message column truncates with ellipsis when overflowing.

### 14.2 Filtering Tests

- Level filter: selecting ERROR shows only error and fatal entries.
- Level filter: deselecting all levels shows empty state.
- Level filter: multi-select (ERROR + WARN) shows both levels.
- Source filter: selecting a source shows only entries from that source.
- Source filter: new sources appear dynamically in the dropdown.
- Text search: debounces by 200ms.
- Text search: matches substring in message, case-insensitive.
- Text search: matches substring in data field values.
- Text search: highlighting marks matching substrings.
- Combined filters: level + source + search applied together with AND logic.
- Combined filters producing zero results: shows "No entries match" message.
- Clearing filters: all entries reappear.

### 14.3 Virtual Scroll Tests

- Only N rows (viewport + overscan) are mounted in the DOM at any time.
- Scrolling to the bottom mounts the latest entries.
- Scrolling to the top mounts the oldest entries.
- Expanded row correctly adjusts spacer heights.
- Collapsing a row restores standard 28px row height.
- Performance: rendering 10,000 entries completes within 100ms.
- Performance: scroll frame budget stays under 16ms at 50,000 entries.

### 14.4 Real-Time Update Tests

- New entries appear at the bottom of the stream when auto-scroll is ON.
- Auto-scroll scrolls to bottom smoothly on new entry batch.
- Scrolling up disables auto-scroll and shows `NewEntriesIndicator`.
- `NewEntriesIndicator` count increments as new entries arrive.
- Clicking `NewEntriesIndicator` scrolls to bottom and re-enables auto-scroll.
- Batch rendering: entries arriving within 100ms window are rendered in a single update.
- Buffer overflow: oldest entries are evicted when buffer exceeds capacity.
- Summary stats update from snapshot, not from local buffer.

### 14.5 Sparkline Tests

- Sparkline renders 60 data points as an SVG path.
- New data point is appended every second.
- Oldest data point is removed when window exceeds 60 seconds.
- Y-axis scales to the maximum error count in the window.
- Flat line renders at baseline when all error counts are zero.
- Hover tooltip displays correct timestamp and error count.
- Sparkline SVG uses correct color tokens (`--hex-error` stroke, `--hex-error-muted` fill).

### 14.6 Empty, Error, and Paused State Tests

- Empty state: shows "Waiting for log entries..." when no entries exist.
- Empty state: filter dropdowns are disabled.
- Disconnected state: banner appears with reconnection indicator.
- Disconnected state: buffered entries remain visible and scrollable.
- Reconnection: banner disappears and new entries resume streaming.
- High log rate: sampling indicator appears above 5000 entries/second.
- Zero-match filters: shows "No entries match" message with "Clear filters" link.
- Very long messages: truncated in collapsed view, full text in expanded view.
- Deeply nested data: tree stops at 10 levels with "..." indicator.

### 14.7 Cross-Panel Navigation Tests

- Clicking `traceId` in expanded entry calls `navigateTo("tracing", { traceId })`.
- Clicking `spanId` in expanded entry calls `navigateTo("tracing", { spanId })`.
- Clicking `scopeId` in expanded entry calls `navigateTo("scopes", { scopeId })`.
- Clicking `correlationId` sets in-panel filter to `correlationId:VALUE`.
- "Show related" dropdown renders correct options based on available fields.

### 14.8 Accessibility Tests

- Log stream has `role="log"` and appropriate `aria-live` value.
- Level badges have `aria-label` with full level name.
- Expandable rows have `aria-expanded` attribute.
- Keyboard: `ArrowUp`/`ArrowDown` navigates between rows.
- Keyboard: `Enter` toggles row expansion.
- Keyboard: `Ctrl+F` focuses search input.
- Keyboard: `Escape` clears search.
- Auto-scroll toggle has `aria-pressed` attribute.

---

> Parent spec: [04-panels.md](../04-panels.md) | Visual design: [05-visual-design.md](../05-visual-design.md) | Architecture: [03-panel-architecture.md](../03-panel-architecture.md)
