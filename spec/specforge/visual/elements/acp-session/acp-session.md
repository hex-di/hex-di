# ACP Session Elements

**IDs:** ELM-057 through ELM-062
**Context:** ACP session view (PG-007-acp-session), displayed inside CMP-016-message-entry-list and the session filter bar.

---

## ASCII Mockup -- Message Card Anatomy

```
 ┌─────────────────────────────────────────────────────────────────┐
 │▐                                                                │
 │▐  [REVIEWER]  (magnifier)              14:32:05          (1)   │
 │▐   ▲ ELM-058   ▲ ELM-060              ▲ timestamp              │
 │▐                                                                │
 │▐  Missing traceability link between BEH-SF-045 and     (2)    │
 │▐  the implementation in graph/query.ts. No test                 │
 │▐  covers the error path for invalid Cypher.                     │
 │▐                                                                │
 │▐  [discovery]                                           (3)    │
 │▐   ▲ ELM-061 phase tag                                         │
 │▐                                                                │
 └─────────────────────────────────────────────────────────────────┘
 ▲ 3px left border = ELM-059 severity indicator
```

## ASCII Mockup -- Severity Border Colors

```
 Critical          Major             Minor             Observation
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │▌ #FF3B3B │     │▌ #FF8C00 │     │▌ #FFD600 │     │▌ #4FC3F7 │
 │▌  red    │     │▌ orange  │     │▌ yellow  │     │▌  blue   │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

## ASCII Mockup -- Agent Role Badge Colors

```
 ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │ DISCOVERY    │ │ SPEC-AUTHOR  │ │ REVIEWER     │ │ FEEDBACK     │
 │  #6366F1     │ │  #8B5CF6     │ │  #EC4899     │ │  #F97316     │
 └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
 ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │ TASK-DECOMP  │ │ DEV-AGENT    │ │ CODEBASE     │ │ COVERAGE     │
 │  #14B8A6     │ │  #3B82F6     │ │  #10B981     │ │  #F59E0B     │
 └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
   10px uppercase, white text on colored bg, 4px radius
```

## ASCII Mockup -- Message Type Icons

```
 Finding:        (magnifier)   -- review finding or issue
 Clarification:  (question)    -- clarification request or response
 Broadcast:      (megaphone)   -- broadcast announcement to all agents
```

## ASCII Mockup -- Preset Buttons in Filter Bar

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  Filter Bar                                                             │
 │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
 │  │ Open Critical│ │ GxP Issues   │ │ By Agent     │ │ All Findings │  │
 │  │  (active)    │ │  (default)   │ │  (default)   │ │  (default)   │  │
 │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
 │  ▲ ELM-062 preset buttons                                              │
 │  active = accent border + accent text + accent-dim bg                   │
 │  default = border + muted text + transparent bg                         │
 └──────────────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-057 Session Message Card

| State       | Border-Left Color | Background                | Extra             |
| ----------- | ----------------- | ------------------------- | ----------------- |
| Default     | (by severity)     | `--sf-surface`            | --                |
| Hover       | (by severity)     | `rgba(0, 240, 255, 0.03)` | --                |
| Critical    | `#FF3B3B`         | --                        | Red border        |
| Major       | `#FF8C00`         | --                        | Orange border     |
| Minor       | `#FFD600`         | --                        | Yellow border     |
| Observation | `#4FC3F7`         | --                        | Light blue border |

Background and severity are orthogonal states.

### ELM-058 Agent Role Badge

| Role                 | Background | Text Color |
| -------------------- | ---------- | ---------- |
| discovery-agent      | `#6366F1`  | `#FFFFFF`  |
| spec-author          | `#8B5CF6`  | `#FFFFFF`  |
| reviewer             | `#EC4899`  | `#FFFFFF`  |
| feedback-synthesizer | `#F97316`  | `#FFFFFF`  |
| task-decomposer      | `#14B8A6`  | `#FFFFFF`  |
| dev-agent            | `#3B82F6`  | `#FFFFFF`  |
| codebase-analyzer    | `#10B981`  | `#FFFFFF`  |
| coverage-agent       | `#F59E0B`  | `#FFFFFF`  |

10px uppercase text, 600 weight, 4px border-radius.

### ELM-059 Severity Indicator

Implemented as the 3px left border on the message card. Color maps directly to severity level.

### ELM-060 Message Type Icon

- 14px icon glyph, muted color.
- Three types: magnifier (finding), question (clarification), megaphone (broadcast).

### ELM-061 Phase Tag

- 10px text on `--sf-surface-elevated` background.
- 4px border-radius.

### ELM-062 Preset Button

| State   | Text Color        | Background                | Border Color      |
| ------- | ----------------- | ------------------------- | ----------------- |
| Default | `--sf-text-muted` | `transparent`             | `--sf-border`     |
| Hover   | `--sf-text`       | `rgba(0, 240, 255, 0.05)` | `--sf-text-muted` |
| Active  | `--sf-accent`     | `--sf-accent-dim`         | `--sf-accent`     |

## Token Usage

| Token                   | Usage                                 |
| ----------------------- | ------------------------------------- |
| `--sf-surface`          | Card background                       |
| `--sf-surface-elevated` | Phase tag background                  |
| `--sf-text`             | Message content, hover button text    |
| `--sf-text-muted`       | Timestamp, icons, default button text |
| `--sf-accent`           | Active preset button                  |
| `--sf-accent-dim`       | Active preset background              |
| `--sf-border`           | Preset button default border          |

## Cross-References

- **Action:** ACT-016-set-filter (preset button click)
- **Component:** CMP-016-message-entry-list (parent list container)
- **Store:** STR-009-acp-session-store (message data source)
- **Store:** STR-001-filter-store (session filter state including presets)
- **Page:** PG-007-acp-session (parent page)
