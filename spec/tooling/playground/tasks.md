# HexDi Playground — Implementation Task List

## Context

This task list covers the full implementation of the HexDi Playground specification (`spec/tooling/playground/`, 10 documents). The playground is an interactive browser-based environment for experimenting with HexDi DI patterns. It requires two new packages (`@hex-di/devtools-ui` and `@hex-di/playground`) and builds on the existing monorepo infrastructure.

The spec is at `spec/tooling/playground/`. Key architectural decisions:

- **4-package model**: `devtools-ui` (shared), `devtools` (WS dashboard), `devtools-client` (transport), `playground` (editor+sandbox)
- **`InspectorDataSource`** interface as the transport-agnostic seam enabling panel reuse
- **Monaco + esbuild-wasm + Web Worker** for the edit/compile/execute pipeline
- **Static-hostable** — no backend required

## Parallelization

Phases 1-2 (devtools-ui) and Phases 3-4 (playground sandbox/editor) can run in parallel after Phase 0 completes. Phase 5 depends on both tracks. Phases 6-7 depend on Phase 5.

```
Phase 0 (Foundation)
    ├── Phases 1-2 (devtools-ui: data → panels → viz → theme → hooks)
    └── Phases 3-4 (playground: sandbox → editor)
         ↓
Phase 5 (Layout & Console) — merges both tracks
    ↓
Phase 6 (Examples & Sharing)
    ↓
Phase 7 (App Shell & Embedding)
```

---

## Phase 0: Foundation

- [x] ### Task 1: Scaffold `@hex-di/devtools-ui` package

Create the package skeleton following monorepo conventions.

**Files to create:**

- `packages/devtools-ui/package.json` — name `@hex-di/devtools-ui`, `type: "module"`, peer deps on `react ^18||^19`, dep on `@hex-di/core: "workspace:*"`
- `packages/devtools-ui/tsconfig.json` — extends `../../tsconfig.json`, jsx `react-jsx`, lib `["ES2022", "DOM"]`
- `packages/devtools-ui/tsconfig.build.json` — excludes tests
- `packages/devtools-ui/eslint.config.js` — React ESLint config (see `integrations/react/eslint.config.js` for pattern)
- `packages/devtools-ui/vitest.config.ts` — jsdom environment, includes `.tsx` tests
- `packages/devtools-ui/src/index.ts` — empty barrel export

**Monorepo updates:**

- Add `"packages/devtools-ui"` to `pnpm-workspace.yaml` (already covered by `packages/*` glob — verify)
- Run `pnpm install` to link workspace

**Reference:** `integrations/react/package.json` for React package pattern, `packages/result/package.json` for simple package pattern.

- [x] ### Task 2: Scaffold `@hex-di/playground` package

Create the package skeleton.

**Files to create:**

- `packages/playground/package.json` — name `@hex-di/playground`, deps on `@hex-di/devtools-ui: "workspace:*"`, `@hex-di/core: "workspace:*"`, `monaco-editor`, `esbuild-wasm`, `pako`; peer deps on `react ^18||^19`
- `packages/playground/tsconfig.json` — jsx `react-jsx`, lib `["ES2022", "DOM", "DOM.Iterable", "WebWorker"]`
- `packages/playground/tsconfig.build.json`
- `packages/playground/eslint.config.js` — React ESLint config
- `packages/playground/vitest.config.ts` — jsdom environment
- `packages/playground/src/index.ts` — empty barrel export
- `packages/playground/src/public/index.html` — entry HTML

**Reference:** Same patterns as Task 1.

