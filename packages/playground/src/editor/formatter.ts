/**
 * Prettier integration for the playground editor.
 *
 * Provides format-on-demand (Ctrl+Shift+F) and format-before-save (Ctrl+S)
 * by registering a Monaco DocumentFormattingEditProvider that delegates
 * to Prettier's standalone browser build.
 *
 * Prettier is lazy-loaded on first format request to avoid blocking initial load.
 *
 * @see spec/playground/03-code-editor.md
 */

import type {
  MonacoNamespace,
  MonacoDisposable,
  MonacoTextModel,
  MonacoFormattingOptions,
  MonacoCancellationToken,
  MonacoTextEdit,
} from "./code-editor.js";

// ---------------------------------------------------------------------------
// Prettier configuration (mirrors root .prettierrc.json)
// ---------------------------------------------------------------------------

export const PRETTIER_CONFIG = {
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: "avoid",
  endOfLine: "lf",
  parser: "typescript",
} as const;

// ---------------------------------------------------------------------------
// Lazy-loaded prettier modules
// ---------------------------------------------------------------------------

interface PrettierStandalone {
  format(source: string, options: Record<string, unknown>): Promise<string>;
}

interface PrettierPlugin {
  parsers: Record<string, unknown>;
}

let prettierPromise:
  | Promise<{
      standalone: PrettierStandalone;
      tsPlugin: PrettierPlugin;
      estreePlugin: PrettierPlugin;
    }>
  | undefined;

function loadPrettier(): Promise<{
  standalone: PrettierStandalone;
  tsPlugin: PrettierPlugin;
  estreePlugin: PrettierPlugin;
}> {
  if (prettierPromise) return prettierPromise;
  prettierPromise = Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
  ]).then(([standalone, tsPlugin, estreePlugin]) => ({
    standalone: standalone as unknown as PrettierStandalone,
    tsPlugin: tsPlugin as unknown as PrettierPlugin,
    estreePlugin: estreePlugin as unknown as PrettierPlugin,
  }));
  return prettierPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format TypeScript source code using Prettier with the project's config.
 *
 * Lazy-loads Prettier on first call.
 */
export async function formatCode(source: string): Promise<string> {
  const { standalone, tsPlugin, estreePlugin } = await loadPrettier();
  const result = await standalone.format(source, {
    ...PRETTIER_CONFIG,
    plugins: [estreePlugin, tsPlugin],
  });
  return result;
}

/**
 * Register a Monaco DocumentFormattingEditProvider for TypeScript
 * that uses Prettier. This enables format-on-demand and format-on-save.
 *
 * @returns A disposable to unregister the provider.
 */
export function registerPrettierFormatter(monaco: MonacoNamespace): MonacoDisposable {
  return monaco.languages.registerDocumentFormattingEditProvider("typescript", {
    async provideDocumentFormattingEdits(
      model: MonacoTextModel,
      _options: MonacoFormattingOptions,
      _token: MonacoCancellationToken
    ): Promise<MonacoTextEdit[]> {
      const source = model.getValue();
      try {
        const formatted = await formatCode(source);
        if (formatted === source) return [];
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch {
        // If Prettier fails (e.g. syntax error), return no edits
        return [];
      }
    },
  });
}
