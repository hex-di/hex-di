# Analysis: Runtime Enhancements for hex-di Based on Research Findings

## Executive Summary

This analysis examines how research findings on capability-based security (RES-04), resource lifecycle management (RES-03), and contracts with blame attribution (RES-06) can enhance the hex-di DI container runtime. The current implementation provides a solid foundation with scoped containers, lifecycle management, and disposal mechanisms, but lacks key security and safety features that the research identifies as critical for production systems.

**Key research inputs:**

- **RES-03** (Linear & Affine Types): Bernardy et al. (Linear Haskell), Jung et al. (RustBelt), Weiss et al. (Oxide), Munch-Maccagnoni (Resource Polymorphism)
- **RES-04** (Capability-Based Security): Miller et al. (Capability Myths Demolished, Structure of Authority, Distributed Electronic Rights), Swasey et al. (Robust OCap Verification), Tang & Lindley (Rows and Capabilities)
- **RES-06** (Contracts & Blame): Findler & Felleisen (Higher-Order Contracts), Ahmed et al. (Blame for All), New et al. (Gradual Type Theory), Siek et al. (Blame and Coercion), Strickland et al. (Chaperones and Impersonators)

---

## 1. Current Runtime Capabilities

### Existing Features

The hex-di runtime (`packages/runtime`) provides substantial lifecycle management:

#### Container Hierarchy

- **Root containers**: Own the dependency graph, manage async initialization via `AsyncInitializer`
- **Child containers**: Extend/override parent adapters with configurable inheritance modes (`shared`, `forked`, `isolated`)
- **Lazy containers**: Defer graph loading until first use (`"unloaded" | "loading" | "loaded"` phases)
- **Scoped containers**: Provide isolated scoped service instances with depth tracking and parent-child relationships

#### Lifecycle Management

- **LifecycleManager** (`lifecycle-manager.ts`): Tracks child containers/scopes, enforces LIFO disposal ordering
- **Disposal hooks**: Adapters define optional `finalizer` functions for cleanup (`finalizer?(instance: T): void | Promise<void>`)
- **Async initialization**: `AsyncInitializer` handles async factory functions with proper sequencing
- **Scope tracking**: Parent-child scope relationships with automatic cleanup on disposal, depth limits (default 64)

#### Resource Tracking

- **MemoMap**: Singleton and scoped instance caching with disposal support
- **Scope isolation**: Each scope has its own `scopedMemo` for scoped instances
- **Disposal warnings**: `computeDisposalWarnings()` detects when adapters with finalizers depend on adapters without finalizers
- **Disposed state tracking**: Containers and scopes track disposal state; `DisposedScopeError` thrown on use-after-dispose

#### Graph Validation

- Compile-time cycle detection via type-level DFS
- Captive dependency detection (lifetime hierarchy enforcement)
- Duplicate port detection via type-level set operations
- Runtime fallback validation when type-level depth is exceeded

### Notable Gaps

1. **No frozen port references**: Port references passed to adapters are mutable JavaScript objects
2. **Limited blame attribution**: Error messages do not trace back to specific adapter factory invocation sites
3. **No capability attenuation**: Adapter decorators can expand authority, not just narrow it
4. **Missing runtime contract enforcement**: No validation that resolved adapters actually satisfy port interfaces at method level
5. **Weak disposal ordering**: Warning-only system for disposal dependency issues; no enforced topological disposal

---

## 2. Capability-Based Authority Model

### Current Authority Distribution

Port injection distributes authority through constructor parameters:

- Adapters receive resolved services via `factory(deps)` where `deps` is a keyed object of port services
- The graph builder validates dependency satisfaction at compile time (via `TProvides`/`TRequires` phantom types)
- Runtime resolution follows the dependency graph through `ResolutionEngine`

This aligns with the object-capability model: a service can only access the ports explicitly injected into it. The DI container controls capability distribution.

### Ambient Authority Leaks

Several potential ambient authority leaks exist (per Miller et al., "The Structure of Authority"):

