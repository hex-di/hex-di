# 05 — Layout and Panels

This document specifies the playground's three-pane layout, panel integration, console output, resizable splitters, and responsive behavior.

---

## 20. Playground Layout

### 20.1 Structure

The playground uses a three-pane layout: code editor on the left, visualization panels on the right, and console output at the bottom.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Toolbar: [Examples ▾] [Run ▶] [Share 🔗] [Theme ◑] [Embed </>]  │
├─────────────────────────────┬───────────────────────────────────────┤
│                             │  [Overview] [Container] [Graph] ...  │
│   ┌──────┬────────────┐    │                                       │
│   │ File │            │    │                                       │
│   │ Tree │   Monaco   │    │       Visualization Panel             │
│   │      │   Editor   │    │       (active panel renders here)     │
│   │      │            │    │                                       │
│   │      │            │    │                                       │
│   └──────┴────────────┘    │                                       │
│                             │                                       │
├─────────────────────────────┴───────────────────────────────────────┤
│  Console Output                                                     │
│  > Container created with 5 ports                                   │
│  > Resolved LoggerPort in 0.3ms                                     │
│  ✕ Error: Missing adapter for CachePort                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 20.2 Component Hierarchy

```
PlaygroundApp
  └─ ThemeProvider (from devtools-ui)
      └─ PlaygroundProvider (playground state context)
          └─ SandboxProvider (sandbox lifecycle context)
              └─ DataSourceProvider (from devtools-ui, wraps PlaygroundInspectorBridge)
                  └─ PlaygroundLayout
                      ├─ Toolbar
                      │   ├─ ExampleDropdown
                      │   ├─ RunButton
                      │   ├─ ShareButton
                      │   ├─ ThemeToggle
                      │   └─ EmbedButton (only in full mode)
                      ├─ ResizableSplit (horizontal: editor | visualization)
                      │   ├─ EditorPane
                      │   │   ├─ FileTree (collapsible)
                      │   │   ├─ TabBar
                      │   │   └─ CodeEditor (Monaco)
                      │   └─ VisualizationPane
                      │       ├─ PanelTabBar
                      │       └─ PanelContent (active panel)
                      └─ ResizableSplit (vertical: main | console)
                          └─ ConsolePane
                              ├─ ConsoleToolbar (clear, filter)
                              └─ ConsoleOutput (scrollable list)
```

### 20.3 Default Proportions

| Split                                   | Default Ratio     | Min Size                    |
| --------------------------------------- | ----------------- | --------------------------- |
| Editor : Visualization (horizontal)     | 50% : 50%         | 300px each                  |
| Main content : Console (vertical)       | 75% : 25%         | Main: 200px, Console: 100px |
| File tree : Editor (within editor pane) | 180px : remainder | File tree: 120px min        |

Proportions are persisted to `localStorage` under the key `hex-playground-layout` and restored on next visit.

---

## 21. Editor Pane

### 21.1 Structure

The editor pane contains the file tree sidebar, tab bar, and Monaco editor as specified in [03 — Code Editor](./03-code-editor.md). This section covers the pane-level orchestration.

### 21.2 Toolbar Integration

The editor pane header contains:

- **File tree toggle**: Collapses/expands the file tree sidebar
- **Active file indicator**: Shows the path of the currently edited file
- **Diagnostics summary**: Shows error/warning count from Monaco's TypeScript language service (e.g., "2 errors, 1 warning")

### 21.3 Run Button Behavior

The "Run" button in the toolbar triggers the full execution pipeline:

1. **Disable** the Run button (prevent double-clicks)
2. **Clear** the console output
3. **Reset** the `PlaygroundInspectorBridge` (panels show loading state)
4. **Collect** all files from VirtualFS
5. **Compile** via esbuild-wasm
6. If compilation fails: show errors in console pane and as editor markers. **Re-enable** Run button.
7. If compilation succeeds: **Execute** compiled JS in Web Worker sandbox
8. Worker sends inspector data → bridge updates → panels re-render
9. Worker completes or times out → show result in console pane
10. **Re-enable** Run button

