# Specification: DevTools Architecture Visualization

## Goal

Enable developers to visualize and explore the complete dependency injection architecture of their application, including container hierarchies, port/adapter relationships, and adapter ownership states (owned, inherited, overridden) across the container tree.

## User Stories

- As a developer, I want to see a tree view of all containers in my application so that I understand the container hierarchy and relationships
- As a developer, I want to view a graph of all ports showing which containers provide adapters so that I can trace adapter ownership and overrides

## Specific Requirements

**Dual-View Layout Structure**

- Enhance existing `GraphTabContent` component with a container tree sidebar on the left
- Keep dependency graph visualization in the main area on the right
- Container tree shows hierarchical parent-child relationships
- Graph view displays port/adapter dependencies with ownership indicators
- Maintain existing split pane behavior and resizable boundaries

**Container Tree View**

- Display all discovered containers from `ContainerTreeContext`
- Show container hierarchy with proper indentation for nested containers
- Display `ContainerKindBadge` (root, child, lazy) for each container
- Support multi-select checkboxes for filtering graph view
- Include "All" and "None" quick selection actions in header

**3-State Adapter Ownership Model**

- `own`: Adapter registered directly in container - solid 2px border, full opacity
- `inherited`: Adapter from parent container - dashed 4-2 border, 85% opacity, S/F/I badge for inheritance mode (Shared/Forked/Isolated)
- `overridden`: Child override of parent adapter - double 3px border, OVR badge
- Runtime changes required: Add `overridePorts: Set<Port>` to AdapterRegistry, add `isOverride()` method, update `ServiceOrigin` type to include `"overridden"`

**Tiered Metadata Display**

- Tier 1 (Always visible on node): Port name, ownership badge, lifetime icon
- Tier 2 (Hover tooltip): Full container list, adapter details, inheritance mode, dependency/dependent counts
- Tier 3 (Details panel): Full configuration, resolution traces, dependencies graph

**Multi-Adapter Display for Unified Graph**

- Ports provided by multiple containers show count badge when 3+ adapters
- Tooltip displays full container list on hover with each container's ownership state
- Ownership-based visual styling distinguishes adapters from different containers

**Filtering and Search**

- Port name search with fuzzy matching
- Filter chips for: Lifetime (singleton/scoped/transient), Container, Ownership state (own/inherited/overridden)
- Quick presets: "Overrides Only", "Async Services", "Current Container", "Inherited Only"
- Reuse existing filter infrastructure (`ServiceSearch`, `FilterTag`, `ActiveFiltersBar`)

**Real-time Lifecycle Updates**

- Add `ContainerLifecycleEmitter` following existing `ScopeLifecycleEmitter` pattern
- Add "disposing" intermediate state to `ContainerPhase`
- Emit init-progress events from `AsyncInitializer`
- Container lifecycle states with visual styling: Pending (gray pulsing), Initializing (blue progress), Ready (green solid), Disposing (orange fade-out), Disposed (removed with animation)
- Animation timing: Container Enter 250ms fade-in with 50ms sibling stagger, Exit 200ms fade-out, State Change 150ms badge color transition
- Use `useSyncExternalStore` for concurrent-safe subscriptions, `queueMicrotask` deferral

**Performance Strategy**

- Target scale: <50 containers (typical development use case)
- Apply `React.memo` only to critical components when profiling shows need
- No virtualization initially - defer until scale requires it
- No caching improvements initially - optimize later based on profiling

## Existing Code to Leverage

**GraphTabContent (`/packages/devtools/src/react/graph-tab-content.tsx`)**

- Already has left sidebar pattern with `ContainerMultiSelect`
- Uses `ContainerTreeContext` for container discovery
- Builds unified graph with `buildUnifiedGraph()` utility
- Extend this component rather than creating new layout

**ContainerMultiSelect (`/packages/devtools/src/react/container-multi-select.tsx`)**

- Recursive `TreeNode` component with checkbox selection
- `ContainerKindBadge` for container type display
- "All" and "None" action buttons pattern
- Extend or fork for ownership visualization needs

**Graph Visualization Types (`/packages/devtools/src/react/graph-visualization/types.ts`)**

- `PositionedNode` already has `origin` and `inheritanceMode` fields
- `GraphInteractionState` for hover/selection state
- Add `ownership: "own" | "inherited" | "overridden"` to node type

**GraphTooltip (`/packages/devtools/src/react/graph-visualization/graph-tooltip.tsx`)**

- Existing tooltip showing node details including origin and inheritance mode
- Already displays containers list for unified multi-select view
- Extend to show ownership state and override information

**InspectorWithSubscription (`/packages/inspector/src/types.ts`)**

- `getGraphData()` returns `ContainerGraphData` with `VisualizableAdapter` array
- `getChildContainers()` enables recursive hierarchy traversal
- Add `isOverride` flag to `VisualizableAdapter` interface

## Out of Scope

- Virtualization for large container trees (>50 containers)
- Canvas-based rendering for graph visualization
- Viewport culling for graph nodes outside visible area
- ELKjs async layout computation
- Memory pressure adaptation
- Full configuration editing from DevTools
- Container creation/deletion from DevTools UI
- Cross-application container discovery (only single React tree)
- Historical state snapshots or time-travel debugging
