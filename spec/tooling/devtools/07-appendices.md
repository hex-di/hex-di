# 17 - Appendices

_Previous: [16 - API Reference](./06-api-reference.md)_ | _Next: [18 - Definition of Done](./08-definition-of-done.md)_

---

## Appendix A: Comparison with Existing DevTools

| Feature                            | HexDI DevTools                                          | React Query DevTools         | Jotai DevTools         | Redux DevTools (in-app)        | Jaeger UI                        | Grafana                    | Prisma Studio             |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------- | ---------------------- | ------------------------------ | -------------------------------- | -------------------------- | ------------------------- |
| **Standalone dashboard**           | Yes (separate web app)                                  | No (in-app overlay)          | No (in-app overlay)    | Partial (extension + app)      | Yes (standalone)                 | Yes (standalone)           | Yes (standalone)          |
| **Dependency graph visualization** | Yes (SVG, interactive)                                  | No                           | No                     | No                             | Yes (trace DAG)                  | No (metrics only)          | Yes (schema ERD)          |
| **Scope/hierarchy tree**           | Yes (root + children + lazy)                            | No                           | No                     | No                             | No                               | No                         | No                        |
| **Resolution tracing/timeline**    | Yes (span bars, waterfall)                              | No (fetch timing only)       | No                     | Yes (action timeline)          | Yes (trace timeline)             | Yes (via datasource)       | No                        |
| **Library plugin system**          | Yes (auto-discovered via LibraryInspector protocol)     | No (monolithic)              | No (monolithic)        | Extension-based (browser only) | No (trace-only)                  | Yes (plugin ecosystem)     | No                        |
| **Typed snapshots (compile-time)** | Yes (TypedLibraryInspector, TypedUnifiedSnapshot)       | No                           | No                     | No                             | No                               | No                         | Yes (Prisma schema types) |
| **Event log**                      | Yes (ring buffer, filterable)                           | No (limited to query events) | Yes (atom history)     | Yes (action log)               | Yes (structured logs)            | Yes (Loki integration)     | No                        |
| **Theme support**                  | Light / Dark / System                                   | Light / Dark                 | Light / Dark           | Light / Dark                   | Light only                       | Light / Dark               | Light / Dark              |
| **Keyboard shortcuts**             | Yes (configurable hotkey)                               | Yes (fixed)                  | No                     | No                             | No                               | Yes                        | No                        |
| **Remote/server inspection**       | Yes (WebSocket to Node.js/Bun/Deno)                     | No (in-process only)         | No (in-process only)   | No (browser only)              | Yes (gRPC/HTTP collectors)       | Yes (remote datasources)   | Yes (database connection) |
| **Multi-app inspection**           | Yes (multiple connections in sidebar)                   | No                           | No                     | No                             | Yes (multi-service traces)       | Yes (multi-datasource)     | No (single database)      |
| **Framework coupling**             | None (dashboard is standalone)                          | React                        | React                  | Redux + browser extension      | None (OpenTracing/OpenTelemetry) | None (datasource agnostic) | Prisma ORM                |
| **Production tree-shake**          | Yes (client is separate package)                        | Yes (`lazy` import)          | Yes (separate package) | Requires manual removal        | N/A (separate deployment)        | N/A (separate deployment)  | N/A (separate tool)       |
| **Accessibility**                  | ARIA roles, keyboard nav, focus regions, reduced motion | Partial                      | Minimal                | Minimal                        | Minimal                          | Partial                    | Minimal                   |

### Key Differentiators

**vs In-App Overlay Tools (React Query DevTools, Jotai DevTools, Redux DevTools):**
In-app overlay tools are embedded inside the host application's React tree, which means they only work with React SPAs running in a browser. HexDI DevTools is a standalone web dashboard that connects to target applications over WebSocket. This means it can inspect Node.js API servers, Bun services, Deno workers, and any other JavaScript runtime -- not just React frontends. The dashboard has zero bundle size impact on the target application because it runs as a separate process. There are no style conflicts, no SSR hydration issues, and no dependency version clashes between the dashboard and the target app. The standalone architecture also enables multi-app inspection: a developer can connect a React frontend and its Node.js backend simultaneously and see both container hierarchies in one place.

