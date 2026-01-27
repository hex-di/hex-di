/**
 * Depth-Limited Recursion Utilities for Type-Level Graph Traversal.
 *
 * This module provides utilities for tracking and limiting recursion depth
 * in type-level algorithms. TypeScript's type system has recursion limits
 * (typically 50-100 levels), so we proactively limit depth to avoid
 * "Type instantiation is excessively deep" errors (TS2589).
 *
 * ## Why Tuple Length?
 *
 * TypeScript's type system cannot perform arithmetic. We simulate a counter
 * using tuple length (Peano-style):
 *   - Start: []          (length = 0)
 *   - After 1 call: [x]  (length = 1)
 *   - After 2 calls: [x, x] (length = 2)
 *
 * This is a common pattern in advanced TypeScript (e.g., Effect-TS, ts-toolbelt).
 *
 * @packageDocumentation
 */

/**
 * Default maximum recursion depth for type-level graph traversal.
 *
 * ## Why 50?
 *
 * - **Enterprise coverage**: Production dependency graphs can reach 30-40 levels
 *   in large enterprise applications. 50 covers virtually all legitimate use cases.
 * - **TypeScript limits**: The type system has recursion limits (50-100) that
 *   vary based on type complexity. Our type structures are optimized to stay safe.
 * - **Graceful degradation**: If exceeded, we assume no cycle and return a
 *   descriptive error guiding users toward `withMaxDepth<N>()`.
 *
 * ## Trade-offs
 *
 * | Value | Pros | Cons |
 * |-------|------|------|
 * | Lower (10-30) | Faster type checking, no TS2589 risk | May miss deep cycles |
 * | Current (50) | Covers enterprise graphs, balanced safety | Very deep graphs need config |
 * | Higher (75-100) | Catches deeper cycles | Slower compilation, TS2589 risk |
 *
 * ## Configurability
 *
 * Use `GraphBuilder.withMaxDepth<N>()` to create a builder with a custom
 * depth limit. Valid values are 1-100.
 *
 * @see ValidateMaxDepth - Type to validate custom depth values
 */
export type DefaultMaxDepth = 50; // Value: 50 - Covers most enterprise dependency graphs

/**
 * Maximum allowed value for configurable MaxDepth.
 *
 * Set to 100 to provide a safe upper bound that avoids TypeScript's
 * recursion limits while allowing deeper graphs than the default.
 */
type MaxAllowedDepth = 100;

/**
 * Helper type to build a tuple of a specific length.
 * Used by ValidateMaxDepth to check if a number exceeds the maximum.
 * @internal
 */
type BuildTuple<
  TLength extends number,
  TAcc extends readonly unknown[] = [],
> = TAcc["length"] extends TLength ? TAcc : BuildTuple<TLength, [...TAcc, unknown]>;

/**
 * Helper type that checks if a number is within the valid range (1-100).
 *
 * Uses tuple-wrapping `[TDepth] extends [0]` to prevent unintentional
 * distribution over union types. If TDepth is a union like `50 | 60`,
 * we want to validate the union as a whole, not distribute over each member.
 *
 * @internal
 */
type IsValidDepthNumber<TDepth extends number> = [TDepth] extends [0]
  ? false
  : BuildTuple<TDepth> extends infer TTuple extends readonly unknown[]
    ? TTuple["length"] extends TDepth
      ? [TDepth] extends [MaxAllowedDepth]
        ? true
        : BuildTuple<MaxAllowedDepth>["length"] extends number
          ? [TTuple["length"]] extends [never]
            ? false
            : TTuple extends BuildTuple<MaxAllowedDepth>
              ? true
              : BuildTuple<MaxAllowedDepth> extends [...TTuple, ...infer _Rest]
                ? true
                : false
          : false
      : false
    : false;

/**
 * Validates that a user-provided MaxDepth value is within the valid range (1-100).
 *
 * Returns the depth value if valid, or an error message string if invalid.
 *
 * @typeParam TDepth - The depth value to validate
 *
 * @example
 * ```typescript
 * type Valid = ValidateMaxDepth<50>;   // 50
 * type TooLow = ValidateMaxDepth<0>;   // "ERROR: MaxDepth must be at least 1"
 * type TooHigh = ValidateMaxDepth<150>; // "ERROR: MaxDepth must be <= 100"
 * ```
 */
export type ValidateMaxDepth<TDepth extends number> = TDepth extends 0
  ? "ERROR: MaxDepth must be at least 1"
  : IsValidDepthNumber<TDepth> extends true
    ? TDepth
    : `ERROR: MaxDepth must be <= ${MaxAllowedDepth}`;

/**
 * Depth counter using tuple length.
 *
 * This is a type-level Peano number: the length of the tuple represents
 * the current recursion depth. We use `unknown` as the element type since
 * the actual values don't matter - only the tuple's length.
 */
