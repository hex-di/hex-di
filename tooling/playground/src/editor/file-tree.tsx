/**
 * File Tree sidebar component for the playground editor.
 *
 * Displays the virtual filesystem as a tree structure with directories
 * shown as collapsible groups and files as leaves. Supports new file
 * creation via inline input and context actions (rename, delete).
 *
 * @see spec/playground/03-code-editor.md Section 14.1-14.2
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { FolderOpenIcon, FolderClosedIcon, FileIcon } from "../layout/icons.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for the FileTree component. */
export interface FileTreeProps {
  /** All file paths in the virtual filesystem. */
  readonly files: readonly string[];
  /** Currently active (open in editor) file path. */
  readonly activeFile: string;
  /** Callback when a file is selected (clicked). */
  readonly onSelect: (path: string) => void;
  /** Callback to create a new file. */
  readonly onNewFile?: (path: string) => void;
  /** Callback to rename a file. */
  readonly onRename?: (oldPath: string, newPath: string) => void;
  /** Callback to delete a file. */
  readonly onDelete?: (path: string) => void;
}

/** Internal tree node structure. */
interface TreeNode {
  readonly name: string;
  readonly fullPath: string;
  readonly isDirectory: boolean;
  readonly children: TreeNode[];
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

/**
 * Builds a tree structure from a flat list of file paths.
 * Groups files by directory and sorts alphabetically.
 */
function buildTree(files: readonly string[]): readonly TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of files) {
    const parts = filePath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      let existing = currentLevel.find(n => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          fullPath,
          isDirectory: !isLast,
          children: [],
        };
        currentLevel.push(existing);
      }

      if (!isLast) {
        currentLevel = existing.children;
      }
    }
  }

  sortTree(root);
  return root;
}

/** Sort tree nodes: directories first, then alphabetically by name. */
function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children.length > 0) {
      sortTree(node.children);
    }
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Renders a single tree node (file or directory). */
function TreeNodeItem(props: {
  readonly node: TreeNode;
  readonly depth: number;
  readonly activeFile: string;
  readonly expandedDirs: ReadonlySet<string>;
  readonly hoveredPath: string | null;
  readonly onToggleDir: (path: string) => void;
  readonly onSelect: (path: string) => void;
  readonly onContextMenu?: (path: string, event: React.MouseEvent) => void;
  readonly onHover: (path: string | null) => void;
}): React.ReactElement {
  const {
    node,
    depth,
    activeFile,
    expandedDirs,
    hoveredPath,
    onToggleDir,
    onSelect,
    onContextMenu,
    onHover,
  } = props;
  const isExpanded = expandedDirs.has(node.fullPath);
  const isActive = node.fullPath === activeFile;
  const isHovered = hoveredPath === node.fullPath;
  const indentPx = 8 + depth * 16;

  if (node.isDirectory) {
    return (
      <>
        <div
          data-testid={`tree-dir-${node.fullPath}`}
          role="treeitem"
          aria-expanded={isExpanded}
          onMouseEnter={() => onHover(node.fullPath)}
          onMouseLeave={() => onHover(null)}
          style={{
            paddingTop: 6,
            paddingBottom: 6,
            paddingRight: 8,
            paddingLeft: indentPx,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: "var(--hex-radius-sm, 4px)",
            margin: "1px 4px",
            background: isHovered ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
            transition: "var(--hex-transition-fast, 100ms ease)",
            color: "var(--hex-text-primary, #1e293b)",
          }}
          onClick={() => onToggleDir(node.fullPath)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              onToggleDir(node.fullPath);
            }
          }}
          tabIndex={0}
        >
          {isExpanded ? (
            <FolderOpenIcon
              size={14}
              style={{ flexShrink: 0, color: "var(--hex-accent, #6366f1)" }}
            />
          ) : (
            <FolderClosedIcon
              size={14}
              style={{ flexShrink: 0, color: "var(--hex-text-muted, #9b9bb0)" }}
            />
          )}
          {node.name}/
        </div>
        {isExpanded &&
          node.children.map(child => (
            <TreeNodeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              expandedDirs={expandedDirs}
              hoveredPath={hoveredPath}
              onToggleDir={onToggleDir}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onHover={onHover}
            />
          ))}
      </>
    );
  }

  return (
    <div
      data-testid={`tree-file-${node.fullPath}`}
      role="treeitem"
      aria-selected={isActive}
      onMouseEnter={() => onHover(node.fullPath)}
      onMouseLeave={() => onHover(null)}
      style={{
        paddingTop: 5,
        paddingBottom: 5,
        paddingRight: 8,
        paddingLeft: indentPx,
        cursor: "pointer",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRadius: "var(--hex-radius-sm, 4px)",
        margin: "1px 4px",
        backgroundColor: isActive
          ? "var(--hex-accent-muted, rgba(99,102,241,0.12))"
          : isHovered
            ? "var(--hex-bg-hover, #e8e8ec)"
            : "transparent",
        userSelect: "none",
        transition: "var(--hex-transition-fast, 100ms ease)",
        color: "var(--hex-text-primary, #1e293b)",
      }}
      onClick={() => onSelect(node.fullPath)}
      onContextMenu={e => {
        e.preventDefault();
        onContextMenu?.(node.fullPath, e);
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          onSelect(node.fullPath);
        }
      }}
      tabIndex={0}
    >
      <FileIcon size={14} style={{ flexShrink: 0, color: "var(--hex-text-muted, #9b9bb0)" }} />
      {node.name}
    </div>
  );
}

