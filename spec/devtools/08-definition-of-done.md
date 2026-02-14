# 18 - Definition of Done

_Previous: [17 - Appendices](./07-appendices.md)_

---

This document defines all tests required for `@hex-di/devtools` (dashboard) and `@hex-di/devtools-client` (transport) to be considered complete. Each section maps to spec section(s) and specifies required unit tests, type-level tests, component tests, integration tests, and mutation testing guidance.

## Test File Convention

### `@hex-di/devtools` (Dashboard)

| Test Category     | File Pattern  | Location                               |
| ----------------- | ------------- | -------------------------------------- |
| Unit tests        | `*.test.ts`   | `packages/devtools/tests/`             |
| Type-level tests  | `*.test-d.ts` | `packages/devtools/tests/`             |
| Component tests   | `*.test.tsx`  | `packages/devtools/tests/`             |
| Integration tests | `*.test.tsx`  | `packages/devtools/tests/integration/` |

### `@hex-di/devtools-client` (Client)

| Test Category     | File Pattern  | Location                                      |
| ----------------- | ------------- | --------------------------------------------- |
| Unit tests        | `*.test.ts`   | `packages/devtools-client/tests/`             |
| Type-level tests  | `*.test-d.ts` | `packages/devtools-client/tests/`             |
| Integration tests | `*.test.ts`   | `packages/devtools-client/tests/integration/` |

---

## DoD 1: Compile-Time Protocol (Spec Sections 4-5)

### Unit Tests -- `typed-protocol.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 1   | `TypedLibraryInspector` instance is assignable to `LibraryInspector` at runtime    | unit |
| 2   | `createTypedLibraryInspectorPort` creates port with `"library-inspector"` category | unit |
| 3   | `TypedLibraryInspector` preserves snapshot type parameter through `getSnapshot()`  | unit |
| 4   | `isLibraryInspector` returns `true` for `TypedLibraryInspector` instances          | unit |
| 5   | `createTypedLibraryInspectorPort` creates frozen port token                        | unit |
| 6   | Port `__portName` matches the provided name                                        | unit |

### Type-Level Tests -- `typed-protocol.test-d.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `ExtractLibraryInspectorPorts` extracts only `"library-inspector"` category ports    | type |
| 2   | `ExtractLibraryNames` produces correct string literal union from graph provides      | type |
| 3   | `LibrarySnapshotMap` maps library names to their typed snapshot interfaces           | type |
| 4   | `TypedUnifiedSnapshot` is assignable to base `UnifiedSnapshot`                       | type |
| 5   | Graph with no library-inspector ports produces empty map for `LibrarySnapshotMap`    | type |
| 6   | Mixed typed and untyped library inspectors both pass `isLibraryInspector` type guard | type |
| 7   | `TypedLibraryInspector<"flow", FlowSnapshot>` is assignable to `LibraryInspector`    | type |
| 8   | `createTypedLibraryInspectorPort` return type has correct generic parameters         | type |
| 9   | `ExtractLibraryInspectorPorts` returns `never` for non-library-inspector ports       | type |

### Mutation Testing

**Target: >95% mutation score.** The typed protocol is the compile-time foundation. Mutations to port category assignment, type guard checks, or snapshot type preservation must be caught. The `createTypedLibraryInspectorPort` factory must produce ports with the correct category string -- any mutation to `"library-inspector"` would break auto-discovery.

---

## DoD 2: Dashboard Shell & Layout (Spec Sections 6-7)

### Component Tests -- `dashboard-shell.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | Dashboard renders sidebar with app list and panel navigation              | component |
| 2   | Dashboard renders connection header with active app info                  | component |
| 3   | Sidebar shows connected apps with status indicators                       | component |
| 4   | Click app in sidebar switches active connection                           | component |
| 5   | Click panel nav item switches active panel                                | component |
| 6   | Keyboard shortcuts for panel navigation (Ctrl+1-9)                        | component |
| 7   | Dashboard shows "no connections" state when no apps connected             | component |
| 8   | Dashboard auto-detects new connections from WebSocket server              | component |
| 9   | Active panel persisted to localStorage on navigation                      | component |
| 10  | Active connection persisted to localStorage on switch                     | component |
| 11  | Theme toggle switches between light and dark modes                        | component |
| 12  | System theme detection uses `prefers-color-scheme`                        | component |
| 13  | Sidebar uses `nav` element with proper ARIA                               | component |
| 14  | Panel content has `role="main"`                                           | component |
| 15  | Connection status changes announced via `aria-live`                       | component |
| 16  | displayLabel computation for ConnectionInfo                               | component |
| 17  | sessionStorage persistence for active-connection and active-panel         | component |
| 18  | localStorage persistence for theme and sidebar-width                      | component |
| 19  | panelModule dynamic import success path (loads dedicated panel component) | component |
| 20  | panelModule dynamic import failure path (falls back to JSON tree viewer)  | component |

