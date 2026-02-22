# 04 — Sandbox

This document specifies the compilation pipeline, Web Worker sandbox, worker protocol, and the `PlaygroundInspectorBridge` that surfaces sandbox data as an `InspectorDataSource`.

---

## 15. Compilation Pipeline

### 15.1 Overview

The compilation pipeline converts TypeScript source files into executable JavaScript using esbuild-wasm. This is separate from Monaco's TypeScript language service, which handles type checking and diagnostics. The two systems serve different purposes:

| Concern                                  | Tool                       | Timing                            |
| ---------------------------------------- | -------------------------- | --------------------------------- |
| Type checking, autocomplete, diagnostics | Monaco TS language service | Continuous (as you type)          |
| TS → JS compilation for execution        | esbuild-wasm               | On demand (when "Run" is clicked) |

### 15.2 esbuild-wasm Configuration

```typescript
import * as esbuild from "esbuild-wasm";

// Initialize once on playground load
await esbuild.initialize({
  wasmURL: "/esbuild.wasm", // Served from playground's static assets
  worker: true, // Use a Web Worker for esbuild itself
});

// Compile user code
async function compile(
  files: ReadonlyMap<string, string>,
  entryPoint: string
): Promise<CompilationResult> {
  const result = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true, // Resolve cross-file imports
    write: false, // Return output as string, don't write to FS
    format: "esm", // ES module output
    target: "es2022",
    platform: "browser",
    sourcemap: "inline", // For stack trace mapping
    loader: {
      ".ts": "ts",
      ".tsx": "tsx",
    },
    // Virtual filesystem plugin (see 15.3)
    plugins: [virtualFSPlugin(files)],
    // Externalize hex-di packages (pre-bundled in worker)
    external: [
      "@hex-di/core",
      "@hex-di/graph",
      "@hex-di/runtime",
      "@hex-di/result",
      "@hex-di/flow",
      "@hex-di/store",
      "@hex-di/query",
      "@hex-di/saga",
      "@hex-di/tracing",
      "@hex-di/logger",
    ],
  });

  if (result.errors.length > 0) {
    return {
      success: false,
      errors: result.errors.map(mapEsbuildError),
      code: undefined,
    };
  }

  return {
    success: true,
    errors: [],
    code: result.outputFiles[0].text,
  };
}
```

### 15.3 Virtual Filesystem Plugin

esbuild needs to resolve imports between files in the virtual filesystem. A plugin provides this:

```typescript
function virtualFSPlugin(files: ReadonlyMap<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      // Resolve bare specifier imports to virtual files
      build.onResolve({ filter: /^\./ }, args => {
        const resolved = resolveRelativePath(args.importer, args.path);
        // Try exact match, then with .ts, then with .tsx, then /index.ts
        const candidates = [resolved, `${resolved}.ts`, `${resolved}.tsx`, `${resolved}/index.ts`];
        for (const candidate of candidates) {
          if (files.has(candidate)) {
            return { path: candidate, namespace: "virtual" };
          }
        }
        return { errors: [{ text: `Cannot resolve "${args.path}" from "${args.importer}"` }] };
      });

      // Load virtual file contents
      build.onLoad({ filter: /.*/, namespace: "virtual" }, args => {
        const content = files.get(args.path);
        if (content === undefined) {
          return { errors: [{ text: `File not found: ${args.path}` }] };
        }
        const loader = args.path.endsWith(".tsx") ? "tsx" : "ts";
        return { contents: content, loader };
      });

      // Entry point resolution
      build.onResolve({ filter: /^[^.]/ }, args => {
        if (files.has(args.path)) {
          return { path: args.path, namespace: "virtual" };
        }
        // Let esbuild handle external packages
        return undefined;
      });
    },
  };
}
```

### 15.4 Compilation Result

```typescript
interface CompilationResult {
  readonly success: boolean;
  readonly errors: readonly CompilationError[];
  readonly code: string | undefined; // Bundled JS when success is true
}

interface CompilationError {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}
```

On compilation failure, errors are displayed in the console pane and mapped back to Monaco editor markers. On success, the compiled JavaScript is sent to the Web Worker for execution.

### 15.5 Performance

esbuild-wasm compiles TypeScript at near-native speed even in the browser:

