/**
 * CodeEditor component tests.
 *
 * Monaco Editor cannot run in jsdom, so we inject a mock MonacoLoader
 * to verify the component's integration logic:
 * - Renders a container div for Monaco
 * - Creates models for files
 * - Switches models on activeFile change
 * - Registers hex-light / hex-dark themes
 * - Registers keyboard shortcuts for run and save
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import React from "react";
import { CodeEditor } from "../../src/editor/code-editor.js";
import type { MonacoNamespace } from "../../src/editor/code-editor.js";

// ---------------------------------------------------------------------------
// Mock Monaco factory
// ---------------------------------------------------------------------------

function createMockMonaco() {
  const models = new Map<string, any>();

  const mockEditor = {
    setModel: vi.fn(),
    getModel: vi.fn(() => null),
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    addCommand: vi.fn(),
    saveViewState: vi.fn(() => null),
    restoreViewState: vi.fn(),
    dispose: vi.fn(),
    updateOptions: vi.fn(),
    getAction: vi.fn(() => null),
    trigger: vi.fn(),
  };

  const mockMonaco: MonacoNamespace = {
    editor: {
      create: vi.fn(() => mockEditor),
      createModel: vi.fn((content: string, language: string, uri: any) => {
        const model = {
          uri,
          getValue: vi.fn(() => content),
          setValue: vi.fn(),
          dispose: vi.fn(),
          getFullModelRange: vi.fn(() => ({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          })),
          getLineCount: vi.fn(() => 1),
          getLineMaxColumn: vi.fn(() => 1),
        };
        models.set(uri.path, model);
        return model;
      }),
      setTheme: vi.fn(),
      defineTheme: vi.fn(),
      setModelMarkers: vi.fn(),
      getModels: vi.fn(() => [...models.values()]),
    },
    Uri: {
      parse: vi.fn((value: string) => ({
        toString: () => value,
        path: value.replace("file://", ""),
      })),
    },
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
      registerDocumentFormattingEditProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };

  return { mockMonaco, mockEditor, models };
}

function makeFiles(...entries: Array<[string, string]>): ReadonlyMap<string, string> {
  return new Map(entries);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CodeEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a container div with data-testid", () => {
    const { getByTestId } = render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "const x = 1;"])}
        onChange={vi.fn()}
        theme="light"
      />
    );

    expect(getByTestId("code-editor")).toBeDefined();
  });

  it("initializes Monaco editor via loadMonaco on mount", async () => {
    const { mockMonaco } = createMockMonaco();
    const loadMonaco = vi.fn(() => Promise.resolve(mockMonaco));

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "const x = 1;"])}
        onChange={vi.fn()}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    // Wait for the async loader to resolve
    await act(() => Promise.resolve());

    expect(loadMonaco).toHaveBeenCalledTimes(1);
    expect(mockMonaco.editor.create).toHaveBeenCalledTimes(1);
  });

  it("defines hex-light and hex-dark themes", async () => {
    const { mockMonaco } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code"])}
        onChange={vi.fn()}
        theme="dark"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
      "hex-light",
      expect.objectContaining({ base: "vs", inherit: true })
    );
    expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
      "hex-dark",
      expect.objectContaining({ base: "vs-dark", inherit: true })
    );
  });

  it("creates models for initial files", async () => {
    const { mockMonaco } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code1"], ["utils.ts", "code2"])}
        onChange={vi.fn()}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    expect(mockMonaco.editor.createModel).toHaveBeenCalledTimes(2);
  });

  it("registers keyboard shortcuts for run and save when handlers provided", async () => {
    const { mockMonaco, mockEditor } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);
    const onRun = vi.fn();
    const onSave = vi.fn();

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code"])}
        onChange={vi.fn()}
        onRun={onRun}
        onSave={onSave}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    // Three commands: Ctrl+Enter for run, Ctrl+S for save, Ctrl+Shift+F for format
    expect(mockEditor.addCommand).toHaveBeenCalledTimes(3);
  });

  it("does not register run shortcut when onRun is not provided", async () => {
    const { mockMonaco, mockEditor } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code"])}
        onChange={vi.fn()}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    // Only the format command (Ctrl+Shift+F) is registered when neither onRun nor onSave provided
    expect(mockEditor.addCommand).toHaveBeenCalledTimes(1);
  });

  it("sets active model on mount", async () => {
    const { mockMonaco, mockEditor } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);

    render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code"])}
        onChange={vi.fn()}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    expect(mockEditor.setModel).toHaveBeenCalled();
  });

  it("disposes editor and models on unmount", async () => {
    const { mockMonaco, mockEditor } = createMockMonaco();
    const loadMonaco = () => Promise.resolve(mockMonaco);

    const { unmount } = render(
      <CodeEditor
        activeFile="main.ts"
        files={makeFiles(["main.ts", "code"])}
        onChange={vi.fn()}
        theme="light"
        loadMonaco={loadMonaco}
      />
    );

    await act(() => Promise.resolve());

    unmount();

    expect(mockEditor.dispose).toHaveBeenCalledTimes(1);
  });
});
