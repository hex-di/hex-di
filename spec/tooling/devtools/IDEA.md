# HexDI DevTools — Raw Idea

## What

A standalone web dashboard application for inspecting HexDI applications at runtime. Runs as its own process (e.g., `npx @hex-di/devtools` on `localhost:4200`) and connects to target applications over WebSocket. Target apps install a lightweight client library (`@hex-di/devtools-client`) that wraps the existing inspection infrastructure (InspectorAPI, UnifiedSnapshot, LibraryInspector protocol) and streams data to the dashboard. Works with both React frontend apps and Node.js backend apps.

## Key Goals

1. Visual debugging/inspection tool for HexDI applications
2. Standalone web dashboard — no browser extension needed, no in-app overlay, no framework coupling
3. Framework-agnostic client — works in React, Node.js, or any JavaScript environment
4. Multi-target inspection — connect multiple apps to a single dashboard simultaneously
5. Instance identification — each browser tab and Node.js process gets a unique instanceId with metadata (URL, PID) for disambiguation in the connection sidebar
6. Dedicated library panels — each library ships its own DevTools panel component (e.g., Flow → statechart, Query → cache table) via the panelModule field on LibraryInspector
7. Compile-time typed LibraryInspector protocol (typed snapshots per library, type-level library list, graph builder validates DevTools requirements)
8. Full visual spec including wireframes, panel layouts, interaction patterns

## Vision Alignment

- Follows VISION.md Phase 4: COMMUNICATION
- Transforms container self-knowledge into visual, interactive UI
- "The car's diagnostic dashboard" — not the OBD-II port (that's MCP), but the dashboard the driver sees
- Remote inspection realized from day one — not deferred to a future version

## Scope

- Standalone Vite + React web dashboard on its own port (`localhost:4200`)
- CLI entry point: `npx @hex-di/devtools`
- Built-in WebSocket server for receiving inspection data
- Lightweight zero-UI transport client for target apps (`@hex-di/devtools-client`)
- Connection management: multiple apps, connection sidebar, app selector
- Visual panels: Container overview, dependency graph, scope tree, service inspector, tracing timeline, library-specific panels, event log, unified snapshot
- Full visual spec with wireframes and interaction patterns
- Instance identification: instanceId per tab/process, metadata (URL/PID), displayLabel computation
- Subscription-based push protocol (subscribe/unsubscribe/data-update messages) alongside request-response
- Dedicated library panels shipped by each library package via panelModule dynamic import

## Architecture

Two packages:

- **`@hex-di/devtools`** — Standalone dashboard app with built-in WebSocket server, all visualization panels, CLI entry point
- **`@hex-di/devtools-client`** — Lightweight transport library installed in target apps. Wraps InspectorAPI, serializes and streams data via WebSocket. Auto-reconnection + message buffering.

## Dependencies

- Existing: InspectorAPI, UnifiedSnapshot, LibraryInspector protocol, React hooks (useSnapshot, useScopeTree, useUnifiedSnapshot, useTracingSummary), DevToolsBridge component
- New: Typed LibraryInspector protocol, compile-time validation in graph builder, WebSocket transport layer, RemoteInspectorAPI, CLI tooling

## Non-Goals (for v0.1.0)

- Browser extension (future)
- Time-travel debugging (future — needs store action history)
- Performance profiling (future — needs deeper tracing)
- Network/HTTP inspection (outside DI scope)