1. **Static methods in adapters**: Nothing prevents adapter factories from calling static methods or accessing class-level state that bypasses the port graph
2. **Environment variables**: Adapters can directly access `process.env` without an environment port
3. **Module imports**: Adapters can import and use any module (e.g., `fs`, `http`), bypassing port boundaries entirely
4. **Mutable port references**: Services receive mutable references to injected dependencies, enabling tampering with shared instances

### Authority Flow Analysis

In the current architecture:

- **Ports are capabilities**: A service can only access the ports injected into it (good)
- **Guard policies add a second layer**: Policy checks constrain how capabilities are used (good)
- **But the two layers are independent**: Port injection controls _what_ you can access; guard policies control _whether_ an action is allowed. RES-04 (Tang & Lindley, 2026) suggests these should be unified -- capabilities and effects are dual perspectives on the same structure

---

## 3. Resource Lifecycle Gaps

### Current Lifecycle Issues

Based on RES-03 (linear/affine types), several resource management gaps exist:

#### Double-Dispose Risk

The container tracks `disposed: boolean` state, but nothing prevents a second call:

```typescript
// Current: runtime check only, no compile-time protection
await container.dispose();
await container.dispose(); // Behavior undefined -- may throw, may silently succeed
```

Per Bernardy et al. (Linear Haskell), `dispose()` should be an affine operation: callable at most once.

#### Use-After-Dispose

```typescript
const scope = container.createScope();
await scope.dispose();
scope.resolve(Port); // Throws DisposedScopeError -- but only at runtime
```

The `ScopeImpl` checks `this.disposed` before resolution, which is correct at runtime. But per Jung et al. (RustBelt), the type system should encode this: a disposed scope should have no `resolve` method at the type level.

#### Disposal Order Dependencies

The current warning system (`computeDisposalWarnings`) identifies issues but does not enforce proper ordering:

- Adapters with finalizers may depend on adapters without finalizers
- No topological sort ensures dependencies outlive dependents during disposal
- Warning message format: `"'X' has a finalizer but depends on 'Y' which has no finalizer"`

#### Scope Escape

Per Weiss et al. (Oxide), adapter lifetime management maps to Rust's lifetime system. Scoped adapters have request lifetime, but nothing prevents a scoped service reference from being stored in a singleton, creating a dangling reference after scope disposal.

#### Resource Polymorphism Gap

Per Munch-Maccagnoni (Resource Polymorphism), some adapters need disposal (database connections, file handles) and some do not (pure computation, in-memory caches). The current design handles this correctly (optional `finalizer`), but edge cases arise when a resource-polymorphic decorator wraps a disposable adapter -- the decorator must propagate disposal.

---

## 4. Blame Attribution

### Current Error Messages

Current error types (`ResolutionError` union and friends) provide basic context:

- `CircularDependencyError`: Lists the cycle path
- `FactoryError`: Captures factory exceptions
- `AsyncInitializationRequiredError`: Identifies async/sync mismatch
- `DisposedScopeError`: Identifies use-after-dispose
- `ScopeDepthExceededError`: Identifies runaway scope nesting

### Missing Blame Context

Following RES-06 (Findler & Felleisen, contracts for higher-order functions), errors lack:

1. **Factory provenance**: Which `createAdapter()` call produced the failing adapter? Current errors identify the port name but not the adapter factory's source location.
2. **Contract violations**: No runtime validation that adapters satisfy port interfaces at the method level. A structural mismatch (missing method) fails only when the method is called.
3. **Composition blame**: When adapter composition fails (e.g., a decorator wrapping an incompatible adapter), it is unclear which party is at fault -- the decorator, the inner adapter, or the composition site.

### The Blame Theorem (Ahmed et al., 2011)

In hex-di's architecture:

- The **well-typed** portion = port definitions with their TypeScript types (compile-time checked)
- The **dynamic** portion = runtime adapter resolution and graph construction

The blame theorem guarantees: if types check at the port level, runtime failures are always in the adapter or composition layer, never in the service logic consuming ports. This validates the architecture and means investment should focus on making the dynamic layer (graph builder, adapter resolution) as small and well-checked as possible.

