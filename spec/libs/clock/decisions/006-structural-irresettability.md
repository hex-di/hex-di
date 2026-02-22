# ADR-CK-006: Structural Irresettability

## Status

Accepted

## Context

GxP environments require audit trail integrity — sequence numbers must be gapless and never reused. If a production sequence generator had a `reset()` method, any code with access to the generator could reset the counter, creating duplicate sequence numbers. Runtime guards (throwing on `reset()` calls) are insufficient because:

1. They can be bypassed by patching the guard.
2. They only catch the violation at runtime, after the damage is done.
3. They produce error messages rather than compile-time prevention.

The question was whether to: (a) provide `reset()` with a runtime guard that throws in production mode, (b) remove `reset()` entirely from the production interface, or (c) use a capability token pattern where `reset()` requires a secret token.

## Decision

The production `SequenceGeneratorPort` interface does not include a `reset()` method. It is impossible — at the type level — for any code to call `reset()` on a production sequence generator.

```typescript
// Production port — no reset()
interface SequenceGeneratorPort {
  readonly next: () => Result<number, SequenceOverflowError>;
  readonly current: () => number;
}

// Test-only interface — has reset()
interface VirtualSequenceGenerator extends SequenceGeneratorPort {
  readonly setCounter: (value: number) => void;
  readonly reset: () => void;
}
```

`VirtualSequenceGenerator` is only available from the `@hex-di/clock/testing` subpath. Production code that imports from `@hex-di/clock` (the main entry point) cannot access `reset()`.

## Consequences

**Positive**:
- Sequence number integrity is enforced by the type system, not by runtime guards.
- No code path — including malicious or buggy code — can reset a production sequence generator.
- The enforcement is zero-cost: no runtime checks, no error handling for invalid `reset()` calls.
- Clear separation between production and test interfaces.
- Satisfies 21 CFR 11.10(d) access control at the most fundamental level (type-level impossibility).

**Negative**:
- If a legitimate production use case for resetting sequence numbers arises, the design must be revisited.
- Developers must understand the production/test interface distinction.
- The subpath export separation (`@hex-di/clock` vs. `@hex-di/clock/testing`) is the enforcement mechanism — if a consumer imports from `./testing` in production code, the guard is circumvented.

**Trade-off accepted**: The risk of sequence number reuse in GxP environments far outweighs the inconvenience of a non-resettable production counter. The subpath boundary is enforced by linting rules (`no-restricted-imports`) and code review. No legitimate production use case for resetting sequence numbers has been identified.
