# PG-007 ACP Session

**ID:** PG-007-acp-session
**Route:** `#acp-session`
**Layout:** single-column
**Context:** Real-time feed of agent messages, findings, and clarifications from the ACP session.

---

## Overview

The ACP Session page displays a chronological, filterable feed of all messages posted by agents to the message exchange. Each message card is decorated with a severity-colored left border and an agent role badge in the corresponding agent hue. The page includes a comprehensive filter bar at the top with preset buttons for quick filtering, followed by a scrollable list of message entry cards.

---

## ASCII Wireframe

```
 ACP Session Page (single-column, full content width)
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  Filter Bar (CMP-004)                                                            │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │                                                                              ││
 │  │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ ││
 │  │  │ Agent Role   │  │ Message Types    │  │ Severities       │  │ Phase     │ ││
 │  │  │  [dropdown]  │  │  [multi-select]  │  │  [multi-select]  │  │ [dropdown]│ ││
 │  │  └─────────────┘  └──────────────────┘  └──────────────────┘  └───────────┘ ││
 │  │                                                                              ││
 │  │  ┌──────────────────────────────────────────────┐                            ││
 │  │  │  Search messages...                     [x]  │                            ││
 │  │  └──────────────────────────────────────────────┘                            ││
 │  │                                                                              ││
 │  │  Presets:                                                                    ││
 │  │  ┌───────────────┐ ┌────────────┐ ┌──────────────────────────┐ ┌───────────┐││
 │  │  │ Open Critical │ │ GxP Issues │ │ Unresolved Clarifications│ │ Cur Phase │││
 │  │  └───────────────┘ └────────────┘ └──────────────────────────┘ └───────────┘││
 │  │                                                                              ││
 │  │  Active filters: [critical x] [finding x]                [Clear All]        ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │  Message Entry List (CMP-016, scrollable)                                        │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │                                                                              ││
 │  │  ┌─ CRITICAL ──────────────────────────────────────────────────────────────┐ ││
 │  │  │ #FF3B3B                                                                 │ ││
 │  │  │ ┌──────────────┐                                                        │ ││
 │  │  │ │ gxp-reviewer │  12:34:05 PM  |  Phase: spec-authoring  |  finding     │ ││
 │  │  │ └──────────────┘                                                        │ ││
 │  │  │                                                                          │ ││
 │  │  │ Missing traceability matrix for requirement REQ-042. GxP audit trail    │ ││
 │  │  │ requires bidirectional links between requirements and test cases.        │ ││
 │  │  │                                                                          │ ││
 │  │  └─────────────────────────────────────────────────────────────────────────┘ ││
 │  │    8px gap                                                                   ││
 │  │  ┌─ MAJOR ────────────────────────────────────────────────────────────────┐  ││
 │  │  │ #FF8C00                                                                │  ││
 │  │  │ ┌──────────────┐                                                       │  ││
 │  │  │ │  architect   │  12:32:18 PM  |  Phase: planning  |  finding          │  ││
 │  │  │ └──────────────┘                                                       │  ││
 │  │  │                                                                         │  ││
 │  │  │ Circular dependency detected between AuthService and SessionManager.   │  ││
 │  │  │ Recommend introducing a mediator pattern to decouple.                  │  ││
 │  │  │                                                                         │  ││
 │  │  └────────────────────────────────────────────────────────────────────────┘  ││
 │  │    8px gap                                                                   ││
 │  │  ┌─ MINOR ────────────────────────────────────────────────────────────────┐  ││
 │  │  │ #FFD600                                                                │  ││
 │  │  │ ┌──────────────┐                                                       │  ││
 │  │  │ │ test-designer│  12:30:45 PM  |  Phase: review  |  clarification      │  ││
 │  │  │ └──────────────┘                                                       │  ││
 │  │  │                                                                         │  ││
 │  │  │ Should edge case for empty input arrays be covered in unit tests or    │  ││
 │  │  │ integration tests? Requesting guidance from spec-author.               │  ││
 │  │  │                                                                         │  ││
 │  │  └────────────────────────────────────────────────────────────────────────┘  ││
 │  │    8px gap                                                                   ││
 │  │  ┌─ OBSERVATION ──────────────────────────────────────────────────────────┐  ││
 │  │  │ #4FC3F7                                                                │  ││
 │  │  │ ┌──────────────┐                                                       │  ││
 │  │  │ │ orchestrator │  12:28:00 PM  |  Phase: discovery  |  broadcast       │  ││
 │  │  │ └──────────────┘                                                       │  ││
 │  │  │                                                                         │  ││
 │  │  │ Pipeline entering planning phase. All agents notified.                 │  ││
 │  │  │                                                                         │  ││
 │  │  └────────────────────────────────────────────────────────────────────────┘  ││
 │  │                                                                              ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Message Card Detail

```
 Message Card (severity = critical)
 ┌────────────────────────────────────────────────────────────────────┐
 │                                                                    │
 │  4px left      ┌─────────────────┐                                │
 │  border        │  agent-role      │  timestamp  |  phase  |  type │
 │  #FF3B3B       │  badge (#AB47BC) │                               │
 │  (severity     └─────────────────┘                                │
 │   color)                                                          │
 │                 Message body text. Inter 14px, --sf-text color.   │
 │                 Wraps within the card. Multi-line supported.      │
 │                                                                    │
 └────────────────────────────────────────────────────────────────────┘

 Left border: 4px solid <severity-color>
 Card bg:     --sf-surface
 Agent badge: <agent-role-color> text, <agent-role-color> at 12% opacity bg
 Timestamp:   --sf-text-muted, mono font, 11px
 Phase:       --sf-text-muted, 12px
 Type:        --sf-text-muted, 12px, italic
 Body:        --sf-text, Inter 14px, line-height 1.5
