# 17 - Appendices

_Previous: [16 - API Reference](./06-api-reference.md)_ | _Next: [18 - Definition of Done](./08-definition-of-done.md)_

---

## Appendix A: Comparison with Existing DevTools

| Feature                            | HexDI DevTools                                       | React Query DevTools         | Jotai DevTools          | Redux DevTools (in-app)        |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------- | ----------------------- | ------------------------------ |
| **In-app overlay**                 | Yes (bottom panel)                                   | Yes (bottom panel)           | Yes (side panel)        | Yes (via @redux-devtools/app)  |
| **Dependency graph visualization** | Yes (SVG, interactive)                               | No                           | No                      | No                             |
| **Scope/hierarchy tree**           | Yes (root + children + lazy)                         | No                           | No                      | No                             |
| **Resolution tracing/timeline**    | Yes (span bars, waterfall)                           | No (fetch timing only)       | No                      | Yes (action timeline)          |
| **Library plugin system**          | Yes (auto-discovered via LibraryInspector protocol)  | No (monolithic)              | No (monolithic)         | Extension-based (browser only) |
| **Typed snapshots (compile-time)** | Yes (TypedLibraryInspector, TypedUnifiedSnapshot)    | No                           | No                      | No                             |
| **Event log**                      | Yes (ring buffer, filterable)                        | No (limited to query events) | Yes (atom history)      | Yes (action log)               |
| **Theme support**                  | Light / Dark / System                                | Light / Dark                 | Light / Dark            | Light / Dark                   |
| **Keyboard shortcuts**             | Yes (configurable hotkey)                            | Yes (fixed)                  | No                      | No                             |
| **Resize/drag**                    | Yes (vertical resize handle)                         | Yes (vertical resize)        | Yes (horizontal resize) | No (fixed size)                |
| **Production tree-shake**          | Yes (`enabled` prop gates all code)                  | Yes (`lazy` import)          | Yes (separate package)  | Requires manual removal        |
| **Accessibility**                  | ARIA roles, focus trap, keyboard nav, reduced motion | Partial                      | Minimal                 | Minimal                        |

### Key Differentiators

**vs React Query DevTools:**
React Query DevTools is a single-purpose inspector for cache state. HexDI DevTools is a multi-library inspection framework -- it shows container-level state, dependency graphs, scope trees, tracing timelines, and any library that implements the LibraryInspector protocol. The plugin system means libraries not yet written today can add their own panels without modifying the DevTools package.

**vs Jotai DevTools:**
Jotai DevTools focuses on atom values and dependencies. HexDI DevTools covers the entire DI container hierarchy, including cross-scope resolution, lifecycle phases, and adapter metadata. The typed LibraryInspector protocol provides compile-time safety that Jotai DevTools (which relies on runtime atom names) does not.

**vs Redux DevTools (in-app):**
Redux DevTools' action timeline is conceptually similar to HexDI's event log panel, but Redux DevTools requires a browser extension for the full feature set. HexDI DevTools is a self-contained in-app overlay that requires no external tooling. The dependency graph visualization and scope tree have no equivalent in Redux DevTools.

---

## Appendix B: Glossary

| Term                       | Definition                                                                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Panel**                  | A tabbed view within the DevTools overlay. Each panel displays a different aspect of the application's state (container, graph, scopes, tracing, etc.).                                                                                        |
| **Panel Plugin**           | A `DevToolsPanel` object registered via the `panels` prop. Contains an `id`, `label`, `icon`, `order`, and React `component`. Custom panels receive the same `PanelProps` as built-in panels.                                                  |
| **Trigger Button**         | The floating button displayed when the DevTools overlay is closed. Positioned in a screen corner (configurable via `triggerPosition`). Clicking it opens the panel.                                                                            |
| **Panel Shell**            | The fixed-position container that holds the tab bar, active panel content, and resize handle. Anchored to the bottom of the viewport.                                                                                                          |
| **Resize Handle**          | A draggable horizontal bar at the top edge of the Panel Shell. Dragging it changes the panel height. The height is persisted to localStorage.                                                                                                  |
| **Tab Bar**                | The horizontal navigation bar within the Panel Shell. Contains one tab per panel (built-in + custom + auto-discovered library panels), ordered by the `order` property.                                                                        |
| **Library Panel**          | A panel auto-generated from a registered `LibraryInspector`. The DevTools discovers libraries via `inspector.getLibraryInspectors()` and renders either a tree view of the library snapshot or a custom component if the library provides one. |
| **Typed LibraryInspector** | An enhanced version of `LibraryInspector` that carries typed snapshot and name parameters. Enables compile-time extraction of library names and snapshot shapes from a graph's provides type.                                                  |
| **Unified Snapshot**       | A frozen object combining the container's `ContainerSnapshot` with all registered library snapshots. Queried via `inspector.getUnifiedSnapshot()`.                                                                                             |
| **CSS Scoping**            | All DevTools styles are scoped under `[data-hex-devtools]` attribute selectors to prevent leaking into the host application's styles.                                                                                                          |
| **Ring Buffer**            | The fixed-size circular buffer used by the event log panel. When full, the oldest event is evicted to make room for new events. Prevents unbounded memory growth.                                                                              |
| **Stat Card**              | A small card in the Container panel displaying a single metric (e.g., total ports, resolved count, error rate).                                                                                                                                |
| **Detail Bar**             | A side section in the Graph and Scope Tree panels that appears when a node is selected. Shows detailed information about the selected item.                                                                                                    |
| **Span Bar**               | A horizontal bar in the Tracing panel representing a single resolution or transition span. Width proportional to duration. Color indicates success or error.                                                                                   |

