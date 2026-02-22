/**
 * Monaco Editor wrapper component for the playground.
 *
 * Creates one Monaco TextModel per virtual file, switches the active model
 * on file change (preserving cursor/scroll per file), maps diagnostics to
 * Monaco markers, and registers keyboard shortcuts.
 *
 * The component accepts a `loadMonaco` prop for dependency injection,
 * making it testable without a real Monaco installation.
 *
 * @see spec/playground/03-code-editor.md Section 11
 */

import { useRef, useEffect, useCallback } from "react";
import { EDITOR_OPTIONS, HEX_LIGHT_THEME, HEX_DARK_THEME, mapSeverity } from "./editor-config.js";
import type { DiagnosticSeverity, MonacoThemeDefinition } from "./editor-config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A diagnostic to display as a Monaco marker. */
export interface EditorDiagnostic {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
}

// ---------------------------------------------------------------------------
// Monaco abstraction types
// ---------------------------------------------------------------------------

/** Minimal Monaco editor instance API. */
export interface MonacoEditorInstance {
  setModel(model: MonacoTextModel | null): void;
  getModel(): MonacoTextModel | null;
  onDidChangeModelContent(listener: () => void): MonacoDisposable;
  addCommand(keybinding: number, handler: () => void): void;
  restoreViewState(state: MonacoViewState | null): void;
  saveViewState(): MonacoViewState | null;
  dispose(): void;
  updateOptions(options: Record<string, unknown>): void;
  getAction(id: string): MonacoEditorAction | null;
  trigger(source: string, handlerId: string, payload: unknown): void;
}

/** Minimal Monaco text model. */
export interface MonacoTextModel {
  readonly uri: MonacoUri;
  getValue(): string;
  setValue(value: string): void;
  dispose(): void;
  getFullModelRange(): MonacoRange;
  getLineCount(): number;
  getLineMaxColumn(lineNumber: number): number;
}

/** Minimal Monaco URI. */
export interface MonacoUri {
  toString(): string;
  readonly path: string;
}

/** Disposable resource. */
export interface MonacoDisposable {
  dispose(): void;
}

/** Saved editor view state (cursor, scroll, etc.). */
export interface MonacoViewState {
  readonly cursorState: unknown;
  readonly viewState: unknown;
}

/** A Monaco marker (diagnostic decoration). */
export interface MonacoMarker {
  readonly severity: number;
  readonly message: string;
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

/** A range in the editor (1-based line/column). */
export interface MonacoRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

/** An editor action (retrieved via getAction). */
export interface MonacoEditorAction {
  run(): Promise<void>;
}

/** A text edit returned by a formatting provider. */
export interface MonacoTextEdit {
  readonly range: MonacoRange;
  readonly text: string;
}

/** Formatting options passed to a formatting provider. */
export interface MonacoFormattingOptions {
  readonly tabSize: number;
  readonly insertSpaces: boolean;
}

/** Cancellation token passed to formatting providers. */
export interface MonacoCancellationToken {
  readonly isCancellationRequested: boolean;
}

/** Document formatting edit provider interface. */
export interface MonacoDocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    model: MonacoTextModel,
    options: MonacoFormattingOptions,
    token: MonacoCancellationToken
  ): Promise<MonacoTextEdit[]>;
}

/** TypeScript compiler options for Monaco's TS language service. */
export interface MonacoCompilerOptions {
  readonly target?: number;
  readonly module?: number;
  readonly moduleResolution?: number;
  readonly strict?: boolean;
  readonly esModuleInterop?: boolean;
  readonly skipLibCheck?: boolean;
  readonly noEmit?: boolean;
  readonly jsx?: number;
  readonly lib?: readonly string[];
  readonly paths?: Readonly<Record<string, readonly string[]>>;
  readonly allowNonTsExtensions?: boolean;
}

/** TypeScript diagnostics options for Monaco's TS language service. */
export interface MonacoDiagnosticsOptions {
  readonly noSemanticValidation?: boolean;
  readonly noSyntaxValidation?: boolean;
  readonly noSuggestionDiagnostics?: boolean;
}

/** Monaco TypeScript defaults (for configuring the TS language service). */
export interface MonacoTypescriptDefaults {
  setCompilerOptions(options: MonacoCompilerOptions): void;
  setDiagnosticsOptions(options: MonacoDiagnosticsOptions): void;
  setEagerModelSync(value: boolean): void;
  addExtraLib(content: string, filePath?: string): MonacoDisposable;
}

