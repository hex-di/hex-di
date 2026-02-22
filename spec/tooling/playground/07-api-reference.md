# 07 — API Reference

Consolidated type signatures and API documentation for the playground and devtools-ui packages.

---

## 30. Playground Public API

### 30.1 `PlaygroundApp` — Root Component

```typescript
interface PlaygroundAppProps {
  /**
   * Override the default theme. When omitted, uses system preference.
   */
  readonly theme?: "light" | "dark" | "system";

  /**
   * Pre-load an example by ID. When omitted, shows the default workspace.
   */
  readonly exampleId?: string;

  /**
   * Enable embed mode (reduced chrome, no file tree, no share button).
   */
  readonly embed?: boolean;

  /**
   * Auto-run the code on mount. Only effective with `exampleId` or URL hash code.
   */
  readonly autorun?: boolean;

  /**
   * Make the editor read-only. Users can view and run but not edit.
   */
  readonly readonly?: boolean;

  /**
   * Override the default panel shown after execution.
   */
  readonly defaultPanel?: string;

  /**
   * Override the console pane visibility.
   */
  readonly consoleVisibility?: "show" | "hide";
}

/**
 * Root component for the HexDi Playground.
 * Renders the complete playground UI including editor, panels, and console.
 *
 * Typically rendered at the application root:
 *   createRoot(document.getElementById("root")).render(<PlaygroundApp />);
 *
 * Query parameters override props when used as a standalone app.
 */
function PlaygroundApp(props: PlaygroundAppProps): React.ReactElement;
```

### 30.2 `createPlayground` — Programmatic API

```typescript
interface PlaygroundOptions {
  /**
   * DOM element to mount the playground into.
   */
  readonly container: HTMLElement;

  /**
   * Initial files for the workspace.
   */
  readonly files?: ReadonlyMap<string, string>;

  /**
   * Theme preference.
   */
  readonly theme?: "light" | "dark" | "system";

  /**
   * Enable embed mode.
   */
  readonly embed?: boolean;

  /**
   * Auto-run on mount.
   */
  readonly autorun?: boolean;

  /**
   * Read-only editor.
   */
  readonly readonly?: boolean;
}

interface PlaygroundInstance {
  /**
   * Update the workspace files programmatically.
   */
  setFiles(files: ReadonlyMap<string, string>): void;

  /**
   * Trigger code execution programmatically.
   */
  run(): Promise<void>;

  /**
   * Get the current workspace state.
   */
  getFiles(): ReadonlyMap<string, string>;

  /**
   * Unmount and clean up the playground.
   */
  destroy(): void;
}

/**
 * Create a playground instance programmatically.
 * Useful for embedding without React or for testing.
 */
function createPlayground(options: PlaygroundOptions): PlaygroundInstance;
```

---

## 31. Sandbox API

### 31.1 `SandboxManager`

```typescript
interface SandboxManager {
  /**
   * Current sandbox state.
   */
  readonly state: SandboxState;

  /**
   * Compile and execute the given files.
   * Returns the execution result.
   */
  execute(files: ReadonlyMap<string, string>, entryPoint?: string): Promise<ExecutionResult>;

  /**
   * Terminate the current execution if running.
   */
  terminate(): void;

  /**
   * Subscribe to state changes.
   */
  subscribe(listener: (state: SandboxState) => void): () => void;

  /**
   * The InspectorDataSource populated by the sandbox.
   */
  readonly bridge: PlaygroundInspectorBridge;
}

type SandboxState =
  | { readonly phase: "idle" }
  | { readonly phase: "compiling" }
  | { readonly phase: "executing" }
  | { readonly phase: "complete"; readonly result: ExecutionResult }
  | { readonly phase: "error"; readonly error: SandboxError };

interface ExecutionResult {
  readonly success: boolean;
  readonly compilationMs: number;
  readonly executionMs: number;
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly hasInspector: boolean;
}

type SandboxError =
  | { readonly type: "compilation"; readonly errors: readonly CompilationError[] }
  | { readonly type: "runtime"; readonly error: SerializedError }
  | { readonly type: "timeout"; readonly timeoutMs: number }
  | { readonly type: "crash"; readonly message: string };
```

