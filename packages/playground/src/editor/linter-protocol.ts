/**
 * Message protocol between the main thread and the ESLint linter worker.
 *
 * The linter runs in a Web Worker to avoid blocking the UI thread.
 * Communication is via `postMessage` with typed message payloads.
 *
 * @see spec/playground/03-code-editor.md
 */

// ---------------------------------------------------------------------------
// Main thread -> Worker messages
// ---------------------------------------------------------------------------

/** Request the worker to lint files. */
export interface LintRequest {
  readonly type: "lint";
  /** Map of file path to file content. */
  readonly files: ReadonlyArray<readonly [string, string]>;
  /** The file currently active in the editor (linted first). */
  readonly activeFile: string;
}

/** Configure the linter rules at runtime. */
export interface ConfigureRequest {
  readonly type: "configure";
  readonly rules: Record<string, unknown>;
}

/** Messages sent from the main thread to the linter worker. */
export type MainToLinterMessage = LintRequest | ConfigureRequest;

// ---------------------------------------------------------------------------
// Worker -> Main thread messages
// ---------------------------------------------------------------------------

/** A single lint diagnostic from ESLint. */
export interface LintDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
  readonly severity: 1 | 2; // 1 = warning, 2 = error
  readonly ruleId: string | null;
}

/** Lint results for a specific file. */
export interface DiagnosticsResponse {
  readonly type: "diagnostics";
  readonly file: string;
  readonly diagnostics: readonly LintDiagnostic[];
}

/** Worker is ready to receive lint requests. */
export interface ReadyResponse {
  readonly type: "ready";
}

/** Worker encountered an error. */
export interface ErrorResponse {
  readonly type: "error";
  readonly message: string;
}

/** Messages sent from the linter worker to the main thread. */
export type LinterToMainMessage = DiagnosticsResponse | ReadyResponse | ErrorResponse;
