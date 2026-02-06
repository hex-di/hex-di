/**
 * useTracer hook for accessing the tracer from TracingProvider.
 *
 * This hook provides access to the tracer instance for creating spans
 * and managing trace context in React components.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Tracer } from "@hex-di/tracing";
import { TracingContext } from "../context/tracing-context.js";
import { MissingProviderError } from "../errors.js";

/**
 * Hook that returns the tracer from the nearest TracingProvider.
 *
 * Use this hook when you need direct access to the tracer for creating
 * spans, getting active span context, or other tracing operations.
 *
 * @returns The Tracer instance from TracingProvider
 *
 * @throws {MissingProviderError} If called outside a TracingProvider.
 *   This indicates a programming error - components using useTracer
 *   must be descendants of a TracingProvider.
 *
 * @remarks
 * - For most use cases, prefer useTracedCallback for automatic span management
 * - The returned tracer is the same reference across renders
 * - Use useSpan to check for active spans in the current context
 *
 * @example Basic usage
 * ```tsx
 * function MyComponent() {
 *   const tracer = useTracer();
 *
 *   useEffect(() => {
 *     tracer.withSpan('component.mount', (span) => {
 *       span.setAttribute('component', 'MyComponent');
 *     });
 *   }, [tracer]);
 *
 *   return <div>Hello</div>;
 * }
 * ```
 *
 * @example Manual span management
 * ```tsx
 * function DataLoader() {
 *   const tracer = useTracer();
 *
 *   const loadData = async () => {
 *     const span = tracer.startSpan('data.load');
 *     try {
 *       const data = await fetchData();
 *       span.setAttribute('items.count', data.length);
 *       return data;
 *     } catch (error) {
 *       span.recordException(error);
 *       throw error;
 *     } finally {
 *       span.end();
 *     }
 *   };
 *
 *   return <button onClick={loadData}>Load Data</button>;
 * }
 * ```
 */
export function useTracer(): Tracer {
  const context = useContext(TracingContext);

  if (context === null) {
    throw new MissingProviderError("useTracer", "TracingProvider");
  }

  return context.tracer;
}
