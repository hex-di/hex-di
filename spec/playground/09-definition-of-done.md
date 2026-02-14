# 09 — Definition of Done

Test requirements and acceptance criteria for `@hex-di/devtools-ui` and `@hex-di/playground`.

---

## 43. Test Requirements for `@hex-di/devtools-ui`

### 43.1 Test File Conventions

```
packages/devtools-ui/tests/
  data/
    inspector-data-source.test.ts          # InspectorDataSource contract tests
    local-inspector-adapter.test.ts        # LocalInspectorAdapter unit tests
  panels/
    registry.test.ts                       # Panel registry logic
    overview-panel.test.tsx                 # Overview panel rendering
    container-panel.test.tsx               # Container panel rendering
    graph-panel.test.tsx                   # Graph panel rendering
    scope-tree-panel.test.tsx              # Scope tree panel rendering
    event-log-panel.test.tsx               # Event log panel rendering
    tracing-panel.test.tsx                 # Tracing panel rendering
    health-panel.test.tsx                  # Health panel rendering
  visualization/
    graph-renderer.test.tsx                # Graph layout and SVG rendering
    tree-renderer.test.tsx                 # Tree expand/collapse and keyboard nav
    timeline-renderer.test.tsx             # Timeline span rendering
    json-tree.test.tsx                     # JSON tree display
  components/
    status-badge.test.tsx                  # Badge rendering variants
    search-input.test.tsx                  # Search input filtering
    empty-state.test.tsx                   # Empty state display
    error-boundary.test.tsx                # Error isolation
  hooks/
    use-data-source-snapshot.test.ts       # Reactive snapshot hook
    use-data-source-scope-tree.test.ts     # Reactive scope tree hook
    use-table-sort.test.ts                 # Sort state management
    use-tree-navigation.test.ts            # Keyboard tree traversal
    use-auto-scroll.test.ts                # Auto-scroll behavior
    use-persisted-state.test.ts            # Storage-backed state
  theme/
    theme-provider.test.tsx                # Theme resolution and persistence
    use-theme.test.ts                      # Theme hook
    css-variables.test.ts                  # CSS custom property generation
    system-preference.test.ts              # prefers-color-scheme detection
  types/
    inspector-data-source.test-d.ts        # Type-level InspectorDataSource tests
    panel-props.test-d.ts                  # Type-level PanelProps tests
```

### 43.2 Unit Tests — Data Layer

#### DoD 40.2.1: InspectorDataSource Contract

| #   | Test                                              | Description                                                                     |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | LocalInspectorAdapter wraps InspectorAPI          | `getSnapshot()` delegates to `inspector.getSnapshot()` for all methods          |
| 2   | LocalInspectorAdapter sets sourceType             | `sourceType` is `"local"`                                                       |
| 3   | LocalInspectorAdapter forwards displayName        | `displayName` returns the constructor argument                                  |
| 4   | LocalInspectorAdapter subscribes and unsubscribes | `subscribe()` delegates to `inspector.subscribe()`, returns working unsubscribe |
| 5   | InspectorDataSource undefined returns             | When underlying data is unavailable, methods return `undefined`                 |

**Mutation testing target**: >95%

#### DoD 40.2.2: Panel Registry

| #   | Test                          | Description                                                 |
| --- | ----------------------------- | ----------------------------------------------------------- |
| 1   | Register and retrieve panels  | `register()` adds panel, `getAll()` returns it              |
| 2   | Panel ordering                | `getAll()` returns panels sorted by `order` field           |
| 3   | Duplicate panel ID            | `register()` with existing ID replaces the previous panel   |
| 4   | Unregister panel              | `unregister()` removes panel from registry                  |
| 5   | Library panel registration    | `registerFromLibrary()` adds panel tagged with library name |
| 6   | Library panel unregistration  | `unregisterLibrary()` removes all panels for that library   |
| 7   | Built-in panel initialization | Registry starts with 7 built-in panels in correct order     |

**Mutation testing target**: >95%

### 43.3 Component Tests — Panels

Each panel component receives a mock `InspectorDataSource` and verifies rendering. Tests use React Testing Library.

#### DoD 40.3.1: Panel Rendering with InspectorDataSource

For each of the 7 built-in panels, test:

| #   | Test                     | Description                                                                         |
| --- | ------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Renders with data        | Panel receives `dataSource` with populated data, renders expected content           |
| 2   | Renders empty state      | Panel receives `dataSource` where all methods return `undefined`, shows empty state |
| 3   | Reacts to data changes   | `dataSource.subscribe` fires, panel re-renders with new data                        |
| 4   | Handles theme prop       | Panel renders correctly in both `"light"` and `"dark"` themes                       |
| 5   | Error boundary isolation | Panel component throwing does not crash parent                                      |