**vs Jaeger UI:**
Jaeger UI is a general-purpose distributed tracing dashboard that visualizes OpenTelemetry/OpenTracing spans. It excels at cross-service trace correlation but has no awareness of DI containers, dependency graphs, scope hierarchies, or library-specific state. HexDI DevTools is purpose-built for the HexDI ecosystem: it understands container structure, port registrations, scope lifecycles, and the LibraryInspector plugin protocol. Where Jaeger shows "service A called service B with span duration X," HexDI DevTools shows "resolving port Logger in scope RequestScope triggered lazy initialization of DatabaseAdapter in RootScope, taking 12ms."

**vs Grafana:**
Grafana is a metrics and observability dashboard that aggregates time-series data from multiple datasources. It is powerful for production monitoring but requires infrastructure (Prometheus, Loki, Tempo) and is not designed for development-time DI inspection. HexDI DevTools requires no infrastructure beyond `npx @hex-di/devtools` -- it runs locally, connects directly to the application, and provides live, interactive inspection of container internals. Grafana cannot render a dependency graph or a scope tree because it operates on metrics, not on structured DI state.

**vs Prisma Studio:**
Prisma Studio is a standalone GUI for browsing and editing database records, tightly coupled to the Prisma ORM schema. HexDI DevTools follows a similar "standalone tool for your framework" pattern but targets DI container state instead of database records. Like Prisma Studio, the dashboard understands the framework's type system (typed LibraryInspector snapshots vs Prisma schema types) and provides structured, queryable views of internal state.

---

## Appendix B: Glossary

| Term                       | Definition                                                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**              | The standalone web application (`@hex-di/devtools`) that renders inspection panels. Launched via `npx @hex-di/devtools` or imported programmatically. Runs as a separate process from the target application.                                   |
| **connectionMetadata**     | Environment metadata sent during handshake -- `url` and `title` for browser apps, `pid` and `argv` for Node.js apps. Used to disambiguate multiple instances of the same application.                                                           |
| **Connection**             | A WebSocket link between a target application's devtools-client and the dashboard. Each connection represents one running application instance. Connections appear in the connection sidebar with status indicators.                            |
| **devtools-client**        | The lightweight transport library (`@hex-di/devtools-client`) installed in target applications. It serializes `InspectorAPI` data and streams it to the dashboard over WebSocket. Has no UI dependencies and works in any JavaScript runtime.   |
| **displayLabel**           | Computed sidebar label that combines `appName` with metadata for disambiguation when multiple instances share the same name. Examples: "web-app /dashboard", "api-server PID:4521".                                                             |
| **WebSocket Server**       | The built-in WebSocket server embedded in the dashboard process. Listens on a configurable port (default 7600) and accepts connections from devtools-client instances. Handles authentication, heartbeats, and message routing.                 |
| **RemoteInspectorAPI**     | The dashboard-side adapter that reconstructs an `InspectorAPI` interface from WebSocket messages. Dashboard panels consume `RemoteInspectorAPI` identically to how in-process panels would consume a local `InspectorAPI`.                      |
| **App Selector**           | The sidebar section listing all connected applications with status indicators (connected, disconnected, reconnecting). Clicking an app selects it as the active inspection target for all panels.                                               |
| **Connection Sidebar**     | The left sidebar containing the app selector and panel navigation. Always visible in the dashboard. Houses connection management, panel tabs, and dashboard settings.                                                                           |
| **Panel**                  | A view within the dashboard. Each panel displays a different aspect of the application's state (container, graph, scopes, tracing, etc.). Panels are selected via the connection sidebar navigation.                                            |
| **panelModule**            | String field on `LibraryInspector` specifying a module path that the dashboard dynamically imports to obtain a dedicated panel component (e.g., `"@hex-di/flow/devtools"`).                                                                     |
| **Panel Plugin**           | A `DevToolsPanel` object registered via the dashboard's plugin system. Contains an `id`, `label`, `icon`, `order`, and React `component`. Custom panels receive the same `PanelProps` as built-in panels.                                       |
| **instanceId**             | Auto-generated UUID that uniquely identifies a browser tab or Node.js process. Stored in sessionStorage (browser) or generated at process start (Node.js). Stable across WebSocket reconnections within a tab/process lifecycle.                |
| **Library Panel**          | A panel auto-generated from a registered `LibraryInspector`. The dashboard discovers libraries via `inspector.getLibraryInspectors()` and renders either a tree view of the library snapshot or a custom component if the library provides one. |
| **Typed LibraryInspector** | An enhanced version of `LibraryInspector` that carries typed snapshot and name parameters. Enables compile-time extraction of library names and snapshot shapes from a graph's provides type.                                                   |
| **Unified Snapshot**       | A frozen object combining the container's `ContainerSnapshot` with all registered library snapshots. Queried via `inspector.getUnifiedSnapshot()`.                                                                                              |
| **CSS Scoping**            | All dashboard styles are scoped under `[data-hex-devtools]` attribute selectors to prevent leaking into the dashboard's own component boundaries and to support theme switching.                                                                |
| **Ring Buffer**            | The fixed-size circular buffer used by the event log panel. When full, the oldest event is evicted to make room for new events. Prevents unbounded memory growth.                                                                               |
| **Stat Card**              | A small card in the Container panel displaying a single metric (e.g., total ports, resolved count, error rate).                                                                                                                                 |
| **SubscriptionTopic**      | A data category (snapshot, scope-tree, graph-data, etc.) that the dashboard can subscribe to for live push updates instead of polling via request-response.                                                                                     |
| **Detail Bar**             | A side section in the Graph and Scope Tree panels that appears when a node is selected. Shows detailed information about the selected item.                                                                                                     |
| **Span Bar**               | A horizontal bar in the Tracing panel representing a single resolution or transition span. Width proportional to duration. Color indicates success or error.                                                                                    |

