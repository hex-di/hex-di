# PG-006 Coverage Dashboard

**ID:** PG-006-coverage-dashboard
**Route:** `#coverage`
**Layout:** single-column

---

## Overview

The Coverage Dashboard page shows file-level coverage analysis with progress bars and gap identification. A filter bar at the top provides status multi-select, spec file filter, sort order, file category multi-select, and two toggle filters (show gaps only, show uncovered only). Below the filter bar, four summary stat cards display overall coverage percentage, gap count, total file count, and covered file count. The main content area is a coverage file table rendered by CMP-015-coverage-file-list, where each row shows a file name, coverage progress bar, status badge, spec file reference, and category.

Coverage bar colors follow thresholds: greater than 80% green (#22C55E), 50-80% orange (#FF8C00), less than 50% red (#FF3B3B).

This page requires an active session. If `STR-002.sessionId` is null, the page redirects to `#home`.

---

## ASCII Wireframe

```
+------------------------------------------------------------------------+
|                  PG-006 Coverage Dashboard (full width)                |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  +----------+ +----------+ +--------+ +-----+ +----------+      |  |
|  |  |Status  v | |Spec File | |Sort  v | |Cat v| |Sort...   |      |  |
|  |  | (multi)  | |   all    | |req-id  | |multi| |          |      |  |
|  |  +----------+ +----------+ +--------+ +-----+ +----------+      |  |
|  |                                                                  |  |
|  |  [x] Show gaps only    [x] Show uncovered only                  |  |
|  |                                                                  |  |
|  |  [Active Chips: status:gap  x | gaps-only  x ]                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-015 Coverage File List                                      |  |
|  |                                                                  |  |
|  |  Summary Stats (ELM-056)                                        |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |  | OVERALL      | | GAPS     | | TOTAL     | | COVERED     |    |  |
|  |  | COVERAGE     | |          | | FILES     | | FILES       |    |  |
|  |  |    78%       | |    4     | |    32     | |    25       |    |  |
|  |  | of all files | | need att.| | analyzed  | | fully cov.  |    |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |                                                                  |  |
|  |  File Table                                                      |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | File Name      | Coverage %          | Status  | Spec | Cat ||  |
|  |  |----------------|---------------------|---------|------|-----||  |
|  |  | auth/guard.ts  | [=============] 92% | covered | s/g  | src ||  |
|  |  | auth/policy.ts | [=========   ] 68%  | impl.   | s/g  | src ||  |
|  |  | auth/eval.ts   | [====       ] 35%   | gap     | s/g  | src ||  |
|  |  | auth/types.ts  | [           ]  0%   | gap     | s/g  | typ ||  |
|  |  | tests/guard.ts | [=============] 100%| tested  | s/g  | tst ||  |
|  |  |                |                     |         |      |     ||  |
|  |  +--------------------------------------------------------------+|  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### No-Session State Wireframe

```
+------------------------------------------------------------------------+
|              PG-006 Coverage Dashboard (no session)                    |
|                                                                        |
|                                                                        |
|                    No active session selected.                         |
|                                                                        |
|                  [Go to Home to select a session]                      |
|                                                                        |
|                                                                        |
+------------------------------------------------------------------------+
```

### Empty State Wireframe

```
+------------------------------------------------------------------------+
|               PG-006 Coverage Dashboard (empty)                        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled)                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Summary Stats                                                   |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |  | OVERALL      | | GAPS     | | TOTAL     | | COVERED     |    |  |
|  |  | COVERAGE     | |          | | FILES     | | FILES       |    |  |
|  |  |    --        | |    --    | |    --     | |    --       |    |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |                                                                  |  |
|  |                                                                  |  |
|  |              No coverage data available.                         |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Loading State Wireframe

```
+------------------------------------------------------------------------+
|             PG-006 Coverage Dashboard (loading)                        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled)                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  Summary Stats (skeleton)                                        |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |  | xxxxxxxxxx   | | xxxxxxxx | | xxxxxxxxx | | xxxxxxxxxxx |    |  |
|  |  | xxxxxxxxxx   | | xxxxxxxx | | xxxxxxxxx | | xxxxxxxxxxx |    |  |
|  |  +--------------+ +----------+ +-----------+ +-------------+    |  |
|  |                                                                  |  |
|  |  File Table (skeleton)                                           |  |
|  |  +--------------------------------------------------------------+|  |
|  |  | xxxxxxxxxx  | [xxxxxxxxxx] xxx | xxxxxx | xxxx | xxx         ||  |
|  |  | xxxxxxxxxx  | [xxxxxxxxxx] xxx | xxxxxx | xxxx | xxx         ||  |
|  |  | xxxxxxxxxx  | [xxxxxxxxxx] xxx | xxxxxx | xxxx | xxx         ||  |
|  |  +--------------------------------------------------------------+|  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name               | Position     | Description                                   |
| ------------ | ------------------ | ------------ | --------------------------------------------- |
| CMP-004      | Filter Bar         | Top          | Status, spec file, sort, category, toggles    |
| CMP-015      | Coverage File List | Main content | Summary stats + file table with progress bars |

---

## States

### No-Session State

- **Condition:** `STR-002.sessionId === null`
- **Behavior:** All page components are hidden. A centered prompt is displayed with a link to `#home`.

