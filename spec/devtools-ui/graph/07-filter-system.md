# Filter System

_Previous: [Metadata and Detail](06-metadata-and-detail.md) | Next: [Analysis Sidebar](08-analysis-sidebar.md)_

---

## 9. Filter and Search System

### 9.1 Text Search

Case-insensitive substring match on port name. Debounced 150ms. Matching nodes remain at full opacity; non-matching nodes fade to 15% opacity.

### 9.2 Lifetime Filter

Checkbox group: singleton, scoped, transient. Multiple selections act as OR within this group.

### 9.3 Origin Filter

Checkbox group: own, inherited, overridden. Multiple selections act as OR within this group.

### 9.4 Library/Adapter Kind Filter

Checkbox list showing all `LibraryAdapterKind` values present in the current graph. Grouped by library. Multiple selections act as OR.

### 9.5 Category Filter

Text input with autocomplete suggesting categories present in the current graph. Prefix match.

### 9.6 Tag Filter

Tag input allowing multiple tags. Chips display each active tag. A toggle switches between match modes:

- **Any** (default): A node matches if it has at least one of the specified tags.
- **All**: A node matches only if it has every specified tag.

### 9.7 Direction Filter

Radio group: all, inbound, outbound.

### 9.8 Error Rate Threshold

Number input for minimum error rate (0.0 to 1.0). Nodes with error rate below the threshold are filtered out. Nodes with no error data are treated as 0%.

### 9.9 Inheritance Mode Filter

Checkbox group: shared, forked, isolated. Only active when viewing a child container.

### 9.10 Resolution Status Filter

Radio group: all, resolved, unresolved.

### 9.11 Compound Filter Mode

Radio group: AND (all criteria must match) or OR (any criterion can match).

### 9.12 Saved Filter Presets

- **Save Current**: Opens a dialog to name the current filter configuration. Persisted to localStorage under `hex-devtools-graph-presets`.
- **Load Preset**: Dropdown listing saved presets. Selecting one applies all its filter criteria.
- **Delete Preset**: Right-click on a preset to delete it.

### 9.13 Filter Feedback

The filter panel footer shows "Showing N of M adapters" where N is the count of nodes passing the filter and M is the total count.
