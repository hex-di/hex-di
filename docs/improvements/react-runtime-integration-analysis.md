# React-Runtime Integration Analysis

## Executive Summary

The integration between `@hex-di/runtime` and `@hex-di/react` demonstrates **excellent architectural separation** with clean boundaries and proper framework isolation. React concepts do not leak into the runtime layer, and the integration maintains full type safety while preserving compile-time guarantees.

## Architectural Findings

### ✅ Clean Separation Achieved

1. **No React Imports in Runtime**
   - The runtime package has zero React dependencies
   - All React references are in comments only (documentation)
   - No React types, hooks, or lifecycle concepts in runtime code
   - Package.json confirms: runtime depends only on `@hex-di/core` and `@hex-di/graph`

2. **Unidirectional Dependencies**
   - React package depends on runtime → never the reverse
   - Runtime exports symbols (`INTERNAL_ACCESS`) as general inspection API
   - React consumes these symbols without runtime knowing about React

3. **Port Pattern Integrity**
   - Runtime defines no ports itself - remains pure infrastructure
   - Ports are defined by applications using `@hex-di/core`
   - Container/Scope types are parameterized by port unions from outside

## Integration Patterns

### Provider Architecture

```typescript
// React package creates structural types that match Container shape
interface ContainerLike<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
  createScope(name?: string): Resolver<TProvides>;
  dispose(): Promise<void>;
  has(port: Port<unknown, string>): boolean;
  readonly isDisposed: boolean;
  readonly isInitialized: boolean;
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
}
```

**Key Design Decisions:**

- Uses structural typing to accept both root and child containers
- Avoids accessing conditional properties that differ between container types
- Uses `INTERNAL_ACCESS` symbol for child detection without throwing errors

### Hook Design

```typescript
export function usePort<TProvides extends Port<unknown, string>, P extends TProvides>(
  port: P
): InferService<P> {
  const context = useContext(ResolverContext);
  if (context === null) {
    throw new MissingProviderError("usePort", "ContainerProvider");
  }
  const resolver = context.resolver as { resolve: (port: Port<unknown, string>) => unknown };
  return resolver.resolve(port) as InferService<P>;
}
```

**Type Safety Patterns:**

- Returns non-nullable types with proper runtime guards
- Throws explicit errors when used outside providers
- Maintains full type inference from port to service

### Resolver Abstraction

The React package introduces a `Resolver<TProvides>` interface that abstracts over Container and Scope:

```typescript
export interface Resolver<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
  createScope(name?: string): Resolver<TProvides>;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}
```

This solves the union incompatibility issue when storing `Container | Scope` in React context by providing a common structural interface.

## Type Safety Verification

### ✅ Compile-Time Guarantees Preserved

1. **Port Resolution Type Safety**
   - `usePort(port)` returns correctly inferred service type
   - Compile error if port not in TProvides union
   - No `any` types in the chain

2. **Provider Type Constraints**
   - Containers must structurally match expected interface
   - Child containers properly detected via internal state
   - Type parameters flow through without loss

3. **Error Boundary Integration**
   - Programming errors (CircularDependencyError) propagate correctly
   - Runtime errors (FactoryError) caught by Error Boundaries
   - Disposal states tracked synchronously for React concurrent mode

## Potential Improvements

### 1. Formalize Internal Access Contract

Currently `INTERNAL_ACCESS` is exported from runtime's public API. Consider:

- Moving to a dedicated `@hex-di/runtime/integration` export path
- Document as semi-public API for framework integrations
- Add version compatibility guarantees

### 2. Enhance Resolver Type Documentation

The `Resolver` interface solves a complex type problem. Add:

- More detailed JSDoc explaining the union incompatibility it solves
- Examples showing why direct `Container | Scope` unions fail
- Migration guide for custom integrations

### 3. Consider React 19 Features

With React 19's improved Suspense and use() hook:

- Explore native async component patterns
- Investigate Server Components compatibility
- Consider activity-based state management integration

## Violations Found: NONE

No architectural violations were detected:

- ✅ No React imports in runtime
- ✅ No React-specific types in port definitions
- ✅ No lifecycle concepts in core interfaces
- ✅ Full type safety maintained
- ✅ Proper error propagation
- ✅ Clean provider/hook separation

## Best Practices Demonstrated

1. **Structural Typing Over Nominal**
   - React uses structural `ContainerLike` interface
   - Avoids coupling to specific Container class implementations
   - Enables testing with mock containers

2. **Symbol-Based Feature Detection**
   - Uses `INTERNAL_ACCESS` symbol for capability checking
   - Graceful fallback for mocks without internal access
   - No try-catch for expected errors (avoids console noise)

3. **Factory Pattern for Type Binding**
   - `createTypedHooks<TProvides>()` captures types at creation
   - Avoids global type registries
   - Enables multiple isolated DI contexts

4. **Disposal State Synchronization**
   - Scope lifecycle events use synchronous emission
   - Compatible with React's `useSyncExternalStore`
   - Enables reactive unmounting on external disposal

## Conclusion

The integration between `@hex-di/runtime` and `@hex-di/react` exemplifies clean architecture principles. The runtime remains completely agnostic to React while providing sufficient extension points through symbols and interfaces. The React package consumes these extension points without contaminating the runtime with framework-specific concepts.

This design ensures:

- Runtime can be used with any framework (Vue, Angular, Svelte, etc.)
- React integration maintains full type safety
- Both packages can evolve independently
- Testing remains simple with structural mocks
- Zero runtime overhead from abstraction layers

The integration serves as a reference implementation for how to properly bridge a framework-agnostic DI container with a specific UI framework while maintaining architectural integrity and type safety.
