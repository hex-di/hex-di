/**
 * Merge Conflict Detection Types.
 *
 * This module provides type-level utilities to detect when merging two
 * dependency graphs would produce conflicting dependency declarations for
 * the same port.
 *
 * ## The Problem
 *
 * When merging two graphs using TypeScript intersection (`G1 & G2`), if both
 * graphs declare the same port with DIFFERENT dependencies, the result becomes
 * `never` silently:
 *
 * ```typescript
 * type G1 = { A: "B" };
 * type G2 = { A: "C" };
 * type Merged = G1 & G2;  // { A: never } because "B" & "C" = never
 * ```
 *
 * This silent `never` can break cycle detection because any dependency lookup
 * for port "A" will return `never`, making it appear like A has no dependencies.
 *
 * ## The Solution
 *
 * `DetectMergeConflict` analyzes both graphs BEFORE merging to detect if any
 * shared ports have different dependency sets. If a conflict is found, it
 * returns a `MergeConflictError` with details instead of proceeding with a
 * broken merge.
 *
 * @packageDocumentation
 */
import type { IsNever } from "../../types/type-utilities.js";
/**
 * Extracts keys that exist in both G1 and G2.
 *
 * @typeParam G1 - First dependency graph
 * @typeParam G2 - Second dependency graph
 * @returns Union of keys present in both graphs, or `never` if disjoint
 *
 * @example
 * ```typescript
 * type Result = CommonKeys<{ A: "X"; B: "Y" }, { A: "Z"; C: "W" }>;
 * // Result = "A"
 * ```
 *
 * @internal
 */
export type CommonKeys<G1, G2> = keyof G1 & keyof G2 & string;
/**
 * Checks if two string unions are exactly equal.
 *
 * Returns `true` if A and B are the same union type, `false` otherwise.
 * Handles `never` correctly: `StringUnionEqual<never, never>` is `true`.
 *
 * @typeParam A - First string union
 * @typeParam B - Second string union
 *
 * @example
 * ```typescript
 * type R1 = StringUnionEqual<"A" | "B", "A" | "B">;  // true
 * type R2 = StringUnionEqual<"A" | "B", "A">;        // false (subset)
 * type R3 = StringUnionEqual<"A", "B">;              // false (different)
 * type R4 = StringUnionEqual<never, never>;          // true
 * ```
 *
 * @internal
 */
export type StringUnionEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/**
 * Branded error type representing a merge conflict.
 *
 * This type is returned by `DetectMergeConflict` when two graphs have
 * conflicting dependency declarations for the same port.
 *
 * @typeParam TPort - The port name with conflicting dependencies
 * @typeParam TDeps1 - Dependencies declared in the first graph
 * @typeParam TDeps2 - Dependencies declared in the second graph
 *
 * @internal
 */
export type MergeConflictError<TPort extends string, TDeps1 extends string, TDeps2 extends string> = {
    readonly __errorBrand: "MergeConflictError";
    readonly __port: TPort;
    readonly __deps1: TDeps1;
    readonly __deps2: TDeps2;
};
/**
 * Template literal error message for merge conflict detection.
 *
 * @typeParam TPort - The port name with conflicting dependencies
 * @typeParam TDeps1 - Dependencies in Graph A (union or never)
 * @typeParam TDeps2 - Dependencies in Graph B (union or never)
 *
 * Note: Uses HEX022 as a type-level-only error code. Runtime codes (HEX001-HEX019) are
 * reserved for errors that can occur at runtime. Type-level-only codes start at HEX020.
 *
 * @example
 * ```
 * "ERROR[HEX022]: Merge conflict for port 'Logger': Graph A declares dependencies [Database], Graph B declares dependencies [Config]. These cannot be safely merged. Fix: Ensure both graphs use the same adapter for 'Logger', or remove one before merging."
 * ```
 */