---

## Appendix C: Design Decisions

### C1. In-App Overlay vs Browser Extension

**Decision:** Ship the in-app overlay first. Browser extension is a future enhancement.

**Rationale:** In-app overlays have zero installation friction -- developers add `<HexDevTools />` to their component tree and immediately see results. Browser extensions require extension store distribution, version management, and cross-browser testing. The overlay approach follows the pattern established by React Query DevTools, Jotai DevTools, and TanStack Router DevTools, which are widely adopted precisely because they require no external tooling. The existing `DevToolsBridge` component already handles the browser extension data channel -- the overlay and the extension are complementary, not competing.

### C2. Bottom Panel vs Side Panel

**Decision:** Bottom-anchored panel (full-width, vertical resize).

**Rationale:** Bottom panels maximize horizontal space, which is critical for the dependency graph visualization and tracing timeline. The full-width layout matches the established pattern from React Query DevTools and Jotai DevTools, reducing cognitive friction for developers who already use those tools. Side panels (as used by some Jotai DevTools configurations) compete with the application's layout for horizontal space, which is more disruptive for typical web applications with responsive layouts.

### C3. CSS Custom Properties vs CSS-in-JS

**Decision:** CSS custom properties (CSS variables) scoped under `[data-hex-devtools]`.

**Rationale:** CSS custom properties provide theme switching without JavaScript runtime overhead. Changing from light to dark theme requires only updating the `data-hex-devtools` attribute value, which triggers a single CSS repaint. No CSS-in-JS library dependency is introduced, keeping the DevTools bundle minimal and avoiding conflicts with the host application's styling solution. The `[data-hex-devtools]` attribute selector provides style isolation without Shadow DOM complexity or CSS Modules build tooling.

### C4. Panel Plugin Architecture

**Decision:** Composable panels via `DevToolsPanel` interface rather than a monolithic view.

**Rationale:** The HexDI ecosystem has multiple libraries (Flow, Store, Query, Saga, Logger) that each produce inspection data. A monolithic view would either be overwhelming or require the DevTools to depend on every library. The plugin architecture decouples them: each library can provide a panel component that is registered dynamically. The auto-discovery mechanism (via `LibraryInspector` protocol) means libraries register their panels without the DevTools package importing them. Future libraries can add DevTools panels without modifying the DevTools package.

### C5. Typed LibraryInspector Protocol

**Decision:** Additive enhancement (new `TypedLibraryInspector<TName, TSnapshot>` interface) rather than breaking changes to the existing `LibraryInspector`.

**Rationale:** The existing `LibraryInspector` protocol is already implemented by Flow, Store, and Logger libraries. Breaking it would require coordinated changes across all libraries. The typed variant extends the base interface -- a `TypedLibraryInspector<"flow", FlowSnapshot>` is assignable to `LibraryInspector`. Libraries can adopt the typed variant incrementally. The type utilities (`ExtractLibraryInspectorPorts`, `LibrarySnapshotMap`) only activate when typed ports are used, providing zero overhead for untyped usage.

### C6. No Dependency on Visualization Libraries

**Decision:** Custom SVG rendering for the dependency graph instead of React Flow, Cytoscape, D3, or similar.