The Run button shows a spinner animation while compiling/executing.

### 21.4 State Preservation

When the user switches files, the editor pane preserves per-file state:

- Cursor position and selection
- Scroll position
- Undo/redo history (managed by Monaco per model)
- Folded regions

---

## 22. Visualization Pane

### 22.1 Panel Tab Bar

The visualization pane has a horizontal tab bar at the top showing all registered panels. Tabs display the panel label and icon, ordered by `panel.order`.

```typescript
interface PanelTabBarProps {
  readonly panels: readonly DevToolsPanel[];
  readonly activePanel: string;
  readonly onSelectPanel: (panelId: string) => void;
}
```

Tab styling matches the devtools design tokens:

- Active tab: accent border-bottom, primary text
- Inactive tab: no border, secondary text
- Hover: subtle background highlight

**Conditional panel visibility**: Some panels are only meaningful when specific library inspectors are registered. The Tracing panel, for example, is only shown when tracing data is available (matching the devtools spec behavior, Section 6.3.6). In the playground, all 7 built-in panels are always registered, but the tab bar hides panels whose data source returns `undefined` for their primary data. After a successful execution, panels become visible as their data populates.

### 22.2 Panel Content

The active panel's component is rendered with `PanelProps`:

```tsx
function PanelHost() {
  const { activePanel, panels } = usePanelState();
  const dataSource = useDataSource();
  const theme = useTheme();
  const { width, height } = useResizeObserver(containerRef);

  const panel = panels.find(p => p.id === activePanel);
  if (!panel) return <EmptyState message="No panel selected" />;

  const Panel = panel.component;
  return (
    <ErrorBoundary fallback={<PanelErrorFallback panelId={panel.id} />}>
      <Panel dataSource={dataSource} theme={theme.resolved} width={width} height={height} />
    </ErrorBoundary>
  );
}
```

Each panel is wrapped in an `ErrorBoundary` so that a rendering error in one panel does not crash the entire playground.

### 22.3 Panel State

Panel state (which panel is active) is managed by `PanelStateProvider` from devtools-ui. The playground persists the active panel to `sessionStorage` so it survives page reloads within a tab but does not conflict across tabs.

### 22.4 Empty State

Before the user runs any code, or when the sandbox produces no `InspectorAPI`, panels show an empty state:

- **Graph panel**: "Run your code to see the dependency graph"
- **Container panel**: "No container data available. Click Run to execute."
- **Scope tree panel**: "No scope data available."

The `EmptyState` component from devtools-ui is used, with a message prop customized per panel.

### 22.5 Loading State

While code is compiling/executing (between "Run" click and worker completion), panels show their previous data with a subtle loading overlay. If there is no previous data (first run), they show the empty state with a spinner.

---

## 23. Console Pane

### 23.1 Purpose

The console pane displays output from the sandbox execution: `console.log` calls, compilation errors, runtime errors, and execution status messages.

### 23.2 Console Entry Types

```typescript
type ConsoleEntry =
  | {
      readonly type: "log";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }
  | {
      readonly type: "compilation-error";
      readonly errors: readonly CompilationError[];
    }
  | {
      readonly type: "runtime-error";
      readonly error: SerializedError;
    }
  | {
      readonly type: "timeout";
      readonly timeoutMs: number;
    }
  | {
      readonly type: "status";
      readonly message: string;
      readonly variant: "info" | "success" | "error";
    };
```

### 23.3 Rendering

Each console entry is rendered as a row in a scrollable list:

- **Log entries**: Formatted arguments, colored by level (log=default, warn=amber, error=red, info=blue, debug=muted)
- **Compilation errors**: Red text with file path, line number, and error message. Clicking the file path navigates to that location in the editor.
- **Runtime errors**: Red text with error message and stack trace. Stack trace lines that reference user files are clickable and navigate to the editor.
- **Timeout**: Red text: "Execution timed out after {n}ms"
- **Status**: Colored text (info=blue, success=green, error=red)

### 23.4 Console Toolbar

