# Metadata and Detail

_Previous: [Container Hierarchy](05-container-hierarchy.md) | Next: [Filter System](07-filter-system.md)_

---

## 8. Metadata Inspector

### 8.1 Port Metadata Section

Displays the static port definition metadata:

- **Description**: The `description` string from `CreateDirectedPortOptions`. Full text, wrapping. `--hex-text-primary`.
- **Direction**: "inbound" or "outbound" with icon. Inbound uses `--hex-success`, outbound uses `--hex-info`.
- **Category**: The category string with its category color bar.
- **Tags**: Rendered as inline badge chips. Each tag is a rounded pill with `--hex-bg-secondary` background.

### 8.2 Adapter Metadata Section

Displays the adapter's structural metadata from `VisualizableAdapter`:

- Lifetime, factory kind, origin, inheritance mode, isOverride.
- Each field is a label-value row using `--hex-font-mono` for values.

### 8.3 Custom User Metadata

Displays `VisualizableAdapter.metadata` as a JSON tree. The tree viewer supports expand/collapse. Values use syntax highlighting consistent with the shared JSON tree viewer.

### 8.4 Library-Specific Metadata

When the adapter is identified as a library adapter kind, additional metadata is displayed:

- **Flow adapters**: Transition map, current state, effect list.
- **Saga adapters**: Step definitions, compensation policies, timeout configuration.
- **Store adapters**: Action names (for state), source ports (for derived), subscriber count.
- **Query adapters**: Cache key, stale time, retry configuration.

This section is populated from the `metadata` field on the adapter, which libraries write at registration time.

### 8.5 Result Statistics Section

When `ResultStatistics` are available for the selected adapter, a "Result Statistics" section appears:

- **Total Calls**: The `totalCalls` count.
- **Success / Error**: `okCount` and `errCount` displayed as "N ok / M err" with green/red coloring.
- **Error Rate**: Percentage from `errorRate`, with `--hex-error` color when above 10%.
- **Errors by Code**: A collapsible table mapping error code strings to their occurrence counts from `errorsByCode`. Sorted by count descending.
- **Last Error**: The most recent error code and relative timestamp (e.g., "ERR_TIMEOUT, 3m ago").

### 8.6 Inline Card Metadata by Library

The enhanced card UI (200x72) displays inline metadata on line 2 of the card. This metadata is derived from the `LibraryAdapterKind` and provides at-a-glance identification of the adapter's purpose without opening the detail panel.

| Library | Kind            | Line 2 Text                        | Example                           |
| ------- | --------------- | ---------------------------------- | --------------------------------- |
| Store   | state           | `store/state · {lifetime}`         | `store/state · singleton`         |
| Store   | atom            | `store/atom · {lifetime}`          | `store/atom · transient`          |
| Store   | derived         | `store/derived · {lifetime}`       | `store/derived · scoped`          |
| Store   | async-derived   | `store/async-derived · {lifetime}` | `store/async-derived · singleton` |
| Store   | linked-derived  | `store/linked · {lifetime}`        | `store/linked · singleton`        |
| Store   | effect          | `store/effect · {lifetime}`        | `store/effect · transient`        |
| Query   | query           | `query · {lifetime}`               | `query · singleton`               |
| Query   | mutation        | `mutation · {lifetime}`            | `mutation · scoped`               |
| Query   | streamed-query  | `streamed · {lifetime}`            | `streamed · singleton`            |
| Saga    | saga            | `saga · {lifetime}`                | `saga · singleton`                |
| Saga    | saga-management | `management · {lifetime}`          | `management · singleton`          |
| Flow    | flow            | `flow · {lifetime}`                | `flow · singleton`                |
| Flow    | activity        | `activity · {lifetime}`            | `activity · transient`            |
| Logger  | \*              | `logger · {lifetime}`              | `logger · singleton`              |
| Tracing | \*              | `tracer · {lifetime}`              | `tracer · singleton`              |
| Core    | generic         | `{lifetime}`                       | `singleton`                       |

Line 3 shows dependency and dependent counts: `deps: N · dependents: M`.

The inline text uses `--hex-text-secondary` at 11px size. The lifetime portion uses the same muted color. The separator `·` (middle dot) provides visual grouping.

### 8.7 Audit and Correlation Section

When `GraphAnalysisState.actor` is present, an "Audit Trail" section appears:

- **Actor**: Displays `actor.type` badge ("user" / "system" / "process") with `actor.id` and optional `actor.name`.
- **Correlation ID**: The `correlationId` string displayed in monospace font with a "Copy" button.

This section is primarily useful in GxP-regulated environments where audit trail visibility is required. It appears at the bottom of the metadata inspector.
