# STR-012: Search Store

## Overview

The Search Store powers the global search overlay (command palette). It manages the search query, result set, overlay visibility, and keyboard-driven selection index. Results are grouped by category so that the overlay can render them in labeled sections.

**Hook:** `useGlobalSearch()`

---

## State Shape

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| query             | string (current search input text)                       |
| results           | SearchResult[]                                           |
| isOpen            | boolean (overlay visibility)                             |
| selectedIndex     | number (-1 when nothing selected)                        |
+-------------------+----------------------------------------------------------+
```

### SearchResult

```
+-------------------+----------------------------------------------------------+
| Field             | Type                                                     |
+-------------------+----------------------------------------------------------+
| id                | string                                                   |
| category          | "sessions" | "specs" | "tasks" | "messages" | "graph-nodes" |
| title             | string (primary display text)                            |
| subtitle          | string (secondary context, e.g., session name)           |
| icon              | string (icon identifier for category)                    |
| navigateTo        | string (view/route to open on selection)                 |
+-------------------+----------------------------------------------------------+
```

---

## Selectors

| Selector            | Parameters | Description                                                              |
| ------------------- | ---------- | ------------------------------------------------------------------------ |
| `hasResults`        | (none)     | Returns `true` when the results array is non-empty.                      |
| `resultCount`       | (none)     | Returns the total number of results across all categories.               |
| `selectedResult`    | (none)     | Returns the SearchResult at `selectedIndex`, or `null` if out of bounds. |
| `resultsByCategory` | (none)     | Groups results into a record keyed by category string.                   |

---

## Event Flow

```
EVT-030 (search-opened)
  --> set isOpen to true

EVT-021 (search-query-changed)
  --> set query to payload.query
  --> reset selectedIndex to -1

EVT-031 (search-results-received)
  --> replace results[] with payload.results

EVT-032 (search-selection-moved)
  --> set selectedIndex to payload.index

EVT-022 (search-result-selected)
  --> close overlay: isOpen = false, query = "", results = [], selectedIndex = -1

EVT-023 (search-closed)
  --> close overlay: isOpen = false, query = "", results = [], selectedIndex = -1
```

### Event-to-Field Mapping

| Event   | Fields Affected                       | Operations           |
| ------- | ------------------------------------- | -------------------- |
| EVT-021 | query, selectedIndex                  | set, set             |
| EVT-022 | isOpen, query, results, selectedIndex | set, set, clear, set |
| EVT-023 | isOpen, query, results, selectedIndex | set, set, clear, set |
| EVT-030 | isOpen                                | set                  |
| EVT-031 | results                               | set                  |
| EVT-032 | selectedIndex                         | set                  |

---

## Keyboard Interaction Model

The search overlay integrates with STR-015 (Keyboard Shortcut Store):

- **`/`** -- Opens the search overlay (dispatches EVT-030)
- **`Escape`** -- Closes the overlay (dispatches EVT-023)
- **`ArrowDown`** -- Increments selectedIndex (dispatches EVT-032)
- **`ArrowUp`** -- Decrements selectedIndex (dispatches EVT-032)
- **`Enter`** -- Selects the current result (dispatches EVT-022)

The selectedIndex resets to -1 whenever the query changes (EVT-021), ensuring the user always starts from "no selection" after modifying the search text.

---

## Design Rationale

1. **Full reset on close/select:** Both EVT-022 and EVT-023 reset the entire store to defaults. This prevents stale results from flashing when the overlay reopens and ensures no leftover state leaks between search sessions.

2. **Selection index rather than selection ID:** Using an index enables keyboard navigation with simple increment/decrement math. The `selectedResult` selector resolves the index to the actual result object.

3. **Category grouping via selector:** Results are stored flat but grouped on read via `resultsByCategory`. This keeps the reducer logic simple (just `set`) while the overlay component can iterate over category sections.

4. **No debounce in the store:** The store does not debounce query changes. Debouncing is the responsibility of the component or action layer that dispatches EVT-021. The store always reflects the latest query immediately.

5. **No persistence:** Search state is entirely ephemeral. Reopening the overlay always starts fresh.

---

## Cross-References

- **Consumer:** CMP-003-search-overlay
- **Events:** EVT-021, EVT-022, EVT-023, EVT-030, EVT-031, EVT-032
- **Related stores:** STR-015 (keyboard shortcut store -- `/` and `Escape` bindings)
- **Workflow:** WF-003-search-and-navigate
