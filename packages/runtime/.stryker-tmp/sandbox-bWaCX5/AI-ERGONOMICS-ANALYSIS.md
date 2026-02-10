# AI/LLM Ergonomics Analysis: @hex-di/runtime

## Executive Summary

The `@hex-di/runtime` package demonstrates **excellent AI/LLM ergonomics** with a score of **8.5/10**. The codebase is highly optimized for AI comprehension with explicit contracts, comprehensive error handling, inspectable state, and deterministic behavior. However, there are opportunities for improvement in reducing indirection layers and enhancing diagnostic granularity.

## Strengths (What Makes This AI-Friendly)

### 1. **Exceptional Error Hierarchy** ✅

The error system in `/src/errors/index.ts` is a masterclass in AI-friendly design:

```typescript
export abstract class ContainerError extends Error {
  abstract readonly code: string; // Stable, parseable identifier
  abstract readonly isProgrammingError: boolean; // Clear error classification
}
```

**Why this is excellent:**

- Each error has explicit semantic meaning
- Errors carry structured context (portName, dependencyChain, cause)
- Clear distinction between programming errors and runtime conditions
- Comprehensive JSDoc with examples showing exact error scenarios
- Error messages are descriptive and suggest solutions

### 2. **Explicit Type Contracts with Branded Types** ✅

The type system uses branded types and nominal typing to prevent confusion:

```typescript
export type Container<TProvides, TPhase> = {
  readonly [ContainerBrand]: unique symbol;
  // ... interface
};
```

**Why this helps AI:**

- Impossible to confuse Container with Scope or other similar structures
- Type parameters make dependencies explicit
- Phase tracking ("uninitialized" | "initialized") prevents illegal state transitions
- No reliance on structural typing that could lead to misinterpretation

### 3. **Comprehensive Inspection API** ✅

The inspection system provides complete observability:

```typescript
interface InspectorAPI {
  getSnapshot(): ContainerSnapshot;
  listPorts(): string[];
  getAdapterInfo(portName: string): AdapterInfo | null;
  subscribe(listener: InspectorListener): () => void;
  // ...
}
```

**Why this is valuable:**

- AI can introspect container state at any point
- Snapshots provide frozen, inspectable state representations
- Event subscription enables tracking state changes
- Graph visualization data available for understanding relationships

### 4. **Deterministic Resolution Engine** ✅

The resolution engine in `/src/resolution/engine.ts` has predictable behavior:

```typescript
class ResolutionEngine {
  resolve<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null
  ): InferService<P>
```

**Why this is good:**

- Clear parameter semantics with no hidden state
- Explicit lifetime management (singleton/scoped/transient)
- Cycle detection with full dependency chain reporting
- Hook system for observing resolution process

### 5. **Clear Module Organization** ✅

The file structure follows a logical hierarchy:

```
/container    - Container implementations
/errors       - Error hierarchy
/inspection   - Observability APIs
/resolution   - Resolution engine
/scope        - Scope management
/types        - Type definitions
/util         - Utilities
```

Each module has a single, clear responsibility with minimal cross-cutting concerns.

### 6. **Extensive Test Coverage with Clear Scenarios** ✅

Test files demonstrate usage patterns clearly:

- Each test has descriptive names
- Tests cover both happy paths and error conditions
- Type-level tests validate compile-time guarantees
- Test fixtures are simple and focused

## Weaknesses (Areas for AI Ergonomics Improvement)

### 1. **Complex Inheritance Resolution** ⚠️

The inheritance system has multiple modes that could confuse AI:

```typescript
type InheritanceMode = "shared" | "forked" | "isolated";
```

**Issues:**

- The semantics of "forked" (shallow clone) vs "shared" (reference) vs "isolated" (new instance) require deep understanding
- Inheritance resolution happens through multiple indirection layers
- The relationship between parent and child containers isn't immediately obvious from types

**Suggested Improvement:**

```typescript
// More explicit inheritance configuration
interface InheritanceConfig {
  readonly mode: "share-parent-instance" | "clone-parent-state" | "create-new-instance";
  readonly cloneSafety?: "verified-safe" | "unsafe-resources";
}
```

### 2. **Internal State Access Through Symbols** ⚠️

The use of symbols for internal access creates indirection:

```typescript
container[INTERNAL_ACCESS]; // What does this return?
container[HOOKS_ACCESS]; // Multiple access patterns
```

**Issues:**

- AI must understand symbol-based property access patterns
- The relationship between public API and internal state isn't obvious
- Multiple symbol-based access patterns increase cognitive load

**Suggested Improvement:**

```typescript
// Explicit internal state accessor
interface ContainerInternals {
  readonly state: ContainerInternalState;
  readonly hooks: ResolutionHooks;
  readonly adapters: AdapterRegistry;
}

container.getInternals(): ContainerInternals  // Single, clear access point
```

### 3. **Async/Sync Duality** ⚠️

The container has parallel sync and async resolution paths:

