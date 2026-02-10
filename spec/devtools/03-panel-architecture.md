# 6. Panel Architecture

This section specifies the internal architecture of the `@hex-di/devtools` panel system: how panels are structured, how they plug into the shell, how state is managed, and how the component tree is organized. The devtools is a self-contained React application that renders as an overlay inside the host application, consuming the existing `InspectorAPI` from `@hex-di/core` and the reactive hooks from `@hex-di/react`.

> **Previous**: [Section 5 -- Visual Design & Wireframes](./02-visual-design.md)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)

---

## 6.1 Architectural Overview

The devtools is structured as four nested layers, each with a single responsibility:

```
+-----------------------------------------------------------------------+
|  <HexDevTools>                                                        |
|  Root entry point. Accepts configuration props. Renders nothing       |
|  in production unless explicitly enabled.                             |
|                                                                       |
|  +-------------------------------------------------------------------+|
|  |  <DevToolsProvider>                                                ||
|  |  Internal state context. Manages open/closed, active tab,         ||
|  |  panel height, theme, event log filters. Persists to              ||
|  |  localStorage. NOT connected to user application state.           ||
|  |                                                                    ||
|  |  +---------------------------------------------------------------+||
|  |  |  <ThemeProvider>                                               |||
|  |  |  Resolves "system" theme to "light" or "dark" via             |||
|  |  |  matchMedia. Provides CSS custom properties.                  |||
|  |  |                                                                |||
|  |  |  +-----------------------------------------------------------+|||
|  |  |  |  <TriggerButton />     (when panel is closed)             ||||
|  |  |  |  <PanelShell>          (when panel is open)               ||||
|  |  |  |    <ResizeHandle />                                       ||||
|  |  |  |    <PanelHeader>                                          ||||
|  |  |  |      <TabBar />                                           ||||
|  |  |  |      <HeaderActions />                                    ||||
|  |  |  |    </PanelHeader>                                         ||||
|  |  |  |    <PanelContent>                                         ||||
|  |  |  |      {activePanel.component}                              ||||
|  |  |  |    </PanelContent>                                        ||||
|  |  |  |  </PanelShell>                                            ||||
|  |  |  +-----------------------------------------------------------+|||
|  |  +---------------------------------------------------------------+||
|  +-------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

The key design decisions:

1. **Isolation** -- The devtools manages its own state in a dedicated React context. It never writes to the host application's state, never injects global styles, and never interferes with the host's React tree beyond occupying a portal-rendered DOM node.

2. **Plugin panels** -- Each panel (Container, Graph, Scopes, Events, Tracing, and library-specific panels) implements a uniform `DevToolsPanel` interface. The shell does not know what panels exist at compile time; it discovers them at runtime.

3. **Lazy activation** -- Only the active panel is mounted. Inactive panels are fully unmounted, releasing their subscriptions and DOM nodes. The event log is the sole exception: it maintains a background ring buffer regardless of active tab.

4. **Progressive disclosure** -- The trigger button is the only visible element when the panel is closed. The full panel UI appears only on interaction.

---

## 6.2 Panel Plugin System

### 6.2.1 DevToolsPanel Interface

Every panel -- built-in or custom -- implements this interface:

```typescript
interface DevToolsPanel {
  /** Unique panel identifier. Used as the tab key and localStorage persistence key. */
  readonly id: string;

  /** Human-readable label displayed in the tab bar. */
  readonly label: string;

  /**
   * Tab icon. A single Unicode character, emoji, or a React component
   * that renders an inline SVG icon. When the viewport is narrow
   * (below 600px), only the icon is shown.
   */
  readonly icon: string | React.ComponentType<{ readonly size: number }>;

  /**
   * Tab ordering. Lower numbers appear further left.
   * Built-in panels use multiples of 10 (0, 10, 20, 30, 40).
   * Custom panels should use values >= 100 to appear after built-ins.
   * Library panels are auto-assigned starting at 200.
   */
  readonly order: number;

  /** The React component that renders the panel content. */
  readonly component: React.ComponentType<PanelProps>;
}
```

### 6.2.2 PanelProps Interface

Every panel component receives these props from the shell:

```typescript
interface PanelProps {
  /** The inspector API for querying container state. */
  readonly inspector: InspectorAPI;

  /** The resolved theme (always "light" or "dark", never "system"). */
  readonly theme: ResolvedTheme;

  /** Current panel content width in pixels (updates on resize). */
  readonly width: number;

  /** Current panel content height in pixels (updates on resize). */
  readonly height: number;
}

