/**
 * Prettier formatter integration tests.
 *
 * Verifies:
 * 1. PRETTIER_CONFIG mirrors root .prettierrc.json
 * 2. formatCode produces formatted output
 * 3. registerPrettierFormatter registers a provider for "typescript"
 * 4. The formatting provider returns correct text edits
 */

import { describe, it, expect, vi } from "vitest";
import {
  PRETTIER_CONFIG,
  formatCode,
  registerPrettierFormatter,
} from "../../src/editor/formatter.js";
import type { MonacoNamespace } from "../../src/editor/code-editor.js";

// ---------------------------------------------------------------------------
// Config tests
// ---------------------------------------------------------------------------

describe("PRETTIER_CONFIG", () => {
  it("mirrors root .prettierrc.json settings", () => {
    expect(PRETTIER_CONFIG.semi).toBe(true);
    expect(PRETTIER_CONFIG.singleQuote).toBe(false);
    expect(PRETTIER_CONFIG.tabWidth).toBe(2);
    expect(PRETTIER_CONFIG.trailingComma).toBe("es5");
    expect(PRETTIER_CONFIG.printWidth).toBe(100);
    expect(PRETTIER_CONFIG.bracketSpacing).toBe(true);
    expect(PRETTIER_CONFIG.arrowParens).toBe("avoid");
    expect(PRETTIER_CONFIG.endOfLine).toBe("lf");
    expect(PRETTIER_CONFIG.parser).toBe("typescript");
  });
});

// ---------------------------------------------------------------------------
// formatCode tests
// ---------------------------------------------------------------------------

describe("formatCode", () => {
  it("formats TypeScript code with prettier config", async () => {
    const unformatted = 'const x=1;const y="hello"';
    const formatted = await formatCode(unformatted);

    // Should add semicolons and proper spacing
    expect(formatted).toContain("const x = 1;");
    expect(formatted).toContain('"hello"');
  });

  it("preserves already-formatted code", async () => {
    const code = "const x = 1;\n";
    const result = await formatCode(code);
    expect(result).toBe(code);
  });

  it("formats arrow functions respecting arrowParens=avoid", async () => {
    // arrowParens=avoid omits parens for single untyped args
    const code = "const fn = (x) => x + 1;\n";
    const result = await formatCode(code);
    expect(result).toContain("x =>");
    expect(result).not.toContain("(x) =>");
  });
});

// ---------------------------------------------------------------------------
// registerPrettierFormatter tests
// ---------------------------------------------------------------------------

describe("registerPrettierFormatter", () => {
  it("registers a formatting provider for typescript", () => {
    const registerProvider = vi.fn(() => ({ dispose: vi.fn() }));
    const mockMonaco = {
      editor: {
        create: vi.fn() as any,
        createModel: vi.fn() as any,
        setTheme: vi.fn(),
        defineTheme: vi.fn(),
        setModelMarkers: vi.fn(),
        getModels: vi.fn(() => []),
      },
      Uri: { parse: vi.fn() },
      KeyMod: { CtrlCmd: 2048, Shift: 1024 },
      KeyCode: { Enter: 3, KeyS: 49, KeyF: 36 },
      MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
      languages: {
        typescript: {
          typescriptDefaults: {
            setCompilerOptions: vi.fn(),
            setDiagnosticsOptions: vi.fn(),
            setEagerModelSync: vi.fn(),
            addExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
          },
        },
        registerDocumentFormattingEditProvider: registerProvider,
      },
    } satisfies MonacoNamespace;

    const disposable = registerPrettierFormatter(mockMonaco);

    expect(registerProvider).toHaveBeenCalledTimes(1);
    expect(registerProvider).toHaveBeenCalledWith(
      "typescript",
      expect.objectContaining({
        provideDocumentFormattingEdits: expect.any(Function),
      })
    );
    expect(disposable).toHaveProperty("dispose");
  });

  it("provider returns text edits for unformatted code", async () => {
    let capturedProvider: any;
    const registerProvider = vi.fn((lang: string, provider: any) => {
      capturedProvider = provider;
      return { dispose: vi.fn() };
    });

    const mockMonaco = {
      editor: {
        create: vi.fn() as any,
        createModel: vi.fn() as any,
        setTheme: vi.fn(),
        defineTheme: vi.fn(),
        setModelMarkers: vi.fn(),
        getModels: vi.fn(() => []),
      },
      Uri: { parse: vi.fn() },
      KeyMod: { CtrlCmd: 2048, Shift: 1024 },
      KeyCode: { Enter: 3, KeyS: 49, KeyF: 36 },
      MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
      languages: {
        typescript: {
          typescriptDefaults: {
            setCompilerOptions: vi.fn(),
            setDiagnosticsOptions: vi.fn(),
            setEagerModelSync: vi.fn(),
            addExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
          },
        },
        registerDocumentFormattingEditProvider: registerProvider,
      },
    } satisfies MonacoNamespace;

    registerPrettierFormatter(mockMonaco);

    const mockModel = {
      uri: { toString: () => "test.ts", path: "test.ts" },
      getValue: () => "const   x=1",
      setValue: vi.fn(),
      dispose: vi.fn(),
      getFullModelRange: () => ({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 13,
      }),
      getLineCount: () => 1,
      getLineMaxColumn: () => 13,
    };

    const edits = await capturedProvider.provideDocumentFormattingEdits(
      mockModel,
      { tabSize: 2, insertSpaces: true },
      { isCancellationRequested: false }
    );

    expect(edits.length).toBeGreaterThan(0);
    expect(edits[0].text).toContain("const x = 1;");
  });

  it("provider returns empty array when code is already formatted", async () => {
    let capturedProvider: any;
    const registerProvider = vi.fn((lang: string, provider: any) => {
      capturedProvider = provider;
      return { dispose: vi.fn() };
    });

    const mockMonaco = {
      editor: {
        create: vi.fn() as any,
        createModel: vi.fn() as any,
        setTheme: vi.fn(),
        defineTheme: vi.fn(),
        setModelMarkers: vi.fn(),
        getModels: vi.fn(() => []),
      },
      Uri: { parse: vi.fn() },
      KeyMod: { CtrlCmd: 2048, Shift: 1024 },
      KeyCode: { Enter: 3, KeyS: 49, KeyF: 36 },
      MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
      languages: {
        typescript: {
          typescriptDefaults: {
            setCompilerOptions: vi.fn(),
            setDiagnosticsOptions: vi.fn(),
            setEagerModelSync: vi.fn(),
            addExtraLib: vi.fn(() => ({ dispose: vi.fn() })),
          },
        },
        registerDocumentFormattingEditProvider: registerProvider,
      },
    } satisfies MonacoNamespace;

    registerPrettierFormatter(mockMonaco);

    const formatted = "const x = 1;\n";
    const mockModel = {
      uri: { toString: () => "test.ts", path: "test.ts" },
      getValue: () => formatted,
      setValue: vi.fn(),
      dispose: vi.fn(),
      getFullModelRange: () => ({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: formatted.length + 1,
      }),
      getLineCount: () => 1,
      getLineMaxColumn: () => formatted.length + 1,
    };

    const edits = await capturedProvider.provideDocumentFormattingEdits(
      mockModel,
      { tabSize: 2, insertSpaces: true },
      { isCancellationRequested: false }
    );

    expect(edits).toEqual([]);
  });
});
