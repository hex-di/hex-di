# 13-15. Visual Design System, Wireframes, and Interaction Patterns

> Previous: [04-data-layer.md](./04-data-layer.md) | Next: [06-api-reference.md](./06-api-reference.md)

---

## 13. Visual Design System

The devtools dashboard adopts a professional, information-dense aesthetic inspired by Chrome DevTools, Grafana, and Jaeger UI. It prioritizes readability, scan-ability, and visual hierarchy over decoration. Both light and dark themes are first-class citizens. As a standalone web application, the dashboard owns the entire page and does not need style isolation from a host application.

### 13.1 Design Tokens

All visual values are expressed as CSS custom properties (variables) on the `:root` element (or `[data-theme]` for theme switching). No hardcoded values appear in component styles. Theming is achieved by swapping the variable set via the `data-theme` attribute.

#### 13.1.1 Color Palette

The palette uses a neutral blue-grey base with a vibrant indigo accent. Semantic colors (success, warning, error, info) are consistent across themes but shifted in lightness for readability on each background.

| Token                  | Light                   | Dark                     | Usage                                       |
| ---------------------- | ----------------------- | ------------------------ | ------------------------------------------- |
| `--hex-bg-primary`     | `#ffffff`               | `#1e1e2e`                | Main content background                     |
| `--hex-bg-secondary`   | `#f5f5f7`               | `#2a2a3e`                | Section backgrounds, sidebar, table headers |
| `--hex-bg-tertiary`    | `#ebebf0`               | `#32324a`                | Nested sections, code blocks                |
| `--hex-bg-hover`       | `#e8e8ec`               | `#363650`                | Row hover, button hover                     |
| `--hex-bg-active`      | `#dcdce4`               | `#45456a`                | Active/selected rows, pressed buttons       |
| `--hex-bg-badge`       | `#f0f0f5`               | `#3a3a54`                | Badge backgrounds, pill containers          |
| `--hex-text-primary`   | `#1a1a2e`               | `#e4e4f0`                | Primary body text, headings                 |
| `--hex-text-secondary` | `#6b6b80`               | `#9b9bb0`                | Labels, column headers, secondary info      |
| `--hex-text-muted`     | `#9b9bb0`               | `#6b6b80`                | Disabled text, timestamps, placeholders     |
| `--hex-text-inverse`   | `#ffffff`               | `#1a1a2e`                | Text on filled buttons, badges              |
| `--hex-border`         | `#e0e0e8`               | `#3a3a50`                | Borders, table dividers, separators         |
| `--hex-border-strong`  | `#c8c8d4`               | `#505068`                | Focus rings, active borders                 |
| `--hex-accent`         | `#6366f1`               | `#818cf8`                | Brand color, active nav items, links        |
| `--hex-accent-hover`   | `#5558e6`               | `#9299f9`                | Accent hover state                          |
| `--hex-accent-muted`   | `rgba(99,102,241,0.12)` | `rgba(129,140,248,0.15)` | Accent backgrounds (selected nav item bg)   |
| `--hex-success`        | `#22c55e`               | `#4ade80`                | Active scopes, healthy states, resolved     |
| `--hex-success-muted`  | `rgba(34,197,94,0.12)`  | `rgba(74,222,128,0.15)`  | Success badge backgrounds                   |
| `--hex-warning`        | `#f59e0b`               | `#fbbf24`                | Warning indicators, transient lifetime      |
| `--hex-warning-muted`  | `rgba(245,158,11,0.12)` | `rgba(251,191,36,0.15)`  | Warning badge backgrounds                   |
| `--hex-error`          | `#ef4444`               | `#f87171`                | Error states, high error rate, disposed     |
| `--hex-error-muted`    | `rgba(239,68,68,0.12)`  | `rgba(248,113,113,0.15)` | Error badge backgrounds                     |
| `--hex-info`           | `#3b82f6`               | `#60a5fa`                | Informational indicators, cache hits        |
| `--hex-info-muted`     | `rgba(59,130,246,0.12)` | `rgba(96,165,250,0.15)`  | Info badge backgrounds                      |

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

#### 13.1.4 Connection Status Colors

Connection status indicators for apps connected to the dashboard.

| Status         | Color Token                 | Light Value | Dark Value | Usage                                          |
| -------------- | --------------------------- | ----------- | ---------- | ---------------------------------------------- |
| `connected`    | `--hex-status-connected`    | `#22c55e`   | `#4ade80`  | App actively connected, data flowing           |
| `stale`        | `--hex-status-stale`        | `#f59e0b`   | `#fbbf24`  | Connection alive but no data received recently |
| `disconnected` | `--hex-status-disconnected` | `#ef4444`   | `#f87171`  | Connection lost, attempting reconnect          |

#### 13.1.5 Typography

The type scale is compact, optimized for information density. Monospace is the default for identifiers (port names, adapter names, error codes); sans-serif is used for labels and UI chrome.