type ResolvedTheme = "light" | "dark";
```

The `width` and `height` values represent the usable content area inside the panel (excluding the tab bar and resize handle). Panels use these to make layout decisions -- for example, the Graph panel uses `width` and `height` to size its SVG viewport, and the Events panel uses `height` to calculate how many log entries to virtualize.

### 6.2.3 Panel Registration

Panels are registered through three channels, merged in this priority order:

1. **Built-in panels** -- Always present. Defined internally by the devtools package.
2. **Library panels** -- Auto-discovered from `inspector.getLibraryInspectors()`. A new panel is created whenever a `library-registered` event fires, and removed on `library-unregistered`.
3. **Custom panels** -- Passed via the `panels` prop on `<HexDevTools>`. These are user-defined panels for application-specific debugging views.

The final tab order is determined by sorting all registered panels by their `order` field. Ties are broken alphabetically by `id`.

### 6.2.4 Panel Deduplication

If a custom panel shares the same `id` as a built-in or library panel, the custom panel takes precedence. This allows users to override any built-in panel with a custom implementation. A console warning is emitted when this occurs (development mode only).

---

## 6.3 Built-in Panels

The devtools ships with seven built-in panels. Each panel is a self-contained React component that consumes `PanelProps` and internally uses the appropriate inspector hooks.

### 6.3.1 Panel Registry

| Order | ID          | Label     | Icon | Description                                                          |
| ----- | ----------- | --------- | ---- | -------------------------------------------------------------------- |
| 0     | `overview`  | Overview  | `O`  | Unified overview: container stats + library headline metrics         |
| 5     | `container` | Container | `C`  | Container overview: kind, phase, port count, singletons, error rates |
| 10    | `graph`     | Graph     | `G`  | Dependency graph visualization with force-directed layout            |
| 20    | `scopes`    | Scopes    | `S`  | Scope tree hierarchy with expand/collapse                            |
| 30    | `events`    | Events    | `E`  | Real-time event stream with filtering and search                     |
| 40    | `tracing`   | Tracing   | `T`  | Resolution tracing timeline with span waterfall                      |
| 50    | `health`    | Health    | `H`  | Synthesized diagnostics: graph health, blast radius, scope leaks     |

### 6.3.2 Container Panel (order: 5)

Data source: `inspector.getSnapshot()` via `useSnapshot()` hook and `inspector.getAllResultStatistics()`.

Displays:

- Container kind badge (`root` / `child` / `lazy`)
- Current phase indicator (`idle` / `initializing` / `ready` / `disposed`)
- Port count (total, resolved, unresolved)
- Singleton cache utilization
- Top error-rate ports (threshold > 0.1, sorted by error rate descending)
- Registered library badges
- Child container count with drill-down

### 6.3.3 Graph Panel (order: 10)

Data source: `inspector.getGraphData()` -- called once on mount and refreshed on `snapshot-changed` events only when the adapter count changes.

Displays:

- Force-directed dependency graph using SVG
- Nodes colored by lifetime (`singleton` = blue, `scoped` = green, `transient` = gray)
- Edges colored by origin (`own` = solid, `inherited` = dashed, `overridden` = red)
- Hover tooltip showing port name, lifetime, factory kind, dependency list
- Click-to-select with detail sidebar
- Zoom and pan controls

### 6.3.4 Scopes Panel (order: 20)

Data source: `inspector.getScopeTree()` via `useScopeTree()` hook.

Displays:

- Hierarchical tree view of scope nodes
- Each node shows: scope ID, scope name (if named), status (`active` / `disposed`), child count
- Expand/collapse controls per node
- Color coding: active scopes in green, disposed scopes in gray

### 6.3.5 Events Panel (order: 30)

Data source: `inspector.subscribe()` -- events are buffered in a ring buffer that persists across tab switches.

Displays:

- Reverse-chronological event list (newest at top)
- Event type badge with color coding per event type
- Timestamp column
- Event detail expansion on click
- Filter bar: type checkboxes, text search across event properties
- Clear and pause/resume controls

The event ring buffer is the one piece of state that survives panel unmounting. It is owned by the `DevToolsProvider` context, not by the Events panel component. This ensures events are captured even while viewing other tabs.

### 6.3.6 Tracing Panel (order: 40)

Data source: `inspector.getLibraryInspector("tracing")` via `useTracingSummary()` hook.

**Conditional rendering**: This panel is only included in the tab bar when a tracing library inspector is registered. The devtools listens for `library-registered` and `library-unregistered` events with `name === "tracing"` to toggle the panel's visibility.

Displays:

- Summary cards: total spans, error count, average duration, cache hit rate
- Span waterfall timeline (most recent resolutions)
- Error span highlighting

---

## 6.4 Library Panels (Auto-Discovered)

### 6.4.1 Discovery Mechanism

When the devtools mounts, it reads `inspector.getLibraryInspectors()` to get the initial set of registered libraries. It then subscribes to inspector events and watches for:

- `{ type: "library-registered", name }` -- Creates a new panel for the library
- `{ type: "library-unregistered", name }` -- Removes the library's panel

Each discovered library gets a panel with:

```typescript
{
  id: `library:${inspector.name}`,
  label: inspector.name,          // Capitalized in the tab bar
  icon: inspector.name[0].toUpperCase(),
  order: 200 + alphabeticalIndex, // Sorted alphabetically, starting at 200
  component: LibraryPanel,        // Generic tree-view component
}
```

### 6.4.2 Generic LibraryPanel Component

The default `LibraryPanel` renders the library's snapshot as an interactive tree view:

```
+---------------------------------------------------------+
|  Library: flow                                          |
|  Last updated: 12:34:56.789                             |
+---------------------------------------------------------+
|  > machineCount: 3                                      |
|  v machines: Array(3)                                   |
|    v [0]:                                               |
|      portName: "OrderMachine"                           |
|      instanceId: "abc-123"                              |
|      machineId: "order"                                 |
|      state: "processing"                                |
|      scopeId: "root"                                    |
|    > [1]: {...}                                         |
|    > [2]: {...}                                         |
|  > healthEvents: Array(10)                              |
|  > effectStatistics: {...}                              |
+---------------------------------------------------------+
```

The tree view is a recursive component that handles:

- Primitive values: rendered inline with type-appropriate formatting
- Arrays: collapsible with item count badge
- Objects: collapsible with key count badge
- `null` and `undefined`: rendered as grayed-out keywords
- Large arrays (>100 items): virtualized to render only visible items

### 6.4.3 Custom Library Panel Components

Libraries can provide a custom panel component instead of the generic tree view. The mechanism for this is a convention on the `LibraryInspector` snapshot:

```typescript
// In the library's snapshot:
{
  __devtools_panel?: React.ComponentType<PanelProps>;
  // ... other snapshot data
}
```

When the devtools detects a `__devtools_panel` property on a library's snapshot that is a function (checked via `typeof`), it uses that component instead of the generic `LibraryPanel`. This allows libraries like `@hex-di/flow` to provide a rich, domain-specific panel (e.g., a state machine visualizer) while simpler libraries fall back to the tree view.

The `__devtools_panel` property is read once when the library panel is first created and is not re-read on subsequent snapshots. To update the panel component, the library must re-register its inspector.

---

## 6.5 Panel State Management

### 6.5.1 State Shape

The devtools maintains internal state in a dedicated React context, completely isolated from the host application:

```typescript
interface DevToolsState {
  /** Whether the panel is currently open. */
  readonly isOpen: boolean;

