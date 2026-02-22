_Previous: [12-educational-features.md](12-educational-features.md) | Next: [14-integration.md](14-integration.md)_

# 13. Filter & Search System

Filtering and searching across all Result Panel views. Allows users to narrow down chains, executions, operations, and error types.

## 13.1 Global Chain Filter

Located in the toolbar area, applies across all views.

```
+==[Filter Bar]=============================================================+
| Chain: [Search chains...   ▼]  Port: [All ports ▼]  Status: [All ▼]     |
| Error Type: [All errors ▼]  Time: [Last 1h ▼]  [Clear All Filters]     |
+==========================================================================+
```

### Filter Dimensions

| Filter       | Type       | Options                          | Default            |
| ------------ | ---------- | -------------------------------- | ------------------ |
| Chain search | Text input | Substring match on chain label   | Empty (all chains) |
| Port         | Dropdown   | All ports, or specific port name | All                |
| Status       | Dropdown   | All, Ok only, Err only, Mixed    | All                |
| Error type   | Dropdown   | All, or specific error tag       | All                |
| Time range   | Dropdown   | Last 5 min, 1h, 24h, All, Custom | All                |

### Filter Behavior

- Filters are AND-combined: all active filters must match
- Chain search is debounced at 150ms
- Dropdown selections apply immediately
- Filters persist across view switches within the same session
- "Clear All Filters" resets all to defaults
- Active filter count shown as badge on the filter toggle button

## 13.2 Railway Pipeline Filters

Additional filters specific to the Railway Pipeline view:

| Filter              | Type   | Description                                                        |
| ------------------- | ------ | ------------------------------------------------------------------ |
| Show bypassed       | Toggle | Show/hide dimmed bypassed operations (default: show)               |
| Highlight switches  | Toggle | Add extra visual emphasis to switch points (default: on)           |
| Show durations      | Toggle | Show/hide duration labels on nodes (default: show)                 |
| Collapse non-switch | Toggle | Auto-collapse sequences of non-switching operations (default: off) |

When "Collapse non-switch" is on:

```
Before:
  ok → map → map → map → andThen → map → orElse → match

After:
  ok → [3 maps] → andThen → [1 map] → orElse → match
```

Collapsed badges show the count and are expandable on click.

## 13.3 Operation Log Filters

Filters in the Operation Log view header:

```
+==[Log Filters]============================================================+
| [☐ Switch only] [☐ Err only]  Methods: [Select... ▼]  Duration: [>0ms ▼]|
+==========================================================================+
```

| Filter             | Type                  | Description                                             |
| ------------------ | --------------------- | ------------------------------------------------------- |
| Switch only        | Toggle                | Show only steps where `switched === true`               |
| Err steps only     | Toggle                | Show only steps where `outputTrack === "err"`           |
| Method filter      | Multi-select dropdown | Show only selected methods (e.g., only `andThen` steps) |
| Duration threshold | Range input           | Show only steps with `durationMicros >= threshold`      |

### Combined Log Filtering

When multiple filters are active, they combine with AND logic:

- "Switch only" + method="andThen" → only andThen steps that actually switched
- "Err only" + duration>10ms → only slow error-producing steps

### Log Filter Summary

When filters are active, a summary line appears above the log:

```
Showing 3 of 12 steps (Switch only, andThen/orElse only)  [Clear]
```

## 13.4 Case Explorer Filters

| Filter              | Type         | Description                                                  |
| ------------------- | ------------ | ------------------------------------------------------------ |
| Path classification | Multi-select | Happy, Error, Recovery, Multi-error, Unobserved, Rare        |
| Observed only       | Toggle       | Hide unobserved paths                                        |
| Min frequency       | Range input  | Show paths above this percentage (0-100%)                    |
| Sort by             | Dropdown     | Frequency (desc), Frequency (asc), Switch count, Path length |

### Coverage View Mode

A toggle between:

- **Tree view**: Default binary tree visualization
- **Table view**: Flat list of all paths with columns for classification, frequency, switch count, observed status

Table view is useful when the tree has many paths (>16) and scrolling the tree becomes impractical.

## 13.5 Sankey Filters

| Filter        | Type        | Description                                    |
| ------------- | ----------- | ---------------------------------------------- |
| Port filter   | Dropdown    | Single port or "All ports aggregate"           |
| Time range    | Dropdown    | Temporal window for aggregate computation      |
| Min flow      | Range input | Hide links below this percentage (default: 1%) |
| Show recovery | Toggle      | Highlight Err→Ok links (default: on)           |

### Min Flow Behavior

When min flow is set to N%:

