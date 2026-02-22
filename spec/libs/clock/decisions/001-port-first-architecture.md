# ADR-CK-001: Port-First Architecture

## Status

Accepted

## Context

The HexDI monorepo had six independent timing implementations across five packages (`@hex-di/runtime`, `@hex-di/tracing`, `@hex-di/query`, `@hex-di/logger`, `@hex-di/saga`, `@hex-di/store`). Each used different mechanisms (`performance.now()`, `Date.now()`, custom `Clock` interfaces) with no unified abstraction. This fragmentation meant:

- No single point of configuration for GxP deployments requiring NTP-validated clocks.
- No way to inject a virtual clock across all packages simultaneously for testing.
- Each package had to independently handle cross-platform detection and fallback logic.

The question was whether to: (a) provide a concrete clock utility that packages import directly, (b) provide an injectable port (interface) with adapter implementations, or (c) let each package continue with its own timing.

## Decision

Define the clock as a **port** (`ClockPort` interface) using `@hex-di/core`'s `createPort`. Adapter implementations (`SystemClockAdapter`, `VirtualClockAdapter`, `EdgeRuntimeClockAdapter`, etc.) are registered in the DI container. Consumer packages depend only on the port type, never on adapter implementations.

```typescript
// Port definition
interface ClockPort {
  readonly monotonicNow: () => MonotonicTimestamp;
  readonly wallClockNow: () => WallClockTimestamp;
  readonly highResNow: () => HighResTimestamp;
}

const ClockPort = createPort<ClockPort>("ClockPort");

// Consumer depends only on port
function createMyService(clock: ClockPort) {
  const start = clock.monotonicNow();
  // ...
}
```

Functions are defined as readonly properties (not methods) to enable destructuring without `this`-binding issues:

```typescript
const { monotonicNow } = container.resolve(ClockPort);
```

All adapter return values are frozen with `Object.freeze()` to provide immutability guarantees. See [INV-CK-2](../invariants.md#inv-ck-2-all-adapter-return-values-are-frozen).

## Consequences

**Positive**:
- All six packages consume a single `ClockPort`, eliminating timing fragmentation.
- GxP deployments can swap `SystemClockAdapter` for an NTP-validated adapter at the container level.
- Tests use `VirtualClockAdapter` with manual time control, no Vitest fake timers needed.
- Cross-platform detection logic exists in one place (the adapter), not duplicated across packages.
- New platforms (Edge runtimes, React Native, WASM) are supported by adding an adapter, not modifying consumers.

**Negative**:
- Packages now have a dependency on `@hex-di/core` for port definitions (compile-time only).
- DI container registration adds a conceptual layer that developers must understand.
- The port-based approach requires consumers to be wired through the container, not just import a function.

**Trade-off accepted**: The dependency on `@hex-di/core` is compile-time only (port types are erased at runtime), and the DI container is already the standard wiring mechanism for all HexDI packages. The conceptual overhead is justified by eliminating six independent timing implementations.
