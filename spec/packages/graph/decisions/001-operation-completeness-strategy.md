# ADR-GR-001: Operation Completeness Strategy

## Status

Proposed

## Context

An adapter declares that it `provides` one or more ports. Each port defines an interface with specific methods. However, the current validation pipeline does not verify that the adapter's factory actually produces an object implementing **all** methods of the port interface. A "partially implemented" adapter compiles and builds but fails at runtime when an unimplemented method is called.

ML module systems (see [RES-05](../../../research/RES-05-module-systems-compositional-verification.md)) enforce **signature matching**: a module (adapter) must provide all operations declared in its signature (port). The Backpack system extends this with **operation completeness** — a module hole (required port) must be filled with a module providing at least the required operations.

### Current behavior

```typescript
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: UserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

const UserServicePort = port<UserService>()({ name: "UserService" });

// Only implements getUser — missing createUser and deleteUser
const adapter = createAdapter({
  provides: [UserServicePort],
  factory: () => ok({ getUser: async (id: string) => ({ id, name: "Alice" }) }),
  lifetime: SINGLETON,
});

// Builds successfully!
const graph = GraphBuilder.create().provide(adapter).build();
// Runtime error when createUser or deleteUser is called
```

### Desired behavior

```typescript
// Compile-time error: adapter factory does not return all methods of UserService
// Missing: createUser, deleteUser
```

## Decision

**Verify at the type level that adapter factory return types satisfy all operations declared by the provided port interfaces.**

### Type-level strategy

Add a type constraint to `createAdapter()` that checks the factory return type against the port interface:

```typescript
type VerifyOperationCompleteness<
  TProvides extends ReadonlyArray<DirectedPort<string, unknown>>,
  TFactory extends (...args: ReadonlyArray<unknown>) => Result<unknown, unknown>,
> = {
  [I in keyof TProvides]: TProvides[I] extends DirectedPort<string, infer TService>
    ? keyof TService extends keyof ExtractOk<ReturnType<TFactory>>
      ? true
      : MissingOperationsError<TService, ExtractOk<ReturnType<TFactory>>>
    : never;
};

type MissingOperationsError<TExpected, TActual> = {
  readonly _error: "MISSING_OPERATIONS";
  readonly missing: Exclude<keyof TExpected, keyof TActual>;
};
```

### Runtime fallback

For cases where the type system cannot verify completeness (e.g., dynamic factory return types), a runtime check at build time verifies that the resolved object has all expected methods:

```typescript
// During .build() validation
for (const port of adapter.provides) {
  const instance = adapter.factory(mockDependencies);
  if (instance.isOk()) {
    const missing = getMissingOperations(port.interface, instance.value);
    if (missing.length > 0) {
      errors.push(operationCompletenessError(adapter, port, missing));
    }
  }
}
```

## Consequences

### Positive

1. **Early detection**: Missing method implementations are caught at compile time (or build time), not at runtime service invocation
2. **Clear error messages**: Missing operations are listed explicitly
3. **ML-inspired rigor**: Aligns with proven module system theory

### Negative

1. **Type complexity**: The `VerifyOperationCompleteness` conditional type adds depth to `createAdapter()`'s type signature
2. **Dynamic factories**: Factories that return different shapes based on configuration cannot be fully verified at the type level
3. **Runtime check cost**: Build-time verification invokes factories with mock dependencies, which may have side effects

### Neutral

1. **Opt-out**: Adapters with dynamic factories can bypass the check via a `skipCompletenessCheck` flag
2. **Incremental**: The runtime check can be added first, with the type-level check following

## References

- [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage): Complete Port Coverage
- [BEH-GR-05](../behaviors/05-operation-completeness.md): Operation Completeness behavior
- [RES-05](../../../research/RES-05-module-systems-compositional-verification.md): Module Systems & Compositional Verification