  /** The id of the currently active panel tab. */
  readonly activePanel: string;

  /** Panel height in pixels (persisted across sessions). */
  readonly panelHeight: number;

  /** Position of the floating trigger button. */
  readonly triggerPosition: TriggerPosition;

  /** Theme preference. "system" resolves to light/dark via matchMedia. */
  readonly theme: "light" | "dark" | "system";

  /** Event log filter state. */
  readonly eventLogFilter: EventLogFilter;

  /** Whether event logging is paused. */
  readonly eventLogPaused: boolean;
}

interface EventLogFilter {
  /** Event types to include. Empty set means "show all". */
  readonly enabledTypes: ReadonlySet<string>;

  /** Free-text search query applied across all event properties. */
  readonly searchQuery: string;
}

type TriggerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
```

### 6.5.2 Default State

```typescript
const DEFAULT_STATE: DevToolsState = {
  isOpen: false,
  activePanel: "container",
  panelHeight: 400,
  triggerPosition: "bottom-right",
  theme: "system",
  eventLogFilter: {
    enabledTypes: new Set(),
    searchQuery: "",
  },
  eventLogPaused: false,
};
```

Defaults can be overridden by `HexDevToolsProps` (e.g., `defaultOpen`, `defaultHeight`, `triggerPosition`, `theme`). Props override defaults, and localStorage overrides props for fields that are persisted.

### 6.5.3 Persistence Strategy

State is persisted to `localStorage` under the key `hex-di:devtools`. Only a subset of the state is persisted:

| Field             | Persisted | Reason                                         |
| ----------------- | --------- | ---------------------------------------------- |
| `isOpen`          | Yes       | Remembers panel visibility across page reloads |
| `activePanel`     | Yes       | Remembers which tab was last viewed            |
| `panelHeight`     | Yes       | Remembers user's height preference             |
| `triggerPosition` | No        | Controlled by props                            |
| `theme`           | Yes       | Remembers user's theme preference              |
| `eventLogFilter`  | No        | Filters are ephemeral per session              |
| `eventLogPaused`  | No        | Pause state is ephemeral per session           |

The persistence format is JSON. On read, the deserializer validates the shape and discards any corrupted or incompatible data, falling back to defaults. The serializer writes on every state change, debounced by 500ms to avoid excessive writes.

```typescript
const STORAGE_KEY = "hex-di:devtools";

interface PersistedState {
  readonly isOpen: boolean;
  readonly activePanel: string;
  readonly panelHeight: number;
  readonly theme: "light" | "dark" | "system";
}
```

### 6.5.4 State Context

The state is managed via `useReducer` inside `DevToolsProvider` and exposed through a context:

```typescript
interface DevToolsContextValue {
  readonly state: DevToolsState;
  readonly dispatch: React.Dispatch<DevToolsAction>;
  readonly eventLog: EventLogBuffer;
  readonly registeredPanels: readonly DevToolsPanel[];
}
```

Actions follow a discriminated union pattern:

```typescript
type DevToolsAction =
  | { readonly type: "toggle-panel" }
  | { readonly type: "open-panel" }
  | { readonly type: "close-panel" }
  | { readonly type: "set-active-panel"; readonly panelId: string }
  | { readonly type: "set-panel-height"; readonly height: number }
  | { readonly type: "set-theme"; readonly theme: "light" | "dark" | "system" }
  | { readonly type: "set-event-filter"; readonly filter: EventLogFilter }
  | { readonly type: "toggle-event-pause" }
  | { readonly type: "clear-event-log" };
```

### 6.5.5 Event Log Buffer

The event log buffer is a fixed-size ring buffer maintained by the `DevToolsProvider`. It subscribes to `inspector.subscribe()` on mount and captures all events regardless of which panel is active.

```typescript
interface EventLogBuffer {
  /** All events in the buffer, newest first. */
  readonly events: readonly TimestampedEvent[];

  /** Total number of events received (including dropped ones). */
  readonly totalReceived: number;

  /** Number of events dropped due to buffer overflow. */
  readonly totalDropped: number;
}

interface TimestampedEvent {
  /** Monotonically increasing sequence number. */
  readonly seq: number;

  /** Event timestamp (Date.now() at capture time). */
  readonly timestamp: number;