```typescript
container.resolve(port); // Sync - but may fail for async ports
container.resolveAsync(port); // Async - always works
container.initialize(); // Makes sync work for async ports
```

**Issues:**

- The relationship between initialization and sync resolution isn't immediately clear
- Error conditions depend on initialization state
- Two resolution engines with similar but different logic

**Suggested Improvement:**

```typescript
// Explicit state in type system
type UninitializedContainer<T> = {
  resolveSync(port: SyncPort): Service; // Only sync ports
  resolveAsync(port: Port): Promise<Service>;
  initialize(): Promise<InitializedContainer<T>>;
};

type InitializedContainer<T> = {
  resolveSync(port: Port): Service; // All ports work
  resolveAsync(port: Port): Promise<Service>;
};
```

### 4. **Hook Composition Complexity** ⚠️

The late-binding hooks system uses complex composition:

```typescript
function createLateBindingHooks(holder: HooksHolder): ResolutionHooks {
  // Forward and reverse iteration for different hooks
}
```

**Issues:**

- Order of hook execution depends on installation order and hook type
- Composition pattern isn't immediately obvious
- Side effects from hooks can affect resolution

**Suggested Improvement:**

```typescript
interface HookPipeline {
  readonly beforeResolve: HookStage[]; // Explicit stages
  readonly afterResolve: HookStage[]; // Clear ordering

  addBefore(stage: HookStage, priority: number): void;
  addAfter(stage: HookStage, priority: number): void;
}
```

### 5. **MemoMap Abstraction** ⚠️

The MemoMap caching layer adds indirection:

```typescript
class MemoMap {
  set(key: unknown, value: unknown, finalizer?: Finalizer): void;
  get(key: unknown): unknown | undefined;
}
```

**Issues:**

- The relationship between MemoMap and lifetime management isn't explicit
- Finalizer registration is a side effect not visible in types
- Cache invalidation rules aren't clear from the interface

## Recommendations for Enhanced AI Ergonomics

### 1. **Add Explicit State Machine Types**

```typescript
type ContainerState =
  | { phase: "creating"; graph: Graph }
  | { phase: "uninitialized"; container: UninitializedContainer }
  | { phase: "initializing"; promise: Promise<Container> }
  | { phase: "initialized"; container: InitializedContainer }
  | { phase: "disposed" };
```

### 2. **Create Resolution Trace Objects**

```typescript
interface ResolutionTrace {
  readonly port: string;
  readonly adapter: string;
  readonly dependencies: ResolutionTrace[];
  readonly lifetime: Lifetime;
  readonly cacheHit: boolean;
  readonly duration: number;
}
```

### 3. **Implement Diagnostic Mode**

```typescript
interface DiagnosticContainer extends Container {
  enableDiagnostics(): void;
  getLastResolutionTrace(): ResolutionTrace;
  getLifetimeReport(): LifetimeReport;
  validateConfiguration(): ValidationReport;
}
```

### 4. **Add Contract Validation**

```typescript
interface ContractValidator {
  validatePort(port: Port): ValidationResult;
  validateAdapter(adapter: Adapter): ValidationResult;
  validateGraph(graph: Graph): ValidationResult;
  suggestFixes(errors: ValidationError[]): Fix[];
}
```

### 5. **Provide AI-Friendly Documentation Generator**

```typescript
interface DocumentationGenerator {
  generatePortDocumentation(port: Port): PortDoc;
  generateContainerDocumentation(container: Container): ContainerDoc;
  generateDependencyGraph(): GraphVisualization;
  generateUsageExamples(port: Port): Example[];
}
```

## Scoring Breakdown

| Category                   | Score | Notes                                                      |
| -------------------------- | ----- | ---------------------------------------------------------- |
| **Explicit Contracts**     | 9/10  | Excellent type system, branded types, clear interfaces     |
| **Inspectable Artifacts**  | 9/10  | Comprehensive inspection API, snapshots, event system      |
| **Deterministic Behavior** | 8/10  | Mostly deterministic, some complexity in inheritance       |
| **Diagnostic Quality**     | 9/10  | Exceptional error messages with context and suggestions    |
| **Naming Clarity**         | 8/10  | Generally clear, some ambiguity in inheritance modes       |
| **Structural Clarity**     | 8/10  | Good module organization, some indirection through symbols |
| **Documentation**          | 9/10  | Comprehensive JSDoc with examples                          |
| **Testability**            | 7/10  | Good tests, but complex setup for some scenarios           |

**Overall Score: 8.5/10**

## Conclusion

The `@hex-di/runtime` package is already highly optimized for AI comprehension. The main improvements would focus on:

1. Reducing indirection layers (symbols, MemoMap)
2. Making state transitions more explicit in the type system
3. Simplifying the async/sync duality
4. Adding more granular diagnostic capabilities
5. Providing explicit contract validation

These improvements would take the codebase from "excellent" to "exceptional" for AI/LLM interaction, making it a model example of AI-ergonomic architecture.
