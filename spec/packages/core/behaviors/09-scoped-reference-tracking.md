# 09 — Scoped Reference Tracking

Branded types encode scope identity on resolved references, preventing cross-scope leaks at compile time. See [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md).

## BEH-CO-09-001: ScopedRef Branded Type

Resolved services within a scope are wrapped in a `ScopedRef<T, ScopeId>` branded type that encodes both the service interface and the scope identity. References from different scopes are type-incompatible.

```ts
declare const __scopeBrand: unique symbol;

type ScopedRef<T, TScopeId extends string> = T & {
  readonly [__scopeBrand]: TScopeId;
};

// Scope-aware container resolution
interface ScopedContainer<
  TProvides,
  TScopeId extends string,
  TPhase extends ContainerPhase = "active",
> {
  resolve: TPhase extends "active"
    ? <N extends keyof TProvides>(port: Port<N, TProvides[N]>) => ScopedRef<TProvides[N], TScopeId>
    : never;
  readonly scopeId: TScopeId;
}
```

**Exported from**: `scopes/types.ts` (proposed).

**Algorithm**:

1. When `createScope()` is called, a new scope identity string is generated (e.g., `"scope-request-1"`)
2. The returned `ScopedContainer` carries this identity as `TScopeId`
3. All services resolved from this scope are branded as `ScopedRef<T, TScopeId>`
4. At runtime, the brand has no overhead — it is a phantom type erased at compilation
5. TypeScript structural typing is bypassed by the unique symbol brand, preventing cross-scope assignment

**Behavior Table**:

| Operation                         | Scope A (`"req-1"`)          | Scope B (`"req-2"`)                   | Result                                            |
| --------------------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------------- |
| Resolve `LoggerPort` from Scope A | `ScopedRef<Logger, "req-1">` | N/A                                   | Branded with `"req-1"`                            |
| Resolve `LoggerPort` from Scope B | N/A                          | `ScopedRef<Logger, "req-2">`          | Branded with `"req-2"`                            |
| Assign A's logger to B's variable | `ScopedRef<Logger, "req-1">` | Expected `ScopedRef<Logger, "req-2">` | Type error: `"req-1"` not assignable to `"req-2"` |
| Use A's logger within Scope A     | `ScopedRef<Logger, "req-1">` | N/A                                   | OK                                                |

**Example**:

```ts
import { buildContainer, port } from "@hex-di/core";

interface UserRepo {
  findById(id: string): Promise<User | null>;
}

const UserRepoPort = port<UserRepo>()({ name: "UserRepo", direction: "outbound" });

const container = buildContainer(graph);

// Create two request scopes
const scopeA = container.createScope<"req-1">();
// Type: ScopedContainer<Ports, "req-1">

const scopeB = container.createScope<"req-2">();
// Type: ScopedContainer<Ports, "req-2">

const repoA = scopeA.resolve(UserRepoPort);
// Type: ScopedRef<UserRepo, "req-1">

const repoB = scopeB.resolve(UserRepoPort);
// Type: ScopedRef<UserRepo, "req-2">

// Cross-scope assignment is a type error
function processRequest(repo: ScopedRef<UserRepo, "req-2">) {
  /* ... */
}
processRequest(repoA);
// ^^^^^^^^^ Type error: ScopedRef<UserRepo, "req-1"> is not assignable
//           to ScopedRef<UserRepo, "req-2">
```

**Design notes**:

- Inspired by Rust's lifetime parameters (Weiss et al., 2019 — Oxide) and RustBelt's ownership model (Jung et al., 2018). `TScopeId` functions as a lifetime parameter encoding reference provenance.
- The brand is intersection-based (`T & { [brand]: ScopeId }`), so `ScopedRef<T, S>` is still assignable to `T` in contexts that do not require scope tracking. This enables gradual adoption.
- Runtime scope identity is a string for debuggability. The type-level identity uses literal types for precision.
- Cross-ref: [BEH-CO-07-002](07-disposal-state-branding.md) (scope containers inherit phase).

## BEH-CO-09-002: Scope Escape Detection

Functions that accept scoped references must declare the expected scope identity. Passing a reference from a different scope (or an unscoped reference) to a scope-expecting function is a compile-time error.

```ts
// Scope-bound function signature
type ScopeBound<TScopeId extends string> = {
  processInScope<T>(ref: ScopedRef<T, TScopeId>): void;
};

// Escape detector: prevents returning scoped refs from scope callbacks
type ScopeCallback<TScopeId extends string, TResult> = (
  scope: ScopedContainer<TProvides, TScopeId>
) => TResult;

// TResult must not contain ScopedRef<*, TScopeId>
type AssertNoEscape<TResult, TScopeId extends string> =
  TResult extends ScopedRef<infer _T, TScopeId>
    ? ["ERROR: Scoped reference cannot escape its scope", TScopeId]
    : TResult;
```

**Exported from**: `scopes/escape.ts` (proposed).

**Algorithm**:

1. When a scope callback is registered, its return type is checked via `AssertNoEscape`
2. If the return type structurally matches `ScopedRef<*, TScopeId>`, a descriptive type error is emitted
3. The error uses a tuple-as-error-message pattern (same as adapter lifetime validation)
4. Nested scoped references (e.g., `{ repo: ScopedRef<T, S> }`) are detected via recursive conditional types
5. At runtime, scope disposal clears all cached instances, making escaped references throw on access

