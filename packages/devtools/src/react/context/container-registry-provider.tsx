/**
 * HexDiDevToolsProvider for multi-container DevTools support.
 *
 * Provides a context for tracking all containers (root, child, lazy, scope)
 * in the application and managing selection state for the DevTools inspector.
 *
 * Uses Rust-like Option<T> for optional values instead of nullable types.
 *
 * @packageDocumentation
 */

import React, { useState, useCallback, useMemo, type ReactNode, type ReactElement } from "react";
import {
  ContainerRegistryContext,
  type ContainerEntry,
  type ContainerRegistryValue,
} from "./container-registry.js";
import { Some, None, isSome, type Option } from "../types/adt.js";

/**
 * Props for HexDiDevToolsProvider component.
 */
export interface HexDiDevToolsProviderProps {
  /** Child components that will have access to container registry */
  readonly children: ReactNode;
}

/**
 * Root provider for multi-container DevTools.
 *
 * Place at the top of your app, above all HexDiContainerProviders, to enable
 * tracking of all containers. Components can register containers using
 * useRegisterContainer and access them via useContainerList and useContainerInspector.
 *
 * Uses Option<T> for selection state, enabling exhaustive pattern matching
 * instead of null checks.
 *
 * @example Basic usage
 * ```typescript
 * import { HexDiDevToolsProvider } from "@hex-di/devtools/react";
 *
 * function App() {
 *   return (
 *     <HexDiDevToolsProvider>
 *       <MainApp />
 *       <HexDiDevTools />
 *     </HexDiDevToolsProvider>
 *   );
 * }
 * ```
 */
export function HexDiDevToolsProvider({ children }: HexDiDevToolsProviderProps): ReactElement {
  const [containers, setContainers] = useState<Map<string, ContainerEntry>>(() => new Map());
  const [selectedId, setSelectedId] = useState<Option<string>>(None);

  const registerContainer = useCallback((entry: ContainerEntry): void => {
    setContainers(prev => {
      // Skip if entry already exists to prevent infinite loops
      const existing = prev.get(entry.id);
      if (existing !== undefined) {
        return prev; // Return same reference to avoid re-render
      }
      const next = new Map(prev);
      next.set(entry.id, entry);
      return next;
    });
    // Auto-select first container
    setSelectedId(current => (isSome(current) ? current : Some(entry.id)));
  }, []);

  const unregisterContainer = useCallback((id: string): void => {
    setContainers(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setSelectedId(current => (isSome(current) && current.value === id ? None : current));
  }, []);

  const selectContainer = useCallback((id: Option<string>): void => {
    setSelectedId(id);
  }, []);

  const value = useMemo((): ContainerRegistryValue => {
    const entry = isSome(selectedId) ? containers.get(selectedId.value) : undefined;

    return {
      containers,
      selectedId,
      selectContainer,
      selectedContainer: entry !== undefined ? Some(entry.container) : None,
      selectedEntry: entry !== undefined ? Some(entry) : None,
      registerContainer,
      unregisterContainer,
    };
  }, [containers, selectedId, selectContainer, registerContainer, unregisterContainer]);

  return (
    <ContainerRegistryContext.Provider value={value}>{children}</ContainerRegistryContext.Provider>
  );
}
