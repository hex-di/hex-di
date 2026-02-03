# AI/LLM Ergonomics Analysis: @hex-di/runtime Package

## Executive Summary

The `@hex-di/runtime` package demonstrates **excellent AI/LLM ergonomics** with strong explicit contracts, deterministic behavior, and high-quality diagnostic output. The codebase is highly suitable for AI-assisted development workflows, though there are some opportunities for improvement in areas like type annotation clarity and naming consistency.

## Strengths

### 1. Explicit Contracts (Score: 9/10)

#### Type-Level Contracts

- **Comprehensive type parameters**: Every major type (`Container`, `Scope`, `LazyContainer`) uses explicit type parameters that encode behavior at the type level
- **Branded types**: Use of unique symbols (`ContainerBrand`, `ScopeBrand`) prevents structural type confusion
- **Phase-state typing**: `ContainerPhase` type parameter tracks initialization state, preventing async port resolution before initialization
- **Discriminated unions**: Clear use of literal types for modes (`ContainerKind`, `InheritanceMode`)

```typescript
// Excellent: Type parameters encode all behavioral constraints
export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
>
```

#### Documentation Contracts

- **Comprehensive JSDoc**: Every public type and method has detailed JSDoc with `@remarks`, `@example`, and `@throws` sections
- **Preconditions clearly stated**: Methods document when they throw, what states are required
- **Examples included**: Most complex types include usage examples in documentation

### 2. Deterministic Behavior (Score: 8.5/10)

#### State Management

- **Immutable by default**: Containers are frozen after creation
- **Explicit lifecycle**: Clear initialization → active → disposed state machine
- **No hidden state**: All state accessible via inspection APIs
- **Predictable caching**: Lifetime-based caching with clear rules (singleton/scoped/transient)

#### Execution Order

- **Dependency resolution is deterministic**: Uses explicit resolution context to track and prevent cycles
- **Disposal order is predictable**: LIFO order with clear parent-child relationships
- **Hook execution is well-ordered**: beforeResolve → resolution → afterResolve pattern

### 3. High-Quality Diagnostics (Score: 9.5/10)

#### Error Hierarchy

- **Structured error classes**: All errors extend `ContainerError` with consistent properties
- **Error codes**: Every error has a stable `code` property for programmatic handling
- **Context preservation**: Errors include relevant context (port names, dependency chains, causes)
- **Programming vs runtime errors**: Clear distinction via `isProgrammingError` property

```typescript
export class CircularDependencyError extends ContainerError {
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;
  readonly dependencyChain: readonly string[]; // Full context preserved
}
```

#### Inspection Capabilities

- **Symbol-based inspection**: `INTERNAL_ACCESS` provides frozen snapshots of internal state
- **Comprehensive snapshots**: Include memoization state, scope trees, adapter info
- **Inspector API**: High-level API for DevTools integration with event subscription
- **Tracing API**: Performance monitoring and resolution tracking

### 4. Ambiguity Reduction (Score: 8/10)

#### Naming Clarity

- **Consistent terminology**: "Container" vs "Scope" distinction is clear and consistent
- **Descriptive method names**: `createScope`, `createChild`, `resolveAsync` are self-documenting
- **Type utility functions**: Clear names like `InferContainerProvides`, `IsResolvable`

#### Behavioral Clarity

- **Explicit async handling**: Separate `resolve` and `resolveAsync` methods
- **Clear lifetime semantics**: `singleton`, `scoped`, `transient` are industry-standard terms
- **Override vs extend**: Child containers clearly distinguish between overriding and extending

## Areas for Improvement

### 1. Type Annotation Redundancy

**Issue**: Some internal functions could benefit from more explicit type annotations for AI comprehension.

**Current**:

```typescript
export type SyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null
) => unknown; // Returns unknown - could be more explicit
```

**Suggested Improvement**:

```typescript
export type SyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null
) => unknown; // Returns unknown because service types are erased at this level
```

### 2. Magic Values Documentation

**Issue**: Some special values lack inline documentation explaining their significance.

**Current**:

