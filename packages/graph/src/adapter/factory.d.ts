/**
 * Adapter factory functions.
 *
 * This module provides `createAdapter()` and `createAsyncAdapter()` functions
 * for creating typed adapters with dependency metadata. Adapters are the bridge
 * between ports (interfaces) and their concrete implementations.
 *
 * @packageDocumentation
 */
import type { Port, InferService } from "@hex-di/ports";
import type { TupleToUnion } from "../types/type-utilities.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types/adapter-types.js";
import type { Sync, Async, Singleton, False } from "./constants.js";
/**
 * ## Overload Strategy for `clonable` Type Preservation
 *
 * Three overloads preserve literal types for the `clonable` property:
 *
 * | Call Pattern                    | Matched Overload | Result Type      |
 * |---------------------------------|------------------|------------------|
 * | `{ clonable: undefined }` or omitted | Overload 1   | `clonable: false` |
 * | `{ clonable: true }` or `false`      | Overload 2   | literal preserved |
 * | `{ clonable: someVar }` (dynamic)    | Overload 3   | `clonable: boolean` |
 *
 * Without overloads, TypeScript widens `false` to `boolean`, losing compile-time
 * guarantees. TypeScript resolves overloads top-to-bottom until one matches.
 *
 * @see Adapter - Return type parameterized by TClonable
 * @see createAsyncAdapter - Uses same pattern
 */
/**
 * Configuration object for creating an adapter (INPUT to `createAdapter()`).
 *
 * ## Type Relationships
 *
 * ```
 * AdapterConfig ──createAdapter()──> Adapter
 *      │                                 │
 *      │ (input config)                  │ (output type)
 *      │                                 │
 *      └─ 4 type params                  └─ 6 type params
 *         (provides, requires,              (adds factoryKind, requiresTuple;
 *          lifetime, clonable)               converts requires tuple→union)
 * ```
 *
 * @see Adapter - The output type produced by `createAdapter()`
 * @see AdapterConstraint - Structural constraint for generics (in adapter-types.ts)
 * @see adapter-types.ts - Full disambiguation table for Adapter/AdapterConstraint/AdapterConfig
 */
interface AdapterConfig<TProvides extends Port<unknown, string>, TRequires extends readonly Port<unknown, string>[], TLifetime extends Lifetime, TClonable extends boolean> {
    provides: TProvides;
    requires: TRequires;
    lifetime: TLifetime;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;
    /**
     * Whether this adapter's service can be safely shallow-cloned for forked inheritance.
     * @default false
     */
    clonable?: TClonable;
    finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}
/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @pure No side effects - same inputs always produce the same frozen Adapter object.
 *
 * ## Overload Resolution Table
 *
 * TypeScript resolves overloads top-to-bottom. This function has 3 overloads to preserve
 * literal types for the `clonable` property:
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │                        createAdapter() Overload Resolution                         │
 * ├─────────────────────────────────┬───────────────────────┬──────────────────────────┤
 * │ Input Pattern                   │ Matched Overload      │ Result `clonable` Type   │
 * ├─────────────────────────────────┼───────────────────────┼──────────────────────────┤
 * │ clonable: undefined             │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: omitted               │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: true                  │ Overload 2            │ true (literal)           │
 * │ clonable: false                 │ Overload 2            │ false (literal)          │
 * │ clonable: someVar (boolean)     │ Overload 3            │ boolean (widened)        │
 * │ clonable: condition ? true : f  │ Overload 3            │ boolean (widened)        │
 * └─────────────────────────────────┴───────────────────────┴──────────────────────────┘
 * ```
 *
 * ## Type Parameter Inference Table
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │                         Type Parameter Inference Rules                              │
 * ├────────────────┬───────────────────────────────┬────────────────────────────────────┤
 * │ Parameter      │ Inferred From                 │ Notes                              │
 * ├────────────────┼───────────────────────────────┼────────────────────────────────────┤
 * │ TProvides      │ config.provides               │ Port<TService, TPortName>          │
 * │ TRequires      │ config.requires               │ readonly tuple via `const`         │
 * │ TLifetime      │ config.lifetime               │ "singleton"|"scoped"|"transient"   │
 * │ TClonable      │ config.clonable (Overload 2)  │ true|false literal or boolean      │
 * └────────────────┴───────────────────────────────┴────────────────────────────────────┘
 * ```
 *
 * ## Invariants
 *
 * **Preconditions:**
 * - `config.provides` must be a valid Port created by `createPort()`
 * - `config.requires` must be an array of valid Ports (can be empty)
 * - `config.lifetime` must be one of: "singleton" | "scoped" | "transient"
 * - `config.factory` must be a function that accepts resolved dependencies
 *
 * **Postconditions:**
 * - Returns a frozen (immutable) Adapter object
 * - `adapter.factoryKind` is always "sync"
 * - `adapter.clonable` is `false` unless explicitly set
 * - The adapter can be safely registered with `GraphBuilder.provide()`
 *
 * @overload When `clonable` is NOT provided (undefined), defaults to `false` literal type.
 */
