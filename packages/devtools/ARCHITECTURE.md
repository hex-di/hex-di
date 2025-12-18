# DevTools Architecture Documentation

## Overview

The HexDI DevTools is a unified development tools system that provides visualization and debugging capabilities for dependency injection containers. It supports both browser (DOM) and terminal (TUI) environments through a platform-agnostic architecture.

## Package Structure

```
@hex-di/devtools
├── /dom               → Browser-specific entry point
├── /tui               → Terminal-specific entry point
└── (shared)           → Common components, state, presenters

@hex-di/devtools-core
└── Pure types, transforms, protocol (zero framework dependencies)
```

## Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Application Layer                              │
│  react-showcase/App.tsx                                                │
│  └─> <FloatingDevTools graph={graph} container={container} />         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DOM Container Layer                              │
│  packages/devtools/src/dom/FloatingDevTools.tsx                       │
│                                                                        │
│  Responsibilities:                                                     │
│  - Floating panel chrome (drag, resize, fullscreen)                   │
│  - Header bar with close/fullscreen buttons                           │
│  - Position management (bottom-right, etc.)                           │
│  - LocalStorage persistence                                            │
│  - CSS variable injection (design tokens)                             │
│  - WebSocket relay connection for TUI sync                            │
│  - Wraps DevToolsPanel with PrimitivesProvider                        │
│                                                                        │
│  Key Styles:                                                           │
│  - headerStyle: padding, gap, backgroundColor                         │
│  - buttonStyle: width, height, fontSize                               │
│  - panelStyle: position, dimensions, border                           │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Shared Headless Component Layer                     │
│  packages/devtools/src/components/DevToolsPanel.tsx                   │
│                                                                        │
│  Responsibilities:                                                     │
│  - Platform-agnostic panel structure                                  │
│  - Header with app name and version                                   │
│  - Tab bar with Graph/Services/Tracing/Inspector tabs                 │
│  - Content area for active tab view                                   │
│  - Footer with connection status                                      │
│                                                                        │
│  Uses primitives: Box, Text, Icon, Button, Divider                    │
│  Receives: viewModel (PanelViewModel) from presenter                  │
│  Emits: onTabChange, onClose, onToggleFullscreen                      │
│                                                                        │
│  Structure:                                                            │
│  ┌─────────────────────────────────────────┐                          │
│  │ Header: App Name + Version              │ padding="md" gap="lg"    │
│  ├─────────────────────────────────────────┤                          │
│  │ Tab Bar: GRAPH | SERVICES | TRACING...  │ padding="md" gap="lg"    │
│  ├─────────────────────────────────────────┤                          │
│  │ Content Area: {children}                │                          │
│  ├─────────────────────────────────────────┤                          │
│  │ Footer: HexDI version + connection      │                          │
│  └─────────────────────────────────────────┘                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Primitives Layer                                │
│  packages/devtools/src/dom/primitives.tsx (DOM implementation)        │
│  packages/devtools/src/tui/primitives.tsx (TUI implementation)        │
│                                                                        │
│  Exports: DOMPrimitives (or TUIPrimitives)                            │
│  ├── Box: <div> with flexbox layout                                   │
│  ├── Text: <span> with semantic colors                                │
│  ├── Button: <button> with variants                                   │
│  ├── Icon: Unicode characters with sizes                              │
│  ├── ScrollView: <div> with overflow                                  │
│  ├── Divider: <hr> styled element                                     │
│  ├── GraphRenderer: D3/SVG visualization                              │
│  ├── FlameGraph: Performance visualization                            │
│  ├── TimelineScrubber: Snapshot navigation                            │
│  ├── DiffView: Snapshot comparison                                    │
│  ├── ContainerTree: Container hierarchy                               │
│  ├── PerformanceBadge: Duration indicator                             │
│  └── styleSystem: DOMStyleSystem                                      │
│                                                                        │
│  SPACING_PX: Defines actual pixel values                              │
│  ┌─────────────────────────────────────────┐                          │
│  │ none: "0px"                             │                          │
│  │ xs:   "8px"   ← used for tight gaps     │                          │
│  │ sm:   "12px"  ← used for small padding  │                          │
│  │ md:   "20px"  ← used for standard       │                          │
│  │ lg:   "28px"  ← used for section gaps   │                          │
│  │ xl:   "40px"  ← used for large sections │                          │
│  └─────────────────────────────────────────┘                          │
│                                                                        │
│  VARIANT_STYLES: Typography definitions                               │
│  ┌─────────────────────────────────────────┐                          │
│  │ body:      14px, 400 weight             │                          │
│  │ heading:   20px, 600 weight             │                          │
│  │ subheading:16px, 600 weight             │                          │
│  │ caption:   12px, 500 weight             │                          │
│  │ code:      13px, monospace              │                          │
│  │ label:     11px, 600, UPPERCASE         │                          │
│  └─────────────────────────────────────────┘                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Design Tokens Layer                                │
│  packages/devtools/src/design-tokens.ts                               │
│                                                                        │
│  CSS Custom Properties injected at runtime:                           │
│  --hex-devtools-bg:           #1a1b26 (dark background)               │
│  --hex-devtools-bg-secondary: #24283b (header background)             │
│  --hex-devtools-text:         #c0caf5 (foreground text)               │
│  --hex-devtools-text-muted:   #7982a9 (secondary text)                │
│  --hex-devtools-border:       #3b4261 (borders)                       │
│  --hex-devtools-primary:      #7aa2f7 (accent blue)                   │
│  --hex-devtools-accent:       #bb9af7 (secondary purple)              │
│  --hex-devtools-success:      #9ece6a (green)                         │
│  --hex-devtools-warning:      #e0af68 (yellow)                        │
│  --hex-devtools-error:        #f7768e (red)                           │
│                                                                        │
│  Functions:                                                            │
│  - generateCSSVariables(theme) → Record<string, string>               │
│  - injectCSSVariables(theme)   → sets on document.documentElement     │
│  - removeCSSVariables()        → cleanup                              │
└────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Sources                                │
│                                                                     │
│  LocalDataSource (browser)     RemoteDataSource (TUI client)       │
│  └── Reads from Graph/Container    └── Receives via WebSocket     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Presenters                                  │
│                                                                     │
│  PanelPresenter      → PanelViewModel (appName, tabs, connection)  │
│  GraphPresenter      → GraphViewModel (nodes, edges, selection)    │
│  ServicesPresenter   → ServicesViewModel (services, sorting)       │
│  TimelinePresenter   → TimelineViewModel (traces, stats)           │
│  InspectorPresenter  → InspectorViewModel (details, dependencies)  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Shared Headless Components                     │
│                                                                     │
│  DevToolsPanel  GraphView  ServicesView  TimelineView  InspectorView│
│                                                                     │
│  All use: usePrimitives() → { Box, Text, Icon, ... }               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Platform Primitives                            │
│                                                                     │
│  DOM: DOMPrimitives (React DOM elements)                           │
│  TUI: TUIPrimitives (OpenTUI elements)                             │
│                                                                     │
│  Both implement RenderPrimitives interface                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Render Pipeline (DOM)