**Rationale:** Visualization libraries add significant bundle weight (React Flow: ~90KB, Cytoscape: ~200KB, D3: ~80KB). The dependency graph for a typical HexDI application has 10-100 nodes -- well within the range where simple force-directed layout with custom SVG is sufficient. Avoiding external dependencies also eliminates version conflicts with the host application and keeps the DevTools bundle predictable. Zoom, pan, and node selection are straightforward to implement with SVG transforms and pointer events.

### C7. Internal State Management

**Decision:** React context + `useReducer` for DevTools internal state rather than an external store (Zustand, Jotai, etc.).

**Rationale:** The DevTools state is small and local (open/closed, active tab, panel height, theme). It does not need to be shared across component trees or persisted beyond localStorage. Using React's built-in state management avoids adding a dependency and prevents conflicts with the host application's state management solution. The `useDevToolsState` hook encapsulates the reducer and localStorage persistence in a single composable unit.

### C8. In-Process vs WebSocket Transport

**Decision:** DevTools 0.1.0 is in-process only (runs in the same browser tab). Remote/standalone mode via WebSocket or SSE is deferred to a future `@hex-di/devtools-server` package.

**Rationale:** In-process inspection has zero serialization cost -- React components read `InspectorAPI` directly through object references, not through serialized messages. There is no security surface to manage (no open ports, no authentication, no CORS). Deployment is simpler: developers add one React component, not a separate server process. The primary use case for DevTools is React SPA development, where the application and the DevTools are always in the same browser tab.

**Trade-off:** In-process mode cannot inspect remote Node.js servers or headless environments. A developer running a Node.js API server cannot view its container state from a browser dashboard. This is a real limitation for server-side applications.

**Deferral:** A future `@hex-di/devtools-server` package will provide a WebSocket bridge that serializes `InspectorAPI` data and streams it to a standalone DevTools dashboard. The dashboard will use the same panel components as the in-app overlay, receiving data through a `RemoteInspectorAPI` adapter that implements `InspectorAPI` over the WebSocket channel. This aligns with VISION.md Phase 4 (remote diagnostic access). The in-process overlay and the remote dashboard will coexist: in-process for SPA development, remote for server inspection.

---

## Appendix D: Migration Guide

### Relationship Between DevToolsBridge and HexDevTools

| Aspect        | DevToolsBridge                                            | HexDevTools                              |
| ------------- | --------------------------------------------------------- | ---------------------------------------- |
| **Purpose**   | Data bridge to browser extension via `window.postMessage` | Visual in-app overlay panel              |
| **Renders**   | Nothing (`return null`)                                   | Trigger button + panel shell             |
| **Data flow** | Inspector events -> postMessage -> browser extension      | Inspector API -> React components -> DOM |
| **Import**    | `@hex-di/react`                                           | `@hex-di/devtools`                       |

### Can They Coexist?

Yes. `DevToolsBridge` and `HexDevTools` serve different purposes and can both be rendered simultaneously:

```tsx
import { DevToolsBridge, InspectorProvider } from "@hex-di/react";
import { HexDevTools } from "@hex-di/devtools";

function App() {
  return (
    <InspectorProvider inspector={container.inspector}>
      {/* Data bridge for browser extension (invisible) */}
      <DevToolsBridge
        inspector={container.inspector}
        enabled={process.env.NODE_ENV === "development"}
      />
      {/* In-app overlay panel (visible) */}
      <HexDevTools enabled={process.env.NODE_ENV === "development"} />
      <MainApp />
    </InspectorProvider>
  );
}
```

- `DevToolsBridge` continues to forward events to browser extensions for developers who prefer that workflow.
- `HexDevTools` provides the visual overlay for developers who prefer in-app inspection.
- Both consume the same `InspectorAPI` instance, so they always show consistent data.
- Neither interferes with the other's subscriptions or event handling.

### Upgrading from DevToolsBridge-Only Setup

If your application currently uses only `DevToolsBridge`:

1. Install `@hex-di/devtools`.
2. Add `<HexDevTools />` inside your `InspectorProvider`.
3. Optionally keep `DevToolsBridge` for browser extension support, or remove it if the in-app overlay is sufficient.
4. No API changes are required -- `HexDevTools` auto-detects the inspector from `InspectorProvider` context.

---

_Previous: [16 - API Reference](./06-api-reference.md)_ | _Next: [18 - Definition of Done](./08-definition-of-done.md)_