  /** The raw inspector event. */
  readonly event: InspectorEvent;
}
```

The buffer capacity is configurable via `HexDevToolsProps`:

```typescript
interface HexDevToolsProps {
  // ... other props
  readonly eventBufferSize?: number; // Default: 500
}
```

When the buffer is full, the oldest event is discarded (FIFO). The `totalDropped` counter increments to indicate data loss.

---

## 6.6 Configuration API

### 6.6.1 HexDevToolsProps

The root `<HexDevTools>` component accepts the following props:

```typescript
interface HexDevToolsProps {
  /**
   * The InspectorAPI to consume. If omitted, the devtools attempts
   * to read from the nearest InspectorProvider via useInspector().
   * If neither is available, the devtools renders nothing and logs
   * a console warning (development mode only).
   */
  readonly inspector?: InspectorAPI;

  /**
   * Whether the devtools is enabled. When false, the component
   * renders nothing (not even the trigger button).
   *
   * Default: process.env.NODE_ENV !== "production"
   */
  readonly enabled?: boolean;

  /**
   * Whether the panel starts open on first render.
   * Overridden by localStorage if the user has previously
   * interacted with the panel.
   *
   * Default: false
   */
  readonly defaultOpen?: boolean;

  /**
   * Default panel height in pixels.
   * Overridden by localStorage if the user has previously resized.
   *
   * Default: 400
   */
  readonly defaultHeight?: number;

  /**
   * Position of the floating trigger button.
   *
   * Default: "bottom-right"
   */
  readonly triggerPosition?: TriggerPosition;

  /**
   * Keyboard shortcut to toggle the panel.
   * Uses the Mousetrap-style format: modifier keys separated by +,
   * e.g., "ctrl+shift+d", "meta+shift+d".
   *
   * Default: "ctrl+shift+d"
   */
  readonly hotkey?: string;

  /**
   * Additional custom panels to register alongside built-in panels.
   * Custom panels with the same id as a built-in panel replace it.
   *
   * Default: []
   */
  readonly panels?: readonly DevToolsPanel[];

  /**
   * Theme preference. "system" uses the OS-level prefers-color-scheme.
   * Overridden by localStorage if the user has previously changed
   * the theme via the panel's theme toggle.
   *
   * Default: "system"
   */
  readonly theme?: "light" | "dark" | "system";

  /**
   * Maximum number of events retained in the event log buffer.
   *
   * Default: 500
   */
  readonly eventBufferSize?: number;
}
```

### 6.6.2 Usage Example

```typescript
import { HexDevTools } from "@hex-di/devtools";

function App() {
  return (
    <>
      <InspectorProvider inspector={container.inspector}>
        <MainApplication />
        <HexDevTools
          defaultOpen={false}
          triggerPosition="bottom-left"
          hotkey="ctrl+shift+d"
          theme="system"
          panels={[myCustomPanel]}
        />
      </InspectorProvider>
    </>
  );
}
```

### 6.6.3 Production Gating

When `enabled` is `false` (or defaults to `false` in production):

- The component returns `null` immediately
- No contexts are created
- No subscriptions are established
- No event listeners are attached
- The component tree-shakes cleanly if the bundler eliminates dead code

The check is performed at the top of `<HexDevTools>` before any hooks execute. This is achieved by rendering a wrapper component that conditionally renders the real devtools:

```
<HexDevTools enabled={...}>
  |- if !enabled: return null (no hooks)
  |- if enabled: <HexDevToolsInternal> (all hooks here)
