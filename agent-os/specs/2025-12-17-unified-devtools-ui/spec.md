# Specification: Unified DevTools UI Architecture

## Goal

Consolidate 8 existing devtools packages into 2 unified packages (`@hex-di/devtools-core` and `@hex-di/devtools`) with platform-specific entry points (`/dom` and `/tui`), enabling shared headless components through a `RenderPrimitivesPort` abstraction that allows the same component logic to render in both browser and terminal environments.

## User Stories

- As a browser developer, I want to import `@hex-di/devtools/dom` and get a fully functional floating DevTools panel with D3/SVG graph visualization that shares state and logic with the terminal version.
- As a CLI developer, I want to import `@hex-di/devtools/tui` and get an ASCII-based terminal DevTools interface that uses the same view models, state management, and business logic as the browser version.

## Specific Requirements

**Package Consolidation (8 to 2 packages)**
- Merge `devtools-ui`, `devtools-adapters`, `devtools-network`, `devtools`, `devtools-react`, `devtools-tui`, and `devtools-testing` into unified `@hex-di/devtools` package
- Keep `@hex-di/devtools-core` as pure types, transforms, protocol, and filters with zero framework dependencies
- Configure package.json exports for `.` (shared), `./dom` (browser), and `./tui` (terminal) entry points
- Set `react`, `react-dom`, `@opentui/core`, `@opentui/react` as optional peer dependencies with appropriate meta configuration
- Move `devtools-testing` utilities into `devtools-core` as internal test helpers

**RenderPrimitivesPort Contract**
- Define `RenderPrimitivesPort` using `createPort` from `@hex-di/ports` with `RendererType` generic parameter (`'dom' | 'tui'`)
- Export primitive components: `Box`, `Text`, `Button`, `Icon`, `ScrollView`, `Divider`, `GraphRenderer`
- Include `StyleSystem` for semantic color tokens (`primary`, `secondary`, `success`, `warning`, `error`, `muted`, `foreground`, `background`, `border`, `accent`)
- Implement Yoga-based flexbox layout props (`display`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `padding`)
- Define spacing tokens as abstraction over pixel values for cross-platform consistency

**Conditional Props Type System**
- Create `DOMOnlyProps` interface with `className`, `style`, `id`, `data-testid` for browser-specific attributes
- Create `TUIOnlyProps` interface with `focusable`, `title`, `titleAlignment` for terminal-specific attributes
- Implement `RendererSpecificProps<R>` conditional type that maps renderer type to appropriate props interface
- Ensure type-safe props at compile time without runtime cost through discriminated union patterns

**Shared Headless Components**
- Create `DevToolsPanel.tsx` as main container component using primitives from `usePrimitives()` hook
- Create `GraphView.tsx` for dependency graph visualization delegating to `GraphRenderer` primitive
- Create `TimelineView.tsx` for trace timeline display using `Box`, `Text`, `ScrollView` primitives
- Create `StatsView.tsx` for statistics dashboard using semantic styling tokens
- Create `InspectorView.tsx` for service/scope inspection using `Icon` and layout primitives
- All components must be pure render functions that receive `ViewModel` props and emit events through callbacks

**DOM Platform Implementation (~200 lines)**
- Implement `DOMPrimitives` mapping `Box` to `<div style={{display:'flex'}}>`, `Text` to `<span>`, `Button` to `<button>`
- Implement `GraphRenderer` using D3.js + SVG with dagre layout algorithm for node positioning
- Map semantic colors to CSS custom properties (`--hex-devtools-primary`, etc.) for theming support
- Handle mouse interactions (`onClick`, `onMouseEnter`, `onMouseLeave`) for interactivity
- Export `FloatingDevTools` component wrapping shared `DevToolsPanel` with DOM-specific chrome

**TUI Platform Implementation (~200 lines)**
- Implement `TUIPrimitives` mapping `Box` to OpenTUI `<box>`, `Text` to `<text><span>`, `Button` to bordered box with focus
- Implement ASCII `GraphRenderer` using box-drawing characters and tree layout algorithm
- Map semantic colors to ANSI escape codes for terminal color support
- Handle keyboard interactions and focus navigation for terminal accessibility
- Export `TuiDevTools` component and `hexdi-tui` CLI binary for terminal usage

**State Management (100% Shared)**
- Reuse existing `devToolsReducer` from `devtools-ui/src/state/reducer.ts` without modification
- Reuse existing action creators and selectors from `devtools-ui/src/state/`
- Share `DevToolsState`, `PanelState`, `GraphState`, `TimelineState`, `InspectorState` types
- Maintain framework-agnostic reducer pattern compatible with React `useReducer` and any other state management

**View Models and Presenters (100% Shared)**
- Reuse existing view model types: `GraphViewModel`, `TimelineViewModel`, `StatsViewModel`, `InspectorViewModel`, `PanelViewModel`
- Reuse existing presenter classes: `GraphPresenter`, `TimelinePresenter`, `StatsPresenter`, `InspectorPresenter`, `PanelPresenter`
- Reuse factory functions: `createEmptyGraphViewModel()`, `createEmptyTimelineViewModel()`, etc.
- All view models remain immutable frozen objects for predictable rendering

**Network Layer Integration**
- Move `DevToolsServer`, `DevToolsClient`, `ClientRegistry` from `devtools-network` into `devtools/network/`
- Move `RemoteDataSource` and `LocalDataSource` from `devtools-react` into `devtools/data-source/`
- Reuse `WebSocketPort` and adapter pattern for platform-specific WebSocket implementations
- Share JSON-RPC protocol utilities from `devtools-core/protocol/`

## Existing Code to Leverage

**devtools-ui/src/state/reducer.ts**
- Complete framework-agnostic reducer with all action handlers for panel, graph, timeline, inspector
- Pure state transitions without side effects, directly reusable in unified package
- Selector functions for computed state access (e.g., `selectActiveTabId`, `selectSelectedNodeId`)

**devtools-ui/src/view-models/graph.vm.ts**
- `GraphViewModel` interface with nodes, edges, viewport, zoom, pan, selection state
- `GraphNodeViewModel` with position, dimensions, lifetime, factoryKind, selection/highlight flags
- `createEmptyGraphViewModel()` factory for initial state - directly reusable

**devtools-ui/src/ports/graph-view.port.ts**
- `GraphViewPort` using `createPort()` pattern as template for `RenderPrimitivesPort`
- `GraphViewContract` interface defining render/interaction methods
- Event types (`NodeClickEvent`, `EdgeClickEvent`) for interaction patterns

**devtools-tui/src/components/ascii-graph.ts**
- `renderAsciiGraph()` function with tree traversal algorithm for terminal rendering
- `AsciiGraphOptions` for configurable output (colors, lifetime badges, width)
- ANSI color constants mapping to lifetime types - reusable for TUI primitives

**devtools/src/react/devtools-floating.tsx**
- Complete floating panel implementation with resize handles, fullscreen, localStorage persistence
- Position-based styling logic for all four corners
- Production mode detection and auto-hiding - patterns to preserve in DOM entry

## Out of Scope

- Creating new visualization algorithms (reuse existing D3 dagre layout and ASCII tree)
- Changing the JSON-RPC protocol or message format
- Adding new DevTools features beyond current functionality
- Supporting renderers other than DOM and TUI (e.g., native mobile)
- Changing the existing `@hex-di/devtools-core` public API
- Adding new state management patterns beyond existing reducer
- Creating new presenter classes beyond existing five
- Implementing server-side rendering support
- Adding internationalization or localization
- Creating documentation site or migration guide (separate effort)
