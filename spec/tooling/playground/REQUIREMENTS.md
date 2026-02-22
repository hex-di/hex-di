# HexDi Playground — Requirements

## Confirmed Decisions

- **Package sharing**: Level A — Extract `@hex-di/devtools-ui` shared package. Both devtools and playground depend on it.
- **Execution model**: Fully in-browser — esbuild-wasm compiles TypeScript, Web Worker executes. Static-hostable, no backend.
- **Deployment**: Standalone app only — own URL (`npx @hex-di/playground` or hosted static site). No devtools panel integration.
- **V1 scope**: Multi-file support, documentation embedding, URL sharing/permalinks, all library packages available.

## Package Architecture

4 packages total:

- `@hex-di/devtools-ui` — Shared panels, visualization, theme, hooks (new)
- `@hex-di/devtools` — WebSocket dashboard + CLI (existing spec, refactored)
- `@hex-di/devtools-client` — WebSocket transport for target apps (existing spec, unchanged)
- `@hex-di/playground` — Code editor + sandbox + examples + embedding (new)

## Core Abstraction

`InspectorDataSource` interface — implemented by `RemoteInspectorAPI` (devtools) and `PlaygroundInspectorBridge` (playground). Panels program against this interface and work identically in both contexts.

## Playground Features (v1)

- Monaco Editor with full TypeScript language service
- Multi-file virtual filesystem with tab-based switching
- esbuild-wasm compilation + Web Worker sandbox execution
- All hex-di packages available (core, graph, runtime, result, flow, store, query, saga, tracing, logger)
- 7 visualization panels reused from devtools-ui (Overview, Container, Graph, Scopes, Events, Tracing, Health)
- URL hash encoding for sharing (no backend)
- Iframe-embeddable mode for documentation
- ~12 curated standalone examples
- Console output capture and rendering
- Light/dark theme (shared with devtools)
- 5-second execution timeout, Web Worker isolation
