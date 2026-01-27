/**
 * Type-Level Constants for Lifetime Hierarchy.
 *
 * This module defines named type constants for lifetime levels to replace
 * magic numbers throughout the codebase. Using named constants improves
 * readability and makes the lifetime hierarchy explicit.
 *
 * ## Lifetime Hierarchy
 *
 * Lifetimes are assigned numeric levels where LOWER = LONGER LIVED:
 *
 * | Level | Name      | Duration                               |
 * |-------|-----------|----------------------------------------|
 * | 1     | Singleton | Entire application lifetime            |
 * | 2     | Scoped    | Request/transaction/scope lifetime     |
 * | 3     | Transient | Created fresh for each resolution      |
 *
 * ## Captive Dependency Rule
 *
 * A longer-lived service (lower level) cannot depend on a shorter-lived
 * service (higher level). This prevents the "captive dependency" problem
 * where a singleton holds a reference to a scoped/transient instance.
 *
 * @packageDocumentation
 */

/**
 * Singleton lifetime level.
 * The longest-lived scope - one instance for the entire application.
 */
export type SINGLETON_LEVEL = 1;

/**
 * Scoped lifetime level.
 * Medium-lived scope - one instance per scope/request/transaction.
 */
export type SCOPED_LEVEL = 2;

/**
 * Transient lifetime level.
 * The shortest-lived scope - new instance for each resolution.
 */
export type TRANSIENT_LEVEL = 3;

/**
 * Union of all valid lifetime level values.
 * Used for type constraints that accept any lifetime level.
 */
export type LifetimeLevelValue = SINGLETON_LEVEL | SCOPED_LEVEL | TRANSIENT_LEVEL;