### Mutation Testing

**Target: >90% mutation score.** Dashboard shell involves connection management, panel navigation, keyboard shortcuts, and localStorage persistence. Mutations to keyboard event key matching, localStorage read/write, connection switching logic, and ARIA attribute assignment must be caught.

---

## DoD 3: Container Panel (Spec Section 8)

### Component Tests -- `container-panel.test.tsx`

| #   | Test                                                                        | Type      |
| --- | --------------------------------------------------------------------------- | --------- |
| 1   | Container panel renders stat cards from `RemoteInspectorAPI` snapshot       | component |
| 2   | Stat cards update when remote snapshot changes                              | component |
| 3   | Port table lists all registered ports with name, lifetime, and factory kind | component |
| 4   | Port table search filters ports by name substring                           | component |
| 5   | Error rate badge appears for ports with high error rate                     | component |
| 6   | Click on port row expands detail view with adapter info                     | component |
| 7   | Result statistics section shows ok/err counts per port                      | component |
| 8   | Container phase indicator shows current phase (building, ready, disposed)   | component |

### Mutation Testing

**Target: >85% mutation score.** Container panel displays diagnostic data from `RemoteInspectorAPI` queries. Mutations to stat card value extraction, search filter logic, and error rate threshold comparisons must be caught.

---

## DoD 3b: Unified Overview Panel (Spec Section 13)

### Component Tests -- `overview-panel.test.tsx`

| #   | Test                                                                                                   | Type      |
| --- | ------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Overview panel renders container stat cards from `RemoteInspectorAPI` (phase, ports, resolved, errors) | component |
| 2   | Overview panel renders library summary cards for each registered library                               | component |
| 3   | Headline metrics extracted correctly for known libraries (Flow, Tracing, Store, Saga)                  | component |
| 4   | Click on library card navigates to that library's panel tab                                            | component |
| 5   | Click on container stat section navigates to Container panel                                           | component |
| 6   | Panel updates reactively when remote unified snapshot changes                                          | component |
| 7   | Unknown library fallback shows snapshot key count                                                      | component |
| 8   | Empty state shown when no libraries are registered                                                     | component |

### Mutation Testing

**Target: >85% mutation score.** Overview panel extracts headline metrics per library name from `RemoteInspectorAPI`. Mutations to the library name matching logic, metric field extraction, and navigation callbacks must be caught.

---

## DoD 3c: Health & Diagnostics Panel (Spec Section 14)

### Component Tests -- `health-panel.test.tsx`

| #   | Test                                                                                     | Type      |
| --- | ---------------------------------------------------------------------------------------- | --------- |
| 1   | Health panel renders complexity score and recommendation badge from `RemoteInspectorAPI` | component |
| 2   | Blast radius dropdown lists all registered ports from remote snapshot                    | component |
| 3   | Selecting a port in blast radius shows direct and transitive dependents                  | component |
| 4   | Captive dependency risks section displays detected captive pairs                         | component |
| 5   | Captive dependency section shows "(none detected)" when empty                            | component |
| 6   | Scope leak detection flags scopes older than threshold                                   | component |
| 7   | Scope leak detection flags scopes with too many children                                 | component |
| 8   | Error hotspots section shows ports with high error rates                                 | component |
| 9   | Clicking port name navigates to Graph panel                                              | component |
| 10  | Clicking scope ID navigates to Scope Tree panel                                          | component |
| 11  | Suggestions list renders all graph suggestions with type badges                          | component |
| 12  | Diagnostics debounced recalculation triggers on remote snapshot events                   | component |
| 13  | Refresh button forces immediate recalculation                                            | component |

