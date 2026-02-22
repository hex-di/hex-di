/**
 * Hook for cross-panel navigation from the graph panel.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import type { GraphNavigationSelection } from "./types.js";

type NavigateToCallback = (panel: string, params?: Record<string, string>) => void;

interface UseGraphNavigationOptions {
  readonly navigateTo?: NavigateToCallback;
}

interface GraphNavigation {
  navigateToContainer(containerName: string): void;
  navigateToPort(portName: string): void;
  navigateToTracing(portName: string): void;
  navigateToHealth(): void;
  handleInboundNavigation(selection: GraphNavigationSelection): void;
}

/**
 * Hook providing cross-panel navigation from the graph panel.
 */
function useGraphNavigation({ navigateTo }: UseGraphNavigationOptions): GraphNavigation {
  const navigateToContainer = useCallback(
    (containerName: string) => {
      navigateTo?.("container", { name: containerName });
    },
    [navigateTo]
  );

  const navigateToPort = useCallback(
    (portName: string) => {
      navigateTo?.("container", { port: portName });
    },
    [navigateTo]
  );

  const navigateToTracing = useCallback(
    (portName: string) => {
      navigateTo?.("tracing", { port: portName });
    },
    [navigateTo]
  );

  const navigateToHealth = useCallback(() => {
    navigateTo?.("health");
  }, [navigateTo]);

  const handleInboundNavigation = useCallback(
    (selection: GraphNavigationSelection) => {
      if (selection.containerName !== undefined) {
        navigateToContainer(selection.containerName);
      } else {
        navigateToPort(selection.portName);
      }
    },
    [navigateToContainer, navigateToPort]
  );

  return {
    navigateToContainer,
    navigateToPort,
    navigateToTracing,
    navigateToHealth,
    handleInboundNavigation,
  };
}

export { useGraphNavigation };
export type { GraphNavigation, NavigateToCallback, UseGraphNavigationOptions };
