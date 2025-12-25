/**
 * ContainerRegistryProvider for multi-container DevTools support.
 *
 * Provides a context for tracking all containers (root, child, lazy, scope)
 * in the application and managing selection state for the DevTools inspector.
 *
 * @packageDocumentation
 */

import React, { useState, useCallback, useMemo, type ReactNode, type ReactElement } from "react";
import {
  ContainerRegistryContext,
  type ContainerEntry,
  type ContainerRegistryValue,
} from "./container-registry.js";

/**
 * Props for ContainerRegistryProvider component.
 */
export interface ContainerRegistryProviderProps {
  /** Child components that will have access to container registry */
  readonly children: ReactNode;
}

/**
 * Root provider for multi-container DevTools.
 *
 * Place at the top of your app, above all ContainerProviders, to enable
 * tracking of all containers. Components can register containers using
 * useRegisterContainer and access them via useContainerList and useInspector.
 *
 * @example Basic usage
 * ```typescript
 * import { ContainerRegistryProvider } from "@hex-di/devtools/react";
 *
 * function App() {
 *   return (
 *     <ContainerRegistryProvider>
 *       <MainApp />
 *       <DevToolsPanel />
 *     </ContainerRegistryProvider>
 *   );
 * }
 * ```
 */
export function ContainerRegistryProvider({
  children,
}: ContainerRegistryProviderProps): ReactElement {
  const [containers, setContainers] = useState<Map<string, ContainerEntry>>(() => new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const registerContainer = useCallback((entry: ContainerEntry): void => {
    setContainers(prev => {
      const next = new Map(prev);
      next.set(entry.id, entry);
      return next;
    });
    // Auto-select first container
    setSelectedId(current => current ?? entry.id);
  }, []);

  const unregisterContainer = useCallback((id: string): void => {
    setContainers(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setSelectedId(current => (current === id ? null : current));
  }, []);

  const selectContainer = useCallback((id: string | null): void => {
    setSelectedId(id);
  }, []);

  const value = useMemo((): ContainerRegistryValue => {
    const selectedEntry = selectedId !== null ? (containers.get(selectedId) ?? null) : null;

    return {
      containers,
      selectedId,
      selectContainer,
      selectedInspector: selectedEntry?.inspector ?? null,
      selectedEntry,
      registerContainer,
      unregisterContainer,
    };
  }, [containers, selectedId, selectContainer, registerContainer, unregisterContainer]);

  return (
    <ContainerRegistryContext.Provider value={value}>{children}</ContainerRegistryContext.Provider>
  );
}
