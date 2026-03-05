# Status Bar Elements

**IDs:** ELM-005 through ELM-008
**Context:** Horizontal status bar at the bottom of the application shell.

---

## ASCII Mockup

```
 Status Bar (full width, bottom of shell)
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  ELM-005   ELM-006              ELM-007          ELM-008        │
 │  ┌──┐                                                           │
 │  │ o│  sess_abc123def4       running            $2.47           │
 │  └──┘                                                           │
 │  6px dot   11px session ID    11px status       11px cost       │
 │                                                                  │
 └──────────────────────────────────────────────────────────────────┘

 State variations:

 Connected + running:
 │  [*]  sess_abc123def4       running            $2.47           │
   green   muted text          accent text        muted text

 Idle (no session):
 │  [o]  none                  idle               $0.00           │
   muted  muted text           muted text         muted text

 Failed:
 │  [*]  sess_abc123def4       failed             $1.83           │
   green  muted text           error text         muted text
```

## Visual States

### ELM-005 Status Dot

| State     | Background        | Meaning               |
| --------- | ----------------- | --------------------- |
| Connected | `--sf-accent`     | Active session exists |
| Idle      | `--sf-text-muted` | No active session     |

6px circle, perfectly round (`border-radius: 50%`). Binds to STR-002 active session presence.

### ELM-006 Session ID Text

- 11px, `--sf-text-muted` color.
- Displays the current session ID, or "none" if no session is active.
- Truncated with ellipsis if the ID exceeds available space.

### ELM-007 Session Status Text

| Status    | Color             |
| --------- | ----------------- |
| idle      | `--sf-text-muted` |
| running   | `--sf-accent`     |
| paused    | `--sf-warning`    |
| completed | `--sf-success`    |
| failed    | `--sf-error`      |

- 11px text, color changes dynamically based on session status.

### ELM-008 Cost Text

- 11px, `--sf-text-muted` color.
- Displays formatted cost string: `$X.XX`.
- Binds to STR-010 cost tracker `summary.totalCost`.

## Token Usage

| Token             | Usage                         |
| ----------------- | ----------------------------- |
| `--sf-accent`     | Connected dot, running status |
| `--sf-text-muted` | Default text color, idle dot  |
| `--sf-warning`    | Paused status                 |
| `--sf-success`    | Completed status              |
| `--sf-error`      | Failed status                 |
| `--sf-font-body`  | All text font family          |

## Cross-References

- **Store:** STR-002 (active session status)
- **Store:** STR-010 (cost tracker summary)
- **Component:** CMP-002-status-bar (parent container)
