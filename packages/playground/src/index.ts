// @hex-di/playground -- Interactive browser-based playground for HexDI

// =============================================================================
// App -- Root component and programmatic API
// =============================================================================

export { PlaygroundApp, createPlayground } from "./app.js";
export type { PlaygroundAppProps, PlaygroundOptions } from "./app.js";

// =============================================================================
// Context -- Playground state provider
// =============================================================================

export { PlaygroundProvider, usePlaygroundContext } from "./context/playground-context.js";
export type {
  PlaygroundContextValue,
  PlaygroundProviderProps,
} from "./context/playground-context.js";

// =============================================================================
// Context -- Sandbox lifecycle provider
// =============================================================================

export { SandboxProvider, useSandboxContext } from "./context/sandbox-context.js";
export type {
  SandboxContextValue,
  SandboxStatus,
  SandboxProviderProps,
} from "./context/sandbox-context.js";

// =============================================================================
// Hooks
// =============================================================================

export { usePlaygroundState } from "./hooks/use-playground-state.js";
export { useSandbox } from "./hooks/use-sandbox.js";
export { useExamples } from "./hooks/use-examples.js";
export type { UseExamplesResult } from "./hooks/use-examples.js";

// =============================================================================
// Embed -- Embed mode detection and layout
// =============================================================================

export { isEmbedMode, parseEmbedOptions } from "./embed/embed-detector.js";
export type { EmbedOptions } from "./embed/embed-detector.js";
export { EmbedMode } from "./embed/embed-mode.js";
export type { EmbedModeProps } from "./embed/embed-mode.js";

// =============================================================================
// Layout -- Toolbar
// =============================================================================

export {
  Toolbar,
  ExampleDropdown,
  RunButton,
  ShareButton,
  ThemeToggle,
  EmbedButton,
} from "./layout/toolbar.js";
export type { ToolbarProps } from "./layout/toolbar.js";

// =============================================================================
// Editor -- Virtual filesystem
// =============================================================================

export { createVirtualFS } from "./editor/virtual-fs.js";
export type { VirtualFS, FSEvent, FSEventListener } from "./editor/virtual-fs.js";

// =============================================================================
// Editor -- Type definitions
// =============================================================================

export { typeDefinitions, registerTypeDefinitions } from "./editor/type-definitions.js";
export type { MonacoTypescriptLanguage, HexDiPackageName } from "./editor/type-definitions.js";

// =============================================================================
// Editor -- Code editor component
// =============================================================================

export { CodeEditor } from "./editor/code-editor.js";
export type {
  CodeEditorProps,
  EditorDiagnostic,
  MonacoNamespace,
  MonacoLoader,
  MonacoRange,
  MonacoEditorAction,
  MonacoTextEdit,
  MonacoFormattingOptions,
  MonacoCancellationToken,
  MonacoDocumentFormattingEditProvider,
  MonacoCompilerOptions,
  MonacoDiagnosticsOptions,
  MonacoTypescriptDefaults,
} from "./editor/code-editor.js";

// =============================================================================
// Editor -- Configuration
// =============================================================================

export {
  EDITOR_OPTIONS,
  HEX_LIGHT_THEME,
  HEX_DARK_THEME,
  TS_COMPILER_OPTIONS,
  MARKER_SEVERITY,
  mapSeverity,
} from "./editor/editor-config.js";
export type {
  EditorOptions,
  MonacoThemeDefinition,
  ThemeRule,
  TSCompilerOptionsConfig,
  DiagnosticSeverity,
} from "./editor/editor-config.js";

// =============================================================================
// Editor -- Monaco workers
// =============================================================================

export { configureMonacoWorkers } from "./editor/monaco-workers.js";

// =============================================================================
// Editor -- Language service configuration
// =============================================================================

export { configureLanguageService } from "./editor/language-service.js";

// =============================================================================
// Editor -- Prettier formatter
// =============================================================================

export { formatCode, registerPrettierFormatter, PRETTIER_CONFIG } from "./editor/formatter.js";

// =============================================================================
// Editor -- ESLint linter
// =============================================================================

export { PlaygroundLinter } from "./editor/linter.js";
export type {
  MainToLinterMessage,
  LinterToMainMessage,
  LintDiagnostic,
  LintRequest,
  ConfigureRequest,
  DiagnosticsResponse,
  ReadyResponse,
  ErrorResponse,
} from "./editor/linter-protocol.js";

// =============================================================================
// Editor -- File tree sidebar
// =============================================================================