```

---

## 6.7 Theme System

### 6.7.1 Theme Resolution

The `ThemeProvider` resolves the `"system"` theme to either `"light"` or `"dark"` using `window.matchMedia("(prefers-color-scheme: dark)")`. It subscribes to the media query's `change` event to react to OS-level theme switches in real time.

```typescript
type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  readonly preference: ThemePreference; // What the user chose
  readonly resolved: ResolvedTheme; // What is actually applied
}
```

### 6.7.2 CSS Strategy

The devtools uses CSS custom properties scoped to a root wrapper element. The wrapper has a unique `data-hex-devtools` attribute that all internal selectors scope to, preventing style leakage into the host application.

```
[data-hex-devtools] {
  --hdt-bg-primary: ...;
  --hdt-bg-secondary: ...;
  --hdt-text-primary: ...;
  --hdt-text-secondary: ...;
  --hdt-border: ...;
  --hdt-accent: ...;
  --hdt-error: ...;
  --hdt-warning: ...;
  --hdt-success: ...;
  --hdt-font-mono: ui-monospace, "Cascadia Code", "Fira Code", monospace;
  --hdt-font-sans: system-ui, -apple-system, sans-serif;
  --hdt-radius: 6px;
  --hdt-shadow: ...;
}
```

Two sets of values are defined -- one for `[data-hex-devtools="light"]` and one for `[data-hex-devtools="dark"]`. The `ThemeProvider` sets the attribute value on the wrapper element.

### 6.7.3 Style Isolation

All devtools styles are scoped using the `[data-hex-devtools]` attribute selector. No global styles are injected. The devtools wrapper sets `all: initial` on itself to reset inherited styles from the host application, then re-applies its own baseline.

Styles are delivered as a single CSS string injected into a `<style>` element inside the devtools wrapper (not into `<head>`). This ensures the styles are cleaned up when the devtools unmounts.

---

# 7. Component Tree

This section details the full component hierarchy, data flow, lifecycle, and performance characteristics of the devtools component tree.

> **Previous**: [Section 6 -- Panel Architecture](#6-panel-architecture)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)

---

## 7.1 Full Component Tree

```
<HexDevTools>
  |
  |-- [production guard: if !enabled, return null]
  |
  <HexDevToolsInternal>
    |
    <DevToolsProvider>                        [1] Internal state context + event buffer
      |
      <InspectorBridge>                       [2] Auto-detects inspector from context or props
        |
        <PanelRegistry>                       [3] Merges built-in + library + custom panels
          |
          <ThemeProvider>                      [4] Resolves system theme, provides CSS vars
            |
            <DevToolsWrapper                  [5] Root DOM node with data-hex-devtools attr
              data-hex-devtools={resolvedTheme}>
              |
              +-- <KeyboardHandler />         [6] Global keyboard shortcut listener
              |
              +-- [if !isOpen]:
              |   <TriggerButton              [7] Floating button, positioned via CSS
              |     position={triggerPosition}
              |     onClick={togglePanel}
              |   />
              |
              +-- [if isOpen]:
                  <PanelShell>                [8] Bottom-anchored panel container
                    |
                    +-- <ResizeHandle         [9] Drag handle (horizontal bar at top)
                    |     onResize={setHeight}
                    |     minHeight={200}
                    |     maxHeight={viewportHeight * 0.8}
                    |   />
                    |
                    +-- <PanelHeader>         [10] Fixed header bar
                    |     |
                    |     +-- <TabBar>        [11] Horizontal scrollable tab strip
                    |     |     |
                    |     |     +-- <Tab id="container"  order={0}   active={...} />
                    |     |     +-- <Tab id="graph"      order={10}  active={...} />
                    |     |     +-- <Tab id="scopes"     order={20}  active={...} />
                    |     |     +-- <Tab id="events"     order={30}  active={...} />
                    |     |     +-- <Tab id="tracing"    order={40}  active={...} />
                    |     |     |     [conditional: only if tracing inspector registered]
                    |     |     |
                    |     |     +-- {libraryPanels.map(panel =>
                    |     |           <Tab id={panel.id} order={panel.order} active={...} />
                    |     |         )}
                    |     |     |
                    |     |     +-- {customPanels.map(panel =>
                    |     |           <Tab id={panel.id} order={panel.order} active={...} />
                    |     |         )}
                    |     |
                    |     +-- <HeaderActions>  [12] Right-aligned action buttons
                    |           |
                    |           +-- <ThemeToggle />    [13] Light/dark toggle icon
                    |           +-- <CloseButton />    [14] Close panel (X icon)
                    |
                    +-- <PanelContent>         [15] Active panel renderer
                          |
                          +-- {React.createElement(
                                activePanel.component,
                                { inspector, theme, width, height }
                              )}
                          |
                          |  One of:
                          |  +-- <ContainerPanel />    (id: "container")
                          |  +-- <GraphPanel />        (id: "graph")
                          |  +-- <ScopesPanel />       (id: "scopes")
                          |  +-- <EventsPanel />       (id: "events")
                          |  +-- <TracingPanel />       (id: "tracing")
                          |  +-- <LibraryPanel />       (id: "library:*")
                          |  +-- <CustomPanel />        (user-provided)
```

### Component Numbering Key

| #   | Component        | Responsibility                                             |
| --- | ---------------- | ---------------------------------------------------------- |
| 1   | DevToolsProvider | useReducer for state, event ring buffer, localStorage sync |
| 2   | InspectorBridge  | Reads inspector from props or InspectorContext             |
| 3   | PanelRegistry    | Merges panel sources, handles library panel auto-discovery |
| 4   | ThemeProvider    | matchMedia subscription, system theme resolution           |
| 5   | DevToolsWrapper  | Root DOM element, style scope, portal target               |
| 6   | KeyboardHandler  | useEffect with global keydown listener                     |
| 7   | TriggerButton    | Floating FAB with position CSS                             |
| 8   | PanelShell       | Fixed-position bottom panel, height from state             |
| 9   | ResizeHandle     | Pointer event handlers for drag-to-resize                  |
| 10  | PanelHeader      | Flexbox row: tabs on left, actions on right                |
| 11  | TabBar           | Horizontal scroll container with overflow indicators       |
| 12  | HeaderActions    | Grouped action buttons                                     |
| 13  | ThemeToggle      | Dispatches set-theme action, cycles light/dark/system      |
| 14  | CloseButton      | Dispatches close-panel action                              |
| 15  | PanelContent     | Measures dimensions, renders active panel component        |

---

## 7.2 Data Flow

### 7.2.1 Inspector Data Flow

Data flows from the `InspectorAPI` through hooks into panel components. Each panel subscribes only to the data it needs:

```
InspectorAPI
(from @hex-di/react InspectorContext or HexDevToolsProps.inspector)
    |
    |  Pull-based (via useSyncExternalStore hooks)
    |  +=======================================================+
    |  |                                                       |
    |  +-- useSnapshot()                                       |
    |  |     Returns: ContainerSnapshot                        |
    |  |     Consumers: ContainerPanel                         |
    |  |     Re-renders: on any inspector event                |
    |  |                                                       |
    |  +-- useScopeTree()                                      |
    |  |     Returns: ScopeTree                                |
    |  |     Consumers: ScopesPanel                            |
    |  |     Re-renders: on scope-created, scope-disposed      |
    |  |                                                       |
    |  +-- useUnifiedSnapshot()                                |
    |  |     Returns: UnifiedSnapshot                          |
    |  |     Consumers: LibraryPanel (generic tree view)       |
    |  |     Re-renders: on any inspector event                |
    |  |                                                       |
    |  +-- useTracingSummary()                                 |
    |  |     Returns: TracingSummary | undefined                |
    |  |     Consumers: TracingPanel                           |
    |  |     Re-renders: on tracing snapshot change            |
    |  |     Note: Returns undefined when no tracing inspector |
    |  |                                                       |
    |  +=======================================================+
    |
    |  One-time queries (called imperatively)
    |  +=======================================================+
    |  |                                                       |
    |  +-- inspector.getGraphData()                            |
    |  |     Returns: ContainerGraphData                       |
    |  |     Consumers: GraphPanel                             |
    |  |     Called: on mount + when adapter count changes      |
    |  |                                                       |
    |  +-- inspector.getAllResultStatistics()                   |
    |  |     Returns: ReadonlyMap<string, ResultStatistics>    |
    |  |     Consumers: ContainerPanel                         |
    |  |     Called: on mount + on result:ok/result:err events  |
    |  |                                                       |
    |  +-- inspector.getLibraryInspectors()                    |
    |  |     Returns: ReadonlyMap<string, LibraryInspector>    |
    |  |     Consumers: PanelRegistry                          |
    |  |     Called: on mount + on library-registered events    |
    |  |                                                       |
    |  +=======================================================+
    |
    |  Push-based (subscription)
    |  +=======================================================+
    |  |                                                       |
    |  +-- inspector.subscribe(listener)                       |
    |        Returns: () => void (unsubscribe)                 |
    |        Consumers: DevToolsProvider (event ring buffer)   |
    |        Lifetime: mount to unmount of DevToolsProvider    |
    |        Note: Single subscription shared by all panels    |
    |                                                          |
    |  +=======================================================+
