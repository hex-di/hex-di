/**
 * Monaco Editor configuration: editor options, TypeScript compiler options,
 * and theme definitions.
 *
 * @see spec/playground/03-code-editor.md Sections 11.3-11.5
 */

// ---------------------------------------------------------------------------
// Monaco type stubs
// ---------------------------------------------------------------------------

// Minimal types needed for editor configuration without importing full monaco.
// The actual monaco types come from the `monaco-editor` package at runtime.

/** Editor construction options (subset used by the playground). */
export interface EditorOptions {
  readonly automaticLayout: boolean;
  readonly minimap: { readonly enabled: boolean };
  readonly scrollBeyondLastLine: boolean;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly tabSize: number;
  readonly insertSpaces: boolean;
  readonly renderWhitespace: "selection" | "all" | "none" | "boundary" | "trailing";
  readonly lineNumbers: "on" | "off" | "relative" | "interval";
  readonly folding: boolean;
  readonly wordWrap: "on" | "off" | "wordWrapColumn" | "bounded";
  readonly suggest: {
    readonly showKeywords: boolean;
    readonly showSnippets: boolean;
  };
  readonly quickSuggestions: {
    readonly other: boolean;
    readonly comments: boolean;
    readonly strings: boolean;
  };
  readonly bracketPairColorization: { readonly enabled: boolean };
  readonly inlineSuggest: { readonly enabled: boolean };
  readonly stickyScroll: { readonly enabled: boolean };
  readonly parameterHints: { readonly enabled: boolean };
  readonly codeLens: boolean;
  readonly formatOnPaste: boolean;
  readonly smoothScrolling: boolean;
  readonly suggestOnTriggerCharacters: boolean;
  readonly acceptSuggestionOnEnter: "on" | "off" | "smart";
}

/** Diagnostic severity levels mapped from playground to Monaco. */
export type DiagnosticSeverity = "error" | "warning" | "info" | "hint";

// ---------------------------------------------------------------------------
// Editor options
// ---------------------------------------------------------------------------

/**
 * Default Monaco editor construction options for the playground.
 */
export const EDITOR_OPTIONS: EditorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: "selection",
  lineNumbers: "on",
  folding: true,
  wordWrap: "off",
  suggest: {
    showKeywords: true,
    showSnippets: false,
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  bracketPairColorization: { enabled: true },
  inlineSuggest: { enabled: true },
  stickyScroll: { enabled: true },
  parameterHints: { enabled: true },
  codeLens: true,
  formatOnPaste: true,
  smoothScrolling: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: "on",
};

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

/** A Monaco theme rule token. */
export interface ThemeRule {
  readonly token: string;
  readonly foreground: string;
}

/** A Monaco theme definition. */
export interface MonacoThemeDefinition {
  readonly base: "vs" | "vs-dark" | "hc-black" | "hc-light";
  readonly inherit: boolean;
  readonly rules: readonly ThemeRule[];
  readonly colors: Readonly<Record<string, string>>;
}

/** Light theme aligned with devtools-ui design tokens. */
export const HEX_LIGHT_THEME: MonacoThemeDefinition = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "6366f1" },
    { token: "string", foreground: "059669" },
    { token: "number", foreground: "2563eb" },
    { token: "type", foreground: "7c3aed" },
    { token: "comment", foreground: "94a3b8" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#0f172a",
    "editorLineNumber.foreground": "#94a3b8",
    "editor.selectionBackground": "#e0e7ff",
    "editor.lineHighlightBackground": "#f8fafc",
  },
};

/** Dark theme aligned with devtools-ui design tokens. */
export const HEX_DARK_THEME: MonacoThemeDefinition = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "818cf8" },
    { token: "string", foreground: "34d399" },
    { token: "number", foreground: "60a5fa" },
    { token: "type", foreground: "a78bfa" },
    { token: "comment", foreground: "64748b" },
  ],
  colors: {
    "editor.background": "#0f172a",
    "editor.foreground": "#e2e8f0",
    "editorLineNumber.foreground": "#475569",
    "editor.selectionBackground": "#312e81",
    "editor.lineHighlightBackground": "#1e293b",
  },
};

// ---------------------------------------------------------------------------
// TypeScript compiler options
// ---------------------------------------------------------------------------

/**
 * TypeScript compiler options for the Monaco language service.
 *
 * These mirror the values from the spec, but as plain objects that
 * can be translated to Monaco enum values at runtime (since Monaco
 * enums are only available after loading the Monaco module).
 */
export interface TSCompilerOptionsConfig {
  readonly target: "ES2022";
  readonly module: "ESNext";
  readonly moduleResolution: "NodeJs";
  readonly strict: boolean;
  readonly esModuleInterop: boolean;
  readonly skipLibCheck: boolean;
  readonly noEmit: boolean;
  readonly jsx: "ReactJSX";
  readonly lib: readonly string[];
}

export const TS_COMPILER_OPTIONS: TSCompilerOptionsConfig = {
  target: "ES2022",
  module: "ESNext",
  moduleResolution: "NodeJs",
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  jsx: "ReactJSX",
  lib: ["es2022", "dom"],
};

// ---------------------------------------------------------------------------
// Severity mapping
// ---------------------------------------------------------------------------

/** Monaco MarkerSeverity numeric constants (mirrors monaco.MarkerSeverity). */
export const MARKER_SEVERITY = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
} as const;

/** Maps playground diagnostic severity to Monaco MarkerSeverity. */
export function mapSeverity(severity: DiagnosticSeverity): number {
  switch (severity) {
    case "error":
      return MARKER_SEVERITY.Error;
    case "warning":
      return MARKER_SEVERITY.Warning;
    case "info":
      return MARKER_SEVERITY.Info;
    case "hint":
      return MARKER_SEVERITY.Hint;
  }
}
