_Previous: [09-combinator-matrix.md](09-combinator-matrix.md) | Next: [11-interactions.md](11-interactions.md)_

# 10. Visual Encoding

All colors, shapes, icons, animations, and CSS custom properties used across Result Panel views.

## 10.1 CSS Custom Properties

The Result Panel introduces the following CSS custom properties, extending the existing `--hex-*` design token system:

### Track Colors

| Property                 | Light                   | Dark                    | Usage                                 |
| ------------------------ | ----------------------- | ----------------------- | ------------------------------------- |
| `--hex-result-ok`        | `#059669` (emerald-600) | `#34d399` (emerald-400) | Ok track lines, badges, node borders  |
| `--hex-result-err`       | `#e11d48` (rose-600)    | `#fb7185` (rose-400)    | Err track lines, badges, node borders |
| `--hex-result-ok-muted`  | `#059669` at 15%        | `#34d399` at 20%        | Ok background tint                    |
| `--hex-result-err-muted` | `#e11d48` at 15%        | `#fb7185` at 20%        | Err background tint                   |

### Category Colors

| Property                   | Light               | Dark      | Category                                   |
| -------------------------- | ------------------- | --------- | ------------------------------------------ |
| `--hex-cat-constructor`    | `#6366f1` (indigo)  | `#818cf8` | Entry points: ok, err, fromThrowable, etc. |
| `--hex-cat-transformation` | `#3b82f6` (blue)    | `#60a5fa` | map, mapErr, mapBoth, flatten, flip        |
| `--hex-cat-chaining`       | `#8b5cf6` (violet)  | `#a78bfa` | andThen, andThrough, asyncAndThen          |
| `--hex-cat-recovery`       | `#10b981` (emerald) | `#34d399` | orElse                                     |
| `--hex-cat-observation`    | `#06b6d4` (cyan)    | `#22d3ee` | inspect, inspectErr, andTee, orTee         |
| `--hex-cat-extraction`     | `#f59e0b` (amber)   | `#fbbf24` | match, unwrapOr, expect, etc.              |
| `--hex-cat-conversion`     | `#6b7280` (gray)    | `#9ca3af` | toNullable, toUndefined, toAsync, etc.     |
| `--hex-cat-combinator`     | `#ec4899` (pink)    | `#f472b6` | all, allSettled, any, collect              |
| `--hex-cat-generator`      | `#f97316` (orange)  | `#fb923c` | safeTry                                    |

### Severity Colors

| Property        | Light                   | Dark                    | Usage                             |
| --------------- | ----------------------- | ----------------------- | --------------------------------- |
| `--hex-warning` | `#d97706` (amber-600)   | `#fbbf24` (amber-400)   | p50-p90 durations, trend warnings |
| `--hex-error`   | `#dc2626` (red-600)     | `#f87171` (red-400)     | >p90 durations, error hotspots    |
| `--hex-success` | `#059669` (emerald-600) | `#34d399` (emerald-400) | Stability >95%, recovery success  |

### UI Colors

| Property                   | Light                     | Dark                      | Usage                           |
| -------------------------- | ------------------------- | ------------------------- | ------------------------------- |
| `--hex-result-switch`      | `#d97706` (amber-600)     | `#fbbf24`                 | Switch indicators, ⚡ icon fill |
| `--hex-result-bypassed`    | `--hex-text-muted` at 40% | `--hex-text-muted` at 40% | Bypassed operations             |
| `--hex-result-particle`    | `--hex-accent`            | `--hex-accent`            | Playback particle fill          |
| `--hex-result-timeline-bg` | `#f1f5f9` (slate-100)     | `#1e293b` (slate-800)     | Timeline background             |

## 10.2 Operation Category Icons

Each operation category has a distinctive icon rendered as an inline SVG:

| Category       | Icon                 | Description           |
| -------------- | -------------------- | --------------------- |
| constructor    | `◉` (filled target)  | Cargo placed on track |
| transformation | `⟳` (loop arrow)     | Cargo repainted       |
| chaining       | `⑂` (fork)           | Track can split       |
| recovery       | `↩` (return arrow)   | Err returns to Ok     |
| observation    | `👁` (eye)           | Side window           |
| extraction     | `◼` (filled square)  | Terminal convergence  |
| conversion     | `↗` (diagonal arrow) | Type conversion       |
| combinator     | `⊕` (circled plus)   | Parallel merge        |
| generator      | `⚙` (gear)           | Sequential yield      |