```

### 7.2.2 State Data Flow

Internal state flows from the `DevToolsProvider` through context to all child components:

```
DevToolsProvider (useReducer)
    |
    +-- state.isOpen ---------> TriggerButton (visibility)
    |                    +----> PanelShell (visibility)
    |
    +-- state.activePanel ----> TabBar (active tab highlight)
    |                    +----> PanelContent (which component to render)
    |
    +-- state.panelHeight ----> PanelShell (CSS height)
    |                    +----> PanelContent (height prop to active panel)
    |
    +-- state.theme ----------> ThemeProvider (resolved theme)
    |                    +----> PanelContent (theme prop to active panel)
    |
    +-- state.eventLogFilter -> EventsPanel (filter state)
    |
    +-- state.eventLogPaused -> EventsPanel (pause indicator)
    |
    +-- eventLog.events ------> EventsPanel (rendered event list)
```

### 7.2.3 User Interaction Flow

```
User clicks trigger button
    |
    v
TriggerButton.onClick
    |
    v
dispatch({ type: "toggle-panel" })
    |
    v
Reducer: isOpen = !isOpen
    |
    v
DevToolsProvider re-renders
    |
    +-- TriggerButton unmounts (isOpen = true)
    +-- PanelShell mounts with slide-up animation
         |
         +-- Active panel component mounts
         +-- Panel subscribes to inspector data via hooks
```

```
User drags resize handle
    |
    v
ResizeHandle.onPointerMove (while dragging)
    |
    v
Calculate new height = viewportHeight - pointerY
    |
    v
Clamp: max(200, min(height, viewportHeight * 0.8))
    |
    v
dispatch({ type: "set-panel-height", height })
    |
    v
Reducer: panelHeight = height
    |
    v
PanelShell re-renders with new height
    |
    +-- PanelContent re-renders with new height prop
    +-- Active panel receives updated height prop
    +-- localStorage write (debounced 500ms)
```

---

## 7.3 Lifecycle

### 7.3.1 Mount Phase

```
1. <HexDevTools> renders
   |
   +-- Check enabled prop (default: process.env.NODE_ENV !== "production")
   |   If false: return null, no further work
   |
2. <DevToolsProvider> mounts
   |
   +-- Read localStorage("hex-di:devtools")
   |   Parse JSON, validate shape, merge with defaults and props
   |
   +-- Initialize useReducer with merged initial state
   |
   +-- Create event ring buffer (capacity from props or default 500)
   |
   +-- Subscribe to inspector.subscribe() for event capture
   |   Events flow into ring buffer regardless of isOpen state
   |
3. <PanelRegistry> mounts
   |
   +-- Read inspector.getLibraryInspectors() for initial library set
   +-- Build sorted panel list: built-in + library + custom
   +-- Subscribe to inspector events for library-registered/unregistered
   |
4. <ThemeProvider> mounts
   |
   +-- If theme === "system": subscribe to matchMedia change event
   +-- Resolve initial theme
   |
5. <KeyboardHandler> mounts
   |
   +-- Attach global keydown listener for hotkey
   |
6. If isOpen (from persisted state):
   |
   +-- <PanelShell> mounts (no animation on initial render)
   +-- Active panel component mounts and begins data subscription
   |
   If !isOpen:
   |
   +-- <TriggerButton> mounts at configured position
```

### 7.3.2 Open Phase

```
1. User triggers open (click trigger button OR press hotkey)
   |
2. dispatch({ type: "open-panel" })
   |
3. state.isOpen becomes true
   |
4. <TriggerButton> unmounts
   |
5. <PanelShell> mounts
   |
   +-- CSS transition: transform translateY(100%) -> translateY(0)
   |   Duration: 200ms ease-out
   |