### 31.2 `PlaygroundInspectorBridge`

```typescript
/**
 * Implements InspectorDataSource by caching data received from the Web Worker.
 * Used as the data source for all visualization panels.
 */
class PlaygroundInspectorBridge implements InspectorDataSource {
  readonly displayName: string; // "Playground Sandbox"
  readonly sourceType: "local";

  getSnapshot(): ContainerSnapshot | undefined;
  getScopeTree(): ScopeTree | undefined;
  getGraphData(): ContainerGraphData | undefined;
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;
  getAdapterInfo(): readonly AdapterInfo[] | undefined;
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;
  subscribe(listener: (event: InspectorEvent) => void): () => void;

  /**
   * Process a message from the Web Worker.
   * Called by SandboxManager, not by consumers.
   */
  handleWorkerMessage(message: WorkerToMainMessage): void;

  /**
   * Clear all cached data. Called when a new execution starts.
   */
  reset(): void;
}
```

### 31.3 Worker Protocol Types

```typescript
// Main thread → Worker
type MainToWorkerMessage =
  | { readonly type: "execute"; readonly code: string }
  | { readonly type: "request-snapshot" }
  | { readonly type: "request-scope-tree" }
  | { readonly type: "request-graph-data" }
  | { readonly type: "request-unified-snapshot" }
  | { readonly type: "request-adapter-info" }
  | { readonly type: "request-library-inspectors" }
  | { readonly type: "request-result-statistics" };

// Worker → Main thread
type WorkerToMainMessage =
  | { readonly type: "execution-complete"; readonly success: true }
  | { readonly type: "execution-error"; readonly error: SerializedError }
  | { readonly type: "no-inspector" }
  | {
      readonly type: "console";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }
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
  | {
      readonly type: "inspector-event";
      readonly event: InspectorEvent;
    }
  | { readonly type: "response-snapshot"; readonly data: ContainerSnapshot | undefined }
  | { readonly type: "response-scope-tree"; readonly data: ScopeTree | undefined }
  | { readonly type: "response-graph-data"; readonly data: ContainerGraphData | undefined }
  | { readonly type: "response-unified-snapshot"; readonly data: UnifiedSnapshot | undefined }
  | { readonly type: "response-adapter-info"; readonly data: readonly AdapterInfo[] | undefined }
  | {
      readonly type: "response-library-inspectors";
      readonly data: SerializedLibraryInspectors | undefined;
    }
  | {
      readonly type: "response-result-statistics";
      readonly data: SerializedResultStatistics | undefined;
    };

// Serialization helpers
type SerializedLibraryInspectors = readonly [string, SerializedLibraryInspector][];
type SerializedResultStatistics = readonly [string, ResultStatistics][];

interface SerializedLibraryInspector {
  readonly name: string;
  readonly snapshot: Readonly<Record<string, unknown>>;
}

interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
}

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
  readonly value: string;
  readonly preview?: unknown;
}
```

---

## 32. Editor API

### 32.1 `VirtualFS`

```typescript
interface VirtualFS {
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  fileExists(path: string): boolean;
  listFiles(): readonly string[];
  listFiles(directory: string): readonly string[];
  getAll(): ReadonlyMap<string, string>;
  setAll(files: ReadonlyMap<string, string>): void;
  subscribe(listener: (event: FSEvent) => void): () => void;
}

type FSEvent =
  | { readonly type: "file-created"; readonly path: string }
  | { readonly type: "file-updated"; readonly path: string }
  | { readonly type: "file-deleted"; readonly path: string }
  | { readonly type: "file-renamed"; readonly oldPath: string; readonly newPath: string }
  | { readonly type: "bulk-update" };
```

### 32.2 `CodeEditor` Component