/** Minimal Monaco namespace API that the CodeEditor depends on. */
export interface MonacoNamespace {
  readonly editor: {
    create(element: HTMLElement, options: Record<string, unknown>): MonacoEditorInstance;
    createModel(content: string, language: string, uri: MonacoUri): MonacoTextModel;
    setTheme(themeName: string): void;
    defineTheme(themeName: string, themeData: MonacoThemeDefinition): void;
    setModelMarkers(model: MonacoTextModel, owner: string, markers: readonly MonacoMarker[]): void;
    getModels(): MonacoTextModel[];
  };
  readonly Uri: {
    parse(value: string): MonacoUri;
  };
  readonly KeyMod: {
    readonly CtrlCmd: number;
    readonly Shift: number;
  };
  readonly KeyCode: {
    readonly Enter: number;
    readonly KeyS: number;
    readonly KeyF: number;
  };
  readonly MarkerSeverity: {
    readonly Hint: number;
    readonly Info: number;
    readonly Warning: number;
    readonly Error: number;
  };
  readonly languages: {
    readonly typescript: {
      readonly typescriptDefaults: MonacoTypescriptDefaults;
    };
    registerDocumentFormattingEditProvider(
      languageId: string,
      provider: MonacoDocumentFormattingEditProvider
    ): MonacoDisposable;
  };
}