- Links carrying fewer than N% of total flow become invisible
- Affected nodes shrink proportionally
- A "N hidden flows (< M%)" label appears at the bottom

## 13.6 Async Waterfall Filters

| Filter       | Type        | Description                                            |
| ------------ | ----------- | ------------------------------------------------------ |
| Min duration | Range input | Show only steps with duration above threshold          |
| Track filter | Radio       | All, Ok only, Err only                                 |
| Sort by      | Dropdown    | Execution order (default), Duration (desc), Start time |

## 13.7 Combinator Matrix Filters

| Filter          | Type         | Description                                              |
| --------------- | ------------ | -------------------------------------------------------- |
| Combinator type | Dropdown     | all, allSettled, any, collect (when chain has multiple)  |
| Show statistics | Toggle       | Switch between single execution and aggregate statistics |
| Input status    | Multi-select | Show only inputs that are Ok / Err / Short-circuited     |

## 13.8 Overview Dashboard Filters

| Filter         | Type         | Description                                     |
| -------------- | ------------ | ----------------------------------------------- |
| Time range     | Dropdown     | Controls the window for all dashboard metrics   |
| Port group     | Multi-select | Show metrics for selected ports only            |
| Min error rate | Range input  | Show only ports with error rate above threshold |

## 13.9 Search Across Views

A global search box accessible via `/` keyboard shortcut or the search icon in the toolbar:

```
+==[Global Search]=========================================================+
| 🔍 [Search chains, methods, errors, values...                          ]|
|                                                                          |
| Results:                                                                 |
|                                                                          |
| Chains:                                                                  |
|   validateUser — 97% Ok, 870 runs                                       |
|   fetchUserPosts — 91% Ok, 450 runs                                     |
|                                                                          |
| Operations:                                                              |
|   andThen(validateEmail) in validateUser [step 2]                       |
|   andThen(validateAge) in validateUser [step 3]                         |
|                                                                          |
| Errors:                                                                  |
|   ValidationError — 241 occurrences (validateUser)                      |
|   NetworkError — 49 occurrences (fetchPosts)                            |
|                                                                          |
| Values:                                                                  |
|   "bad@" found in execution #846, step 2 input                         |
|                                                                          |
+==========================================================================+
```

### Search Behavior

- Searches across chain labels, operation labels, error type names, and serialized values
- Results grouped by category (Chains, Operations, Errors, Values)
- Click a result to navigate to that context (chain selected, view switched, step highlighted)
- Search is debounced at 200ms
- Max 10 results per category
- Value search only works when values have been captured (Level 1 tracing)

### Search Result Actions

| Result Category | Click Action                                                            |
| --------------- | ----------------------------------------------------------------------- |
| Chain           | Select chain, switch to Railway Pipeline view                           |
| Operation       | Select chain, switch to Operation Log, scroll to step                   |
| Error           | Select chain, switch to Sankey, filter to error type                    |
| Value           | Select chain, select execution, switch to Operation Log, scroll to step |

## 13.10 Filter State Persistence

| Scope                                                 | Storage         | Lifetime        |
| ----------------------------------------------------- | --------------- | --------------- |
| Session filters (chain, execution)                    | In-memory state | Current session |
| View-specific filters (log toggles, pipeline toggles) | In-memory state | Current session |
| Time range preference                                 | localStorage    | Across sessions |
| Default view                                          | localStorage    | Across sessions |
| Educational sidebar state (open/closed)               | localStorage    | Across sessions |
| Walkthrough progress                                  | localStorage    | Across sessions |
| "Don't show hints"                                    | localStorage    | Across sessions |

### localStorage Keys

| Key                                        | Type    | Description                  |
| ------------------------------------------ | ------- | ---------------------------- |
| `hex-devtools-result-time-range`           | string  | Preferred time range         |
| `hex-devtools-result-default-view`         | string  | Default view on panel open   |
| `hex-devtools-result-hints-disabled`       | boolean | Suppress learning prompts    |
| `hex-devtools-result-walkthrough-progress` | object  | Walkthrough completion state |
| `hex-devtools-result-first-visit`          | boolean | First-time experience shown  |

## 13.11 Filter Interaction with Real-Time Updates

When filters are active and new data arrives:

- New executions that match filters appear in the execution selector
- New executions that don't match filters are silently buffered
- Aggregate statistics update only for matched data
- If a new chain is registered that matches the chain search, it appears in the chain selector
- Filter badge count does not change from real-time updates (only from user action)

_Previous: [12-educational-features.md](12-educational-features.md) | Next: [14-integration.md](14-integration.md)_
