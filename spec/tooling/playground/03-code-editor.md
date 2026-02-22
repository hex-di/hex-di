# 03 — Code Editor

This document specifies the code editing experience in the playground: Monaco Editor integration, TypeScript language service configuration, multi-file virtual filesystem, and file tree sidebar.

---

## 11. Monaco Editor Integration

### 11.1 Why Monaco

Monaco Editor is the editor component that powers VS Code. It provides:

- Full TypeScript language service (autocomplete, type checking, go-to-definition, hover info)
- Syntax highlighting for TypeScript/JavaScript
- Multi-file model support (one model per virtual file)
- Inline diagnostics (red squiggles, error markers)
- Keyboard shortcuts familiar to VS Code users
- Lightweight enough for browser embedding (~2MB gzipped)

No other browser-based editor provides the same depth of TypeScript integration. CodeMirror and Ace lack built-in TypeScript language services.

### 11.2 Editor Component

```typescript
interface CodeEditorProps {
  readonly activeFile: string; // Current file path, e.g. "main.ts"
  readonly files: ReadonlyMap<string, string>; // path → content
  readonly onChange: (path: string, content: string) => void;
  readonly onSave?: (path: string) => void; // Ctrl+S handler
  readonly diagnostics?: readonly EditorDiagnostic[];
  readonly theme: "light" | "dark";
  readonly readOnly?: boolean; // For embed mode
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

The `CodeEditor` component:

1. Creates a Monaco editor instance on mount
2. Creates one Monaco `TextModel` per file in the virtual filesystem
3. Switches the active model when `activeFile` changes (preserving cursor/scroll per file)
4. Calls `onChange` on every edit (debounced for performance, immediate for model)
5. Configures the TypeScript language service with bundled `.d.ts` files
6. Maps `diagnostics` to Monaco marker decorations

### 11.3 Editor Configuration

```typescript
// Monaco editor options
const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true, // Resize with container
  minimap: { enabled: false }, // No minimap (saves space)
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
};
```

### 11.4 TypeScript Language Service Configuration

```typescript
// TypeScript compiler options for the language service
const tsCompilerOptions: monaco.languages.typescript.CompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ES2022,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true, // Monaco TS is for checking only, not compilation
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  lib: ["es2022", "dom"], // DOM types not useful in Worker, but helpful for autocomplete
  paths: {
    "@hex-di/core": ["./hex-di-core.d.ts"],
    "@hex-di/graph": ["./hex-di-graph.d.ts"],
    "@hex-di/runtime": ["./hex-di-runtime.d.ts"],
    "@hex-di/result": ["./hex-di-result.d.ts"],
    "@hex-di/flow": ["./hex-di-flow.d.ts"],
    "@hex-di/store": ["./hex-di-store.d.ts"],
    "@hex-di/query": ["./hex-di-query.d.ts"],
    "@hex-di/saga": ["./hex-di-saga.d.ts"],
    "@hex-di/tracing": ["./hex-di-tracing.d.ts"],
    "@hex-di/logger": ["./hex-di-logger.d.ts"],
  },
};
```

### 11.5 Theme Integration

Monaco has its own theme system, separate from CSS custom properties. The playground registers two Monaco themes that align with the devtools-ui design tokens:

```typescript
// Light theme registration
monaco.editor.defineTheme("hex-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "6366f1" }, // accent/indigo
    { token: "string", foreground: "059669" }, // green
    { token: "number", foreground: "2563eb" }, // blue
    { token: "type", foreground: "7c3aed" }, // purple
    { token: "comment", foreground: "94a3b8" }, // muted
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#0f172a",
    "editorLineNumber.foreground": "#94a3b8",
    "editor.selectionBackground": "#e0e7ff",
    "editor.lineHighlightBackground": "#f8fafc",
  },
});

