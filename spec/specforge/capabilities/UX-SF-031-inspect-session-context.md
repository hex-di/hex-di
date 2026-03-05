---
id: UX-SF-031
kind: capability
title: "Inspect Session Context and Composed Chunks"
status: active
features: [FEAT-SF-002, FEAT-SF-035]
behaviors: [BEH-SF-009, BEH-SF-010, BEH-SF-133]
persona: [developer]
surface: [desktop, dashboard]
---

# Inspect Session Context and Composed Chunks

## Use Case

A developer opens the Session Inspector in the desktop app to understand what context was assembled for an agent session. This helps diagnose issues where an agent missed relevant context or received too much noise.

## Interaction Flow

```text
┌───────────┐  ┌───────────┐  ┌──────────────┐
│ Developer │  │ Desktop App │  │ SessionStore │
└─────┬─────┘  └─────┬─────┘  └──────┬───────┘
      │               │               │
      │ Open session  │               │
      │──────────────►│               │
      │               │ getSession    │
      │               │  Context()    │
      │               │──────────────►│
      │               │ Context       │
      │               │  Composition  │
      │               │◄──────────────│
      │ Context tab   │               │
      │◄──────────────│               │
      │               │               │
      │ View ranked   │               │
      │  chunk list   │               │
      │──────────────►│               │
      │ Chunks sorted │               │
      │  by relevance │               │
      │◄──────────────│               │
      │               │               │
      │ Inspect chunk │               │
      │──────────────►│               │
      │ Chunk content │               │
      │  & metadata   │               │
      │◄──────────────│               │
      │               │               │
      │ View excluded │               │
      │──────────────►│               │
      │ Excluded with │               │
      │  reasons      │               │
      │◄──────────────│               │
      │               │               │
```

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant DesktopApp as Desktop App (Session Inspector)
    participant Sessions as SessionStore

    Dev->>+DesktopApp: Open session detail view
    DesktopApp->>+Sessions: getSessionContext(sessionId)
    Sessions-->>-DesktopApp: ContextComposition{chunks, budget}
    DesktopApp-->>-Dev: Context tab with composition breakdown (BEH-SF-133)

    Dev->>+DesktopApp: View ranked chunk list
    DesktopApp-->>-Dev: Chunks sorted by relevance score (BEH-SF-009)

    Dev->>+DesktopApp: Inspect individual chunk
    DesktopApp-->>-Dev: Chunk content, metadata, inclusion reason (BEH-SF-010)

    Dev->>+DesktopApp: View excluded chunks
    DesktopApp-->>-Dev: Excluded chunks with reasons (budget, low relevance)
```

## Steps

1. Open the Session Inspector in the desktop app
2. Select the "Context" tab to see the composition breakdown (BEH-SF-133)
3. View the ranked list of chunks that were considered (BEH-SF-009)
4. See which chunks were included vs. excluded and why (budget, relevance score)
5. Inspect individual chunk content and metadata (BEH-SF-010)
6. Compare the composed context against the session's actual output
7. Identify context gaps that may have affected agent behavior

## Traceability

| Behavior   | Feature     | Role in this capability                   |
| ---------- | ----------- | ----------------------------------------- |
| BEH-SF-009 | FEAT-SF-002 | Session chunk materialization and ranking |
| BEH-SF-010 | FEAT-SF-002 | Chunk embedding and composition pipeline  |
| BEH-SF-133 | FEAT-SF-035 | Dashboard context inspection view         |
