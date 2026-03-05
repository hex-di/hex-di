# STR-008 Coverage Store

## Overview

The Coverage Store holds file-level coverage data for the active session. Each file entry describes its coverage percentage, its coverage status classification, and its associated spec file. The store powers the coverage file list and provides aggregate metrics for the coverage view header.

## State Shape

```
CoverageState
+--------------------------------------------------------------+
| files | FileCoverageView[]                                    |
|       | List of files with their coverage metadata             |
+--------------------------------------------------------------+

FileCoverageView
+--------------------------------------------------------------+
| fileName        | string                                      |
|                 | Relative path of the source file             |
+-----------------+--------------------------------------------+
| coveragePercent | number                                       |
|                 | 0-100 coverage percentage for this file      |
+-----------------+--------------------------------------------+
| status          | "covered" | "implemented-only" |             |
|                 | "tested-only" | "gap"                        |
|                 | Classification of the file's coverage state  |
+-----------------+--------------------------------------------+
| specFile        | string                                       |
|                 | The spec file this source file maps to       |
+-----------------+--------------------------------------------+
| fileCategory    | string | undefined                            |
|                 | Optional category (e.g. "component",         |
|                 | "service", "util") for filtering             |
+--------------------------------------------------------------+
```

### Coverage Status Definitions

| Status             | Meaning                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `covered`          | The file has both implementation code and passing tests that exercise it.    |
| `implemented-only` | The file has implementation code but no corresponding tests.                 |
| `tested-only`      | Tests exist for this file, but the implementation is missing or incomplete.  |
| `gap`              | The file is referenced in the spec but has neither implementation nor tests. |

## Selectors

| Selector          | Signature                                  | Description                                                                                           |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `overallCoverage` | `() => number`                             | Computes the arithmetic mean of all `coveragePercent` values. Returns 0 when the file list is empty.  |
| `gapCount`        | `() => number`                             | Counts files with `status === 'gap'`. Used for the coverage view gap indicator.                       |
| `filesByStatus`   | `() => Record<Status, FileCoverageView[]>` | Partitions files into four arrays keyed by status: `covered`, `implementedOnly`, `testedOnly`, `gap`. |

## Event Flow

| Event                           | Fields Affected                  | Description                                                                        |
| ------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `EVT-024-coverage-loaded`       | files (full replace)             | The complete coverage dataset arrives from the backend. Replaces the entire array. |
| `EVT-025-coverage-file-updated` | files[matching] (single replace) | A single file's coverage data is refreshed (e.g., after a test run completes).     |

## Design Rationale

- **File-level granularity**: Coverage data is tracked per file, not per function or per line. This matches the visual design of the coverage file list, which renders one row per file.
- **Pre-classified status**: The backend pre-computes the `status` field rather than having the client derive it from raw metrics. This keeps the store and selectors simple, and ensures all clients classify files identically.
- **Optional fileCategory**: Not all files have a category assigned. The field is optional to accommodate projects where categorization is not yet configured. When present, it enables the category filter in the coverage view.
- **Incremental updates**: `EVT-025` supports updating a single file after an incremental test run, avoiding a full reload of potentially large coverage datasets.
- **Average-based overall coverage**: The `overallCoverage` selector uses an unweighted average across files. This is a deliberate simplification -- a large file and a small file contribute equally. The alternative (LOC-weighted) would require line-count data that the store does not carry.