- [x] ### Task 3: Verify scaffolding builds and lints

Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` on both new packages to confirm scaffolding is correct. Ensure turbo pipeline recognizes the new packages.

---

## Phase 1: Shared Data Layer (`@hex-di/devtools-ui`)

- [x] ### Task 4: Implement `InspectorDataSource` interface

**Spec:** `02-shared-infrastructure.md` Section 5.2

**Files:**

- `packages/devtools-ui/src/data/inspector-data-source.ts` — interface definition
- Export from `src/index.ts`

**Key details:**

- 7 pull methods (all return `T | undefined`)
- 1 `subscribe` method returning unsubscribe function
- 2 metadata fields: `displayName: string`, `sourceType: "remote" | "local"`
- Import types from `@hex-di/core`: `ContainerSnapshot`, `ScopeTree`, `ContainerGraphData`, `UnifiedSnapshot`, `AdapterInfo`, `LibraryInspector`, `ResultStatistics`, `InspectorEvent`

**Source of truth:** `packages/core/src/inspection/inspector-types.ts`

- [x] ### Task 5: Implement `LocalInspectorAdapter`

**Spec:** `02-shared-infrastructure.md` Section 5.4 (third implementation)

**Files:**

- `packages/devtools-ui/src/data/local-inspector-adapter.ts`
- `packages/devtools-ui/tests/data/local-inspector-adapter.test.ts`
- Export from `src/index.ts`

**Key details:**

- Constructor takes `(inspector: InspectorAPI, displayName: string)`
- `sourceType = "local"` (constant)
- All 7 get methods delegate to `inspector.*`
- `subscribe` delegates to `inspector.subscribe`

**Tests (5):** Spec `09-definition-of-done.md` Section 43.2.1

- [x] ### Task 6: Implement `DataSourceProvider` and `useDataSource` context

**Spec:** `02-shared-infrastructure.md` Section 10.3

**Files:**

- `packages/devtools-ui/src/context/data-source-context.tsx`
- Export from `src/index.ts`

**Key details:**

- React context wrapping `InspectorDataSource`
- `useDataSource()` throws if used outside provider
- Follow pattern from `integrations/react/src/hooks/use-snapshot.ts`

- [x] ### Task 7: Implement data source hooks

**Spec:** `02-shared-infrastructure.md` Section 10.1

**Files:**

- `packages/devtools-ui/src/hooks/use-data-source-snapshot.ts`
- `packages/devtools-ui/src/hooks/use-data-source-scope-tree.ts`
- `packages/devtools-ui/src/hooks/use-data-source-unified-snapshot.ts`
- `packages/devtools-ui/src/hooks/use-data-source-tracing-summary.ts`
- `packages/devtools-ui/tests/hooks/use-data-source-snapshot.test.tsx`
- `packages/devtools-ui/tests/hooks/use-data-source-scope-tree.test.tsx`
- Export all from `src/index.ts`

**Key details:**

- All use `useSyncExternalStore` pattern from `integrations/react/src/hooks/use-snapshot.ts`
- Read from `DataSourceContext`
- Subscribe via `dataSource.subscribe()`, re-read on each event

**Tests (3 per hook):** Spec Section 43.6

- [x] ### Task 8: Implement type-level tests for data layer

**Files:**

- `packages/devtools-ui/tests/types/inspector-data-source.test-d.ts`
- `packages/devtools-ui/tests/types/panel-props.test-d.ts`

**Spec:** Section 43.7

---

## Phase 2: Panel System & Visualization (`@hex-di/devtools-ui`)

- [x] ### Task 9: Implement theme system

**Spec:** `02-shared-infrastructure.md` Section 9

**Files:**

- `packages/devtools-ui/src/theme/tokens.ts` — design token definitions (colors, typography, spacing, radius, shadows)
- `packages/devtools-ui/src/theme/css-variables.ts` — CSS custom property generation, `[data-hex-devtools]` scope
- `packages/devtools-ui/src/theme/system-preference.ts` — `prefers-color-scheme` detection
- `packages/devtools-ui/src/theme/theme-provider.tsx` — ThemeProvider component
- `packages/devtools-ui/src/theme/use-theme.ts` — useTheme hook
- `packages/devtools-ui/tests/theme/theme-provider.test.tsx`
- `packages/devtools-ui/tests/theme/use-theme.test.ts`
- `packages/devtools-ui/tests/theme/css-variables.test.ts`
- `packages/devtools-ui/tests/theme/system-preference.test.ts`

**Tests (6):** Spec Section 43.5

**Reference:** `spec/tooling/devtools/05-visual-design.md` for token values

- [x] ### Task 10: Implement shared UI components

**Spec:** `02-shared-infrastructure.md` Section 6.2 exports

**Files:**

- `packages/devtools-ui/src/components/status-badge.tsx`
- `packages/devtools-ui/src/components/search-input.tsx`
- `packages/devtools-ui/src/components/empty-state.tsx`
- `packages/devtools-ui/src/components/error-boundary.tsx`
- `packages/devtools-ui/src/components/stat-card.tsx`
- `packages/devtools-ui/src/components/sort-header.tsx`
- `packages/devtools-ui/src/components/sidebar-resize-handle.tsx`
- `packages/devtools-ui/tests/components/status-badge.test.tsx`
- `packages/devtools-ui/tests/components/search-input.test.tsx`
- `packages/devtools-ui/tests/components/empty-state.test.tsx`
- `packages/devtools-ui/tests/components/error-boundary.test.tsx`

**Tests (10):** Spec Section 43.4

- [x] ### Task 11: Implement utility hooks

**Spec:** `02-shared-infrastructure.md` Section 10.2

**Files:**

- `packages/devtools-ui/src/hooks/use-table-sort.ts`
- `packages/devtools-ui/src/hooks/use-tree-navigation.ts`
- `packages/devtools-ui/src/hooks/use-auto-scroll.ts`
- `packages/devtools-ui/src/hooks/use-persisted-state.ts`
- `packages/devtools-ui/src/hooks/use-keyboard-shortcuts.ts`
- `packages/devtools-ui/src/hooks/use-resize-observer.ts`
- Tests for each

**Tests (3):** Spec Section 43.6 (items 6-8)

- [x] ### Task 12: Implement PanelProps, DevToolsPanel types, and PanelRegistry

**Spec:** `02-shared-infrastructure.md` Section 7.1-7.4

**Files:**

- `packages/devtools-ui/src/panels/types.ts` — `PanelProps`, `DevToolsPanel` interfaces
- `packages/devtools-ui/src/panels/registry.ts` — `PanelRegistry` class
- `packages/devtools-ui/src/context/panel-context.tsx` — `PanelStateProvider`, `usePanelState`
- `packages/devtools-ui/tests/panels/registry.test.ts`

**Tests (7):** Spec Section 43.2.2

- [x] ### Task 13: Implement visualization — Graph Renderer

**Spec:** `02-shared-infrastructure.md` Section 8.1

**Files:**

- `packages/devtools-ui/src/visualization/graph/graph-renderer.tsx`
- `packages/devtools-ui/src/visualization/graph/graph-node.tsx`
- `packages/devtools-ui/src/visualization/graph/graph-edge.tsx`
- `packages/devtools-ui/src/visualization/graph/graph-layout.ts` — dagre layout computation
- `packages/devtools-ui/src/visualization/graph/graph-controls.tsx` — pan/zoom/fit
- `packages/devtools-ui/tests/visualization/graph-renderer.test.tsx`

**Dependencies:** `dagre` package (add to devtools-ui deps)

**Tests (6):** Spec Section 43.3.2

- [x] ### Task 14: Implement visualization — Tree Renderer

**Spec:** `02-shared-infrastructure.md` Section 8.2

**Files:**

- `packages/devtools-ui/src/visualization/tree/tree-renderer.tsx`
- `packages/devtools-ui/src/visualization/tree/tree-node.tsx`
- `packages/devtools-ui/src/visualization/tree/tree-keyboard.ts`
- `packages/devtools-ui/tests/visualization/tree-renderer.test.tsx`

**Tests (6):** Spec Section 43.3.3

- [x] ### Task 15: Implement visualization — Timeline Renderer and JSON Tree

**Spec:** `02-shared-infrastructure.md` Sections 8.3, 8.4

**Files:**

- `packages/devtools-ui/src/visualization/timeline/timeline-renderer.tsx`
- `packages/devtools-ui/src/visualization/timeline/timeline-row.tsx`
- `packages/devtools-ui/src/visualization/timeline/timeline-scale.tsx`
- `packages/devtools-ui/src/visualization/json-tree/json-tree.tsx`
- `packages/devtools-ui/src/visualization/json-tree/json-value.tsx`
- `packages/devtools-ui/tests/visualization/timeline-renderer.test.tsx`
- `packages/devtools-ui/tests/visualization/json-tree.test.tsx`

**Tests (4):** Spec Section 43.3.4

- [x] ### Task 16: Implement 7 built-in panel components

**Spec:** `02-shared-infrastructure.md` Section 7.3, `spec/tooling/devtools/04-panels.md`

**Files:**

- `packages/devtools-ui/src/panels/overview-panel.tsx`
- `packages/devtools-ui/src/panels/container-panel.tsx`
- `packages/devtools-ui/src/panels/graph-panel.tsx`
- `packages/devtools-ui/src/panels/scope-tree-panel.tsx`
- `packages/devtools-ui/src/panels/event-log-panel.tsx`
- `packages/devtools-ui/src/panels/tracing-panel.tsx`
- `packages/devtools-ui/src/panels/health-panel.tsx`
- Tests for all 7

**Each panel uses:** `useDataSource()`, visualization components, theme, shared UI components.

**Tests (35 = 7 panels x 5):** Spec Section 43.3.1

- [x] ### Task 17: Finalize `devtools-ui` barrel exports and verify package

Update `packages/devtools-ui/src/index.ts` with all public exports per spec Section 6.2. Run full test suite, typecheck, lint.

---

## Phase 3: Sandbox Infrastructure (`@hex-di/playground`)

- [x] ### Task 18: Implement Worker Protocol types

**Spec:** `04-sandbox.md` Section 17

**Files:**

- `packages/playground/src/sandbox/worker-protocol.ts` — `MainToWorkerMessage`, `WorkerToMainMessage`, `SerializedValue`, serialization types
- `packages/playground/tests/sandbox/worker-protocol.test.ts` — serialization roundtrip
- `packages/playground/tests/types/worker-protocol.test-d.ts` — type-level tests

- [x] ### Task 19: Implement esbuild-wasm compiler

**Spec:** `04-sandbox.md` Section 15

**Files:**

- `packages/playground/src/sandbox/compiler.ts` — `compile(files, entryPoint)` function, `virtualFSPlugin`
- `packages/playground/tests/sandbox/compiler.test.ts`

**Key details:**

- esbuild-wasm initialization (cold start ~100ms)
- Virtual filesystem plugin resolving relative imports
- Externalize all `@hex-di/*` packages
- Return `CompilationResult { success, errors, code }`
- File resolution order: exact → `.ts` → `.tsx` → `/index.ts`

**Tests (6):** Spec Section 44.3

- [x] ### Task 20: Implement Web Worker executor

**Spec:** `04-sandbox.md` Section 16

**Files:**

- `packages/playground/src/sandbox/executor.ts` — `SandboxExecutor` class
- `packages/playground/src/sandbox/worker-entry.ts` — Worker entry point (runs in Worker context)
- `packages/playground/tests/sandbox/executor.test.ts`

**Key details:**

- Fresh Worker per execution (dispose previous)
- 5s default timeout via `setTimeout` + `worker.terminate()`
- Console interception in worker (log/warn/error/info/debug → postMessage)
- Module registry mapping `@hex-di/*` to pre-bundled packages
- User code execution via Blob URL + dynamic import

**Tests (6):** Spec Section 44.4

- [x] ### Task 21: Implement InspectorAPI extraction (container-bridge)

**Spec:** `04-sandbox.md` Section 16.5

**Files:**

- `packages/playground/src/sandbox/container-bridge.ts` — `extractInspectorData()`, `sendInspectorSnapshot()`
- `packages/playground/tests/sandbox/container-bridge.test.ts`

**Key details:**

- Strategy 1: Explicit `inspector` or `container` export from user module
- Strategy 2: Runtime hook tracking last created container
- Subscribe to InspectorAPI events, forward via postMessage
- Serialization for Maps (`LibraryInspectors`, `ResultStatistics`)

- [x] ### Task 22: Implement `PlaygroundInspectorBridge`

**Spec:** `04-sandbox.md` Section 18

**Files:**

- `packages/playground/src/adapter/playground-inspector-bridge.ts`
- `packages/playground/tests/adapter/playground-inspector-bridge.test.ts`

**Key details:**

- Implements `InspectorDataSource` from `@hex-di/devtools-ui`
- Maintains local cache updated by `handleInspectorData(data)`
- `reset()` clears all caches (called on new execution)
- Deserialization: `[string, T][]` → `ReadonlyMap<string, T>` for library inspectors and result statistics
- `displayName = "Playground Sandbox"`, `sourceType = "local"`

**Tests (10):** Spec Section 44.5

- [x] ### Task 23: Implement `SandboxManager` (orchestrator)

**Spec:** `04-sandbox.md` Section 16.2 (lifecycle)

**Files:**

- `packages/playground/src/sandbox/sandbox-manager.ts` — orchestrates compile + execute pipeline
- `packages/playground/tests/sandbox/sandbox-manager.test.ts`

**Key details:**

- State machine: idle → compiling → executing → complete/error
- Coordinates compiler (Task 19), executor (Task 20), bridge (Task 22)
- Receives files from VirtualFS, returns console entries + bridge updates

**Depends on:** Tasks 18-22

---

## Phase 4: Code Editor (`@hex-di/playground`)

- [x] ### Task 24: Implement VirtualFS

**Spec:** `03-code-editor.md` Section 13

**Files:**

- `packages/playground/src/editor/virtual-fs.ts`
- `packages/playground/tests/editor/virtual-fs.test.ts`

**Key details:**

- `readFile`, `writeFile`, `deleteFile`, `renameFile`, `fileExists`
- `listFiles()` sorted, `listFiles(directory)` filtered
- `getAll()` / `setAll()` for bulk operations
- `subscribe()` for FSEvent notifications
- Default workspace: single `main.ts` with starter template

**Tests (11):** Spec Section 44.2

- [x] ### Task 25: Implement type definition bundling

**Spec:** `03-code-editor.md` Section 12

**Files:**

- `packages/playground/src/editor/type-definitions.ts` — bundled `.d.ts` strings
- `scripts/bundle-playground-types.ts` — build script to extract `.d.ts` from packages
- `packages/playground/tests/editor/type-definitions.test.ts`

**Key details:**

- 10 packages: core, graph, runtime, result, flow, store, query, saga, tracing, logger
- Build-time extraction: collect `.d.ts` → embed as string constants
- Runtime registration: `addExtraLib()` with `file:///node_modules/...` URIs

- [x] ### Task 26: Implement Monaco Editor wrapper

**Spec:** `03-code-editor.md` Section 11

**Files:**

- `packages/playground/src/editor/code-editor.tsx`
- `packages/playground/src/editor/editor-config.ts` — TS language config, editor options
- `packages/playground/tests/editor/code-editor.test.tsx`

**Key details:**

- One Monaco `TextModel` per virtual file
- Switch active model on file change (preserve cursor/scroll per file)
- Register hex-light / hex-dark Monaco themes (Section 11.5)
- Map `EditorDiagnostic[]` to Monaco markers
- Keyboard shortcuts: `Ctrl+Enter` (run), `Ctrl+S` (save)
- `readOnly` mode for embed

- [x] ### Task 27: Implement File Tree sidebar and Tab Bar

**Spec:** `03-code-editor.md` Sections 14.1-14.3

**Files:**

- `packages/playground/src/editor/file-tree.tsx`
- `packages/playground/src/editor/tab-bar.tsx`
- `packages/playground/tests/editor/file-tree.test.tsx`
- `packages/playground/tests/editor/tab-bar.test.tsx`

**Key details:**

- Tree structure from VirtualFS directory grouping
- New file inline input, context menu (rename/delete)
- Tab bar with open files, close button, modified dot indicator
- Keyboard: `Ctrl+P` quick file open, `Ctrl+Tab` cycle tabs

**Tests (4):** Spec Section 44.8 items 7-10

---

## Phase 5: Layout & Console (`@hex-di/playground`)

**Depends on:** Phase 2 (panels/visualization available) + Phase 3-4 (sandbox/editor available)

- [x] ### Task 28: Implement `ResizableSplit` component

**Spec:** `05-layout-and-panels.md` Section 24

**Files:**

- `packages/playground/src/layout/resizable-split.tsx`
- `packages/playground/tests/layout/resizable-split.test.tsx`

**Key details:**

- `direction: "horizontal" | "vertical"`, `initialRatio`, `minFirst/minSecond`, `persistKey`
- Drag interaction, double-click reset, keyboard arrows (10px, Shift+50px)
- localStorage persistence

**Tests (2):** Spec Section 44.8 items 2-3

- [x] ### Task 29: Implement Console Pane

**Spec:** `05-layout-and-panels.md` Section 23

**Files:**

- `packages/playground/src/console/console-renderer.tsx` — renders `ConsoleEntry[]`
- `packages/playground/src/console/console-interceptor.ts` — captures sandbox console calls
- `packages/playground/src/layout/console-pane.tsx` — pane with toolbar, filter, auto-scroll
- `packages/playground/tests/console/console-renderer.test.tsx`
- `packages/playground/tests/console/console-interceptor.test.ts`

**Key details:**

- 5 entry types: log, compilation-error, runtime-error, timeout, status
- Level filter (log/warn/error/info/debug)
- Auto-scroll with manual scroll pause, "Jump to bottom" button
- 1000 entry limit, 10K char string truncation, depth-5 object truncation
- Clickable file references navigate to editor location

**Tests (3):** Spec Section 44.8 items 4-6

- [x] ### Task 30: Implement Visualization Pane (panel host)

**Spec:** `05-layout-and-panels.md` Section 22

**Files:**

- `packages/playground/src/layout/visualization-pane.tsx` — PanelTabBar + PanelHost
- Panel tab bar, `ErrorBoundary` per panel, empty/loading states

**Key details:**

- Tab bar matches devtools design tokens (active=accent border, inactive=no border)
- Conditional panel visibility based on data availability
- Panel state persisted to `sessionStorage`
- Before first run: empty state per panel ("Run your code to see...")
- During execution: previous data with loading overlay

- [x] ### Task 31: Implement Editor Pane

**Spec:** `05-layout-and-panels.md` Section 21

**Files:**

- `packages/playground/src/layout/editor-pane.tsx` — orchestrates file tree + tab bar + Monaco

**Key details:**

- File tree toggle, active file indicator, diagnostics summary
- Run button 10-step pipeline (Section 21.3)

- [x] ### Task 32: Implement `PlaygroundLayout` (three-pane)

**Spec:** `05-layout-and-panels.md` Section 20

**Files:**

- `packages/playground/src/layout/playground-layout.tsx`
- `packages/playground/tests/layout/playground-layout.test.tsx`

**Key details:**

- Horizontal split: editor (50%) | visualization (50%), min 300px each
- Vertical split: main (75%) | console (25%), min 200px/100px
- Layout persisted to `localStorage` key `hex-playground-layout`
- Responsive breakpoints (Section 25): >=1200px full, 800-1199px stacked, <800px single-pane tabs

**Tests (1):** Spec Section 44.8 item 1

---

## Phase 6: Examples & Sharing

- [x] ### Task 33: Implement Example Registry and Templates

**Spec:** `06-examples-and-sharing.md` Sections 26-27

**Files:**

- `packages/playground/src/examples/example-registry.ts` — `ExampleRegistry` class
- `packages/playground/src/examples/templates/basic-registration.ts`
- `packages/playground/src/examples/templates/lifetime-management.ts`
- `packages/playground/src/examples/templates/dependency-graph.ts`
- `packages/playground/src/examples/templates/scope-hierarchy.ts`
- `packages/playground/src/examples/templates/child-containers.ts`
- `packages/playground/src/examples/templates/resolution-tracing.ts`
- `packages/playground/src/examples/templates/flow-state-machine.ts`
- `packages/playground/src/examples/templates/store-state-management.ts`
- `packages/playground/src/examples/templates/query-cache-patterns.ts`
- `packages/playground/src/examples/templates/saga-orchestration.ts`
- `packages/playground/src/examples/templates/error-handling-result.ts`
- `packages/playground/src/examples/templates/multi-library-composition.ts`
- `packages/playground/tests/examples/example-registry.test.ts`
- `packages/playground/tests/examples/example-templates.test.ts`

**Key details:**

- 12 templates across 4 categories (basics, patterns, libraries, advanced)
- Each template: `id`, `title`, `description`, `category`, `files` (Map), `entryPoint`, `defaultPanel`
- Dropdown grouped by category with confirmation on unsaved changes

**Tests (5):** Spec Section 44.7

- [x] ### Task 34: Implement URL Sharing

**Spec:** `06-examples-and-sharing.md` Section 28

**Files:**

- `packages/playground/src/sharing/url-encoder.ts` — `encodeShareableState()`
- `packages/playground/src/sharing/url-decoder.ts` — `decodeShareableState()`
- `packages/playground/tests/sharing/url-encoder.test.ts`
- `packages/playground/tests/sharing/url-decoder.test.ts`
- `packages/playground/tests/sharing/roundtrip.test.ts`

**Key details:**

- Encoding: JSON → deflate (pako) → base64url → `#code/<encoded>`
- Decoding: reverse
- `#example/<id>` for example deep links
- 100KB encoded limit with warning
- Share button: update hash, copy to clipboard, toast notification

**Dependencies:** `pako` package

**Tests (10):** Spec Section 44.6

---

## Phase 7: App Shell & Embedding

- [x] ### Task 35: Implement Playground contexts and hooks

**Files:**

- `packages/playground/src/context/playground-context.tsx` — top-level playground state
- `packages/playground/src/context/sandbox-context.tsx` — sandbox lifecycle state
- `packages/playground/src/hooks/use-playground-state.ts`
- `packages/playground/src/hooks/use-sandbox.ts`
- `packages/playground/src/hooks/use-examples.ts`

- [x] ### Task 36: Implement Toolbar

**Files:**

- `packages/playground/src/layout/toolbar.tsx` — ExampleDropdown, RunButton, ShareButton, ThemeToggle, EmbedButton

**Key details:**

- Example dropdown (spec Section 26.3)
- Run button with spinner during compile/execute
- Share button with clipboard copy + toast
- Theme toggle (calls devtools-ui ThemeProvider)

- [x] ### Task 37: Implement Embed mode

**Spec:** `06-examples-and-sharing.md` Section 29

**Files:**

- `packages/playground/src/embed/embed-detector.ts` — `?embed=true` detection
- `packages/playground/src/embed/embed-mode.tsx` — compact layout
- `packages/playground/tests/embed/embed-detector.test.ts`
- `packages/playground/tests/embed/embed-mode.test.tsx`

**Key details:**

- Hidden: file tree, example dropdown, share button
- Visible: Run button, theme toggle, "Open in Playground" link
- Layout: wide (>=600px) side-by-side, narrow (<600px) tabbed
- Query params: `theme`, `panel`, `autorun`, `readonly`, `console`

**Tests (2):** Spec Section 44.8 items 11-12

- [x] ### Task 38: Implement `PlaygroundApp` root component

**Spec:** `05-layout-and-panels.md` Section 20.2

**Files:**

- `packages/playground/src/app.tsx`
- `packages/playground/src/index.ts` — public API exports

**Key details:**

- Component hierarchy: `ThemeProvider → PlaygroundProvider → SandboxProvider → DataSourceProvider → PlaygroundLayout`
- URL hash loading on mount: `#code/...`, `#example/...`, or default
- `createPlayground()` programmatic API (spec Section 30)
