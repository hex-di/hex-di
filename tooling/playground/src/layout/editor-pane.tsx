/**
 * Editor Pane component.
 *
 * Orchestrates the FileTree sidebar, TabBar, and CodeEditor into
 * a unified editor experience. Provides file tree toggle, active
 * file indicator, and diagnostics summary.
 *
 * @see spec/playground/05-layout-and-panels.md Section 21
 */

import { useState, useCallback, useMemo } from "react";
import { FileTree } from "../editor/file-tree.js";
import { TabBar } from "../editor/tab-bar.js";
import { CodeEditor } from "../editor/code-editor.js";
import type { EditorDiagnostic, MonacoLoader } from "../editor/code-editor.js";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the EditorPane component. */
export interface EditorPaneProps {
  /** All files in the virtual filesystem. */
  readonly files: ReadonlyMap<string, string>;
  /** Currently active file path. */
  readonly activeFile: string;
  /** Open files shown as tabs. */
  readonly openFiles: readonly string[];
  /** Set of file paths with unsaved modifications. */
  readonly modifiedFiles: ReadonlySet<string>;
  /** Diagnostics from the language service. */
  readonly diagnostics?: readonly EditorDiagnostic[];
  /** Current theme. */
  readonly theme: "light" | "dark";
  /** Whether the editor is read-only (embed mode). */
  readonly readOnly?: boolean;
  /** Monaco loader for dependency injection. */
  readonly loadMonaco?: MonacoLoader;

