# ADR-CO-001: Frozen Port References

## Status

Proposed

## Context

`@hex-di/core` already freezes port definitions at creation (`Object.freeze()` in `port()` and `createPort()`). However, resolved service instances returned by the container are **not** frozen. This creates an asymmetry:

- **Port contracts**: Immutable (frozen at creation) — cannot be tampered with
- **Resolved services**: Mutable — any consumer can modify a shared singleton's properties

In capability-based security theory (see [RES-04](../../../research/RES-04-capability-based-security.md)), possessing a reference to a service IS the authorization to use it. If that reference can be mutated after injection, one consumer can modify a shared service to affect other consumers — a form of **capability tampering**.

Current `@hex-di/result` already demonstrates the freeze-at-creation pattern:

- [INV-1](../../result/invariants.md#inv-1-frozen-result-instances): All Result instances are frozen
- [INV-7](../../result/invariants.md#inv-7-createerror-output-is-frozen): All createError output is frozen
- [INV-10](../../result/invariants.md#inv-10-frozen-option-instances): All Option instances are frozen

Extending this pattern to resolved services is a natural next step.

### Constraints

1. `Object.freeze()` is shallow — nested objects are not frozen
2. Some services have mutable internal state by design (e.g., connection pools, caches)
3. Freezing must not break `Proxy`-based services or services with getters/setters
4. Performance cost of `Object.freeze()` is negligible (single call per resolution, not per access)

## Decision

**Freeze resolved services before injection.** The container resolution pipeline applies `Object.freeze()` to the service instance after factory invocation and before returning it to the consumer.

### Freeze behavior

```typescript
// Shallow freeze — consistent with Result/Option/Error freeze behavior
const service = factory(dependencies);
return Object.freeze(service);
```

### Opt-out mechanism

Services that require mutable internal state can opt out via adapter configuration:

```typescript
createAdapter({
  provides: [ConnectionPoolPort],
  factory: () => ok(new ConnectionPool()),
  lifetime: SINGLETON,
  freeze: false, // Opt-out: this service manages mutable internal state
});
```

### Scope

- Port definitions: Already frozen (no change)
- Resolved service instances: **Frozen by default** (new behavior)
- Adapter configuration objects: Already frozen (no change)
- Error objects: Already frozen (no change)

## Consequences

### Positive

1. **Capability integrity**: Consumers cannot tamper with shared service instances
2. **Consistency**: Aligns with existing freeze-at-creation patterns across the hex-di stack
3. **Debugging**: Accidental mutations surface as `TypeError` in strict mode rather than silent corruption
4. **GxP alignment**: Strengthens immutability guarantees for data integrity compliance

### Negative

1. **Breaking change for mutable services**: Services with mutable internal state must opt out via `freeze: false`
2. **Shallow only**: Nested objects are not frozen (deep freeze is too expensive and breaks many patterns)
3. **Proxy interaction**: Freezing a Proxy throws in some engines — services using Proxy patterns need `freeze: false`

### Neutral

1. **Performance**: `Object.freeze()` cost is negligible per-resolution (sub-microsecond)
2. **TypeScript**: `Readonly<T>` type wrapping for frozen services is optional but recommended

## References

- [INV-CO-1](../invariants.md#inv-co-1-frozen-port-definitions): Frozen Port Definitions
- [INV-CO-2](../invariants.md#inv-co-2-frozen-resolved-services): Frozen Resolved Services
- [BEH-CO-05](../behaviors/05-frozen-port-references.md): Frozen Port References behavior
- [RES-04](../../../research/RES-04-capability-based-security.md): Capability-Based Security
