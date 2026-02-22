# Visual Encoding

_Previous: [Interactions](03-interactions.md) | Next: [Container Hierarchy](05-container-hierarchy.md)_

---

## 6. Visual Encoding

### 6.1 Node Shape by Library Adapter Kind

| Library | Kind            | Shape                                    |
| ------- | --------------- | ---------------------------------------- |
| Store   | state           | Rounded rectangle with state icon (S)    |
| Store   | atom            | Circle                                   |
| Store   | derived         | Diamond                                  |
| Store   | async-derived   | Diamond with dashed outline              |
| Store   | linked-derived  | Diamond with bidirectional arrow         |
| Store   | effect          | Rectangle with lightning bolt            |
| Query   | query           | Rounded rectangle with query icon (Q)    |
| Query   | mutation        | Rounded rectangle with mutation icon (M) |
| Query   | streamed-query  | Rounded rectangle with stream icon (~)   |
| Saga    | saga            | Hexagon                                  |
| Saga    | saga-management | Hexagon with gear icon                   |
| Flow    | flow            | Octagon                                  |
| Flow    | activity        | Octagon with clock icon                  |
| Logger  | all kinds       | Rounded rectangle with log icon          |
| Tracing | all kinds       | Rounded rectangle with trace icon        |
| Core    | generic         | Default rounded rectangle                |

All shapes are rendered as SVG paths. The library badge letter (S, Q, M, etc.) appears in the top-right corner of the node. Shapes scale proportionally with the new 200x72 card dimensions.

### 6.2 Node Fill Color by Lifetime

| Lifetime  | Color Token                | Fill Opacity               | Text Color           |
| --------- | -------------------------- | -------------------------- | -------------------- |
| singleton | `--hex-lifetime-singleton` | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |
| scoped    | `--hex-lifetime-scoped`    | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |
| transient | `--hex-lifetime-transient` | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |

Fill opacity is 0.15 (light theme) or 0.25 (dark theme) for resolved nodes, 0.08 for unresolved nodes. Text on node cards always uses `--hex-text-primary` for WCAG AA compliance. The lifetime is communicated through the subtle background tint and the explicit "singleton" / "scoped" / "transient" label text on line 2 of the card.

### 6.3 Node Border by Origin

| Origin     | Border Style                                      |
| ---------- | ------------------------------------------------- |
| own        | Solid single border, 1px `--hex-border`           |
| inherited  | Dashed border, 2px `--hex-border`                 |
| overridden | Double border (inner + outer), 2px `--hex-accent` |

### 6.4 Node Badges

| Condition            | Badge                             | Position     |
| -------------------- | --------------------------------- | ------------ |
| Factory kind = async | Lightning bolt icon, `--hex-info` | Top-right    |
| Error rate > 10%     | Red warning dot with percentage   | Top-left     |
| Is override          | "OVR" label, `--hex-warning`      | Bottom-right |
| Has finalizer        | Disposal icon, `--hex-text-muted` | Bottom-left  |

### 6.5 Node Opacity by Resolution Status

| Status       | Opacity |
| ------------ | ------- |
| Resolved     | 1.0     |
| Unresolved   | 0.5     |
| Filtered out | 0.15    |

### 6.6 Edge Style by Relationship Type

| Relationship                       | Stroke               | Style                             |
| ---------------------------------- | -------------------- | --------------------------------- |
| Direct dependency                  | `--hex-border`       | Solid, 1.5px, arrow at target     |
| Selected node's dependency         | `--hex-accent`       | Solid, 2px, arrow at target       |
| Transitive dependency (depth 1+)   | `--hex-accent-muted` | Solid, 1px, progressively lighter |
| Dependent edge (reverse direction) | `--hex-info`         | Dotted, 1.5px                     |
| Inherited dependency               | `--hex-text-muted`   | Dashed, 1px                       |

### 6.7 Inheritance Mode Indicators

When viewing a child container, each inherited adapter node displays an inheritance mode badge:

