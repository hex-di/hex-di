# ADR-CK-004: Branded Timestamps

## Status

Accepted

## Context

`ClockPort` returns three different kinds of time values: monotonic (relative), wall-clock (epoch), and high-resolution (epoch, sub-ms). All three are `number` at runtime. Without type-level differentiation, a developer can accidentally pass a monotonic timestamp to a function expecting wall-clock time, or compare wall-clock and high-resolution timestamps without understanding their relationship to NTP corrections.

The question was whether to: (a) use plain `number` for all timestamps, (b) use wrapper objects (e.g., `class MonotonicTimestamp { constructor(public ms: number) {} }`), or (c) use phantom-branded types.

## Decision

Use phantom-branded types: `number` intersected with a unique symbol brand.

```typescript
declare const MonotonicBrand: unique symbol;
type MonotonicTimestamp = number & { readonly [MonotonicBrand]: true };

declare const WallClockBrand: unique symbol;
type WallClockTimestamp = number & { readonly [WallClockBrand]: true };

declare const HighResBrand: unique symbol;
type HighResTimestamp = number & { readonly [HighResBrand]: true };
```

Branded timestamps are subtypes of `number` (covariant widening — assignable to `number`) but not assignable to each other. Branding utilities (`asMonotonic`, `asWallClock`, `asHighRes`) are identity functions at runtime.

## Consequences

**Positive**:
- Cross-domain timestamp confusion is caught at compile time: `f(monotonic)` where `f` expects `WallClockTimestamp` is a type error.
- Zero runtime cost — branded types are erased by TypeScript. No wrapper objects, no allocations.
- Existing `number`-accepting code continues to work (widening is allowed).
- Validated branding variants (`asMonotonicValidated`, etc.) provide runtime plausibility checks for deserialization scenarios.

**Negative**:
- Branded types are a TypeScript-specific pattern — they don't exist in JavaScript.
- Type error messages mention the brand symbol, which can be confusing for developers unfamiliar with the pattern.
- Arithmetic operations on branded timestamps return `number`, not the branded type — re-branding is needed after computation.

**Trade-off accepted**: The compile-time safety of preventing cross-domain misuse outweighs the minor ergonomic cost of re-branding after arithmetic. The pattern is well-established in the TypeScript ecosystem and documented in [02-clock-port.md §2.5](../02-clock-port.md).
