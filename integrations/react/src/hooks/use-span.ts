/**
 * useSpan hook for accessing the active span from the tracer.
 *
 * This hook provides access to the currently active span for conditional
 * logic and adding attributes to the current trace context.
 *
 * @packageDocumentation
 */

import type { Span } from "@hex-di/tracing";
import { useTracer } from "./use-tracer.js";

/**
 * Hook that returns the currently active span, if any.
 *
 * Use this hook when you need to check if code is running within a traced
 * context, or to add attributes to the currently active span.
 *
 * @returns The active Span, or undefined if no span is active
 *
 * @remarks
 * - Does not throw if no span is active (returning undefined is valid)
 * - Requires TracingProvider ancestor (useTracer throws if missing)
 * - The active span changes as spans start and end
 * - Most components should use useTracedCallback instead of manual span access
 *
 * @example Conditional tracing
 * ```tsx
 * function MyComponent() {
 *   const span = useSpan();
 *
 *   useEffect(() => {
 *     // Only add attributes if we're in a traced context
 *     if (span) {
 *       span.setAttribute('component.mounted', true);
 *       span.setAttribute('component.name', 'MyComponent');
 *     }
 *   }, [span]);
 *
 *   return <div>Hello</div>;
 * }
 * ```
 *
 * @example Adding render-time attributes
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const span = useSpan();
 *
 *   // Add user context to active span if present
 *   if (span) {
 *     span.setAttribute('user.id', userId);
 *   }
 *
 *   return <div>Profile for {userId}</div>;
 * }
 * ```
 *
 * @example Checking trace context
 * ```tsx
 * function DebugPanel() {
 *   const span = useSpan();
 *   const isTracing = span !== undefined;
 *
 *   if (!isTracing) {
 *     return <div>Not currently tracing</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Trace ID: {span.context.traceId}</p>
 *       <p>Span ID: {span.context.spanId}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpan(): Span | undefined {
  const tracer = useTracer();
  return tracer.getActiveSpan();
}