### Mutation Testing

**Target: >85% mutation score.** Health panel combines data from `RemoteInspectorAPI`. Mutations to threshold comparisons (error rate, scope age, children count), blast radius computation triggers, and cross-panel navigation callbacks must be caught.

---

## DoD 4: Graph Panel (Spec Section 9)

### Component Tests -- `graph-panel.test.tsx`

| #   | Test                                                                    | Type      |
| --- | ----------------------------------------------------------------------- | --------- |
| 1   | Graph panel renders SVG with nodes from `RemoteInspectorAPI` graph data | component |
| 2   | Node colors differentiate by lifetime (singleton, scoped, transient)    | component |
| 3   | Click on node selects it and shows detail bar                           | component |
| 4   | Zoom in/out controls adjust SVG viewBox                                 | component |
| 5   | Detail bar shows port name, lifetime, dependencies, and dependents      | component |
| 6   | Edges connect dependency ports with directional arrows                  | component |
| 7   | Inherited adapters have distinct visual styling (dashed border)         | component |
| 8   | Overridden adapters have distinct visual styling (highlighted border)   | component |
| 9   | Analysis sidebar renders complexity gauge with score                    | component |
| 10  | Analysis sidebar renders suggestion cards with type badges              | component |
| 11  | Clicking a suggestion card selects the corresponding graph node         | component |
| 12  | Analysis sidebar shows captive dependency pairs                         | component |
| 13  | Port filtering dropdowns filter both sidebar lists and graph nodes      | component |
| 14  | Export DOT button copies GraphViz DOT string to clipboard               | component |

### Mutation Testing

**Target: >80% mutation score.** Graph visualization involves coordinate calculations and SVG rendering. Lower target reflects the visual nature of the output, but node color assignment by lifetime, edge connection logic, analysis sidebar data extraction, and DOT export delegation must be verified.

---

## DoD 5: Scope Tree Panel (Spec Section 10)

### Component Tests -- `scope-tree-panel.test.tsx`

| #   | Test                                                                              | Type      |
| --- | --------------------------------------------------------------------------------- | --------- |
| 1   | Scope tree panel renders root container node from `RemoteInspectorAPI` scope tree | component |
| 2   | Child containers render as nested tree nodes                                      | component |
| 3   | Click on tree node expands/collapses children                                     | component |
| 4   | Active scopes have visual indicator (solid dot)                                   | component |
| 5   | Disposed scopes have visual indicator (hollow dot, greyed)                        | component |
| 6   | Click on scope node shows detail view with scope metadata                         | component |
| 7   | Lazy containers shown with distinct icon/label                                    | component |
| 8   | Scope tree updates reactively on remote scope-created/scope-disposed events       | component |

### Mutation Testing

**Target: >85% mutation score.** Scope tree rendering involves recursive tree traversal and reactive updates from `RemoteInspectorAPI`. Active/disposed indicator logic and expand/collapse state management must be verified.

---

## DoD 6: Tracing Panel (Spec Section 11)

### Component Tests -- `tracing-panel.test.tsx`

| #   | Test                                                                    | Type      |
| --- | ----------------------------------------------------------------------- | --------- |
| 1   | Tracing panel renders timeline with span bars from `RemoteInspectorAPI` | component |
| 2   | Span bar width proportional to duration                                 | component |
| 3   | Click on span bar selects it and shows detail view                      | component |
| 4   | Filter input filters spans by port name                                 | component |
| 5   | Error spans highlighted with error color                                | component |
| 6   | Nested spans (parent-child) indented in timeline                        | component |
| 7   | Summary statistics (total spans, avg duration, error count) displayed   | component |
| 8   | Empty state shown when no tracing data available                        | component |

### Mutation Testing

**Target: >80% mutation score.** Tracing panel involves timeline calculations and span rendering from `RemoteInspectorAPI`. Lower target reflects the visual nature, but span duration-to-width calculation, error color assignment, and filter logic must be caught.

---

## DoD 7: Library Panels (Spec Sections 12.1-12.2)

### Component Tests -- `library-panels.test.tsx`

