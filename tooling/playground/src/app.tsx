/**
 * PlaygroundApp — Root component for the HexDi Playground.
 *
 * Component hierarchy:
 *   ThemeProvider -> PlaygroundProvider -> SandboxProvider -> DataSourceProvider ->
 *     (EmbedMode | PlaygroundLayout with Toolbar)
 *
 * On mount:
 * - Check URL hash for `#code/<encoded>` -> decode and load workspace
 * - Check URL hash for `#example/<id>` -> load example template
 * - Otherwise -> show default workspace
 *
 * @see spec/playground/05-layout-and-panels.md Section 20.2
 */

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, DataSourceProvider, getBuiltInPanels, useTheme } from "@hex-di/devtools-ui";
import { PlaygroundProvider, usePlaygroundContext } from "./context/playground-context.js";
import { SandboxProvider, useSandboxContext } from "./context/sandbox-context.js";
import { SandboxManager } from "./sandbox/sandbox-manager.js";
import { compile } from "./sandbox/compiler.js";
import { SandboxExecutor } from "./sandbox/executor.js";
import { PlaygroundInspectorBridge } from "./adapter/playground-inspector-bridge.js";
import { createVirtualFS } from "./editor/virtual-fs.js";
import type { VirtualFS } from "./editor/virtual-fs.js";
import type {
  MonacoLoader,
  MonacoDocumentFormattingEditProvider,
  MonacoCompilerOptions,
} from "./editor/code-editor.js";
import type { MonacoThemeDefinition } from "./editor/editor-config.js";
import { configureLanguageService } from "./editor/language-service.js";
import { registerPrettierFormatter } from "./editor/formatter.js";
import { PlaygroundLinter } from "./editor/linter.js";
import { configureMonacoWorkers } from "./editor/monaco-workers.js";
import { decodeShareableState } from "./sharing/url-decoder.js";
import { ExampleRegistry } from "./examples/example-registry.js";
import { useExamples } from "./hooks/use-examples.js";
import { parseEmbedOptions } from "./embed/embed-detector.js";
import type { EmbedOptions } from "./embed/embed-detector.js";
import { EmbedMode } from "./embed/embed-mode.js";
import { PlaygroundLayout } from "./layout/playground-layout.js";
import { Toolbar } from "./layout/toolbar.js";
import { EditorPane } from "./layout/editor-pane.js";
import { VisualizationPane } from "./layout/visualization-pane.js";
import { ConsolePane } from "./layout/console-pane.js";

// =============================================================================
// Types
// =============================================================================

/** Options for programmatic playground creation. */
export interface PlaygroundOptions {
  /** Theme preference. Defaults to "system". */
  readonly theme?: "light" | "dark" | "system";
  /** Initial example to load by ID. */
  readonly initialExample?: string;
  /** Initial code to load (single file). */
  readonly initialCode?: string;
  /** Whether to start in embed mode. */
  readonly embed?: boolean;
  /** Optional pre-created SandboxManager instance. */
  readonly sandboxManager?: SandboxManager;
}

// =============================================================================
// URL Hash Loading
// =============================================================================

interface HashLoadResult {
  readonly virtualFS: VirtualFS;
  readonly activeFile: string;
  readonly openFiles: readonly string[];
}

/**
 * Parse the URL hash and return the initial workspace state.
 */
