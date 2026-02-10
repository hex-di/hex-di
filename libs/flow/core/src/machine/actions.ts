/**
 * Action Factories and Combinators
 *
 * This module provides named actions and action combinators for composing
 * context transformations in a readable, testable manner.
 *
 * Named actions carry a human-readable name for debugging/tracing.
 * The `composeActions` combinator chains multiple actions into a single
 * named action that applies them in sequence.
 *
 * @packageDocumentation
 */

// =============================================================================
// Action Type
// =============================================================================

/**
 * An action function that transforms context during a state transition.
 *
 * @typeParam TContext - The machine context type
 * @typeParam TEvent - The event type
 */
export type Action<TContext, TEvent> = (context: TContext, event: TEvent) => TContext;

// =============================================================================
// Named Action Type
// =============================================================================

/**
 * An action function with a human-readable name for debugging and tracing.
 *
 * Named actions carry metadata that can be used by DevTools, loggers,
 * and error messages to identify which action was executed.
 *
 * @typeParam TContext - The machine context type
 * @typeParam TEvent - The event type
 */
export interface NamedAction<TContext, TEvent> {
  (context: TContext, event: TEvent): TContext;
  readonly actionName: string;
}

// =============================================================================
// Action Factory
// =============================================================================

/**
 * Creates a named action from a context-transforming function.
 *
 * The returned action is callable as a regular function and also
 * carries an `.actionName` property for debugging/tracing.
 *
 * @param name - A human-readable name for the action
 * @param fn - The action function
 * @returns A named action function
 *
 * @example
 * ```typescript
 * const incrementRetry = defineAction('incrementRetry', (ctx) => ({
 *   ...ctx,
 *   retryCount: ctx.retryCount + 1,
 * }));
 *
 * // Use as a regular action
 * const machine = defineMachine({
 *   states: {
 *     error: {
 *       on: {
 *         RETRY: { target: 'loading', actions: [incrementRetry] },
 *       },
 *     },
 *   },
 * });
 *
 * // Access the name for debugging
 * incrementRetry.actionName === 'incrementRetry';
 * ```
 */
export function defineAction<TContext, TEvent>(
  name: string,
  fn: Action<TContext, TEvent>
): NamedAction<TContext, TEvent> {
  // @ts-expect-error - NamedAction extends the function signature with a readonly actionName property.
  // The function below has the correct call signature but lacks actionName until defineProperty adds it.
  // TypeScript has no mechanism to narrow types through Object.defineProperty calls.
  const namedAction: NamedAction<TContext, TEvent> = (context: TContext, event: TEvent): TContext =>
    fn(context, event);

  Object.defineProperty(namedAction, "actionName", {
    value: name,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  return namedAction;
}

// =============================================================================
// Action Combinator
// =============================================================================

/**
 * Composes multiple actions into a single named action.
 *
 * The resulting action applies each action in order, threading the context
 * through each one. The final context value is returned.
 *
 * @param actions - The actions to compose
 * @returns A named action that applies all actions in sequence
 *
 * @example
 * ```typescript
 * const incrementRetry = defineAction('incrementRetry', (ctx) => ({
 *   ...ctx,
 *   retryCount: ctx.retryCount + 1,
 * }));
 *
 * const clearError = defineAction('clearError', (ctx) => ({
 *   ...ctx,
 *   error: null,
 * }));
 *
 * const prepareRetry = composeActions(incrementRetry, clearError);
 * // prepareRetry.actionName === 'compose(incrementRetry, clearError)'
 * ```
 */
export function composeActions<TContext, TEvent>(
  ...actions: readonly Action<TContext, TEvent>[]
): NamedAction<TContext, TEvent> {
  const names = actions.map(getActionName);
  return defineAction(`compose(${names.join(", ")})`, (ctx, evt) => {
    let current = ctx;
    for (const action of actions) {
      current = action(current, evt);
    }
    return current;
  });
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Extracts an action name from an action function.
 *
 * Returns the `.actionName` property if available (NamedAction),
 * otherwise falls back to `.name` (Function name) or "anonymous".
 *
 * @internal
 */
function getActionName<TContext, TEvent>(action: Action<TContext, TEvent>): string {
  if ("actionName" in action && typeof action.actionName === "string") {
    return action.actionName;
  }
  return action.name || "anonymous";
}
