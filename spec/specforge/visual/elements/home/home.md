# Home Elements

**IDs:** ELM-022 through ELM-028
**Context:** Home view session table, status badges, new session form, and row action buttons.

---

## ASCII Mockup

```
 Session Table
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  Package       Spec Path          Status    Mode     Last Activity      │
 │──────────────────────────────────────────────────────────────────────────│
 │                                                                         │
 │  ELM-022 Session Table Row                                              │
 │  ┌──────────────────────────────────────────────────────────────────┐   │
 │  │ @hex-di/core  spec/core/auth  [running]  auto    2m ago   [x]  │   │
 │  │                                ELM-023          ELM-027        │   │
 │  └──────────────────────────────────────────────────────────────────┘   │
 │  ┌──────────────────────────────────────────────────────────────────┐   │
 │  │ @hex-di/flow  spec/flow/fsm   [paused]   manual  1h ago  [>][x]│   │
 │  │                                ELM-023         ELM-028 ELM-027 │   │
 │  └──────────────────────────────────────────────────────────────────┘   │
 │  ┌──────────────────────────────────────────────────────────────────┐   │
 │  │ @hex-di/saga  spec/saga/comp  [completed] auto   3d ago    [x] │   │
 │  └──────────────────────────────────────────────────────────────────┘   │
 │  ┌──────────────────────────────────────────────────────────────────┐   │
 │  │ @hex-di/guard spec/guard/rbac [failed]    auto   5h ago    [x] │   │
 │  └──────────────────────────────────────────────────────────────────┘   │
 │                                                                         │
 └──────────────────────────────────────────────────────────────────────────┘

 New Session Form
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                         │
 │  ELM-024                    ELM-025                    ELM-026          │
 │  ┌────────────────────┐    ┌────────────────────┐    ┌──────────────┐  │
 │  │ Package name       │    │ Spec path          │    │Create Session│  │
 │  └────────────────────┘    └────────────────────┘    └──────────────┘  │
 │                                                       accent bg, dark  │
 │                                                       text, disabled   │
 │                                                       when fields empty│
 └──────────────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-022 Session Table Row

| State   | Background                |
| ------- | ------------------------- |
| Default | `transparent`             |
| Hover   | `rgba(0, 240, 255, 0.03)` |

- Grid layout with columns: package name, spec path, status badge, pipeline mode, last activity, resume button, delete button.
- Click navigates to the session detail via ACT-006-select-session.
- Bottom border: `rgba(0, 240, 255, 0.06)` separator.

### ELM-023 Session Status Badge

| Status    | Text Color        | Background                  |
| --------- | ----------------- | --------------------------- |
| running   | `--sf-accent`     | `--sf-accent-dim`           |
| paused    | `--sf-warning`    | `rgba(255, 140, 0, 0.1)`    |
| completed | `#22C55E`         | `rgba(34, 197, 94, 0.1)`    |
| failed    | `#FF3B3B`         | `rgba(255, 59, 59, 0.1)`    |
| idle      | `--sf-text-muted` | `rgba(255, 255, 255, 0.05)` |

- Pill-shaped badge with rounded corners (10px radius).
- 11px lowercase text.

### ELM-024 New Session Package Input

- Text input for package name. 13px, required validation.
- Focus: accent border. Invalid: error border.

### ELM-025 New Session Spec Input

- Text input for spec file path. 13px, required validation.
- Same visual styling as ELM-024.

### ELM-026 New Session Submit Button

| State    | Background           | Notes                  |
| -------- | -------------------- | ---------------------- |
| Default  | `--sf-accent`        | Dark text on accent bg |
| Hover    | `--sf-accent-bright` | Slightly brighter      |
| Disabled | `--sf-accent` at 0.4 | Fields empty           |

- "Create Session" label, 13px, 600 weight.
- Disabled when either package or spec field is empty.

### ELM-027 Session Delete Button

| State   | Color             | Background               |
| ------- | ----------------- | ------------------------ |
| Default | `--sf-text-muted` | `transparent`            |
| Hover   | `--sf-error`      | `rgba(255, 59, 59, 0.1)` |

- 28x28px icon button with delete/trash icon.
- Requires confirmation dialog before executing ACT-010-delete-session.

### ELM-028 Session Resume Button

| State   | Color         | Background                |
| ------- | ------------- | ------------------------- |
| Default | `--sf-accent` | `--sf-accent-dim`         |
| Hover   | `--sf-accent` | `rgba(0, 240, 255, 0.15)` |

- Only visible when `session.status === 'paused'`.
- 11px text, accent color scheme.

## Token Usage

| Token                | Usage                                     |
| -------------------- | ----------------------------------------- |
| `--sf-text`          | Package name, primary text                |
| `--sf-text-muted`    | Spec path, mode, time, idle badge, delete |
| `--sf-accent`        | Running badge, resume button, submit btn  |
| `--sf-accent-dim`    | Running badge bg, resume button bg        |
| `--sf-accent-bright` | Submit button hover                       |
| `--sf-warning`       | Paused badge                              |
| `--sf-error`         | Failed badge, delete hover                |
| `--sf-bg`            | Input backgrounds                         |
| `--sf-bg-deep`       | Submit button text (dark on accent)       |
| `--sf-font-body`     | All text font family                      |

## Cross-References

- **Action:** ACT-006-select-session (row click)
- **Action:** ACT-008-create-session (submit button)
- **Action:** ACT-009-resume-session (resume button)
- **Action:** ACT-010-delete-session (delete button)
- **Component:** CMP-home-session-table (parent container)
