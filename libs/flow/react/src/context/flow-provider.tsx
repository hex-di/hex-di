/**
 * FlowProvider Component
 *
 * Optional context provider for advanced use cases that need to share
 * a FlowCollector across the component tree.
 *
 * @packageDocumentation
 */

import { createContext, use, useContext, useEffect, type ReactNode } from "react";
import type { FlowCollector, FlowServiceAny } from "@hex-di/flow";

// =============================================================================
// Flow Context
// =============================================================================

/**
 * React context for FlowCollector.
 *
 * This context is optional - FlowService machines work without it.
 * Use it when you need to share a collector for DevTools integration
 * or centralized transition logging.
 *
 * @internal
 */
const FlowCollectorContext = createContext<FlowCollector | undefined>(undefined);
FlowCollectorContext.displayName = "FlowCollectorContext";

// =============================================================================
// FlowProvider Props
// =============================================================================

/**
 * Props for the FlowProvider component.
 */
export interface FlowProviderProps {
  /**
   * The FlowCollector instance to provide to descendants.
   *
   * Use FlowMemoryCollector for development/debugging or
   * NoOpFlowCollector (or omit FlowProvider entirely) for production.
   */
  readonly collector: FlowCollector;

  /**
   * Optional FlowService to manage lifecycle for.
   *
   * When provided, the FlowProvider will dispose the service on unmount.
   * This ties the machine lifecycle to the component tree.
   */
  readonly service?: FlowServiceAny;

  /**
   * Optional async FlowService for Suspense integration.
   *
   * When provided, the component suspends until the promise resolves.
   * Wrap in a `<Suspense>` boundary to show a fallback while loading.
   * The resolved service is disposed on unmount.
   *
   * @example
   * ```tsx
   * <Suspense fallback={<Loading />}>
   *   <FlowProvider collector={collector} asyncService={initService()}>
   *     <App />
   *   </FlowProvider>
   * </Suspense>
   * ```
   */
  readonly asyncService?: Promise<FlowServiceAny>;

  /**
   * React children that will have access to the collector via useFlowCollector.
   */
  readonly children: ReactNode;
}

// =============================================================================
// FlowProvider Component
// =============================================================================

/**
 * Optional context provider for sharing a FlowCollector across the component tree.
 *
 * FlowProvider enables advanced use cases like:
 * - DevTools integration for visualizing state machine transitions
 * - Centralized transition logging
 * - Test utilities that need to inspect machine behavior
 *
 * @param props - The provider props including collector and children
 *
 * @remarks
 * - This is an optional provider - machines work without it
 * - For production, consider using NoOpFlowCollector or omitting the provider
 * - For development, FlowMemoryCollector enables transition history
 *
 * @example Basic usage with memory collector
 * ```tsx
 * import { FlowProvider } from '@hex-di/flow-react';
 * import { FlowMemoryCollector } from '@hex-di/flow';
 *
 * const collector = new FlowMemoryCollector();
 *
 * function App() {
 *   return (
 *     <HexDiContainerProvider container={container}>
 *       <FlowProvider collector={collector}>
 *         <MyApp />
 *         <FlowDevTools />
 *       </FlowProvider>
 *     </HexDiContainerProvider>
 *   );
 * }
 * ```
 *
 * @example Production setup (zero overhead)
 * ```tsx
 * import { noopFlowCollector } from '@hex-di/flow';
 *
 * // Option 1: Use noop collector (minimal overhead)
 * function App() {
 *   return (
 *     <FlowProvider collector={noopFlowCollector}>
 *       <MyApp />
 *     </FlowProvider>
 *   );
 * }
 *
 * // Option 2: Omit FlowProvider entirely (zero overhead)
 * function App() {
 *   return <MyApp />;
 * }
 * ```
 */
export function FlowProvider({
  collector,
  service,
  asyncService,
  children,
}: FlowProviderProps): React.ReactNode {
  // When asyncService is provided, unwrap it via React 19 use() hook.
  // This suspends the component until the promise resolves, integrating
  // naturally with <Suspense> boundaries.
  const resolvedAsyncService = asyncService !== undefined ? use(asyncService) : undefined;

  // The effective service is either the sync service or the resolved async one
  const effectiveService = service ?? resolvedAsyncService;

  // When a service is provided, dispose it on unmount
  useEffect(() => {
    if (!effectiveService) return;

    return () => {
      void effectiveService.dispose();
    };
  }, [effectiveService]);

  return (
    <FlowCollectorContext.Provider value={collector}>{children}</FlowCollectorContext.Provider>
  );
}

// =============================================================================
// useFlowCollector Hook
// =============================================================================

/**
 * Hook to access the FlowCollector from the nearest FlowProvider.
 *
 * Returns undefined if no FlowProvider is present in the component tree.
 * This is intentional - FlowCollector is optional and machines work without it.
 *
 * @returns The FlowCollector instance, or undefined if not provided
 *
 * @example
 * ```tsx
 * function FlowDevTools() {
 *   const collector = useFlowCollector();
 *
 *   if (!collector) {
 *     return <div>FlowProvider not found</div>;
 *   }
 *
 *   const transitions = collector.getTransitions();
 *   return (
 *     <ul>
 *       {transitions.map(t => (
 *         <li key={t.id}>{t.prevState} -> {t.nextState}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useFlowCollector(): FlowCollector | undefined {
  return useContext(FlowCollectorContext);
}
