/**
 * Runtime Resolver - Type-erased interface for container storage.
 *
 * This module provides the `RuntimeResolver` interface and conversion functions
 * that enable storing Container and Scope instances with different type parameters
 * in the same React state/context.
 *
 * ## The Problem
 *
 * Container<TProvides> uses generic method signatures like:
 *   `<P extends TProvides>(port: P) => InferService<P>`
 *
 * This is contravariant in the parameter position under `strictFunctionTypes`,
 * meaning Container<LoggerPort> is NOT assignable to Container<Port<unknown, string>>.
 *
 * Additionally, Container's resolve signature uses conditional types based on TPhase,
 * creating union incompatibility when trying to store containers in generic state.
 *
 * ## The Solution
 *
 * This module provides:
 *
 * 1. **RuntimeResolver interface** - A type-erased interface with non-generic methods
 *    that accepts any Port and returns unknown.
 *
 * 2. **toRuntimeResolver()** - A function that extracts methods from any Container/Scope
 *    into a RuntimeResolver. This function is the ONE place where type boundaries
 *    are crossed, with safety guaranteed by the Container's runtime port validation.
 *
 * 3. **assertResolverProvides()** - A function to narrow back to typed resolution
 *    when the caller knows the actual port types.
 *
 * ## Usage
 *
 * ```typescript
 * // Convert any container to RuntimeResolver for storage
 * const container: Container<LoggerPort | DatabasePort> = createContainer(graph);
 * const resolver: RuntimeResolver = toRuntimeResolver(container);
 *
 * // Store in React state
 * const [state, setState] = useState<RuntimeResolver | null>(null);
 * setState(resolver);
 *
 * // Narrow back to specific types when consuming
 * const typed = assertResolverProvides<typeof LoggerPort | typeof DatabasePort>(state);
 * const logger = typed.resolve(LoggerPort);  // Type-safe!
 * ```
 *
 * ## Safety Justification
 *
 * The `toRuntimeResolver` function extracts methods that definitely exist at runtime.
 * The Container/Scope always validates ports at runtime, so:
 * - If you resolve a port that doesn't exist, you get a runtime error
 * - The type erasure is only for storage; consumers must narrow back to use safely
 * - This is the minimal, centralized location for the trust boundary
 *
 * @packageDocumentation
 */
// =============================================================================
// Type Guards
// =============================================================================
/**
 * Type guard to check if a RuntimeResolver is a RuntimeContainer.
 *
 * RuntimeContainer has `initialize` and `createChild` methods that
 * RuntimeResolver (Scope) does not have.
 *
 * @param resolver - The resolver to check
 * @returns true if the resolver is a RuntimeContainer
 *
 * @example
 * ```typescript
 * if (isRuntimeContainer(resolver)) {
 *   await resolver.initialize();
 * }
 * ```
 */
export function isRuntimeContainer(resolver) {
    return "initialize" in resolver && typeof resolver.initialize === "function";
}
/**
 * Converts any Container or Scope to a RuntimeResolver for type-erased storage.
 *
 * This function is the **single trust boundary** for type erasure. It extracts
 * methods from a typed Container/Scope into a RuntimeResolver that can be stored
 * in React state/context without type parameter propagation issues.
 *
 * @param resolver - Any Container or Scope instance (with any type parameters)
 * @returns A RuntimeResolver that wraps the input's methods
 *
 * @remarks
 * **Safety Justification:**
 *
 * 1. Container/Scope ALWAYS have these methods at runtime:
 *    - resolve, resolveAsync, createScope, dispose, isDisposed
 *
 * 2. The Container/Scope performs runtime port validation:
 *    - If you resolve a port that doesn't exist, you get a descriptive error
 *    - Type safety is maintained at the edges (typed hooks in React)
 *
 * 3. This is a one-way conversion for storage:
 *    - You can store any Container<TProvides> as RuntimeResolver
 *    - To consume, you must narrow back via assertResolverProvides<TProvides>
 *
 * **Why This Function Instead of Direct Assignment:**
 *
 * TypeScript's generic method signatures create contravariance:
 *   `<P extends TProvides>(port: P) => InferService<P>`
 * is not assignable to:
 *   `(port: Port<unknown, string>) => unknown`
 *
 * Even though the implementation would work, TypeScript correctly rejects
 * this because the generic signature makes stronger guarantees about input
 * types. This function explicitly creates a new object with the widened
 * signature, making the trust boundary explicit.
 *
 * @example
 * ```typescript
 * // Convert container for storage
 * const container = createContainer(graph);
 * const resolver = toRuntimeResolver(container);
 *
 * // Store in React state
 * setState(resolver);
 *
 * // Later, narrow back for consumption
 * const typed = assertResolverProvides<AppPorts>(resolver);
 * const logger = typed.resolve(LoggerPort);
 * ```
 */
