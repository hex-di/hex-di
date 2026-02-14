# HexDI DevTools Specification

**Packages:** `@hex-di/devtools` + `@hex-di/devtools-client`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-09
**Last Updated:** 2026-02-10

---

## Summary

HexDI DevTools is a **standalone web dashboard** for inspecting HexDI applications at runtime. It runs as its own process on a dedicated port (e.g., `localhost:4200`) and connects to target applications over WebSocket. Target apps — whether React frontends or Node.js backends — install a lightweight client library that wraps the container's self-knowledge (`InspectorAPI`, `UnifiedSnapshot`, `ContainerGraphData`, `TracingAPI`, `LibraryInspector` protocol) and streams it to the dashboard for visual, interactive inspection.

The DevTools dashboard is the **dashboard** described in VISION.md. MCP is the OBD-II diagnostic port for AI agents; DevTools is the instrument cluster for human developers. Both consume the same self-knowledge infrastructure, but DevTools renders it as interactive visual panels in a standalone application that can inspect any HexDI-powered process.

## Packages

| Package                   | Description                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/devtools`        | Standalone Vite + React web dashboard. Built-in WebSocket server, all visualization panels, connection management, theme system, CLI entry point (`npx @hex-di/devtools`) |
| `@hex-di/devtools-client` | Lightweight zero-UI transport library. Wraps `InspectorAPI`, serializes data, streams via WebSocket. Auto-reconnection + message buffering. Works in React and Node.js    |
| `@hex-di/core`            | Enhanced with typed `LibraryInspector` protocol (compile-time snapshot shapes, `createLibraryInspectorPort` factory)                                                      |

## Dependencies

### `@hex-di/devtools` (Dashboard)

| Package | Type   | Description                                |
| ------- | ------ | ------------------------------------------ |
| `react` | direct | React >= 18 (dashboard UI framework)       |
| `ws`    | direct | WebSocket server for receiving client data |
| `vite`  | direct | Dev server and build tool                  |
| `dagre` | direct | Graph layout engine for dependency graph   |

The dashboard has **no peer dependencies** on `@hex-di/core`, `@hex-di/runtime`, or `@hex-di/react`. It receives all data over WebSocket as serialized JSON. It is a fully standalone application.

### `@hex-di/devtools-client` (Client)

| Package           | Type | Description                                                                                                                       |
| ----------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/core`    | peer | `InspectorAPI`, `UnifiedSnapshot`, `ContainerSnapshot`, `ScopeTree`, `LibraryInspector`, `ContainerGraphData`, `TracingAPI` types |
| `@hex-di/runtime` | peer | `Container`, `Scope` types for resolution context                                                                                 |
| `@hex-di/react`   | peer | _(optional)_ `InspectorProvider` context for the `DevToolsClientProvider` convenience wrapper                                     |

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
15. [Dedicated Library Panel Specifications](./04-panels.md#section-15-dedicated-library-panel-specifications)

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
