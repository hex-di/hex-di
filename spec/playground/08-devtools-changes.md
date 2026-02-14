# 08 — DevTools Spec Changes

This addendum documents all changes required to the existing DevTools specification (`spec/devtools/`) to support the shared infrastructure model. These changes are a prerequisite for both the playground and the refactored devtools dashboard.

---

## 38. Summary of Required Changes

The changes fall into four categories:

1. **PanelProps migration**: `remoteInspector: RemoteInspectorAPI` → `dataSource: InspectorDataSource`
2. **Package structure split**: Panels, visualization, theme, and hooks move from `@hex-di/devtools` to `@hex-di/devtools-ui`
3. **RemoteInspectorAPI update**: Now implements `InspectorDataSource` interface
4. **Dependency graph update**: 2-package model → 4-package model

No changes are needed to:

- WebSocket protocol (messages, handshake, heartbeat)
- `@hex-di/devtools-client` package (transport SDK)
- Individual panel specifications (rendering logic, data models, layout)
- Visual design tokens (colors, typography, spacing)
- Library panel specifications

---

## 39. PanelProps Migration

### 39.1 Current Definition (devtools spec 03-panel-architecture.md, Section 6.2)

```typescript
// CURRENT — to be replaced
interface PanelProps {
  readonly remoteInspector: RemoteInspectorAPI;
  readonly connectionId: string;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}
```

### 39.2 New Definition

```typescript
// NEW — transport-agnostic
interface PanelProps {
  readonly dataSource: InspectorDataSource;
  readonly theme: ResolvedTheme;
  readonly width: number;
  readonly height: number;
}
```

### 39.3 Migration Details

| Old Field                             | New Field                         | Rationale                                                                                                                            |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `remoteInspector: RemoteInspectorAPI` | `dataSource: InspectorDataSource` | Transport-agnostic abstraction                                                                                                       |
| `connectionId: string`                | removed                           | Panels use `dataSource.displayName` for identity. Connection management is dashboard-shell responsibility, not panel responsibility. |
| `theme: ResolvedTheme`                | `theme: ResolvedTheme`            | Unchanged                                                                                                                            |
| `width: number`                       | `width: number`                   | Unchanged                                                                                                                            |
| `height: number`                      | `height: number`                  | Unchanged                                                                                                                            |

### 39.4 Affected Spec Sections

| File                       | Section                 | Change                                                         |
| -------------------------- | ----------------------- | -------------------------------------------------------------- |
| `03-panel-architecture.md` | 6.2 Panel Plugin System | Replace `PanelProps` definition                                |
| `03-panel-architecture.md` | 6.3 Built-in Panels     | Update panel descriptions to reference `dataSource`            |
| `03-panel-architecture.md` | 6.4 Library Panels      | Update `PanelProps` usage                                      |
| `03-panel-architecture.md` | 7.2 Data Flow           | Update "remote inspector data flow" to "data source data flow" |
| `04-panels.md`             | All panel sections      | Replace `remoteInspector` references with `dataSource`         |
| `06-api-reference.md`      | Hook APIs               | Rename `useRemoteSnapshot` → `useDataSourceSnapshot`, etc.     |
| `panels/*.md`              | All library panels      | Replace `remoteInspector` references with `dataSource`         |

---

## 40. Package Structure Split

### 40.1 Current Structure (2 packages)

```
@hex-di/devtools          — Dashboard (panels + visualization + theme + WS server + CLI)
@hex-di/devtools-client   — Transport SDK
```

### 40.2 New Structure (4 packages)

```
@hex-di/devtools-ui       — Shared panels, visualization, theme, hooks (NEW)
@hex-di/devtools          — Dashboard shell, WS server, CLI (refactored)
@hex-di/devtools-client   — Transport SDK (unchanged)
@hex-di/playground        — Code editor, sandbox, examples (NEW)
```

### 40.3 Module Migration Map

The following modules move from the devtools spec's directory structure to `@hex-di/devtools-ui`:

| devtools spec section                   | devtools-ui module         | Notes                                      |
| --------------------------------------- | -------------------------- | ------------------------------------------ |
| 6.2 `DevToolsPanel`, `PanelProps` types | `panels/types.ts`          | `PanelProps` updated per Section 39        |
| 6.3 Built-in panel components           | `panels/*.tsx`             | 7 panel components                         |
| 6.3 Panel registry                      | `panels/registry.ts`       | Registration logic                         |
| 9 Graph renderer                        | `visualization/graph/`     | Dagre layout, SVG nodes/edges              |
| 10 Tree renderer                        | `visualization/tree/`      | Recursive tree with keyboard nav           |
| 11 Timeline renderer                    | `visualization/timeline/`  | Tracing span bars                          |
| 8 JSON viewer (within Container panel)  | `visualization/json-tree/` | Extracted as standalone component          |
| 13 Design tokens                        | `theme/tokens.ts`          | All CSS custom property definitions        |
| 6.7 Theme system                        | `theme/`                   | ThemeProvider, useTheme, system preference |
| 6.7 CSS variables                       | `theme/css-variables.ts`   | `[data-hex-devtools]` scope                |
| 7.1 UI components                       | `components/`              | Badges, search, empty state, etc.          |
| 16 Hook APIs (renamed)                  | `hooks/`                   | `useRemote*` → `useDataSource*`            |

