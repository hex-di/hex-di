/**
 * Guard Factories and Combinators
 *
 * This module provides named guards and guard combinators for composing
 * complex guard logic in a readable, testable manner.
 *
 * Named guards carry a human-readable name for debugging/tracing.
 * Combinators compose guards using boolean logic (and, or, not).
 *
 * @packageDocumentation
 */

// =============================================================================
// Guard Type
// =============================================================================

/**
 * A guard predicate function that determines whether a transition should be taken.
 *
 * @typeParam TContext - The machine context type
 * @typeParam TEvent - The event type
 */
export type Guard<TContext, TEvent> = (context: TContext, event: TEvent) => boolean;

// =============================================================================
// Named Guard Type
// =============================================================================

/**
 * A guard function with a human-readable name for debugging and tracing.
 *
 * Named guards carry metadata that can be used by DevTools, loggers,
 * and error messages to identify which guard was evaluated.
 *
 * @typeParam TContext - The machine context type
 * @typeParam TEvent - The event type
 */
export interface NamedGuard<TContext, TEvent> {
  (context: TContext, event: TEvent): boolean;
  readonly guardName: string;
}

// =============================================================================
// Guard Factory
// =============================================================================

/**
 * Creates a named guard from a predicate function.
 *
 * The returned guard is callable as a regular function and also
 * carries a `.guardName` property for debugging/tracing.
 *
 * @param name - A human-readable name for the guard
 * @param predicate - The guard predicate function
 * @returns A named guard function
 *
 * @example
 * ```typescript
 * const canRetry = guard('canRetry', (ctx) => ctx.retryCount < 3);
 *
 * // Use as a regular guard
 * const machine = defineMachine({
 *   states: {
 *     error: {
 *       on: {
 *         RETRY: { target: 'loading', guard: canRetry },
 *       },
 *     },
 *   },
 * });
 *
 * // Access the name for debugging
 * canRetry.guardName === 'canRetry';
 * ```
 */
export function guard<TContext, TEvent>(
  name: string,
  predicate: Guard<TContext, TEvent>
): NamedGuard<TContext, TEvent> {
  // @ts-expect-error - NamedGuard extends the function signature with a readonly guardName property.
  // The function below has the correct call signature but lacks guardName until defineProperty adds it.
  // TypeScript has no mechanism to narrow types through Object.defineProperty calls.
  const namedGuard: NamedGuard<TContext, TEvent> = (context: TContext, event: TEvent): boolean =>
    predicate(context, event);

  Object.defineProperty(namedGuard, "guardName", {
    value: name,
    writable: false,
    enumerable: true,
    configurable: false,
  });

  return namedGuard;
}

// =============================================================================
// Guard Combinators
// =============================================================================

/**
 * Composes two guards with logical AND.
 *
 * The resulting guard returns true only if both guards return true.
 * Short-circuits: if the first guard returns false, the second is not evaluated.
 *
 * @param g1 - First guard
 * @param g2 - Second guard
 * @returns A named guard that is the conjunction of g1 and g2
 *
 * @example
 * ```typescript
 * const isAdmin = guard('isAdmin', (ctx) => ctx.role === 'admin');
 * const hasPermission = guard('hasPermission', (ctx) => ctx.permissions.includes('write'));
 *
 * const canEdit = and(isAdmin, hasPermission);
 * // canEdit.guardName === 'and(isAdmin, hasPermission)'
 * ```
 */
export function and<TContext, TEvent>(
  g1: Guard<TContext, TEvent>,
  g2: Guard<TContext, TEvent>
): NamedGuard<TContext, TEvent> {
  const name1 = getGuardName(g1);
  const name2 = getGuardName(g2);
  return guard(`and(${name1}, ${name2})`, (ctx, evt) => g1(ctx, evt) && g2(ctx, evt));
}

/**
 * Composes two guards with logical OR.
 *
 * The resulting guard returns true if either guard returns true.
 * Short-circuits: if the first guard returns true, the second is not evaluated.
 *
 * @param g1 - First guard
 * @param g2 - Second guard
 * @returns A named guard that is the disjunction of g1 and g2
 *
 * @example
 * ```typescript
 * const isAdmin = guard('isAdmin', (ctx) => ctx.role === 'admin');
 * const isOwner = guard('isOwner', (ctx) => ctx.userId === ctx.ownerId);
 *
 * const canAccess = or(isAdmin, isOwner);
 * // canAccess.guardName === 'or(isAdmin, isOwner)'
 * ```
 */
export function or<TContext, TEvent>(
  g1: Guard<TContext, TEvent>,
  g2: Guard<TContext, TEvent>
): NamedGuard<TContext, TEvent> {
  const name1 = getGuardName(g1);
  const name2 = getGuardName(g2);
  return guard(`or(${name1}, ${name2})`, (ctx, evt) => g1(ctx, evt) || g2(ctx, evt));
}

/**
 * Negates a guard.
 *
 * The resulting guard returns true when the input guard returns false,
 * and vice versa.
 *
 * @param g - The guard to negate
 * @returns A named guard that is the negation of g
 *
 * @example
 * ```typescript
 * const isLoading = guard('isLoading', (ctx) => ctx.loading);
 * const isNotLoading = not(isLoading);
 * // isNotLoading.guardName === 'not(isLoading)'
 * ```
 */
export function not<TContext, TEvent>(g: Guard<TContext, TEvent>): NamedGuard<TContext, TEvent> {
  const name = getGuardName(g);
  return guard(`not(${name})`, (ctx, evt) => !g(ctx, evt));
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Extracts a guard name from a guard function.
 *
 * Returns the `.guardName` property if available (NamedGuard),
 * otherwise falls back to `.name` (Function name) or "anonymous".
 *
 * @internal
 */
function getGuardName<TContext, TEvent>(g: Guard<TContext, TEvent>): string {
  if ("guardName" in g && typeof g.guardName === "string") {
    return g.guardName;
  }
  return g.name || "anonymous";
}
