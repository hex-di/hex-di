/**
 * useTracedCallback hook for creating callbacks wrapped in spans.
 *
 * This hook provides automatic span management for callback functions,
 * ensuring proper trace context propagation and error handling.
 *
 * @packageDocumentation
 */

import { useCallback, type DependencyList } from "react";
import { useTracer } from "./use-tracer.js";

/**
 * Hook that creates a traced callback function with automatic span management.
 *
 * Similar to React.useCallback, but wraps the callback execution in a span.
 * The span is automatically started when the callback is invoked and ended
 * when the callback completes (successfully or with an error).
 *
 * @typeParam TArgs - Tuple type of callback arguments
 * @typeParam TReturn - Return type of the callback
 *
 * @param name - Human-readable span name for the callback (e.g., 'button.click', 'form.submit')
 * @param callback - The callback function to wrap with tracing
 * @param deps - Dependency array for useCallback (same as React.useCallback)
 *
 * @returns A memoized callback function that creates a span when invoked
 *
 * @remarks
 * - Works with both sync and async callbacks
 * - Errors are automatically recorded to the span before re-throwing
 * - The tracer is automatically included in the dependency array
 * - Preserves callback signature and return type
 * - Follows React hooks rules (must be called unconditionally)
 *
 * @example Button click handler
 * ```tsx
 * function SaveButton() {
 *   const handleSave = useTracedCallback(
 *     'button.save.click',
 *     (event: React.MouseEvent) => {
 *       console.log('Save clicked');
 *       // Span automatically created and ended
 *     },
 *     []
 *   );
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 *
 * @example Async callback with attributes
 * ```tsx
 * function DataLoader() {
 *   const [userId, setUserId] = useState('123');
 *
 *   const loadData = useTracedCallback(
 *     'data.load',
 *     async () => {
 *       const data = await fetchUserData(userId);
 *       return data;
 *     },
 *     [userId]
 *   );
 *
 *   return <button onClick={loadData}>Load Data</button>;
 * }
 * ```
 *
 * @example Form submission
 * ```tsx
 * function LoginForm() {
 *   const handleSubmit = useTracedCallback(
 *     'form.login.submit',
 *     async (event: React.FormEvent) => {
 *       event.preventDefault();
 *       const form = event.currentTarget as HTMLFormElement;
 *       const username = form.username.value;
 *       await loginUser(username);
 *     },
 *     []
 *   );
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 *
 * @example Access to span for custom attributes
 * ```tsx
 * function SearchBox() {
 *   const handleSearch = useTracedCallback(
 *     'search.execute',
 *     (query: string) => {
 *       // Note: Can't directly access span in callback
 *       // Use tracer.withSpan if you need span access
 *       performSearch(query);
 *     },
 *     []
 *   );
 *
 *   return <input onChange={(e) => handleSearch(e.target.value)} />;
 * }
 * ```
 */
export function useTracedCallback<TArgs extends readonly unknown[], TReturn>(
  name: string,
  callback: (...args: TArgs) => TReturn,
  deps: DependencyList
): (...args: TArgs) => TReturn {
  const tracer = useTracer();

  return useCallback(
    (...args: TArgs): TReturn => {
      // Try to execute callback and detect if it's async
      let result: TReturn;
      let isAsync = false;

      try {
        result = callback(...args);
        isAsync = result instanceof Promise;
      } catch (error) {
        // If callback throws synchronously, wrap in span to record error
        return tracer.withSpan(name, span => {
          span.recordException(error instanceof Error ? error : String(error));
          throw error;
        });
      }

      // If result is a Promise, use withSpanAsync
      if (isAsync) {
        return tracer.withSpanAsync(name, async () => {
          return await result;
        }) as TReturn;
      }

      // Otherwise, use synchronous withSpan
      return tracer.withSpan(name, () => {
        return result;
      });
    },
    // Include tracer in deps to ensure callback updates if tracer changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracer, name, ...deps]
  );
}