| #   | Test                                                                            | Type      |
| --- | ------------------------------------------------------------------------------- | --------- |
| 1   | Auto-discovered library panels appear in tab bar from `RemoteInspectorAPI` data | component |
| 2   | Default library panel renders tree view of library snapshot                     | component |
| 3   | Tree view expands/collapses nested snapshot properties                          | component |
| 4   | Custom panel component (from library) renders instead of default tree view      | component |
| 5   | Library panel refreshes when remote library inspector emits events              | component |
| 6   | Library panel shows library name in tab label                                   | component |
| 7   | Flow panel: statechart rendering, machine list, transition log                  | component |
| 8   | Query panel: cache table rendering, sorting, refetch action                     | component |
| 9   | Store panel: state inspector, diff viewer, action timeline                      | component |
| 10  | Saga panel: pipeline rendering, compensation track, step detail                 | component |
| 11  | Logger panel: log stream rendering, level filtering, auto-scroll                | component |

### Mutation Testing

**Target: >85% mutation score.** Auto-discovery logic (iterating library inspectors from remote data, generating panel entries) and tree view rendering of dynamic snapshot shapes must be verified.

---

## DoD 8: Event Log Panel (Spec Sections 12.3-12.4)

### Component Tests -- `event-log-panel.test.tsx`

| #   | Test                                                                             | Type      |
| --- | -------------------------------------------------------------------------------- | --------- |
| 1   | Event log panel displays events from `RemoteInspectorAPI` in chronological order | component |
| 2   | Ring buffer evicts oldest events when capacity exceeded                          | component |
| 3   | Filter dropdown filters events by type                                           | component |
| 4   | Search input filters events by text content                                      | component |
| 5   | Auto-scroll follows new events when scrolled to bottom                           | component |
| 6   | Auto-scroll pauses when user scrolls up                                          | component |
| 7   | Pause/resume button stops and resumes event collection                           | component |
| 8   | Clear button empties the event log                                               | component |
| 9   | Event entries show timestamp, type, source, and truncated payload                | component |
| 10  | Click on event entry expands full payload view                                   | component |

### Mutation Testing

**Target: >85% mutation score.** Ring buffer eviction logic, auto-scroll behavior (detecting bottom position), and filter/search predicate logic must be caught. The pause/resume toggle is a critical boolean guard.

---

## DoD 9: Visual Design & Accessibility (Spec Sections 16-18)

### Component Tests -- `visual-design.test.tsx`

| #   | Test                                                                      | Type      |
| --- | ------------------------------------------------------------------------- | --------- |
| 1   | All theme tokens are applied as CSS custom properties on the root element | component |
| 2   | Dark theme applies correct color values                                   | component |
| 3   | Light theme applies correct color values                                  | component |
| 4   | CSS scoping: all styles contained within `[data-hex-devtools]`            | component |
| 5   | Panel respects `prefers-reduced-motion` by disabling animations           | component |

### Mutation Testing

**Target: >80% mutation score.** Visual design tests involve CSS property assertions. Lower target reflects the difficulty of catching purely visual mutations, but theme token assignment and reduced motion detection must be verified.

---

## DoD 10: WebSocket Server -- Connection Management (Dashboard Package)

### Unit Tests -- `connection-manager.test.ts`

| #   | Test                                                   | Type |
| --- | ------------------------------------------------------ | ---- |
| 1   | Server accepts new WebSocket connections               | unit |
| 2   | Server assigns unique connectionId to each client      | unit |
| 3   | Server sends handshake-ack on client handshake         | unit |
| 4   | Server tracks connection metadata (appName, appType)   | unit |
| 5   | Server detects stale connections (no messages for 30s) | unit |
| 6   | Server removes connections on client disconnect        | unit |
| 7   | Server sends ping messages at regular intervals        | unit |
| 8   | Server handles multiple simultaneous connections       | unit |

### Mutation Testing

**Target: >90% mutation score.** Connection management is the backbone of the dashboard. Mutations to connectionId generation, handshake protocol, stale detection timeout, and disconnect cleanup must be caught. Any mutation that silently drops or misroutes a connection breaks the entire dashboard.

---

## DoD 11: WebSocket Server -- Message Routing (Dashboard Package)

### Unit Tests -- `message-router.test.ts`

