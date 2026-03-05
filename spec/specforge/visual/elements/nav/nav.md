# Nav Elements

**IDs:** ELM-001 through ELM-004
**Context:** Navigation rail on the left edge of the application shell.

---

## ASCII Mockup

```
 Nav Rail (52px wide)
 ┌──────────┐
 │          │
 │  ELM-001 │  <-- Nav Button (default)
 │  ┌────┐  │
 │  │ 20 │  │  <-- ELM-002 Nav Icon (20px glyph)
 │  └────┘  │
 │   9px    │  <-- ELM-003 Nav Label
 │  "Home"  │
 │          │
 ├──────────┤
 │          │
 │  ELM-001 │  <-- Nav Button (active state)
 │  ┌────┐  │
 │▐ │ 20 │  │  <-- Left accent indicator bar (3px)
 │▐ └────┘  │
 │▐  9px    │
 │▐ "Chat"  │
 │          │
 ├──────────┤
 │          │
 │  ELM-001 │  <-- Nav Button (hover state)
 │  ┌────┐  │
 │  │ 20 │  │
 │  └────┘  │
 │   9px    │
 │  "Spec"  │
 │          │
 │  . . .   │
 │          │
 │  (auto)  │  <-- margin-top: auto pushes to bottom
 ├──────────┤
 │          │
 │  ELM-004 │  <-- Nav Search Button
 │  ┌────┐  │
 │  │ /  │  │
 │  └────┘  │
 │          │
 └──────────┘
```

## Visual States

### ELM-001 Nav Button

| State    | Text Color        | Background                | Extra                        |
| -------- | ----------------- | ------------------------- | ---------------------------- |
| Default  | `--sf-text-muted` | `transparent`             | --                           |
| Hover    | `--sf-text`       | `rgba(0, 240, 255, 0.05)` | --                           |
| Active   | `--sf-accent`     | `--sf-accent-dim`         | 3px solid left accent border |
| Disabled | Inherited         | Inherited                 | `opacity: 0.4`               |

### ELM-002 Nav Icon

- 20px Unicode glyph rendered via `font-size: 20px`.
- Color inherits from parent button state -- no independent color transitions.

### ELM-003 Nav Label

- 9px text using `--sf-font-body`.
- Color inherits from parent button state.
- Single line, `white-space: nowrap`.

### ELM-004 Nav Search Button

Same visual states as ELM-001 but pinned to the bottom of the rail via `margin-top: auto`. Displays "/" icon glyph. No active indicator bar (search is an overlay, not a view).

## Token Usage

| Token             | Usage                        |
| ----------------- | ---------------------------- |
| `--sf-text-muted` | Default icon and label color |
| `--sf-text`       | Hover state color            |
| `--sf-accent`     | Active state color           |
| `--sf-accent-dim` | Active background            |
| `--sf-font-body`  | Label font family            |

## Cross-References

- **Action:** ACT-001-navigate-to-view (nav button click)
- **Action:** ACT-003-open-search (search button click)
- **Component:** CMP-001-nav-rail (parent container)
