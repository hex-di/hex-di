# Filter Elements

**IDs:** ELM-014 through ELM-021
**Context:** Reusable filter controls used across Home, Chat, and other views with filterable data.

---

## ASCII Mockup

```
 Filter Bar (horizontal arrangement)
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  ELM-015      ELM-014            ELM-015      ELM-016           │
 │  "Status"     ┌──────────┐       "Tags"       ┌──────────────┐ │
 │  11px muted   │ Running v│       11px muted   │ Tags (3)   v │ │
 │               └──────────┘                     └──────┬───────┘ │
 │                                                       │         │
 │  ELM-018                    ELM-019                   │         │
 │  [x] Show archived         ┌────────────┐             │         │
 │                             │ Search...  │             │         │
 │                             └────────────┘             │         │
 │                                                       │         │
 │  Active Filters:                                      │         │
 │  ┌──────────────┐ ┌──────────────┐               ┌───▼───────┐ │
 │  │ELM-020       │ │ELM-020       │               │ ELM-017   │ │
 │  │ running [x]  │ │ frontend [x] │               │ [x] tag-a │ │
 │  │ELM-021 ──^   │ │ELM-021 ──^   │               │ [ ] tag-b │ │
 │  └──────────────┘ └──────────────┘               │ [x] tag-c │ │
 │                                                   └───────────┘ │
 └──────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-014 Filter Dropdown

| State    | Border                    | Background |
| -------- | ------------------------- | ---------- |
| Default  | `rgba(0, 240, 255, 0.15)` | `--sf-bg`  |
| Focus    | `--sf-accent` solid       | `--sf-bg`  |
| Disabled | Inherited                 | Inherited  |

- Single-select dropdown, 12px text.
- Change triggers ACT-016-set-filter.

### ELM-015 Filter Dropdown Label

- 11px muted label positioned above the dropdown.
- Describes the filter purpose (e.g., "Status", "Tags", "Phase").

### ELM-016 Filter Multi-Select Trigger

- Button that opens a multi-select popup.
- Shows selected count in a small accent pill badge.
- Open state: accent border. Hover: subtle accent background.

### ELM-017 Filter Multi-Select Option

- Checkbox + label row inside the multi-select dropdown.
- 12px text, hover shows 5% accent background.
- Change triggers ACT-016-set-filter.

### ELM-018 Filter Toggle

- Standalone checkbox + label pair.
- Checkbox uses `accent-color: --sf-accent`.
- Unchecked label is muted; checked label is full text color.
- Change triggers ACT-017-toggle-filter.

### ELM-019 Filter Text Input

- Free-text filter input, 12px, 120px minimum width.
- Debounced at 300ms before dispatching ACT-016-set-filter.
- Focus state: accent border.

### ELM-020 Filter Chip

- Active filter tag displayed in a chip strip.
- `--sf-accent-dim` background, `--sf-accent` text, 11px, rounded pill.
- Contains a remove button (ELM-021).

### ELM-021 Filter Chip Remove

- Small "X" button inside the chip.
- `opacity: 0.7` default, `1` on hover.
- Click triggers ACT-018-remove-filter.

## Token Usage

| Token             | Usage                                       |
| ----------------- | ------------------------------------------- |
| `--sf-text`       | Dropdown text, option labels, toggle labels |
| `--sf-text-muted` | Labels, placeholders, unchecked toggles     |
| `--sf-accent`     | Focus borders, chip text, checkbox accent   |
| `--sf-accent-dim` | Chip background, count badge background     |
| `--sf-bg`         | Dropdown and input backgrounds              |
| `--sf-font-body`  | All text font family                        |

## Cross-References

- **Action:** ACT-016-set-filter (dropdown/multi-select/text changes)
- **Action:** ACT-017-toggle-filter (toggle checkbox changes)
- **Action:** ACT-018-remove-filter (chip remove button click)
