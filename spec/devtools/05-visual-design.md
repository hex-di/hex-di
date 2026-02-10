# 13-15. Visual Design System, Wireframes, and Interaction Patterns

> Previous: [04-data-layer.md](./04-data-layer.md) | Next: [06-api-reference.md](./06-api-reference.md)

---

## 13. Visual Design System

The devtools panel adopts a professional, information-dense aesthetic inspired by Chrome DevTools, React DevTools, and TanStack Query DevTools. It prioritizes readability, scan-ability, and visual hierarchy over decoration. Both light and dark themes are first-class citizens.

### 13.1 Design Tokens

All visual values are expressed as CSS custom properties (variables) scoped under `[data-hex-devtools]`. No hardcoded values appear in component styles. Theming is achieved by swapping the variable set on the root `[data-hex-devtools]` element.

#### 13.1.1 Color Palette

The palette uses a neutral blue-grey base with a vibrant indigo accent. Semantic colors (success, warning, error, info) are consistent across themes but shifted in lightness for readability on each background.

| Token                  | Light                   | Dark                     | Usage                                        |
| ---------------------- | ----------------------- | ------------------------ | -------------------------------------------- |
| `--hex-bg-primary`     | `#ffffff`               | `#1e1e2e`                | Panel background, main canvas                |
| `--hex-bg-secondary`   | `#f5f5f7`               | `#2a2a3e`                | Section backgrounds, sidebars, table headers |
| `--hex-bg-tertiary`    | `#ebebf0`               | `#32324a`                | Nested sections, code blocks                 |
| `--hex-bg-hover`       | `#e8e8ec`               | `#363650`                | Row hover, button hover                      |
| `--hex-bg-active`      | `#dcdce4`               | `#45456a`                | Active/selected rows, pressed buttons        |
| `--hex-bg-badge`       | `#f0f0f5`               | `#3a3a54`                | Badge backgrounds, pill containers           |
| `--hex-text-primary`   | `#1a1a2e`               | `#e4e4f0`                | Primary body text, headings                  |
| `--hex-text-secondary` | `#6b6b80`               | `#9b9bb0`                | Labels, column headers, secondary info       |
| `--hex-text-muted`     | `#9b9bb0`               | `#6b6b80`                | Disabled text, timestamps, placeholders      |
| `--hex-text-inverse`   | `#ffffff`               | `#1a1a2e`                | Text on filled buttons, badges               |
| `--hex-border`         | `#e0e0e8`               | `#3a3a50`                | Panel borders, table dividers, separators    |
| `--hex-border-strong`  | `#c8c8d4`               | `#505068`                | Focus rings, active borders                  |
| `--hex-accent`         | `#6366f1`               | `#818cf8`                | Brand color, active tabs, links              |
| `--hex-accent-hover`   | `#5558e6`               | `#9299f9`                | Accent hover state                           |
| `--hex-accent-muted`   | `rgba(99,102,241,0.12)` | `rgba(129,140,248,0.15)` | Accent backgrounds (selected tab bg)         |
| `--hex-success`        | `#22c55e`               | `#4ade80`                | Active scopes, healthy states, resolved      |
| `--hex-success-muted`  | `rgba(34,197,94,0.12)`  | `rgba(74,222,128,0.15)`  | Success badge backgrounds                    |
| `--hex-warning`        | `#f59e0b`               | `#fbbf24`                | Warning indicators, transient lifetime       |
| `--hex-warning-muted`  | `rgba(245,158,11,0.12)` | `rgba(251,191,36,0.15)`  | Warning badge backgrounds                    |
| `--hex-error`          | `#ef4444`               | `#f87171`                | Error states, high error rate, disposed      |
| `--hex-error-muted`    | `rgba(239,68,68,0.12)`  | `rgba(248,113,113,0.15)` | Error badge backgrounds                      |
| `--hex-info`           | `#3b82f6`               | `#60a5fa`                | Informational indicators, cache hits         |
| `--hex-info-muted`     | `rgba(59,130,246,0.12)` | `rgba(96,165,250,0.15)`  | Info badge backgrounds                       |

#### 13.1.2 Lifetime Colors

Lifetime is a core DI concept displayed throughout the interface. Each lifetime has a dedicated color to build instant visual recognition.

| Lifetime    | Color Token                | Light Value        | Dark Value | Visual Rationale                              |
| ----------- | -------------------------- | ------------------ | ---------- | --------------------------------------------- |
| `singleton` | `--hex-lifetime-singleton` | `#6366f1` (indigo) | `#818cf8`  | Stable, long-lived; matches accent/brand      |
| `scoped`    | `--hex-lifetime-scoped`    | `#22c55e` (green)  | `#4ade80`  | Lifecycle-bound, active; matches success      |
| `transient` | `--hex-lifetime-transient` | `#f59e0b` (amber)  | `#fbbf24`  | Ephemeral, created each time; matches warning |

These colors are used consistently in: table row indicators (left border or dot), graph node fills, legend chips, badge pills, and scope tree annotations.

#### 13.1.3 Status Colors

Container and service statuses map to semantic colors for at-a-glance health assessment.

| Status                                | Color                                 | Usage                                             |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `resolved` / `active` / `initialized` | `--hex-success`                       | Service resolved, scope active, container running |
| `unresolved` / `pending`              | `--hex-text-muted`                    | Not yet resolved, awaiting first use              |
| `error` / `high-error-rate`           | `--hex-error`                         | Resolution failures, error rate above threshold   |
| `disposed`                            | `--hex-text-muted` with strikethrough | Cleaned up resources                              |
| `loading` / `initializing`            | `--hex-info`                          | Async adapter initialization in progress          |

