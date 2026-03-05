# CMP-016: Message Entry List

**ID:** CMP-016-message-entry-list
**Context:** ACP session view (PG-007-acp-session), chronological list of agent messages with filtering and presets.

---

## Overview

The Message Entry List displays a chronologically ordered list of ACP session messages produced by the agent team. Each message card has a left severity border, agent role badge, message type icon, content, phase tag, and timestamp. The component provides preset filter buttons for common queries and supports fine-grained filtering by agent role, message type, severity, and phase.

---

## ASCII Mockup

```
 Message Entry List
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │  Preset Buttons (ELM-062)                                                   │
 │  ┌────────────────┐ ┌──────────┐ ┌─────────────────────────┐ ┌───────────┐  │
 │  │ Open Critical  │ │ GxP Issues│ │ Unresolved Clarifications│ │ Current   │  │
 │  │ (3)            │ │          │ │                         │ │ Phase     │  │
 │  └────────────────┘ └──────────┘ └─────────────────────────┘ └───────────┘  │
 │                                                                              │
 │  Message Cards (ELM-057), gap 8px                                           │
 │  ┌──────────────────────────────────────────────────────────────────────┐    │
 │  │▌ [!] [finding]  [gxp-reviewer]                        [phase: review]│    │
 │  │▌                                                       12:34:56     │    │
 │  │▌ Missing audit trail for data mutation in step 3.                   │    │
 │  │▌ This violates GxP requirement REQ-042.                            │    │
 │  └──────────────────────────────────────────────────────────────────────┘    │
 │  ▲                                                                          │
 │  │ Left border: 3px solid, colored by severity                              │
 │                                                                              │
 │  ┌──────────────────────────────────────────────────────────────────────┐    │
 │  │▌ [i] [broadcast]  [orchestrator]                    [phase: analysis]│    │
 │  │▌                                                       12:33:12     │    │
 │  │▌ Phase transition: analysis -> review.                              │    │
 │  └──────────────────────────────────────────────────────────────────────┘    │
 │                                                                              │
 │  ┌──────────────────────────────────────────────────────────────────────┐    │
 │  │▌ [?] [clarification]  [test-designer]               [phase: review] │    │
 │  │▌                                                       12:31:45     │    │
 │  │▌ Should boundary validation tests cover null inputs or only         │    │
 │  │▌ out-of-range values?                                               │    │
 │  └──────────────────────────────────────────────────────────────────────┘    │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Severity Border Colors

```
 Critical:    ▌ #FF3B3B (red)
 Major:       ▌ #FF8C00 (orange)
 Minor:       ▌ #FFD600 (yellow)
 Observation: ▌ #4FC3F7 (light blue)
```

### Empty State

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                                                                              │
 │                   No messages match current filters.                         │
 │                                                                              │
 └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout

1. **Preset buttons row** -- Horizontal row of ELM-062 preset buttons at the top. Each preset applies a predefined filter combination. The "Open Critical" preset shows a count badge when critical messages exist.
2. **Message card list** -- Vertical stack of ELM-057 message cards with 8px gap. Each card has a 3px left border colored by severity. Messages are ordered chronologically (newest first by default).

---

## Agent Roles (8)

| Role          | Display Name  |
| ------------- | ------------- |
| spec-author   | Spec Author   |
| gxp-reviewer  | GxP Reviewer  |
| test-designer | Test Designer |
| architect     | Architect     |
| validator     | Validator     |
| code-reviewer | Code Reviewer |
| domain-expert | Domain Expert |
| orchestrator  | Orchestrator  |

Each agent role badge (ELM-058) is colored distinctly per role to allow quick visual scanning.

---

## Message Types

| Type          | Icon (ELM-060) | Description                     |
| ------------- | -------------- | ------------------------------- |
| finding       | `!`            | An issue or observation found   |
| clarification | `?`            | A question requiring resolution |
| broadcast     | `i`            | Informational broadcast message |

---

## Severity Levels

| Severity    | Border Color | Text Indicator |
| ----------- | ------------ | -------------- |
| critical    | `#FF3B3B`    | Red emphasis   |
| major       | `#FF8C00`    | Orange         |
| minor       | `#FFD600`    | Yellow         |
| observation | `#4FC3F7`    | Light blue     |

---

## Presets (ELM-062)

| Preset                    | Filters Applied                   |
| ------------------------- | --------------------------------- |
| Open Critical             | `severities: ["critical"]`        |
| GxP Issues                | `agentRole: "gxp-reviewer"`       |
| Unresolved Clarifications | `messageTypes: ["clarification"]` |
| Current Phase             | `phase: {activePhase}` (dynamic)  |

Clicking a preset button applies its filter set to STR-001. Clicking the active preset deactivates it (resets to no preset).

---

## Filtering

| Filter        | Source (STR-001)          | Behavior                                |
| ------------- | ------------------------- | --------------------------------------- |
| Agent Role    | `acpSession.agentRole`    | Show messages from selected agent role  |
| Message Types | `acpSession.messageTypes` | Show only selected message type(s)      |
| Severities    | `acpSession.severities`   | Show only selected severity level(s)    |
| Phase         | `acpSession.phase`        | Show messages from selected phase       |
| Search        | `acpSession.search`       | Full-text search within message content |

---

## Token Usage

| Token             | Usage                                  |
| ----------------- | -------------------------------------- |
| `--sf-surface`    | Card background                        |
| `--sf-text`       | Message content text                   |
| `--sf-text-muted` | Timestamp, empty state, secondary text |
| `--sf-accent`     | Active preset button                   |
| `--sf-accent-dim` | Active preset button background        |

---

## Cross-References

- **Store:** STR-009-acp-session-store (messages, criticalCount)
- **Store:** STR-001-filter-store (session filters)
- **Elements:** ELM-057 through ELM-062
- **Page:** PG-007-acp-session (parent page)
