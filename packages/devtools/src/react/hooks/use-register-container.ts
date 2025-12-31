/**
 * Hook for registering a container with DevTools.
 *
 * Stores the container reference directly (as InspectableContainer trait object)
 * instead of InspectorAPI. This enables per-container RuntimeInspector creation,
 * fixing the bug where all containers showed root data.
 *
 * @packageDocumentation
 */

import { useContext, useEffect, useRef } from "react";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import type { ContainerKind } from "@hex-di/devtools-core";
import { ContainerRegistryContext } from "../context/container-registry.js";
import type { InspectableContainer } from "../types/inspectable-container.js";

/**
 * Options for registering a container with DevTools.
 */
export interface UseRegisterContainerOptions {
  /** Unique identifier for this container */
  readonly id: string;

  /** Human-readable label for display */
  readonly label: string;

  /** Container type (root, child, lazy, scope) */
  readonly kind: ContainerKind;

  /** Parent container ID, if any */
  readonly parentId?: string;
}

/**
 * Registers a container with DevTools for inspection.
 *
 * Call this hook in components that create or manage containers.
 * The container will be automatically unregistered when the component unmounts.
 *
 * Unlike the previous implementation that used getInspectorAPI (which returned
 * a shared InspectorAPI bound to the root container), this hook stores the
 * container reference directly. This enables createInspector() to be called
 * on the actual selected container.
 *
 * @example Register a root container
 * ```typescript
 * import { useRegisterContainer } from "@hex-di/devtools/react";
 *
 * function AppContainer({ graph, children }) {
 *   const container = useMemo(
 *     () => createContainer(graph),
 *     [graph]
 *   );
 *
 *   useRegisterContainer(container, {
 *     id: "root",
 *     label: "Root Container",
 *     kind: "root",
 *   });
 *
 *   return <ContainerProvider container={container}>{children}</ContainerProvider>;
 * }
 * ```
 *
 * @example Register a child container
 * ```typescript
 * function FeatureContainer({ parentContainer, extensionGraph, children }) {
 *   const container = useMemo(
 *     () => parentContainer.createChild().extend(extensionGraph).build(),
 *     [parentContainer, extensionGraph]
 *   );
 *
 *   useRegisterContainer(container, {
 *     id: "feature-auth",
 *     label: "Auth Feature",
 *     kind: "child",
 *     parentId: "root",
 *   });
 *
 *   return <ContainerProvider container={container}>{children}</ContainerProvider>;
 * }
 * ```
 */
export function useRegisterContainer<
  TProvides extends Port<TService, string>,
  TService,
  TExtends extends Port<TExtService, string> = never,
  TExtService = never,
  TAsyncPorts extends Port<TAsyncService, string> = never,
  TAsyncService = never,
  TPhase extends ContainerPhase = ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>,
  options: UseRegisterContainerOptions
): void {
  const registry = useContext(ContainerRegistryContext);

  // Use refs to avoid re-running effect when registry object changes
  // (registry callbacks are stable, but the object reference changes)
  const registryRef = useRef(registry);
  registryRef.current = registry;

  // Store container reference - Container satisfies InspectableContainer
  // via structural typing (trait object pattern)
  const containerRef = useRef<InspectableContainer>(container);
  containerRef.current = container;

  useEffect(() => {
    const currentRegistry = registryRef.current;
    // Skip if registry is not available
    if (currentRegistry === null) {
      return;
    }

    currentRegistry.registerContainer({
      id: options.id,
      label: options.label,
      kind: options.kind,
      container: containerRef.current,
      parentId: options.parentId ?? null,
      createdAt: Date.now(),
    });

    return () => {
      currentRegistry.unregisterContainer(options.id);
    };
  }, [options.id, options.label, options.kind, options.parentId]);
}
