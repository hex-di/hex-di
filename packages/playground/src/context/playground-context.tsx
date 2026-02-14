/**
 * Playground Context
 *
 * Top-level playground state context providing the virtual filesystem,
 * active file management, open files tracking, and modification state.
 *
 * @packageDocumentation
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import type { VirtualFS } from "../editor/virtual-fs.js";
import { createVirtualFS } from "../editor/virtual-fs.js";

// =============================================================================
// Types
// =============================================================================

/**
 * The playground context value.
 */
export interface PlaygroundContextValue {
  /** The virtual filesystem instance. */
  readonly virtualFS: VirtualFS;
  /** The currently active (focused) file path. */
  readonly activeFile: string;
  /** Set the active file path. */
  setActiveFile(path: string): void;
  /** Currently open files shown in the tab bar. */
  readonly openFiles: readonly string[];
  /** Open a file (add to open files and set as active). */
  openFile(path: string): void;
  /** Close a file (remove from open files). */
  closeFile(path: string): void;
  /** Whether the workspace has been modified since last load/save. */
  readonly isModified: boolean;
  /** Mark the current state as the saved baseline. */
  markSaved(): void;
}

// =============================================================================
// Context
// =============================================================================

const PlaygroundReactContext = createContext<PlaygroundContextValue | null>(null);
PlaygroundReactContext.displayName = "HexDI.PlaygroundContext";

// =============================================================================
// Provider Props
// =============================================================================

interface PlaygroundProviderProps {
  /** Optional pre-created VirtualFS instance. */
  readonly virtualFS?: VirtualFS;
  /** Initial active file. Defaults to "main.ts". */
  readonly initialActiveFile?: string;
  /** Initial set of open files. Defaults to [initialActiveFile]. */
  readonly initialOpenFiles?: readonly string[];
  readonly children: React.ReactNode;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Serialize a VirtualFS state to a comparable string for modification tracking.
 */
function snapshotFS(vfs: VirtualFS): string {
  const all = vfs.getAll();
  const entries = [...all.entries()].sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

// =============================================================================
// Provider
// =============================================================================

/**
 * PlaygroundProvider supplies virtual filesystem and file management
 * state to all descendant playground components.
 */
function PlaygroundProvider(props: PlaygroundProviderProps): React.ReactElement {
  const { initialActiveFile = "main.ts", initialOpenFiles, children } = props;

  // Create or use provided VirtualFS
  const vfsRef = useRef(props.virtualFS ?? createVirtualFS());
  const virtualFS = vfsRef.current;

  // Active file
  const [activeFile, setActiveFile] = useState<string>(initialActiveFile);

  // Open files
  const [openFiles, setOpenFiles] = useState<readonly string[]>(
    () => initialOpenFiles ?? [initialActiveFile]
  );

  // Modification tracking: store a snapshot of the "saved" state
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => snapshotFS(virtualFS));
  const [currentSnapshot, setCurrentSnapshot] = useState<string>(() => snapshotFS(virtualFS));

  // Subscribe to VFS changes to update the current snapshot
  useEffect(() => {
    const unsubscribe = virtualFS.subscribe(() => {
      setCurrentSnapshot(snapshotFS(virtualFS));
    });
    return unsubscribe;
  }, [virtualFS]);

  const isModified = savedSnapshot !== currentSnapshot;

  const markSaved = useCallback(() => {
    setSavedSnapshot(snapshotFS(virtualFS));
  }, [virtualFS]);

  const openFile = useCallback((path: string) => {
    setOpenFiles(prev => {
      if (prev.includes(path)) return prev;
      return [...prev, path];
    });
    setActiveFile(path);
  }, []);

  const closeFile = useCallback(
    (path: string) => {
      setOpenFiles(prev => {
        const next = prev.filter(f => f !== path);
        return next;
      });
      // If closing the active file, switch to the last open file or "main.ts"
      setActiveFile(current => {
        if (current !== path) return current;
        const remaining = openFiles.filter(f => f !== path);
        return remaining.length > 0 ? remaining[remaining.length - 1] : "main.ts";
      });
    },
    [openFiles]
  );

  const contextValue = useMemo<PlaygroundContextValue>(
    () => ({
      virtualFS,
      activeFile,
      setActiveFile,
      openFiles,
      openFile,
      closeFile,
      isModified,
      markSaved,
    }),
    [virtualFS, activeFile, openFiles, openFile, closeFile, isModified, markSaved]
  );

  return (
    <PlaygroundReactContext.Provider value={contextValue}>
      {children}
    </PlaygroundReactContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the PlaygroundContext value.
 *
 * @throws {Error} If used outside a PlaygroundProvider.
 */
function usePlaygroundContext(): PlaygroundContextValue {
  const context = useContext(PlaygroundReactContext);
  if (context === null) {
    throw new Error(
      "usePlaygroundContext must be used within a PlaygroundProvider. " +
        "Ensure your component is wrapped in a PlaygroundProvider component."
    );
  }
  return context;
}

export { PlaygroundProvider, usePlaygroundContext };
export type { PlaygroundProviderProps };