### 1. FloatingDevTools Mounts

```typescript
// packages/devtools/src/dom/FloatingDevTools.tsx

// Inject CSS custom properties for theming
injectCSSVariables("dark");

// Create data source from graph/container
const dataSource = new LocalDataSource(graph, container);

// Create presenters
const panelPresenter = new PanelPresenter(dataSource);
const graphPresenter = new GraphPresenter(dataSource);
// ... other presenters

// Setup WebSocket relay for TUI sync
const hostClient = new DevToolsHostClient({ url, appId, appName, appVersion });
```

### 2. DevToolsPanel Renders

```typescript
// packages/devtools/src/components/DevToolsPanel.tsx

// Get platform primitives via hook
const { Box, Text, Icon, Divider } = usePrimitives();

// Render header with semantic spacing tokens
<Box padding="md" gap="lg">
  <Text variant="heading" color="foreground">{viewModel.appName}</Text>
  <Text variant="caption" color="muted">v{viewModel.appVersion}</Text>
</Box>
```

### 3. Primitives Resolve Tokens

```typescript
// packages/devtools/src/dom/primitives.tsx

// Box resolves spacing tokens to pixels
const style = {
  padding: SPACING_PX[padding],  // "md" → "20px"
  gap: SPACING_PX[gap],          // "lg" → "28px"
};

// Text resolves colors via StyleSystem
const color = DOMStyleSystem.getColor("foreground");
// Returns: "var(--hex-devtools-text)"
// Which resolves to: #c0caf5
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `dom/FloatingDevTools.tsx` | Browser floating panel container |
| `dom/primitives.tsx` | DOM primitive implementations |
| `dom/graph-renderer.tsx` | D3/SVG graph visualization |
| `tui/primitives.tsx` | Terminal primitive implementations |
| `tui/TuiDevTools.tsx` | Terminal DevTools interface |
| `components/DevToolsPanel.tsx` | Shared headless panel |
| `components/GraphView.tsx` | Shared graph view |
| `components/ServicesView.tsx` | Shared services list |
| `components/TimelineView.tsx` | Shared trace timeline |
| `components/InspectorView.tsx` | Shared service inspector |
| `presenters/*.ts` | Business logic presenters |
| `view-models/*.ts` | Immutable view model types |
| `data-source/*.ts` | Data access abstractions |
| `design-tokens.ts` | CSS custom property definitions |
| `ports/render-primitives.port.ts` | Primitives interface contract |

## Styling System

### Spacing Tokens

Components use semantic spacing tokens that resolve to platform-specific values:

```typescript
// Usage in components
<Box padding="md" gap="lg">

// Resolved in DOM primitives
SPACING_PX = {
  none: "0px",
  xs: "8px",
  sm: "12px",
  md: "20px",
  lg: "28px",
  xl: "40px"
}
```

### Color Tokens

Components use semantic color names that resolve to CSS variables:

```typescript
// Usage in components
<Text color="foreground">
<Text color="muted">
<Icon color="primary">

// Resolved via DOMStyleSystem
colors = {
  foreground: "var(--hex-devtools-text)",
  muted: "var(--hex-devtools-text-muted)",
  primary: "var(--hex-devtools-primary)",
  // ...
}
```

### Typography Variants

Text components use variant names for consistent typography:

```typescript
// Usage in components
<Text variant="heading">    // 20px, 600 weight
<Text variant="label">      // 11px, 600, UPPERCASE
<Text variant="caption">    // 12px, 500 weight
<Text variant="code">       // 13px, monospace
```

## WebSocket Communication

Browser and TUI environments synchronize via WebSocket:

```
┌─────────────────┐         ┌─────────────────┐
│  Browser App    │◄───────►│  DevTools       │
│  (Host Client)  │   WS    │  Server         │
└─────────────────┘         └─────────────────┘
                                    ▲
                                    │ WS
                                    ▼
                            ┌─────────────────┐
                            │  TUI Client     │
                            │  (CLI)          │
                            └─────────────────┘
```

Messages follow JSON-RPC protocol:
- `getGraph` - Request dependency graph
- `getTraces` - Request resolution traces
- `getStats` - Request performance stats
- `pauseTracing` / `resumeTracing` - Control tracing
- `clearTraces` - Clear trace history