// Dark theme registration
monaco.editor.defineTheme("hex-dark", {
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
});
```

Theme switches when the playground's `ThemeProvider` resolves a new theme value. The `CodeEditor` component observes the resolved theme and calls `monaco.editor.setTheme()`.

### 11.6 Keyboard Shortcuts

The editor inherits all standard Monaco/VS Code shortcuts. The playground adds:

| Shortcut                       | Action                                          |
| ------------------------------ | ----------------------------------------------- |
| `Ctrl+Enter` / `Cmd+Enter`     | Run code (compile + execute)                    |
| `Ctrl+S` / `Cmd+S`             | Save (triggers `onSave`, no actual file system) |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Format document (Prettier via Monaco)           |

These are registered as Monaco key bindings to avoid conflict with Monaco's own shortcuts.

---

## 12. Type Definition Bundling

### 12.1 Strategy

The playground must provide TypeScript type information for all hex-di packages so that Monaco's language service can offer autocomplete, type checking, and hover documentation. The type definitions are `.d.ts` files extracted at build time from each package.

**Build-time extraction process:**

1. Each hex-di package already generates `.d.ts` files as part of its build (via `tsc --declaration`)
2. A playground build script collects the public `.d.ts` files for each package
3. The script bundles them into string constants embedded in `type-definitions.ts`
4. At runtime, these strings are registered with Monaco's TypeScript language service via `addExtraLib()`

### 12.2 Packages Included

| Package           | Import Path       | Description                                     |
| ----------------- | ----------------- | ----------------------------------------------- |
| `@hex-di/core`    | `@hex-di/core`    | Ports, adapters, inspection types, result types |
| `@hex-di/graph`   | `@hex-di/graph`   | Graph builder, type-level port computation      |
| `@hex-di/runtime` | `@hex-di/runtime` | Container factory, resolution, scopes           |
| `@hex-di/result`  | `@hex-di/result`  | Result/ResultAsync types                        |
| `@hex-di/flow`    | `@hex-di/flow`    | State machine activities                        |
| `@hex-di/store`   | `@hex-di/store`   | State management ports                          |
| `@hex-di/query`   | `@hex-di/query`   | Query/mutation ports                            |
| `@hex-di/saga`    | `@hex-di/saga`    | Saga orchestration                              |
| `@hex-di/tracing` | `@hex-di/tracing` | Tracing spans and context                       |
| `@hex-di/logger`  | `@hex-di/logger`  | Structured logging                              |

### 12.3 Registration

```typescript
// type-definitions.ts (generated at build time)
export const typeDefinitions: ReadonlyMap<string, string> = new Map([
  ["@hex-di/core", `declare module "@hex-di/core" { ... }`],
  ["@hex-di/graph", `declare module "@hex-di/graph" { ... }`],
  ["@hex-di/runtime", `declare module "@hex-di/runtime" { ... }`],
  // ... all packages
]);

// Registration at editor initialization
function registerTypeDefinitions(ts: typeof monaco.languages.typescript): void {
  for (const [packageName, dts] of typeDefinitions) {
    const filePath = `file:///node_modules/${packageName}/index.d.ts`;
    ts.typescriptDefaults.addExtraLib(dts, filePath);
  }
}
```

### 12.4 Version Synchronization

The bundled `.d.ts` files must match the hex-di package versions bundled in the Web Worker sandbox. Both are extracted from the same monorepo build, ensuring consistency. The playground's `package.json` pins exact workspace versions for all hex-di dependencies.

---

## 13. Multi-File Virtual Filesystem

### 13.1 Motivation

Real HexDi applications use multiple files: port definitions, adapter implementations, graph composition, and application entry points. The playground supports multi-file editing to demonstrate realistic patterns.

### 13.2 VirtualFS Interface

```typescript
interface VirtualFS {
  // File operations
  readFile(path: string): string | undefined;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;
  renameFile(oldPath: string, newPath: string): void;
  fileExists(path: string): boolean;

  // Directory operations
  listFiles(): readonly string[]; // All file paths, sorted
  listFiles(directory: string): readonly string[]; // Files under a directory

  // Bulk operations
  getAll(): ReadonlyMap<string, string>; // path → content snapshot
  setAll(files: ReadonlyMap<string, string>): void; // Replace entire FS

  // Change notification
  subscribe(listener: (event: FSEvent) => void): () => void;
}

type FSEvent =
  | { readonly type: "file-created"; readonly path: string }
  | { readonly type: "file-updated"; readonly path: string }
  | { readonly type: "file-deleted"; readonly path: string }
  | { readonly type: "file-renamed"; readonly oldPath: string; readonly newPath: string }
  | { readonly type: "bulk-update" };