```typescript
TExtends extends Port<unknown, string> = never,  // Why never as default?
```

**Suggested Improvement**:

```typescript
TExtends extends Port<unknown, string> = never,  // never = root container (no extends)
```

### 3. Complex Conditional Types

**Issue**: Some type-level conditionals are complex and could benefit from intermediate type aliases.

**Current**:

```typescript
resolve<
  P extends TPhase extends "initialized"
    ? TProvides | TExtends
    : Exclude<TProvides | TExtends, TAsyncPorts>,
>(port: P): InferService<P>;
```

**Suggested Improvement**:

```typescript
type ResolvablePorts<TPhase, TProvides, TExtends, TAsyncPorts> =
  TPhase extends "initialized"
    ? TProvides | TExtends
    : Exclude<TProvides | TExtends, TAsyncPorts>;

resolve<P extends ResolvablePorts<TPhase, TProvides, TExtends, TAsyncPorts>>(
  port: P
): InferService<P>;
```

### 4. Inspection API Discoverability

**Issue**: While inspection APIs exist, they're accessed via symbols which may not be immediately discoverable.

**Current**:

```typescript
container[INTERNAL_ACCESS](); // Not discoverable without knowing the symbol
```

**Suggested Improvement**:
Add direct property access as shown in the types but ensure implementation:

```typescript
container.inspector.getSnapshot(); // More discoverable
```

## AI-Specific Optimizations Implemented

### 1. Inspectable Artifacts

- ✅ Frozen snapshots of internal state
- ✅ MemoMap inspection with resolution timestamps
- ✅ Scope tree visualization
- ✅ Adapter dependency graphs

### 2. Explicit Structure

- ✅ All implicit contracts made explicit in types
- ✅ Discriminated unions over loose strings
- ✅ Branded types for semantic distinctions
- ✅ Phase-state typing for compile-time safety

### 3. High-Quality Diagnostics

- ✅ Structured error hierarchy with codes
- ✅ Context preservation in errors
- ✅ Clear error messages with solutions
- ✅ Distinction between programming and runtime errors

### 4. Deterministic Behavior

- ✅ Immutable containers after creation
- ✅ Predictable resolution order
- ✅ Explicit lifecycle states
- ✅ No hidden mutable state

## Recommendations for Further Optimization

### Priority 1: Enhanced Type Documentation

- Add inline comments explaining type parameter defaults
- Document why certain patterns are used (e.g., `[T] extends [never]` for distribution prevention)
- Create type aliases for complex conditional types

### Priority 2: Improve Naming Consistency

- Consider renaming internal types to be more explicit (e.g., `RuntimeAdapterFor` → `RuntimeAdapterForPort`)
- Add suffix conventions documentation (e.g., `*Snapshot`, `*State`, `*Info`)

### Priority 3: Add Validation Helpers

- Create runtime validation functions that produce detailed error messages
- Add schema validation at container boundaries
- Implement invariant checking helpers

### Priority 4: Enhanced Tracing

- Add structured logging with correlation IDs
- Implement decision point logging
- Create audit trail for state transitions

## Conclusion

The `@hex-di/runtime` package is **highly optimized for AI/LLM comprehension** with excellent patterns that reduce ambiguity and increase predictability. The codebase demonstrates:

1. **Strong explicit contracts** through comprehensive typing and documentation
2. **Deterministic behavior** with immutable state and predictable execution
3. **Excellent diagnostics** with structured errors and inspection capabilities
4. **Low ambiguity** through consistent naming and clear behavioral distinctions

The suggested improvements are minor refinements to an already well-architected system. The package serves as a good example of AI-friendly architecture that maximizes the effectiveness of AI agents during development, review, and debugging phases.

**Overall AI Ergonomics Score: 8.75/10**

### Key Takeaways for AI Agents

When working with this codebase:

1. Trust the type system - it encodes most behavioral constraints
2. Use the inspection APIs to understand runtime state
3. Rely on error messages - they include context and solutions
4. Follow the clear separation between Container (root/child) and Scope
5. Understand the phase-state pattern for async initialization safety
