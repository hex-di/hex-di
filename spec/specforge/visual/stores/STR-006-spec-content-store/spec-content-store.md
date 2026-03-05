# STR-006 Spec Content Store

## Overview

The Spec Content Store holds the raw markdown content of the specification being authored or reviewed. It tracks which sections have been modified since the last load, enabling the UI to highlight changed areas and offer a "changes only" filter mode.

## State Shape

```
SpecContentState
+--------------------------------------------------------------+
| content         | string                                      |
|                 | The full markdown content of the spec file   |
+-----------------+--------------------------------------------+
| changedSections | string[]                                     |
|                 | Array of section identifiers (derived from   |
|                 | H2 headings) that have been modified since   |
|                 | the last load or acknowledgment              |
+--------------------------------------------------------------+
```

### Section Identification

Sections are identified by their H2 heading text, normalized to a slug format (e.g., `## Error Handling` becomes `"error-handling"`). This provides stable identifiers for tracking changes without requiring explicit section IDs in the markdown.

## Selectors

| Selector       | Signature       | Description                                                                                  |
| -------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `sectionCount` | `() => number`  | Counts the number of H2 (`##`) headings in the content string. Returns 0 for empty content.  |
| `hasChanges`   | `() => boolean` | Returns `true` when `changedSections` is non-empty, indicating unacknowledged changes exist. |

## Event Flow

| Event                               | Fields Affected          | Description                                                                          |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `EVT-014-spec-content-loaded`       | content, changedSections | Fresh content loaded from backend. Replaces content entirely and clears change list. |
| `EVT-015-spec-section-changed`      | changedSections (append) | A specific section was modified by the agent. Section ID appended to change list.    |
| `EVT-016-spec-content-updated`      | content                  | Incremental content update (e.g., streaming update from the agent).                  |
| `EVT-017-spec-changes-acknowledged` | changedSections (clear)  | User acknowledges all changes. Clears the changed-sections list.                     |

## Design Rationale

- **Raw markdown storage**: The store holds the raw markdown string rather than a parsed AST. Parsing is deferred to the renderer component, keeping the store simple and the serialization trivial.
- **Change tracking by section**: Rather than diffing entire documents, the backend emits `EVT-015` for each section it modifies. This enables the "show changes only" filter in the spec view without client-side diff computation.
- **Acknowledgment flow**: The `changedSections` list grows as the agent works and resets when the user explicitly acknowledges changes (`EVT-017`). This gives the user a clear "unread changes" indicator.
- **Streaming updates**: `EVT-016-spec-content-updated` supports streaming scenarios where the agent writes content incrementally. The full content is replaced each time, but `changedSections` is only updated by `EVT-015`.
