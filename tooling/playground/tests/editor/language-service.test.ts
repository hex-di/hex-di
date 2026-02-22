/**
 * Language service configuration tests.
 *
 * Verifies:
 * 1. configureLanguageService calls setCompilerOptions with correct values
 * 2. Diagnostics options enable semantic + syntax validation
 * 3. Eager model sync is enabled
 * 4. Type definitions are registered via addExtraLib
 */

import { describe, it, expect, vi } from "vitest";
import { configureLanguageService } from "../../src/editor/language-service.js";
import type { MonacoNamespace } from "../../src/editor/code-editor.js";

function createMockMonaco() {
  const addExtraLib = vi.fn(() => ({ dispose: vi.fn() }));
  const setCompilerOptions = vi.fn();
  const setDiagnosticsOptions = vi.fn();
  const setEagerModelSync = vi.fn();

  const mockMonaco: MonacoNamespace = {
    editor: {
      create: vi.fn() as any,
      createModel: vi.fn() as any,
      setTheme: vi.fn(),
      defineTheme: vi.fn(),
      setModelMarkers: vi.fn(),
      getModels: vi.fn(() => []),
    },
    Uri: {
      parse: vi.fn((v: string) => ({ toString: () => v, path: v })),
    },
    KeyMod: { CtrlCmd: 2048, Shift: 1024 },
    KeyCode: { Enter: 3, KeyS: 49, KeyF: 36 },
    MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
    languages: {
      typescript: {
        typescriptDefaults: {
          setCompilerOptions,
          setDiagnosticsOptions,
          setEagerModelSync,
          addExtraLib,
        },
      },
      registerDocumentFormattingEditProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };

  return {
    mockMonaco,
    setCompilerOptions,
    setDiagnosticsOptions,
    setEagerModelSync,
    addExtraLib,
  };
}

describe("configureLanguageService", () => {
  it("sets compiler options with correct numeric enum values", () => {
    const { mockMonaco, setCompilerOptions } = createMockMonaco();

    configureLanguageService(mockMonaco);

    expect(setCompilerOptions).toHaveBeenCalledTimes(1);
    const opts = setCompilerOptions.mock.calls[0][0];

    // ScriptTarget.ES2022 = 9
    expect(opts.target).toBe(9);
    // ModuleKind.ESNext = 99
    expect(opts.module).toBe(99);
    // ModuleResolutionKind.NodeJs = 2
    expect(opts.moduleResolution).toBe(2);
    // JsxEmit.ReactJSX = 4
    expect(opts.jsx).toBe(4);
    expect(opts.strict).toBe(true);
    expect(opts.esModuleInterop).toBe(true);
    expect(opts.skipLibCheck).toBe(true);
    expect(opts.noEmit).toBe(true);
    expect(opts.allowNonTsExtensions).toBe(true);
  });

  it("enables semantic and syntax validation", () => {
    const { mockMonaco, setDiagnosticsOptions } = createMockMonaco();

    configureLanguageService(mockMonaco);

    expect(setDiagnosticsOptions).toHaveBeenCalledTimes(1);
    expect(setDiagnosticsOptions).toHaveBeenCalledWith({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });
  });

  it("enables eager model sync for cross-file IntelliSense", () => {
    const { mockMonaco, setEagerModelSync } = createMockMonaco();

    configureLanguageService(mockMonaco);

    expect(setEagerModelSync).toHaveBeenCalledTimes(1);
    expect(setEagerModelSync).toHaveBeenCalledWith(true);
  });

  it("registers type definitions for all 10 hex-di packages", () => {
    const { mockMonaco, addExtraLib } = createMockMonaco();

    configureLanguageService(mockMonaco);

    expect(addExtraLib).toHaveBeenCalledTimes(10);

    // Verify each package gets registered with correct URI
    const calledUris = addExtraLib.mock.calls.map((c: any[]) => c[1]);
    expect(calledUris).toContain("file:///node_modules/@hex-di/core/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/graph/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/runtime/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/result/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/flow/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/store/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/query/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/saga/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/tracing/index.d.ts");
    expect(calledUris).toContain("file:///node_modules/@hex-di/logger/index.d.ts");
  });

  it("does not include paths in compiler options (addExtraLib handles resolution)", () => {
    const { mockMonaco, setCompilerOptions } = createMockMonaco();

    configureLanguageService(mockMonaco);

    const opts = setCompilerOptions.mock.calls[0][0];
    expect(opts.paths).toBeUndefined();
  });
});