Icons are 14x14px SVG elements, colored with the category's CSS property.

## 10.3 Track Badge Indicators

Inline badges used across all views to indicate the track:

| Badge | Display | Background               | Text               |
| ----- | ------- | ------------------------ | ------------------ |
| Ok    | `● Ok`  | `--hex-result-ok-muted`  | `--hex-result-ok`  |
| Err   | `○ Err` | `--hex-result-err-muted` | `--hex-result-err` |

Badge dimensions: `height: 20px`, `padding: 2px 8px`, `border-radius: 10px`, `font-size: 11px`, `font-weight: 600`.

## 10.4 Switch Indicator

The track-switch indicator used in the Railway Pipeline and Operation Log:

```
⚡ (lightning bolt)
```

- Size: 16x16px
- Fill: `--hex-result-switch` (amber)
- Positioned at the midpoint between Ok and Err tracks at switch points
- On hover: expands to 20x20px with glow effect (`box-shadow: 0 0 8px var(--hex-result-switch)`)

## 10.5 Railway Track Rendering

### Active Track

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| Stroke         | `--hex-result-ok` (Ok) or `--hex-result-err` (Err) |
| Stroke width   | 3px                                                |
| Stroke opacity | 1.0                                                |
| Stroke dash    | none (solid)                                       |

### Inactive Track

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| Stroke         | `--hex-result-ok` (Ok) or `--hex-result-err` (Err) |
| Stroke width   | 1px                                                |
| Stroke opacity | 0.3                                                |
| Stroke dash    | `4 4` (dashed)                                     |

### Track Switch Connector

Diagonal line connecting the two tracks at a switch point:

| Property     | Value                                  |
| ------------ | -------------------------------------- |
| Stroke       | `--hex-result-switch`                  |
| Stroke width | 2px                                    |
| Stroke dash  | none                                   |
| Start        | Center of active track at switch point |
| End          | Center of new track at switch point    |

## 10.6 Operation Node Rendering (Railway Pipeline)

### Node Dimensions

| Property                     | Value                                             |
| ---------------------------- | ------------------------------------------------- |
| Width                        | 120px (min), auto-expand to fit label (max 200px) |
| Height                       | 56px                                              |
| Border radius                | 8px                                               |
| Horizontal gap between nodes | 32px                                              |

### Node Fill

| Condition         | Fill                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| Default           | `--hex-bg-secondary`                                                      |
| Hovered           | `--hex-bg-hover`                                                          |
| Selected          | `--hex-bg-secondary` with `--hex-accent` border (2px)                     |
| Active (playback) | `--hex-bg-secondary` with glow (`box-shadow: 0 0 12px var(--hex-accent)`) |
| Bypassed          | `--hex-bg-secondary` at 30% opacity                                       |
| Error switch      | `--hex-result-err-muted` fill                                             |
| Recovery switch   | `--hex-result-ok-muted` fill                                              |

### Node Border

| Condition    | Border                          |
| ------------ | ------------------------------- |
| Default      | 1px solid `--hex-border`        |
| Selected     | 2px solid `--hex-accent`        |
| Switch point | 2px solid `--hex-result-switch` |
| Terminal     | 2px solid `--hex-text-primary`  |

### Node Text

| Element       | Font       | Size | Weight | Color                                  |
| ------------- | ---------- | ---- | ------ | -------------------------------------- |
| Method name   | monospace  | 12px | 600    | `--hex-text-primary`                   |
| Label         | monospace  | 11px | 400    | `--hex-text-secondary`                 |
| Track flow    | sans-serif | 10px | 400    | `--hex-result-ok` / `--hex-result-err` |
| Duration      | monospace  | 10px | 400    | `--hex-text-muted`                     |
| Category icon | --         | 14px | --     | Category color                         |

## 10.7 Duration Formatting

| Range              | Format      | Example          |
| ------------------ | ----------- | ---------------- |
| < 1 microsecond    | `<1us`      | `<1us`           |
| 1-999 microseconds | `{N}us`     | `42us`           |
| 1-999 milliseconds | `{N.D}ms`   | `1.2ms`, `145ms` |
| 1-59 seconds       | `{N.D}s`    | `2.3s`           |
| 60+ seconds        | `{M}m {S}s` | `1m 23s`         |