| Token                        | Value                                                                              | Usage                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `--hex-font-mono`            | `'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace` | Port names, values, code, JSON, error codes |
| `--hex-font-sans`            | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`               | Labels, headers, UI text, buttons           |
| `--hex-font-size-xs`         | `11px` / `0.6875rem`                                                               | Timestamps, event IDs, tertiary metadata    |
| `--hex-font-size-sm`         | `12px` / `0.75rem`                                                                 | Table content, tree node labels, badges     |
| `--hex-font-size-md`         | `13px` / `0.8125rem`                                                               | Primary content text, form inputs           |
| `--hex-font-size-lg`         | `14px` / `0.875rem`                                                                | Section headers, stat card labels           |
| `--hex-font-size-xl`         | `16px` / `1rem`                                                                    | Dashboard title ("HexDI DevTools")          |
| `--hex-font-weight-normal`   | `400`                                                                              | Body text                                   |
| `--hex-font-weight-medium`   | `500`                                                                              | Labels, column headers                      |
| `--hex-font-weight-semibold` | `600`                                                                              | Section headers, stat values                |
| `--hex-line-height-tight`    | `1.3`                                                                              | Compact rows, badges                        |
| `--hex-line-height-normal`   | `1.5`                                                                              | Body text, descriptions                     |

#### 13.1.6 Spacing

A 4px base unit with deliberate density. The devtools dashboard is not a marketing page; spacing is tight but never cramped.

| Token             | Value  | Usage                                                                 |
| ----------------- | ------ | --------------------------------------------------------------------- |
| `--hex-space-xxs` | `2px`  | Icon margins, micro adjustments                                       |
| `--hex-space-xs`  | `4px`  | Tight padding (badge padding, inline gaps)                            |
| `--hex-space-sm`  | `8px`  | Component internal padding, row padding, gaps between inline elements |
| `--hex-space-md`  | `12px` | Section internal gaps, card padding                                   |
| `--hex-space-lg`  | `16px` | Edge padding, major section gaps                                      |
| `--hex-space-xl`  | `24px` | Top-level spacing between major regions                               |

#### 13.1.7 Border Radius

Subtly rounded corners. Never pill-shaped except for small badges.

| Token               | Value    | Usage                                                |
| ------------------- | -------- | ---------------------------------------------------- |
| `--hex-radius-sm`   | `4px`    | Buttons, inputs, small badges                        |
| `--hex-radius-md`   | `6px`    | Cards, dropdown menus, tooltips                      |
| `--hex-radius-lg`   | `8px`    | Content area corners, sidebar sections               |
| `--hex-radius-pill` | `9999px` | Lifetime pills, count badges, connection status dots |

#### 13.1.8 Shadows

Shadows are minimal and functional, providing depth cues for floating elements without visual noise.

| Token                  | Light                               | Dark                                | Usage                               |
| ---------------------- | ----------------------------------- | ----------------------------------- | ----------------------------------- |
| `--hex-shadow-tooltip` | `0 2px 10px rgba(0,0,0,0.12)`       | `0 2px 10px rgba(0,0,0,0.5)`        | Tooltips, dropdown menus            |
| `--hex-shadow-focus`   | `0 0 0 2px var(--hex-accent-muted)` | `0 0 0 2px var(--hex-accent-muted)` | Focus rings on interactive elements |
| `--hex-shadow-sidebar` | `1px 0 4px rgba(0,0,0,0.06)`        | `1px 0 4px rgba(0,0,0,0.3)`         | Sidebar right edge shadow           |

#### 13.1.9 Sidebar Layout

Tokens specific to the connection sidebar layout.

| Token                  | Value                     | Usage                               |
| ---------------------- | ------------------------- | ----------------------------------- |
| `--hex-sidebar-width`  | `240px`                   | Default sidebar width               |
| `--hex-sidebar-min`    | `180px`                   | Minimum sidebar width during resize |
| `--hex-sidebar-max`    | `400px`                   | Maximum sidebar width during resize |
| `--hex-sidebar-bg`     | `var(--hex-bg-secondary)` | Sidebar background color            |
| `--hex-sidebar-border` | `var(--hex-border)`       | Sidebar right border color          |

#### 13.1.10 Z-Index Layers

The dashboard is a standalone application. Z-index values are used only for internal layering of tooltips and dropdowns.

| Token             | Value | Usage                                |
| ----------------- | ----- | ------------------------------------ |
| `--hex-z-tooltip` | `100` | Tooltips, dropdowns (above content)  |
| `--hex-z-overlay` | `200` | Modal overlays, confirmation dialogs |

#### 13.1.11 Transitions

All transitions use the same easing and respect `prefers-reduced-motion`.

| Token                     | Value            | Usage                             |
| ------------------------- | ---------------- | --------------------------------- |
| `--hex-transition-fast`   | `100ms ease`     | Hover states, color changes       |
| `--hex-transition-normal` | `200ms ease-out` | Sidebar resize, panel transitions |
| `--hex-transition-slow`   | `300ms ease-out` | Graph layout animations           |

When `prefers-reduced-motion: reduce` is active, all transition durations are set to `0ms`.

### 13.2 CSS Strategy

**Root styling**: As a standalone Vite + React application, the dashboard applies styles to `:root` and `body`. The `data-theme` attribute (`"light"` or `"dark"`) on `<html>` controls which variable set is active. Default is `"dark"` to match developer tool convention.

**Theme switching**: Theme can be toggled by the user via the theme button in the dashboard header. A `matchMedia` listener for `prefers-color-scheme` provides auto-detection when the user has not explicitly chosen a theme.

**Implementation**: Styles are delivered via CSS modules or a CSS-in-JS solution (e.g., object styles in React). Since the dashboard is a standalone app, standard CSS bundling works without any special loader concerns.

**Base reset**: A standard CSS reset (e.g., `box-sizing: border-box` on all elements, `margin: 0` on body) is applied globally. No `all: initial` is needed since the dashboard owns the entire page.

```css
:root {
  font-family: var(--hex-font-sans);
  font-size: var(--hex-font-size-md);
  color: var(--hex-text-primary);
  line-height: var(--hex-line-height-normal);
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}