### Empty State

- **Condition:** `files.length === 0`
- **Behavior:** Filter bar is visible but disabled. Summary stat cards show dashes ("--") for all values. The file table area shows: "No coverage data available."

### Loading State

- **Condition:** Coverage data is being loaded
- **Behavior:** Filter bar is disabled. Summary stat cards show skeleton placeholders (pulsing blocks). The file table shows 3-5 skeleton rows with pulsing placeholder bars.

### Populated State

- **Condition:** `files.length > 0`
- **Behavior:** All filters are interactive. Summary stats show computed values. The file table renders one row per file with coverage progress bar, status badge, spec file, and category. Progress bar colors follow the threshold rules.

---

## Summary Stats

| Stat Card        | Source Selector   | Format  | Description                     |
| ---------------- | ----------------- | ------- | ------------------------------- |
| Overall Coverage | `overallCoverage` | percent | Total coverage across all files |
| Gap Count        | `gapCount`        | number  | Files with "gap" status         |
| Total Files      | `totalFiles`      | number  | Total number of analyzed files  |
| Covered Files    | `coveredCount`    | number  | Files with "covered" status     |

---

## Coverage Bar Color Thresholds

| Range     | Color  | Token/Hex |
| --------- | ------ | --------- |
| > 80%     | Green  | `#22C55E` |
| 50% - 80% | Orange | `#FF8C00` |
| < 50%     | Red    | `#FF3B3B` |

---

## Token / Design Token Usage

| Token                     | Usage                                           |
| ------------------------- | ----------------------------------------------- |
| `--sf-bg`                 | Page background                                 |
| `--sf-surface`            | Summary stat card backgrounds, table background |
| `--sf-surface-elevated`   | Progress bar track                              |
| `--sf-text`               | File names, stat values                         |
| `--sf-text-muted`         | Stat labels, spec file references, categories   |
| `--sf-accent`             | Implemented-only badge color                    |
| `--sf-accent-dim`         | Implemented-only badge background               |
| `#22C55E`                 | Covered badge, high coverage bar                |
| `rgba(34, 197, 94, 0.12)` | Covered badge background                        |
| `#FF8C00`                 | Tested-only badge, medium coverage bar          |
| `rgba(255, 140, 0, 0.12)` | Tested-only badge background                    |
| `#FF3B3B`                 | Gap badge, low coverage bar                     |
| `rgba(255, 59, 59, 0.12)` | Gap badge background                            |
| `--sf-border`             | Table row separators                            |
| `--sf-font-body`          | Table text, filter labels                       |
| `--sf-font-display`       | Summary stat values (24px bold)                 |

---

## Interaction Flow

1. **Page Guard:** On navigation to `#coverage`, the guard checks `STR-002.sessionId`. If null, redirect to `#home`.
2. **Initial Load:** Read `STR-008-coverage-store`. If no files, show empty state. Otherwise render summary stats and file table.
3. **Status Filter:** Selecting statuses in the multi-select dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "statuses", value: [...] }`. Only files matching selected statuses are shown. Empty selection shows all.
4. **Spec File Filter:** Selecting a spec file from the dropdown dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "specFile", value }`. Only files associated with that spec file are shown.
5. **Sort Filter:** Changing the sort dropdown dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "sort", value }`. The file table re-sorts.
6. **Show Gaps Only Toggle:** Toggling dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "showGapsOnly", value: true/false }`. When true, only files with status "gap" are shown.
7. **File Category Filter:** Selecting categories in the multi-select dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "fileCategory", value: [...] }`. Filters files by their category.
8. **Show Uncovered Only Toggle:** Toggling dispatches `EVT-018-filter-changed` with `{ view: "coverage", key: "showUncoveredOnly", value: true/false }`. When true, only files with coverage below 100% are shown.
9. **Summary Stats Update:** Summary stats recompute based on the filtered file list. Overall coverage is the average of visible files. Gap count is the number of visible files with status "gap".

---

## Cross-References

- **Components:** CMP-004 (filter-bar), CMP-015 (coverage-file-list)
- **Elements:** ELM-053 (coverage-file-row), ELM-054 (coverage-progress-bar), ELM-055 (coverage-status-badge), ELM-056 (coverage-summary-stat)
- **Stores:** STR-008 (coverage-store), STR-001 (filter-store, coverage slice), STR-002 (active-session-store)
- **Events:** EVT-018 (filter-changed)
- **Guard:** Requires STR-002.sessionId to be non-null
- **Navigation:** Redirects to PG-001-home if no active session