## 10.8 Path Tree Rendering (Case Explorer)

### Branch Node

```
┌─── method(label): [Ok/Err] ──────────────────────┐
│  Frequency: NN.N% (NNN runs)  ████████████        │
│  [icon: observed/unobserved]                       │
└───────────────────────────────────────────────────┘
```

| Element                    | Style                                        |
| -------------------------- | -------------------------------------------- |
| Branch line                | 1px solid `--hex-border`                     |
| Ok branch label            | `--hex-result-ok`                            |
| Err branch label           | `--hex-result-err`                           |
| Frequency bar              | Height 4px, filled proportional to frequency |
| Frequency bar (Ok)         | `--hex-result-ok` at 60% opacity             |
| Frequency bar (Err)        | `--hex-result-err` at 60% opacity            |
| Observed icon              | Green checkmark                              |
| Unobserved icon            | Amber ghost `👻`                             |
| Collapsed non-switch badge | `--hex-bg-tertiary` background, count text   |

### Path Classification Icons

| Classification   | Icon                | Color              |
| ---------------- | ------------------- | ------------------ |
| Happy path       | Checkmark in circle | `--hex-result-ok`  |
| Error path       | X in circle         | `--hex-result-err` |
| Recovery path    | Circular arrow      | `--hex-result-ok`  |
| Multi-error path | Warning triangle    | `--hex-warning`    |
| Unobserved       | Ghost               | `--hex-text-muted` |
| Rare path (< 1%) | Magnifying glass    | `--hex-text-muted` |

## 10.9 Sankey Diagram Rendering

### Node Dimensions

| Element            | Value                                |
| ------------------ | ------------------------------------ |
| Column width       | 80px                                 |
| Column gap         | 120px                                |
| Ok node fill       | `--hex-result-ok` at 80% opacity     |
| Err node fill      | `--hex-result-err` at 80% opacity    |
| Node border radius | 4px                                  |
| Min node height    | 24px                                 |
| Node height        | Proportional to count (linear scale) |

### Link Rendering

| Link Type | Fill                                                     | Opacity |
| --------- | -------------------------------------------------------- | ------- |
| Ok → Ok   | `--hex-result-ok`                                        | 0.3     |
| Ok → Err  | Linear gradient: `--hex-result-ok` to `--hex-result-err` | 0.5     |
| Err → Ok  | Linear gradient: `--hex-result-err` to `--hex-result-ok` | 0.5     |
| Err → Err | `--hex-result-err`                                       | 0.3     |

Link widths are proportional to the count they carry (minimum 2px, maximum scales to node height).

Links are rendered as cubic Bezier curves (SVG `<path>` with `C` commands).

### Hovered State

- Hovered node: opacity increases to 1.0, all connected links highlight to 0.7 opacity
- Non-connected links: dim to 0.1 opacity
- Tooltip appears with detail (see Section 7.3)

## 10.10 Waterfall Bar Rendering

| Element             | Value                             |
| ------------------- | --------------------------------- |
| Row height          | 28px                              |
| Row gap             | 4px                               |
| Duration bar height | 20px                              |
| Duration bar radius | 3px                               |
| Wait gap fill       | `--hex-text-muted` at 15% opacity |
| Time axis tick      | 1px solid `--hex-border`          |
| Time axis label     | 10px `--hex-text-muted`           |

### Duration Bar Colors (by percentile)

| Condition   | Color              | Opacity            |
| ----------- | ------------------ | ------------------ |
| Ok, < p50   | `--hex-result-ok`  | 0.8                |
| Ok, p50-p90 | `--hex-warning`    | 0.8                |
| Ok, > p90   | `--hex-result-err` | 0.6                |
| Err         | `--hex-result-err` | 0.8                |
| Recovery    | `--hex-result-ok`  | 0.6, dashed border |

## 10.11 Combinator Matrix Rendering

| Element                  | Value                                               |
| ------------------------ | --------------------------------------------------- |
| Input cell width         | 180px                                               |
| Input cell padding       | 12px                                                |
| Input cell border radius | 8px                                                 |
| Ok input border          | 2px solid `--hex-result-ok`                         |
| Err input border         | 2px solid `--hex-result-err`                        |
| Combinator box width     | 80px                                                |
| Combinator box fill      | `--hex-bg-tertiary`                                 |
| Output box width         | 180px                                               |
| Connector line           | 2px, color matches input badge                      |
| Short-circuit label      | `--hex-result-err`, font-weight: 700, animated dash |