**7 panels × 5 tests = 35 component tests**

**Mutation testing target**: >90% per panel

#### DoD 40.3.2: Graph Renderer

| #   | Test                           | Description                                          |
| --- | ------------------------------ | ---------------------------------------------------- |
| 1   | Renders nodes for each adapter | One SVG node per `VisualizableAdapter` in graph data |
| 2   | Renders edges for dependencies | Edges connect dependent nodes                        |
| 3   | Node color matches lifetime    | Singleton=indigo, Scoped=green, Transient=amber      |
| 4   | Click selects node             | `onNodeSelect` fires with port name                  |
| 5   | Empty graph                    | Shows empty state when `graphData` is undefined      |
| 6   | Fit-to-view                    | Fit button adjusts viewport to contain all nodes     |

#### DoD 40.3.3: Tree Renderer

| #   | Test                      | Description                                            |
| --- | ------------------------- | ------------------------------------------------------ |
| 1   | Renders root and children | Root node with children displayed at correct depth     |
| 2   | Expand/collapse           | Clicking chevron toggles children visibility           |
| 3   | Keyboard: Arrow Down      | Moves focus to next visible node                       |
| 4   | Keyboard: Arrow Right     | Expands collapsed node                                 |
| 5   | Keyboard: Arrow Left      | Collapses expanded node or moves to parent             |
| 6   | Selection callback        | `onSelect` fires when Enter is pressed on focused node |

#### DoD 40.3.4: Timeline Renderer

| #   | Test                             | Description                                             |
| --- | -------------------------------- | ------------------------------------------------------- |
| 1   | Renders spans as horizontal bars | Each span rendered with width proportional to duration  |
| 2   | Nested spans indented            | Child spans appear below parent with visual indentation |
| 3   | Click selects span               | `onSpanSelect` fires with span ID                       |
| 4   | Error spans colored differently  | Spans with `status: "error"` use error color            |

### 43.4 Shared UI Component Tests

| #   | Test                                    | Description                                             |
| --- | --------------------------------------- | ------------------------------------------------------- |
| 1   | StatusBadge renders lifetime variants   | Singleton, scoped, transient badges with correct colors |
| 2   | StatusBadge renders status variants     | Resolved, unresolved, error, disposed badges            |
| 3   | SearchInput filters on typing           | `onChange` fires with debounced value                   |
| 4   | SearchInput clears on escape            | Pressing Escape clears the input                        |
| 5   | EmptyState renders message              | Shows message prop text and optional icon               |
| 6   | ErrorBoundary catches render errors     | Child component throwing renders fallback               |
| 7   | ErrorBoundary passes through on success | Normal child renders without wrapping                   |
| 8   | StatCard renders label and value        | Shows numeric stat with label text                      |
| 9   | SortHeader toggles direction on click   | Click fires `onSort` with toggled direction             |
| 10  | SortHeader shows active indicator       | Active column shows sort direction arrow                |

**Mutation testing target**: >90%

### 43.5 Theme Tests

| #   | Test                            | Description                                                              |
| --- | ------------------------------- | ------------------------------------------------------------------------ |
| 1   | ThemeProvider resolves "system" | Uses `prefers-color-scheme` media query result                           |
| 2   | ThemeProvider persists choice   | Writes to localStorage on theme change                                   |
| 3   | ThemeProvider restores choice   | Reads from localStorage on mount                                         |
| 4   | useTheme returns resolved theme | Hook returns `"light"` or `"dark"`, not `"system"`                       |
| 5   | CSS variables set on wrapper    | `data-hex-devtools` and `data-hex-theme` attributes set correctly        |
| 6   | System preference change        | Theme updates when `prefers-color-scheme` changes (when set to "system") |

### 43.6 Hook Tests

| #   | Test                                      | Description                                       |
| --- | ----------------------------------------- | ------------------------------------------------- |
| 1   | useDataSourceSnapshot returns snapshot    | Returns `dataSource.getSnapshot()` value          |
| 2   | useDataSourceSnapshot reacts to events    | Re-renders when `subscribe` listener fires        |
| 3   | usePersistedState reads from storage      | Initial value comes from localStorage             |
| 4   | usePersistedState writes to storage       | Updates write to localStorage                     |
| 5   | usePersistedState falls back to default   | Missing storage key returns default value         |
| 6   | useAutoScroll scrolls on new content      | Container scrolled to bottom when new items added |
| 7   | useAutoScroll pauses on manual scroll     | Auto-scroll stops when user scrolls up            |
| 8   | useTableSort manages column and direction | Toggle direction, change column                   |