---

## 5. Contract Enforcement Points

### Current Enforcement

Contract enforcement is primarily compile-time via TypeScript's structural typing. Runtime enforcement is minimal:

- Factory execution wrapped in try-catch (captures thrown exceptions)
- Async initialization checks (sync vs async mismatch detection)
- Disposal state checks (boolean flag in scope/container)

### Recommended Enforcement Points

Based on RES-06 (chaperones and contracts), add runtime checks at these boundaries:

| Enforcement Point       | What to Check                               | Blame Target              |
| ----------------------- | ------------------------------------------- | ------------------------- |
| **Adapter binding**     | Adapter implements all port methods         | Adapter factory           |
| **Method invocation**   | Arguments satisfy preconditions             | Caller (service)          |
| **Return values**       | Return types match port contract            | Adapter implementation    |
| **Disposal transition** | Finalizer completes before marking disposed | Container/scope           |
| **Scope boundaries**    | Scoped references do not escape scope       | Service holding reference |

### Chaperone Model (Strickland et al., 2012)

Adapter decorators (adding logging, caching, guard checks) are chaperones -- they wrap the adapter to add behavior while maintaining the port contract. The chaperone model formalizes this:

- **Chaperones** can observe and log but not change the core adapter's return values
- **Guard decorators** can reject (fail fast) but not modify success values
- This is enforced by the decorator type signature

```typescript
/**
 * Chaperone wraps an adapter to enforce contracts without changing identity.
 * Based on Strickland et al. (2012) "Chaperones and Impersonators"
 */
function chaperoneAdapter<T>(adapter: T, port: Port<string, T>, blame: BlameContext): T {
  return new Proxy(adapter as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === "function") {
        return function (this: unknown, ...args: unknown[]) {
          validateArguments(prop as string, args, port, blame);
          const result = value.apply(this, args);
          validateReturnValue(prop as string, result, port, blame);
          return result;
        };
      }

      return value;
    },

    // Prevent mutation of chaperoned adapter
    set() {
      throw new Error(`Cannot mutate chaperoned adapter for ${port.__portName}`);
    },

    defineProperty() {
      throw new Error(`Cannot extend chaperoned adapter for ${port.__portName}`);
    },
  }) as T;
}
```

---

## 6. Concrete Recommendations

Ranked by impact and feasibility.

### Tier 1: High Impact, Low Effort (1-2 days each)

#### R1. Freeze Port References

Freeze all resolved service instances before injection to prevent mutation of shared capability tokens (per Miller et al., "Distributed Electronic Rights in JavaScript").

```typescript
// In resolution engine, before injecting into deps
private freezeService<T>(service: T): Readonly<T> {
  return Object.freeze(service);
}

// In resolve method
const frozenService = this.freezeService(resolvedService);
deps[portName] = frozenService;
```

**Why**: Prevents mutation of shared singleton/scoped instances. Zero performance impact. Aligns with capability-based security model where capabilities are unforgeable tokens.

**Risk**: May break adapters that mutate injected dependencies. Mitigation: audit existing adapters before enabling, provide opt-out per adapter.

#### R2. Blame-Aware Error Messages

Enhance error types with factory provenance and resolution path:

```typescript
interface BlameContext {
  readonly adapterFactory: string; // Source location of createAdapter call
  readonly portContract: string; // Expected port interface name
  readonly violationType: "missing_method" | "wrong_return_type" | "threw_exception";
  readonly resolutionPath: string[]; // Chain of port resolutions leading here
}

class ContractViolationError extends ContainerError {
  readonly _tag = "ContractViolation" as const;

  constructor(
    readonly port: Port<string, unknown>,
    readonly blame: BlameContext,
    readonly actualValue: unknown
  ) {
    super(
      `Adapter for ${port.__portName} violates contract:\n` +
        `  Factory: ${blame.adapterFactory}\n` +
        `  Violation: ${blame.violationType}\n` +
        `  Resolution path: ${blame.resolutionPath.join(" -> ")}`
    );
  }
}
```

