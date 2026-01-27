/**
 * Multi-Error Aggregation Types.
 *
 * These types enable reporting ALL validation errors at once, rather than
 * short-circuiting on the first error. This is useful for:
 *
 * 1. Seeing all problems at once during development
 * 2. CI/CD pipelines that want comprehensive error reports
 * 3. IDE tooling that wants to show all issues
 *
 * This is the default behavior of `provide()`. Use `provideFirstError()` if you
 * prefer short-circuit behavior (stops at first error) for faster type checking.
 *
 * @packageDocumentation
 */
/**
 * Filters `never` values from a tuple type.
 *
 * Used by `CollectValidationErrors` to remove passing validations from the
 * error tuple, leaving only actual errors.
 *
 * @typeParam T - A readonly tuple that may contain `never` values
 * @returns A tuple with all `never` values removed
 *
 * @example
 * ```typescript
 * type Errors = FilterNever<readonly [never, "Error 1", never, "Error 2"]>;
 * // readonly ["Error 1", "Error 2"]
 * ```
 */
export type FilterNever<T extends readonly unknown[]> = T extends readonly [
    infer First,
    ...infer Rest
] ? [First] extends [never] ? FilterNever<Rest> : readonly [First, ...FilterNever<Rest>] : readonly [];
/**
 * Joins multiple error strings with newline separators.
 *
 * @typeParam Errors - A tuple of error message strings
 * @typeParam Acc - Accumulator for the joined result
 * @returns A single string with errors joined by newlines
 *
 * @example
 * ```typescript
 * type Joined = JoinErrors<readonly ["Error 1", "Error 2"]>;
 * // "  1. Error 1\n  2. Error 2"
 * ```
 */
export type JoinErrors<Errors extends readonly string[], Acc extends string = "", N extends readonly unknown[] = readonly [unknown]> = Errors extends readonly [infer First extends string, ...infer Rest extends readonly string[]] ? JoinErrors<Rest, Acc extends "" ? `  ${N["length"]}. ${First}` : `${Acc}\n  ${N["length"]}. ${First}`, readonly [...N, unknown]> : Acc;
/**
 * Formats multiple validation errors into a single readable message.
 *
 * When there are zero errors, returns `never` (validation passed).
 * When there is one error, returns that error directly.
 * When there are multiple errors, returns a numbered list.
 *
 * @typeParam Errors - A tuple of error message strings (after filtering never)
 *
 * @example Single error (returned as-is)
 * ```typescript
 * type Single = MultiErrorMessage<readonly ["ERROR: Duplicate adapter for 'Logger'."]>;
 * // "ERROR: Duplicate adapter for 'Logger'."
 * ```
 *
 * @example Multiple errors (numbered list)
 * ```typescript
 * type Multiple = MultiErrorMessage<readonly [
 *   "ERROR: Duplicate adapter for 'Logger'.",
 *   "ERROR: Circular dependency: A -> B -> A."
 * ]>;
 * // "Multiple validation errors:\n  1. ERROR: Duplicate...\n  2. ERROR: Circular..."
 * ```
 */
export type MultiErrorMessage<Errors extends readonly string[]> = Errors["length"] extends 0 ? never : Errors["length"] extends 1 ? Errors[0] : `Multiple validation errors:\n${JoinErrors<Errors>}`;