The console pane has a thin toolbar with:

- **Clear button**: Removes all entries
- **Level filter**: Dropdown or toggle buttons to show/hide by level (log, warn, error, info, debug)
- **Entry count**: Shows total entries and filtered count
- **Auto-scroll indicator**: Shows whether auto-scroll is active

### 23.5 Auto-Scroll Behavior

The console auto-scrolls to the bottom when new entries arrive, unless the user has scrolled up manually. A "Jump to bottom" button appears when the user is scrolled away from the bottom.

### 23.6 Rendering Limits

To prevent performance issues from excessive console output:

- Maximum 1000 entries displayed (older entries are removed from the rendered list, newest kept)
- Long string values truncated to 10,000 characters with "... (truncated)" indicator
- Deeply nested objects truncated at depth 5 with "[Object]" placeholder

---

## 24. Resizable Splitters

### 24.1 Component

```typescript
interface ResizableSplitProps {
  readonly direction: "horizontal" | "vertical";
  readonly initialRatio: number; // 0-1, proportion of first pane
  readonly minFirst: number; // Minimum pixels for first pane
  readonly minSecond: number; // Minimum pixels for second pane
  readonly persistKey?: string; // localStorage key for persistence
  readonly first: React.ReactNode;
  readonly second: React.ReactNode;
  readonly splitterWidth?: number; // Default: 6px
}
```

### 24.2 Interaction

- **Drag**: Click and drag the splitter bar to resize. Cursor changes to `col-resize` (horizontal) or `row-resize` (vertical).
- **Double-click**: Resets to the initial ratio.
- **Keyboard**: When focused, left/right (horizontal) or up/down (vertical) arrow keys move the splitter by 10px. Shift+arrow moves by 50px.
- **Constraints**: Panes cannot be resized below their `minFirst`/`minSecond` values.

### 24.3 Visual Design

The splitter bar is a thin (6px) strip:

- Default: `--hex-bg-tertiary` background
- Hover: `--hex-accent` background with slight opacity
- Dragging: `--hex-accent` background, full opacity
- A subtle grip indicator (three dots/lines) centered on the splitter

---

## 25. Responsive Behavior

### 25.1 Breakpoints

| Breakpoint | Layout Change                                                               |
| ---------- | --------------------------------------------------------------------------- |
| ≥1200px    | Full three-pane layout (editor + visualization side-by-side, console below) |
| 800–1199px | Stacked layout: editor on top, visualization below, console at bottom       |
| <800px     | Single-pane with tab switching: Editor tab, Panels tab, Console tab         |

### 25.2 Stacked Layout (800–1199px)

```
┌──────────────────────────────────────┐
│  Toolbar                             │
├──────────────────────────────────────┤
│  Editor Pane (full width)            │
│  ┌─────────┬────────────────────┐    │
│  │ Files   │  Monaco Editor     │    │
│  └─────────┴────────────────────┘    │
├──────────────────────────────────────┤
│  [Overview] [Container] [Graph] ...  │
│  Visualization Panel (full width)    │
├──────────────────────────────────────┤
│  Console                             │
└──────────────────────────────────────┘
```

The horizontal splitter between editor and visualization becomes a vertical splitter. All panes are full width, stacked vertically.

### 25.3 Single-Pane Layout (<800px)

A tab bar at the top switches between three views:

- **Editor**: Full-screen editor (file tree collapsed by default)
- **Panels**: Full-screen visualization panel
- **Console**: Full-screen console output

The Run button and example selector remain visible in the toolbar at all times.

### 25.4 Embed Mode Responsive

In embed mode (`?embed=true`), the layout adapts to the iframe dimensions:

- **Wide iframe (≥600px)**: Side-by-side editor and panel (no console unless toggled)
- **Narrow iframe (<600px)**: Stacked editor above, panel below
- **Minimal iframe (<400px)**: Editor only, with a "View Results" toggle to switch to panel view

The file tree is always hidden in embed mode. See [06 — Examples and Sharing](./06-examples-and-sharing.md) for full embed mode specification.
