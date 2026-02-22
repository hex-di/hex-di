# ADR-GD-055: Guard defines its own sink ports for event/span emission (`GuardEventSinkPort`, `GuardSpanSinkPort`)

> **Status:** Accepted
> **ADR Number:** 055 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

The previous design used bridge functions (`instrumentGuard()`, `createGuardTracingBridge()`) that imported directly from `@hex-di/logger` and `@hex-di/tracing`. This created direct package dependencies from guard to ecosystem libraries, violating the port/adapter pattern: guard should define what it needs, not depend on what others provide.

## Decision

Guard defines outbound `GuardEventSinkPort` and `GuardSpanSinkPort` ports with minimal contracts (`GuardEventSink.emit()`, `GuardSpanSink.startSpan()`). Consuming libraries (`@hex-di/logger`, `@hex-di/tracing`) provide adapters for these ports. Guard has zero-cost absence detection.

```ts
// Guard defines minimal outbound ports
interface GuardEventSink {
  emit(event: GuardEvent): void;
}
interface GuardSpanSink {
  startSpan(name: string, attributes: GuardSpanAttributes): GuardSpan;
}

// @hex-di/logger provides the adapter — guard doesn't know about @hex-di/logger
const loggerAdapter: GuardEventSink = createLoggerGuardEventSink(logger);
createGuardGraph({ auditTrailAdapter, eventSink: loggerAdapter });
```

## Consequences

**Positive**:
- Guard is not coupled to logger or tracing implementations
- Zero overhead when no sink is registered
- Follows the port/adapter pattern consistently
- Guard package has no dependency on ecosystem packages

**Negative**:
- Consuming libraries must implement adapters for the guard-specific sink ports
- Guard events are guard-specific types (not the logger's `LogEntry`), requiring mapping in the adapter

**Trade-off accepted**: Architectural correctness (port/adapter pattern) outweighs the adapter implementation burden; the adapter code is straightforward and the pattern is consistent with the rest of hex-di.
