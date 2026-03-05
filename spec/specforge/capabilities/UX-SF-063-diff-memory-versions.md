---
id: UX-SF-063
kind: capability
title: "Diff Memory Versions"
status: active
features: [FEAT-SF-015, FEAT-SF-009]
behaviors: [BEH-SF-177, BEH-SF-179, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# Diff Memory Versions

## Use Case

A developer opens the Memory Manager in the desktop app. This helps track knowledge drift and ensures important conventions aren't accidentally lost. The same operation is accessible via CLI (`specforge memory versions`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐  ┌─────────────────┐  ┌─────────────┐
│ Developer │  │   Desktop App   │  │ MemoryStore │
└─────┬─────┘  └────────┬────────┘  └──────┬──────┘
      │ memory    │           │
      │ versions  │           │
      │───────────►│           │
      │           │listVersions│
      │           │───────────►│
      │           │ [v1..v5]  │
      │           │◄───────────│
      │ version   │           │
      │ list      │           │
      │◄───────────│           │
      │           │           │
      │ memory    │           │
      │ diff v3 v5│           │
      │───────────►│           │
      │           │getVer(v3) │
      │           │───────────►│
      │           │Content{v3}│
      │           │◄───────────│
      │           │getVer(v5) │
      │           │───────────►│
      │           │Content{v5}│
      │           │◄───────────│
      │           │           │
      │           │┌─────────┐│
      │           ││ Compute ││
      │           ││  diff   ││
      │           │└─────────┘│
      │  added,   │           │
      │  removed, │           │
      │  changed  │           │
      │◄───────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Memory Manager)
    participant Memory as MemoryStore

    Dev->>+DesktopApp: Open Memory Manager
    DesktopApp->>+Memory: listVersions()
    Memory-->>-DesktopApp: Versions[v1, v2, ..., v5]
    DesktopApp-->>-Dev: Display version list (BEH-SF-113)

    Dev->>+DesktopApp: Open Memory Manager → Select version
    DesktopApp->>+Memory: getVersion(v3)
    Memory-->>DesktopApp: VersionContent{v3}
    DesktopApp->>Memory: getVersion(v5)
    Memory-->>-DesktopApp: VersionContent{v5}
    DesktopApp->>DesktopApp: Compute diff (BEH-SF-179)
    DesktopApp-->>-Dev: Show added, removed, changed entries (BEH-SF-177)
```

### CLI

```text
┌───────────┐  ┌─────┐  ┌─────────────┐
│ Developer │  │ CLI │  │ MemoryStore │
└─────┬─────┘  └──┬──┘  └──────┬──────┘
      │ memory    │           │
      │ versions  │           │
      │───────────►│           │
      │           │listVersions│
      │           │───────────►│
      │           │ [v1..v5]  │
      │           │◄───────────│
      │ version   │           │
      │ list      │           │
      │◄───────────│           │
      │           │           │
      │ memory    │           │
      │ diff v3 v5│           │
      │───────────►│           │
      │           │getVer(v3) │
      │           │───────────►│
      │           │Content{v3}│
      │           │◄───────────│
      │           │getVer(v5) │
      │           │───────────►│
      │           │Content{v5}│
      │           │◄───────────│
      │           │           │
      │           │┌─────────┐│
      │           ││ Compute ││
      │           ││  diff   ││
      │           │└─────────┘│
      │  added,   │           │
      │  removed, │           │
      │  changed  │           │
      │◄───────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Memory as MemoryStore

    Dev->>+CLI: specforge memory versions
    CLI->>+Memory: listVersions()
    Memory-->>-CLI: Versions[v1, v2, ..., v5]
    CLI-->>-Dev: Display version list (BEH-SF-113)

    Dev->>+CLI: specforge memory diff v3 v5
    CLI->>+Memory: getVersion(v3)
    Memory-->>CLI: VersionContent{v3}
    CLI->>Memory: getVersion(v5)
    Memory-->>-CLI: VersionContent{v5}
    CLI->>CLI: Compute diff (BEH-SF-179)
    CLI-->>-Dev: Show added, removed, changed entries (BEH-SF-177)
```

## Steps

1. Open the Memory Manager in the desktop app
2. Diff two versions: `specforge memory diff v3 v5`
3. System retrieves both versions and computes the diff (BEH-SF-179)
4. Display shows added, removed, and changed entries (BEH-SF-177)
5. Developer can restore specific entries from older versions
6. History helps understand how project understanding evolved
7. Optionally pin entries to prevent future auto-removal

## Traceability

| Behavior   | Feature     | Role in this capability          |
| ---------- | ----------- | -------------------------------- |
| BEH-SF-177 | FEAT-SF-015 | Memory generation and versioning |
| BEH-SF-179 | FEAT-SF-015 | Memory version comparison        |
| BEH-SF-113 | FEAT-SF-009 | CLI diff display                 |
