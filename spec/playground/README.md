# HexDi Playground — Specification

An interactive browser-based environment for experimenting with HexDi dependency injection patterns. Built on the same visualization infrastructure as HexDi DevTools, the playground lets developers write, compile, and execute HexDi code directly in the browser while visualizing the resulting container state in real time.

## Packages

| Package               | Role                                       | Dependencies                                           |
| --------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `@hex-di/devtools-ui` | Shared panels, visualization, theme, hooks | `@hex-di/core` (types only)                            |
| `@hex-di/playground`  | Code editor, sandbox, examples, embedding  | `@hex-di/devtools-ui`, `monaco-editor`, `esbuild-wasm` |

The playground also triggers changes to the existing devtools package:

| Package                   | Change                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `@hex-di/devtools`        | Refactored to consume `@hex-di/devtools-ui` instead of owning panels directly |
| `@hex-di/devtools-client` | No changes                                                                    |

## Key Features

- **Monaco Editor** with full TypeScript language service (autocomplete, type checking, go-to-definition)
- **Multi-file virtual filesystem** with tab-based file switching
- **esbuild-wasm compilation** (~50ms TypeScript to JavaScript)
- **Web Worker sandbox** for isolated execution with 5-second timeout
- **7 visualization panels** reused from devtools-ui (Overview, Container, Graph, Scopes, Events, Tracing, Health)
- **Console output capture** from sandbox execution
- **~12 curated examples** covering all HexDi patterns
- **URL hash sharing** for code permalinks (no backend required)
- **Iframe-embeddable mode** for documentation sites
- **Light/dark theme** shared with devtools
- **Static-hostable** — no server required, deployable to any CDN

## Table of Contents

### [01 — Overview](./01-overview.md)

1. Overview (goals, scope, version)
2. Philosophy (relationship to devtools, design principles)
3. Package Architecture (4-package dependency graph, boundaries)
4. Data Flow Comparison (devtools vs playground)

### [02 — Shared Infrastructure](./02-shared-infrastructure.md)

5. The `InspectorDataSource` Abstraction
6. `@hex-di/devtools-ui` Package (module structure, exports)
7. Shared Panels (registration, props, built-in set)
8. Shared Visualization Components (graph, tree, timeline, JSON tree)
9. Shared Theme System (design tokens, providers, CSS variables)
10. Shared Hooks (data source hooks, utility hooks)

### [03 — Code Editor](./03-code-editor.md)

11. Monaco Editor Integration (configuration, TypeScript language service)
12. Type Definition Bundling (`.d.ts` files for all hex-di packages)
13. Multi-File Virtual Filesystem
14. File Tree Sidebar

### [04 — Sandbox](./04-sandbox.md)

15. Compilation Pipeline (esbuild-wasm)
16. Web Worker Sandbox (execution isolation, timeout)
17. Worker Protocol (postMessage types, request/response, push events)
18. `PlaygroundInspectorBridge` (InspectorDataSource over postMessage)
19. Execution Safety (isolation, timeout, console interception)

### [05 — Layout and Panels](./05-layout-and-panels.md)

20. Playground Layout (three-pane structure)
21. Editor Pane (code editor + file tree)
22. Visualization Pane (panel host + tab navigation)
23. Console Pane (captured output rendering)
24. Resizable Splitters
25. Responsive Behavior

### [06 — Examples and Sharing](./06-examples-and-sharing.md)

26. Example Library (catalog, template format)
27. Example Templates (~12 curated examples)
28. URL Sharing (multi-file encoding, permalink generation)
29. Iframe Embedding (embed mode, reduced chrome, responsive)

### [07 — API Reference](./07-api-reference.md)

30. Playground Public API
31. Sandbox API
32. Editor API
33. Sharing API
34. Embedding API
35. `InspectorDataSource` (from `@hex-di/devtools-ui`)
36. Hooks (from `@hex-di/devtools-ui`)
37. Supporting Types

### [08 — DevTools Spec Changes](./08-devtools-changes.md)

38. Summary of Required Changes
39. PanelProps Migration (`remoteInspector` to `dataSource`)
40. Package Structure Split (panels/viz/theme to devtools-ui)
41. RemoteInspectorAPI Changes (implements InspectorDataSource)
42. Section-by-Section Change Log

### [09 — Definition of Done](./09-definition-of-done.md)

43. Test Requirements for `@hex-di/devtools-ui`
44. Test Requirements for `@hex-di/playground`
45. Integration Test Requirements
46. Acceptance Criteria

## Release Scope: v0.1.0

The initial release includes the complete playground application with all features listed above. The `@hex-di/devtools-ui` extraction is a prerequisite that also constitutes a breaking change to the devtools package structure.