body {
  margin: 0;
  background: var(--hex-bg-primary);
  color: var(--hex-text-primary);
}
```

### 13.3 Icon System

Icons are inline SVGs rendered as React components. No icon font or external sprite sheet. Each icon is 16x16 at the default size, with `currentColor` fill for theme compatibility.

**Required icons**:

| Icon                             | Usage                                          |
| -------------------------------- | ---------------------------------------------- |
| `HexLogo`                        | Dashboard header brand mark (stylized hexagon) |
| `ChevronRight`                   | Tree expand/collapse indicator, sidebar nav    |
| `ChevronDown`                    | Tree expanded state                            |
| `ThemeToggle` (half-circle)      | Light/dark theme switcher                      |
| `Search` (magnifying glass)      | Search input prefix                            |
| `Filter` (funnel)                | Filter dropdown trigger                        |
| `ZoomIn` / `ZoomOut` / `FitView` | Graph controls                                 |
| `Warning` (triangle)             | Error rate indicator                           |
| `Dot` (filled circle)            | Lifetime/status/connection indicator           |
| `ArrowDown`                      | Sort indicator, auto-scroll indicator          |
| `Clock`                          | Timestamp display                              |
| `Layers`                         | Scope tree nav icon                            |
| `Network`                        | Graph nav icon                                 |
| `List`                           | Event log nav icon                             |
| `Activity`                       | Tracing nav icon                               |
| `Box`                            | Container nav icon                             |
| `Library`                        | Library nav icon                               |
| `Connection` (plug/socket)       | Connection sidebar header, app status          |
| `Server`                         | Node.js app type indicator                     |
| `Browser`                        | React/browser app type indicator               |
| `Disconnect`                     | Disconnect action button                       |

---

## 14. Wireframes

All wireframes below use ASCII art to define layout structure, spatial relationships, and content placement. Measurements reference the design token system from Section 13. Each wireframe is annotated with the data sources from the `RemoteInspectorAPI` that populate its content. The dashboard is a full-page application with a sidebar + main content layout.

### 14.1 Full-Page Dashboard Layout

The dashboard is a standalone web application running on its own port. It fills the entire browser viewport with a sidebar on the left and the main content area on the right.

```
+-----------------------------------------------------------------------------------+
|  SIDEBAR (240px)         |  MAIN CONTENT                                          |
|                          |                                                         |
|  ┌────────────────────┐  |  ┌─────────────────────────────────────────────────┐   |
|  │  {hex} DI DevTools │  |  │  CONNECTION HEADER                              │   |
|  └────────────────────┘  |  │  app: "api-server"  |  status: connected  |  ◐  │   |
|                          |  └─────────────────────────────────────────────────┘   |
|  CONNECTIONS             |                                                         |
|  ─────────────────────   |  ┌─────────────────────────────────────────────────┐   |
|  ● api-server  (node)   |  │                                                 │   |
|    connected  2ms        |  │                                                 │   |
|    PID:4521              |  │           ACTIVE PANEL CONTENT                  │   |
|  ○ web-app    (react)    |  │                                                 │   |
|    connected  8ms        |  │    (Overview / Container / Graph / Scopes /     │   |
|    /dashboard            |  │     Events / Trace / Health / Libraries)        │   |
|  ○ web-app    (react)    |  │                                                 │   |
|    connected  12ms       |  │                                                 │   |
|    /checkout             |  │                                                 │   |
|                          |  │                                                 │   |
|  PANELS                  |  │                                                 │   |
|  ─────────────────────   |  │                                                 │   |
|  ▸ Overview              |  │                                                 │   |
|  ▸ Container             |  └─────────────────────────────────────────────────┘   |
|  ▸ Graph                 |                                                         |
|  ▸ Scopes                |                                                         |
|  ▸ Events                |                                                         |
|  ▸ Trace                 |                                                         |
|  ▸ Health                |                                                         |
|  ▸ Libraries             |                                                         |
|                          |                                                         |
+-----------------------------------------------------------------------------------+
```

**Layout breakdown**:

- **Sidebar** (left, `--hex-sidebar-width` default `240px`): Contains the logo/brand, connection list (app selector), and panel navigation. Background: `--hex-sidebar-bg`. Right border: `1px solid --hex-sidebar-border` with `--hex-shadow-sidebar`.
- **Main content** (right, fills remaining width): Contains the connection header bar and the active panel content area. Background: `--hex-bg-primary`.
- **Sidebar resize handle**: A 4px-wide invisible drag handle on the right edge of the sidebar. Cursor: `ew-resize` on hover. Drag to resize between `--hex-sidebar-min` and `--hex-sidebar-max`.

### 14.2 Connection Sidebar Detail

The sidebar is divided into three sections: brand header, connection list, and panel navigation.

```
┌────────────────────────┐
│  {hex} DI DevTools     │  ← Brand header (--hex-font-size-xl, --hex-accent)
│  v0.1.0                │  ← Version in --hex-text-muted, --hex-font-size-xs
├────────────────────────┤
│  CONNECTIONS (3)       │  ← Section header (--hex-text-secondary, --hex-font-size-xs, uppercase)
│ ────────────────────── │
│  ● api-server          │  ← Selected: --hex-bg-active background, --hex-accent left border (3px)
│    node  |  2ms        │     Status dot: --hex-status-connected (green)
│    PID:4521            │     Metadata line: --hex-text-muted, --hex-font-size-xs
│                        │
│  ○ web-app             │  ← Unselected: transparent background
│    react  |  8ms       │     Status dot: --hex-status-connected (green)
│    /dashboard          │     Metadata: URL path from location.href
│                        │
│  ○ web-app             │  ← Same appName, different instance
│    react  |  12ms      │     Status dot: --hex-status-connected (green)
│    /checkout           │     Metadata: different URL path disambiguates
│                        │
│  ○ admin-panel         │
│    react  |  stale     │     Status dot: --hex-status-stale (amber)
│    /settings           │
│                        │
│  · payment-svc         │
│    node  |  disconn    │     Status dot: --hex-status-disconnected (red)
│    PID:4522            │
│  ─── No connections ───│  ← Empty state (shown when 0 connections)
│  Waiting for apps to   │    --hex-text-muted, centered
│  connect...            │
├────────────────────────┤
│  PANELS                │  ← Section header
│ ────────────────────── │
│  ▸ Overview            │  ← Active: --hex-accent text, --hex-accent-muted background
│  ▸ Container           │     Inactive: --hex-text-secondary, transparent
│  ▸ Graph               │     Hover: --hex-bg-hover
│  ▸ Scopes              │
│  ▸ Events              │
│  ▸ Trace               │
│  ▸ Health              │
│  ▸ Libraries           │
└────────────────────────┘
```

**Connection list details**:

- Each connection row shows: status dot (8px circle), display label (monospace, `--hex-font-size-sm`, truncated with ellipsis — uses `displayLabel` which combines appName with disambiguation when multiple instances share the same name), app type ("node" or "react", `--hex-font-size-xs`, `--hex-text-muted`), latency or status text, and a metadata line (`--hex-font-size-xs`, `--hex-text-muted`) showing the URL path for browser apps or PID for Node.js apps.
- Clicking a connection selects it as the active connection. The main content area updates to show data from the selected app.
- Right-click context menu on a connection: "Disconnect", "Copy Connection ID".
- Connections are sorted: connected first, then stale, then disconnected. Within each group, alphabetical by app name.

**Panel navigation details**:

- Panel nav items are a vertical list below the connections section.
- Each item shows an icon (16x16) and label. Active panel: `--hex-accent` text color, `--hex-accent-muted` background, `--hex-accent` left border (3px). Inactive: `--hex-text-secondary`, transparent background, no left border.
- Clicking a panel nav item switches the main content area.
- Library sub-panels appear dynamically below the "Libraries" item when libraries are registered, indented one level.

### 14.3 Connection Header Bar

The connection header bar sits at the top of the main content area, showing details about the currently selected connection.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● api-server    |    node    |    connected (2ms)    |    ◐  theme     │
│                                                                          │
│  Ports: 24   Resolved: 18/24   Errors: 2   Libraries: 3                │
└──────────────────────────────────────────────────────────────────────────┘
```