| Mode     | Badge | Color           | Meaning               |
| -------- | ----- | --------------- | --------------------- |
| shared   | "S"   | `--hex-info`    | Live parent reference |
| forked   | "F"   | `--hex-warning` | Snapshot copy         |
| isolated | "I"   | `--hex-error`   | Fresh instance        |

The badge appears as a small rounded label below the node name.

### 6.8 Direction Indicators

| Direction | Indicator                                                    |
| --------- | ------------------------------------------------------------ |
| inbound   | Small right-pointing arrow icon on the left side of the node |
| outbound  | Small left-pointing arrow icon on the right side of the node |

### 6.9 Category Color Mapping

Categories are mapped to a palette of 12 distinguishable colors for left-side color bars on nodes:

| Category        | Color               |
| --------------- | ------------------- |
| persistence     | `#6366f1` (indigo)  |
| messaging       | `#8b5cf6` (violet)  |
| external-api    | `#ec4899` (pink)    |
| logging         | `#14b8a6` (teal)    |
| configuration   | `#f59e0b` (amber)   |
| domain          | `#3b82f6` (blue)    |
| infrastructure  | `#6b7280` (gray)    |
| state           | `#8b5cf6` (violet)  |
| query           | `#06b6d4` (cyan)    |
| saga            | `#f97316` (orange)  |
| flow            | `#10b981` (emerald) |
| (uncategorized) | `--hex-text-muted`  |

The color bar is a 3px vertical stripe on the left edge of the node rectangle. For library adapters, the accent strip (section 6.10) takes priority over the category bar.

### 6.10 Library Accent Colors

Each library has a distinct **accent color** derived from its logo, used as a 4px left color strip on the card. The accent strip replaces the category bar when a library kind is detected:

| Library | Accent Color            | Logo SVG            |
| ------- | ----------------------- | ------------------- |
| Store   | `#059669` (emerald-600) | `logos/store.svg`   |
| Query   | `#0891B2` (cyan-600)    | `logos/query.svg`   |
| Saga    | `#BE123C` (rose-700)    | `logos/saga.svg`    |
| Flow    | `#4338CA` (indigo-700)  | `logos/flow.svg`    |
| Logger  | `#475569` (slate-600)   | `logos/logger.svg`  |
| Tracing | `#D97706` (amber-600)   | `logos/tracing.svg` |
| Core    | `--hex-border`          | `logos/core.svg`    |

The accent strip takes priority over the category bar. Category bar remains for `core/generic` adapters.

**Library logo icon**: A small (16x16) monochrome version of the library logo renders in the top-left corner of the card, inside the accent strip area. The icon uses the library accent color on dark theme and a darkened variant on light theme.

**Library-specific inline metadata** (displayed on line 2 of the card):

| Library/Kind         | Inline Text                              |
| -------------------- | ---------------------------------------- |
| Store/state          | `state`                                  |
| Store/atom           | `atom`                                   |
| Store/derived        | `derived`                                |
| Store/async-derived  | `async-derived`                          |
| Store/linked-derived | `linked`                                 |
| Store/effect         | `effect`                                 |
| Query/query          | `query`                                  |
| Query/mutation       | `mutation`                               |
| Query/streamed-query | `streamed`                               |
| Saga/saga            | `saga`                                   |
| Saga/saga-management | `management`                             |
| Flow/flow            | `flow` (show machine state if available) |
| Flow/activity        | `activity`                               |
| Logger/\*            | `logger`                                 |
| Tracing/\*           | `tracer`                                 |
| Core                 | (no subtitle)                            |

### 6.11 Enhanced Card Anatomy

Node dimensions are **200x72** (wider and taller to fit additional info). This is the standard card layout:

```
+--+--------------------------------------+
|  | PortName                    [badges] |   <- Line 1: port name (13px mono), right-aligned badges
|A | store/state · singleton              |   <- Line 2: library kind + lifetime label (11px, muted)
|  | deps: 3 · dependents: 2             |   <- Line 3: key stats (10px, muted)
+--+--------------------------------------+
 ^--- 4px library accent strip (or category bar for core)
```