---

## Appendix C: Design Decisions

### C1. Standalone Dashboard vs In-App Overlay

**Decision:** Ship a standalone web dashboard. In-app overlay mode is a future enhancement.

**Rationale:** A standalone dashboard works with React frontends AND Node.js/Bun/Deno backend services. The target application installs only the lightweight `@hex-di/devtools-client` transport package, which has zero UI dependencies, zero CSS, and negligible bundle size impact. The dashboard runs as a separate process, so there are no style conflicts with the host application, no SSR hydration issues, no React version coupling, and no risk of the DevTools interfering with the application's rendering performance. The standalone architecture naturally enables multi-app inspection -- a developer can connect their React frontend and Node.js API server simultaneously and see both container hierarchies in one dashboard.

**Trade-off:** Developers must run a separate process (`npx @hex-di/devtools`) alongside their application. This adds one step to the development workflow compared to an in-app overlay where you simply add a `<HexDevTools />` component. However, this is the same workflow pattern used by Prisma Studio, Storybook, and other standalone dev tools that developers are already comfortable with.

**Deferral:** A future in-process overlay mode (embedding panels directly in a React component tree) may be added for developers who prefer zero-process-management simplicity. The panel components are designed to be renderable in both the standalone dashboard and an embedded context.

### C2. Sidebar Navigation vs Tab Bar

**Decision:** Vertical sidebar navigation in the connection sidebar.

**Rationale:** A full-page standalone dashboard has ample room for a persistent sidebar, unlike an in-app overlay that must conserve vertical space with a horizontal tab bar. Vertical navigation scales better as the number of panels grows -- the sidebar can accommodate built-in panels, library-auto-discovered panels, and custom plugin panels without overflow or scrolling issues that plague horizontal tab bars. The sidebar also serves double duty by housing the connection management section (app selector, connection status indicators) above the panel navigation, keeping all dashboard chrome in a single column and dedicating the remaining viewport width entirely to panel content.

### C3. CSS Custom Properties vs CSS-in-JS

**Decision:** CSS custom properties (CSS variables) scoped under `[data-hex-devtools]`.

**Rationale:** CSS custom properties provide theme switching without JavaScript runtime overhead. Changing from light to dark theme requires only updating the `data-hex-devtools` attribute value, which triggers a single CSS repaint. No CSS-in-JS library dependency is introduced, keeping the dashboard bundle minimal. The `[data-hex-devtools]` attribute selector provides style isolation and theme scoping within the dashboard's own component hierarchy.

### C4. Panel Plugin Architecture

**Decision:** Composable panels via `DevToolsPanel` interface rather than a monolithic view.

**Rationale:** The HexDI ecosystem has multiple libraries (Flow, Store, Query, Saga, Logger) that each produce inspection data. A monolithic view would either be overwhelming or require the dashboard to depend on every library. The plugin architecture decouples them: each library can provide a panel component that is registered dynamically. The auto-discovery mechanism (via `LibraryInspector` protocol) means libraries register their panels without the dashboard package importing them. Future libraries can add dashboard panels without modifying the dashboard package.

### C5. Typed LibraryInspector Protocol

**Decision:** Additive enhancement (new `TypedLibraryInspector<TName, TSnapshot>` interface) rather than breaking changes to the existing `LibraryInspector`.