6. <PanelContent> mounts
   |
   +-- Measures content area dimensions via ResizeObserver
   +-- Renders activePanel.component with measured width/height
   |
7. Active panel component mounts
   |
   +-- Calls appropriate hooks (useSnapshot, useScopeTree, etc.)
   +-- Hooks call useSyncExternalStore -> subscribe to inspector
```

### 7.3.3 Tab Switch Phase

```
1. User clicks a different tab
   |
2. dispatch({ type: "set-active-panel", panelId: newId })
   |
3. state.activePanel changes
   |
4. <PanelContent> re-renders
   |
   +-- Previous panel component UNMOUNTS
   |   All hooks unsubscribe, DOM cleaned up
   |
   +-- New panel component MOUNTS
   |   Fresh hook subscriptions established
   |
5. localStorage write (debounced)
```

Panels are not cached or kept alive. Each mount is a fresh render. This trades a small mount cost for significant memory savings -- inactive panels hold no DOM nodes, no subscriptions, and no stale data.

### 7.3.4 Close Phase

```
1. User triggers close (click close button, press Escape, or press hotkey)
   |
2. dispatch({ type: "close-panel" })
   |
3. state.isOpen becomes false
   |
4. <PanelShell> begins exit animation
   |
   +-- CSS transition: transform translateY(0) -> translateY(100%)
   |   Duration: 150ms ease-in
   |
5. After animation completes (onTransitionEnd):
   |
   +-- <PanelShell> unmounts
   +-- Active panel component unmounts (hooks unsubscribe)
   |
6. <TriggerButton> mounts
   |
7. Event ring buffer continues capturing events (owned by DevToolsProvider)
   |
8. localStorage write (debounced)
```

### 7.3.5 Unmount Phase

```
1. <HexDevTools> unmounts (or enabled becomes false)
   |
2. <DevToolsProvider> unmounts
   |
   +-- Event ring buffer subscription unsubscribes from inspector
   +-- Save state to localStorage (immediate, not debounced)
   |
3. <ThemeProvider> unmounts
   |
   +-- matchMedia change listener removed
   |
4. <KeyboardHandler> unmounts
   |
   +-- Global keydown listener removed
   |
5. All panel components unmount (if panel was open)
   |
