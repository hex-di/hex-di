# Specification: Full-Featured DevTools Tabs

## Goal
Build fully functional DevTools tabs (Graph, Services, Tracing, Inspector) for both browser and TUI environments with complete feature parity, real-time synchronization, and support for all HexDI features including child containers, async factories, captive dependency detection, and time-travel debugging.

## User Stories
- As a developer, I want to visualize my container's dependency graph and inspect individual services so that I can understand and debug my application's DI structure
- As a developer, I want to trace service resolutions in real-time with performance metrics so that I can identify bottlenecks and optimize my application
- As a developer, I want to use the same DevTools features in both browser and terminal environments so that I can debug regardless of my development setup

## Specific Requirements

**Graph Tab - Full Visualization**
- Display dependency graph with nodes colored by lifetime (singleton/scoped/transient)
- Show async factory indicators on nodes using the existing `factoryKind` property
- Support node selection with dependency path highlighting
- Implement zoom/pan in browser (SVG transform), scroll navigation in TUI
- Add filtering by name pattern and lifetime type
- Visualize child container relationships with container hierarchy overlays
- Highlight captive dependency warnings (scoped/transient depending on singleton)

**Services Tab - Registry Overview**
- List all registered ports with lifetime and factory kind
- Show resolution count and cache hit statistics per service
- Display dependency count (in/out edges) for each service
- Support sorting by name, lifetime, resolution count, or duration
- Add search/filter functionality matching Graph tab filters
- Group services by container when child containers are present

**Tracing Tab - Resolution Timeline**
- Display live stream of resolution traces with parent-child hierarchy
- Show duration with color-coded performance indicators (green/yellow/red)
- Indicate cache hits vs fresh resolutions
- Support grouping by service, scope, lifetime, or time window
- Implement trace persistence across page reloads (localStorage browser, file TUI)
- Add pause/resume controls and trace pinning for slow resolutions
- Display scope hierarchy context for each trace entry

**Inspector Tab - Deep Inspection**
- Show detailed service info including all statistics from `ServiceInfoViewModel`
- Display bidirectional dependency tree (dependencies and dependents)
- Visualize scope hierarchy with expandable tree view
- Show container snapshot with phase status (initializing/ready/disposing/disposed)
- Support navigation from Graph/Tracing tabs to Inspector
- Display async factory resolution status and timing

**Child Container Visualization**
- Add container selector dropdown when multiple containers detected
- Show parent-child container relationships in Graph with visual grouping
- Display container-specific services and inherited services differently
- Enable cross-container dependency tracing
- Show container lifecycle phase in Inspector tab

**Async Factory Support**
- Display async indicator icon on graph nodes and service list
- Show pending/resolved/error states for async factories
- Track async resolution timing separately in traces
- Add filter for async-only services

**Captive Dependency Detection**
- Highlight captive dependencies with warning indicators in Graph
- Show warning badge on Services tab for affected services
- Display detailed captive chain in Inspector when service selected
- Support filtering to show only captive dependency issues

**Time-Travel Debugging**
- Implement snapshot capture for container state at each resolution
- Add timeline scrubber to navigate historical states
- Show state diff between snapshots
- Integrate with existing `ContainerSnapshot` type
- Store snapshots efficiently with delta compression

**Performance Profiling with Flame Graphs**
- Generate flame graph visualization from trace hierarchy
- Show cumulative vs self time per service
- Support zoom into specific resolution chains
- Add threshold-based filtering for significant operations

**Memory Usage Tracking**
- Track estimated instance count per lifetime
- Show singleton pool size and scoped instance distribution
- Display memory growth trends over time in Stats
- Integrate with existing `TraceStats` metrics

**Comparison View**
- Capture named snapshots manually or on events
- Side-by-side diff view for two snapshots
- Highlight added/removed/changed services and dependencies
- Show resolution count and timing deltas

**Real-Time Browser/TUI Synchronization**
- Use existing WebSocket server (`DevToolsServer`) for state broadcasting
- Implement bidirectional action synchronization via JSON-RPC
- Sync selection state, filters, and view preferences
- Handle connection/disconnection gracefully with reconnection
- Support multiple TUI clients observing same browser app

**Dark/Light Mode Toggle**
- Use existing `isDarkMode` state and `SET_DARK_MODE` action
- Extend `SemanticColor` system with theme-aware values
- Apply theme to both DOM CSS variables and TUI ANSI colors
- Persist theme preference per environment

## Existing Code to Leverage

**RenderPrimitivesPort Pattern**
- Use existing port at `/packages/devtools/src/ports/render-primitives.port.ts` as foundation
- DOM adapter at `/packages/devtools/src/dom/primitives.tsx` provides browser implementation
- TUI adapter at `/packages/devtools/src/tui/primitives.tsx` provides terminal implementation
- Extend with new primitives: `FlameGraph`, `Timeline`, `DiffView` as needed

**State Management Infrastructure**
- Leverage existing reducer/actions/selectors at `/packages/devtools/src/state/`
- Extend `DevToolsState` with new fields for time-travel, snapshots, and comparison
- Add new action types for advanced features (capture snapshot, navigate history)
- Use existing pattern of immutable state updates with `Object.freeze`

**View Models and Presenters**
- Extend `GraphViewModel` with container hierarchy and captive warning fields
- Add new view models: `FlameGraphViewModel`, `ComparisonViewModel`, `TimeTravelViewModel`
- Follow existing presenter pattern from `GraphPresenter` for new presenters
- Use `PresenterDataSourceContract` for data access abstraction

**Shared Headless Components**
- Build on existing components at `/packages/devtools/src/components/`
- `DevToolsPanel`, `GraphView`, `TimelineView`, `StatsView`, `InspectorView` are already headless
- Create new shared components for flame graph, diff view, and time-travel controls

**WebSocket Communication**
- Use `DevToolsServer` from `/packages/devtools-network/src/server/websocket-server.ts`
- Extend JSON-RPC protocol with new methods for advanced features
- Leverage existing broadcast mechanism for real-time sync

## Out of Scope
- Custom color themes beyond dark/light mode toggle
- User-configurable panel layouts (drag-to-resize, dock positions)
- Keyboard shortcut customization
- Screen reader and high contrast accessibility features
- Export to PNG/SVG image formats
- Export traces to JSON/CSV files
- Chrome DevTools Protocol integration
- APM tool integrations (Datadog, New Relic) - architecture must support future addition
- Mobile/touch-optimized interface
- Internationalization/localization of UI text