export declare function createAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime>(config: Omit<AdapterConfig<TProvides, TRequires, TLifetime, false>, "clonable"> & {
    clonable?: undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, False, TRequires>;
/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload When `clonable` IS provided with a literal boolean, uses that literal type.
 */
export declare function createAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime, const TClonable extends boolean>(config: AdapterConfig<TProvides, TRequires, TLifetime, TClonable> & {
    clonable: TClonable;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, TClonable, TRequires>;
/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload Fallback for dynamic `boolean | undefined` values - returns `boolean` type.
 * This overload catches cases where `clonable` is passed as a variable with type `boolean | undefined`.
 */
export declare function createAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[], const TLifetime extends Lifetime>(config: Omit<AdapterConfig<TProvides, TRequires, TLifetime, boolean>, "clonable"> & {
    clonable?: boolean | undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime, Sync, boolean, TRequires>;
/**
 * ## Async Adapter Overloads
 *
 * Uses same three-overload pattern as `createAdapter` for `clonable` type preservation.
 * Key differences: `lifetime` is always `"singleton"`, `factoryKind` is `"async"`.
 *
 * @see createAdapter - Full overload rationale documentation
 */
/**
 * Configuration object for creating an async adapter (INPUT to `createAsyncAdapter()`).
 *
 * Similar to `AdapterConfig` but without `lifetime` (always "singleton" for async adapters).
 *
 * @see AdapterConfig - Sync adapter config with explicit lifetime
 * @see Adapter - The output type produced by `createAsyncAdapter()`
 * @see adapter-types.ts - Full disambiguation table
 */
interface AsyncAdapterConfig<TProvides extends Port<unknown, string>, TRequires extends readonly Port<unknown, string>[], TClonable extends boolean = false> {
    provides: TProvides;
    requires: TRequires;
    factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => Promise<InferService<TProvides>>;
    /**
     * Whether this adapter's service can be safely shallow-cloned for forked inheritance.
     * @default false
     */
    clonable?: TClonable;
    finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}
/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @pure No side effects - same valid inputs always produce the same frozen Adapter object.
 *
 * ## Overload Resolution Table
 *
 * TypeScript resolves overloads top-to-bottom. This function has 3 overloads to preserve
 * literal types for the `clonable` property (same pattern as `createAdapter()`):
 *
 * ```
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │                      createAsyncAdapter() Overload Resolution                      │
 * ├─────────────────────────────────┬───────────────────────┬──────────────────────────┤
 * │ Input Pattern                   │ Matched Overload      │ Result `clonable` Type   │
 * ├─────────────────────────────────┼───────────────────────┼──────────────────────────┤
 * │ clonable: undefined             │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: omitted               │ Overload 1 (this one) │ false (literal)          │
 * │ clonable: true                  │ Overload 2            │ true (literal)           │
 * │ clonable: false                 │ Overload 2            │ false (literal)          │
 * │ clonable: someVar (boolean)     │ Overload 3            │ boolean (widened)        │
 * │ clonable: condition ? true : f  │ Overload 3            │ boolean (widened)        │
 * └─────────────────────────────────┴───────────────────────┴──────────────────────────┘
 * ```
 *
 * ## Key Differences from createAdapter()
 *
 * | Property        | createAdapter()                    | createAsyncAdapter()               |
 * |-----------------|------------------------------------|------------------------------------|
 * | `lifetime`      | Required: "singleton"|"scoped"|"transient" | Always "singleton" (implicit) |
 * | `factoryKind`   | Always "sync"                      | Always "async"                     |
 * | `factory` return| `TService`                         | `Promise<TService>`                |
 *
 * ## Invariants
 *
 * **Preconditions:**
 * - `config.provides` must be a valid Port created by `createPort()`
 * - `config.requires` must be an array of valid Ports (can be empty)
 * - `config.factory` must be an async function returning a Promise
 *
 * **Postconditions:**
 * - Returns a frozen (immutable) Adapter object
 * - `adapter.factoryKind` is always "async"
 * - `adapter.lifetime` is always "singleton" (async adapters cannot be scoped/transient)
 * - `adapter.clonable` is `false` unless explicitly set
 * - The adapter requires `container.initialize()` before sync resolution
 *
 * **Initialization Order:**
 * - Async adapters are automatically initialized in topological order based on their dependencies
 * - Adapters with no async dependencies initialize first
 * - Independent adapters at the same level initialize in parallel for performance
 *
 * @overload When `clonable` is NOT provided (undefined), defaults to `false` literal type.
 */
export declare function createAsyncAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[]>(config: Omit<AsyncAdapterConfig<TProvides, TRequires, false>, "clonable"> & {
    clonable?: undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, False, TRequires>;
/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload When `clonable` IS provided with a literal boolean, uses that literal type.
 */
export declare function createAsyncAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[], const TClonable extends boolean>(config: AsyncAdapterConfig<TProvides, TRequires, TClonable> & {
    clonable: TClonable;
}): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, TClonable, TRequires>;
/**
 * Creates a typed async adapter with dependency metadata for registration in a dependency graph.
 *
 * @overload Fallback for dynamic `boolean | undefined` values - returns `boolean` type.
 * This overload catches cases where `clonable` is passed as a variable with type `boolean | undefined`.
 */
export declare function createAsyncAdapter<TProvides extends Port<unknown, string>, const TRequires extends readonly Port<unknown, string>[]>(config: Omit<AsyncAdapterConfig<TProvides, TRequires, boolean>, "clonable"> & {
    clonable?: boolean | undefined;
}): Adapter<TProvides, TupleToUnion<TRequires>, Singleton, Async, boolean, TRequires>;
export {};