### 40.4 What Remains in `@hex-di/devtools`

| Component              | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `DashboardApp`         | Root component (wraps devtools-ui panels in WS context) |
| `ConnectionProvider`   | WebSocket connection lifecycle management               |
| `RemoteInspectorAPI`   | WebSocket-backed `InspectorDataSource` implementation   |
| `Sidebar`              | Connection list, app filtering                          |
| `AppList`              | List of connected applications                          |
| `ConnectionHeader`     | Active connection status display                        |
| `DashboardLayout`      | Grid layout with sidebar + main content                 |
| WebSocket server       | HTTP server, WS upgrade, message routing                |
| CLI entry point        | `npx @hex-di/devtools`                                  |
| `DevToolsServerConfig` | Server configuration types                              |

### 40.5 Affected Spec Sections

| File                       | Section                         | Change                                                             |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `01-overview.md`           | 3 Package Structure             | Add `devtools-ui` and `playground` to dependency graph             |
| `01-overview.md`           | 3.2 Package directory structure | Update to show devtools-ui imports                                 |
| `03-panel-architecture.md` | 6.1 Architectural Overview      | Update layer diagram (devtools-ui is a dependency, not a sublayer) |
| `03-panel-architecture.md` | 7.1 Component Tree              | Show devtools-ui components as imports                             |
| `08-definition-of-done.md` | Test file conventions           | Add devtools-ui test conventions                                   |
| `README.md`                | Package dependencies            | Update to 4-package model                                          |

---

## 41. RemoteInspectorAPI Changes

### 41.1 Current Interface (devtools spec 06-api-reference.md)

```typescript
// CURRENT
interface RemoteInspectorAPI {
  readonly connectionId: string;
  readonly appName: string;
  readonly appType: "react" | "node" | "unknown";
  readonly instanceId: string;
  readonly metadata: ConnectionMetadata;
  readonly status: "connected" | "stale" | "disconnected";
  readonly latencyMs: number;

  getSnapshot(): ContainerSnapshot | undefined;
  getScopeTree(): ScopeTree | undefined;
  getGraphData(): ContainerGraphData | undefined;
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;
  getAdapterInfo(): readonly AdapterInfo[] | undefined;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;
  subscribe(listener: (event: InspectorEvent) => void): () => void;
}
```

### 41.2 Updated Interface

```typescript
// NEW — implements InspectorDataSource
interface RemoteInspectorAPI extends InspectorDataSource {
  // InspectorDataSource fields
  readonly displayName: string; // Returns appName
  readonly sourceType: "remote";

  // RemoteInspectorAPI-specific fields (not in InspectorDataSource)
  readonly connectionId: string;
  readonly appName: string;
  readonly appType: "react" | "node" | "unknown";
  readonly instanceId: string;
  readonly metadata: ConnectionMetadata;
  readonly status: "connected" | "stale" | "disconnected";
  readonly latencyMs: number;

  // InspectorDataSource methods (already present, signatures match)
  getSnapshot(): ContainerSnapshot | undefined;
  getScopeTree(): ScopeTree | undefined;
  getGraphData(): ContainerGraphData | undefined;
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;
  getAdapterInfo(): readonly AdapterInfo[] | undefined;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;
  subscribe(listener: (event: InspectorEvent) => void): () => void;
}
```

The change is additive: `RemoteInspectorAPI` gains `displayName` and `sourceType` fields, and formally `extends InspectorDataSource`. All existing methods already satisfy the interface.

### 41.3 Affected Spec Sections

| File                       | Section               | Change                                                                |
| -------------------------- | --------------------- | --------------------------------------------------------------------- |
| `06-api-reference.md`      | 16 RemoteInspectorAPI | Add `extends InspectorDataSource`, add `displayName` and `sourceType` |
| `03-panel-architecture.md` | 6.2 Panel data flow   | Show `RemoteInspectorAPI` as an `InspectorDataSource` implementation  |

---

## 42. Section-by-Section Change Log

Complete change log for every devtools spec document. Changes marked with priority:

- **[REQUIRED]** — Must be updated for correctness
- **[RECOMMENDED]** — Should be updated for clarity and consistency
- **[OPTIONAL]** — Can be deferred

### `README.md`

