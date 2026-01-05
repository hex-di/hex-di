# Spec Shaping Decisions

## Q1: View Structure

**Decision:** Dual-view approach

- Tree view for container hierarchy
- Graph view for port/adapter dependencies using existing ReactFlow component

## Q2: Metadata Display Strategy

**Decision:** Tiered display approach

- Tier 1 (Always visible): Port name, ownership badge, lifetime icon
- Tier 2 (Hover tooltip): Container list, adapter details, inheritance mode
- Tier 3 (Details panel): Full configuration, resolution traces, dependencies

## Q3: Layout Location

**Decision:** Enhance existing split pane in GraphTabContent

- Add container tree in left sidebar
- Keep graph in main area
- Reuse existing infrastructure

## Q4: Multi-Adapter Display

**Decision:** Hybrid approach

- Tooltip shows full container list on hover
- Count badge for ports with 3+ adapters
- Ownership-based visual styling (border, opacity, badges)

## Q5: Adapter Ownership States

**Decision:** 3-state model

- `own`: Adapter registered directly in container (solid 2px border, full opacity)
- `inherited`: Adapter from parent container (dashed 4-2 border, 85% opacity, S/F/I badge)
- `overridden`: Child override of parent adapter (double 3px border, OVR badge)

**Runtime changes required:**

- Add `overridePorts: Set<Port>` to AdapterRegistry
- Add `isOverride()` method
- Update `ServiceOrigin` type to include `"overridden"`
- Pass `isOverride` flag when registering from `overrides` map

## Q6: Filtering and Search

**Decision:** Filters + Quick Presets (Option B)

- Port name search with fuzzy matching
- Filter chips: Lifetime, Container, Ownership state
- Quick presets: "Overrides Only", "Async Services", "Current Container", "Inherited Only"
- Reuse existing filter infrastructure (`ServiceSearch`, `FilterTag`, `ActiveFiltersBar`)

## Q7: Real-time Updates & Container Lifecycle

**Decision:** Enhanced Lifecycle States (Option B)

- Add `ContainerLifecycleEmitter` similar to existing `ScopeLifecycleEmitter`
- Add "disposing" intermediate state to `ContainerPhase`
- Add init-progress emission from `AsyncInitializer`
- Animated transitions with state-specific styling:
  - Pending: gray pulsing
  - Initializing: blue progress indicator
  - Ready: green solid
  - Disposing: orange fade-out
  - Disposed: removed with animation

**Animation Timing:**

- Container Enter: 250ms fade-in, 50ms stagger between siblings
- Container Exit: 200ms fade-out
- State Change: 150ms badge color transition

**React Patterns:**

- `useSyncExternalStore` for concurrent-safe subscriptions
- `queueMicrotask` deferral to prevent setState during render
- Version-based snapshot memoization
- Presence-based animation states (entering/entered/exiting/exited)

## Q8: Performance & Scalability

**Decision:** Minimal - Defer Performance Work (Option D)

- Only add `React.memo` to critical components when needed
- No virtualization initially
- No caching improvements initially
- Address performance later when scale requires it

**Target Scale:** <50 containers (typical development use case)

**Deferred for Later:**

- Tree/timeline virtualization (@tanstack/react-virtual)
- Viewport culling for graph
- Async layout (ELKjs)
- Canvas rendering
- Memory pressure adaptation