```typescript
interface CodeEditorProps {
  readonly activeFile: string;
  readonly files: ReadonlyMap<string, string>;
  readonly onChange: (path: string, content: string) => void;
  readonly onSave?: (path: string) => void;
  readonly diagnostics?: readonly EditorDiagnostic[];
  readonly theme: "light" | "dark";
  readonly readOnly?: boolean;
}

interface EditorDiagnostic {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
  readonly severity: "error" | "warning" | "info" | "hint";
}
```

### 32.3 `ExampleRegistry`

```typescript
interface ExampleTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: ExampleCategory;
  readonly files: ReadonlyMap<string, string>;
  readonly entryPoint: string;
  readonly timeoutMs?: number;
  readonly defaultPanel?: string;
}

type ExampleCategory = "basics" | "patterns" | "libraries" | "advanced";

interface ExampleRegistry {
  getAll(): readonly ExampleTemplate[];
  getById(id: string): ExampleTemplate | undefined;
  getByCategory(category: ExampleCategory): readonly ExampleTemplate[];
}
```

---

## 33. Sharing API

### 33.1 URL Encoding/Decoding

```typescript
interface ShareableState {
  readonly files: ReadonlyArray<[string, string]>;
  readonly activeFile: string;
  readonly activePanel?: string;
}

/**
 * Encode workspace state into a URL hash string.
 * Returns the hash without the leading '#'.
 */
function encodeShareableState(state: ShareableState): string;

/**
 * Decode workspace state from a URL hash string.
 * Expects the hash without the leading '#'.
 * Returns undefined if the hash is not a valid playground URL.
 */
function decodeShareableState(hash: string): ShareableState | undefined;

/**
 * Check if a URL hash is a playground code hash.
 */
function isCodeHash(hash: string): boolean;

/**
 * Check if a URL hash is an example reference.
 */
function isExampleHash(hash: string): boolean;

/**
 * Extract the example ID from an example hash.
 * Returns undefined if not a valid example hash.
 */
function extractExampleId(hash: string): string | undefined;
```

---

## 34. Embedding API

### 34.1 Embed Detection

```typescript
/**
 * Detect embed mode from URL query parameters.
 */
function detectEmbedMode(): EmbedConfig | undefined;

interface EmbedConfig {
  readonly embed: true;
  readonly theme?: "light" | "dark";
  readonly panel?: string;
  readonly autorun: boolean;
  readonly readonly: boolean;
  readonly console: "show" | "hide";
}
```

### 34.2 `EmbedMode` Component

```typescript
interface EmbedModeProps {
  readonly config: EmbedConfig;
  readonly children: React.ReactNode;
}

/**
 * Wraps the playground in embed mode.
 * Applies embed-specific layout (no file tree, no share button,
 * reduced toolbar, "Open in Playground" link).
 */
function EmbedMode(props: EmbedModeProps): React.ReactElement;
```

---

## 35. `InspectorDataSource` (from `@hex-di/devtools-ui`)

Full interface definition — the central abstraction shared between DevTools and Playground.

```typescript
interface InspectorDataSource {
  /**
   * Current container snapshot, or undefined if no data available.
   */
  getSnapshot(): ContainerSnapshot | undefined;

  /**
   * Current scope tree, or undefined if no data available.
   */
  getScopeTree(): ScopeTree | undefined;

  /**
   * Current graph data for visualization, or undefined if no data available.
   */
  getGraphData(): ContainerGraphData | undefined;

  /**
   * Unified snapshot including container state and all library snapshots,
   * or undefined if no data available.
   */
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;

  /**
   * Adapter information for all registered ports,
   * or undefined if no data available.
   */
  getAdapterInfo(): readonly AdapterInfo[] | undefined;

  /**
   * All registered library inspectors,
   * or undefined if no data available.
   */
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;

  /**
   * Result statistics for all ports,
   * or undefined if no data available.
   */
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;

  /**
   * Subscribe to data changes. The listener receives InspectorEvents
   * matching the same event types defined in @hex-di/core.
   *
   * Returns an unsubscribe function.
   */
  subscribe(listener: (event: InspectorEvent) => void): () => void;

  /**
   * Human-readable name for this data source.
   * DevTools: application name (e.g., "My App").
   * Playground: "Playground Sandbox".
   */
  readonly displayName: string;

  /**
   * Discriminant indicating the transport type.
   * "remote" for WebSocket-backed sources, "local" for direct/sandbox sources.
   */
  readonly sourceType: "remote" | "local";
}
```