- **Line 1**: Port name (truncated at 22 chars with "..."), right-aligned badges area (async, error rate, OVR)
- **Line 2**: Library/kind label + lifetime in muted text, separated by `·`
- **Line 3**: Dependency/dependent counts in muted text
- **Shape**: Maintained per library kind (rounded-rect, circle, diamond, hexagon, octagon) — shapes scale proportionally
- **Fill**: Lifetime color at reduced opacity (0.15 light / 0.25 dark) — text uses `--hex-text-primary` for readability
- **Border**: Thin (1px) library accent color for library adapters, origin-based border for core adapters

The key principle: **fill color is subtle background tint, not the primary visual signal**. Library identity comes from the accent strip + logo icon + shape. Lifetime is communicated via the label text + subtle tint.

---

## 15. Color and Styling

### 15.1 Lifetime Colors (Updated)

| Lifetime  | Fill Token                 | Fill Opacity               | Text Color           |
| --------- | -------------------------- | -------------------------- | -------------------- |
| singleton | `--hex-lifetime-singleton` | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |
| scoped    | `--hex-lifetime-scoped`    | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |
| transient | `--hex-lifetime-transient` | 0.15 (light) / 0.25 (dark) | `--hex-text-primary` |

Text on node cards always uses `--hex-text-primary` for WCAG AA compliance.
The lifetime is communicated through the subtle background tint and the
explicit "singleton" / "scoped" / "transient" label text on line 2.

**Fallback text tokens** (for compact mode if ever added):

- `--hex-lifetime-scoped-text`: Light = `#15803d` (green-700), Dark = `#bbf7d0` (green-200)
- `--hex-lifetime-transient-text`: Light = `#92400e` (amber-800), Dark = `#fef3c7` (amber-100)
- Singleton keeps `--hex-text-inverse` (white on indigo — contrast ratio 4.6:1)

### 15.2 Container Kind Badge Colors

| Kind  | Background      | Text                 |
| ----- | --------------- | -------------------- |
| root  | `--hex-accent`  | `--hex-text-inverse` |
| child | `--hex-info`    | `--hex-text-inverse` |
| lazy  | `--hex-warning` | `--hex-text-inverse` |

### 15.3 Origin Border Styles

| Origin     | Stroke              | Dash Array           |
| ---------- | ------------------- | -------------------- |
| own        | `--hex-border`, 1px | none (solid)         |
| inherited  | `--hex-border`, 2px | `4 2`                |
| overridden | `--hex-accent`, 2px | none (double border) |

### 15.4 Error Rate Colors

| Error Rate | Color                        |
| ---------- | ---------------------------- |
| 0%         | No badge                     |
| 1-10%      | `--hex-warning` badge        |
| 10%+       | `--hex-error` badge, pulsing |

### 15.5 Analysis Gauge Colors

| Score Range | Color           | Label              |
| ----------- | --------------- | ------------------ |
| 0-50        | `--hex-success` | safe               |
| 51-100      | `--hex-warning` | monitor            |
| 101+        | `--hex-error`   | consider-splitting |

### 15.6 Inheritance Mode Badge Colors

| Mode     | Background            | Text            |
| -------- | --------------------- | --------------- |
| shared   | `--hex-info-muted`    | `--hex-info`    |
| forked   | `--hex-warning-muted` | `--hex-warning` |
| isolated | `--hex-error-muted`   | `--hex-error`   |

### 15.7 Graph Background and Controls

- Graph background: `--hex-bg-primary`.
- Grid pattern (optional, when zoomed in): `--hex-border` at 10% opacity, 20px spacing.
- Control buttons: `--hex-bg-secondary` background, `--hex-border` border, `--hex-text-primary` text.
- Active control: `--hex-accent` border.
- Toolbar: `--hex-bg-secondary` background, bottom border `--hex-border`.

### 15.8 Selected Node Highlight

- Selected node: `--hex-accent` stroke, 3px width.
- Multi-selected nodes: `--hex-accent` stroke, 2px width, dashed.
- Hover: `--hex-bg-hover` fill overlay at 20% opacity.