**Behavior Table**:

| Callback Return Type                     | `AssertNoEscape` Result                                        | Outcome        |
| ---------------------------------------- | -------------------------------------------------------------- | -------------- |
| `number`                                 | `number`                                                       | OK (no escape) |
| `ScopedRef<Logger, "req-1">`             | `["ERROR: Scoped reference cannot escape its scope", "req-1"]` | Type error     |
| `{ data: string }`                       | `{ data: string }`                                             | OK (no escape) |
| `{ repo: ScopedRef<UserRepo, "req-1"> }` | Type error (recursive detection)                               | Type error     |
| `Promise<ScopedRef<T, "req-1">>`         | Type error (unwrapped detection)                               | Type error     |

**Example**:

```ts
import { withScope } from "@hex-di/core";

// withScope enforces escape prevention
const result = withScope(container, scope => {
  const logger = scope.resolve(LoggerPort);
  // Type: ScopedRef<Logger, ScopeId>

  logger.log("processing request");

  return logger;
  // ^^^^^^ Type error: Scoped reference cannot escape its scope
});

// Correct usage — extract data, not references
const result = withScope(container, scope => {
  const repo = scope.resolve(UserRepoPort);
  const user = await repo.findById("123");
  return user; // OK — User is not a ScopedRef
});
```

**Design notes**:

- The escape detection is inspired by Rust's borrow checker (Weiss et al., 2019): references cannot outlive their scope. In Rust this is enforced via lifetimes; in TypeScript, via branded type checking on return positions.
- Recursive escape detection adds type-checking overhead proportional to the depth of the return type. For deeply nested types, TypeScript may hit recursion limits. Mitigation: limit detection depth to 5 levels.
- The `withScope` pattern is analogous to Rust's closure-based borrow scoping (e.g., `Mutex::lock` returning a guard that drops at scope exit).
- Cross-ref: [BEH-CO-09-001](#beh-co-09-001-scopedref-branded-type), [BEH-CO-07-002](07-disposal-state-branding.md).

## BEH-CO-09-003: Explicit Scope Transfer

When a scoped reference must legitimately cross scope boundaries (e.g., passing a database connection from a parent scope to a child scope), an explicit `transferRef` operation re-brands the reference with the target scope identity.

```ts
function transferRef<T, TFrom extends string, TTo extends string>(
  ref: ScopedRef<T, TFrom>,
  fromScope: ScopedContainer<TProvides, TFrom>,
  toScope: ScopedContainer<TProvides, TTo>
): ScopedRef<T, TTo>;

// Transfer tracking record
interface TransferRecord<TFrom extends string, TTo extends string> {
  readonly fromScope: TFrom;
  readonly toScope: TTo;
  readonly transferredAt: number;
  readonly portName: string;
}
```

**Exported from**: `scopes/transfer.ts` (proposed).

**Algorithm**:

1. Caller provides the scoped reference, source scope, and target scope
2. Validate that the source scope is still `"active"` (runtime check)
3. Validate that the target scope is still `"active"` (runtime check)
4. Record the transfer in the container's transfer log (for disposal ordering)
5. Return the same underlying service instance branded with the target scope's identity
6. When the source scope is disposed, transferred references remain valid (owned by target scope now)
7. When the target scope is disposed, the transferred reference becomes invalid

**Behavior Table**:

| Source Scope | Target Scope | Transfer Result                            |
| ------------ | ------------ | ------------------------------------------ |
| `"active"`   | `"active"`   | `ScopedRef<T, TTo>` — re-branded reference |
| `"active"`   | `"disposed"` | Runtime error: target scope is disposed    |
| `"disposed"` | `"active"`   | Runtime error: source scope is disposed    |
| Same scope   | Same scope   | No-op: returns reference unchanged         |

**Example**:

```ts
import { transferRef, withScope } from "@hex-di/core";

const parentScope = container.createScope<"parent">();
const childScope = container.createScope<"child">();

const parentDb = parentScope.resolve(DBPort);
// Type: ScopedRef<Database, "parent">

// Explicit transfer — re-brands for child scope
const childDb = transferRef(parentDb, parentScope, childScope);
// Type: ScopedRef<Database, "child">

// Now usable within child scope
function handleChildRequest(db: ScopedRef<Database, "child">) {
  db.query("SELECT 1"); // OK
}

handleChildRequest(childDb); // OK
handleChildRequest(parentDb);
// ^^^^^^^^^ Type error: "parent" not assignable to "child"
```

**Design notes**:

- Explicit transfer is the escape hatch for the scope system. It is intentionally verbose — the three-argument signature (ref, source, target) makes cross-scope transfers visible in code review.
- Inspired by Rust's explicit ownership transfer (`std::mem::replace`, `Arc::clone`). The key difference: in Rust, transfer is move semantics (original becomes invalid); here, transfer is copy semantics (both references remain valid, but the source scope no longer owns the reference).
- The transfer log enables the container to correctly order disposal: if Scope A transfers a reference to Scope B, Scope B must be disposed before Scope A (or the reference must be independently managed).
- Cross-ref: [BEH-CO-14](14-formal-disposal-ordering.md) (disposal ordering considers transfer records).