#### 13.1.4 Typography

The type scale is compact, optimized for information density. Monospace is the default for identifiers (port names, adapter names, error codes); sans-serif is used for labels and UI chrome.

| Token                        | Value                                                                              | Usage                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `--hex-font-mono`            | `'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace` | Port names, values, code, JSON, error codes |
| `--hex-font-sans`            | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`               | Labels, headers, UI text, buttons           |
| `--hex-font-size-xs`         | `11px` / `0.6875rem`                                                               | Timestamps, event IDs, tertiary metadata    |
| `--hex-font-size-sm`         | `12px` / `0.75rem`                                                                 | Table content, tree node labels, badges     |
| `--hex-font-size-md`         | `13px` / `0.8125rem`                                                               | Primary content text, form inputs           |
| `--hex-font-size-lg`         | `14px` / `0.875rem`                                                                | Section headers, stat card labels           |
| `--hex-font-size-xl`         | `16px` / `1rem`                                                                    | Panel title ("HexDI DevTools")              |
| `--hex-font-weight-normal`   | `400`                                                                              | Body text                                   |
| `--hex-font-weight-medium`   | `500`                                                                              | Labels, column headers                      |
| `--hex-font-weight-semibold` | `600`                                                                              | Section headers, stat values                |
| `--hex-line-height-tight`    | `1.3`                                                                              | Compact rows, badges                        |
| `--hex-line-height-normal`   | `1.5`                                                                              | Body text, descriptions                     |

#### 13.1.5 Spacing

A 4px base unit with deliberate density. The devtools panel is not a marketing page; spacing is tight but never cramped.

| Token             | Value  | Usage                                                                 |
| ----------------- | ------ | --------------------------------------------------------------------- |
| `--hex-space-xxs` | `2px`  | Icon margins, micro adjustments                                       |
| `--hex-space-xs`  | `4px`  | Tight padding (badge padding, inline gaps)                            |
| `--hex-space-sm`  | `8px`  | Component internal padding, row padding, gaps between inline elements |
| `--hex-space-md`  | `12px` | Section internal gaps, card padding                                   |
| `--hex-space-lg`  | `16px` | Panel edge padding, major section gaps                                |
| `--hex-space-xl`  | `24px` | Top-level spacing between major regions                               |

#### 13.1.6 Border Radius

Subtly rounded corners. Never pill-shaped except for small badges.

| Token               | Value    | Usage                                                       |
| ------------------- | -------- | ----------------------------------------------------------- |
| `--hex-radius-sm`   | `4px`    | Buttons, inputs, small badges                               |
| `--hex-radius-md`   | `6px`    | Cards, dropdown menus, tooltips                             |
| `--hex-radius-lg`   | `8px`    | Main panel corners (top-left, top-right when docked bottom) |
| `--hex-radius-pill` | `9999px` | Lifetime pills, count badges                                |

#### 13.1.7 Shadows

Shadows are minimal and functional, providing depth cues for floating elements without visual noise.

| Token                  | Light                               | Dark                                | Usage                                              |
| ---------------------- | ----------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `--hex-shadow-panel`   | `0 -4px 20px rgba(0,0,0,0.08)`      | `0 -4px 20px rgba(0,0,0,0.4)`       | Main panel (shadow cast upward when bottom-docked) |
| `--hex-shadow-trigger` | `0 2px 8px rgba(0,0,0,0.15)`        | `0 2px 8px rgba(0,0,0,0.5)`         | Floating trigger button                            |
| `--hex-shadow-tooltip` | `0 2px 10px rgba(0,0,0,0.12)`       | `0 2px 10px rgba(0,0,0,0.5)`        | Tooltips, dropdown menus                           |
| `--hex-shadow-focus`   | `0 0 0 2px var(--hex-accent-muted)` | `0 0 0 2px var(--hex-accent-muted)` | Focus rings on interactive elements                |

#### 13.1.8 Z-Index Layers

The devtools panel floats above the host application. Z-index values are high to avoid conflicts with user app layers.

| Token             | Value    | Usage                             |
| ----------------- | -------- | --------------------------------- |
| `--hex-z-panel`   | `99999`  | Main devtools panel               |
| `--hex-z-trigger` | `99998`  | Trigger button                    |
| `--hex-z-tooltip` | `100000` | Tooltips, dropdowns (above panel) |
| `--hex-z-overlay` | `100001` | Modal overlays if needed          |

#### 13.1.9 Transitions

All transitions use the same easing and respect `prefers-reduced-motion`.

| Token                     | Value            | Usage                        |
| ------------------------- | ---------------- | ---------------------------- |
| `--hex-transition-fast`   | `100ms ease`     | Hover states, color changes  |
| `--hex-transition-normal` | `200ms ease-out` | Panel open, tab content swap |
| `--hex-transition-slow`   | `300ms ease-out` | Graph layout animations      |

When `prefers-reduced-motion: reduce` is active, all transition durations are set to `0ms`.

### 13.2 CSS Strategy

**Scoping**: All styles are scoped under the `[data-hex-devtools]` attribute selector to prevent leakage into the host application. The root devtools element renders as `<div data-hex-devtools data-hex-theme="dark">`. No global styles are applied.

**Theme switching**: The `data-hex-theme` attribute (`"light"` or `"dark"`) controls which variable set is active. Default is `"dark"` to match developer tool convention. Theme can be toggled by the user via the theme button in the panel header, or set programmatically via the `theme` prop on `<HexDevTools>`.

**Auto-detection**: When `theme="auto"` (the default), the panel reads `prefers-color-scheme` and syncs. A `matchMedia` listener updates the theme reactively.

**Implementation**: All styles are delivered as inline styles or a CSS-in-JS solution (e.g., object styles in React). No external `.css` files are loaded. This ensures the devtools work in any bundler setup without CSS loader configuration.

**Reset**: A minimal CSS reset is applied within the `[data-hex-devtools]` scope to normalize box-sizing, font inheritance, and margin/padding, preventing the host app's styles from bleeding in.

```
[data-hex-devtools] {
  all: initial;
  font-family: var(--hex-font-sans);
  font-size: var(--hex-font-size-md);
  color: var(--hex-text-primary);
  line-height: var(--hex-line-height-normal);
  box-sizing: border-box;
}

