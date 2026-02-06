/**
 * TracingProvider component for @hex-di/react.
 *
 * Provides the TracingProvider that makes a tracer available to React components.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { Tracer } from "@hex-di/tracing";
import { TracingContext, type TracingContextValue } from "../context/tracing-context.js";

// =============================================================================
// TracingProvider Component
// =============================================================================

/**
 * Props for the TracingProvider component.
 */
export interface TracingProviderProps {
  /**
   * The tracer instance to provide to the React tree.
   *
   * @remarks
   * The tracer must be created externally using `createMemoryTracer`,
   * `createConsoleTracer`, or other tracer implementations from @hex-di/tracing.
   * The Provider does not create or manage the tracer's lifecycle -
   * the caller is responsible for configuration and cleanup.
   */
  readonly tracer: Tracer;

  /**
   * React children that will have access to the tracer via hooks.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that makes a tracer available to React components.
 *
 * TracingProvider establishes tracing context in React. All tracing hooks
 * (useTracer, useSpan, useTracedCallback) require a TracingProvider ancestor.
 *
 * @param props - The provider props including tracer and children
 *
 * @remarks
 * - The tracer prop should come from tracing adapter factories in @hex-di/tracing
 * - Provider does NOT manage tracer lifecycle - caller owns configuration
 * - Children can access tracer via useTracer hook
 * - Children can get active span via useSpan hook
 * - Children can create traced callbacks via useTracedCallback hook
 *
 * @example Basic usage
 * ```tsx
 * import { createMemoryTracer } from '@hex-di/tracing';
 * import { TracingProvider, useTracer } from '@hex-di/react';
 *
 * const tracer = createMemoryTracer();
 *
 * function App() {
 *   return (
 *     <TracingProvider tracer={tracer}>
 *       <MyComponent />
 *     </TracingProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const tracer = useTracer();
 *   tracer.withSpan('render', (span) => {
 *     span.setAttribute('component', 'MyComponent');
 *   });
 *   return <div>Hello</div>;
 * }
 * ```
 *
 * @example With container instrumentation
 * ```tsx
 * import { createContainer } from '@hex-di/runtime';
 * import { instrumentContainer, createMemoryTracer } from '@hex-di/tracing';
 * import { HexDiContainerProvider, TracingProvider } from '@hex-di/react';
 *
 * const tracer = createMemoryTracer();
 * const container = createContainer(graph);
 * instrumentContainer(container, tracer);
 *
 * function App() {
 *   return (
 *     <TracingProvider tracer={tracer}>
 *       <HexDiContainerProvider container={container}>
 *         <MyComponent />
 *       </HexDiContainerProvider>
 *     </TracingProvider>
 *   );
 * }
 * ```
 */
export function TracingProvider({ tracer, children }: TracingProviderProps): React.ReactNode {
  const contextValue: TracingContextValue = {
    tracer,
  };

  return <TracingContext.Provider value={contextValue}>{children}</TracingContext.Provider>;
}