export function toRuntimeResolver(resolver) {
    // Create a new object that wraps the resolver's methods.
    // This is type-safe because:
    // 1. ResolverLike describes what Container/Scope actually have
    // 2. We're explicitly creating RuntimeResolver with widened types
    // 3. Runtime port validation ensures safety
    const wrapped = {
        resolve: (port) => resolver.resolve(port),
        resolveAsync: (port) => resolver.resolveAsync(port),
        createScope: () => toRuntimeResolver(resolver.createScope()),
        dispose: () => resolver.dispose(),
        has: (port) => resolver.has(port),
        get isDisposed() {
            return resolver.isDisposed;
        },
    };
    return wrapped;
}
/**
 * Converts any Container to a RuntimeContainer for type-erased storage.
 *
 * Similar to `toRuntimeResolver`, but also preserves container-specific
 * methods like `initialize()` and `createChild()`.
 *
 * @param container - Any Container instance (with any type parameters)
 * @returns A RuntimeContainer that wraps the input's methods
 *
 * @example
 * ```typescript
 * // Convert uninitialized container for storage
 * const container = createContainer(graph);
 * const runtimeContainer = toRuntimeContainer(container);
 *
 * // Initialize returns RuntimeResolver
 * const initialized = await runtimeContainer.initialize();
 * setState(initialized);
 * ```
 */
export function toRuntimeContainer(container) {
    const base = toRuntimeResolver(container);
    const wrapped = {
        ...base,
        // Override createScope to return RuntimeResolver
        createScope: () => toRuntimeResolver(container.createScope()),
        initialize: async () => {
            if (container.initialize) {
                const initialized = await container.initialize();
                return toRuntimeResolver(initialized);
            }
            return base;
        },
        get isInitialized() {
            return container.isInitialized ?? false;
        },
        createChild: () => container.createChild?.(),
    };
    return wrapped;
}
// =============================================================================
// Type Assertions for Narrowing
// =============================================================================
/**
 * Asserts that a RuntimeResolver provides specific ports.
 *
 * This is a type-level assertion that narrows RuntimeResolver to a typed
 * resolver. The assertion is purely at the type level - no runtime check
 * is performed. The caller is responsible for ensuring correctness.
 *
 * @typeParam TProvides - The port union that the resolver provides
 * @param resolver - The runtime resolver to narrow
 * @returns The same resolver with narrowed type
 *
 * @remarks
 * This function exists to provide a clean API for narrowing without
 * requiring inline type assertions. It's a single point where the
 * "trust boundary" is explicitly documented.
 *
 * **Type Safety Justification:**
 *
 * This function performs a principled type assertion at the boundary between
 * type-erased storage (RuntimeResolver) and type-safe consumption (TypedResolver).
 * The assertion is safe because:
 *
 * 1. Container/Scope always validate ports at runtime - invalid ports throw
 * 2. The caller provides TProvides which must match actual registration
 * 3. This is NOT a blind cast - it's a documented trust boundary
 * 4. The alternative (no type erasure) causes contravariance issues in React state
 *
 * @example
 * ```typescript
 * const resolver: RuntimeResolver = getFromContext();
 *
 * // Narrow to specific ports
 * const typed = assertResolverProvides<typeof LoggerPort | typeof DatabasePort>(resolver);
 * const logger = typed.resolve(LoggerPort);  // Type-safe!
 * ```
 */
export function assertResolverProvides(resolver) {
    // This function creates a TypedResolver wrapper around RuntimeResolver.
    // The type assertion in the return type is INTENTIONAL and DOCUMENTED:
    //
    // - RuntimeResolver stores type-erased containers for React state compatibility
    // - TypedResolver provides compile-time port constraints
    // - The runtime container ALWAYS validates ports exist before resolving
    // - This boundary shifts type responsibility to the caller (who knows TProvides)
    //
    // We construct a new object to make the boundary explicit rather than
    // using a direct cast, even though both achieve the same result.
    return createTypedResolverWrapper(resolver);
}
/**
 * Creates a TypedResolver wrapper around a RuntimeResolver.
 *
 * This helper function encapsulates the type boundary where unknown
 * is narrowed to InferService<P>. The narrowing is safe because:
 * - Container validates ports at runtime
 * - Caller guarantees TProvides via assertResolverProvides contract
 *
 * @internal
 */
function createTypedResolverWrapper(resolver) {
    // The resolve/resolveAsync methods use a return type annotation that
    // performs the type narrowing. This is equivalent to a cast but is
    // expressed as a return type, which is the idiomatic pattern for
    // type narrowing functions in TypeScript.
    return {
        resolve(port) {
            // Runtime: resolver validates port exists, throws if not
            // Type: InferService<P> is correct by caller's TProvides guarantee
            return resolver.resolve(port);
        },
        resolveAsync(port) {
            return resolver.resolveAsync(port);
        },
        createScope() {
            return createTypedResolverWrapper(resolver.createScope());
        },
        dispose() {
            return resolver.dispose();
        },
        has(port) {
            return resolver.has(port);
        },
        get isDisposed() {
            return resolver.isDisposed;
        },
    };
}
