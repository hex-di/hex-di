# Spec Elements

**IDs:** ELM-046 through ELM-048
**Context:** Spec view displaying rendered markdown content with change indicators.

---

## ASCII Mockup

```
 Spec View (rendered markdown)
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  ELM-048  Section Heading (h1, 24px, --sf-font-display)        │
 │  ═══════════════════════════════════════════                     │
 │                                                                  │
 │  ELM-046  Markdown Section (unchanged)                          │
 │  │  This section has not been modified. It renders              │
 │  │  normally with transparent left border.                      │
 │  │  14px body text, 1.7 line-height.                           │
 │  │                                                              │
 │                                                                  │
 │  ELM-048  Sub-heading (h2, 20px)                               │
 │  ─────────────────────────────                                  │
 │                                                                  │
 │  ELM-046 + ELM-047  Markdown Section (changed)                 │
 │  ▐  This section has been modified. The 3px accent             │
 │  ▐  bar (ELM-047) highlights the left edge. The                │
 │  ▐  background has a subtle accent tint.                       │
 │  ▐                                                              │
 │  ▐  Code blocks and other markdown elements render             │
 │  ▐  inside this container.                                     │
 │                                                                  │
 │  ELM-048  Sub-sub-heading (h3, 16px)                           │
 │  . . . . . . . . . . . . . . .                                 │
 │                                                                  │
 │  ELM-046  Markdown Section (unchanged)                          │
 │  │  Another unchanged section.                                  │
 │  │                                                              │
 │                                                                  │
 └──────────────────────────────────────────────────────────────────┘

 Changed vs Unchanged:

 Unchanged:                    Changed:
 ┌──────────────────────┐     ┌──────────────────────┐
 │  transparent border  │     ▐  accent 3px border   │
 │  no background tint  │     ▐  subtle accent tint  │
 │  normal text         │     ▐  normal text         │
 └──────────────────────┘     └──────────────────────┘
```

## Visual States

### ELM-046 Markdown Section

| State   | Left Border             | Background                |
| ------- | ----------------------- | ------------------------- |
| Default | `3px solid transparent` | `transparent`             |
| Changed | `3px solid --sf-accent` | `rgba(0, 240, 255, 0.02)` |

- Container for rendered markdown content.
- 14px body text, 1.7 line-height for readability.
- Left padding of 16px (consistent whether border is visible or not).
- "Changed" state is applied when the section ID appears in the `changedSections` array.

### ELM-047 Section Change Indicator

- 3px accent bar on the left edge of changed sections.
- Implemented as the visible left border of ELM-046 in its "changed" state.
- Provides a clear visual cue for modified content without disrupting layout.
- Transparent when the section is unchanged (no layout shift).

### ELM-048 Section Heading

| Depth | Font Size | Margin Top |
| ----- | --------- | ---------- |
| h1    | 24px      | 32px       |
| h2    | 20px      | 24px       |
| h3    | 16px      | 16px       |

- Uses `--sf-font-display` font family.
- Font weight 600 for emphasis.
- Line height 1.3 for tight heading spacing.
- Bottom margin 8px before section content.

## Token Usage

| Token               | Usage                           |
| ------------------- | ------------------------------- |
| `--sf-text`         | Heading text, section body text |
| `--sf-accent`       | Change indicator bar            |
| `--sf-font-display` | Section headings                |
| `--sf-font-body`    | Section body text               |

## Cross-References

- **Component:** CMP-spec-viewer (parent container)
- **Store:** STR-006 (spec content and changedSections array)