### 43.7 Type-Level Tests

```typescript
// inspector-data-source.test-d.ts
import { expectTypeOf } from "vitest";

// InspectorDataSource methods return optional values
declare const ds: InspectorDataSource;
expectTypeOf(ds.getSnapshot()).toEqualTypeOf<ContainerSnapshot | undefined>();
expectTypeOf(ds.sourceType).toEqualTypeOf<"remote" | "local">();

// LocalInspectorAdapter satisfies InspectorDataSource
declare const adapter: LocalInspectorAdapter;
expectTypeOf(adapter).toMatchTypeOf<InspectorDataSource>();
expectTypeOf(adapter.sourceType).toEqualTypeOf<"local">();

// PanelProps uses InspectorDataSource, not RemoteInspectorAPI
declare const props: PanelProps;
expectTypeOf(props.dataSource).toMatchTypeOf<InspectorDataSource>();
```

---

## 44. Test Requirements for `@hex-di/playground`

### 44.1 Test File Conventions

```
packages/playground/tests/
  editor/
    virtual-fs.test.ts                    # VirtualFS operations
    code-editor.test.tsx                   # Monaco editor wrapper
    file-tree.test.tsx                     # File tree sidebar
    tab-bar.test.tsx                       # Tab bar component
    type-definitions.test.ts              # Type definition registration
  sandbox/
    compiler.test.ts                       # esbuild-wasm compilation
    executor.test.ts                       # Web Worker lifecycle
    sandbox-manager.test.ts                # Compile + execute orchestration
    worker-protocol.test.ts                # Message serialization
    container-bridge.test.ts               # InspectorAPI extraction
  adapter/
    playground-inspector-bridge.test.ts    # InspectorDataSource implementation
  examples/
    example-registry.test.ts               # Example catalog
    example-templates.test.ts              # All templates compile and run
  sharing/
    url-encoder.test.ts                    # State → URL hash encoding
    url-decoder.test.ts                    # URL hash → state decoding
    roundtrip.test.ts                      # Encode → decode roundtrip
  console/
    console-renderer.test.tsx              # Console output display
    console-interceptor.test.ts            # Console capture
  embed/
    embed-detector.test.ts                 # Query parameter detection
    embed-mode.test.tsx                    # Embed layout
  layout/
    playground-layout.test.tsx             # Three-pane layout
    resizable-split.test.tsx               # Splitter drag behavior
  types/
    worker-protocol.test-d.ts              # Type-level protocol tests
```

### 44.2 Unit Tests — Virtual Filesystem

| #   | Test                      | Description                                                              |
| --- | ------------------------- | ------------------------------------------------------------------------ |
| 1   | Write and read file       | `writeFile("a.ts", "code")` then `readFile("a.ts")` returns `"code"`     |
| 2   | Delete file               | `deleteFile("a.ts")` then `readFile("a.ts")` returns `undefined`         |
| 3   | Rename file               | `renameFile("a.ts", "b.ts")` moves content, old path returns `undefined` |
| 4   | List files sorted         | `listFiles()` returns alphabetically sorted paths                        |
| 5   | List files in directory   | `listFiles("ports")` returns only files under `ports/`                   |
| 6   | File exists               | `fileExists("a.ts")` returns true/false correctly                        |
| 7   | Bulk set/get              | `setAll()` replaces entire FS, `getAll()` returns full snapshot          |
| 8   | Subscribe fires on write  | Listener receives `file-created` or `file-updated` event                 |
| 9   | Subscribe fires on delete | Listener receives `file-deleted` event                                   |
| 10  | Subscribe fires on rename | Listener receives `file-renamed` event                                   |
| 11  | Unsubscribe stops events  | After unsubscribe, listener no longer called                             |

**Mutation testing target**: >95%

### 44.3 Unit Tests — Compiler

| #   | Test                        | Description                                                    |
| --- | --------------------------- | -------------------------------------------------------------- |
| 1   | Compile single file         | Valid TypeScript compiles to JavaScript                        |
| 2   | Compile multi-file          | Imports between virtual files resolve correctly                |
| 3   | Externalize hex-di packages | `@hex-di/*` imports remain as external imports in output       |
| 4   | Compilation error           | Invalid TypeScript returns `success: false` with error details |
| 5   | File resolution order       | Resolves `.ts` then `.tsx` then `/index.ts`                    |
| 6   | Source maps included        | Output includes inline source maps                             |

