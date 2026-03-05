---
id: UX-SF-013
kind: capability
title: "Import Markdown Specs into Graph"
status: active
features: [FEAT-SF-012, FEAT-SF-001]
behaviors: [BEH-SF-127, BEH-SF-128, BEH-SF-001]
persona: [developer]
surface: [desktop, cli]
---

# Import Markdown Specs into Graph

## Use Case

A developer opens the Import/Export in the desktop app. The import adapter parses frontmatter, extracts IDs and cross-references, and creates graph nodes with proper relationships. This bootstraps the graph from legacy filesystem-based specs. The same operation is accessible via CLI (`specforge import markdown ./spec/**/*.md`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐
│ Developer │  │   Desktop App   │  │ ImportEngine │  │ GraphStore │
└─────┬─────┘  └────────┬────────┘  └──────┬───────┘  └──────┬─────┘
      │ import     │            │                  │
      │ markdown   │            │                  │
      │───────────►│            │                  │
      │            │ importBatch│                  │
      │            │───────────►│                  │
      │            │            │─┐ Parse YAML     │
      │            │            │ │ frontmatter    │
      │            │            │◄┘ (128)          │
      │            │            │─┐ Extract IDs    │
      │            │            │ │ & cross-refs   │
      │            │            │◄┘ (127)          │
      │            │            │ createNodes()    │
      │            │            │─────────────────►│
      │            │            │ NodesCreated (001)│
      │            │            │◄─────────────────│
      │            │            │ createEdges()    │
      │            │            │─────────────────►│
      │            │            │ EdgesCreated     │
      │            │            │◄─────────────────│
      │            │ ImportSummary                  │
      │            │◄───────────│                  │
      │ 42 nodes,  │            │                  │
      │ 87 edges   │            │                  │
      │◄───────────│            │                  │
      │            │            │                  │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Import/Export)
    participant Importer as ImportEngine
    participant Store as GraphStore

    Dev->>+DesktopApp: Open Import/Export
    DesktopApp->>+Importer: importBatch(files, "markdown")
    Importer->>Importer: Parse YAML frontmatter + body (BEH-SF-128)
    Importer->>Importer: Extract IDs and cross-references (BEH-SF-127)
    Importer->>+Store: createNodes(entities)
    Store-->>-Importer: NodesCreated{count: 42} (BEH-SF-001)
    Importer->>+Store: createEdges(crossRefs)
    Store-->>-Importer: EdgesCreated{count: 87}
    Importer-->>-DesktopApp: ImportSummary{nodes: 42, edges: 87, conflicts: 2}
    DesktopApp-->>-Dev: Import complete: 42 nodes, 87 edges, 2 conflicts
```

### CLI

```text
┌───────────┐  ┌─────┐  ┌──────────────┐  ┌────────────┐
│ Developer │  │ CLI │  │ ImportEngine │  │ GraphStore │
└─────┬─────┘  └──┬──┘  └──────┬───────┘  └──────┬─────┘
      │ import     │            │                  │
      │ markdown   │            │                  │
      │───────────►│            │                  │
      │            │ importBatch│                  │
      │            │───────────►│                  │
      │            │            │─┐ Parse YAML     │
      │            │            │ │ frontmatter    │
      │            │            │◄┘ (128)          │
      │            │            │─┐ Extract IDs    │
      │            │            │ │ & cross-refs   │
      │            │            │◄┘ (127)          │
      │            │            │ createNodes()    │
      │            │            │─────────────────►│
      │            │            │ NodesCreated (001)│
      │            │            │◄─────────────────│
      │            │            │ createEdges()    │
      │            │            │─────────────────►│
      │            │            │ EdgesCreated     │
      │            │            │◄─────────────────│
      │            │ ImportSummary                  │
      │            │◄───────────│                  │
      │ 42 nodes,  │            │                  │
      │ 87 edges   │            │                  │
      │◄───────────│            │                  │
      │            │            │                  │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Importer as ImportEngine
    participant Store as GraphStore

    Dev->>+CLI: specforge import markdown ./spec/**/*.md
    CLI->>+Importer: importBatch(files, "markdown")
    Importer->>Importer: Parse YAML frontmatter + body (BEH-SF-128)
    Importer->>Importer: Extract IDs and cross-references (BEH-SF-127)
    Importer->>+Store: createNodes(entities)
    Store-->>-Importer: NodesCreated{count: 42} (BEH-SF-001)
    Importer->>+Store: createEdges(crossRefs)
    Store-->>-Importer: EdgesCreated{count: 87}
    Importer-->>-CLI: ImportSummary{nodes: 42, edges: 87, conflicts: 2}
    CLI-->>-Dev: Import complete: 42 nodes, 87 edges, 2 conflicts
```

## Steps

1. Open the Import/Export in the desktop app
2. Import adapter parses each file's YAML frontmatter and body (BEH-SF-128)
3. Nodes are created for each identified entity (requirement, decision, behavior)
4. Cross-references (e.g., `BEH-SF-057`) are resolved into graph edges (BEH-SF-127)
5. Conflicts with existing graph nodes are reported for resolution
6. Graph is updated with imported content (BEH-SF-001)
7. CLI displays import summary: nodes created, edges created, conflicts

## Traceability

| Behavior   | Feature     | Role in this capability                |
| ---------- | ----------- | -------------------------------------- |
| BEH-SF-127 | FEAT-SF-012 | Import pipeline orchestration          |
| BEH-SF-128 | FEAT-SF-012 | Markdown parsing and entity extraction |
| BEH-SF-001 | FEAT-SF-001 | Graph node and edge creation           |
