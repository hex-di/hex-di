# Search Elements

**IDs:** ELM-009 through ELM-013
**Context:** Full-screen search overlay triggered by "/" key or the nav search button.

---

## ASCII Mockup

```
 Full viewport (fixed overlay)
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  ELM-009 Search Backdrop                                        │
 │  rgba(2,4,8,0.8) + blur(4px)                                   │
 │                                                                  │
 │           ┌────────────────────────────────────┐                │
 │           │  ELM-010 Search Input              │                │
 │           │  [ Search specs, tasks, messages.. ]│                │
 │           │  15px, --sf-font-body              │                │
 │           └────────────────────────────────────┘                │
 │                                                                  │
 │           ┌────────────────────────────────────┐                │
 │           │                                    │                │
 │           │  ELM-011  SESSIONS                 │ <-- 10px, UP   │
 │           │  ┌──────────────────────────────┐  │                │
 │           │  │ ELM-012  Session Title       │  │ <-- 13px      │
 │           │  │          session subtitle     │  │ <-- 11px      │
 │           │  └──────────────────────────────┘  │                │
 │           │  ┌──────────────────────────────┐  │                │
 │           │  │ ELM-012  Another Session     │  │                │
 │           │  │          another subtitle     │  │                │
 │           │  └──────────────────────────────┘  │                │
 │           │                                    │                │
 │           │  ELM-011  SPECS                    │                │
 │           │  ┌──────────────────────────────┐  │                │
 │           │  │ ELM-012  Spec Result         │  │                │
 │           │  │          spec/path/file.md    │  │                │
 │           │  └──────────────────────────────┘  │                │
 │           │                                    │                │
 │           │  ELM-013  Press / to search,       │                │
 │           │           Esc to close             │                │
 │           └────────────────────────────────────┘                │
 │                                                                  │
 └──────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-009 Search Backdrop

- Fixed fullscreen overlay covering the entire viewport.
- `background: rgba(2, 4, 8, 0.8)` -- deep dark overlay.
- `backdrop-filter: blur(4px)` -- blurs underlying content.
- Click on backdrop (outside the search panel) triggers ACT-005-close-search.

### ELM-010 Search Input

| State   | Border Color              | Notes                |
| ------- | ------------------------- | -------------------- |
| Default | `rgba(0, 240, 255, 0.15)` | Subtle accent border |
| Focus   | `--sf-accent`             | Full accent border   |

- 15px text, `--sf-font-body`.
- Placeholder: "Search specs, tasks, messages..."
- Input changes are debounced at 300ms before dispatching ACT-004-search-query.
- Auto-focused when the search overlay opens.
- Binds to STR-012 query field.

### ELM-011 Search Category Label

- 10px uppercase muted text.
- Groups results by category: Sessions, Specs, Tasks, Messages, etc.
- Only rendered when that category has results.

### ELM-012 Search Result Item

| State   | Background        | Extra                         |
| ------- | ----------------- | ----------------------------- |
| Default | `transparent`     | --                            |
| Hover   | `--sf-accent-dim` | --                            |
| Focused | `--sf-accent-dim` | 1px accent outline (keyboard) |

- Two-line layout: title (13px, `--sf-text`) + subtitle (11px, `--sf-text-muted`).
- Click or Enter selects the result via ACT-004-search-select-result.
- Arrow keys navigate between results.

### ELM-013 Search Hint Text

- 11px muted hint at the bottom of the search panel.
- Static content: "Press / to search, Esc to close".

## Token Usage

| Token             | Usage                                          |
| ----------------- | ---------------------------------------------- |
| `--sf-text`       | Input text, result titles                      |
| `--sf-text-muted` | Placeholder, category labels, subtitles, hints |
| `--sf-accent`     | Input focus border                             |
| `--sf-accent-dim` | Result hover/focus background                  |
| `--sf-surface`    | Input background                               |
| `--sf-font-body`  | All text font family                           |

## Cross-References

- **Action:** ACT-003-open-search (opens this overlay)
- **Action:** ACT-004-search-query (input change dispatches query)
- **Action:** ACT-004-search-select-result (result selection)
- **Action:** ACT-005-close-search (backdrop click or Esc key)
- **Store:** STR-012 (search query and results)
- **Element:** ELM-004-nav-search-button (triggers overlay open)