**Header details**:

- **Top row**: App name (monospace, `--hex-font-size-lg`, `--hex-font-weight-semibold`), app type badge, connection status with latency, theme toggle button (right-aligned).
- **Bottom row**: Quick stats from the unified snapshot: port count, resolved count, error count, registered library count. Each stat uses `--hex-text-secondary` label and `--hex-text-primary` value at `--hex-font-size-sm`.
- When no connection is selected: "Select a connection from the sidebar" centered in `--hex-text-muted`.

### 14.4 Overview Panel

The Overview panel is the default landing view when a connection is selected, showing a bird's-eye summary.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  CONTAINER                                                   [Refresh]  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Phase        │ │ Ports        │ │ Resolved     │ │ Errors       │  │
│  │  running     │ │  24          │ │  18 / 24     │ │  2 ports     │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                          │
│  LIBRARIES (3 registered)                                                │
│  ┌──────────────────────────────────────┐ ┌─────────────────────────┐   │
│  │ Flow                                 │ │ Tracing                 │   │
│  │ Machines: 3       Health Events: 2   │ │ Total Spans: 1,247     │   │
│  └──────────────────────────────────────┘ └─────────────────────────┘   │
│  ┌──────────────────────────────────────┐                                │
│  │ Store                                │                                │
│  │ Stores: 5         Subscribers: 12    │                                │
│  └──────────────────────────────────────┘                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Overview details**:

- **Container stat cards row**: Four summary cards in a horizontal flex row. Each card shows a label (`--hex-text-secondary`, `--hex-font-size-sm`) and a value (`--hex-text-primary`, `--hex-font-size-lg`, `--hex-font-weight-semibold`). Data source: `remoteInspector.getUnifiedSnapshot()`. Clicking the container section navigates to the Container panel.
- **Library summary cards**: Two-column grid of library cards. Each card shows the library name (`--hex-font-weight-semibold`) and two headline metrics. Card background: `--hex-bg-secondary`. Clicking a library card navigates to that library's panel. Data source: `remoteInspector.getUnifiedSnapshot().libraries`.
- **Refresh button**: Top-right corner, forces re-query over WebSocket.

### 14.5 Graph Panel

The dependency graph view renders all ports as nodes and their dependency relationships as directed edges. Nodes are color-coded by lifetime.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  [+]  [-]  [Fit]                        Search graph...           │  │
│  │ ────────────────────────────────────────────────────────────────── │  │
│  │                                                                    │  │
│  │              ┌────────────────┐                                    │  │
│  │              │  ConfigService │  (indigo, singleton)               │  │
│  │              └───────┬────────┘                                    │  │
│  │                ┌─────┴──────┐                                      │  │
│  │                │            │                                      │  │
│  │        ┌───────▼──────┐  ┌─▼────────────┐                         │  │
│  │        │  AuthService │  │   UserRepo    │  (green, scoped)       │  │
│  │        └───────┬──────┘  └──────┬────────┘                         │  │
│  │                │                │                                   │  │
│  │                └────────┬───────┘                                   │  │
│  │                         │                                          │  │
│  │                ┌────────▼────────┐                                  │  │
│  │                │  PaymentPort    │  (indigo, singleton)  14% err   │  │
│  │                └─────────────────┘                                  │  │
│  │                                                                    │  │
│  │  Legend:  ● singleton   ● scoped   ● transient   ◻ inherited  ◼ own│  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  Selected: PaymentPort │ singleton │ deps: AuthService, UserRepo  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Graph area details**:

- **Toolbar** (top of graph area): Zoom in (`+`), zoom out (`-`), fit to view (`Fit`) buttons on the left. Search input on the right to highlight matching nodes. Buttons use `--hex-bg-secondary` with `--hex-border`.
- **Canvas**: Background `--hex-bg-primary`. Nodes are rounded rectangles (120px x 36px, `--hex-radius-sm`) with fill color based on lifetime. Node label is centered, monospace, `--hex-font-size-sm`. Edges are directed arrows (solid lines, `--hex-border` color, 1.5px stroke).
- **Node states**: Default (lifetime fill at 80% opacity), hover (full opacity, thicker border), selected (full opacity, `--hex-accent` border ring), error (red bottom border or error badge). Inherited nodes use dashed borders; own nodes use solid borders.
- **Legend**: Inline at bottom of graph canvas. Colored dots with lifetime labels. Origin indicators (dashed vs solid squares).
- **Detail bar**: Fixed strip at the bottom of the graph area. Shows selected node details: port name, lifetime, dependency list, error rate, factory kind, origin. Only visible when a node is selected. Data source: `remoteInspector.getGraphData()`.

### 14.6 Scopes Panel (Split View)

The Scopes panel uses a master-detail split layout: a tree view of scopes on the left, and scope detail on the right.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌───────────────────────────────┬────────────────────────────────────┐  │
│  │  Scope Tree                   │  Scope Detail                     │  │
│  │                               │                                   │  │
│  │  ▼ root-scope (active)        │  ID:       root-scope             │  │
│  │    ├─ ▶ req-scope-1 (active)  │  Status:   active                 │  │
│  │    ├─ ▼ req-scope-2 (active)  │  Resolved: 3 / 8                  │  │
│  │    │    └─ ▶ child-1 (active) │                                   │  │
│  │    └─ ▶ req-scope-3 (disposed)│  Resolved Ports:                  │  │
│  │                               │  ● SessionService    (scoped)     │  │
│  │                               │  ● RequestContext     (scoped)    │  │
│  │                               │  ● UserRepo           (scoped)    │  │
│  │                               │                                   │  │
│  │                               │  Inherited Singletons: 5          │  │
│  │                               │                                   │  │
│  └───────────────────────────────┴────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Scope tree (left pane)**:

- Indented tree using `ChevronRight`/`ChevronDown` expand/collapse icons.
- Each node shows: scope ID (monospace, truncated with ellipsis at 20 chars) and status badge ("active" in `--hex-success`, "disposed" in `--hex-text-muted` with strikethrough).
- Selected node has `--hex-bg-active` background.
- Nested scopes are indented by `--hex-space-lg` per level with connecting tree lines (`--hex-border` color, 1px).
- Data source: `remoteInspector.getScopeTree()`, which returns a recursive `ScopeTree` structure.

**Scope detail (right pane)**:

- Shows metadata for the selected scope: ID, status, resolved count / total count.
- Lists resolved port names as a vertical list with lifetime dot indicators.
- Data source: `ScopeTree.resolvedPorts`, `ScopeTree.resolvedCount`, `ScopeTree.totalCount`.

**Split divider**: Vertical, draggable. Default split: 35% / 65%. Min pane width: 200px.

### 14.7 Events Panel (Scrolling Log)

The Events panel shows a real-time feed of all `InspectorEvent` emissions streamed via WebSocket. New events appear at the bottom.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Filter events...       Source: [All ▾]   [Clear]   [Auto: ON]   │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  Time       Type                Source     Details                │  │
│  │  ────────── ─────────────────── ────────── ────────────────────── │  │
│  │  12:04:01   resolution          container  AuthService (12ms)    │  │
│  │  12:04:01   resolution          container  ConfigService (2ms)   │  │
│  │  12:04:02   scope-created       container  req-scope-1           │  │
│  │  12:04:02   result:ok           container  AuthService           │  │
│  │  12:04:03   result:err          container  PaymentPort           │  │
│  │  12:04:03   library             flow       state-changed         │  │
│  │  12:04:04   library             store      action-dispatched     │  │
│  │ ▼12:04:05   result:err          container  PaymentPort           │  │
│  │  │  { portName: "PaymentPort",                                    │  │
│  │  │    errorCode: "PAY_REFUSED",                                   │  │
│  │  │    timestamp: 1707484245123 }                                  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Event log details**:

- **Toolbar**: Text filter input (left), source dropdown filter ("All", "container", or library names), "Clear" button to wipe the log, auto-scroll toggle button (right).
- **Event rows**: Each row shows timestamp (monospace, `--hex-font-size-xs`, relative "HH:MM:SS" format), event type (monospace, color-coded -- `resolution` in `--hex-info`, `result:ok` in `--hex-success`, `result:err` in `--hex-error`, `library` in `--hex-accent`, scope events in `--hex-text-secondary`), source ("container" or library name), and a single-line detail summary.
- **Expanded row**: Clicking a row expands it to show the full event payload as formatted JSON with syntax highlighting. Expand indicator is a `ChevronRight`/`ChevronDown`.
- **Buffer**: Maximum 1000 events retained per connection. Oldest events are evicted when the buffer is full. A notice appears: "Showing last 1000 events."
- Data source: Events arrive via WebSocket stream from the connected app's `remoteInspector.subscribe()`.

### 14.8 Trace Panel (Timeline)

The Trace panel shows resolution timing data as a horizontal timeline, visualizing which services were resolved, how long each took, and cache hit/miss status.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Total Spans  │ │ Avg Duration │ │ Cache Hits   │ │ Errors       │  │
│  │  47          │ │  8.2ms       │ │  72%         │ │  3           │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │   Port Name          0ms   5ms   10ms   15ms   20ms   25ms       │  │
│  │   ─────────────────── ──────┼──────┼──────┼──────┼──────┼──────  │  │
│  │   ConfigService       ██░░░░░░░░░░░░░░░░░░░░░░░░░░░  2ms (cache)│  │
│  │   AuthService         ████████████░░░░░░░░░░░░░░░░░  12ms       │  │
│  │   UserRepo            █████████████████░░░░░░░░░░░░  18ms       │  │
│  │   PaymentPort         ███████████████████████░░░░░░  24ms  !!   │  │
│  │   SessionService      ██████░░░░░░░░░░░░░░░░░░░░░░  6ms (cache) │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Trace timeline details**:

- **Summary cards**: Total spans, average duration, cache hit rate, error count. Data source: `useRemoteTracingSummary()` hook (reads from the "tracing" library inspector via WebSocket).
- **Timeline rows**: Each row shows a port name (left column, fixed width, monospace) and a horizontal bar (right area). Bar length is proportional to resolution duration. Bars are colored by lifetime. Cache hits use a lighter/striped fill. Error resolutions have a red right-edge marker.
- **Time axis**: Horizontal axis at the top with tick marks at regular ms intervals. Scale adjusts based on the maximum observed duration.
- **Hover**: Hovering a bar shows a tooltip with exact duration, cache hit/miss, error code if applicable.
- **Empty state**: When no tracing library inspector is registered, shows: "Tracing not enabled. Register a tracing library inspector to see resolution timelines."

### 14.9 Libraries Panel (Tree View)

The Libraries panel shows registered library inspectors and their domain-specific snapshot data as expandable JSON trees.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Registered Libraries (3)                         Search...       │  │
│  │ ────────────────────────────────────────────────────────────────── │  │
│  │                                                                    │  │
│  │  ▼ flow                                                           │  │
│  │    ├─ machineCount: 3                                             │  │
│  │    ├─ ▼ machines:                                                 │  │
│  │    │    ├─ ▼ "taskFlow":                                          │  │
│  │    │    │    ├─ state: "loading"                                   │  │
│  │    │    │    ├─ context: { taskId: 42, ... }                      │  │
│  │    │    │    └─ activitiesCount: 2                                 │  │
│  │    │    └─ ▶ "authFlow": { ... }                                  │  │
│  │    └─ runnerCount: 2                                              │  │
│  │                                                                    │  │
│  │  ▶ store                                                          │  │
│  │  ▶ tracing                                                        │  │
│  │                                                                    │  │
│  │  ──────────────────────────────────────────────────────────────── │  │
│  │  No libraries?  Libraries register via inspector.registerLibrary()│  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Libraries panel details**:

- **Header**: Shows count of registered libraries. Search input filters by library name or key path.
- **Library sections**: Each registered library is a collapsible section. Header shows library name (monospace, `--hex-font-weight-semibold`). Chevron on the left to expand/collapse.
- **Snapshot tree**: The library's `getSnapshot()` return value rendered as an expandable JSON tree. Keys in `--hex-text-secondary`, string values in `--hex-success`, number values in `--hex-info`, boolean values in `--hex-accent`, null/undefined in `--hex-text-muted`. Objects/arrays show a collapsed preview ("{ ... }" or "[3 items]") when collapsed.
- **Empty state**: When no libraries are registered, a help message explains how to register: "Libraries register via `inspector.registerLibrary(lib)`".
- Data source: `remoteInspector.getLibraryInspectors()` for the list, each `LibraryInspector.getSnapshot()` for content (serialized over WebSocket).

### 14.10 Health & Diagnostics Panel

The Health panel aggregates diagnostic signals from across the nervous system into a single scrollable view.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  GRAPH HEALTH                                                     │  │
│  │  ┌─────────────────┐ ┌────────────────────────────────────────┐   │  │
│  │  │  Complexity: 42  │ │  SAFE                                 │   │  │
│  │  │  ████████░░░░░░  │ │  24 adapters | depth 4 | fan-out 2.1 │   │  │
│  │  └─────────────────┘ │  3 suggestions | 0 orphans             │   │  │
│  │                       └────────────────────────────────────────┘   │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  BLAST RADIUS                      Port: [PaymentGateway ▾]      │  │
│  │  ─────────────────────────────────────────────────────────────    │  │
│  │  Direct: OrderService, CheckoutService, RefundService (3)        │  │
│  │  Transitive: + CartService, ReceiptService, ... (7)              │  │
│  │  Libraries: Flow (2 machines), Saga (1 step)                     │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  SCOPE LEAKS                                                      │  │
│  │  ─────────────────────────────────────────────────────────────    │  │
│  │  !! request-abc: active 8m 32s (> 5m threshold)                  │  │
│  │  !! request-def: 142 children (> 100 threshold)                  │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  ERROR HOTSPOTS                                                   │  │
│  │  ─────────────────────────────────────────────────────────────    │  │
│  │  * PaymentGateway  14%  PAYMENT_TIMEOUT (2m ago)  12 spans       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Health panel details**:

- **Graph Health summary bar**: Complexity gauge on the left (horizontal bar fill, `--hex-success` for safe, `--hex-warning` for monitor, `--hex-error` for consider-splitting). Recommendation badge to the right. Stats row below uses `--hex-text-secondary` at `--hex-font-size-sm`.
- **Blast radius section**: Port dropdown selector (`--hex-bg-secondary`, `--hex-border`). Dependent lists use `--hex-font-mono` for port names. Cross-library impact uses `--hex-accent` for library names.
- **Scope leak alerts**: Each alert is a row with `--hex-warning-muted` background, `--hex-warning` left border (3px). Scope ID in `--hex-font-mono`, clickable (cursor: pointer).
- **Error hotspot rows**: Each row has a `--hex-error` left border (3px). Port name in `--hex-font-mono`, `--hex-font-weight-semibold`. Error rate in `--hex-error` color. Last error code and tracing span count in `--hex-text-secondary`.
- **Section dividers**: 1px `--hex-border` horizontal rules between sections.
- Data sources: `remoteInspector.getGraphData()`, `remoteInspector.getScopeTree()`, `remoteInspector.getHighErrorRatePorts(0.05)`, `remoteInspector.getResultStatistics()`.

### 14.11 Library-Specific Panel Wireframes

The following wireframes show the dedicated library panels that replace the generic JSON tree viewer when a library provides a `panelModule`. These panels are shipped by each library package, not by `@hex-di/devtools`.

#### 14.11.1 Flow Panel (Statechart)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────────────┬────────────────────────────────────────────┐   │
│  │ MACHINES             │ STATECHART: OrderFlow                     │   │
│  │                      │                                            │   │
│  │ ● OrderFlow         │      ┌────────┐                           │   │
│  │   state: processing │      │  idle  │                           │   │
│  │                      │      └───┬────┘                           │   │
│  │ ○ CartFlow          │          │ start                          │   │
│  │   state: idle       │      ┌───▼──────┐    ┌──────────┐        │   │
│  │                      │      │processing├───►│ complete │        │   │
│  │ ○ AuthFlow          │      └───┬──────┘    └──────────┘        │   │
│  │   state: authed     │          │ error                          │   │
│  │                      │      ┌───▼──────┐                        │   │
│  │                      │      │  failed  │                        │   │
│  │                      │      └──────────┘                        │   │
│  ├──────────────────────┤                                            │   │
│  │ TRANSITIONS          │ Current: processing (2.4s)                │   │
│  │ 14:30 processing    │ Activities: [payment-poll]                │   │
│  │ 14:29 validating    │ Effects: processPayment 4ok/1err         │   │
│  │ 14:28 idle→start    │                                            │   │
│  └─────────────────────┴────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Flow panel details**:

- **Machine list (left pane)**: Each machine shows a status dot (green=healthy, amber=degraded, red=error), machine name in `--hex-font-mono`, and current state. Selected machine has `--hex-bg-active` background.
- **Statechart (right pane)**: SVG visualization of the selected machine's state diagram. States are rounded rectangles. Current state has `--hex-accent` fill. Transitions are arrows labeled with event names. Initial state has an inbound arrow from a filled dot.
- **Transition log**: Chronological list of recent transitions, styled like the Event Log panel rows.
- **Effect statistics**: Table showing ok/err counts per effect, using `--hex-success` and `--hex-error` colors.
- Data source: `FlowLibrarySnapshot` via `panelModule: "@hex-di/flow/devtools"`.

