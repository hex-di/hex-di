/**
 * Hook for registering a container with DevTools.
 *
 * @packageDocumentation
 */

import { useContext, useEffect, useMemo } from "react";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import type { Port } from "@hex-di/ports";
import { getInspectorAPI } from "@hex-di/inspector";
import type { ContainerKind } from "@hex-di/devtools-core";
import { ContainerRegistryContext } from "../context/container-registry.js";

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
 * Requires InspectorPlugin to be registered on the container for full
 * inspection capabilities. If InspectorPlugin is not present, the hook
 * will silently do nothing.
 *
 * @example Register a root container
 * ```typescript
 * import { useRegisterContainer } from "@hex-di/devtools/react";
 * import { createInspectorPlugin } from "@hex-di/inspector";
 *
 * function AppContainer({ graph, children }) {
 *   const { plugin, bindContainer } = createInspectorPlugin();
 *   const container = useMemo(
 *     () => createContainer(graph, { plugins: [plugin] }),
 *     [graph, plugin]
 *   );
 *
 *   useEffect(() => {
 *     bindContainer(container);
 *   }, [bindContainer, container]);
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
 * function FeatureContainer({ parentContainer, graph, children }) {
 *   const { plugin, bindContainer } = createInspectorPlugin();
 *   const container = useMemo(
 *     () => createChildContainer(parentContainer, graph, { plugins: [plugin] }),
 *     [parentContainer, graph, plugin]
 *   );
 *
 *   useEffect(() => {
 *     bindContainer(container);
 *   }, [bindContainer, container]);
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
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = ContainerPhase,
>(
  container: Container<TProvides, TExtends, TAsyncPorts, TPhase>,
  options: UseRegisterContainerOptions
): void {
  const registry = useContext(ContainerRegistryContext);
  const inspector = useMemo(() => getInspectorAPI(container), [container]);

  useEffect(() => {
    // Skip if registry is not available or inspector plugin is not registered
    if (registry === null || inspector === undefined) {
      return;
    }

    registry.registerContainer({
      id: options.id,
      label: options.label,
      kind: options.kind,
      inspector,
      parentId: options.parentId ?? null,
      createdAt: Date.now(),
    });

    return () => {
      registry.unregisterContainer(options.id);
    };
  }, [registry, inspector, options.id, options.label, options.kind, options.parentId]);
}
