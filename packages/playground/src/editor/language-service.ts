/**
 * TypeScript Language Service configuration for Monaco Editor.
 *
 * Configures the built-in Monaco TypeScript language service with strict mode,
 * proper module resolution, JSX support, and registers bundled type definitions
 * for `@hex-di/*` packages. This enables IntelliSense, go-to-definition,
 * hover docs, and real-time type checking in the playground.
 *
 * @see spec/playground/03-code-editor.md Section 11
 */

import type { MonacoNamespace } from "./code-editor.js";
import { TS_COMPILER_OPTIONS } from "./editor-config.js";
import { registerTypeDefinitions } from "./type-definitions.js";

// ---------------------------------------------------------------------------
// Monaco enum value mappings
// ---------------------------------------------------------------------------

// Monaco uses numeric enums that are only available after the module loads.
// We map our string-based config to the correct numeric values.

/** monaco.languages.typescript.ScriptTarget */
const SCRIPT_TARGET = {
  ES2022: 9,
  ESNext: 99,
} as const;

/** monaco.languages.typescript.ModuleKind */
const MODULE_KIND = {
  ESNext: 99,
} as const;

/** monaco.languages.typescript.ModuleResolutionKind */
const MODULE_RESOLUTION_KIND = {
  NodeJs: 2,
} as const;

/** monaco.languages.typescript.JsxEmit */
const JSX_EMIT = {
  ReactJSX: 4,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Configure Monaco's built-in TypeScript Language Service.
 *
 * Call once after Monaco loads but before creating any editors.
 * Sets up compiler options, diagnostics, cross-file IntelliSense,
 * and registers bundled type definitions for `@hex-di/*` packages.
 */
export function configureLanguageService(monaco: MonacoNamespace): void {
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;

  // Map string-based compiler options to Monaco numeric enums
  tsDefaults.setCompilerOptions({
    target: SCRIPT_TARGET[TS_COMPILER_OPTIONS.target],
    module: MODULE_KIND[TS_COMPILER_OPTIONS.module],
    moduleResolution: MODULE_RESOLUTION_KIND[TS_COMPILER_OPTIONS.moduleResolution],
    strict: TS_COMPILER_OPTIONS.strict,
    esModuleInterop: TS_COMPILER_OPTIONS.esModuleInterop,
    skipLibCheck: TS_COMPILER_OPTIONS.skipLibCheck,
    noEmit: TS_COMPILER_OPTIONS.noEmit,
    jsx: JSX_EMIT[TS_COMPILER_OPTIONS.jsx],
    allowNonTsExtensions: true,
  });

  // Enable full diagnostics (semantic + syntax validation)
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Enable cross-file IntelliSense (models are shared across files)
  tsDefaults.setEagerModelSync(true);

  // Register bundled @hex-di/* type definitions
  registerTypeDefinitions(monaco.languages.typescript);
}