## 10.12 Stability Sparkline

| Element             | Value                     |
| ------------------- | ------------------------- |
| Width               | fills container           |
| Height              | 40px                      |
| Line width          | 2px                       |
| Fill below line     | Same color at 10% opacity |
| Green zone (>= 95%) | `--hex-result-ok`         |
| Amber zone (80-95%) | `--hex-warning`           |
| Red zone (< 80%)    | `--hex-result-err`        |
| Hover dot           | 6px circle at data point  |
| Tooltip on hover    | "NN.N% at HH:MM"          |

## 10.13 Animations

### Particle Flow (Railway Pipeline Playback)

| Property                | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Shape                   | Circle, 8px diameter                               |
| Fill                    | `--hex-result-particle`                            |
| Motion                  | CSS `offset-path` along track SVG path             |
| Pause duration per node | 200ms (configurable: 100-500ms)                    |
| Switch transition       | 150ms ease-in-out between tracks                   |
| Terminal burst          | 12px→0px scale with opacity fade over 300ms        |
| Terminal burst color    | `--hex-result-ok` (Ok) or `--hex-result-err` (Err) |

### Node Hover

| Property  | Value                                               |
| --------- | --------------------------------------------------- |
| Elevation | `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` over 150ms |
| Scale     | none (shadow only)                                  |

### Track Switch

| Property         | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| ⚡ icon pulse    | `scale(1) → scale(1.2) → scale(1)` over 300ms                          |
| Switch connector | draws from start to end over 200ms (SVG `stroke-dashoffset` animation) |

### View Transitions

| Transition                           | Duration | Easing                                  |
| ------------------------------------ | -------- | --------------------------------------- |
| View switch                          | 200ms    | ease-in-out (opacity crossfade)         |
| Panel slide-in (detail, educational) | 250ms    | ease-out (translateX)                   |
| Filter result update                 | 150ms    | ease-in-out (opacity on filtered nodes) |
| Sankey link highlight                | 150ms    | ease-in (opacity)                       |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All animation durations set to 0ms
- Particle flow replaced by step-by-step highlight (instant position change per step)
- Switch connector appears instantly (no draw animation)
- Terminal burst replaced by 2s border highlight
- View transitions become instant opacity swap

## 10.14 Responsive Behavior

Visual encoding adapts at responsive breakpoints (see [Section 14.9](14-integration.md) for full breakpoint table):

| Breakpoint | Visual Adaptation                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| >= 1200px  | Full rendering: all labels, icons, and detail panels                                                                                           |
| 800-1199px | Node labels truncated to 8 chars (from 12). Sankey column gap reduced to 80px. Duration text hidden on Railway nodes (shown on hover only).    |
| 480-799px  | Toolbar icons only. Category icons hidden (method name + track badge only). Sparkline height reduced to 24px. Badge font size reduced to 10px. |

### Zoom-Dependent Detail Levels (Railway Pipeline)

| Zoom Range | Detail Level                                                       |
| ---------- | ------------------------------------------------------------------ |
| >= 1.0     | Full: method name, label, category icon, track flow, duration      |
| 0.5-0.99   | Reduced: method name, track badge only. Label and duration hidden. |
| 0.2-0.49   | Minimal: colored rectangle with track badge dot only. No text.     |

## 10.15 Theming

All visual encoding respects the active theme (light/dark) via CSS custom properties. No hardcoded colors appear in component source. The theme toggle updates `--hex-*` properties on the panel root element, and all child components inherit.

### Dark Mode Adjustments

| Adjustment                                                       | Rationale          |
| ---------------------------------------------------------------- | ------------------ |
| Track line opacity increased from 0.3 to 0.4 on dark backgrounds | Better visibility  |
| Sankey link opacity increased by 0.1 across all types            | Better visibility  |
| Node shadow changed to `rgba(0,0,0,0.4)`                         | Higher contrast    |
| Duration bar opacity increased by 0.1                            | Better readability |

_Previous: [09-combinator-matrix.md](09-combinator-matrix.md) | Next: [11-interactions.md](11-interactions.md)_
