/**
 * Lifetime Comparison Types for Captive Dependency Detection.
 *
 * This module provides type-level comparison utilities for determining
 * if one lifetime level is greater (shorter-lived) than another.
 *
 * ## Why Pattern Matching Instead of Arithmetic?
 *
 * TypeScript's type system cannot perform arithmetic operations like
 * `A > B`. We work around this by explicit pattern matching on the
 * three possible values (SINGLETON_LEVEL, SCOPED_LEVEL, TRANSIENT_LEVEL).
 * This is efficient because there are only 9 possible comparisons.
 *
 * @packageDocumentation
 */
import type { SINGLETON_LEVEL, SCOPED_LEVEL, TRANSIENT_LEVEL } from "./lifetime-constants.js";
/**
 * Type-level "greater than" comparison for lifetime levels.
 *
 * Returns true if level A is greater than level B.
 * Greater level means shorter lifetime, which can cause captive dependency
 * when a longer-lived adapter depends on a shorter-lived one.
 *
 * @typeParam A - First lifetime level (1, 2, or 3)
 * @typeParam B - Second lifetime level (1, 2, or 3)
 *
 * @returns `true` if A > B, `false` otherwise
 *
 * @remarks
 * **Why explicit pattern matching?**
 *
 * TypeScript cannot perform arithmetic at the type level. We enumerate
 * all possible cases explicitly. For 3 lifetime levels, this is efficient
 * and clear. The comparison table:
 *
 * ```
 *     | 1     2     3    (B)
 * ----+-------------------
 *  1  | F     F     F     ← Singleton never > anything
 *  2  | T     F     F     ← Scoped > Singleton only
 *  3  | T     T     F     ← Transient > Singleton, Scoped
 * (A) |
 * ```
 *
 * @internal
 */
type IsGreaterThan<TLevelA extends number, TLevelB extends number> = TLevelA extends SINGLETON_LEVEL ? false : TLevelA extends SCOPED_LEVEL ? TLevelB extends SINGLETON_LEVEL ? true : false : TLevelA extends TRANSIENT_LEVEL ? TLevelB extends SINGLETON_LEVEL | SCOPED_LEVEL ? true : false : false;
/**
 * Checks if the dependency lifetime level is greater (shorter-lived) than
 * the dependent's lifetime level, which would create a captive dependency.
 *
 * @typeParam DependentLevel - The lifetime level of the adapter that has the dependency
 * @typeParam DependencyLevel - The lifetime level of the required adapter
 *
 * @returns `true` if this creates a captive dependency, `false` otherwise
 */
export type IsCaptiveDependency<DependentLevel extends number, DependencyLevel extends number> = IsGreaterThan<DependencyLevel, DependentLevel>;
export {};