| #   | Test                                                      | Type |
| --- | --------------------------------------------------------- | ---- |
| 1   | Router creates `RemoteInspectorAPI` for each connection   | unit |
| 2   | Router updates `RemoteInspectorAPI` on snapshot message   | unit |
| 3   | Router updates `RemoteInspectorAPI` on scope-tree message | unit |
| 4   | Router updates `RemoteInspectorAPI` on graph-data message | unit |
| 5   | Router fires event subscribers on event message           | unit |
| 6   | Router removes `RemoteInspectorAPI` on disconnect         | unit |

### Mutation Testing

**Target: >90% mutation score.** Message routing is the translation layer between raw WebSocket messages and the `RemoteInspectorAPI` consumed by dashboard panels. Mutations to message type dispatch, snapshot deserialization, and cleanup on disconnect must be caught.

---

## DoD 12: WebSocket Transport (Client Package)

### Unit Tests -- `websocket-transport.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | Transport connects to WebSocket server at configured URL                   | unit |
| 2   | Transport sends handshake message on connect                               | unit |
| 3   | Transport receives handshake-ack with connectionId                         | unit |
| 4   | Transport serializes and sends snapshot messages                           | unit |
| 5   | Transport serializes and sends event messages                              | unit |
| 6   | Transport buffers messages when disconnected                               | unit |
| 7   | Transport flushes buffer on reconnection                                   | unit |
| 8   | Buffer evicts oldest messages when capacity exceeded                       | unit |
| 9   | Transport auto-reconnects after disconnect                                 | unit |
| 10  | Transport respects configurable reconnect interval                         | unit |
| 11  | Transport responds to ping with pong                                       | unit |
| 12  | `disconnect()` closes WebSocket and stops reconnection                     | unit |
| 13  | instanceId auto-generation (browser sessionStorage, Node.js process UUID)  | unit |
| 14  | metadata auto-population (url/title for browser, pid/argv for Node.js)     | unit |
| 15  | subscription topic handling (subscribe, unsubscribe, data-update messages) | unit |

### Mutation Testing

**Target: >90% mutation score.** The transport is the communication backbone for the client. Mutations to handshake sequencing, buffer eviction logic (capacity check, index wrap), reconnection timer management, and ping/pong response must be caught. Any silent failure in the transport means the dashboard receives no data.

---

## DoD 13: Inspector Bridge (Client Package)

### Unit Tests -- `inspector-bridge.test.ts`

| #   | Test                                             | Type |
| --- | ------------------------------------------------ | ---- |
| 1   | Bridge subscribes to `InspectorAPI` events       | unit |
| 2   | Bridge triggers snapshot pull on relevant events | unit |
| 3   | Bridge serializes `ContainerSnapshot` correctly  | unit |
| 4   | Bridge serializes `ScopeTree` correctly          | unit |
| 5   | Bridge serializes `ContainerGraphData` correctly | unit |
| 6   | Bridge serializes `UnifiedSnapshot` correctly    | unit |
| 7   | Bridge forwards `InspectorEvents` to transport   | unit |
| 8   | Bridge stops subscription on disconnect          | unit |

### Mutation Testing

**Target: >90% mutation score.** The bridge is the integration point between the container's `InspectorAPI` and the WebSocket transport. Mutations to event subscription setup, snapshot serialization field mapping, and unsubscribe-on-disconnect cleanup must be caught. Incorrect serialization silently corrupts dashboard data.

---

## DoD 14: React Adapter (Client Package)

### Component Tests -- `devtools-client-provider.test.tsx`

| #   | Test                                                                     | Type      |
| --- | ------------------------------------------------------------------------ | --------- |
| 1   | `DevToolsClientProvider` creates connection on mount                     | component |
| 2   | `DevToolsClientProvider` disconnects on unmount                          | component |
| 3   | `DevToolsClientProvider` auto-detects inspector from `InspectorProvider` | component |
| 4   | `DevToolsClientProvider` uses explicit inspector prop when provided      | component |
| 5   | `enabled={false}` does not create connection                             | component |

### Mutation Testing

**Target: >85% mutation score.** The React adapter is a thin wrapper, but lifecycle correctness (connect on mount, disconnect on unmount) and the `enabled` guard are critical. Mutations to the `useEffect` cleanup, the `enabled` check, and inspector source selection must be caught.

---

## DoD 15: Node.js Adapter (Client Package)