```

### No-Session State

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │                                                                                  │
 │                    Select a session to view session messages.                  │
 │                                                                                  │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Empty State (session active, no messages)

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                  │
 │  Filter Bar (CMP-004) -- filters disabled / greyed out                           │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐│
 │  │  [Agent Role v] [Message Types v] [Severities v] [Phase v] [Search...]      ││
 │  └──────────────────────────────────────────────────────────────────────────────┘│
 │                                                                                  │
 │                                                                                  │
 │                                                                                  │
 │                  No messages yet. Waiting for agent activity.                     │
 │                                                                                  │
 │                                                                                  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component          | Ref                        | Role                                         |
| ------------------ | -------------------------- | -------------------------------------------- |
| Filter Bar         | CMP-004-filter-bar         | Top-level filter controls and preset buttons |
| Message Entry List | CMP-016-message-entry-list | Scrollable list of message cards             |

---

## States

| State      | Condition                                       | Behavior                                                                                     |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| no-session | `STR-002.sessionId === null`                    | Center message: "Select a session to view session messages." Filters hidden.                 |
| empty      | Session active, `STR-009.messages.length === 0` | Filter bar visible but muted. Center message: "No messages yet. Waiting for agent activity." |
| loading    | Messages are being fetched                      | Skeleton shimmer cards (3 placeholders). Filter bar disabled.                                |
| populated  | `STR-009.messages.length > 0`                   | Filter bar active. Message cards rendered with severity borders.                             |

---

## Agent Role Colors (8 Distinct Hues)

| Agent Role    | Color     | Usage                            |
| ------------- | --------- | -------------------------------- |
| spec-author   | `#4FC3F7` | Badge text and background at 12% |
| gxp-reviewer  | `#AB47BC` | Badge text and background at 12% |
| test-designer | `#66BB6A` | Badge text and background at 12% |
| architect     | `#FF7043` | Badge text and background at 12% |
| validator     | `#FFCA28` | Badge text and background at 12% |
| code-reviewer | `#26C6DA` | Badge text and background at 12% |
| domain-expert | `#EC407A` | Badge text and background at 12% |
| orchestrator  | `#78909C` | Badge text and background at 12% |

---

## Severity Colors

| Severity    | Color     | Usage                       |
| ----------- | --------- | --------------------------- |
| critical    | `#FF3B3B` | Left border, severity label |
| major       | `#FF8C00` | Left border, severity label |
| minor       | `#FFD600` | Left border, severity label |
| observation | `#4FC3F7` | Left border, severity label |

---

## Filter Presets

| Preset                    | Applied Filters                                     |
| ------------------------- | --------------------------------------------------- |
| Open Critical             | `severities: [critical]`, `messageTypes: [finding]` |
| GxP Issues                | `agentRole: gxp-reviewer`                           |
| Unresolved Clarifications | `messageTypes: [clarification]`                     |
| Current Phase             | `phase: <current pipeline phase>`                   |

Clicking a preset replaces the current filter state with the preset's values. Clicking the same preset again resets filters to defaults.

---

## Design Token Usage

| Token             | Usage                                           |
| ----------------- | ----------------------------------------------- |
| `--sf-surface`    | Message card background, page background        |
| `--sf-bg`         | Filter bar background                           |
| `--sf-text`       | Message body text                               |
| `--sf-text-muted` | Timestamp, phase label, type label, empty state |
| `--sf-accent`     | Active filter chips, preset button active state |
| `--sf-accent-dim` | Active filter chip background                   |
| `--sf-border`     | Card border (non-severity edges)                |
| `--sf-font-body`  | Message body (Inter)                            |
| `--sf-font-mono`  | Timestamp display (JetBrains Mono)              |

---

## Interaction Notes

1. **Real-time updates**: New messages appear at the top of the list with a brief slide-in animation (200ms ease-out).
2. **Preset toggling**: Clicking an active preset deactivates it and resets filters to defaults.
3. **Filter persistence**: Filter state is maintained in STR-001 under `acpSession.*` and persists across view switches within the same session.
4. **Scroll behavior**: The message list scrolls independently. When a new message arrives while the user is scrolled to top, the new card is prepended. If scrolled down, a "New messages" indicator appears at the top.
5. **Agent badge click**: Clicking an agent role badge in a message card sets the `agentRole` filter to that agent, providing quick drill-down.
6. **Severity border**: The 4px left border on each card is the only colored edge; other borders use `--sf-border`.

---

## Cross-References

- **Components:** CMP-004-filter-bar, CMP-016-message-entry-list
- **Stores:** STR-009-acp-session-store, STR-001-filter-store, STR-002-active-session-store
- **Shell:** PG-010-app-shell (parent layout)
- **Nav:** CMP-001-nav-rail view="acp-session"