#### 14.11.2 Query Panel (Cache Table)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Queries      │ │ Cache Size   │ │ Hit Rate     │ │ Stale        │  │
│  │  12          │ │  847 KB      │ │  78%         │ │  3 queries   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Key           Status    Updated    Stale    Cached   Actions     │  │
│  │  ─────────────────────────────────────────────────────────────── │  │
│  │  /api/users    success   2s ago     fresh    ✓        [Refetch]  │  │
│  │  /api/orders   loading   --         --       --       [Cancel]   │  │
│  │  /api/auth     error     5m ago     stale    ✓        [Refetch]  │  │
│  │  /api/cart     success   30s ago    stale    ✓        [Refetch]  │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  Selected: /api/users                                              │  │
│  │  Data: { users: [...], total: 42, page: 1 }                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Query panel details**:

- **Summary cards row**: Query count, cache size, cache hit rate, stale query count. Same card style as Container panel summary.
- **Cache table**: Sortable columns. Status column color-coded: `success` in `--hex-success`, `loading` in `--hex-info`, `error` in `--hex-error`, `idle` in `--hex-text-muted`. Stale column: "fresh" in `--hex-success`, "stale" in `--hex-warning`.
- **Actions column**: "Refetch" button (sends command to client via WebSocket), "Cancel" for loading queries.
- **Detail pane**: Expandable below the table when a row is selected. Shows the full query data as a JSON tree using the same tree renderer from the Libraries panel.
- Data source: `QueryLibrarySnapshot` via `panelModule: "@hex-di/query/devtools"`.

#### 14.11.3 Store Panel (State Inspector)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Store: cart (5 stores)              [State] [Diff] [Actions]     │  │
│  ├───────────────────────────┬────────────────────────────────────────┤  │
│  │  ACTIONS                  │  STATE                                │  │
│  │                           │                                       │  │
│  │  14:32:05 ADD_ITEM       │  {                                    │  │
│  │  14:32:03 SET_QTY        │    items: [                           │  │
│  │  14:32:01 LOAD           │      { id: 1, name: "Widget", qty: 2}│  │
│  │  14:31:58 INIT           │      { id: 7, name: "Gadget", qty: 1}│  │
│  │                           │    ],                                 │  │
│  │ [▶ ADD_ITEM selected]    │    total: 42.99                       │  │
│  │                           │  }                                    │  │
│  └───────────────────────────┴────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Store panel details**:

- **Store selector**: Dropdown or tab bar for switching between stores when multiple are registered.
- **View mode tabs**: State (JSON tree of current state), Diff (side-by-side diff of state before/after an action), Actions (chronological action list with timestamps).
- **Action timeline (left pane)**: List of dispatched actions. Selected action highlighted with `--hex-bg-active`.
- **State viewer (right pane)**: JSON tree renderer. In Diff mode: added properties in `--hex-success`, removed in `--hex-error`, changed in `--hex-warning`.
- Data source: `StoreLibrarySnapshot` via `panelModule: "@hex-di/store/devtools"`.

#### 14.11.4 Saga Panel (Pipeline)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Saga: order-1 (running)                                           │  │
│  │                                                                    │  │
│  │  FORWARD PIPELINE                                                  │  │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │  │
│  │  │ validate │──►│ reserve  │──►│ payment  │──►│ shipping │      │  │
│  │  │    ✓     │   │    ✓     │   │   ◉ 2.4s │   │    ○     │      │  │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘      │  │
│  │                                                                    │  │
│  │  COMPENSATION TRACK (not triggered)                                │  │
│  │  ┌──────────┐   ┌──────────┐                                      │  │
│  │  │unreserve │◄──│  refund  │                                      │  │
│  │  │    ○     │   │    ○     │                                      │  │
│  │  └──────────┘   └──────────┘                                      │  │
│  │                                                                    │  │
│  │  Step: payment | Status: running | Retries: 0/3 | Elapsed: 2.4s  │  │
│  │  Port: PaymentGateway                                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Saga panel details**:

- **Pipeline visualization**: Horizontal sequence of step boxes connected by arrows. Each step shows its label and a status indicator: ✓ (completed, `--hex-success`), ◉ (running, `--hex-info`), ○ (pending, `--hex-text-muted`), ✗ (failed, `--hex-error`).
- **Compensation track**: Reverse pipeline shown below, dimmed when not triggered. Activated during compensating/failed saga states.
- **Step detail bar**: Below the pipeline, shows the selected step's status, retry count, elapsed time, and associated port name. Port name is clickable (cross-panel navigation to Container).
- Data source: `SagaLibrarySnapshot` via `panelModule: "@hex-di/saga/devtools"`.

#### 14.11.5 Logger Panel (Log Stream)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │
│  │ Total        │ │ Errors       │ │ Rate         │  [sparkline ▂▃▅▂] │
│  │  8,412       │ │  24 (0.3%)   │ │  ~12/s       │                    │
│  └──────────────┘ └──────────────┘ └──────────────┘                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  [Level: all ▾]  [Source: all ▾]  Search...        [Auto: ON]     │  │
│  │ ────────────────────────────────────────────────────────────────── │  │
│  │  14:32:05  INFO   OrderService    Order created: #1234            │  │
│  │  14:32:04  DEBUG  PaymentSvc      Processing payment...           │  │
│  │  14:32:03  ERROR  PaymentSvc      Payment timeout: PAY_001       │  │
│  │  ▼14:32:03  (expanded)                                            │  │
│  │  │  { errorCode: "PAY_001", duration: 5002, retries: 3 }         │  │
│  │  14:32:02  WARN   CacheManager    Cache miss ratio high: 34%     │  │
│  │  14:32:01  INFO   AuthService     User authenticated: u-789      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Logger panel details**:

- **Summary cards + sparkline**: Total log entries, error count with percentage, approximate log rate. An error-rate sparkline (tiny inline chart) shows the error rate over the last 60 seconds.
- **Log stream**: Virtual-scrolled list of log entries. Level badge color: ERROR in `--hex-error`, WARN in `--hex-warning`, INFO in `--hex-text-primary`, DEBUG in `--hex-text-muted`. Source in `--hex-text-secondary`.
- **Filters**: Level dropdown (ERROR, WARN, INFO, DEBUG, all), source dropdown (dynamically populated), text search. Same interaction patterns as the Event Log panel.
- **Expanded row**: Click to expand and see structured data as JSON tree.
- **Auto-scroll**: Same behavior as the Event Log panel.
- Data source: `LoggerLibrarySnapshot` via `panelModule: "@hex-di/logger/devtools"`.

