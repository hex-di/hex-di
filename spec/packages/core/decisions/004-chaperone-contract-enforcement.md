# ADR-CO-004: Chaperone Contract Enforcement

## Status

Proposed (Tier 3)

## Context

When an adapter is resolved from the container, the caller trusts that the returned service faithfully implements the port contract. But TypeScript's structural types are erased at runtime -- nothing prevents an adapter from returning an object that:

- Is missing methods declared in the port interface
- Returns values violating postconditions (e.g., negative amounts from a billing service)
- Mutates shared state in violation of purity assumptions
- Returns error tags not declared in its `Result<T, E>` type

Racket's chaperone system (see [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md), Finding 5) provides a model: chaperones wrap values to interpose on operations while maintaining behavioral equivalence. They can observe and validate but not change the underlying value's behavior. This is distinct from impersonators, which can modify behavior.

### Current behavior

```typescript
const service = container.resolve(PaymentPort);
// `service` is the raw object returned by the adapter factory.
// No runtime checks verify that method calls satisfy the port contract.
// A buggy adapter returning `{ charge: () => "not a Result" }` goes undetected.
```

### Desired behavior

```typescript
const service = container.resolve(PaymentPort);
// In dev mode, `service` is wrapped in a Proxy that validates:
// - Every method listed in the port interface exists
// - Return values satisfy postconditions (e.g., Result shape)
// - Error tags are members of the declared error union
// In production mode, `service` is returned unwrapped (zero overhead)
```

## Decision

**Wrap resolved services in a `Proxy`-based chaperone that enforces port contracts at runtime, with configurable enforcement modes.**

### Enforcement modes

The container accepts an `enforcement` option that controls chaperone behavior:

```typescript
type EnforcementMode = "strict" | "dev" | "warn" | "off";

// Container configuration
const container = createContainer({
  enforcement: "dev", // default in development
});
```

| Mode     | Check       | On violation                   | Production use |
| -------- | ----------- | ------------------------------ | -------------- |
| `strict` | Full        | Throw `ContractViolationError` | Debugging      |
| `dev`    | Full        | `console.warn` + blame context | Development    |
| `warn`   | Lightweight | Log only                       | Staging        |
| `off`    | None        | Passthrough (no Proxy)         | Production     |

### Chaperone Proxy implementation

```typescript
function chaperoneService<T>(
  service: T,
  portContract: PortContract,
  mode: EnforcementMode,
  blame: BlameContext
): T {
  if (mode === "off") return service;

  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Verify method existence against port interface
      if (typeof prop === "string" && portContract.hasMember(prop)) {
        if (typeof value !== "function") {
          return handleViolation(mode, {
            ...blame,
            violationType: {
              _tag: "ContractViolation",
              details: `Port "${portContract.name}" expects method "${prop}" but found ${typeof value}`,
            },
          });
        }

        // Wrap the method to check postconditions on return
        return function chaperoned(...args: ReadonlyArray<unknown>) {
          const result = Reflect.apply(value, target, args);

          // Async result: check when resolved
          if (result instanceof Promise) {
            return result.then(resolved =>
              verifyPostcondition(resolved, portContract, prop, mode, blame)
            );
          }

          return verifyPostcondition(result, portContract, prop, mode, blame);
        };
      }

      return value;
    },
  });
}
```

### Postcondition verification

Postconditions are derived from the port's type metadata. The initial implementation checks structural properties:

```typescript
function verifyPostcondition(
  value: unknown,
  portContract: PortContract,
  methodName: string,
  mode: EnforcementMode,
  blame: BlameContext
): unknown {
  const spec = portContract.getMethodSpec(methodName);
  if (!spec) return value;

  // Check Result shape if method is declared as returning Result
  if (spec.returnsResult) {
    if (!isResultLike(value)) {
      handleViolation(mode, {
        ...blame,
        violationType: {
          _tag: "ContractViolation",
          details: `Method "${methodName}" should return Result but returned ${typeof value}`,
        },
      });
    }

    // Check error tag membership
    if (isResultLike(value) && value.isErr() && spec.declaredErrorTags.length > 0) {
      const tag = getTag(value.error);
      if (tag && !spec.declaredErrorTags.includes(tag)) {
        handleViolation(mode, {
          ...blame,
          violationType: {
            _tag: "ContractViolation",
            details: `Method "${methodName}" returned undeclared error tag "${tag}". Declared: [${spec.declaredErrorTags.join(", ")}]`,
          },
        });
      }
    }
  }

  return value;
}
```

### Integration with blame context

Chaperone violations produce `BlameContext` structures (see [ADR-CO-002](./002-blame-context-model.md)):

```typescript
// Example violation output in "dev" mode:
//
// [hex-di chaperone] Contract violation detected
//   Port: "PaymentGateway"
//   Method: "charge"
//   Violation: Method returned undeclared error tag "InternalError".
//              Declared: [InsufficientFunds, CardDeclined, NetworkTimeout]
//   Blame: Adapter "StripeAdapter" (stripe-adapter.ts:42)
//   Resolution path: CheckoutService -> PaymentGateway
```

### Behavioral equivalence guarantee

Chaperones must satisfy the **chaperone invariant**: the wrapped service is observationally equivalent to the unwrapped service for all contract-compliant inputs. The chaperone can only:

1. **Observe** method calls and return values (for logging/validation)
2. **Reject** calls or results that violate the contract (throw or warn)
3. **Pass through** all compliant values unmodified

A chaperone must never modify arguments, return values, or execution order.

## Consequences

### Positive

1. **Runtime safety net**: Catches type-erased contract violations that TypeScript cannot detect at compile time
2. **Zero production overhead**: The `"off"` mode returns raw services with no Proxy wrapping
3. **Blame integration**: Violations produce full blame context identifying the responsible adapter
4. **Gradual adoption**: Teams can start with `"warn"` mode and tighten enforcement incrementally
5. **Behavioral equivalence**: The chaperone invariant guarantees that removing the Proxy never changes correct program behavior

### Negative

1. **Proxy performance overhead**: In dev/strict modes, every method call goes through the Proxy trap. Benchmarks on V8 show Proxy method calls are 3-10x slower than direct calls. Acceptable for development but not production.
2. **Proxy compatibility**: Some JavaScript patterns (e.g., `instanceof` checks, `Symbol.toPrimitive`) behave differently through Proxies. Edge cases may require an `unsafeUnwrap()` escape hatch.
3. **Contract metadata requirement**: Postcondition checking requires port contracts to carry runtime metadata (method names, return type shapes, declared error tags). This adds a registration step beyond the current type-only port definitions.
4. **False positives**: Structural postcondition checks may flag valid implementations that use unconventional patterns (e.g., returning a Result-like object that doesn't pass `isResultLike`).

### Neutral

1. **Compatible with decorators**: Chaperones compose with adapter decorators -- the chaperone wraps the outermost decorator, validating the final composed behavior.
2. **NODE_ENV integration**: The default enforcement mode can be derived from `NODE_ENV` (`"dev"` in development, `"off"` in production).

## References

- [ADR-CO-002](./002-blame-context-model.md): Blame Context Model
- [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md): Contracts, Blame & Gradual Typing (Finding 5: Chaperones and Impersonators)
- [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md): Contracts, Blame & Gradual Typing (Finding 1: Contracts for Higher-Order Functions)
