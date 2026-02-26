# Visual Inspiration — Guard × DaVinci

## Base Design System

Inherits from `insperations/design-system.md`:

- Background: `#020408` with 40px cyan grid at 4% opacity
- Typography: Rajdhani (headings), Inter (body), Fira Code (code)
- HUD cards with corner bracket pseudo-elements
- Scanline CRT overlay
- Syntax highlighting: Monokai-inspired token colors

## 5-Phase Color Scheme

| Phase | Name                 | Color                     | Rationale                                            |
| ----- | -------------------- | ------------------------- | ---------------------------------------------------- |
| 1     | THE PROBLEM          | `#FF5E00` (accent/orange) | Draws attention — warning color for pain points      |
| 2     | GUARD PRIMITIVES     | `#00F0FF` (cyan/primary)  | Core library color — trust and technology            |
| 3     | COMPOSITION          | `#A6E22E` (green)         | Growth, composition, building blocks coming together |
| 4     | DAVINCI MIGRATION    | `#FFB020` (amber)         | Transition, careful movement, work in progress       |
| 5     | VISIBILITY & QUALITY | `#F92672` (pink)          | Completion, quality, the "aha" moment                |

## New Components

### ComparisonCard

Split card with red-bordered "Before" panel and cyan-bordered "After" panel.

- Before side: `rgba(255, 60, 60, 0.15)` border, red dot indicator
- After side: `rgba(0, 240, 255, 0.15)` border, cyan dot indicator
- Used for all migration before/after examples (slides 11, 16, 18, 21)

### PermissionMatrix

Full-width table showing subjects × policies with ALLOW/DENY cells.

- Header: uppercase mono, muted color
- ALLOW: hex-green color
- DENY: red-500 at 70% opacity
- Border styling matches HUD card aesthetic

### Section Prefix

Uses `Module_XX` instead of `Protocol_XX` — reflects DaVinci's modular architecture.

## Slide-Specific Design Notes

### Slide 01 (Hero)

- Dual-colored shield SVG: orange outer path (DaVinci/problem) + cyan inner path (Guard/solution)
- Float animation on the shield
- 4 stat badges in a row with accent variant

### Slides 02–04 (Problem Phase)

- All HudCards use `accent` (orange) variant
- Numbered badges use `num-badge-accent` class
- Code blocks show actual DaVinci source with file paths as titles

### Slides 05–09 (Primitives Phase)

- Default HudCard variant (cyan)
- Clean code blocks with Guard API

### Slides 10–14 (Composition Phase)

- HudCards use `green` variant
- PermissionMatrix tables for visual proof
- ComparisonCard for brand scoping before/after

### Slides 15–19 (Migration Phase)

- HudCards use `amber` variant
- ComparisonCards show concrete code changes
- Each migration step numbered

### Slides 20–24 (Quality Phase)

- HudCards use `pink` variant
- Audit log styled as a data table
- Final slide: large cyan-glow tagline
