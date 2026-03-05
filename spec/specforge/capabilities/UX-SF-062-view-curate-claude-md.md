---
id: UX-SF-062
kind: capability
title: "View and Curate Generated CLAUDE.md"
status: active
features: [FEAT-SF-015]
behaviors: [BEH-SF-177, BEH-SF-178, BEH-SF-113]
persona: [developer]
surface: [desktop, cli]
---

# View and Curate Generated CLAUDE.md

## Use Case

A developer opens the Memory Manager in the desktop app. md` file that captures project knowledge, conventions, and patterns discovered by agent sessions. The system generates this file from session observations, and the developer can accept, reject, or edit individual entries to ensure the accumulated knowledge is accurate. The same operation is accessible via CLI (`specforge memory view`) for scripted/CI workflows.

## Interaction Flow

### Desktop App

```text
┌───────────┐  ┌─────────────────┐  ┌─────────────┐
│ Developer │  │   Desktop App   │  │ MemoryStore │
└─────┬─────┘  └────────┬────────┘  └──────┬──────┘
      │ memory view │           │
      │────────────►│           │
      │           │ getMemory() │
      │           │────────────►│
      │           │  Content{}  │
      │           │◄────────────│
      │  CLAUDE.md│           │
      │◄────────────│           │
      │           │           │
      │ review    │           │
      │────────────►│           │
      │ conventions│           │
      │◄────────────│           │
      │           │           │
      │ accept/   │           │
      │ reject    │           │
      │────────────►│           │
      │           │ curate()   │
      │           │────────────►│
      │           │  Updated   │
      │           │◄────────────│
      │  saved    │           │
      │◄────────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Memory Manager)
    participant Memory as MemoryStore

    Dev->>+DesktopApp: Open Memory Manager
    DesktopApp->>+Memory: getMemoryFile()
    Memory-->>-DesktopApp: MemoryContent{sections, entries}
    DesktopApp-->>-Dev: Display CLAUDE.md with annotations (BEH-SF-113)

    Dev->>+DesktopApp: Review entries
    DesktopApp-->>-Dev: Conventions, patterns, warnings (BEH-SF-177)

    Dev->>+DesktopApp: Accept/reject/edit entries
    DesktopApp->>+Memory: curate(accepted, rejected, edits)
    Memory-->>-DesktopApp: MemoryUpdated (BEH-SF-178)
    DesktopApp-->>-Dev: Changes saved to CLAUDE.md
```

### CLI

```text
┌───────────┐  ┌─────┐  ┌─────────────┐
│ Developer │  │ CLI │  │ MemoryStore │
└─────┬─────┘  └──┬──┘  └──────┬──────┘
      │ memory view │           │
      │────────────►│           │
      │           │ getMemory() │
      │           │────────────►│
      │           │  Content{}  │
      │           │◄────────────│
      │  CLAUDE.md│           │
      │◄────────────│           │
      │           │           │
      │ review    │           │
      │────────────►│           │
      │ conventions│           │
      │◄────────────│           │
      │           │           │
      │ accept/   │           │
      │ reject    │           │
      │────────────►│           │
      │           │ curate()   │
      │           │────────────►│
      │           │  Updated   │
      │           │◄────────────│
      │  saved    │           │
      │◄────────────│           │
      │           │           │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant CLI
    participant Memory as MemoryStore

    Dev->>+CLI: specforge memory view
    CLI->>+Memory: getMemoryFile()
    Memory-->>-CLI: MemoryContent{sections, entries}
    CLI-->>-Dev: Display CLAUDE.md with annotations (BEH-SF-113)

    Dev->>+CLI: Review entries
    CLI-->>-Dev: Conventions, patterns, warnings (BEH-SF-177)

    Dev->>+CLI: Accept/reject/edit entries
    CLI->>+Memory: curate(accepted, rejected, edits)
    Memory-->>-CLI: MemoryUpdated (BEH-SF-178)
    CLI-->>-Dev: Changes saved to CLAUDE.md
```

## Steps

1. Open the Memory Manager in the desktop app
2. System displays the current memory file with section annotations
3. Review individual entries: conventions, patterns, warnings (BEH-SF-177)
4. Accept entries to keep them, reject to remove (BEH-SF-178)
5. Edit entries to refine wording or correct inaccuracies
6. Changes are saved to the CLAUDE.md file
7. Curated knowledge influences future agent sessions

## Traceability

| Behavior   | Feature     | Role in this capability                     |
| ---------- | ----------- | ------------------------------------------- |
| BEH-SF-177 | FEAT-SF-015 | Memory generation from session observations |
| BEH-SF-178 | FEAT-SF-015 | Memory curation and acceptance/rejection    |
| BEH-SF-113 | FEAT-SF-015 | CLI memory management commands              |