---

## 15. Interaction Patterns

This section defines all user interactions, animations, keyboard behavior, and accessibility requirements for the devtools dashboard.

### 15.1 Sidebar Resize

**Drag handle**:

- Located at the right edge of the sidebar, 4px wide, full height.
- Cursor: Changes to `ew-resize` on hover over the handle area.

**Resize mechanics**:

- Mouse down on drag handle begins resize mode.
- Mouse move adjusts sidebar width. Width = mouse X position.
- Mouse up ends resize mode.
- Minimum width: `--hex-sidebar-min` (`180px`). The sidebar will not shrink below this.
- Maximum width: `--hex-sidebar-max` (`400px`).
- During resize, a subtle overlay is applied to the main content to prevent iframe/canvas interference with mouse events.

**Persistence**: Sidebar width is persisted to `localStorage` under the key `hex-devtools-sidebar-width`. On next dashboard load, the sidebar restores to the persisted width. If no persisted value exists, default is `--hex-sidebar-width` (`240px`).

**Touch support**: The drag handle also responds to touch events (`touchstart`, `touchmove`, `touchend`) with the same mechanics.

### 15.2 Connection Selection

**Selecting a connection**:

- Click a connection in the sidebar connection list to select it as active.
- The selected connection gets `--hex-bg-active` background and a `--hex-accent` left border (3px).
- The main content area immediately updates to show data from the selected connection's `RemoteInspectorAPI`.
- The active panel is preserved when switching connections (e.g., if viewing Graph for app A, switching to app B keeps the Graph panel active).

**Auto-selection**:

- When the first connection is established, it is automatically selected.
- When the active connection disconnects, the dashboard automatically selects the next available connected app (if any). If none remain, the main content shows the "no connection" empty state.

**Connection status transitions**:

- `connected` → `stale`: When no WebSocket messages received for 5 seconds, the status dot transitions from green to amber over `--hex-transition-fast`.
- `stale` → `connected`: When a message is received, the dot transitions back to green.
- `connected`/`stale` → `disconnected`: When the WebSocket closes, the dot transitions to red. The connection row fades to 60% opacity.
- `disconnected` → `connected`: When auto-reconnect succeeds, the dot transitions back to green and opacity restores.

### 15.3 Panel Navigation

**Behavior**: Instant switch. No crossfade or slide animation.

- Clicking a panel nav item in the sidebar immediately unmounts the previous panel content and mounts the new panel content.
- The active nav item receives `--hex-accent` text color, `--hex-accent-muted` background, and a `--hex-accent` left border (3px).
- Inactive nav items have `--hex-text-secondary` color and transparent background.
- Hover on inactive nav items shows `--hex-bg-hover` background.

**Panel state**: Each panel's scroll position and internal UI state (expanded tree nodes, selected items, search text) is preserved in memory while the panel is unmounted. When the user returns to a panel, the state is restored. This is accomplished by keeping panel state in the parent component, not in each panel.

**Persistence**: The active panel name is persisted to `localStorage` under the key `hex-devtools-active-panel`. On next dashboard load, the last active panel is restored.

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
- Default sort for the Container panel port table: alphabetical by port name.

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

- Enabled by default. New events (arriving via WebSocket) cause the log to scroll to the bottom.
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

**Clear**: The "Clear" button empties the event buffer and resets the view. A confirmation is not required (the action is non-destructive since events continue flowing via WebSocket).

**Performance**: The event log virtualizes its row list. Only visible rows (plus a buffer of 10 above and below the viewport) are rendered in the DOM, regardless of total event count.

### 15.8 Accessibility

The devtools dashboard is built for keyboard-first developer workflows. All interactive elements are accessible.

**Focus management**:

- On initial load, focus is placed on the first connection in the sidebar (if any), or the first panel nav item.
- Sidebar and main content are separate focus regions. `Tab` moves between the sidebar and main content. Within each region, arrow keys navigate between items.

**ARIA roles and attributes**:

- Connection list: `role="listbox"` on the container, `role="option"` on each connection item with `aria-selected`.
- Panel navigation: `role="navigation"` on the sidebar nav, `aria-current="page"` on the active panel link.
- Panel content: `role="region"` with `aria-label` matching the panel name (e.g., `aria-label="Graph Panel"`).
- Tree views: `role="tree"` on the container, `role="treeitem"` on each node, `aria-expanded` on expandable nodes.
- Tables: Native `<table>`, `<thead>`, `<tbody>`, `<th>` (with `scope="col"`), `<td>` elements. Sort state indicated via `aria-sort` on `<th>`.
- Event log: `role="log"` with `aria-live="polite"` (or `"off"` when auto-scroll is paused).
- Theme toggle: `aria-label="Switch to light/dark theme"`.

**Keyboard shortcuts**:

- `1`-`8` (number keys): Switch to panel by index (1=Overview, 2=Container, etc.) when focus is not in a text input.
- `Ctrl+K` / `Cmd+K`: Focus the search input in the current panel (if one exists).
- `Tab` / `Shift+Tab`: Navigate between sidebar and main content regions.
- Arrow keys: Navigate within connection list, panel nav, trees, and tables (see Sections 15.5 and 15.6).
- Panel-specific shortcuts are scoped to the active panel.

**Reduced motion**: As described in Section 13.1.11, all animations and transitions respect the `prefers-reduced-motion` media query. When reduced motion is preferred, graph fit-to-view snaps without animation, hover transitions are instant, and no pulsing effects occur.

**Color contrast**: All text/background combinations meet WCAG 2.1 AA minimum contrast ratios (4.5:1 for normal text, 3:1 for large text). The light theme uses dark text on light backgrounds; the dark theme uses light text on dark backgrounds. Semantic colors (success, warning, error) are chosen to maintain sufficient contrast in both themes.

**Screen readers**: The devtools dashboard is an auxiliary developer tool and is not critical-path UI. It uses `aria-label`, `aria-describedby`, and `role` attributes to be navigable by screen readers, but it does not need to meet AAA compliance. Focus management and keyboard navigation are the primary accessibility vectors.

---

> Previous: [04-data-layer.md](./04-data-layer.md) | Next: [06-api-reference.md](./06-api-reference.md)
