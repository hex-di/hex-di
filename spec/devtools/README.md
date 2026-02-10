# HexDI DevTools Specification

**Package:** `@hex-di/devtools`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-09
**Last Updated:** 2026-02-09

---

## Summary

`@hex-di/devtools` is an in-app overlay panel for inspecting HexDI applications at runtime. It provides a visual dashboard that consumes the container's self-knowledge -- `InspectorAPI`, `UnifiedSnapshot`, `ContainerGraphData`, `TracingAPI`, and the `LibraryInspector` protocol -- to give developers a real-time, interactive view of their entire DI ecosystem. Like React Query DevTools or Jotai DevTools, but for the full HexDI nervous system.

The devtools overlay is the **dashboard** described in VISION.md. MCP is the OBD-II diagnostic port for AI agents; DevTools is the instrument cluster for human developers. Both consume the same self-knowledge infrastructure, but DevTools renders it as interactive, visual panels inside the running application.

## Packages

| Package            | Description                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/devtools` | Core devtools overlay panel, built-in panels, visualization components, and theme system                                                  |
| `@hex-di/core`     | Enhanced with typed `LibraryInspector` protocol (compile-time snapshot shapes, `createLibraryInspectorPort` factory)                      |
| `@hex-di/react`    | Existing inspection hooks consumed by devtools (`useInspector`, `useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary`) |

## Dependencies

| Package           | Type | Description                                                                                                                       |
| ----------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/core`    | peer | `InspectorAPI`, `UnifiedSnapshot`, `ContainerSnapshot`, `ScopeTree`, `LibraryInspector`, `ContainerGraphData`, `TracingAPI` types |
| `@hex-di/runtime` | peer | `Container`, `Scope` types for resolution context                                                                                 |
| `@hex-di/react`   | peer | `InspectorProvider`, `useInspector`, `useSnapshot`, `useScopeTree`, `useUnifiedSnapshot`, `useTracingSummary` hooks               |
| `react`           | peer | React >= 18 (for `useSyncExternalStore`, concurrent features)                                                                     |

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)

### [02 - Compile-Time Protocol](./02-compile-time-protocol.md)

4. [Typed LibraryInspector Protocol](./02-compile-time-protocol.md#4-typed-libraryinspector-protocol)
5. [Compile-Time Validation](./02-compile-time-protocol.md#5-compile-time-validation)

### [03 - Panel Architecture](./03-panel-architecture.md)

6. [Panel Architecture](./03-panel-architecture.md#6-panel-architecture)
7. [Component Tree](./03-panel-architecture.md#7-component-tree)

### [04 - Panels](./04-panels.md)

8. [Container Panel](./04-panels.md#section-8-container-panel)
9. [Graph Panel](./04-panels.md#section-9-graph-panel)
10. [Scope Tree Panel](./04-panels.md#section-10-scope-tree-panel)
11. [Tracing Panel](./04-panels.md#section-11-tracing-panel)
12. [Library Panels and Event Log](./04-panels.md#section-12-library-panels-and-event-log)
13. [Unified Overview Panel](./04-panels.md#section-13-unified-overview-panel)
14. [Health & Diagnostics Panel](./04-panels.md#section-14-health--diagnostics-panel)
15. [Library Panel Roadmap](./04-panels.md#section-15-library-panel-roadmap)

### [05 - Visual Design](./05-visual-design.md)

16. [Visual Design System](./05-visual-design.md#13-visual-design-system)
17. [Wireframes](./05-visual-design.md#14-wireframes)
18. [Interaction Patterns](./05-visual-design.md#15-interaction-patterns)

### [06 - API Reference](./06-api-reference.md)

19. [API Reference](./06-api-reference.md#16-api-reference)

### [07 - Appendices](./07-appendices.md)

20. [Appendices](./07-appendices.md#17-appendices)

### [08 - Definition of Done](./08-definition-of-done.md)

21. [Definition of Done](./08-definition-of-done.md#18-definition-of-done)

---

## Release Scope

All sections (1-21) ship in version 0.1.0. Browser extension, time-travel debugging, and performance profiling are deferred to future versions.

---

_End of Table of Contents_