---

## 36. Hooks (from `@hex-di/devtools-ui`)

### Data Source Hooks

```typescript
function useDataSource(): InspectorDataSource;
function useDataSourceSnapshot(): ContainerSnapshot | undefined;
function useDataSourceScopeTree(): ScopeTree | undefined;
function useDataSourceUnifiedSnapshot(): UnifiedSnapshot | undefined;
function useDataSourceTracingSummary(): TracingSummary | undefined;
```

### Utility Hooks

```typescript
function useTableSort<T>(
  defaultColumn: keyof T,
  defaultDirection?: "asc" | "desc"
): TableSortState<T>;

function useTreeNavigation(
  rootId: string,
  getChildren: (id: string) => readonly string[],
  getParent: (id: string) => string | undefined
): TreeNavigationState;

function useAutoScroll(ref: React.RefObject<HTMLElement>): AutoScrollState;

function usePersistedState<T>(
  key: string,
  defaultValue: T,
  storage?: "local" | "session"
): [T, (value: T | ((prev: T) => T)) => void];

function useKeyboardShortcuts(shortcuts: ReadonlyMap<string, () => void>, enabled?: boolean): void;

function useResizeObserver(ref: React.RefObject<HTMLElement>): { width: number; height: number };
```

### Playground-Specific Hooks

```typescript
/**
 * Access playground state (files, active file, active panel, sandbox state).
 */
function usePlaygroundState(): PlaygroundState;

/**
 * Access sandbox lifecycle (state, execute, terminate).
 */
function useSandbox(): {
  readonly state: SandboxState;
  execute(): Promise<void>;
  terminate(): void;
};

/**
 * Access example registry.
 */
function useExamples(): {
  readonly examples: readonly ExampleTemplate[];
  loadExample(id: string): void;
};
```

---

## 37. Supporting Types

Types referenced by the public API but defined in internal modules.

### 37.1 Compilation Types

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

### 37.2 Console Types

```typescript
type ConsoleEntry =
  | {
      readonly type: "log";
      readonly level: "log" | "warn" | "error" | "info" | "debug";
      readonly args: readonly SerializedValue[];
      readonly timestamp: number;
    }
  | {
      readonly type: "compilation-error";
      readonly errors: readonly CompilationError[];
    }
  | {
      readonly type: "runtime-error";
      readonly error: SerializedError;
    }
  | {
      readonly type: "timeout";
      readonly timeoutMs: number;
    }
  | {
      readonly type: "status";
      readonly message: string;
      readonly variant: "info" | "success" | "error";
    };
```

### 37.3 Playground State Types

```typescript
interface PlaygroundState {
  readonly files: ReadonlyMap<string, string>;
  readonly activeFile: string;
  readonly activePanel: string;
  readonly openFiles: readonly string[];
  readonly sandboxState: SandboxState;
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly isEmbedMode: boolean;
}
```

### 37.4 Hook Return Types

```typescript
interface TableSortState<T> {
  readonly sortColumn: keyof T;
  readonly sortDirection: "asc" | "desc";
  setSortColumn: (column: keyof T) => void;
  toggleDirection: () => void;
  comparator: (a: T, b: T) => number;
}

interface TreeNavigationState {
  readonly focusedId: string;
  readonly expandedIds: ReadonlySet<string>;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  setFocused: (id: string) => void;
  toggleExpanded: (id: string) => void;
}

interface AutoScrollState {
  readonly isAutoScrolling: boolean;
  scrollToBottom: () => void;
}
```