**Why**: When an adapter fails, developers currently see only the port name. With blame context, they see exactly which factory produced the bad adapter and the full resolution chain.

#### R3. Disposal State Branding

Encode disposal state in phantom types so use-after-dispose is a compile-time error:

```typescript
type ActiveContainer<T> = Container<T> & { readonly _phase: "active" };
type DisposedContainer<T> = Container<T> & { readonly _phase: "disposed" };

// dispose() transitions the type
class Container<TProvides, TPhase extends "active" | "disposed" = "active"> {
  resolve<P extends Port>(port: P): TPhase extends "active" ? InferService<P> : never; // Compile-time error on disposed container

  dispose(): Promise<Container<TProvides, "disposed">>;
}
```

**Why**: Zero runtime cost (phantom types only). Catches use-after-dispose at compile time. The `ScopeImpl` already uses `TPhase` -- extend this pattern to containers.

### Tier 2: High Impact, Medium Effort (1 week each)

#### R4. Contract Validation at Adapter Binding

Validate at graph build time or first resolution that the adapter factory produces an object satisfying the port's structural contract:

```typescript
function validateAdapterContract<T>(adapter: T, port: Port<string, T>, blame: BlameContext): void {
  if (adapter === null || adapter === undefined) {
    throw new ContractViolationError(
      port,
      {
        ...blame,
        violationType: "missing_method",
      },
      adapter
    );
  }

  // For object ports, check method presence
  if (typeof adapter === "object") {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(adapter) ?? adapter);
    // Compare against known port interface methods if available
  }
}
```

**Why**: Catches structural mismatches early (at binding, not at first use). Blame is assigned to the adapter factory, not to the consuming service.

#### R5. Scoped Reference Tracking

Detect when scoped service references escape their scope:

```typescript
type ScopedRef<T, ScopeId extends string> = T & {
  readonly __scopeId: ScopeId;
};

function detectScopeEscape<T>(ref: ScopedRef<T, string>, currentScope: string): void {
  if (ref.__scopeId !== currentScope) {
    throw new ScopeEscapeError(ref.__scopeId, currentScope);
  }
}
```

**Why**: Prevents dangling references when scoped services are stored in singleton adapters. Per Weiss et al. (Oxide), scoped references should not outlive their scope.

#### R6. Capability Analyzer (Dev Tool)

Static analysis tool that detects ambient authority access in adapter code:

```typescript
interface CapabilityViolation {
  readonly type: "ambient_access" | "global_mutation" | "static_import";
  readonly location: string;
  readonly suggestion: string;
}

// Detects patterns like:
// - process.env access -> "Use EnvironmentPort instead"
// - fs.readFile -> "Use FileSystemPort instead"
// - fetch() -> "Use HttpPort instead"
// - global/static state mutation -> "Inject as dependency"
```

**Why**: Makes authority flow visible. Per Miller et al. ("Structure of Authority"), security is not a separable concern -- ambient access patterns undermine the capability model.

### Tier 3: Medium Impact, High Effort (2-3 weeks each)

#### R7. Chaperone-Based Contract Enforcement

Full Proxy-based chaperone implementation (see Section 5). Configurable enforcement levels: `"off"` (production), `"warn"` (staging), `"strict"` (development/testing).

**Why**: Catches contract violations at method invocation time with precise blame attribution. Performance overhead managed via configuration.

#### R8. Formal Disposal Ordering

Replace warning-based disposal with enforced topological ordering:

```typescript
class DisposalOrchestrator {
  private buildDisposalOrder(adapters: AdapterConstraint[]): string[] {
    const graph = buildDependencyGraph(adapters);
    return topologicalSort(graph).reverse(); // Dispose dependents first
  }

  async disposeInOrder(instances: Map<string, unknown>): Promise<void> {
    const order = this.buildDisposalOrder([...this.adapters]);
    for (const portName of order) {
      const instance = instances.get(portName);
      const adapter = this.findAdapter(portName);
      if (adapter?.finalizer && instance) {
        await adapter.finalizer(instance);
      }
    }
  }
}
```

