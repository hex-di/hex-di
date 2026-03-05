# PG-004 Spec Viewer

**ID:** PG-004-spec-viewer
**Route:** `#spec`
**Layout:** single-column

---

## Overview

The Spec Viewer page renders the generated specification document as markdown with change tracking. It provides a filter bar at the top with a "Show changes only" toggle and a text search input. Below the filter bar, the full-width markdown content is rendered by CMP-012-markdown-section-renderer. Sections that have been modified since the last acknowledgement are highlighted with a colored left accent border.

This page requires an active session. If `STR-002.sessionId` is null, the page redirects to `#home`.

---

## ASCII Wireframe

```
+------------------------------------------------------------------------+
|                    PG-004 Spec Viewer (full width)                     |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  [x] Show changes only          [Search spec content...       ]  |  |
|  |                                                                  |  |
|  |  [Active Filter Chips: changes-only  x ]                        |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-012 Markdown Section Renderer                               |  |
|  |                                                                  |  |
|  |  # Specification: @hex-di/guard                                  |  |
|  |                                                                  |  |
|  |  ## 1. Overview                                                  |  |
|  |  The guard package provides a policy-based authorization         |  |
|  |  system with 10 policy kinds...                                  |  |
|  |                                                                  |  |
|  |  +-- changed section indicator (accent left border) ----------+  |  |
|  |  |## 2. Policy Kinds                                          |  |  |
|  |  |                                                            |  |  |
|  |  |### 2.1 hasPermission                                       |  |  |
|  |  |Checks if a subject has a specific permission...            |  |  |
|  |  |                                                            |  |  |
|  |  |### 2.2 hasRole                                             |  |  |
|  |  |Checks if a subject holds a specific role...                |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |  ## 3. Evaluation Engine                                         |  |
|  |  The async evaluator processes policies in parallel...           |  |
|  |                                                                  |  |
|  |  +-- changed section indicator --+                               |  |
|  |  |## 4. Serialization            |                               |  |
|  |  |Policies can be serialized to  |                               |  |
|  |  |JSON for persistence...        |                               |  |
|  |  +-------------------------------+                               |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### No-Session State Wireframe

```
+------------------------------------------------------------------------+
|                  PG-004 Spec Viewer (no session)                       |
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
|                  PG-004 Spec Viewer (empty)                            |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled)                                   |  |
|  |  [ ] Show changes only          [Search...                    ]  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                                                                  |  |
|  |                                                                  |  |
|  |          No specification has been generated yet.                |  |
|  |          Start a conversation in Chat to begin discovery.        |  |
|  |                                                                  |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Loading State Wireframe

```
+------------------------------------------------------------------------+
|                  PG-004 Spec Viewer (loading)                          |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar (disabled)                                   |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-012 Markdown Section Renderer (skeleton)                    |  |
|  |                                                                  |  |
|  |  # xxxxxxxxxxxxxxxxxx                                            |  |
|  |                                                                  |  |
|  |  ## xxxxxxxxxxxx                                                 |  |
|  |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       |  |
|  |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       |  |
|  |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       |  |
|  |                                                                  |  |
|  |  ## xxxxxxxxxxxx                                                 |  |
|  |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       |  |
|  |  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                       |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Show Changes Only Wireframe

```
+------------------------------------------------------------------------+
|              PG-004 Spec Viewer (changes-only filter active)           |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-004 Filter Bar                                              |  |
|  |  [x] Show changes only          [Search...                    ]  |  |
|  |  [changes-only  x]                                               |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-012 (only changed sections shown)                          |  |
|  |                                                                  |  |
|  |  +-- accent left border -+                                      |  |
|  |  |## 2. Policy Kinds     |                                      |  |
|  |  |...                    |                                      |  |
|  |  +------------------------+                                      |  |
|  |                                                                  |  |
|  |  +-- accent left border -+                                      |  |
|  |  |## 4. Serialization    |                                      |  |
|  |  |...                    |                                      |  |
|  |  +------------------------+                                      |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name                      | Position     | Description                              |
| ------------ | ------------------------- | ------------ | ---------------------------------------- |
| CMP-004      | Filter Bar                | Top          | Changes toggle + search input            |
| CMP-012      | Markdown Section Renderer | Main content | Rendered markdown with change highlights |

---

## States

### No-Session State

- **Condition:** `STR-002.sessionId === null`
- **Behavior:** All page components are hidden. A centered prompt is displayed with a link to `#home`.

### Empty State

- **Condition:** `STR-006.content === ''`
- **Behavior:** The filter bar is visible but disabled. The content area shows a centered message: "No specification has been generated yet. Start a conversation in Chat to begin discovery."

### Loading State

- **Condition:** Spec content is being loaded
- **Behavior:** The filter bar is disabled. The content area shows skeleton blocks that mimic the shape of rendered markdown sections (heading blocks, paragraph blocks).

### Populated State

- **Condition:** `STR-006.content !== ''`
- **Behavior:** The filter bar is active. Markdown content is rendered in full. Sections whose IDs appear in `STR-006.changedSections` are highlighted with a 3px accent-colored left border. The "Show changes only" toggle, when active, hides all sections except changed ones. The search input highlights matching text within the rendered markdown.

---

## Token / Design Token Usage

| Token               | Usage                                          |
| ------------------- | ---------------------------------------------- |
| `--sf-bg`           | Page background                                |
| `--sf-surface`      | Content area background                        |
| `--sf-text`         | Rendered markdown body text                    |
| `--sf-text-muted`   | Section numbers, empty state text              |
| `--sf-accent`       | Changed section left border, search highlights |
| `--sf-accent-dim`   | Changed section background tint                |
| `--sf-font-body`    | Paragraph text                                 |
| `--sf-font-display` | H1 heading                                     |
| `--sf-font-mono`    | Code blocks within markdown                    |
| `--sf-border`       | Section separator lines                        |

---

## Interaction Flow

1. **Page Guard:** On navigation to `#spec`, the guard checks `STR-002.sessionId`. If null, redirect to `#home`.
2. **Initial Load:** Read `STR-006.content`. If empty, show empty state. Otherwise render the markdown.
3. **Change Tracking:** When `EVT-015-spec-section-changed` fires, the sectionId is added to `STR-006.changedSections`. The corresponding section in the renderer gets a left accent border.
4. **Show Changes Only:** Toggling the "Show changes only" filter dispatches `EVT-018-filter-changed` with `{ view: "spec", key: "showChangesOnly", value: true/false }`. When true, the renderer hides all sections not in `changedSections`.
5. **Search:** Typing in the search input dispatches `EVT-018-filter-changed` with `{ view: "spec", key: "search", value }` (debounced 300ms). Matching text in the rendered markdown is highlighted with accent background.
6. **Content Updates:** When `EVT-016-spec-content-updated` fires, the full content is replaced. The renderer re-renders all sections.
7. **Acknowledge Changes:** The user can acknowledge changes (clearing `changedSections`), which dispatches `EVT-017-spec-changes-acknowledged`. All change highlights are removed.

---

## Cross-References

- **Components:** CMP-004 (filter-bar), CMP-012 (markdown-section-renderer)
- **Stores:** STR-006 (spec-content-store), STR-001 (filter-store, spec slice), STR-002 (active-session-store)
- **Events:** EVT-014 (spec-content-loaded), EVT-015 (spec-section-changed), EVT-016 (spec-content-updated), EVT-017 (spec-changes-acknowledged), EVT-018 (filter-changed)
- **Guard:** Requires STR-002.sessionId to be non-null
- **Navigation:** Redirects to PG-001-home if no active session
