/**
 * Brand Symbols for Nominal Typing
 *
 * These symbols exist only at the type level to enable nominal typing
 * for State, Event, and Machine types. They are never assigned runtime
 * values and serve purely as compile-time discriminators.
 *
 * @remarks
 * The `unique symbol` type guarantees that these brands cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern used in `@hex-di/core` for Port branding.
 *
 * @packageDocumentation
 */

// =============================================================================
// State Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of State types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to ensure that two states with
 * different names or contexts are type-incompatible even if they are
 * structurally similar.
 *
 * The brand carries both the state name and context type as a tuple:
 * `[TName, TContext]`
 *
 * @example
 * ```typescript
 * // Internal usage in State type:
 * type State<TName, TContext> = {
 *   readonly [__stateBrand]: [TName, TContext];
 *   // ... other properties
 * }
 * ```
 */
declare const __stateBrand: unique symbol;

/**
 * The type of the state brand symbol.
 * Exported for use in type definitions.
 */
export type StateBrandSymbol = typeof __stateBrand;

// =============================================================================
// Event Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of Event types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to ensure that two events with
 * different types or payloads are type-incompatible.
 *
 * The brand carries both the event type name and payload type as a tuple:
 * `[TName, TPayload]`
 *
 * @example
 * ```typescript
 * // Internal usage in Event type:
 * type Event<TName, TPayload> = {
 *   readonly [__eventBrand]: [TName, TPayload];
 *   // ... other properties
 * }
 * ```
 */
declare const __eventBrand: unique symbol;

/**
 * The type of the event brand symbol.
 * Exported for use in type definitions.
 */
export type EventBrandSymbol = typeof __eventBrand;

// =============================================================================
// Machine Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of Machine types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to ensure that two machines with
 * different states, events, or contexts are type-incompatible.
 *
 * The brand carries the state union, event union, and context type as a tuple:
 * `[TState, TEvent, TContext]`
 *
 * @example
 * ```typescript
 * // Internal usage in Machine type:
 * type Machine<TState, TEvent, TContext> = {
 *   readonly [__machineBrand]: [TState, TEvent, TContext];
 *   // ... other properties
 * }
 * ```
 */
declare const __machineBrand: unique symbol;

/**
 * The type of the machine brand symbol.
 * Exported for use in type definitions.
 */
export type MachineBrandSymbol = typeof __machineBrand;
