---
id: UX-SF-010
kind: capability
title: "Run Analytical Graph Queries"
status: active
features: [FEAT-SF-001, FEAT-SF-009]
behaviors: [BEH-SF-001, BEH-SF-003, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# Run Analytical Graph Queries

## Use Case

A developer opens the Graph Explorer in the desktop app. Unlike ad-hoc Cypher, these are predefined query templates (e.g., `traceability-coverage`, `orphan-requirements`, `dependency-depth`) that return formatted analytical results. The same operation is accessible via CLI (`specforge graph analytics list`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐ ┌─────────────────┐ ┌────────────┐
│ Developer │ │   Desktop App   │ │ GraphStore │
└─────┬─────┘ └────────┬────────┘ └─────┬──────┘
      │           │           │
      │ graph analytics traceability-coverage
      │──────────►│           │
      │           │ executeTemplate(
      │           │   "traceability-coverage")
      │           │──────────►│
      │           │           │ Run graph algorithm
      │           │           │──┐
      │           │           │◄─┘
      │           │ AnalyticsResult{
      │           │   coverage: 87%, gaps}
      │           │◄──────────│
      │           │           │
      │ Coverage report table │
      │◄──────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Graph Explorer)
    participant Store as GraphStore

    Dev->>+DesktopApp: Open Graph Explorer
    DesktopApp->>+Store: executeTemplate("traceability-coverage")
    Store->>Store: Run graph algorithm (BEH-SF-003)
    Store-->>-DesktopApp: AnalyticsResult{coverage: 87%, gaps: [...]}
    DesktopApp-->>-Dev: Coverage report table (BEH-SF-113)
```

### CLI

```text
┌───────────┐ ┌─────┐ ┌────────────┐
│ Developer │ │ CLI │ │ GraphStore │
└─────┬─────┘ └──┬──┘ └─────┬──────┘
      │           │           │
      │ graph analytics traceability-coverage
      │──────────►│           │
      │           │ executeTemplate(
      │           │   "traceability-coverage")
      │           │──────────►│
      │           │           │ Run graph algorithm
      │           │           │──┐
      │           │           │◄─┘
      │           │ AnalyticsResult{
      │           │   coverage: 87%, gaps}
      │           │◄──────────│
      │           │           │
      │ Coverage report table │
      │◄──────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Store as GraphStore

    Dev->>+CLI: specforge graph analytics traceability-coverage
    CLI->>+Store: executeTemplate("traceability-coverage")
    Store->>Store: Run graph algorithm (BEH-SF-003)
    Store-->>-CLI: AnalyticsResult{coverage: 87%, gaps: [...]}
    CLI-->>-Dev: Coverage report table (BEH-SF-113)
```

## Steps

1. Open the Graph Explorer in the desktop app
2. Run an analytical query: `specforge graph analytics traceability-coverage`
3. System executes the predefined query template against Neo4j (BEH-SF-001)
4. Results are computed with graph algorithms (BEH-SF-003)
5. CLI formats output as table, summary statistics, or exportable report (BEH-SF-113)
6. Developer uses results to identify gaps or prioritize work

## Traceability

| Behavior   | Feature     | Role in this capability                         |
| ---------- | ----------- | ----------------------------------------------- |
| BEH-SF-001 | FEAT-SF-001 | Graph store query execution                     |
| BEH-SF-003 | FEAT-SF-001 | Analytical query templates and graph algorithms |
| BEH-SF-113 | FEAT-SF-009 | CLI command and formatted output                |