/** Async loader that returns a MonacoNamespace. Injected for testability. */
export type MonacoLoader = () => Promise<MonacoNamespace>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the CodeEditor component. */
export interface CodeEditorProps {
  readonly activeFile: string;
  readonly files: ReadonlyMap<string, string>;
  readonly onChange: (path: string, content: string) => void;
  readonly onRun?: () => void;
  readonly onSave?: (path: string) => void;
  readonly diagnostics?: readonly EditorDiagnostic[];
  readonly theme: "light" | "dark";
  readonly readOnly?: boolean;
  /**
   * Monaco loader for dependency injection.
   * In production, pass a loader that dynamically imports "monaco-editor".
   * In tests, pass a mock loader.
   *
   * If not provided, the component renders the container div but does not
   * initialize Monaco (useful for server-side rendering).
   */
  readonly loadMonaco?: MonacoLoader;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Bitwise OR helper. Monaco key bindings use bitwise OR to combine
 * modifier keys with key codes.
 */
function bitwiseOr(a: number, b: number): number {
  return (a | b) >>> 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CodeEditor wraps Monaco Editor with multi-file support.
 *
 * It manages TextModel lifecycle, cursor/scroll state preservation,
 * theme switching, diagnostics markers, and keyboard shortcuts.
 */
export function CodeEditor(props: CodeEditorProps): React.ReactElement {
  const {
    activeFile,
    files,
    onChange,
    onRun,
    onSave,
    diagnostics,
    theme,
    readOnly = false,
    loadMonaco,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const modelsRef = useRef<Map<string, MonacoTextModel>>(new Map());
  const viewStatesRef = useRef<Map<string, MonacoViewState | null>>(new Map());
  const activeFileRef = useRef(activeFile);
  const suppressChangeRef = useRef(false);

  activeFileRef.current = activeFile;

  // -- Helpers ---------------------------------------------------------------

  const getOrCreateModel = useCallback(
    (path: string, content: string): MonacoTextModel | undefined => {
      const monaco = monacoRef.current;
      if (!monaco) return undefined;

      const existing = modelsRef.current.get(path);
      if (existing) return existing;

      const uri = monaco.Uri.parse(`file:///${path}`);
      const model = monaco.editor.createModel(content, "typescript", uri);
      modelsRef.current.set(path, model);
      return model;
    },
    []
  );

  // Stable ref for loadMonaco so the effect doesn't re-run
  const loadMonacoRef = useRef(loadMonaco);
  loadMonacoRef.current = loadMonaco;

  // Stable refs for callbacks
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const filesRef = useRef(files);
  filesRef.current = files;

  // -- Initialize editor on mount -------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    const loader = loadMonacoRef.current;
    if (!container || !loader) return;

    let disposed = false;

    void loader().then(monaco => {
      if (disposed) return;

      monacoRef.current = monaco;

      // Register themes
      monaco.editor.defineTheme("hex-light", HEX_LIGHT_THEME);
      monaco.editor.defineTheme("hex-dark", HEX_DARK_THEME);

      // Create editor
      const themeName = themeRef.current === "dark" ? "hex-dark" : "hex-light";
      const editor = monaco.editor.create(container, {
        ...EDITOR_OPTIONS,
        theme: themeName,
        readOnly: readOnlyRef.current,
      });
      editorRef.current = editor;

      // Create models for initial files
      for (const [path, content] of filesRef.current) {
        getOrCreateModel(path, content);
      }

      // Set active model
      const activeModel = modelsRef.current.get(activeFileRef.current);
      if (activeModel) {
        editor.setModel(activeModel);
      }

      // Listen for changes
      editor.onDidChangeModelContent(() => {
        if (suppressChangeRef.current) return;
        const model = editor.getModel();
        if (!model) return;
        const path = activeFileRef.current;
        onChangeRef.current(path, model.getValue());
      });

      // Register keyboard shortcuts
      const runHandler = onRunRef.current;
      if (runHandler) {
        editor.addCommand(bitwiseOr(monaco.KeyMod.CtrlCmd, monaco.KeyCode.Enter), () =>
          runHandler()
        );
      }

      const saveHandler = onSaveRef.current;
      if (saveHandler) {
        editor.addCommand(bitwiseOr(monaco.KeyMod.CtrlCmd, monaco.KeyCode.KeyS), () => {
          // Format-then-save: trigger formatting, then save
          const formatAction = editor.getAction("editor.action.formatDocument");
          if (formatAction) {
            void formatAction.run().then(() => {
              saveHandler(activeFileRef.current);
            });
          } else {
            saveHandler(activeFileRef.current);
          }
        });
      }

      // Ctrl+Shift+F: Format document
      editor.addCommand(
        bitwiseOr(bitwiseOr(monaco.KeyMod.CtrlCmd, monaco.KeyMod.Shift), monaco.KeyCode.KeyF),
        () => {
          editor.trigger("keyboard", "editor.action.formatDocument", undefined);
        }
      );
    });

    return () => {
      disposed = true;
      const editor = editorRef.current;
      if (editor) {
        editor.dispose();
        editorRef.current = null;
      }
      for (const model of modelsRef.current.values()) {
        model.dispose();
      }
      modelsRef.current.clear();
      viewStatesRef.current.clear();
      monacoRef.current = null;
    };
  }, [getOrCreateModel]);

  // -- Sync files to models --------------------------------------------------

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Create/update models for each file in the map
    for (const [path, content] of files) {
      const existing = modelsRef.current.get(path);
      if (existing) {
        if (existing.getValue() !== content) {
          suppressChangeRef.current = true;
          existing.setValue(content);
          suppressChangeRef.current = false;
        }
      } else {
        getOrCreateModel(path, content);
      }
    }

    // Remove models for files that no longer exist
    for (const [path, model] of modelsRef.current) {
      if (!files.has(path)) {
        model.dispose();
        modelsRef.current.delete(path);
        viewStatesRef.current.delete(path);
      }
    }
  }, [files, getOrCreateModel]);

  // -- Switch active file -----------------------------------------------------

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Save current view state
    const currentModel = editor.getModel();
    if (currentModel) {
      const currentPath = findPathForModel(currentModel);
      if (currentPath) {
        viewStatesRef.current.set(currentPath, editor.saveViewState());
      }
    }

    // Switch to new model
    const newModel = modelsRef.current.get(activeFile);
    if (newModel) {
      editor.setModel(newModel);
      const savedState = viewStatesRef.current.get(activeFile);
      if (savedState) {
        editor.restoreViewState(savedState);
      }
    }
  }, [activeFile]);

  // -- Theme switching --------------------------------------------------------

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(theme === "dark" ? "hex-dark" : "hex-light");
  }, [theme]);

  // -- Read-only toggle -------------------------------------------------------

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions({ readOnly });
  }, [readOnly]);

  // -- Diagnostics -> markers --------------------------------------------------

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Clear all existing markers
    for (const model of modelsRef.current.values()) {
      monaco.editor.setModelMarkers(model, "playground", []);
    }

    if (!diagnostics || diagnostics.length === 0) return;

    // Group diagnostics by file
    const grouped = new Map<string, MonacoMarker[]>();
    for (const diag of diagnostics) {
      const markers = grouped.get(diag.file) ?? [];
      markers.push({
        severity: mapSeverity(diag.severity),
        message: diag.message,
        startLineNumber: diag.line,
        startColumn: diag.column,
        endLineNumber: diag.endLine,
        endColumn: diag.endColumn,
      });
      grouped.set(diag.file, markers);
    }

    // Apply markers per model
    for (const [file, markers] of grouped) {
      const model = modelsRef.current.get(file);
      if (model) {
        monaco.editor.setModelMarkers(model, "playground", markers);
      }
    }
  }, [diagnostics]);

  // -- Helpers ---------------------------------------------------------------

  function findPathForModel(model: MonacoTextModel): string | undefined {
    for (const [path, m] of modelsRef.current) {
      if (m === model) return path;
    }
    return undefined;
  }

  return (
    <div ref={containerRef} data-testid="code-editor" style={{ width: "100%", height: "100%" }} />
  );
}
