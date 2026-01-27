/**
 * # CAPTIVE DEPENDENCY DETECTION CONCEPT DOCUMENTATION
 *
 * This file documents the captive dependency detection algorithm implemented
 * at the TypeScript type level. Captive dependencies occur when a longer-lived
 * service captures a reference to a shorter-lived service.
 *
 * ## What is a Captive Dependency?
 *
 * A captive dependency occurs when:
 * - A Singleton service depends on a Scoped service
 * - A Singleton service depends on a Transient service
 * - A Scoped service depends on a Transient service
 *
 * This is problematic because the longer-lived service will hold onto an
 * instance that should have been disposed, leading to:
 * - Memory leaks
 * - Stale data
 * - Incorrect behavior in multi-tenant applications
 *
 * ## Lifetime Hierarchy
 *
 * ```
 * LONGEST LIVED ────────────────────── SHORTEST LIVED
 *
 *   Singleton (1)    Scoped (2)    Transient (3)
 *       │               │               │
 *       │   CAN depend  │   CAN depend  │
 *       ├───────────────┤───────────────┤
 *       │               │               │
 *       │  CANNOT       │  CANNOT       │
 *       │←──────────────┤←──────────────┤
 *       │               │               │
 * ```
 *
 * ## Algorithm Overview
 *
 * When an adapter is added via `.provide()`:
 *
 * 1. **Get Lifetime Level**: Map lifetime string to numeric level
 *    - `LifetimeLevel<"singleton">` → `1`
 *    - `LifetimeLevel<"scoped">` → `2`
 *    - `LifetimeLevel<"transient">` → `3`
 *
 * 2. **Check Dependencies**: For each required port
 *    - Look up the dependency's lifetime level in the lifetime map
 *    - Compare: `IsCaptiveDependency<DependentLevel, DependencyLevel>`
 *    - Captive if: `DependencyLevel > DependentLevel`
 *
 * 3. **On Violation**: Build a readable error message
 *    - `CaptiveDependencyError<"UserService", "Singleton", "Session", "Scoped">`
 *
 * ## Type Flow Diagram
 *
 * ```
 * .provide(Adapter)
 *        │
 *        ▼
 * ┌──────────────────────────────────────┐
 * │ Extract: Lifetime, RequiredPorts     │
 * └──────────────────────────────────────┘
 *        │
 *        ▼
 * ┌──────────────────────────────────────┐
 * │ For each required port:              │
 * │   GetLifetimeLevel<Map, Port>        │
 * │   IsCaptiveDependency<L1, L2>        │
 * └──────────────────────────────────────┘
 *        │
 *    ┌───┴───┐
 *    │       │
 *  false   true
 *    │       │
 *    ▼       ▼
 * Success  CaptiveDependencyError
 * ```
 *
 * ## File Locations
 *
 * The captive detection implementation is split across these files in `./captive/`:
 *
 * | File | Contents |
 * |------|----------|
 * | `lifetime-level.ts` | Level mapping: `LifetimeLevel`, `LifetimeName` |
 * | `lifetime-map.ts` | Map operations: `AddLifetime`, `GetLifetimeLevel`, `MergeLifetimeMaps` |
 * | `comparison.ts` | Level comparison: `IsCaptiveDependency` |
 * | `errors.ts` | Error type: `CaptiveDependencyError` |
 * | `detection.ts` | Detection utilities: `FindAnyCaptiveDependency`, `WouldAnyBeCaptive` |
 * | `merge.ts` | Merge validation: `DetectCaptiveInMergedGraph`, `FindLifetimeInconsistency` |
 * | `index.ts` | Re-exports all types |
 *
 * ## Why Pattern Matching Instead of Arithmetic?
 *
 * TypeScript's type system cannot perform arithmetic comparisons like `A > B`.
 * Instead, we enumerate all 9 possible comparisons explicitly in `IsGreaterThan`:
 *
 * ```typescript
 * //     | 1     2     3    (B)
 * // ----+-------------------
 * //  1  | F     F     F     ← Singleton never > anything
 * //  2  | T     F     F     ← Scoped > Singleton only
 * //  3  | T     T     F     ← Transient > Singleton, Scoped
 * // (A) |
 * ```
 *
 * ## Forward References
 *
 * When an adapter requires a port that hasn't been registered yet (forward reference),
 * we skip captive validation for that dependency because:
 *
 * 1. If the dependency is never provided, `build()` will catch it
 * 2. If provided later with valid lifetime, no problem
 * 3. If provided with invalid lifetime, validation occurs when THAT adapter is added
 *
 * This allows registering adapters in any order.
 *
 * ### Forward Reference Captive Validation Gap
 *
 * **IMPORTANT:** The above logic has a gap. When checking "if provided with invalid
 * lifetime, validation occurs when THAT adapter is added", we only check if the newly
 * added adapter has captive dependencies on existing adapters. We do NOT retroactively
 * check if existing adapters would have captive dependencies on the newly added one.
 *
 * Example:
 * ```typescript
 * // Step 1: Add singleton that depends on unregistered ScopedPort
 * .provide(SingletonAdapter)  // ScopedPort not in map, skip captive check
 *
 * // Step 2: Add scoped adapter that provides ScopedPort
 * .provide(ScopedAdapter)     // Only checks ScopedAdapter's deps, not who depends on it
 *
 * // Result: Captive dependency passes type-level validation!
 * ```
 *
 * **Defense-in-Depth:** The `build()` function ALWAYS runs `detectCaptiveAtRuntime()`
 * to catch these forward reference scenarios. See ARCHITECTURE.md for details.
 *
 * ## Example: Singleton Capturing Scoped
 *
 * ```typescript
 * const SessionAdapter = createAdapter({
 *   provides: SessionPort,
 *   requires: [],
 *   lifetime: "scoped",
 *   factory: () => new Session(),
 * });
 *
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [SessionPort], // Captive dependency!
 *   lifetime: "singleton",
 *   factory: ({ Session }) => new UserService(Session),
 * });
 * ```
 *
 * Type-level evaluation:
 * 1. Add SessionAdapter: LifetimeMap = `{ Session: 2 }` (scoped)
 * 2. Add UserServiceAdapter:
 *    - `LifetimeLevel<"singleton">` = 1
 *    - `GetLifetimeLevel<Map, "Session">` = 2
 *    - `IsCaptiveDependency<1, 2>` = `IsGreaterThan<2, 1>` = `true`
 *    - Return: `CaptiveDependencyError<"UserService", "Singleton", "Session", "Scoped">`
 *
 * @packageDocumentation
 */

export {};
