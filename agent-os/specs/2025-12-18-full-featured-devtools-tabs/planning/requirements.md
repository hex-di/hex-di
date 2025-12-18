# Spec Requirements: Full-Featured DevTools Tabs

## Initial Description

The user wants to improve the devtools tabs to be fully functional and support devtool interfaces for all HexDI features. Key constraint: web browser devtools and TUI devtools must stay in sync, sharing the same business logic code with only the adapters being different.

## Requirements Discussion

### First Round Questions

**Q1:** I assume the goal is to make all 4 current tabs (Graph, Services, Tracing, Inspector) fully functional in both browser and TUI environments. Is that correct, or should we add/remove tabs?
**Answer:** Fully functional. Adjust with new HexDI concepts (async factories, child containers). Can add new tabs - use UX/UI and DI expert judgment to decide what tabs make sense.

**Q2:** I assume the existing RenderPrimitivesPort abstraction is the correct approach for sharing business logic while having different adapters. Should we continue with this pattern?
**Answer:** Yes, continue with RenderPrimitivesPort pattern for sharing business logic.

**Q3:** For the TUI environment, I'm assuming keyboard navigation is the primary interaction method. Should we also support mouse clicks?
**Answer:** Should also support mouse clicks if possible.

**Q4:** Regarding HexDI features needing devtools support - are there other features beyond container hierarchy, async factories, captive dependency detection, scope hierarchy, and resolution hooks/tracing?
**Answer:** Yes, all identified features should be supported:
- Container hierarchy (parent/child containers)
- Async factory resolution
- Captive dependency detection warnings
- Scope hierarchy visualization
- Resolution hooks/tracing

**Q5:** I assume real-time synchronization between browser and TUI devtools is required. Is this in scope?
**Answer:** Yes, required between browser and TUI.

**Q6:** For the Graph tab, should we support filtering/searching nodes by name or lifetime?
**Answer:** All filters in browser version should be exactly in TUI version - feature parity.

**Q7:** For the Tracing tab, should traces persist across page reloads?
**Answer:** Same features - traces should persist like browser version.

**Q8:** Is there anything that should be explicitly OUT of scope?
**Answer:** User requested further discussion to clarify scope.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: RenderPrimitivesPort - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/ports/render-primitives.port.ts`
- Feature: DOM Primitives Adapter - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/dom/primitives.tsx`
- Feature: Shared Headless Components - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/components/`
- Feature: State Management (reducer/actions/selectors) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/state/`
- Feature: View Models - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/view-models/`
- Feature: Presenters - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/presenters/`
- Feature: Existing TUI App (to be refactored) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools-tui/src/tui/App.tsx`
- Feature: Rich React Components (to be consolidated) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/`

### Follow-up Questions

**Follow-up 1:** What should be OUT of scope? (UI/UX features, Export/Integration features, Advanced features)
**Answer:**
- **OUT of Scope (UI/UX - Lean MVP):** Custom color themes (beyond dark/light), user-configurable panel layouts, keyboard shortcut customization, accessibility features (screen reader, high contrast)
- **OUT of Scope (Integrations - None now, architecture for future):** No export features now (PNG/SVG, JSON/CSV), no Chrome DevTools Protocol integration, no APM integration. BUT architecture should support adding all these later (especially APM - emphasized)
- **IN Scope (Advanced Features - All):** Time-travel debugging, performance profiling with flame graphs, memory usage tracking per service, comparison view (diff between snapshots)

**Follow-up 2:** What is the priority order for tabs? Should we implement browser-first or build both in parallel?
**Answer:** All tabs together - implement all tabs simultaneously. Browser & TUI in parallel (not sequential).

**Follow-up 3:** Are there any technical constraints (bundle size, terminal support, performance)?
**Answer:** No specific performance constraints. Bundle strategy: Optional production - devtools can be included in production for debugging, but should be tree-shakeable.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files were provided for analysis.

## Requirements Summary

### Functional Requirements