| Change             | Priority          | Description                                                            |
| ------------------ | ----------------- | ---------------------------------------------------------------------- |
| Package table      | **[REQUIRED]**    | Add `@hex-di/devtools-ui` and `@hex-di/playground` to the package list |
| Dependency diagram | **[REQUIRED]**    | Update to 4-package dependency graph                                   |
| Table of contents  | **[RECOMMENDED]** | Add link to playground spec                                            |

### `01-overview.md`

| Section                  | Change                                            | Priority          |
| ------------------------ | ------------------------------------------------- | ----------------- |
| 3.1 Package roles        | Add devtools-ui and playground descriptions       | **[REQUIRED]**    |
| 3.2 Directory structure  | Show devtools-ui as separate package              | **[REQUIRED]**    |
| 3.3 Package exports      | Split devtools exports (panels go to devtools-ui) | **[REQUIRED]**    |
| 2.5 Architecture diagram | Add devtools-ui layer                             | **[RECOMMENDED]** |

### `02-compile-time-protocol.md`

No changes required. The compile-time protocol operates at the `@hex-di/core` type level, independent of transport or UI packages.

### `03-panel-architecture.md`

| Section                    | Change                                                         | Priority          |
| -------------------------- | -------------------------------------------------------------- | ----------------- |
| 6.1 Architectural overview | Update layer diagram to show devtools-ui as shared dependency  | **[REQUIRED]**    |
| 6.2 Panel Plugin System    | Replace `PanelProps` definition (Section 39)                   | **[REQUIRED]**    |
| 6.3 Built-in Panels        | Note that panels are provided by devtools-ui                   | **[REQUIRED]**    |
| 6.4 Library Panels         | Update `PanelProps` references                                 | **[REQUIRED]**    |
| 6.7 Theme System           | Note that theme is provided by devtools-ui                     | **[RECOMMENDED]** |
| 7.1 Component Tree         | Mark devtools-ui components as imports                         | **[RECOMMENDED]** |
| 7.2 Data Flow              | Rename "remote inspector data flow" to "data source data flow" | **[REQUIRED]**    |

### `04-panels.md`

| Section            | Change                                                       | Priority       |
| ------------------ | ------------------------------------------------------------ | -------------- |
| All panel sections | Replace `remoteInspector` with `dataSource` in code examples | **[REQUIRED]** |
| All panel sections | Replace `useRemoteSnapshot()` with `useDataSourceSnapshot()` | **[REQUIRED]** |

### `05-visual-design.md`

| Section               | Change                                      | Priority          |
| --------------------- | ------------------------------------------- | ----------------- |
| 13.1 Design Tokens    | Note that tokens are defined in devtools-ui | **[RECOMMENDED]** |
| 13.2 Theme resolution | Note that ThemeProvider is from devtools-ui | **[RECOMMENDED]** |

### `06-api-reference.md`

| Section                 | Change                                                         | Priority       |
| ----------------------- | -------------------------------------------------------------- | -------------- |
| RemoteInspectorAPI      | Add `extends InspectorDataSource`, `displayName`, `sourceType` | **[REQUIRED]** |
| Hook APIs               | Rename `useRemoteSnapshot` → `useDataSourceSnapshot`, etc.     | **[REQUIRED]** |
| Hook APIs               | Note hooks are exported from devtools-ui, not devtools         | **[REQUIRED]** |
| PanelProps              | Update definition per Section 39                               | **[REQUIRED]** |
| Add InspectorDataSource | Add the InspectorDataSource interface to the API reference     | **[REQUIRED]** |

### `07-appendices.md`

| Section          | Change                                                                                       | Priority          |
| ---------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| Glossary         | Add entries: `InspectorDataSource`, `devtools-ui`, `playground`, `PlaygroundInspectorBridge` | **[RECOMMENDED]** |
| Design decisions | Add entry for devtools-ui extraction rationale                                               | **[OPTIONAL]**    |

### `08-definition-of-done.md`

| Section               | Change                                                                              | Priority       |
| --------------------- | ----------------------------------------------------------------------------------- | -------------- |
| Test file conventions | Add devtools-ui test conventions                                                    | **[REQUIRED]** |
| Unit tests            | Add devtools-ui unit test requirements (InspectorDataSource, LocalInspectorAdapter) | **[REQUIRED]** |
| Component tests       | Split panel component tests into devtools-ui (panels) and devtools (shell)          | **[REQUIRED]** |

### `panels/*.md` (all 6 files)

| Change                                                                           | Priority          |
| -------------------------------------------------------------------------------- | ----------------- |
| Replace `remoteInspector` with `dataSource` in code examples and type signatures | **[REQUIRED]**    |
| Replace `useRemoteSnapshot()` etc. with `useDataSourceSnapshot()` etc.           | **[REQUIRED]**    |
| Note that panel components live in devtools-ui                                   | **[RECOMMENDED]** |