6. <style> element removed from DOM (styles cleaned up)
```

---

## 7.4 Performance Considerations

### 7.4.1 Lazy Panel Rendering

Only the active panel's component is mounted. All other panels have zero runtime cost. When switching tabs, the previous panel fully unmounts and the new panel mounts fresh. This means:

- **Memory**: Only one panel's DOM tree and hook subscriptions exist at any time
- **CPU**: Only one panel processes inspector events
- **Trade-off**: Tab switches incur a small mount cost (~1-5ms for built-in panels)

### 7.4.2 Event Log Ring Buffer

The event log uses a fixed-capacity ring buffer implemented as a pre-allocated array with head/tail pointers:

- **Insertion**: O(1) -- write at tail, increment tail mod capacity
- **Iteration**: O(n) -- read from head to tail
- **Memory**: Fixed at `capacity * sizeof(TimestampedEvent)`, never grows
- **Default capacity**: 500 events
- **Overflow**: Oldest events silently discarded, `totalDropped` counter incremented

The buffer is a plain object (not React state) to avoid re-rendering the DevToolsProvider on every event. The EventsPanel reads from the buffer in its render cycle via a ref.

### 7.4.3 Graph Layout

The Graph panel computes a force-directed layout using `requestAnimationFrame`:

- **Initial layout**: Computed on mount, takes ~50-200ms for typical graphs (10-100 nodes)
- **Incremental updates**: Only triggered when the adapter count changes (detected by comparing `getGraphData().adapters.length`). Position changes (zoom, pan) do not re-run layout.
- **Layout stabilization**: The force simulation runs until energy drops below a threshold, then stops. Typical stabilization: 50-100 frames.
- **Large graphs**: For graphs with >200 nodes, the panel displays a warning and offers a "simplified view" that groups nodes by lifetime.

### 7.4.4 Subscription Management

The devtools creates exactly one `inspector.subscribe()` subscription, managed by the `DevToolsProvider`. Individual panels do not subscribe directly to the inspector's event stream. Instead:

- **Event buffering**: All events flow into the ring buffer via the single subscription
- **Hook-based data**: Panels use `useSyncExternalStore` hooks (useSnapshot, useScopeTree, etc.) which internally subscribe. These subscriptions are created/destroyed with panel mount/unmount.
- **No tearing**: All hooks use `useSyncExternalStore`, which is the React-recommended pattern for external store integration. This prevents tearing during concurrent rendering.

### 7.4.5 Resize Performance

The resize handle uses pointer events (not mouse events) for better touch support. During a drag:

- `pointerdown`: Capture pointer, set dragging flag
- `pointermove`: Calculate new height, dispatch immediately (no debounce during drag)
- `pointerup`: Release pointer, clear dragging flag, trigger localStorage persist (debounced)

The panel height is applied via inline `style` on the PanelShell element for maximum update speed. CSS transitions are disabled during active dragging and re-enabled on pointer up.

### 7.4.6 Tree View Virtualization

The generic `LibraryPanel` tree view and the `ScopesPanel` tree view both use windowed rendering for large data sets:

- Arrays with more than 100 items render only the visible window (computed from scroll position and item height)
- Objects with more than 50 keys render only the visible window
- Expansion state is tracked per-path (e.g., `machines[0].state`) in a Set

---

## 7.5 Keyboard Shortcuts

### 7.5.1 Global Shortcuts

These shortcuts work regardless of focus state, captured via a `keydown` listener on `document`:

| Shortcut       | Action                  | Condition     |
| -------------- | ----------------------- | ------------- |
| `Ctrl+Shift+D` | Toggle panel open/close | Always        |
| `Escape`       | Close panel             | Panel is open |

The global hotkey (`Ctrl+Shift+D` by default) is configurable via the `hotkey` prop. The shortcut parser supports:

- Modifier keys: `ctrl`, `shift`, `alt`, `meta`
- Regular keys: any single character or named key (`escape`, `enter`, etc.)
- Separator: `+`
- Case-insensitive

On macOS, `ctrl` maps to the Control key (not Command). Use `meta` for Command.

### 7.5.2 Panel-Scoped Shortcuts

These shortcuts only work when the devtools panel has focus (any element inside `[data-hex-devtools]` is focused):

| Shortcut                  | Action                       | Condition                 |
| ------------------------- | ---------------------------- | ------------------------- |
| `Ctrl+1` through `Ctrl+9` | Switch to tab N (1-indexed)  | Panel is open and focused |
| `/`                       | Focus event log search input | Events panel is active    |
| `Ctrl+K`                  | Focus event log search input | Events panel is active    |

Tab numbering follows the visual tab order (left to right). If tab N does not exist (e.g., `Ctrl+7` when there are only 5 tabs), the shortcut is ignored.

### 7.5.3 Implementation

The `KeyboardHandler` component attaches a single `keydown` listener to `document` in a `useEffect`. The handler:

1. Checks if the event matches the global hotkey -- if so, toggle panel and `preventDefault()`
2. Checks if the event is `Escape` and panel is open -- if so, close panel
3. Checks if the event target is inside `[data-hex-devtools]` (panel-scoped shortcuts)
4. If inside, checks for `Ctrl+1..9` or `/` shortcuts

The handler does not call `preventDefault()` for panel-scoped shortcuts if the event target is an `<input>` or `<textarea>` (to avoid interfering with text input). The `/` shortcut is only intercepted when the active element is not an input field.

---

## 7.6 Responsive Behavior

### 7.6.1 Breakpoints

The devtools adapts to viewport width using three responsive breakpoints. These are checked via `ResizeObserver` on the panel wrapper, not CSS media queries (since the devtools is embedded in an application and media queries would respond to the full viewport, not the panel's available space).

| Viewport Width | Behavior                                                    |
| -------------- | ----------------------------------------------------------- |
| >= 600px       | **Full mode** -- Tabs show icon + label. Full panel layout. |
| 400px -- 599px | **Compact mode** -- Tabs show icon only. Labels hidden.     |
| < 400px        | **Overlay mode** -- Panel becomes a full-screen overlay.    |

### 7.6.2 Full Mode (>= 600px)

Standard layout as described in the component tree. Tabs display both icon and label. The panel is bottom-anchored with configurable height.

### 7.6.3 Compact Mode (400px -- 599px)

Identical to full mode except:

- Tab labels are hidden; only icons are shown
- Tab tooltips appear on hover/focus to show the label
- Header actions icons shrink from 24px to 20px
- Panel padding decreases from 16px to 8px

### 7.6.4 Overlay Mode (< 400px)

The panel switches from bottom-anchored to a full-screen overlay:

- The panel covers the entire viewport (`position: fixed; inset: 0`)
- The resize handle is hidden (no resizing in overlay mode)
- A back/close button appears prominently in the header
- The trigger button position adapts to avoid the notch area on mobile devices

### 7.6.5 Panel Height Constraints

Regardless of responsive mode, the panel height is always clamped:

```
minimumHeight = 200px
maximumHeight = Math.floor(viewportHeight * 0.8)
```

The maximum is recalculated on viewport resize (via ResizeObserver on the `document.documentElement`). If the current `panelHeight` exceeds the new maximum, it is clamped down automatically.

---

## 7.7 DOM Rendering Strategy

### 7.7.1 Portal Rendering

The devtools renders into a React portal appended to `document.body`. This ensures:

- The devtools is not affected by CSS transforms, overflow, or z-index stacking contexts in the host application
- The devtools always renders on top of the host application
- The devtools does not interfere with the host's layout flow

The portal container element is created on mount and removed on unmount:

```
document.body
  |
  +-- [host application root]
  |
  +-- <div data-hex-devtools-portal>      [created by HexDevTools]
        |
        <DevToolsWrapper data-hex-devtools="light|dark">
          ... (full component tree)
```

### 7.7.2 Z-Index Strategy

The devtools uses a high z-index to ensure visibility:

- Trigger button: `z-index: 99999`
- Panel shell: `z-index: 99998`
- Panel overlay (mobile): `z-index: 99999`

These values are intentionally high but static. The devtools does not attempt to detect the host application's z-index range.

### 7.7.3 SSR Safety

All DOM-dependent operations are guarded with `typeof window !== "undefined"` checks:

- Portal creation
- localStorage access
- matchMedia subscription
- Global event listeners
- ResizeObserver

The devtools renders `null` during SSR and hydrates on the client. This matches the pattern used by the existing `DevToolsBridge` component in `@hex-di/react`.

---

> **Previous**: [Section 5 -- Visual Design & Wireframes](./02-visual-design.md)
> **Next**: [Section 8 -- Individual Panel Specifications](./04-panel-specs.md)