**Tab Structure (All Fully Functional in Browser & TUI):**
- **Graph Tab:** Dependency graph visualization with node selection, highlighting, zoom/pan (browser), scroll (TUI), filtering by name/lifetime, lifetime indicators (singleton/scoped/transient), async factory indicators
- **Services Tab:** List of registered services with details, dependency relationships, lifetime information
- **Tracing Tab:** Live resolution trace stream, duration highlighting (slow resolutions), cache hit/miss indicators, grouping by service or time, persistence across reloads
- **Inspector Tab:** Detailed service/scope inspection, dependency tree view, scope hierarchy visualization

**HexDI Feature Coverage:**
- Container hierarchy visualization (parent/child containers)
- Async factory resolution status and timing
- Captive dependency detection with warnings
- Scope hierarchy tree visualization
- Resolution hooks and tracing data
- Service lifetime management (singleton, scoped, transient)

**Advanced Features (All In Scope):**
- Time-travel debugging - step through historical container states
- Performance profiling with flame graphs for resolution timing
- Memory usage tracking per service instance
- Comparison view - diff between two container snapshots

**Cross-Platform Requirements:**
- Full feature parity between browser and TUI
- Real-time synchronization between browser and TUI devtools
- Mouse support in TUI terminals where available
- Keyboard navigation in both environments
- Trace persistence in both environments

**Architecture Requirements:**
- Continue using RenderPrimitivesPort abstraction pattern
- Shared business logic with platform-specific adapters only
- Tree-shakeable for production builds
- Architecture extensible for future integrations (APM, exports, Chrome DevTools Protocol)

### Reusability Opportunities

**Existing Infrastructure to Leverage:**
- `RenderPrimitivesPort` - Port abstraction for cross-platform rendering
- `DevToolsState`, `devToolsReducer`, `actions` - State management infrastructure
- View model types (`GraphViewModel`, `TimelineViewModel`, `StatsViewModel`, `InspectorViewModel`, `PanelViewModel`)
- Presenter classes for transforming data to view models
- Shared headless components (`DevToolsPanel`, `GraphView`, `TimelineView`, `StatsView`, `InspectorView`)
- DOM primitives adapter as reference for TUI primitives implementation

**Components to Consolidate:**
- Rich React components in `/react/` should use shared headless components
- TUI app should be refactored to use shared state/components

### Scope Boundaries

**In Scope:**
- All 4+ tabs fully functional (Graph, Services, Tracing, Inspector)
- All tabs implemented simultaneously
- Browser and TUI platforms built in parallel
- Full feature parity between platforms
- Real-time sync between browser and TUI
- All HexDI features visualized
- Time-travel debugging
- Flame graph profiling
- Memory tracking
- Container snapshot comparison
- Dark/light mode toggle
- Basic keyboard navigation

**Out of Scope:**
- Custom color themes (beyond dark/light)
- User-configurable panel layouts (drag-to-resize, dock positions)
- Keyboard shortcut customization
- Accessibility features (screen reader support, high contrast mode)
- Export to PNG/SVG images
- Export traces to JSON/CSV
- Chrome DevTools Protocol integration
- APM tool integrations (Datadog, New Relic, etc.)

**Future Considerations (Architecture Ready):**
- APM integrations (user emphasized importance)
- Export functionality
- Chrome DevTools Protocol
- Extended accessibility support

### Technical Considerations

- **Bundle Strategy:** Tree-shakeable, optional inclusion in production
- **Performance:** No specific constraints, but should handle reasonable graph sizes smoothly
- **TUI Support:** Mouse clicks where terminal supports it, keyboard navigation universal
- **State Sync:** WebSocket-based real-time communication between browser and TUI clients
- **Persistence:** Traces persist across page reloads (localStorage in browser, file-based or in-memory for TUI)

### Implementation Approach

- **Parallelization:** All tabs built simultaneously, browser and TUI in parallel
- **Pattern:** RenderPrimitivesPort with DOM and TUI adapters
- **Shared Code:** State management, view models, presenters, headless components
- **Platform-Specific:** Only render primitives adapters differ between platforms
