# CMP-021: Graph Edge List

**ID:** CMP-021-graph-edge-list
**Context:** Graph view (PG-009-graph), list of edges (relationships) in the knowledge graph.

---

## Overview

The Graph Edge List displays a table of relationships between knowledge graph nodes. Each row shows the source node label, the relationship type (as a styled label), and the target node label. The component supports filtering by relationship type.

---

## ASCII Mockup

```
 Graph Edge List
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  Edge Count: 87                                                             │
 │                                                                              │
 │  Source                │  Relationship   │  Target                          │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  auth-module-spec      │  --> defines    │  REQ-014-token-validation        │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  implement-jwt-verify  │  --> implements │  REQ-014-token-validation        │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  test-token-expiry     │  --> tests      │  REQ-014-token-validation        │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  auth-module-spec      │  --> covers     │  implement-jwt-verify            │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  gxp-reviewer          │  --> produces   │  missing-audit-trail             │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  review                │  --> uses       │  gxp-reviewer                    │
 │  ──────────────────────┼─────────────────┼──────────────────────────────    │
 │  orchestrator          │  --> consumes   │  missing-audit-trail             │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Arrow Detail

```
 ┌────────────────────┐     ┌───────────────┐     ┌────────────────────┐
 │   source label     │ --> │  relationship │ --> │   target label     │
 │   --sf-text        │     │  --sf-accent  │     │   --sf-text        │
 └────────────────────┘     └───────────────┘     └────────────────────┘
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │                      No graph edges available.                               │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout

- **Container:** Full-width flex column, scrollable vertically.
- **Header area:** Edge count displayed above the table.
- **Table:** 3 columns -- Source, Relationship, Target.
- **Source/Target columns:** Auto-width, left-aligned.
- **Relationship column:** Fixed 140px width, center-aligned, styled as accent-colored text with arrow prefix.

---

## Relationship Types (7)

| Relationship | Meaning                                |
| ------------ | -------------------------------------- |
| defines      | A spec defines a requirement           |
| implements   | A task implements a requirement        |
| tests        | A test tests a requirement             |
| covers       | A spec covers a task                   |
| uses         | A phase uses an agent                  |
| produces     | An agent produces a finding            |
| consumes     | An agent consumes a finding or message |

---

## Filtering

| Filter             | Source (STR-001)          | Behavior                                          |
| ------------------ | ------------------------- | ------------------------------------------------- |
| Relationship Types | `graph.relationshipTypes` | Show only edges matching selected relationship(s) |

When `graph.relationshipTypes` is empty (default), all edges are shown.

---

## Visual States

### Edge Row (ELM-069)

| State   | Background                | Extra                                |
| ------- | ------------------------- | ------------------------------------ |
| Default | `transparent`             | Bottom border `rgba(0,240,255,0.06)` |
| Hover   | `rgba(0, 240, 255, 0.03)` | --                                   |

### Relationship Label

| State   | Color         |
| ------- | ------------- |
| Default | `--sf-accent` |

The relationship text is rendered with a `-->` arrow prefix and accent color to visually indicate direction.

---

## Token Usage

| Token             | Usage                          |
| ----------------- | ------------------------------ |
| `--sf-surface`    | Table container background     |
| `--sf-text`       | Source and target label text   |
| `--sf-text-muted` | Edge count header, empty state |
| `--sf-accent`     | Relationship label text        |

---

## Cross-References

- **Store:** STR-011-graph-store (edgesByRelationship, edgeCount)
- **Store:** STR-001-filter-store (graph.relationshipTypes)
- **Elements:** ELM-069-graph-edge-row
- **Sibling:** CMP-020-graph-node-list, CMP-022-connection-status-banner
- **Page:** PG-009-graph (parent page)