- **Cold start**: ~100ms (WASM initialization, one-time)
- **Compilation**: ~50ms for typical playground examples (10-50 files, <1000 lines total)
- **Bundle**: The `bundle: true` flag resolves all cross-file imports into a single output, so the worker receives one JS string to execute

---

## 16. Web Worker Sandbox

### 16.1 Isolation Model

User code executes in a dedicated Web Worker. This provides:

- **Separate JavaScript context**: User code cannot access the main thread's DOM, React state, or global variables
- **No DOM access**: Workers have no `document`, `window` (as main window), or DOM APIs
- **No storage access**: No `localStorage`, `sessionStorage`, or `indexedDB` from user code
- **No network access**: `fetch` is available in Workers but can be restricted. v1 does not restrict it.
- **Terminable**: The main thread can terminate the Worker at any time (timeout enforcement)

### 16.2 Worker Lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   IDLE      │────→│  COMPILING   │────→│  EXECUTING   │
│             │     │              │     │              │
│  Waiting    │     │  esbuild     │     │  Worker runs │
│  for "Run"  │     │  compiles TS │     │  user code   │
└─────────────┘     └──────────────┘     └──────────────┘
       ↑                   │                    │
       │                   │ error              │ done / timeout / error
       │                   ▼                    ▼
       │            ┌──────────────┐     ┌──────────────┐
       └────────────│    ERROR     │     │   COMPLETE   │
       │            │              │     │              │
       │            │  Show errors │     │  Show results│
       │            └──────────────┘     └──────────────┘
       │                                       │
       └───────────────────────────────────────┘