**Rationale:** The existing `LibraryInspector` protocol is already implemented by Flow, Store, and Logger libraries. Breaking it would require coordinated changes across all libraries. The typed variant extends the base interface -- a `TypedLibraryInspector<"flow", FlowSnapshot>` is assignable to `LibraryInspector`. Libraries can adopt the typed variant incrementally. The type utilities (`ExtractLibraryInspectorPorts`, `LibrarySnapshotMap`) only activate when typed ports are used, providing zero overhead for untyped usage.

### C6. No Dependency on Visualization Libraries

**Decision:** Custom SVG rendering for the dependency graph instead of React Flow, Cytoscape, D3, or similar.

**Rationale:** Visualization libraries add significant bundle weight (React Flow: ~90KB, Cytoscape: ~200KB, D3: ~80KB). The dependency graph for a typical HexDI application has 10-100 nodes -- well within the range where simple force-directed layout with custom SVG is sufficient. Avoiding external dependencies also eliminates version conflicts and keeps the dashboard bundle predictable. Zoom, pan, and node selection are straightforward to implement with SVG transforms and pointer events.

### C7. Internal State Management

**Decision:** React context + `useReducer` for dashboard internal state rather than an external store (Zustand, Jotai, etc.).

**Rationale:** The dashboard state is small and local (active connection, active panel, sidebar width, theme). It does not need to be shared beyond the dashboard's own component tree. Using React's built-in state management avoids adding a dependency and keeps the dashboard self-contained. The `useDashboardState` hook encapsulates the reducer and localStorage persistence in a single composable unit.

### C8. WebSocket as Primary Transport

**Decision:** WebSocket transport is the core architecture. In-process overlay mode is deferred.

**Rationale:** WebSocket transport enables the primary value proposition of the standalone dashboard: inspecting Node.js API servers, Bun services, and other non-browser runtimes that have no DOM and cannot render an in-app overlay. It also enables multi-app debugging -- connecting a React frontend and its Node.js backend simultaneously -- which is impossible with in-process-only inspection. WebSocket eliminates framework coupling: the `@hex-di/devtools-client` package has no dependency on React, no dependency on any UI framework, and works in any JavaScript runtime that supports WebSocket (Node.js, Bun, Deno, browsers). The serialization cost is minimal because `InspectorAPI` snapshots are already plain objects designed for structured cloning.

**Trade-off:** WebSocket introduces a network hop, which adds latency compared to direct in-process object reference access. For typical DI inspection data (container snapshots, dependency graphs, scope trees), the serialization and deserialization overhead is negligible -- these are small JSON payloads, not high-frequency streaming data. The dashboard's `RemoteInspectorAPI` adapter handles connection lifecycle (reconnection, heartbeats) transparently, so panels do not need to be aware of the transport layer.

**Deferral:** A future in-process mode may be added where the dashboard panels are embedded directly in a React component tree, consuming `InspectorAPI` through object references without serialization. The panel components are designed to be transport-agnostic: they receive `InspectorAPI` (or `RemoteInspectorAPI`, which implements the same interface) and render identically regardless of whether the data came from a WebSocket message or a direct object reference.

### C9. Dedicated Library Panels via Dynamic Import (Not Bundled)

**Decision:** Libraries ship their DevTools panel components at a `/devtools` entry point and declare the module path via `panelModule` on their `LibraryInspector`. The dashboard dynamically imports these at runtime.

**Rationale:** Alternative considered: bundling all library panels into `@hex-di/devtools`. Rejected because it would create circular dependencies (devtools depending on flow, query, store, etc.) and bloat the dashboard bundle for apps that don't use all libraries. The dynamic import approach means the dashboard only loads panel code for libraries that are actually registered.

### C10. Instance Identification via sessionStorage (Not Server-Assigned)

**Decision:** Each browser tab generates its own `instanceId` stored in sessionStorage.

**Rationale:** Alternative considered: server-assigned instance IDs. Rejected because the server cannot distinguish between a new tab and a reconnecting old tab without client-side persistence. sessionStorage provides per-tab stability (survives reconnects) without cross-tab leakage (each tab gets its own storage partition).

---

## Appendix D: Migration Guide

### For React Apps: Migrating from DevToolsBridge to devtools-client

**Before (in-app DevToolsBridge):**

```tsx
// App.tsx - DevToolsBridge embedded in the React tree
import { DevToolsBridge, InspectorProvider } from "@hex-di/react";

function App() {
  return (
    <InspectorProvider inspector={container.inspector}>
      <DevToolsBridge
        inspector={container.inspector}
        enabled={process.env.NODE_ENV === "development"}
      />
      <MainApp />
    </InspectorProvider>
  );
}
```