  // Callbacks
  /** Called when a file is selected (from tree or tab). */
  readonly onSelectFile: (path: string) => void;
  /** Called when a tab is closed. */
  readonly onCloseFile: (path: string) => void;
  /** Called when file content changes in the editor. */
  readonly onFileChange: (path: string, content: string) => void;
  /** Called when a new file is created. */
  readonly onNewFile?: (path: string) => void;
  /** Called when a file is renamed. */
  readonly onRenameFile?: (oldPath: string, newPath: string) => void;
  /** Called when a file is deleted. */
  readonly onDeleteFile?: (path: string) => void;
  /** Called when Ctrl+Enter is pressed (run code). */
  readonly onRun?: () => void;
  /** Called when Ctrl+S is pressed (save). */
  readonly onSave?: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Diagnostics summary helper
// ---------------------------------------------------------------------------

interface DiagnosticCounts {
  readonly errors: number;
  readonly warnings: number;
}

function countDiagnostics(diagnostics: readonly EditorDiagnostic[] | undefined): DiagnosticCounts {
  if (!diagnostics || diagnostics.length === 0) {
    return { errors: 0, warnings: 0 };
  }

  let errors = 0;
  let warnings = 0;

  for (const diag of diagnostics) {
    if (diag.severity === "error") {
      errors += 1;
    } else if (diag.severity === "warning") {
      warnings += 1;
    }
  }

  return { errors, warnings };
}

function formatDiagnosticsSummary(counts: DiagnosticCounts): string {
  const parts: string[] = [];
  if (counts.errors > 0) {
    parts.push(`${counts.errors} error${counts.errors !== 1 ? "s" : ""}`);
  }
  if (counts.warnings > 0) {
    parts.push(`${counts.warnings} warning${counts.warnings !== 1 ? "s" : ""}`);
  }
  return parts.length > 0 ? parts.join(", ") : "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EditorPane orchestrates the file tree, tab bar, and Monaco editor.
 *
 * Features:
 * - Collapsible file tree sidebar
 * - Active file indicator in the header
 * - Diagnostics summary (error/warning count)
 * - Tab bar for switching between open files
 */
export function EditorPane(props: EditorPaneProps): React.ReactElement {
  const {
    files,
    activeFile,
    openFiles,
    modifiedFiles,
    diagnostics,
    theme,
    readOnly = false,
    loadMonaco,
    onSelectFile,
    onCloseFile,
    onFileChange,
    onNewFile,
    onRenameFile,
    onDeleteFile,
    onRun,
    onSave,
  } = props;

  const [isTreeVisible, setIsTreeVisible] = useState(true);
  const [isToggleHovered, setIsToggleHovered] = useState(false);

  const toggleTree = useCallback(() => {
    setIsTreeVisible(prev => !prev);
  }, []);

  const fileList = useMemo(() => [...files.keys()].sort(), [files]);

  const diagCounts = useMemo(() => countDiagnostics(diagnostics), [diagnostics]);

  const diagSummary = useMemo(() => formatDiagnosticsSummary(diagCounts), [diagCounts]);

  return (
    <div
      data-testid="editor-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Editor header */}
      <div
        data-testid="editor-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderBottom: "1px solid var(--hex-border, #e2e8f0)",
          fontSize: 13,
          fontFamily: "var(--hex-font-sans, sans-serif)",
          flexShrink: 0,
          minHeight: 40,
          background: "var(--hex-bg-secondary, #f5f5f7)",
        }}
      >
        {/* Section label */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--hex-text-muted, #9b9bb0)",
            userSelect: "none",
          }}
        >
          Editor
        </span>

        {/* File tree toggle */}
        <button
          data-testid="file-tree-toggle"
          onClick={toggleTree}
          onMouseEnter={() => setIsToggleHovered(true)}
          onMouseLeave={() => setIsToggleHovered(false)}
          style={{
            border: "none",
            background: isToggleHovered ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
            cursor: "pointer",
            fontSize: 14,
            color: "var(--hex-text-secondary, #6b6b80)",
            padding: "4px 6px",
            borderRadius: "var(--hex-radius-sm, 4px)",
            display: "flex",
            alignItems: "center",
            transition: "var(--hex-transition-fast, 100ms ease)",
          }}
          title={isTreeVisible ? "Hide file tree" : "Show file tree"}
          aria-label={isTreeVisible ? "Hide file tree" : "Show file tree"}
        >
          {isTreeVisible ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
        </button>

        {/* Active file indicator */}
        <span
          data-testid="active-file-indicator"
          style={{
            fontFamily: "var(--hex-font-mono, monospace)",
            fontSize: 13,
            color: "var(--hex-text-secondary, #6b6b80)",
          }}
        >
          {activeFile}
        </span>

        {/* Diagnostics summary */}
        {diagSummary && (
          <span
            data-testid="diagnostics-summary"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color:
                diagCounts.errors > 0 ? "var(--hex-error, #ef4444)" : "var(--hex-warning, #f59e0b)",
            }}
          >
            {diagSummary}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <TabBar
        openFiles={openFiles}
        activeFile={activeFile}
        modifiedFiles={modifiedFiles}
        onSelect={onSelectFile}
        onClose={onCloseFile}
      />

      {/* Main area: file tree + editor */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* File tree sidebar */}
        {isTreeVisible && (
          <div
            data-testid="editor-file-tree-sidebar"
            style={{
              width: 200,
              minWidth: 120,
              borderRight: "1px solid var(--hex-border, #e2e8f0)",
              overflow: "auto",
              flexShrink: 0,
              background: "var(--hex-bg-secondary, #f5f5f7)",
            }}
          >
            <FileTree
              files={fileList}
              activeFile={activeFile}
              onSelect={onSelectFile}
              onNewFile={onNewFile}
              onRename={onRenameFile}
              onDelete={onDeleteFile}
            />
          </div>
        )}

        {/* Code editor */}
        <div
          data-testid="editor-code-area"
          style={{
            flex: 1,
            overflow: "hidden",
          }}
        >
          <CodeEditor
            activeFile={activeFile}
            files={files}
            onChange={onFileChange}
            onRun={onRun}
            onSave={onSave}
            diagnostics={diagnostics}
            theme={theme}
            readOnly={readOnly}
            loadMonaco={loadMonaco}
          />
        </div>
      </div>
    </div>
  );
}