### Unit Tests -- `node-adapter.test.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | `connectDevTools()` returns `DevToolsConnection` handle     | unit |
| 2   | Connection status starts as `"connecting"`                  | unit |
| 3   | Connection status changes to `"connected"` on handshake-ack | unit |
| 4   | Connection status changes to `"reconnecting"` on disconnect | unit |
| 5   | `disconnect()` stops reconnection and clears buffer         | unit |

### Mutation Testing

**Target: >85% mutation score.** The Node.js adapter is the primary non-React integration point. Mutations to status state transitions, the disconnect cleanup sequence, and the return type of `connectDevTools()` must be caught.

---

## Test Count Summary

| Category                           | Count    |
| ---------------------------------- | -------- |
| Unit tests (protocol)              | ~6       |
| Type-level tests (protocol)        | ~9       |
| Component tests (dashboard panels) | ~90      |
| Component tests (dashboard shell)  | ~15      |
| Unit tests (client transport)      | ~12      |
| Unit tests (client bridge)         | ~8       |
| Component tests (client React)     | ~5       |
| Unit tests (client Node.js)        | ~5       |
| Unit tests (server connection)     | ~8       |
| Unit tests (server routing)        | ~6       |
| **Total**                          | **~164** |

### Breakdown

**Dashboard package (`@hex-di/devtools`):**

- Protocol: 6 unit + 9 type-level = 15
- Shell: 15 component
- Container panel: 8 component
- Overview panel: 8 component
- Health panel: 13 component
- Graph panel: 14 component
- Scope tree panel: 8 component
- Tracing panel: 8 component
- Library panels: 6 component
- Event log: 10 component
- Visual design: 5 component
- Connection manager: 8 unit
- Message router: 6 unit
- Dashboard subtotal: ~124

**Client package (`@hex-di/devtools-client`):**

- WebSocket transport: 12 unit
- Inspector bridge: 8 unit
- React adapter: 5 component
- Node.js adapter: 5 unit
- Client subtotal: ~30

**Combined: ~154 tests** (accounting for rounding, target is ~164 including edge case tests not listed individually).

---

## Verification Checklist

Before marking the spec as "implemented," the following must all pass.

### `@hex-di/devtools` (Dashboard)