**After (devtools-client + external dashboard):**

```tsx
// main.tsx - Connect to the dashboard at app startup
import { connectDevTools } from "@hex-di/devtools-client";

// Connect the container to the standalone dashboard
if (process.env.NODE_ENV === "development") {
  connectDevTools(container.inspector, {
    appName: "my-react-app",
    url: "ws://localhost:7600",
  });
}

// App.tsx - No DevTools components in the React tree
import { InspectorProvider } from "@hex-di/react";

function App() {
  return (
    <InspectorProvider inspector={container.inspector}>
      <MainApp />
    </InspectorProvider>
  );
}
```

Then launch the dashboard in a separate terminal:

```bash
npx @hex-di/devtools
# Dashboard available at http://localhost:7600
# WebSocket server listening for client connections
```

**What changed:**

| Aspect                | Before (DevToolsBridge)                 | After (devtools-client)                          |
| --------------------- | --------------------------------------- | ------------------------------------------------ |
| **Install**           | `@hex-di/react` (already installed)     | `@hex-di/devtools-client` (new dev dependency)   |
| **React tree impact** | `<DevToolsBridge />` component rendered | Nothing -- connection is established outside JSX |
| **Visualization**     | Browser extension (if installed)        | Standalone dashboard at localhost:7600           |
| **Bundle size**       | DevToolsBridge code in app bundle       | Minimal client transport only                    |
| **SSR safe**          | Requires `enabled` gating               | `connectDevTools` is a no-op during SSR          |

### For Node.js Apps: New Setup

Node.js, Bun, and Deno applications had no DevTools option before. With `@hex-di/devtools-client`, server-side applications can now connect to the dashboard.

```typescript
// server.ts - Express/Fastify/Hono server bootstrap
import { createContainer } from "@hex-di/runtime";
import { connectDevTools } from "@hex-di/devtools-client";

const container = createContainer(appGraph);

// Connect to the DevTools dashboard in development
if (process.env.NODE_ENV === "development") {
  connectDevTools(container.inspector, {
    appName: "api-server",
    url: "ws://localhost:7600",
  });
}

// Start the server as usual
app.listen(3000, () => {
  console.log("API server running on :3000");
});
```

The dashboard will show the Node.js application's container hierarchy, dependency graph, scope tree, and tracing timeline -- the same panels that work for React apps.

### Multi-App Setup

A developer working on a full-stack application can connect both the frontend and backend simultaneously:

```bash
# Terminal 1: Launch the dashboard
npx @hex-di/devtools

# Terminal 2: Start the API server (connects automatically)
cd api && pnpm dev

# Terminal 3: Start the React frontend (connects automatically)
cd web && pnpm dev
```

The dashboard's connection sidebar will show both applications:

```
Connections
  [*] api-server       (connected)
  [ ] my-react-app     (connected)
```

Clicking an application in the sidebar switches all panels to inspect that application's container state.

### Can DevToolsBridge and devtools-client Coexist?

Yes. `DevToolsBridge` and `devtools-client` serve different purposes and can both be active simultaneously:

- `DevToolsBridge` forwards inspector events to browser extensions via `window.postMessage`.
- `devtools-client` streams inspector data to the standalone dashboard via WebSocket.
- Both consume the same `InspectorAPI` instance, so they always reflect consistent data.
- Neither interferes with the other's subscriptions or event handling.

```tsx
// Using both simultaneously (React app)
import { DevToolsBridge, InspectorProvider } from "@hex-di/react";
import { connectDevTools } from "@hex-di/devtools-client";

// Connect to standalone dashboard
if (process.env.NODE_ENV === "development") {
  connectDevTools(container.inspector, {
    appName: "my-react-app",
    url: "ws://localhost:7600",
  });
}

function App() {
  return (
    <InspectorProvider inspector={container.inspector}>
      {/* Browser extension bridge (optional, keep if you use the extension) */}
      <DevToolsBridge
        inspector={container.inspector}
        enabled={process.env.NODE_ENV === "development"}
      />
      <MainApp />
    </InspectorProvider>
  );
}
```

This allows a gradual migration: start using the standalone dashboard alongside the existing DevToolsBridge, then remove DevToolsBridge once the dashboard fully replaces the browser extension workflow.

---

_Previous: [16 - API Reference](./06-api-reference.md)_ | _Next: [18 - Definition of Done](./08-definition-of-done.md)_
