# HexDI React DevTools — Raw Idea

## What

An in-app overlay panel (like React Query DevTools) for inspecting HexDI applications at runtime. Built as embeddable React components that consume the existing inspection infrastructure (InspectorAPI, UnifiedSnapshot, LibraryInspector protocol).

## Key Goals

1. Visual debugging/inspection tool for HexDI applications
2. In-app overlay panel — no browser extension needed
3. Compile-time typed LibraryInspector protocol (typed snapshots per library, type-level library list, graph builder validates DevTools requirements)
4. Full visual spec including wireframes, panel layouts, interaction patterns

## Vision Alignment

- Follows VISION.md Phase 4: COMMUNICATION
- Transforms container self-knowledge into visual, interactive UI
- "The car's diagnostic dashboard" — not the OBD-II port (that's MCP), but the dashboard the driver sees

## Scope

- In-app overlay panel (toggleable, like React Query DevTools)
- React components consuming existing inspection hooks
- Compile-time typed LibraryInspector protocol enhancement
- Visual panels: Container overview, dependency graph, scope tree, service inspector, tracing timeline, library-specific panels, event log, unified snapshot
- Full visual spec with wireframes and interaction patterns

## Dependencies

- Existing: InspectorAPI, UnifiedSnapshot, LibraryInspector protocol, React hooks (useSnapshot, useScopeTree, useUnifiedSnapshot, useTracingSummary), DevToolsBridge component
- New: Typed LibraryInspector protocol, compile-time validation in graph builder

## Non-Goals (for v0.1.0)

- Browser extension (future)
- Time-travel debugging (future — needs store action history)
- Performance profiling (future — needs deeper tracing)
- Network/HTTP inspection (outside DI scope)