**Mutation testing target**: >90%

### 44.4 Unit Tests — Sandbox Execution

| #   | Test                        | Description                                                   |
| --- | --------------------------- | ------------------------------------------------------------- |
| 1   | Execute and complete        | Valid code executes, returns `success: true`                  |
| 2   | Runtime error captured      | Throwing code returns error with message and stack            |
| 3   | Timeout enforcement         | Infinite loop terminated after timeout, returns timeout error |
| 4   | Console capture             | `console.log("hello")` in sandbox appears as console entry    |
| 5   | Fresh worker per execution  | Second execution does not see state from first                |
| 6   | Terminate cancels execution | `terminate()` kills running worker immediately                |

**Mutation testing target**: >90%

### 44.5 Unit Tests — PlaygroundInspectorBridge

| #   | Test                                | Description                                                        |
| --- | ----------------------------------- | ------------------------------------------------------------------ |
| 1   | Initial state is undefined          | All `get*()` methods return `undefined` before worker data arrives |
| 2   | handleInspectorData populates cache | After handling data message, `getSnapshot()` returns the data      |
| 3   | Subscribe notifies on data update   | Listener fires when `handleInspectorData` is called                |
| 4   | Reset clears all data               | After `reset()`, all methods return `undefined`                    |
| 5   | Unsubscribe stops notifications     | After unsubscribe, listener not called on next update              |
| 6   | sourceType is "local"               | `bridge.sourceType === "local"`                                    |
| 7   | displayName is correct              | `bridge.displayName === "Playground Sandbox"`                      |
| 8   | Satisfies InspectorDataSource       | Bridge passes type check as InspectorDataSource                    |
| 9   | Library inspectors deserialized     | Serialized `[string, inspector][]` reconstructed as `ReadonlyMap`  |
| 10  | Result statistics deserialized      | Serialized `[string, stats][]` reconstructed as `ReadonlyMap`      |

**Mutation testing target**: >95%

### 44.6 Unit Tests — URL Sharing

| #   | Test                               | Description                                              |
| --- | ---------------------------------- | -------------------------------------------------------- |
| 1   | Encode single file                 | Single file workspace encodes to URL hash                |
| 2   | Encode multi-file                  | Multiple files with paths encode correctly               |
| 3   | Decode single file                 | Encoded single file decodes to original content          |
| 4   | Decode multi-file                  | Encoded multi-file decodes to original paths and content |
| 5   | Roundtrip identity                 | `decode(encode(state))` equals original state            |
| 6   | Invalid hash returns undefined     | `decodeShareableState("garbage")` returns `undefined`    |
| 7   | isCodeHash detects code URLs       | `isCodeHash("code/...")` returns `true`                  |
| 8   | isExampleHash detects example URLs | `isExampleHash("example/basic")` returns `true`          |
| 9   | extractExampleId extracts ID       | `extractExampleId("example/basic")` returns `"basic"`    |
| 10  | Unicode content survives roundtrip | Files with unicode characters encode/decode correctly    |

**Mutation testing target**: >95%

### 44.7 Unit Tests — Examples

| #   | Test                              | Description                                                            |
| --- | --------------------------------- | ---------------------------------------------------------------------- |
| 1   | All examples have unique IDs      | No duplicate IDs in the registry                                       |
| 2   | All examples have required fields | Every template has id, title, description, category, files, entryPoint |
| 3   | All example entry points exist    | `entryPoint` is a key in `files` map for every example                 |
| 4   | Category coverage                 | At least one example per category                                      |
| 5   | All examples compile              | Every example template compiles successfully with esbuild              |

### 44.8 Component Tests

| #   | Test                                  | Description                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------ |
| 1   | PlaygroundLayout renders three panes  | Editor, visualization, and console panes present             |
| 2   | ResizableSplit drag resizes           | Simulated drag changes pane proportions                      |
| 3   | ResizableSplit respects min sizes     | Cannot drag below minimum pixel thresholds                   |
| 4   | Console renders log entries           | Console entries displayed with correct levels and formatting |
| 5   | Console level filter                  | Toggling level filter hides/shows entries                    |
| 6   | Console auto-scroll                   | New entries scroll container to bottom                       |
| 7   | File tree shows files                 | Virtual FS files displayed in tree structure                 |
| 8   | File tree click opens file            | Clicking file calls `onSelect` with path                     |
| 9   | Tab bar shows open files              | Open files displayed as tabs                                 |
| 10  | Tab bar close removes tab             | Close button removes file from open tabs                     |
| 11  | Embed mode hides file tree            | File tree not rendered in embed mode                         |
| 12  | Embed mode shows "Open in Playground" | Link present pointing to full playground URL                 |
| 13  | Example dropdown lists examples       | All registered examples shown grouped by category            |
| 14  | Run button triggers execution         | Click fires sandbox execute pipeline                         |

