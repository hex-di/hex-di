/**
 * Monaco Editor Web Worker configuration.
 *
 * Monaco's language features (IntelliSense, hover tooltips, diagnostics,
 * go-to-definition) run in Web Workers. Without configuring
 * `MonacoEnvironment.getWorker`, these features are silently disabled.
 *
 * This module sets up `self.MonacoEnvironment` so Monaco can spawn:
 * - **Editor worker** — syntax highlighting, bracket matching, basic editor ops
 * - **TypeScript worker** — full TS language service (hover, completions, errors)
 *
 * Must be called BEFORE importing `monaco-editor`.
 */

// ---------------------------------------------------------------------------
// Worker URL imports (Vite bundles these as separate worker chunks)
// ---------------------------------------------------------------------------

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// ---------------------------------------------------------------------------
// MonacoEnvironment type (minimal, avoids importing full monaco types)
// ---------------------------------------------------------------------------

interface MonacoEnvironmentConfig {
  getWorker(_workerId: string, label: string): Worker;
}

declare const self: {
  MonacoEnvironment?: MonacoEnvironmentConfig;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configure `self.MonacoEnvironment` so Monaco can spawn its workers.
 *
 * Call this once, before `import("monaco-editor")`.
 */
export function configureMonacoWorkers(): void {
  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === "typescript" || label === "javascript") {
        return new TsWorker();
      }
      return new EditorWorker();
    },
  };
}
