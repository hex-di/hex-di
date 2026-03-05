# Pipeline Elements

**IDs:** ELM-044 through ELM-045
**Context:** Horizontal pipeline phase strip showing the progression of workflow phases.

---

## ASCII Mockup

```
 Pipeline Phase Strip (horizontal layout)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │  ELM-044       ELM-045    ELM-044       ELM-045    ELM-044              │
 │  ┌─────────┐  ────────   ┌─────────┐  --------   ┌─────────┐           │
 │  │  check  │  solid grn  │ *spin*  │  animated   │ - - - - │           │
 │  │ Discover│  ────────   │  Build  │  --------   │  Test   │           │
 │  └─────────┘             └─────────┘             └─────────┘           │
 │  completed               active                  pending               │
 │  green/solid             accent/glow             muted/dashed          │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘

 Phase Node States:

 Pending:           Active:            Completed:         Failed:
 ┌ - - - - - ┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
 │  O        │     │  *        │     │  check    │     │  X        │
 │  Phase    │     │  Phase    │     │  Phase    │     │  Phase    │
 └ - - - - - ┘     └───────────┘     └───────────┘     └───────────┘
 muted, dashed      accent, glow      green, solid      red, solid
 border             border + shadow    border            border

 Connector States:

 Pending:    - - - - -   (dashed, muted)
 Active:     =========   (solid accent, flowing animation)
 Completed:  =========   (solid green)
 Failed:     =========   (solid red)
```

## Visual States

### ELM-044 Phase Node

| Status    | Color             | Background                | Border                            | Extra                     |
| --------- | ----------------- | ------------------------- | --------------------------------- | ------------------------- |
| Pending   | `--sf-text-muted` | `transparent`             | `1px dashed rgba(0,240,255,0.15)` | Circle outline icon       |
| Active    | `--sf-accent`     | `--sf-accent-dim`         | `1px solid --sf-accent`           | Glow shadow, spinner icon |
| Completed | `#22C55E`         | `rgba(34, 197, 94, 0.08)` | `1px solid rgba(34,197,94,0.3)`   | Check icon                |
| Failed    | `#FF3B3B`         | `rgba(255, 59, 59, 0.08)` | `1px solid rgba(255,59,59,0.3)`   | X-mark icon               |

- Each node displays a status icon (14px) and a phase name label (11px).
- Active nodes have a subtle glow animation (`box-shadow` pulsing).
- Minimum width 80px to prevent label truncation.

### ELM-045 Phase Connector

| Source Status | Color                  | Style                         |
| ------------- | ---------------------- | ----------------------------- |
| Pending       | `rgba(0,240,255,0.15)` | Dashed line                   |
| Active        | `--sf-accent`          | Solid line, flowing animation |
| Completed     | `#22C55E`              | Solid line                    |
| Failed        | `#FF3B3B`              | Solid line                    |

- 2px height, 24px width horizontal connector between adjacent nodes.
- Color and animation are derived from the **left (source)** phase status.
- Active connector has a flowing/streaming animation to indicate progress.

## Token Usage

| Token             | Usage                           |
| ----------------- | ------------------------------- |
| `--sf-accent`     | Active node, active connector   |
| `--sf-accent-dim` | Active node background          |
| `--sf-text-muted` | Pending node, pending connector |
| `--sf-font-body`  | Phase name label                |

## Cross-References

- **Component:** CMP-pipeline-strip (parent container)
- **Store:** STR-003 (pipeline phase states)