### 44.9 Type-Level Tests

```typescript
// worker-protocol.test-d.ts
import { expectTypeOf } from "vitest";

// MainToWorkerMessage is a discriminated union
declare const msg: MainToWorkerMessage;
if (msg.type === "execute") {
  expectTypeOf(msg.code).toBeString();
}

// WorkerToMainMessage is a discriminated union
declare const wmsg: WorkerToMainMessage;
if (wmsg.type === "console") {
  expectTypeOf(wmsg.level).toEqualTypeOf<"log" | "warn" | "error" | "info" | "debug">();
  expectTypeOf(wmsg.args).toMatchTypeOf<readonly SerializedValue[]>();
}

// PlaygroundInspectorBridge satisfies InspectorDataSource
declare const bridge: PlaygroundInspectorBridge;
expectTypeOf(bridge).toMatchTypeOf<InspectorDataSource>();
```

---

## 45. Integration Test Requirements

### 45.1 Compile-and-Execute Integration

| #   | Test                          | Description                                                           |
| --- | ----------------------------- | --------------------------------------------------------------------- |
| 1   | Single file compile + execute | Write TS, compile with esbuild, execute in worker, get console output |
| 2   | Multi-file compile + execute  | Multi-file workspace compiles and resolves cross-file imports         |
| 3   | Inspector data extraction     | Code that creates a container produces inspector data in the bridge   |
| 4   | Timeout terminates cleanly    | Infinite loop code terminates, playground remains usable              |
| 5   | Error recovery                | After runtime error, subsequent executions work normally              |

### 45.2 Panel Integration

| #   | Test                               | Description                                                     |
| --- | ---------------------------------- | --------------------------------------------------------------- |
| 1   | Graph panel shows dependency graph | Execute example with dependencies, graph panel renders nodes    |
| 2   | Container panel shows snapshot     | Execute example, container panel shows port information         |
| 3   | Scope panel shows scope tree       | Execute example with scopes, scope tree panel renders hierarchy |
| 4   | Panel data updates on re-run       | Modify code and re-run, panels update with new data             |

### 45.3 Sharing Integration

| #   | Test                   | Description                                                                |
| --- | ---------------------- | -------------------------------------------------------------------------- |
| 1   | Share and load URL     | Generate share URL, load in new playground instance, verify same workspace |
| 2   | Example deep link      | Load `#example/basic-registration`, verify correct example loaded          |
| 3   | Modified example share | Load example, modify code, share, load shared URL, verify modifications    |

---

## 46. Acceptance Criteria

### 46.1 Functional Acceptance

- [ ] User can open the playground in a browser and see the editor with a starter template
- [ ] User can write TypeScript code with autocomplete for all hex-di packages
- [ ] User can create, rename, and delete files in the virtual filesystem
- [ ] User can click "Run" and see console output from their code
- [ ] User can see the dependency graph panel populated after running code that creates a container
- [ ] User can switch between all 7 visualization panels
- [ ] User can select an example from the dropdown and it loads into the editor
- [ ] User can click "Share" and get a URL that reproduces their workspace
- [ ] User can open a shared URL and see the exact workspace that was shared
- [ ] User can use `?embed=true` to get a compact embeddable version
- [ ] Playground works with no backend server (static files only)
- [ ] Light and dark themes work correctly
- [ ] Code that runs longer than 5 seconds is terminated with a timeout message
- [ ] Errors (compilation and runtime) are displayed in the console pane with file/line references

### 46.2 Performance Acceptance

- [ ] Initial page load: <3 seconds on broadband (including WASM initialization)
- [ ] Compilation: <200ms for typical examples (10-50 files, <1000 lines)
- [ ] Panel rendering: <100ms for graph with up to 50 nodes
- [ ] Theme switch: <50ms visual update

### 46.3 Compatibility

- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)
- [ ] Works on screens ≥360px wide (responsive layout adapts)

### 46.4 Non-Functional

- [ ] All tests pass (`pnpm test` in both devtools-ui and playground packages)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] No `any` types in production code (test files exempt)
- [ ] No type casts in production code
- [ ] Mutation testing score >90% for critical modules (bridge, VirtualFS, URL sharing)