```

Each "Run" creates a fresh Worker. The previous Worker (if any) is terminated before the new one starts. This ensures a clean slate — no leftover state from previous executions.

### 16.3 Worker Entry Point

The worker entry point (`worker-entry.ts`) is a bundled script that includes:

1. All hex-di packages (pre-bundled at build time)
2. A module resolver that maps `@hex-di/*` imports to the pre-bundled packages
3. Console interception (captures `console.log/warn/error` and forwards to main thread)
4. InspectorAPI extraction logic
5. Message handler for the worker protocol

```typescript
// worker-entry.ts (conceptual structure)

// Pre-bundled hex-di packages (available as imports)
import * as hexDiCore from "@hex-di/core";
import * as hexDiGraph from "@hex-di/graph";
import * as hexDiRuntime from "@hex-di/runtime";
// ... all packages

// Module registry for user code imports
const moduleRegistry = new Map<string, unknown>([
  ["@hex-di/core", hexDiCore],
  ["@hex-di/graph", hexDiGraph],
  ["@hex-di/runtime", hexDiRuntime],
  // ... all packages
]);

// Console interception
const originalConsole = { ...console };
globalThis.console = {
  log: (...args: readonly unknown[]) => {
    originalConsole.log(...args);
    postMessage({ type: "console", level: "log", args: serializeArgs(args) });
  },
  warn: (...args: readonly unknown[]) => {
    originalConsole.warn(...args);
    postMessage({ type: "console", level: "warn", args: serializeArgs(args) });
  },
  error: (...args: readonly unknown[]) => {
    originalConsole.error(...args);
    postMessage({ type: "console", level: "error", args: serializeArgs(args) });
  },
  // info, debug, trace — same pattern
};

// Message handler
self.addEventListener("message", async event => {
  const message = event.data;

  switch (message.type) {
    case "execute": {
      await executeUserCode(message.code);
      break;
    }
    case "request-snapshot": {
      // Respond with current inspector data
      break;
    }
  }
});
```

### 16.4 User Code Execution

```typescript
async function executeUserCode(code: string): Promise<void> {
  try {
    // Create a module from the compiled code
    // esbuild output uses ESM with externalized @hex-di/* imports
    // We need to resolve those imports to our pre-bundled packages
    const moduleCode = rewriteImports(code, moduleRegistry);

    // Execute via dynamic import of a Blob URL
    const blob = new Blob([moduleCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);

    try {
      const module = await import(url);

      // After execution, extract InspectorAPI if available
      extractInspectorData(module);

      postMessage({ type: "execution-complete", success: true });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    postMessage({
      type: "execution-error",
      error: serializeError(error),
    });
  }
}
```

### 16.5 InspectorAPI Extraction

After user code executes, the worker needs to find the `InspectorAPI` instance to send inspection data back to the main thread. The extraction strategy:

1. **Explicit export**: If the user code exports an `inspector` or `container` value, use that
2. **Runtime hook**: The pre-bundled `@hex-di/runtime` is instrumented to track container creation. The last container created is used as the inspection target.
3. **No container**: If no container was created, panels show empty state

```typescript
function extractInspectorData(module: Record<string, unknown>): void {
  // Strategy 1: Explicit export
  let inspector: InspectorAPI | undefined;

  if ("inspector" in module && isInspectorAPI(module.inspector)) {
    inspector = module.inspector;
  } else if ("container" in module && hasInspector(module.container)) {
    inspector = getInspector(module.container);
  }

  // Strategy 2: Runtime hook (last created container)
  if (inspector === undefined) {
    inspector = getLastCreatedInspector();
  }

  if (inspector === undefined) {
    postMessage({ type: "no-inspector" });
    return;
  }

  // Send initial data
  sendInspectorSnapshot(inspector);

  // Subscribe to changes
  inspector.subscribe(event => {
    postMessage({ type: "inspector-event", event: serializeEvent(event) });
    // Re-send affected data
    sendInspectorSnapshot(inspector);
  });
}

function sendInspectorSnapshot(inspector: InspectorAPI): void {
  postMessage({
    type: "inspector-data",
    snapshot: inspector.getSnapshot(),
    scopeTree: inspector.getScopeTree(),
    graphData: inspector.getGraphData(),
    unifiedSnapshot: inspector.getUnifiedSnapshot(),
    adapterInfo: inspector.getAdapterInfo(),
    libraryInspectors: serializeLibraryInspectors(inspector.getLibraryInspectors()),
    resultStatistics: serializeResultStatistics(inspector.getAllResultStatistics()),
  });
}
```

### 16.6 Timeout Enforcement

```typescript
class SandboxExecutor {
  private worker: Worker | undefined;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  async execute(code: string, timeoutMs: number = 5000): Promise<ExecutionResult> {
    // Terminate any existing worker
    this.terminate();

    return new Promise(resolve => {
      this.worker = new Worker(workerEntryUrl);

      // Set timeout
      this.timeoutId = setTimeout(() => {
        this.terminate();
        resolve({
          success: false,
          error: {
            type: "timeout",
            message: `Execution timed out after ${timeoutMs}ms`,
          },
        });
      }, timeoutMs);

      // Handle messages from worker
      this.worker.addEventListener("message", event => {
        const message = event.data;
        // ... handle messages, clear timeout on completion
      });

      // Send code to worker
      this.worker.postMessage({ type: "execute", code });
    });
  }

  terminate(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    if (this.worker !== undefined) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }
}
```

---

## 17. Worker Protocol

### 17.1 Message Types

All messages between the main thread and worker are plain objects sent via `postMessage`. They use the structured clone algorithm, so Map, Set, and other transferable types work.

#### Main Thread → Worker

```typescript
type MainToWorkerMessage =
  | { readonly type: "execute"; readonly code: string }
  | { readonly type: "request-snapshot" }
  | { readonly type: "request-scope-tree" }
  | { readonly type: "request-graph-data" }
  | { readonly type: "request-unified-snapshot" }
  | { readonly type: "request-adapter-info" }
  | { readonly type: "request-library-inspectors" }
  | { readonly type: "request-result-statistics" };
```

#### Worker → Main Thread

```typescript
type WorkerToMainMessage =
  // Execution lifecycle
  | { readonly type: "execution-complete"; readonly success: true }
  | { readonly type: "execution-error"; readonly error: SerializedError }
  | { readonly type: "no-inspector" }

  // Console output
  | {
      readonly type: "console";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }

  // Inspector data (push — sent after execution and on each event)
  | {
      readonly type: "inspector-data";
      readonly snapshot: ContainerSnapshot;
      readonly scopeTree: ScopeTree;
      readonly graphData: ContainerGraphData;
      readonly unifiedSnapshot: UnifiedSnapshot;
      readonly adapterInfo: readonly AdapterInfo[];
      readonly libraryInspectors: SerializedLibraryInspectors;
      readonly resultStatistics: SerializedResultStatistics;
    }

  // Inspector events (push — forwarded from InspectorAPI subscription)
  | {
      readonly type: "inspector-event";
      readonly event: InspectorEvent;
    }

  // Response to pull requests
  | {
      readonly type: "response-snapshot";
      readonly data: ContainerSnapshot | undefined;
    }
  | {
      readonly type: "response-scope-tree";
      readonly data: ScopeTree | undefined;
    }
  | {
      readonly type: "response-graph-data";
      readonly data: ContainerGraphData | undefined;
    }
  | {
      readonly type: "response-unified-snapshot";
      readonly data: UnifiedSnapshot | undefined;
    }
  | {
      readonly type: "response-adapter-info";
      readonly data: readonly AdapterInfo[] | undefined;
    }
  | {
      readonly type: "response-library-inspectors";
      readonly data: SerializedLibraryInspectors | undefined;
    }
  | {
      readonly type: "response-result-statistics";
      readonly data: SerializedResultStatistics | undefined;
    };
```

### 17.2 Serialization

Most inspector data types are plain objects and arrays that survive structured clone without transformation. Two types require special handling:

**`ReadonlyMap` serialization**: Maps are converted to arrays of `[key, value]` tuples for transport, then reconstructed on the main thread.

```typescript
// Serialization types
type SerializedLibraryInspectors = readonly [string, SerializedLibraryInspector][];
type SerializedResultStatistics = readonly [string, ResultStatistics][];

interface SerializedLibraryInspector {
  readonly name: string;
  readonly snapshot: Readonly<Record<string, unknown>>;
}

// Serialize in worker
function serializeLibraryInspectors(
  inspectors: ReadonlyMap<string, LibraryInspector>
): SerializedLibraryInspectors {
  return [...inspectors.entries()].map(([name, inspector]) => [
    name,
    { name: inspector.name, snapshot: inspector.getSnapshot() },
  ]);
}

// Deserialize on main thread
function deserializeLibraryInspectors(
  data: SerializedLibraryInspectors
): ReadonlyMap<string, LibraryInspector> {
  return new Map(
    data.map(([name, serialized]) => [
      name,
      {
        name: serialized.name,
        getSnapshot: () => serialized.snapshot,
      },
    ])
  );
}
```

**Console argument serialization**: Console arguments can be any type. Non-cloneable values (functions, symbols, circular references) are converted to string representations.

```typescript
interface SerializedValue {
  readonly type:
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "undefined"
    | "object"
    | "array"
    | "error"
    | "function"
    | "symbol";
  readonly value: string; // String representation for display
  readonly preview?: unknown; // Structured clone-safe preview (for objects/arrays)
}
```

### 17.3 Data Flow Pattern

The worker protocol uses a **push-primary** model:

1. **Push**: After execution, the worker proactively sends the full `inspector-data` message. On each `InspectorEvent`, it pushes an updated `inspector-data`. This covers the common case where panels just need the latest state.

2. **Pull**: The main thread can send `request-*` messages to explicitly request specific data. This is used for lazy panels that only need data when activated.

The push-primary model means panels typically have data immediately after execution, without waiting for a request-response round trip.

---

## 18. `PlaygroundInspectorBridge`

### 18.1 Role

`PlaygroundInspectorBridge` sits on the main thread and implements `InspectorDataSource`. It maintains a cache of the latest data received from the Web Worker and notifies subscribers when data changes.

### 18.2 Implementation

```typescript
class PlaygroundInspectorBridge implements InspectorDataSource {
  readonly displayName = "Playground Sandbox";
  readonly sourceType = "local" as const;

  private snapshot: ContainerSnapshot | undefined;
  private scopeTree: ScopeTree | undefined;
  private graphData: ContainerGraphData | undefined;
  private unifiedSnapshot: UnifiedSnapshot | undefined;
  private adapterInfo: readonly AdapterInfo[] | undefined;
  private libraryInspectors: ReadonlyMap<string, LibraryInspector> | undefined;
  private resultStatistics: ReadonlyMap<string, ResultStatistics> | undefined;
  private readonly listeners = new Set<(event: InspectorEvent) => void>();

  // Pull-based queries — return cached data
  getSnapshot(): ContainerSnapshot | undefined {
    return this.snapshot;
  }

  getScopeTree(): ScopeTree | undefined {
    return this.scopeTree;
  }

  getGraphData(): ContainerGraphData | undefined {
    return this.graphData;
  }

  getUnifiedSnapshot(): UnifiedSnapshot | undefined {
    return this.unifiedSnapshot;
  }

  getAdapterInfo(): readonly AdapterInfo[] | undefined {
    return this.adapterInfo;
  }

  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined {
    return this.libraryInspectors;
  }

  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined {
    return this.resultStatistics;
  }

  // Push-based subscription
  subscribe(listener: (event: InspectorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Called by SandboxManager when worker messages arrive
  handleInspectorData(data: InspectorDataMessage): void {
    this.snapshot = data.snapshot;
    this.scopeTree = data.scopeTree;
    this.graphData = data.graphData;
    this.unifiedSnapshot = data.unifiedSnapshot;
    this.adapterInfo = data.adapterInfo;
    this.libraryInspectors = deserializeLibraryInspectors(data.libraryInspectors);
    this.resultStatistics = deserializeResultStatistics(data.resultStatistics);

    // Notify all subscribers with a synthetic event
    this.notify({ type: "snapshot-changed" });
  }

  handleInspectorEvent(event: InspectorEvent): void {
    this.notify(event);
  }

  // Reset when a new execution starts
  reset(): void {
    this.snapshot = undefined;
    this.scopeTree = undefined;
    this.graphData = undefined;
    this.unifiedSnapshot = undefined;
    this.adapterInfo = undefined;
    this.libraryInspectors = undefined;
    this.resultStatistics = undefined;
    this.notify({ type: "snapshot-changed" });
  }

  private notify(event: InspectorEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
```

### 18.3 Integration with Panels

The bridge is wrapped in a `DataSourceProvider` (from `devtools-ui`), making it available to all panel hooks:

```tsx
function PlaygroundVisualization() {
  const bridge = usePlaygroundBridge();

  return (
    <DataSourceProvider dataSource={bridge}>
      <ThemeProvider>
        <PanelHost />
      </ThemeProvider>
    </DataSourceProvider>
  );
}
```

Panels beneath `DataSourceProvider` use `useDataSourceSnapshot()`, `useDataSourceScopeTree()`, etc. — the same hooks used by DevTools panels. They are unaware that data comes from a Web Worker rather than a WebSocket.

---

## 19. Execution Safety

### 19.1 Isolation Guarantees

| Threat                   | Mitigation                                           |
| ------------------------ | ---------------------------------------------------- |
| Infinite loop            | 5-second timeout, `worker.terminate()`               |
| Memory exhaustion        | Worker has its own heap; termination reclaims memory |
| DOM manipulation         | Workers have no DOM access                           |
| Storage access           | Workers have no `localStorage` or `sessionStorage`   |
| Main thread blocking     | Worker runs in separate thread, cannot block UI      |
| Cross-origin attacks     | Blob URLs are same-origin, no cross-origin access    |
| Previous execution state | Fresh Worker per execution, no state carryover       |

### 19.2 Timeout Configuration

The default timeout is 5 seconds. Examples can override this via metadata:

```typescript
interface ExampleTemplate {
  // ...
  readonly timeoutMs?: number; // Default: 5000
}
```

The timeout is enforced on the main thread via `setTimeout`. When the timeout fires, the Worker is terminated immediately — there is no graceful shutdown. Any pending console output or inspector data is lost.

### 19.3 Console Interception

Console output from user code is captured in the Worker and forwarded to the main thread:

1. Worker replaces `console.log/warn/error/info/debug` with instrumented versions
2. Each call serializes arguments and sends a `console` message to main thread
3. Main thread appends the message to the console output buffer
4. The console pane renders the buffer (see [05 — Layout and Panels](./05-layout-and-panels.md))

Serialization handles non-cloneable values gracefully:

- Functions → `"[Function: name]"`
- Symbols → `"Symbol(description)"`
- Circular references → `"[Circular]"`
- Errors → `{ name, message, stack }` extracted
- DOM elements → `"[HTMLElement]"` (shouldn't appear in Worker, but defensive)

### 19.4 Error Handling

Errors during execution are categorized:

| Error Type        | Source                        | Display                                           |
| ----------------- | ----------------------------- | ------------------------------------------------- |
| Compilation error | esbuild-wasm                  | Console pane + editor markers                     |
| Runtime error     | User code throws              | Console pane (red, with stack trace)              |
| Timeout           | Main thread timer             | Console pane ("Execution timed out after 5000ms") |
| Worker crash      | Unexpected worker termination | Console pane ("Sandbox crashed unexpectedly")     |

Stack traces from runtime errors include source maps (from esbuild's `sourcemap: "inline"`), mapped back to the original TypeScript file and line numbers.