/**
 * FileTree component.
 *
 * Displays files from the VirtualFS as a tree structure.
 * Supports directory collapsing, file selection, and new file creation.
 */
export function FileTree(props: FileTreeProps): React.ReactElement {
  const { files, activeFile, onSelect, onNewFile, onRename, onDelete } = props;

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    // Expand all directories initially
    const dirs = new Set<string>();
    for (const file of files) {
      const parts = file.split("/");
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    return dirs;
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    readonly path: string;
    readonly x: number;
    readonly y: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<string | null>(null);
  const [isNewFileHovered, setIsNewFileHovered] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const tree = buildTree(files);

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((path: string, event: React.MouseEvent) => {
    setContextMenu({ path, x: event.clientX, y: event.clientY });
  }, []);

  const handleNewFileSubmit = useCallback(() => {
    const trimmed = newFileName.trim();
    if (trimmed && onNewFile) {
      onNewFile(trimmed);
    }
    setIsCreating(false);
    setNewFileName("");
  }, [newFileName, onNewFile]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && renamingFile && onRename && trimmed !== renamingFile) {
      onRename(renamingFile, trimmed);
    }
    setRenamingFile(null);
    setRenameValue("");
  }, [renameValue, renamingFile, onRename]);

  // Focus input when creating or renaming
  useEffect(() => {
    if (isCreating && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (renamingFile && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingFile]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (): void => {
      setContextMenu(null);
    };
    document.addEventListener("click", handler);
    return () => {
      document.removeEventListener("click", handler);
    };
  }, [contextMenu]);

  return (
    <div
      data-testid="file-tree"
      role="tree"
      style={{
        minWidth: 150,
        fontSize: 13,
        fontFamily: "var(--hex-font-mono, monospace)",
        overflow: "auto",
        paddingTop: 0,
        paddingBottom: 4,
      }}
    >
      {/* Section header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--hex-text-muted, #9b9bb0)",
          padding: "8px 14px 6px",
          userSelect: "none",
          fontFamily: "var(--hex-font-sans, sans-serif)",
        }}
      >
        Files
      </div>
      {tree.map(node => (
        <TreeNodeItem
          key={node.fullPath}
          node={node}
          depth={0}
          activeFile={activeFile}
          expandedDirs={expandedDirs}
          hoveredPath={hoveredPath}
          onToggleDir={handleToggleDir}
          onSelect={onSelect}
          onContextMenu={handleContextMenu}
          onHover={setHoveredPath}
        />
      ))}

      {/* New file inline input */}
      {isCreating && (
        <div style={{ padding: "4px 8px" }}>
          <input
            ref={newFileInputRef}
            data-testid="new-file-input"
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleNewFileSubmit();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewFileName("");
              }
            }}
            onBlur={handleNewFileSubmit}
            placeholder="filename.ts"
            style={{
              width: "100%",
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid var(--hex-border, #e2e8f0)",
              borderRadius: "var(--hex-radius-sm, 4px)",
              background: "var(--hex-bg-primary, #ffffff)",
              color: "var(--hex-text-primary, #1e293b)",
              fontFamily: "var(--hex-font-mono, monospace)",
            }}
          />
        </div>
      )}

      {/* Rename inline input */}
      {renamingFile && (
        <div style={{ padding: "4px 8px" }}>
          <input
            ref={renameInputRef}
            data-testid="rename-file-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") {
                setRenamingFile(null);
                setRenameValue("");
              }
            }}
            onBlur={handleRenameSubmit}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid var(--hex-border, #e2e8f0)",
              borderRadius: "var(--hex-radius-sm, 4px)",
              background: "var(--hex-bg-primary, #ffffff)",
              color: "var(--hex-text-primary, #1e293b)",
              fontFamily: "var(--hex-font-mono, monospace)",
            }}
          />
        </div>
      )}

      {/* New file button */}
      {onNewFile && !isCreating && (
        <>
          <div
            style={{
              borderTop: "1px solid var(--hex-border, #e2e8f0)",
              marginTop: 8,
              marginLeft: 8,
              marginRight: 8,
            }}
          />
          <button
            data-testid="new-file-button"
            onClick={() => setIsCreating(true)}
            onMouseEnter={() => setIsNewFileHovered(true)}
            onMouseLeave={() => setIsNewFileHovered(false)}
            style={{
              display: "block",
              width: "calc(100% - 8px)",
              padding: "6px 12px",
              border: "none",
              background: isNewFileHovered ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
              cursor: "pointer",
              fontSize: 12,
              textAlign: "left",
              color: "var(--hex-text-secondary, #6b6b80)",
              borderRadius: "var(--hex-radius-sm, 4px)",
              margin: "2px 4px",
              transition: "var(--hex-transition-fast, 100ms ease)",
            }}
          >
            + New File
          </button>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          data-testid="context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            background: "var(--hex-bg-primary, #ffffff)",
            border: "1px solid var(--hex-border, #e2e8f0)",
            borderRadius: "var(--hex-radius-md, 6px)",
            boxShadow: "var(--hex-shadow-tooltip, 0 2px 8px rgba(0,0,0,0.15))",
            zIndex: 1000,
            fontSize: 13,
            padding: "4px 0",
            minWidth: 120,
            animation: "hex-fade-in 100ms ease",
          }}
        >
          {onRename && (
            <div
              data-testid="context-rename"
              onMouseEnter={() => setHoveredMenuItem("rename")}
              onMouseLeave={() => setHoveredMenuItem(null)}
              style={{
                padding: "6px 14px",
                cursor: "pointer",
                color: "var(--hex-text-primary, #1e293b)",
                borderRadius: "var(--hex-radius-sm, 4px)",
                margin: "0 4px",
                background:
                  hoveredMenuItem === "rename" ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
                transition: "var(--hex-transition-fast, 100ms ease)",
              }}
              onClick={() => {
                setRenamingFile(contextMenu.path);
                setRenameValue(contextMenu.path);
                setContextMenu(null);
              }}
            >
              Rename
            </div>
          )}
          {onDelete && (
            <div
              data-testid="context-delete"
              onMouseEnter={() => setHoveredMenuItem("delete")}
              onMouseLeave={() => setHoveredMenuItem(null)}
              style={{
                padding: "6px 14px",
                cursor: "pointer",
                color: "var(--hex-error, #ef4444)",
                borderRadius: "var(--hex-radius-sm, 4px)",
                margin: "0 4px",
                background:
                  hoveredMenuItem === "delete"
                    ? "var(--hex-error-muted, rgba(239,68,68,0.12))"
                    : "transparent",
                transition: "var(--hex-transition-fast, 100ms ease)",
              }}
              onClick={() => {
                setConfirmDelete(contextMenu.path);
                setContextMenu(null);
              }}
            >
              Delete
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          data-testid="delete-confirm"
          style={{
            padding: "8px 12px",
            fontSize: 12,
            background: "var(--hex-error-muted, rgba(239,68,68,0.12))",
            border: "1px solid var(--hex-error, #ef4444)",
            borderRadius: "var(--hex-radius-md, 6px)",
            margin: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--hex-text-primary, #1e293b)" }}>Delete {confirmDelete}?</span>
          <button
            data-testid="confirm-delete-yes"
            onClick={() => {
              onDelete?.(confirmDelete);
              setConfirmDelete(null);
            }}
            style={{
              padding: "3px 10px",
              cursor: "pointer",
              border: "1px solid var(--hex-error, #ef4444)",
              borderRadius: "var(--hex-radius-sm, 4px)",
              background: "var(--hex-error, #ef4444)",
              color: "var(--hex-text-inverse, #ffffff)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Yes
          </button>
          <button
            data-testid="confirm-delete-no"
            onClick={() => setConfirmDelete(null)}
            style={{
              padding: "3px 10px",
              cursor: "pointer",
              border: "1px solid var(--hex-border, #e2e8f0)",
              borderRadius: "var(--hex-radius-sm, 4px)",
              background: "var(--hex-bg-primary, #ffffff)",
              color: "var(--hex-text-primary, #1e293b)",
              fontSize: 12,
            }}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