function loadFromUrlHash(options?: PlaygroundOptions): HashLoadResult {
  const hash = window.location.hash.replace(/^#/, "");

  // Priority 1: Options-provided initial code
  if (options?.initialCode) {
    const vfs = createVirtualFS(new Map([["main.ts", options.initialCode]]));
    return { virtualFS: vfs, activeFile: "main.ts", openFiles: ["main.ts"] };
  }

  // Priority 2: Options-provided initial example
  if (options?.initialExample) {
    const registry = new ExampleRegistry();
    const template = registry.getById(options.initialExample);
    if (template) {
      const vfs = createVirtualFS(template.files);
      return {
        virtualFS: vfs,
        activeFile: template.entryPoint,
        openFiles: [template.entryPoint],
      };
    }
  }

  // Priority 3: URL hash #code/<encoded>
  if (hash.startsWith("code/")) {
    const result = decodeShareableState(hash);
    if (result.success) {
      const filesMap = new Map(result.state.files);
      const vfs = createVirtualFS(filesMap);
      return {
        virtualFS: vfs,
        activeFile: result.state.activeFile,
        openFiles: [result.state.activeFile],
      };
    }
  }

  // Priority 4: URL hash #example/<id>
  if (hash.startsWith("example/")) {
    const exampleId = hash.slice("example/".length);
    const registry = new ExampleRegistry();
    const template = registry.getById(exampleId);
    if (template) {
      const vfs = createVirtualFS(template.files);
      return {
        virtualFS: vfs,
        activeFile: template.entryPoint,
        openFiles: [template.entryPoint],
      };
    }
  }

  // Priority 5: Default workspace
  const vfs = createVirtualFS();
  return { virtualFS: vfs, activeFile: "main.ts", openFiles: ["main.ts"] };
}

// =============================================================================
// Linter (module-level singleton, started when Monaco loads)
// =============================================================================

const playgroundLinter = new PlaygroundLinter();

// =============================================================================
// Monaco Loader
// =============================================================================

/**
 * Load Monaco Editor via dynamic import.
 *
 * Returns a shaped adapter object that satisfies the MonacoNamespace
 * interface without type casting. The adapter handles readonly/mutable
 * mismatches between our types and Monaco's types.
 */
const loadMonaco: MonacoLoader = async () => {
  // Configure Monaco workers BEFORE importing monaco-editor.
  // Without this, the TypeScript Language Service worker won't start,
  // and hover tooltips, IntelliSense, and diagnostics will be silently disabled.
  configureMonacoWorkers();

  const monaco = await import("monaco-editor");
  const namespace = {
    editor: {
      create(element: HTMLElement, options: Record<string, unknown>) {
        return monaco.editor.create(element, options);
      },
      createModel(content: string, language: string, uri: { toString(): string }) {
        return monaco.editor.createModel(content, language, monaco.Uri.parse(uri.toString()));
      },
      setTheme(themeName: string) {
        monaco.editor.setTheme(themeName);
      },
      defineTheme(themeName: string, themeData: MonacoThemeDefinition) {
        monaco.editor.defineTheme(themeName, {
          base: themeData.base,
          inherit: themeData.inherit,
          rules: [...themeData.rules],
          colors: { ...themeData.colors },
        });
      },
      setModelMarkers(
        model: { uri: { toString(): string } },
        owner: string,
        markers: readonly {
          severity: number;
          message: string;
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        }[]
      ) {
        const realModel = monaco.editor
          .getModels()
          .find(m => m.uri.toString() === model.uri.toString());
        if (realModel) {
          monaco.editor.setModelMarkers(realModel, owner, [...markers]);
        }
      },
      getModels() {
        return monaco.editor.getModels();
      },
    },
    Uri: {
      parse(value: string) {
        return monaco.Uri.parse(value);
      },
    },
    KeyMod: {
      CtrlCmd: monaco.KeyMod.CtrlCmd,
      Shift: monaco.KeyMod.Shift,
    },
    KeyCode: {
      Enter: monaco.KeyCode.Enter,
      KeyS: monaco.KeyCode.KeyS,
      KeyF: monaco.KeyCode.KeyF,
    },
    MarkerSeverity: {
      Hint: monaco.MarkerSeverity.Hint,
      Info: monaco.MarkerSeverity.Info,
      Warning: monaco.MarkerSeverity.Warning,
      Error: monaco.MarkerSeverity.Error,
    },
    languages: {
      typescript: {
        typescriptDefaults: {
          setCompilerOptions(options: MonacoCompilerOptions) {
            // Convert readonly arrays to mutable ones for Monaco's CompilerOptions
            const mutablePaths: Record<string, string[]> | undefined = options.paths
              ? Object.fromEntries(Object.entries(options.paths).map(([k, v]) => [k, [...v]]))
              : undefined;
            const mutableOptions = {
              ...options,
              lib: options.lib ? [...options.lib] : undefined,
              paths: mutablePaths,
            };
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions(mutableOptions);
          },
          setDiagnosticsOptions(options: {
            noSemanticValidation?: boolean;
            noSyntaxValidation?: boolean;
            noSuggestionDiagnostics?: boolean;
          }) {
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(options);
          },
          setEagerModelSync(value: boolean) {
            monaco.languages.typescript.typescriptDefaults.setEagerModelSync(value);
          },
          addExtraLib(content: string, filePath?: string) {
            return monaco.languages.typescript.typescriptDefaults.addExtraLib(content, filePath);
          },
        },
      },
      registerDocumentFormattingEditProvider(
        languageId: string,
        provider: MonacoDocumentFormattingEditProvider
      ) {
        return monaco.languages.registerDocumentFormattingEditProvider(languageId, provider);
      },
    },
  };

  // Configure the TypeScript Language Service before returning
  configureLanguageService(namespace);

  // Register Prettier as the document formatter
  registerPrettierFormatter(namespace);

  // Start the ESLint linter worker
  playgroundLinter.start(namespace);

  return namespace;
};

// =============================================================================
// Sandbox Factory
// =============================================================================

/**
 * Create a real SandboxManager wired to esbuild-wasm compiler and
 * Web Worker executor.
 */
function createRealSandboxManager(): SandboxManager {
  const workerUrl = new URL("./sandbox/worker-entry.ts", import.meta.url);
  const executor = new SandboxExecutor(workerUrl.href);
  return new SandboxManager(compile, executor);
}

// =============================================================================
// Inner App (has access to all contexts)
// =============================================================================

function PlaygroundInner(props: { readonly embedOptions: EmbedOptions }): React.ReactElement {
  const { embedOptions } = props;
  const playground = usePlaygroundContext();
  const sandbox = useSandboxContext();
  const theme = useTheme();

  const [hasRun, setHasRun] = useState(false);

  const registry = useMemo(() => new ExampleRegistry(), []);

  const handleExampleLoaded = useCallback(
    (entryPoint: string) => {
      playground.setActiveFile(entryPoint);
      playground.openFile(entryPoint);
      playground.markSaved();
      sandbox.clearConsole();
    },
    [playground, sandbox]
  );

  const { loadExample } = useExamples(playground.virtualFS, handleExampleLoaded);

  // Track whether code has been run
  const handleRun = useCallback(() => {
    setHasRun(true);
    sandbox.run();
  }, [sandbox]);

  // Auto-run on mount if configured
  const autorunDone = useRef(false);
  useEffect(() => {
    if (embedOptions.autorun && !autorunDone.current) {
      autorunDone.current = true;
      const timeout = setTimeout(() => {
        setHasRun(true);
        sandbox.run();
      }, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [embedOptions.autorun, sandbox]);

  // Trigger ESLint linting on file changes
  useEffect(() => {
    const allFiles = playground.virtualFS.getAll();
    playgroundLinter.lint(allFiles, playground.activeFile);
  }, [playground.virtualFS, playground.activeFile]);

  // Subscribe to VirtualFS write events for automatic re-linting
  useEffect(() => {
    const unsubscribe = playground.virtualFS.subscribe(_event => {
      const allFiles = playground.virtualFS.getAll();
      playgroundLinter.lint(allFiles, playground.activeFile);
    });
    return unsubscribe;
  }, [playground.virtualFS, playground.activeFile]);

  // Get built-in panels
  const panels = useMemo(() => getBuiltInPanels(), []);

  // Determine editor theme from embed options or current theme
  const editorTheme = embedOptions.theme ?? theme.resolved;

  // Build pane content
  const editorContent = (
    <EditorPane
      files={playground.virtualFS.getAll()}
      activeFile={playground.activeFile}
      openFiles={playground.openFiles}
      modifiedFiles={new Set()}
      theme={editorTheme}
      readOnly={embedOptions.readonly}
      loadMonaco={loadMonaco}
      onSelectFile={playground.openFile}
      onCloseFile={playground.closeFile}
      onFileChange={(path, content) => playground.virtualFS.writeFile(path, content)}
      onRun={handleRun}
    />
  );

  const vizContent = (
    <VisualizationPane
      panels={panels}
      isExecuting={sandbox.status === "compiling" || sandbox.status === "executing"}
      hasRun={hasRun}
    />
  );

  const consoleContent = (
    <ConsolePane entries={sandbox.consoleEntries} onClear={sandbox.clearConsole} />
  );

  // Embed mode
  if (embedOptions.embed) {
    return (
      <EmbedMode
        editor={editorContent}
        visualization={vizContent}
        console={consoleContent}
        status={sandbox.status}
        onRun={handleRun}
        virtualFS={playground.virtualFS}
        activeFile={playground.activeFile}
        options={embedOptions}
      />
    );
  }

  // Full mode
  const toolbar = (
    <Toolbar
      registry={registry}
      status={sandbox.status}
      isModified={playground.isModified}
      virtualFS={playground.virtualFS}
      activeFile={playground.activeFile}
      onRun={handleRun}
      onSelectExample={loadExample}
    />
  );

  return (
    <PlaygroundLayout
      editor={editorContent}
      visualization={vizContent}
      console={consoleContent}
      toolbar={toolbar}
    />
  );
}

// =============================================================================
// PlaygroundApp
// =============================================================================

/** Props for the PlaygroundApp component. */
export interface PlaygroundAppProps {
  /** Options for configuring the playground. */
  readonly options?: PlaygroundOptions;
}

/**
 * Root PlaygroundApp component.
 *
 * Wires up the full component hierarchy:
 * ThemeProvider -> PlaygroundProvider -> SandboxProvider -> DataSourceProvider
 *
 * Handles URL hash loading on mount.
 */
export function PlaygroundApp(props: PlaygroundAppProps): React.ReactElement {
  const { options } = props;

  // Parse embed options from query params
  const embedOptions = useMemo(() => {
    const parsed = parseEmbedOptions();
    if (options?.embed !== undefined) {
      return { ...parsed, embed: options.embed };
    }
    return parsed;
  }, [options?.embed]);

  // Load initial state from URL hash or options
  // Intentionally computed once using a ref instead of useMemo with empty deps
  const initialStateRef = useRef<HashLoadResult | undefined>(undefined);
  if (initialStateRef.current === undefined) {
    initialStateRef.current = loadFromUrlHash(options);
  }
  const initialState = initialStateRef.current;

  // Determine theme preference
  const themePreference = useMemo((): "light" | "dark" | "system" => {
    if (embedOptions.theme) return embedOptions.theme;
    if (options?.theme) return options.theme;
    return "system";
  }, [embedOptions.theme, options?.theme]);

  // Create or use provided sandbox manager
  const sandboxManagerRef = useRef<SandboxManager | undefined>(undefined);
  if (sandboxManagerRef.current === undefined) {
    sandboxManagerRef.current = options?.sandboxManager ?? createRealSandboxManager();
  }
  const sandboxManager = sandboxManagerRef.current;

  return (
    <ThemeProvider theme={themePreference}>
      <PlaygroundProvider
        virtualFS={initialState.virtualFS}
        initialActiveFile={initialState.activeFile}
        initialOpenFiles={initialState.openFiles}
      >
        <SandboxProvider
          sandboxManager={sandboxManager}
          virtualFS={initialState.virtualFS}
          entryPoint={initialState.activeFile}
        >
          <DataSourceProvider dataSource={sandboxManager.bridge}>
            <PlaygroundInner embedOptions={embedOptions} />
          </DataSourceProvider>
        </SandboxProvider>
      </PlaygroundProvider>
    </ThemeProvider>
  );
}

// =============================================================================
// createPlayground — Programmatic API
// =============================================================================

/**
 * Programmatic API for rendering the playground into a DOM element.
 *
 * Uses dynamic import() for react-dom/client to avoid bundling it
 * when the playground component is used directly in an existing React tree.
 *
 * @param element - The DOM element to render into.
 * @param options - Optional configuration.
 * @returns A promise that resolves to a dispose function.
 */
export async function createPlayground(
  element: HTMLElement,
  options?: PlaygroundOptions
): Promise<() => void> {
  const ReactDOM = await import("react-dom/client");

  const root = ReactDOM.createRoot(element);
  root.render(createElement(PlaygroundApp, { options }));

  return () => {
    root.unmount();
  };
}