[data-hex-devtools] *, [data-hex-devtools] *::before, [data-hex-devtools] *::after {
  box-sizing: inherit;
}
```

### 13.3 Icon System

Icons are inline SVGs rendered as React components. No icon font or external sprite sheet. Each icon is 16x16 at the default size, with `currentColor` fill for theme compatibility.

**Required icons**:

| Icon                             | Usage                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| `HexLogo`                        | Trigger button brand mark (stylized hexagon with "DI" text) |
| `ChevronRight`                   | Tree expand/collapse indicator                              |
| `ChevronDown`                    | Tree expanded state                                         |
| `Close` (X)                      | Panel close button                                          |
| `ThemeToggle` (half-circle)      | Light/dark theme switcher                                   |
| `Search` (magnifying glass)      | Search input prefix                                         |
| `Filter` (funnel)                | Filter dropdown trigger                                     |
| `ZoomIn` / `ZoomOut` / `FitView` | Graph controls                                              |
| `Warning` (triangle)             | Error rate indicator                                        |
| `Dot` (filled circle)            | Lifetime/status indicator in tables                         |
| `ArrowDown`                      | Sort indicator, auto-scroll indicator                       |
| `Clock`                          | Timestamp display                                           |
| `Layers`                         | Scope tree tab icon                                         |
| `Network`                        | Graph tab icon                                              |
| `List`                           | Event log tab icon                                          |
| `Activity`                       | Tracing tab icon                                            |
| `Box`                            | Container tab icon                                          |
| `Library`                        | Library tab icon                                            |

---

## 14. Wireframes

All wireframes below use ASCII art to define layout structure, spatial relationships, and content placement. Measurements reference the design token system from Section 13. Each wireframe is annotated with the data sources from the InspectorAPI that populate its content.

### 14.1 Closed State (Trigger Button Only)

When the devtools panel is closed, only the trigger button is visible. It is a small, unobtrusive floating button in the bottom-right corner of the viewport.

```
                                                                    ___________
  User's Application                                               |           |
  ┌──────────────────────────────────────────────────────┐         |  {hex}    |
  │                                                      │         |    DI     |
  │                                                      │         |___________|
  │                      (app content)                   │          ▲
  │                                                      │          │
  │                                                      │    Trigger button
  │                                                      │    position: fixed
  └──────────────────────────────────────────────────────┘    bottom: 16px
                                                              right: 16px