export type MergeConflictErrorMessage<TPort extends string, TDeps1 extends string, TDeps2 extends string> = `ERROR[HEX022]: Merge conflict for port '${TPort}': Graph A declares dependencies [${FormatDeps<TDeps1>}], Graph B declares dependencies [${FormatDeps<TDeps2>}]. These cannot be safely merged. Fix: Ensure both graphs use the same adapter for '${TPort}', or remove one before merging.`;
/**
 * Formats a dependency union for error messages.
 * Returns "(none)" for `never`, otherwise the union as-is.
 *
 * @internal
 */
type FormatDeps<T extends string> = [T] extends [never] ? "(none)" : T;
/**
 * Detects merge conflicts between two dependency graphs.
 *
 * Iterates over all ports that exist in both graphs and checks if their
 * dependency declarations are compatible (i.e., the same). If any port has
 * different dependencies in G1 vs G2, returns a `MergeConflictError`.
 *
 * ## Algorithm
 *
 * 1. Find common keys between G1 and G2
 * 2. For each common key, check if `G1[key]` equals `G2[key]`
 * 3. If any differ, return `MergeConflictError` for the first conflict
 * 4. If all match (or no common keys), return `never`
 *
 * ## Why This Matters
 *
 * Without this check, merging `{ A: "B" } & { A: "C" }` silently produces
 * `{ A: never }`, which breaks cycle detection. This type ensures such
 * conflicts are caught at compile time with a clear error message.
 *
 * @typeParam G1 - First dependency graph (port name -> required port names)
 * @typeParam G2 - Second dependency graph
 * @returns `never` if no conflict, or `MergeConflictError` if conflict found
 *
 * @example No conflict (disjoint graphs)
 * ```typescript
 * type Result = DetectMergeConflict<{ A: "X" }, { B: "Y" }>;
 * // Result = never (no shared ports)
 * ```
 *
 * @example No conflict (same deps)
 * ```typescript
 * type Result = DetectMergeConflict<{ A: "B" }, { A: "B" }>;
 * // Result = never (both have A -> B)
 * ```
 *
 * @example Conflict detected
 * ```typescript
 * type Result = DetectMergeConflict<{ A: "B" }, { A: "C" }>;
 * // Result = MergeConflictError<"A", "B", "C">
 * ```
 *
 * @internal
 */
export type DetectMergeConflict<G1, G2> = CommonKeys<G1, G2> extends infer Keys extends string ? IsNever<Keys> extends true ? never : FindFirstConflict<G1, G2, Keys> : never;
/**
 * Finds the first conflicting port among the common keys.
 *
 * Uses distributive conditional types to iterate over the Keys union.
 * Returns the first conflict found, or `never` if all are compatible.
 *
 * @internal
 */
type FindFirstConflict<G1, G2, Keys extends string> = Keys extends string ? CheckPortConflict<G1, G2, Keys> : never;
/**
 * Checks if a specific port has conflicting dependencies.
 *
 * Uses tuple wrapping `[X] extends [Y]` to prevent distributive behavior
 * when comparing union types like `"B" | "C"`.
 *
 * @internal
 */
type CheckPortConflict<G1, G2, K extends string> = K extends keyof G1 & keyof G2 ? G1[K] extends infer Deps1 ? G2[K] extends infer Deps2 ? IsNever<Deps1> extends true ? IsNever<Deps2> extends true ? never : MergeConflictError<K, ExtractString<Deps1>, ExtractString<Deps2>> : IsNever<Deps2> extends true ? MergeConflictError<K, ExtractString<Deps1>, ExtractString<Deps2>> : StringUnionEqual<Deps1 & string, Deps2 & string> extends true ? never : MergeConflictError<K, ExtractString<Deps1>, ExtractString<Deps2>> : never : never : never;
/**
 * Extracts string from a type, returning the string literal for error messages.
 * Handles never by returning never.
 *
 * @internal
 */
type ExtractString<T> = [T] extends [never] ? never : T extends string ? T : never;
export {};