```

### 13.3 File Path Conventions

- Paths are relative with no leading slash: `main.ts`, `ports/logger.ts`
- Forward slashes only (no backslash)
- `.ts` and `.tsx` extensions supported
- No nested directories deeper than 3 levels (UI constraint, not technical)
- The entry point is always `main.ts` — this is the file that the sandbox executes

### 13.4 Default Workspace

When the playground opens without a URL hash, it creates a single-file workspace:

```
main.ts    (starter template with a basic hex-di example)
```

When loading an example with multiple files, the filesystem is populated with all files from the example template.

### 13.5 Integration with Monaco

Each file in the VirtualFS corresponds to a Monaco `TextModel`. When the VirtualFS changes:

- `file-created` → create a new `TextModel` with the file content
- `file-updated` → update the existing model's value (only if change originated externally, not from editor)
- `file-deleted` → dispose the `TextModel`
- `file-renamed` → dispose old model, create new model with same content
- `bulk-update` → dispose all models, recreate from new state

Monaco models are created with URI scheme `file:///` so the TypeScript language service resolves cross-file imports correctly:

```typescript
const uri = monaco.Uri.parse(`file:///${path}`);
const model = monaco.editor.createModel(content, "typescript", uri);
```

### 13.6 Integration with Sandbox

When the user clicks "Run", the sandbox receives the full filesystem snapshot:

```typescript
const files = virtualFS.getAll(); // Map<string, string>
sandboxManager.execute(files); // Sends all files to compiler
```

The compiler (esbuild-wasm) resolves cross-file imports within this virtual filesystem. See [04 — Sandbox](./04-sandbox.md) for details.

---

## 14. File Tree Sidebar

### 14.1 Layout

The file tree is a collapsible sidebar within the editor pane, positioned to the left of the Monaco editor. It displays the virtual filesystem as a tree structure.

```
┌─ File Tree ──────┬─ main.ts ─────────────────────┐
│  ▶ ports/        │                                │
│    logger.ts     │  import { createPort } from .. │
│    cache.ts      │                                │
│  ▶ adapters/     │  export const LoggerPort = ... │
│    console.ts    │                                │
│  main.ts         │                                │
│                  │                                │
│  [+ New File]    │                                │
└──────────────────┴────────────────────────────────┘
```

### 14.2 Features

- **Tree structure**: Directories shown as collapsible groups, files as leaves
- **File selection**: Click a file to open it in the editor (switches the active Monaco model)
- **Active file indicator**: Highlighted background on the currently edited file
- **New file button**: Opens an inline text input for the file name. Typing a path with slashes (e.g., `ports/auth.ts`) auto-creates directories.
- **Context actions**: Right-click menu with Rename and Delete options
- **Delete confirmation**: Deleting a file shows an inline "Are you sure?" prompt (no modal)
- **Drag-and-drop**: Not supported in v1 (files can be renamed via context menu)
- **Collapsible**: The file tree can be collapsed to a thin strip, giving the editor full width. A toggle button in the editor pane header controls visibility.

### 14.3 Tab Bar

Above the Monaco editor, a tab bar shows all open files:

```typescript
interface TabBarProps {
  readonly openFiles: readonly string[];
  readonly activeFile: string;
  readonly modifiedFiles: ReadonlySet<string>;
  readonly onSelect: (path: string) => void;
  readonly onClose: (path: string) => void;
}
```

- Tabs show the file name (not full path), with a tooltip showing the full path
- Modified (unsaved) files show a dot indicator on the tab
- Close button (×) on each tab. Closing the last tab opens `main.ts`
- Tab order matches the order files were opened (most recently opened on the right)

### 14.4 Keyboard Navigation

| Shortcut           | Action                                         |
| ------------------ | ---------------------------------------------- |
| `Ctrl+P` / `Cmd+P` | Quick file open (fuzzy search over file names) |
| `Ctrl+Tab`         | Cycle to next open tab                         |
| `Ctrl+Shift+Tab`   | Cycle to previous open tab                     |
| `Ctrl+W` / `Cmd+W` | Close current tab                              |

The quick file open is a minimal overlay (like VS Code's Quick Open) that lists all files in the virtual FS, filterable by typing. Selecting a file opens it in the editor.
