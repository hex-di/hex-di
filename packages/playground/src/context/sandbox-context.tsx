/**
 * Sandbox Context
 *
 * Provides sandbox lifecycle state (status, run, console entries)
 * to all descendant components. Wraps SandboxManager and
 * PlaygroundInspectorBridge.
 *
 * @packageDocumentation
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SandboxManager, SandboxState } from "../sandbox/sandbox-manager.js";
import type { PlaygroundInspectorBridge } from "../adapter/playground-inspector-bridge.js";
import type { ConsoleEntry } from "../sandbox/worker-protocol.js";
import type { VirtualFS } from "../editor/virtual-fs.js";

// =============================================================================
// Types
// =============================================================================

/** Simplified status derived from SandboxState for UI consumers. */
export type SandboxStatus = "idle" | "compiling" | "executing" | "complete" | "error";

/**
 * The sandbox context value.
 */
export interface SandboxContextValue {
  /** The SandboxManager instance. */
  readonly sandboxManager: SandboxManager;
  /** Current sandbox status. */
  readonly status: SandboxStatus;
  /** Run the current workspace code. */
  run(): void;
  /** Console entries from the last execution. */
  readonly consoleEntries: readonly ConsoleEntry[];
  /** Clear all console entries. */
  clearConsole(): void;
  /** The PlaygroundInspectorBridge for data source. */
  readonly bridge: PlaygroundInspectorBridge;
}

// =============================================================================
// Context
// =============================================================================

const SandboxReactContext = createContext<SandboxContextValue | null>(null);
SandboxReactContext.displayName = "HexDI.SandboxContext";

// =============================================================================
// Provider Props
// =============================================================================

interface SandboxProviderProps {
  /** The SandboxManager instance. */
  readonly sandboxManager: SandboxManager;
  /** The VirtualFS instance to read files from. */
  readonly virtualFS: VirtualFS;
  /** Entry point file to compile. Defaults to "main.ts". */
  readonly entryPoint?: string;
  readonly children: React.ReactNode;
}

// =============================================================================
// Helpers
// =============================================================================

function toStatus(state: SandboxState): SandboxStatus {
  return state.phase;
}

// =============================================================================
// Provider
// =============================================================================

/**
 * SandboxProvider supplies sandbox lifecycle state to all
 * descendant playground components.
 */
function SandboxProvider(props: SandboxProviderProps): React.ReactElement {
  const { sandboxManager, virtualFS, entryPoint = "main.ts", children } = props;

  const [status, setStatus] = useState<SandboxStatus>(() => toStatus(sandboxManager.state));
  const [consoleEntries, setConsoleEntries] = useState<readonly ConsoleEntry[]>([]);

  // Keep entryPoint in a ref so run() always uses the latest
  const entryPointRef = useRef(entryPoint);
  entryPointRef.current = entryPoint;

  // Subscribe to sandbox state changes
  useEffect(() => {
    const unsubscribe = sandboxManager.subscribe(state => {
      setStatus(toStatus(state));
    });
    return unsubscribe;
  }, [sandboxManager]);

  const run = useCallback(() => {
    // Prevent running if already compiling/executing
    if (status === "compiling" || status === "executing") {
      return;
    }

    // Clear previous console entries
    setConsoleEntries([]);

    const files = virtualFS.getAll();
    sandboxManager.execute(files, entryPointRef.current).then(
      result => {
        setConsoleEntries(result.consoleEntries);
      },
      () => {
        // Error handled by sandbox state machine
      }
    );
  }, [sandboxManager, virtualFS, status]);

  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  const contextValue = useMemo<SandboxContextValue>(
    () => ({
      sandboxManager,
      status,
      run,
      consoleEntries,
      clearConsole,
      bridge: sandboxManager.bridge,
    }),
    [sandboxManager, status, run, consoleEntries, clearConsole]
  );

  return (
    <SandboxReactContext.Provider value={contextValue}>{children}</SandboxReactContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the SandboxContext value.
 *
 * @throws {Error} If used outside a SandboxProvider.
 */
function useSandboxContext(): SandboxContextValue {
  const context = useContext(SandboxReactContext);
  if (context === null) {
    throw new Error(
      "useSandboxContext must be used within a SandboxProvider. " +
        "Ensure your component is wrapped in a SandboxProvider component."
    );
  }
  return context;
}

export { SandboxProvider, useSandboxContext };
export type { SandboxProviderProps };