export { FileTree } from "./editor/file-tree.js";
export type { FileTreeProps } from "./editor/file-tree.js";

// =============================================================================
// Editor -- Tab bar
// =============================================================================

export { TabBar } from "./editor/tab-bar.js";
export type { TabBarProps } from "./editor/tab-bar.js";

// =============================================================================
// Sandbox -- Worker protocol types
// =============================================================================

export type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  SerializedValue,
  SerializedValueType,
  SerializedError,
  CompilationResult,
  CompilationError,
  SerializedLibraryInspector,
  SerializedLibraryInspectors,
  SerializedResultStatistics,
  ConsoleEntry,
} from "./sandbox/worker-protocol.js";
export {
  serializeValue,
  serializeError,
  serializeLibraryInspectors,
  serializeResultStatistics,
  deserializeLibraryInspectors,
  deserializeResultStatistics,
} from "./sandbox/worker-protocol.js";

// =============================================================================
// Sandbox -- Compiler
// =============================================================================

export {
  compile,
  initializeCompiler,
  isCompilerInitialized,
  resetCompilerState,
  virtualFSPlugin,
} from "./sandbox/compiler.js";

// =============================================================================
// Sandbox -- Executor
// =============================================================================

export { SandboxExecutor, DEFAULT_TIMEOUT_MS } from "./sandbox/executor.js";
export type { ExecutionResult, WorkerMessageHandler, WorkerFactory } from "./sandbox/executor.js";

// =============================================================================
// Sandbox -- Container bridge
// =============================================================================

export {
  extractInspectorData,
  sendInspectorSnapshot,
  setLastCreatedInspector,
  getLastCreatedInspector,
  clearLastCreatedInspector,
} from "./sandbox/container-bridge.js";

// =============================================================================
// Sandbox -- SandboxManager (orchestrator)
// =============================================================================

export { SandboxManager } from "./sandbox/sandbox-manager.js";
export type {
  SandboxState,
  SandboxExecutionResult,
  SandboxError,
  CompileFn,
  Executor,
  SandboxStateListener,
} from "./sandbox/sandbox-manager.js";

// =============================================================================
// Adapter -- PlaygroundInspectorBridge
// =============================================================================

export { PlaygroundInspectorBridge } from "./adapter/playground-inspector-bridge.js";

// =============================================================================
// Console -- Console interceptor
// =============================================================================

export {
  createConsoleInterceptor,
  serializeConsoleArg,
  MAX_ENTRIES,
} from "./console/console-interceptor.js";
export type {
  ConsoleLevel,
  ConsoleEntryListener,
  InterceptableConsole,
} from "./console/console-interceptor.js";

// =============================================================================
// Console -- Console renderer
// =============================================================================

export { ConsoleRenderer } from "./console/console-renderer.js";
export type { ConsoleRendererProps } from "./console/console-renderer.js";

// =============================================================================
// Layout -- Resizable split
// =============================================================================

export { ResizableSplit } from "./layout/resizable-split.js";
export type { ResizableSplitProps } from "./layout/resizable-split.js";

// =============================================================================
// Layout -- Console pane
// =============================================================================

export { ConsolePane } from "./layout/console-pane.js";
export type { ConsolePaneProps } from "./layout/console-pane.js";

// =============================================================================
// Layout -- Visualization pane
// =============================================================================

export { VisualizationPane } from "./layout/visualization-pane.js";
export type { VisualizationPaneProps } from "./layout/visualization-pane.js";

// =============================================================================
// Layout -- Editor pane
// =============================================================================

export { EditorPane } from "./layout/editor-pane.js";
export type { EditorPaneProps } from "./layout/editor-pane.js";

// =============================================================================
// Layout -- Playground layout
// =============================================================================

export { PlaygroundLayout } from "./layout/playground-layout.js";
export type { PlaygroundLayoutProps } from "./layout/playground-layout.js";

// =============================================================================
// Examples -- Example registry and types
// =============================================================================

export { ExampleRegistry, exampleRegistry } from "./examples/example-registry.js";
export type {
  ExampleTemplate,
  ExampleCategory,
  ExampleRegistryInterface,
} from "./examples/types.js";

// =============================================================================
// Sharing -- URL encoder and decoder
// =============================================================================

export { encodeShareableState } from "./sharing/url-encoder.js";
export { decodeShareableState } from "./sharing/url-decoder.js";
export type {
  ShareableState,
  EncodeResult,
  EncodeSizeExceeded,
  EncodeShareableResult,
  DecodeSuccess,
  DecodeError,
  DecodeShareableResult,
} from "./sharing/types.js";
