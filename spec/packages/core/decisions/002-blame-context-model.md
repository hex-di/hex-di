# ADR-CO-002: Blame Context Model

## Status

Proposed

## Context

When a container resolution fails, the current error messages identify **what** went wrong but not **who** is responsible. In a deep dependency chain (A → B → C → D), if D's factory fails, the error says "failed to resolve D" but does not identify that the failure propagated through B → C → D, or that the root consumer was A.

Contract blame theory (see [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md)) provides a framework: when a contract between two parties is violated, the **blame** should point to the party that broke the contract. In DI terms:

- The **port** is the contract
- The **adapter** is the implementation (positive party)
- The **consumer** is the client (negative party)
- **Blame** identifies which adapter violated which port contract

### Current error experience

```
ContainerError: Failed to resolve port "UserService"
  Caused by: Factory error in adapter for "DatabaseConnection"
```

### Desired error experience

```
ContainerError: Failed to resolve port "UserService"
  Blame: Adapter "DatabaseAdapter" violated port "DatabaseConnection" contract
  Violation: Factory returned Err instead of Ok
  Resolution path: UserService → UserRepository → DatabaseConnection
  Adapter factory: createDatabaseAdapter (database-adapter.ts:15)
```

## Decision

**Every container error includes a `BlameContext` structure.** The context identifies:

1. **`adapterFactory`**: The adapter whose factory failed or whose behavior violated the contract
2. **`portContract`**: The port whose contract was violated
3. **`violationType`**: A discriminated tag classifying the violation
4. **`resolutionPath`**: The full chain of port resolutions from the initial `resolve()` call to the failure point

### BlameContext type

```typescript
interface BlameContext {
  /** The adapter factory that violated the contract */
  readonly adapterFactory: {
    readonly name: string;
    readonly sourceLocation?: string; // file:line if available
  };
  /** The port whose contract was violated */
  readonly portContract: {
    readonly name: string;
    readonly direction: PortDirection;
  };
  /** Classification of the violation */
  readonly violationType: BlameViolationType;
  /** Resolution path from initial resolve() to failure */
  readonly resolutionPath: ReadonlyArray<string>;
}

type BlameViolationType =
  | { readonly _tag: "FactoryError"; readonly error: unknown }
  | { readonly _tag: "LifetimeViolation"; readonly expected: string; readonly actual: string }
  | { readonly _tag: "MissingDependency"; readonly missingPort: string }
  | { readonly _tag: "DisposalError"; readonly error: unknown }
  | { readonly _tag: "ContractViolation"; readonly details: string };
```

### Integration with existing errors

All existing error types gain a `blame` property:

```typescript
interface ContainerError {
  readonly _tag: string;
  readonly message: string;
  readonly blame: BlameContext;
}
```

### Resolution path accumulation

The resolution engine maintains a stack of port names as it recursively resolves dependencies. On error, the stack is captured as the `resolutionPath`:

```typescript
// Pseudo-code for resolution with blame tracking
function resolveWithBlame<T>(port: Port<N, T>, path: string[] = []): Result<T, ContainerError> {
  const currentPath = [...path, port.name];
  const adapter = findAdapter(port);

  // Resolve each dependency with the growing path
  for (const dep of adapter.requires) {
    const depResult = resolveWithBlame(dep, currentPath);
    if (depResult.isErr()) return depResult; // blame already attached
  }

  // Run factory
  const result = adapter.factory(resolvedDeps);
  if (result.isErr()) {
    return err({
      _tag: "ResolutionError",
      message: `Failed to resolve port "${port.name}"`,
      blame: {
        adapterFactory: { name: adapter.name },
        portContract: { name: port.name, direction: port.direction },
        violationType: { _tag: "FactoryError", error: result.error },
        resolutionPath: currentPath,
      },
    });
  }
  return result;
}
```

## Consequences

### Positive

1. **Root cause identification**: Every error identifies exactly which adapter is responsible
2. **Resolution path visibility**: Deep transitive failures show the full chain
3. **Violation classification**: Discriminated `violationType` enables programmatic error handling with `catchTag`
4. **Debuggability**: Source location (when available) points directly to the failing adapter factory

### Negative

1. **Resolution path overhead**: Maintaining the path stack adds a small allocation per resolution step. Impact is negligible for typical graph sizes (< 100 nodes).
2. **API surface increase**: All error types gain a `blame` property, which is a breaking change for code that exhaustively matches error shapes.

### Neutral

1. **BlameContext is frozen**: Consistent with [INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen).
2. **Compatible with `catchTag`**: `violationType._tag` enables selective error recovery via `@hex-di/result` effect elimination.

## References

- [INV-CO-3](../invariants.md#inv-co-3-blame-context-on-all-errors): Blame Context on All Errors
- [INV-CO-4](../invariants.md#inv-co-4-blame-propagation-through-chains): Blame Propagation Through Chains
- [BEH-CO-06](../behaviors/06-blame-aware-errors.md): Blame-Aware Errors behavior
- [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md): Contracts, Blame & Gradual Typing
