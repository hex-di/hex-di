/**
 * Main-thread ESLint linter manager for the playground editor.
 *
 * Manages the lifecycle of the linter Web Worker, debounces lint requests,
 * and maps ESLint diagnostics to Monaco editor markers.
 *
 * @see spec/playground/03-code-editor.md
 */

import type { MonacoNamespace, MonacoTextModel } from "./code-editor.js";
import type {
  MainToLinterMessage,
  LinterToMainMessage,
  LintDiagnostic,
} from "./linter-protocol.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Debounce delay for lint requests (ms after last keystroke). */
const LINT_DEBOUNCE_MS = 300;

/** Monaco marker owner for ESLint diagnostics. */
const ESLINT_MARKER_OWNER = "eslint";

// ---------------------------------------------------------------------------
// PlaygroundLinter
// ---------------------------------------------------------------------------

/**
 * Manages ESLint linting in a Web Worker.
 *
 * Usage:
 * 1. Create an instance
 * 2. Call `start(monaco)` to initialize the worker
 * 3. Call `lint(files, activeFile)` on content changes (debounced internally)
 * 4. Call `stop()` to terminate the worker
 */
export class PlaygroundLinter {
  private worker: Worker | undefined;
  private monaco: MonacoNamespace | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private isReady = false;
  private pendingLint: { files: ReadonlyMap<string, string>; activeFile: string } | undefined;

  /**
   * Start the linter worker.
   *
   * @param monaco - The Monaco namespace for setting markers.
   */
  start(monaco: MonacoNamespace): void {
    this.monaco = monaco;

    try {
      this.worker = new Worker(new URL("./linter-worker.ts", import.meta.url), { type: "module" });
      this.worker.addEventListener("message", this.handleMessage);
      this.worker.addEventListener("error", this.handleError);
    } catch {
      // Worker creation can fail in test environments or browsers that
      // don't support module workers. Degrade gracefully.
      this.worker = undefined;
    }
  }

  /**
   * Stop the linter worker and clean up resources.
   */
  stop(): void {
    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.worker) {
      this.worker.removeEventListener("message", this.handleMessage);
      this.worker.removeEventListener("error", this.handleError);
      this.worker.terminate();
      this.worker = undefined;
    }

    this.isReady = false;
    this.pendingLint = undefined;
    this.monaco = undefined;
  }

  /**
   * Request linting of files. Debounced internally.
   *
   * @param files - Map of file path to file content.
   * @param activeFile - The currently active file in the editor.
   */
  lint(files: ReadonlyMap<string, string>, activeFile: string): void {
    if (!this.worker) return;

    // Store the latest request for debouncing
    this.pendingLint = { files, activeFile };

    if (this.debounceTimer !== undefined) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.sendLintRequest();
    }, LINT_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private sendLintRequest(): void {
    if (!this.worker || !this.isReady || !this.pendingLint) return;

    const { files, activeFile } = this.pendingLint;
    this.pendingLint = undefined;

    const message: MainToLinterMessage = {
      type: "lint",
      files: [...files.entries()],
      activeFile,
    };

    this.worker.postMessage(message);
  }

  private readonly handleMessage = (event: MessageEvent<LinterToMainMessage>): void => {
    const msg = event.data;

    switch (msg.type) {
      case "ready": {
        this.isReady = true;
        // If there's a pending lint request, send it now
        if (this.pendingLint) {
          this.sendLintRequest();
        }
        break;
      }

      case "diagnostics": {
        this.applyDiagnostics(msg.file, msg.diagnostics);
        break;
      }

      case "error": {
        // Linter errors are non-fatal — just log for debugging
        console.warn("[PlaygroundLinter]", msg.message);
        break;
      }
    }
  };

  private readonly handleError = (_event: ErrorEvent): void => {
    // Worker error — degrade gracefully
    console.warn("[PlaygroundLinter] Worker error");
  };

  private applyDiagnostics(file: string, diagnostics: readonly LintDiagnostic[]): void {
    const monaco = this.monaco;
    if (!monaco) return;

    // Find the Monaco model for this file
    const models = monaco.editor.getModels();
    const targetUri = `file:///${file}`;
    let targetModel: MonacoTextModel | undefined;
    for (const model of models) {
      if (model.uri.toString() === targetUri) {
        targetModel = model;
        break;
      }
    }

    if (!targetModel) return;

    // Map ESLint severity to Monaco MarkerSeverity
    const markers = diagnostics.map(diag => ({
      severity: diag.severity === 2 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      message: diag.message,
      startLineNumber: diag.line,
      startColumn: diag.column,
      endLineNumber: diag.endLine,
      endColumn: diag.endColumn,
    }));

    monaco.editor.setModelMarkers(targetModel, ESLINT_MARKER_OWNER, markers);
  }
}