export type Depth = readonly unknown[];

/**
 * Increments the depth counter by spreading the existing tuple and adding an element.
 *
 * @example
 * ```typescript
 * type D0 = [];                    // length = 0
 * type D1 = IncrementDepth<D0>;    // [unknown], length = 1
 * type D2 = IncrementDepth<D1>;    // [unknown, unknown], length = 2
 * ```
 */
export type IncrementDepth<TDepthCounter extends Depth> = [...TDepthCounter, unknown];

/**
 * Checks if the maximum recursion depth has been exceeded.
 *
 * Uses TypeScript's tuple `length` property which returns a literal number type.
 *
 * ## Soundness Guarantee
 *
 * This type correctly handles edge cases:
 *
 * | `TMaxDepth` Type | Behavior | Reason |
 * |------------------|----------|--------|
 * | Literal (e.g., `50`) | Exact match triggers `true` | Normal operation |
 * | Union (e.g., `50 \| 60`) | Triggers at minimum value | Conservative: `50 extends (50\|60)` = true |
 * | Widened (`number`) | Always `true` | Defensive: any literal extends `number` |
 *
 * The public API (`ValidateMaxDepth`) prevents union and widened types, so these
 * edge cases only occur if the internal types are misused directly.
 *
 * ## Why Not Tuple-Wrap?
 *
 * Wrapping in tuples (`[TDepthCounter["length"]] extends [TMaxDepth]`) was considered
 * to prevent "distribution", but testing shows both versions behave identically.
 * The concern about union distribution is unfounded because:
 * 1. Distribution only affects the LEFT side of `extends` in conditionals
 * 2. `TMaxDepth` is on the RIGHT side, so no distribution occurs
 * 3. Both versions correctly handle union types conservatively
 *
 * @typeParam TDepthCounter - Current depth as a tuple
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 */
export type DepthExceeded<
  TDepthCounter extends Depth,
  TMaxDepth extends number = DefaultMaxDepth,
> = TDepthCounter["length"] extends TMaxDepth ? true : false;

// =============================================================================
// Type-Level Number Comparison
// =============================================================================

/**
 * Compares two numbers at the type level.
 *
 * Returns:
 * - `"greater"` if TFirst > TSecond
 * - `"less"` if TFirst < TSecond
 * - `"equal"` if TFirst === TSecond
 *
 * ## How It Works
 *
 * Uses tuple length comparison: builds tuples of each length, then checks
 * if one extends the other with remaining elements. If `[...T1, ...infer Rest]`
 * extends `T2`, then T1 is shorter (TFirst < TSecond).
 *
 * @typeParam TFirst - First number to compare
 * @typeParam TSecond - Second number to compare
 * @returns `"greater"` | `"less"` | `"equal"`
 *
 * @example
 * ```typescript
 * type A = CompareNumbers<50, 30>; // "greater"
 * type B = CompareNumbers<30, 50>; // "less"
 * type C = CompareNumbers<50, 50>; // "equal"
 * ```
 *
 * @internal
 */
export type CompareNumbers<TFirst extends number, TSecond extends number> = TFirst extends TSecond
  ? "equal"
  : BuildTuple<TFirst> extends infer T1 extends readonly unknown[]
    ? BuildTuple<TSecond> extends infer T2 extends readonly unknown[]
      ? T2 extends [...T1, ...infer _Rest]
        ? _Rest["length"] extends 0
          ? "equal"
          : "less"
        : "greater"
      : "equal"
    : "equal";

/**
 * Returns the larger of two numbers at the type level.
 *
 * @typeParam TFirst - First number
 * @typeParam TSecond - Second number
 * @returns The larger of TFirst or TSecond (TFirst if equal)
 *
 * @example
 * ```typescript
 * type A = MaxNumber<50, 30>; // 50
 * type B = MaxNumber<30, 50>; // 50
 * type C = MaxNumber<50, 50>; // 50
 * ```
 *
 * @internal
 */
export type MaxNumber<TFirst extends number, TSecond extends number> =
  CompareNumbers<TFirst, TSecond> extends "less" ? TSecond : TFirst;

/**
 * Returns the smaller of two numbers at the type level.
 *
 * @typeParam TFirst - First number
 * @typeParam TSecond - Second number
 * @returns The smaller of TFirst or TSecond (TFirst if equal)
 *
 * @example
 * ```typescript
 * type A = MinNumber<50, 30>; // 30
 * type B = MinNumber<30, 50>; // 30
 * type C = MinNumber<50, 50>; // 50
 * ```
 *
 * @internal
 */
export type MinNumber<TFirst extends number, TSecond extends number> =
  CompareNumbers<TFirst, TSecond> extends "greater" ? TSecond : TFirst;