| Check                             | Command                                                                              | Expected   |
| --------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| All unit tests pass               | `pnpm --filter @hex-di/devtools test`                                                | 0 failures |
| All type tests pass               | `pnpm --filter @hex-di/devtools test:types`                                          | 0 failures |
| All component tests pass          | `pnpm --filter @hex-di/devtools test`                                                | 0 failures |
| Typecheck passes                  | `pnpm --filter @hex-di/devtools typecheck`                                           | 0 errors   |
| Lint passes                       | `pnpm --filter @hex-di/devtools lint`                                                | 0 errors   |
| No `any` types in source          | `grep -r "any" packages/devtools/src/`                                               | 0 matches  |
| No type casts in source           | `grep -r " as " packages/devtools/src/`                                              | 0 matches  |
| No eslint-disable in source       | `grep -r "eslint-disable" packages/devtools/src/`                                    | 0 matches  |
| Mutation score (protocol)         | `pnpm --filter @hex-di/devtools stryker -- --mutate src/protocol/**`                 | >95%       |
| Mutation score (shell)            | `pnpm --filter @hex-di/devtools stryker -- --mutate src/components/**`               | >90%       |
| Mutation score (container panel)  | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/container/**`         | >85%       |
| Mutation score (overview panel)   | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/overview/**`          | >85%       |
| Mutation score (health panel)     | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/health/**`            | >85%       |
| Mutation score (graph panel)      | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/graph/**`             | >80%       |
| Mutation score (scope tree panel) | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/scope-tree/**`        | >85%       |
| Mutation score (tracing panel)    | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/tracing/**`           | >80%       |
| Mutation score (library panels)   | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/library/**`           | >85%       |
| Mutation score (event log)        | `pnpm --filter @hex-di/devtools stryker -- --mutate src/panels/event-log/**`         | >85%       |
| Mutation score (visual design)    | `pnpm --filter @hex-di/devtools stryker -- --mutate src/theme/**`                    | >80%       |
| Mutation score (connection mgmt)  | `pnpm --filter @hex-di/devtools stryker -- --mutate src/server/connection-manager.*` | >90%       |
| Mutation score (message routing)  | `pnpm --filter @hex-di/devtools stryker -- --mutate src/server/message-router.*`     | >90%       |

### `@hex-di/devtools-client` (Client)

| Check                            | Command                                                                      | Expected   |
| -------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| All unit tests pass              | `pnpm --filter @hex-di/devtools-client test`                                 | 0 failures |
| All type tests pass              | `pnpm --filter @hex-di/devtools-client test:types`                           | 0 failures |
| All component tests pass         | `pnpm --filter @hex-di/devtools-client test`                                 | 0 failures |
| Typecheck passes                 | `pnpm --filter @hex-di/devtools-client typecheck`                            | 0 errors   |
| Lint passes                      | `pnpm --filter @hex-di/devtools-client lint`                                 | 0 errors   |
| No `any` types in source         | `grep -r "any" packages/devtools-client/src/`                                | 0 matches  |
| No type casts in source          | `grep -r " as " packages/devtools-client/src/`                               | 0 matches  |
| No eslint-disable in source      | `grep -r "eslint-disable" packages/devtools-client/src/`                     | 0 matches  |
| Mutation score (transport)       | `pnpm --filter @hex-di/devtools-client stryker -- --mutate src/transport/**` | >90%       |
| Mutation score (bridge)          | `pnpm --filter @hex-di/devtools-client stryker -- --mutate src/bridge/**`    | >90%       |
| Mutation score (React adapter)   | `pnpm --filter @hex-di/devtools-client stryker -- --mutate src/react/**`     | >85%       |
| Mutation score (Node.js adapter) | `pnpm --filter @hex-di/devtools-client stryker -- --mutate src/index.*`      | >85%       |

---

## Mutation Testing Strategy

### Why Mutation Testing Matters for DevTools

DevTools components and transport code have behavioral invariants that standard coverage cannot verify:

- **Connection management** -- mutating the handshake-ack response or connectionId generation silently breaks multi-app support without failing basic connection tests
- **Message routing** -- swapping message type dispatch cases routes snapshot data to the wrong `RemoteInspectorAPI` method
- **Tab switching** -- swapping tab IDs or removing the active tab guard causes the wrong panel to render
- **localStorage persistence** -- removing a `setItem` call means state is lost on refresh; removing a `getItem` call means defaults always override persisted preferences
- **Ring buffer eviction** -- mutating the eviction condition (full check, index wrap) causes either unbounded memory growth or lost events (both in client transport buffer and dashboard event log)
- **Auto-reconnection** -- mutating the reconnect timer or the "should reconnect" flag causes either infinite reconnection attempts or permanent disconnection
- **Auto-scroll detection** -- mutating the "at bottom" threshold causes auto-scroll to either never engage or never disengage
- **Theme token assignment** -- swapping CSS variable names causes incorrect colors without breaking any functional test
- **Filter predicates** -- inverting a filter condition shows excluded items and hides included items
- **Bridge serialization** -- omitting a field in snapshot serialization silently drops data without transport errors
- **Auto-discovery iteration** -- skipping the library inspector map iteration produces an empty library panel list

### Mutation Targets by Priority

| Priority | Package  | Module                                           | Target Score | Rationale                                                                                       |
| -------- | -------- | ------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------- |
| Critical | devtools | Typed protocol (`protocol/`)                     | >95%         | Foundation: wrong category or type guard = broken auto-discovery.                               |
| Critical | devtools | Connection manager (`server/connection-manager`) | >90%         | Multi-app backbone: handshake, heartbeat, stale detection.                                      |
| Critical | devtools | Message router (`server/message-router`)         | >90%         | Translation layer: wrong routing = wrong panel data.                                            |
| Critical | client   | WebSocket transport (`transport/`)               | >90%         | Communication backbone: buffer, reconnect, handshake.                                           |
| Critical | client   | Inspector bridge (`bridge/`)                     | >90%         | Serialization integrity: wrong serialization = corrupted dashboard data.                        |
| High     | devtools | Shell & layout (`components/`)                   | >90%         | Navigation, keyboard shortcuts, localStorage persistence, connection switching.                 |
| High     | devtools | Container panel (`panels/container/`)            | >85%         | Stat card extraction, search filter, error rate threshold.                                      |
| High     | devtools | Overview panel (`panels/overview/`)              | >85%         | Headline metric extraction per library, navigation callbacks, reactive updates.                 |
| High     | devtools | Health panel (`panels/health/`)                  | >85%         | Threshold comparisons, blast radius computation, scope leak heuristics, cross-panel navigation. |
| High     | devtools | Scope tree panel (`panels/scope-tree/`)          | >85%         | Recursive tree rendering, active/disposed indicators, expand/collapse.                          |
| High     | devtools | Library panels (`panels/library/`)               | >85%         | Auto-discovery, tree view rendering of dynamic snapshot shapes.                                 |
| High     | devtools | Event log panel (`panels/event-log/`)            | >85%         | Ring buffer, auto-scroll, pause/resume, filter/search.                                          |
| High     | client   | React adapter (`react/`)                         | >85%         | Lifecycle connect/disconnect, enabled guard, inspector source.                                  |
| High     | client   | Node.js adapter (`index`)                        | >85%         | Status transitions, disconnect cleanup, return type.                                            |
| Medium   | devtools | Graph panel (`panels/graph/`)                    | >80%         | SVG rendering, coordinate math, zoom transforms. Visual output is harder to assert precisely.   |
| Medium   | devtools | Tracing panel (`panels/tracing/`)                | >80%         | Timeline rendering, span-to-width calculations. Visual output.                                  |
| Medium   | devtools | Theme & accessibility (`theme/`)                 | >80%         | CSS variable assignment, keyboard nav. Partially visual.                                        |

### Mutation Operators to Prioritize

- **Boolean mutations**: `true` -> `false` in `isConnected`, `enabled`, `isPaused`, `shouldReconnect` (catches toggle and guard logic)
- **String literal mutations**: `"container"` -> `"graph"` in default tab, `"handshake"` -> `"handshake-ack"` in message type dispatch (catches identity confusion)
- **Conditional boundary mutations**: `>=` -> `>` in scroll position check, ring buffer full check, stale connection timeout (catches off-by-one in auto-scroll, eviction, and heartbeat)
- **Block removal**: Removing `localStorage.setItem(...)` calls, removing `transport.send(...)` calls, removing `unsubscribe()` in cleanup (catches persistence loss, silent data loss, and resource leaks)
- **Method call mutations**: `inspector.getLibraryInspectors()` -> skip, `transport.flush()` -> skip (catches missing auto-discovery, lost buffered messages)
- **Return value mutations**: Returning empty array instead of filtered panels, returning stale snapshot instead of updated one (catches filter logic removal, staleness)
- **Arithmetic mutations**: Duration-to-width ratio calculations in tracing timeline, reconnect interval multiplication (catches span rendering errors, reconnection timing)
- **Object property mutations**: Swapping `appName` and `appType` in metadata, omitting fields in serialized snapshot (catches data corruption in bridge/router)

### Stryker Configuration

#### `@hex-di/devtools`

```json
{
  "mutate": [
    "packages/devtools/src/**/*.ts",
    "packages/devtools/src/**/*.tsx",
    "!packages/devtools/src/**/*.test.*"
  ],
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 85,
    "low": 75,
    "break": 75
  },
  "timeoutMS": 60000,
  "timeoutFactor": 2.5,
  "concurrency": 4
}
```

#### `@hex-di/devtools-client`

```json
{
  "mutate": [
    "packages/devtools-client/src/**/*.ts",
    "packages/devtools-client/src/**/*.tsx",
    "!packages/devtools-client/src/**/*.test.*"
  ],
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 90,
    "low": 80,
    "break": 80
  },
  "timeoutMS": 60000,
  "timeoutFactor": 2.5,
  "concurrency": 4
}
```

The dashboard package thresholds are set lower than the client package because the dashboard contains visual UI components where some mutations produce visually different but functionally acceptable output (e.g., a slightly different shade of grey). The client package has higher thresholds because it is pure logic (serialization, transport, state management) where every mutation represents a real behavioral change. The `break` thresholds ensure that critical behavioral logic is always verified in both packages.

---

_Previous: [17 - Appendices](./07-appendices.md)_

_End of Definition of Done_
