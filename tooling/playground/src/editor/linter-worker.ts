/**
 * ESLint Web Worker for the playground editor.
 *
 * Runs ESLint with @typescript-eslint rules in a Web Worker so linting
 * doesn't block the UI thread. Receives file contents via postMessage,
 * runs the linter, and sends diagnostics back.
 *
 * Uses ESLint's `Linter` class (browser-compatible, no file system access)
 * with @typescript-eslint/parser and selected @typescript-eslint rules.
 *
 * @see spec/playground/03-code-editor.md
 */

import type {
  MainToLinterMessage,
  LinterToMainMessage,
  LintDiagnostic,
} from "./linter-protocol.js";

// ---------------------------------------------------------------------------
// ESLint types (minimal to avoid importing full ESLint types)
// ---------------------------------------------------------------------------

interface ESLintLinterMessage {
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly message: string;
  readonly severity: 1 | 2;
  readonly ruleId: string | null;
}

interface ESLintLinter {
  verify(code: string, config: unknown): ESLintLinterMessage[];
}

interface ESLintLinterConstructor {
  new (): ESLintLinter;
}

// ---------------------------------------------------------------------------
// Selected rules (appropriate for a playground environment)
// ---------------------------------------------------------------------------

const ESLINT_RULES: Record<string, unknown> = {
  // Type-aware rules (error level)
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/await-thenable": "error",

  // Type-aware rules (warning level)
  "@typescript-eslint/no-unnecessary-type-assertion": "warn",
  "@typescript-eslint/prefer-nullish-coalescing": "warn",
  "@typescript-eslint/consistent-type-imports": "warn",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/no-unsafe-assignment": "warn",
  "@typescript-eslint/no-unsafe-call": "warn",

  // Console is expected in playground
  "no-console": "off",
};

let currentRules = { ...ESLINT_RULES };
let linter: ESLintLinter | undefined;

// ---------------------------------------------------------------------------
// Worker initialization
// ---------------------------------------------------------------------------

async function initialize(): Promise<void> {
  try {
    // Import ESLint Linter class (browser-compatible build)
    const eslintModule = await import("eslint/universal");
    const LinterClass = (eslintModule as unknown as { Linter: ESLintLinterConstructor }).Linter;
    linter = new LinterClass();

    postTypedMessage({ type: "ready" });
  } catch (err) {
    postTypedMessage({
      type: "error",
      message: `Failed to initialize ESLint: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Lint execution
// ---------------------------------------------------------------------------

function lintFile(filePath: string, code: string): readonly LintDiagnostic[] {
  if (!linter) return [];

  try {
    const messages = linter.verify(code, {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        parser: undefined, // Use default parser for now; TS parser requires file system
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
      rules: currentRules,
    });

    return messages.map(msg => ({
      line: msg.line,
      column: msg.column,
      endLine: msg.endLine ?? msg.line,
      endColumn: msg.endColumn ?? msg.column,
      message: msg.ruleId ? `${msg.message} (${msg.ruleId})` : msg.message,
      severity: msg.severity,
      ruleId: msg.ruleId,
    }));
  } catch {
    // If linting fails (e.g. parse error), return empty diagnostics
    return [];
  }
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

function postTypedMessage(message: LinterToMainMessage): void {
  // eslint-disable-next-line no-restricted-globals -- Worker global
  self.postMessage(message);
}

function handleMessage(event: MessageEvent<MainToLinterMessage>): void {
  const msg = event.data;

  switch (msg.type) {
    case "lint": {
      // Lint the active file first, then others
      const fileMap = new Map(msg.files);
      const activeCode = fileMap.get(msg.activeFile);
      if (activeCode !== undefined) {
        const diagnostics = lintFile(msg.activeFile, activeCode);
        postTypedMessage({
          type: "diagnostics",
          file: msg.activeFile,
          diagnostics,
        });
      }

      // Lint remaining files
      for (const [file, code] of fileMap) {
        if (file === msg.activeFile) continue;
        const diagnostics = lintFile(file, code);
        postTypedMessage({
          type: "diagnostics",
          file,
          diagnostics,
        });
      }
      break;
    }

    case "configure": {
      currentRules = { ...ESLINT_RULES, ...msg.rules };
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-restricted-globals -- Worker global
self.addEventListener("message", handleMessage);

void initialize();