```

**Trigger button details**:

- Size: 48px x 48px
- Shape: Rounded rectangle (`--hex-radius-md`)
- Background: `--hex-bg-secondary` with `--hex-shadow-trigger`
- Content: HexLogo icon centered, colored `--hex-accent`
- Hover: Background shifts to `--hex-bg-hover`, shadow intensifies slightly
- Active: Background shifts to `--hex-bg-active`
- Tooltip on hover: "HexDI DevTools" (after 500ms delay)
- Badge: When errors are present, a small red dot (8px) appears at top-right corner of the button, using `--hex-error`

### 14.2 Open State -- Overview Tab (Default View)

The panel docks to the bottom of the viewport, spanning full width. The Overview tab is the default landing view showing a bird's-eye summary of the entire DI ecosystem.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └────────┘ └─────────┘ └───────┘ └────────┘ └────────┘ └───────┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  CONTAINER                                                              [Refresh]    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Phase        │ │ Ports        │ │ Resolved     │ │ Errors       │                │
│  │  running     │ │  24          │ │  18 / 24     │ │  2 ports     │                │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                                      │
│  LIBRARIES (3 registered)                                                            │
│  ┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐   │
│  │ Flow                                 │ │ Tracing                              │   │
│  │ Machines: 3       Health Events: 2   │ │ Total Spans: 1,247  Error Count: 14  │   │
│  └──────────────────────────────────────┘ └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐                                            │
│  │ Store                                │                                            │
│  │ Stores: 5         Subscribers: 12    │                                            │
│  └──────────────────────────────────────┘                                            │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Layout breakdown**:

- **Drag handle** (top edge): 8px tall, centered grip icon (three horizontal dots or lines), full width. Cursor: `ns-resize`.
- **Tab bar**: Horizontally scrollable row of tab buttons. Active tab (Overview) has bottom border in `--hex-accent` and `--hex-accent-muted` background. Right side: theme toggle button and close button. Library panels appear dynamically after the built-in tabs.
- **Container stat cards row**: Four summary cards in a horizontal flex row. Each card shows a label (`--hex-text-secondary`, `--hex-font-size-sm`) and a value (`--hex-text-primary`, `--hex-font-size-lg`, `--hex-font-weight-semibold`). Data source: `inspector.getUnifiedSnapshot()` for phase, port count, resolved count, error count. Clicking the container section navigates to the Container panel.
- **Library summary cards**: Two-column grid of library cards. Each card shows the library name (`--hex-font-weight-semibold`) and two headline metrics. Card background: `--hex-bg-secondary`. Clicking a library card navigates to that library's panel. Data source: `inspector.getUnifiedSnapshot().libraries`.
- **Refresh button**: Top-right corner, forces `getUnifiedSnapshot()` re-query.

### 14.3 Graph Tab

The dependency graph view renders all ports as nodes and their dependency relationships as directed edges. Nodes are color-coded by lifetime.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └────────┘ └─────────┘ └═══════┘ └────────┘ └────────┘ └───────┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [+]  [-]  [Fit]                        🔍 Search graph...                    │  │
│  │ ────────────────────────────────────────────────────────────────────────────── │  │
│  │                                                                                │  │
│  │              ┌────────────────┐                                                │  │
│  │              │  ConfigService │  (indigo, singleton)                           │  │
│  │              └───────┬────────┘                                                │  │
│  │                ┌─────┴──────┐                                                  │  │
│  │                │            │                                                  │  │
│  │        ┌───────▼──────┐  ┌─▼────────────┐                                     │  │
│  │        │  AuthService │  │   UserRepo    │  (green, scoped)                   │  │
│  │        └───────┬──────┘  └──────┬────────┘                                     │  │
│  │                │                │                                               │  │
│  │                └────────┬───────┘                                               │  │
│  │                         │                                                      │  │
│  │                ┌────────▼────────┐                                              │  │
│  │                │  PaymentPort    │  (indigo, singleton)  ⚠ 14% errors          │  │
│  │                └─────────────────┘                                              │  │
│  │                                                                                │  │
│  │  Legend:  ● singleton   ● scoped   ● transient     ◻ inherited   ◼ own        │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │  Selected: PaymentPort │ singleton │ deps: AuthService, UserRepo │ 14% err    │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Graph area details**:

- **Toolbar** (top of graph area): Zoom in (`+`), zoom out (`-`), fit to view (`Fit`) buttons on the left. Search input on the right to highlight matching nodes. Buttons use `--hex-bg-secondary` with `--hex-border`.
- **Canvas**: White/dark background (`--hex-bg-primary`). Nodes are rounded rectangles (120px x 36px, `--hex-radius-sm`) with fill color based on lifetime. Node label is centered, monospace, `--hex-font-size-sm`. Edges are directed arrows (solid lines, `--hex-border` color, 1.5px stroke). Arrows point from dependent to dependency (downstream to upstream).
- **Node states**: Default (lifetime fill at 80% opacity), hover (full opacity, thicker border), selected (full opacity, `--hex-accent` border ring), error (red bottom border or error badge). Inherited nodes use dashed borders; own nodes use solid borders.
- **Legend**: Inline at bottom of graph canvas. Colored dots with lifetime labels. Origin indicators (dashed vs solid squares).
- **Detail bar**: Fixed strip at the bottom of the graph area. Shows selected node details: port name, lifetime, dependency list, error rate, factory kind, origin. Only visible when a node is selected. Data source: `inspector.getGraphData()`.

### 14.4 Scopes Tab (Split View)

The Scopes tab uses a master-detail split layout: a tree view of scopes on the left, and scope detail on the right.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └────────┘ └─────────┘ └───────┘ └════════┘ └────────┘ └───────┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌───────────────────────────────┬────────────────────────────────────────────────┐  │
│  │  Scope Tree                   │  Scope Detail                                 │  │
│  │                               │                                               │  │
│  │  ▼ root-scope (active)        │  ID:       root-scope                         │  │
│  │    ├─ ▶ req-scope-1 (active)  │  Status:   active                             │  │
│  │    ├─ ▼ req-scope-2 (active)  │  Resolved: 3 / 8                              │  │
│  │    │    └─ ▶ child-1 (active) │                                               │  │
│  │    └─ ▶ req-scope-3 (disposed)│  Resolved Ports:                              │  │
│  │                               │  ● SessionService    (scoped)                 │  │
│  │                               │  ● RequestContext     (scoped)                │  │
│  │                               │  ● UserRepo           (scoped)                │  │
│  │                               │                                               │  │
│  │                               │  Inherited Singletons: 5                      │  │
│  │                               │                                               │  │
│  └───────────────────────────────┴────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Scope tree (left pane)**:

- Indented tree using `ChevronRight`/`ChevronDown` expand/collapse icons.
- Each node shows: scope ID (monospace, truncated with ellipsis at 20 chars) and status badge ("active" in `--hex-success`, "disposed" in `--hex-text-muted` with strikethrough).
- Selected node has `--hex-bg-active` background.
- Nested scopes are indented by `--hex-space-lg` per level with connecting tree lines (`--hex-border` color, 1px).
- Data source: `inspector.getScopeTree()`, which returns a recursive `ScopeTree` structure.

**Scope detail (right pane)**:

- Shows metadata for the selected scope: ID, status, resolved count / total count.
- Lists resolved port names as a vertical list with lifetime dot indicators.
- Data source: `ScopeTree.resolvedPorts`, `ScopeTree.resolvedCount`, `ScopeTree.totalCount`.

**Split divider**: Vertical, draggable. Default split: 35% / 65%. Min pane width: 200px.

### 14.5 Events Tab (Scrolling Log)

The Events tab shows a real-time feed of all `InspectorEvent` emissions. New events appear at the bottom. Auto-scroll keeps the latest visible.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └────────┘ └─────────┘ └───────┘ └────────┘ └════════┘ └───────┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  🔍 Filter events...       Source: [All ▾]   [Clear]   [⬇ Auto-scroll: ON]   │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │  Time       Type                Source     Details                            │  │
│  │  ────────── ─────────────────── ────────── ─────────────────────────────────  │  │
│  │  12:04:01   resolution          container  AuthService (12ms, cache: miss)    │  │
│  │  12:04:01   resolution          container  ConfigService (2ms, cache: hit)    │  │
│  │  12:04:02   scope-created       container  req-scope-1                        │  │
│  │  12:04:02   result:ok           container  AuthService                        │  │
│  │  12:04:03   result:err          container  PaymentPort (PAY_TIMEOUT)          │  │
│  │  12:04:03   library             flow       state-changed: idle -> loading     │  │
│  │  12:04:04   library             store      action-dispatched: FETCH_USER      │  │
│  │  12:04:05   result:recovered    container  PaymentPort (PAY_TIMEOUT)          │  │
│  │ ▼12:04:05   result:err          container  PaymentPort (PAY_REFUSED)          │  │
│  │  │  { portName: "PaymentPort",                                                │  │
│  │  │    errorCode: "PAY_REFUSED",                                               │  │
│  │  │    timestamp: 1707484245123 }                                              │  │
│  │                                                                                │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Event log details**:

- **Toolbar**: Text filter input (left), source dropdown filter ("All", "container", or library names), "Clear" button to wipe the log, auto-scroll toggle button (right).
- **Event rows**: Each row shows timestamp (monospace, `--hex-font-size-xs`, relative "HH:MM:SS" format), event type (monospace, color-coded -- `resolution` in `--hex-info`, `result:ok` in `--hex-success`, `result:err` in `--hex-error`, `library` in `--hex-accent`, scope events in `--hex-text-secondary`), source ("container" or library name), and a single-line detail summary.
- **Expanded row**: Clicking a row expands it to show the full event payload as formatted JSON with syntax highlighting. Expand indicator is a `ChevronRight`/`ChevronDown`.
- **Buffer**: Maximum 1000 events retained. Oldest events are evicted when the buffer is full. A notice appears: "Showing last 1000 events."
- Data source: `inspector.subscribe()` accumulating events into a local buffer.

### 14.6 Trace Tab (Timeline)

The Trace tab shows resolution timing data as a horizontal timeline, visualizing which services were resolved, how long each took, and cache hit/miss status.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └────────┘ └─────────┘ └───────┘ └────────┘ └────────┘ └═══════┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Total Spans  │ │ Avg Duration │ │ Cache Hits   │ │ Errors       │                │
│  │  47          │ │  8.2ms       │ │  72%         │ │  3           │                │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │   Port Name          0ms   5ms   10ms   15ms   20ms   25ms                    │  │
│  │   ─────────────────── ──────┼──────┼──────┼──────┼──────┼──────               │  │
│  │   ConfigService       ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2ms (cache)         │  │
│  │   AuthService         ████████████░░░░░░░░░░░░░░░░░░░░░  12ms                │  │
│  │   UserRepo            █████████████████░░░░░░░░░░░░░░░░  18ms                │  │
│  │   PaymentPort         ███████████████████████░░░░░░░░░░  24ms  ⚠             │  │
│  │   SessionService      ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  6ms (cache)          │  │
│  │                                                                                │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Trace timeline details**:

- **Summary cards**: Total spans, average duration, cache hit rate, error count. Data source: `useTracingSummary()` hook (reads from the "tracing" library inspector).
- **Timeline rows**: Each row shows a port name (left column, fixed width, monospace) and a horizontal bar (right area). Bar length is proportional to resolution duration. Bars are colored by lifetime. Cache hits use a lighter/striped fill. Error resolutions have a red right-edge marker.
- **Time axis**: Horizontal axis at the top with tick marks at regular ms intervals. Scale adjusts based on the maximum observed duration.
- **Hover**: Hovering a bar shows a tooltip with exact duration, cache hit/miss, error code if applicable.
- **Empty state**: When no tracing library inspector is registered, shows: "Tracing not enabled. Register a tracing library inspector to see resolution timelines."

### 14.7 Libraries Tab (Tree View)

The Libraries tab shows registered library inspectors and their domain-specific snapshot data as expandable JSON trees.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ... │Overview│ ... │ Health │ │Libraries│ ...                      ┌───┐ ┌───┐      │
│                     └────────┘ └═════════┘                          │ ◐ │ │ X │      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Registered Libraries (3)                                   🔍 Search...      │  │
│  │ ────────────────────────────────────────────────────────────────────────────── │  │
│  │                                                                                │  │
│  │  ▼ flow                                                                       │  │
│  │    ├─ machineCount: 3                                                         │  │
│  │    ├─ ▼ machines:                                                             │  │
│  │    │    ├─ ▼ "taskFlow":                                                      │  │
│  │    │    │    ├─ state: "loading"                                               │  │
│  │    │    │    ├─ context: { taskId: 42, ... }                                  │  │
│  │    │    │    └─ activitiesCount: 2                                             │  │
│  │    │    └─ ▶ "authFlow": { ... }                                              │  │
│  │    └─ runnerCount: 2                                                          │  │
│  │                                                                                │  │
│  │  ▶ store                                                                      │  │
│  │  ▶ tracing                                                                    │  │
│  │                                                                                │  │
│  │  ──────────────────────────────────────────────────────────────────────────    │  │
│  │  No libraries?  Libraries register via inspector.registerLibrary(lib)         │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Libraries tab details**:

- **Header**: Shows count of registered libraries. Search input filters by library name or key path.
- **Library sections**: Each registered library is a collapsible section. Header shows library name (monospace, `--hex-font-weight-semibold`). Chevron on the left to expand/collapse.
- **Snapshot tree**: The library's `getSnapshot()` return value rendered as an expandable JSON tree. Keys in `--hex-text-secondary`, string values in `--hex-success`, number values in `--hex-info`, boolean values in `--hex-accent`, null/undefined in `--hex-text-muted`. Objects/arrays show a collapsed preview ("{ ... }" or "[3 items]") when collapsed.
- **Empty state**: When no libraries are registered, a help message explains how to register: "Libraries register via `inspector.registerLibrary(lib)`".
- Data source: `inspector.getLibraryInspectors()` for the list, each `LibraryInspector.getSnapshot()` for content.

### 14.8 Unified Overview Tab

The Overview tab provides a bird's-eye summary of the entire DI ecosystem on a single screen.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ┌────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐ ┌────────┐       │
│  │Overview│ │Container│ │ Graph │ │ Scopes │ │ Events │ │ Trace │ │ Health │  ◐  X  │
│  └════════┘ └─────────┘ └───────┘ └────────┘ └────────┘ └───────┘ └────────┘       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ Phase        │ │ Ports        │ │ Resolved     │ │ Errors       │                │
│  │  running     │ │  24          │ │  18 / 24     │ │  2 ports     │                │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                                      │
│  LIBRARIES (5 registered)                                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐                   │  │
│  │  │  Flow                    │  │  Tracing                  │                   │  │
│  │  │  Machines: 3             │  │  Total Spans: 1,247       │                   │  │
│  │  │  Health Events: 2        │  │  Error Count: 14          │                   │  │
│  │  └──────────────────────────┘  └──────────────────────────┘                   │  │
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐                   │  │
│  │  │  Store                   │  │  Saga                     │                   │  │
│  │  │  Stores: 5               │  │  Active: 2                │                   │  │
│  │  │  Subscribers: 12         │  │  Compensations: 0         │                   │  │
│  │  └──────────────────────────┘  └──────────────────────────┘                   │  │
│  │  ┌──────────────────────────┐                                                 │  │
│  │  │  Logger                  │                                                 │  │
│  │  │  Total Entries: 8,432    │                                                 │  │
│  │  │  Error Rate: 1.2%        │                                                 │  │
│  │  └──────────────────────────┘                                                 │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Overview tab details**:

- **Tab bar**: "Overview" is the first tab (order: 0). Active state: `--hex-accent` bottom border, `--hex-accent-muted` background.
- **Container stat row**: Four metric cards in horizontal flex. Labels use `--hex-text-secondary` at `--hex-font-size-sm`. Values use `--hex-text-primary` at `--hex-font-size-lg`, `--hex-font-weight-semibold`. Cards have `--hex-bg-secondary` background with `--hex-border` border and `--hex-radius-sm`.
- **Library card grid**: Two-column grid layout. Each card uses `--hex-bg-secondary` background, `--hex-border` border, `--hex-radius-md`. Library name in `--hex-font-weight-semibold`, `--hex-font-size-md`. Metric labels in `--hex-text-secondary`, values in `--hex-text-primary`. Cards are clickable (cursor: pointer, hover: `--hex-bg-hover`).
- **Footer**: Registered library count (e.g., "5 registered") in `--hex-text-muted` at `--hex-font-size-xs`. The grid wraps: odd library counts leave the last card spanning half-width in the final row.
- Data source: `inspector.getUnifiedSnapshot()`.

### 14.9 Health & Diagnostics Tab

The Health tab aggregates diagnostic signals from across the nervous system into a single scrollable view.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  drag handle  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│                                                                                      │
│  ... │Overview│ ... │ Health │ ...                                    ┌───┐ ┌───┐    │
│                     └════════┘                                       │ ◐ │ │ X │    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  GRAPH HEALTH                                                                 │  │
│  │  ┌─────────────────┐ ┌────────────────────────────────────────────────────┐   │  │
│  │  │  Complexity: 42  │ │  SAFE                                             │   │  │
│  │  │  ████████░░░░░░  │ │  24 adapters | depth 4 | fan-out 2.1             │   │  │
│  │  └─────────────────┘ │  3 suggestions | 0 orphans | 0 captives           │   │  │
│  │                       └────────────────────────────────────────────────────┘   │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │  BLAST RADIUS                          Port: [PaymentGateway ▾]               │  │
│  │  ─────────────────────────────────────────────────────────────────────────     │  │
│  │  Direct: OrderService, CheckoutService, RefundService (3)                     │  │
│  │  Transitive: + CartService, ReceiptService, NotificationService, ... (7)      │  │
│  │  Libraries: Flow (2 machines), Saga (1 step)                                  │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │  SCOPE LEAKS                                                                  │  │
│  │  ─────────────────────────────────────────────────────────────────────────     │  │
│  │  ⚠ request-abc: active 8m 32s (> 5m threshold)                               │  │
│  │  ⚠ request-def: 142 children (> 100 threshold)                               │  │
│  ├────────────────────────────────────────────────────────────────────────────────┤  │
│  │  ERROR HOTSPOTS                                                               │  │
│  │  ─────────────────────────────────────────────────────────────────────────     │  │
│  │  ■ PaymentGateway  14%  PAYMENT_TIMEOUT (2m ago)  12 error spans             │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Health tab details**:

- **Graph Health summary bar**: Complexity gauge on the left (horizontal bar fill, `--hex-success` for safe, `--hex-warning` for monitor, `--hex-error` for consider-splitting). Recommendation badge to the right. Stats row below uses `--hex-text-secondary` at `--hex-font-size-sm`.
- **Blast radius section**: Port dropdown selector (`--hex-bg-secondary`, `--hex-border`). Dependent lists use `--hex-font-mono` for port names. Cross-library impact uses `--hex-accent` for library names.
- **Scope leak alerts**: Each alert is a row with `--hex-warning-muted` background, `--hex-warning` left border (3px). Scope ID in `--hex-font-mono`, clickable (cursor: pointer).
- **Error hotspot rows**: Each row has a `--hex-error` left border (3px). Port name in `--hex-font-mono`, `--hex-font-weight-semibold`. Error rate in `--hex-error` color. Last error code and tracing span count in `--hex-text-secondary`.
- **Section dividers**: 1px `--hex-border` horizontal rules between sections.
- Data sources: `inspectGraph()`, `inspector.getScopeTree()`, `inspector.getHighErrorRatePorts(0.05)`, `inspector.getResultStatistics()`.

---

## 15. Interaction Patterns

This section defines all user interactions, animations, keyboard behavior, and accessibility requirements for the devtools panel.

### 15.1 Panel Open/Close Animation

**Opening**:

- Trigger: Click the floating trigger button.
- Animation: Panel slides up from the bottom edge of the viewport over `200ms` with `ease-out` timing.
- The panel starts at `translateY(100%)` and animates to `translateY(0)`.
- The trigger button simultaneously fades out over `150ms`.
- Panel height restores to the last persisted value (default: `350px`).

**Closing**:

- Trigger: Click the close button (X) in the tab bar, or press `Escape` when focus is inside the panel.
- Animation: Panel slides down over `150ms` with `ease-in` timing.
- The panel animates from `translateY(0)` to `translateY(100%)`.
- The trigger button simultaneously fades in over `150ms`.
- After animation completes, the panel DOM is unmounted (or set to `display: none`).

**Reduced motion**: When `prefers-reduced-motion: reduce` is active, both open and close happen instantly (0ms duration, no transform animation). The trigger button toggles visibility without fade.

### 15.2 Resize Behavior

**Drag handle**:

- Located at the top edge of the panel, spanning full width, 8px tall.
- Visual: Centered grip indicator (three short horizontal lines, `--hex-text-muted`).
- Cursor: Changes to `ns-resize` on hover over the handle area.

**Resize mechanics**:

- Mouse down on drag handle begins resize mode.
- Mouse move adjusts panel height. Height = viewport height - mouse Y position.
- Mouse up ends resize mode.
- Minimum height: `200px`. The panel will not shrink below this.
- Maximum height: `80vh` (80% of viewport height).
- If the user drags below `100px`, the panel auto-closes (triggers close animation).
- During resize, a subtle overlay is applied to the host app to prevent iframe/canvas interference with mouse events.

**Persistence**: Panel height is persisted to `localStorage` under the key `hex-devtools-panel-height`. On next open, the panel restores to the persisted height. If no persisted value exists, default is `350px`.

**Touch support**: The drag handle also responds to touch events (`touchstart`, `touchmove`, `touchend`) with the same mechanics.

### 15.3 Tab Switching

**Behavior**: Instant switch. No crossfade or slide animation.

- Clicking a tab immediately unmounts the previous panel content and mounts the new panel content.
- The active tab receives `--hex-accent` bottom border (2px) and `--hex-accent-muted` background.
- Inactive tabs have transparent background and no bottom border.
- Hover on inactive tabs shows `--hex-bg-hover` background.

**Tab state**: Each tab's scroll position and internal UI state (expanded tree nodes, selected items, search text) is preserved in memory while the tab is unmounted. When the user returns to a tab, the state is restored. This is accomplished by keeping panel state in the parent component, not in each panel.

**Persistence**: The active tab name is persisted to `localStorage` under the key `hex-devtools-active-tab`. On next panel open, the last active tab is restored.

### 15.4 Graph Interactions

**Pan**: Click and drag on the graph background (not on a node). Cursor changes to `grab` on hover over background, `grabbing` while dragging. Pan offset is applied as a CSS transform on the graph group.

**Zoom**: Mouse wheel (or trackpad pinch) zooms centered on the cursor position. Zoom range: `0.25x` to `3.0x`. Each wheel tick changes zoom by `0.1x`. Zoom level is displayed in the toolbar (e.g., "100%").

**Select node**: Click a node to select it. Selected node gets a `--hex-accent` border ring (`--hex-shadow-focus`). The detail bar at the bottom of the graph area populates with the selected node's information. Clicking the background deselects.

**Highlight on hover**: Hovering a node highlights all edges connected to that node (both incoming and outgoing). Connected edges change color to `--hex-accent` with increased stroke width (2.5px). Non-connected edges and nodes fade to 30% opacity. The hovered node and its direct dependencies/dependents remain at full opacity.

**Fit to view**: Double-click the graph background or click the "Fit" button in the toolbar. Animates the pan and zoom over `300ms` to fit all nodes within the visible area with `--hex-space-xl` padding.

**Search**: Typing in the graph search input highlights matching nodes (by port name, case-insensitive substring match). Matching nodes pulse briefly with `--hex-accent` outline. Non-matching nodes reduce to 50% opacity.

### 15.5 Tree Interactions (Scope Tree, JSON Trees)

**Expand/collapse**:

- Click the chevron icon to toggle expand/collapse.
- Click anywhere else on the row to select the item (without toggling expansion).
- Double-click a collapsed row to expand it.

**Keyboard navigation**:

- `ArrowDown`: Move selection to the next visible row.
- `ArrowUp`: Move selection to the previous visible row.
- `ArrowRight`: If selected row is collapsed, expand it. If already expanded, move to first child.
- `ArrowLeft`: If selected row is expanded, collapse it. If already collapsed, move to parent.
- `Enter`: Toggle expand/collapse on the selected row.
- `Home`: Move selection to the first row.
- `End`: Move selection to the last visible row.

**Visual feedback**: Selected row has `--hex-bg-active` background. Focused row (via keyboard) has a `--hex-shadow-focus` outline. Hover row has `--hex-bg-hover` background.

**Lazy rendering**: For trees with more than 100 visible nodes, virtualize the list (render only visible rows plus a buffer of 20 above/below).

### 15.6 Table Interactions

**Sort**:

- Click a column header to sort by that column (ascending).
- Click the same header again to toggle to descending.
- Click a third time to remove the sort (return to default order).
- The active sort column header shows an arrow indicator (`ArrowDown` for ascending, rotated for descending).
- Default sort for the Container tab port table: alphabetical by port name.

**Search/filter**:

- Typing in the search input filters rows by port name (case-insensitive substring match).
- The lifetime dropdown filter restricts rows to a specific lifetime or "All".
- Filters are composable: search + lifetime filter apply simultaneously.
- Result count shown: "Showing 12 of 24 ports".

**Select row**:

- Click a row to select it. Selected row has `--hex-bg-active` background.
- Selected row could trigger a detail pane or tooltip (future enhancement; for v0.1.0, selection highlights only).

**Empty state**: When filters produce zero results, show centered message: "No ports match your filter." in `--hex-text-muted`.

### 15.7 Event Log Interactions

**Auto-scroll**:

- Enabled by default. New events cause the log to scroll to the bottom.
- When the user manually scrolls upward (scroll position is not at the bottom), auto-scroll is disabled. A sticky banner appears at the bottom: "Auto-scroll paused. [Resume]".
- Clicking "Resume" or scrolling to the bottom re-enables auto-scroll.
- The auto-scroll toggle button in the toolbar reflects current state: "ON" (green) or "OFF" (muted).

**Expand event row**:

- Click a row to toggle expansion.
- Expanded row shows the full event object as pretty-printed JSON (2-space indent) with syntax highlighting. JSON area has `--hex-bg-tertiary` background, monospace font, `--hex-font-size-xs`.
- Only one row can be expanded at a time (accordion behavior). Expanding a new row collapses the previously expanded one.

**Filter**:

- **Text filter**: Filters across all visible columns (type, source, details). Case-insensitive substring match.
- **Source dropdown**: Options are dynamically populated: "All", "container", plus each registered library name. Selecting a source shows only events from that source.
- Filters apply in real-time to both existing log entries and incoming events.

**Clear**: The "Clear" button empties the event buffer and resets the view. A confirmation is not required (the action is non-destructive since events continue flowing).

**Performance**: The event log virtualizes its row list. Only visible rows (plus a buffer of 10 above and below the viewport) are rendered in the DOM, regardless of total event count.

### 15.8 Accessibility

The devtools panel is built for keyboard-first developer workflows. All interactive elements are accessible.

**Focus management**:

- When the panel opens, focus moves to the first interactive element inside the panel (the first tab button).
- When the panel closes, focus returns to the trigger button.
- Focus is trapped inside the panel while it is open (Tab key cycles through panel elements, not the host app).

**ARIA roles and attributes**:

- Tab bar: `role="tablist"` on the container, `role="tab"` on each tab button with `aria-selected`, `role="tabpanel"` on each panel content area with `aria-labelledby`.
- Tree views: `role="tree"` on the container, `role="treeitem"` on each node, `aria-expanded` on expandable nodes.
- Tables: Native `<table>`, `<thead>`, `<tbody>`, `<th>` (with `scope="col"`), `<td>` elements. Sort state indicated via `aria-sort` on `<th>`.
- Event log: `role="log"` with `aria-live="polite"` (or `"off"` when auto-scroll is paused).
- Trigger button: `aria-label="Open HexDI DevTools"`, `aria-expanded` reflecting panel state.
- Close button: `aria-label="Close DevTools"`.
- Theme toggle: `aria-label="Switch to light/dark theme"`.

**Keyboard shortcuts**:

- `Escape` (when panel is open): Close the panel.
- `Tab` / `Shift+Tab`: Navigate between interactive elements within the panel.
- Arrow keys: Navigate within trees and tables (see Sections 15.5 and 15.6).
- Tab-specific shortcuts are scoped to the active panel.

**Reduced motion**: As described in Section 13.1.9, all animations and transitions respect the `prefers-reduced-motion` media query. When reduced motion is preferred, panel open/close is instant, graph fit-to-view snaps without animation, hover transitions are instant, and no pulsing or sliding effects occur.

**Color contrast**: All text/background combinations meet WCAG 2.1 AA minimum contrast ratios (4.5:1 for normal text, 3:1 for large text). The light theme uses dark text on light backgrounds; the dark theme uses light text on dark backgrounds. Semantic colors (success, warning, error) are chosen to maintain sufficient contrast in both themes.

**Screen readers**: The devtools panel is an auxiliary developer tool and is not critical-path UI. It uses `aria-label`, `aria-describedby`, and `role` attributes to be navigable by screen readers, but it does not need to meet AAA compliance. Focus management and keyboard navigation are the primary accessibility vectors.

---

> Previous: [04-data-layer.md](./04-data-layer.md) | Next: [06-api-reference.md](./06-api-reference.md)