**Why**: Guarantees that dependencies outlive dependents during disposal. Eliminates use-after-dispose during teardown. Per RES-03, disposal ordering is the complement of initialization ordering.

#### R9. Resource Polymorphism

Type-level tracking of whether an adapter owns disposable resources:

```typescript
type Disposable<T> = T & { readonly __disposable: true };
type NonDisposable<T> = T & { readonly __disposable: false };
type ResourcePolymorphic<T> = Disposable<T> | NonDisposable<T>;
```

**Why**: Per Munch-Maccagnoni, code should be polymorphic over whether resources need deterministic cleanup. The container's disposal logic already handles this at runtime (optional `finalizer`), but type-level encoding catches errors when decorators wrap disposable adapters without propagating disposal.

### Tier 4: Research / Future

#### R10. Effect-Capability Unification

Unify the Result error channel (row-based effects) with the guard system (capability-based authority) into a single type-level system. Per Tang & Lindley (POPL 2026), capabilities and effects are dual perspectives: effects describe what computations _do_, capabilities describe what computations _can do_.

A service requiring `hasPermission("admin")` would have this reflected in its type: `AdminService<Requires<"admin">>`. The graph builder verifies that the capability is provided.

---

## Risk Mitigation

| Enhancement              | Risk                                    | Mitigation                                      |
| ------------------------ | --------------------------------------- | ----------------------------------------------- |
| Frozen ports (R1)        | Breaks existing mutation patterns       | Audit adapters first; opt-out per adapter       |
| Contract checks (R4, R7) | Performance overhead                    | Dev-mode only by default; configurable levels   |
| Disposal ordering (R8)   | Circular dependency edge cases          | Fallback to current warning system for cycles   |
| Scope branding (R5)      | False positive escape detection         | Explicit `allowEscape()` annotation             |
| Chaperones (R7)          | Proxy overhead in hot paths             | Selective application; benchmark critical paths |
| Capability analyzer (R6) | False positives for legitimate patterns | Configurable rules; allow-list support          |

## Implementation Roadmap

### Phase 1: Security Hardening (Week 1)

- R1: Freeze port references in `ResolutionEngine`
- R6: Capability analyzer as opt-in dev tool

### Phase 2: Error Enhancement (Week 2)

- R2: Blame-aware error messages with `BlameContext`
- Source location tracking in `createAdapter()`

### Phase 3: Lifecycle Safety (Weeks 3-4)

- R3: Disposal state branding with phantom types
- R8: Formal disposal ordering via topological sort

### Phase 4: Contract Enforcement (Weeks 5-6)

- R4: Binding-time contract validation
- R7: Chaperone pattern with configurable enforcement

### Phase 5: Advanced Features (Weeks 7-9)

- R5: Scoped reference tracking
- R9: Resource polymorphism at the type level

---

## Conclusion

The hex-di runtime has a solid foundation for lifecycle management and scoping. The research findings from RES-03, RES-04, and RES-06 point to three key enhancement areas:

1. **Security**: Implement capability-based containment via frozen references and ambient authority detection. This prevents adapters from breaking encapsulation and accessing unauthorized resources. Ports already function as capabilities in the object-capability sense -- making this explicit (frozen, unforgeable tokens) strengthens the security model.

2. **Safety**: Add resource lifecycle tracking with compile-time guarantees where possible. Phantom types and branded references can catch use-after-dispose, double-dispose, and scope escape at compile time rather than runtime. The blame theorem (Ahmed et al., 2011) guarantees that with well-typed port definitions, any runtime failure must originate in the adapter or composition layer.

3. **Debuggability**: Enhance error messages with blame attribution and contract violation details. When an adapter violates its port contract, the error should identify exactly which `createAdapter()` call produced the failing adapter, what the violation was, and the full resolution path that led to the failure.

The recommended enhancements progress from high-impact, low-effort items (frozen references, better errors) to more sophisticated features (chaperones, formal disposal ordering). Starting with Tier 1 provides immediate value while laying groundwork for the deeper enhancements. These improvements align hex-di with state-of-the-art research in capability-based security, resource management, and gradual typing.
