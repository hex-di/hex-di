# HexDI Flow Activity API Redesign

## Initial Idea

Redesign the Activity API in `@hex-di/flow` to follow HexDI patterns and eliminate the service locator anti-pattern.

## Context

The current Activity implementation in `@hex-di/flow` uses a service locator pattern where activities manually call `container.resolve()` to get their dependencies. This violates the explicit dependency declaration principles that HexDI is built on.

## Key Design Decisions Already Made

1. **`createActivity()` factory function** - Following the same pattern as `createAdapter()`
2. **`requires: [Port1, Port2]`** - Explicit port dependencies like adapters
3. **`emits: [Event1, Event2]`** - Type-safe event emission declarations
4. **Dependencies injected into `execute()`** - Not resolved via service locator
5. **`const` generic parameters** - TypeScript 5.0+ `const` type parameter modifier for automatic tuple inference (no `as const` needed)
6. **`TypedEventSink<TEmits>`** - Event sink that only accepts declared event types
7. **`FlowAdapter` declares `activities: [Activity1, Activity2]`** - For graph integration

## Open Questions to Explore

1. Activity lifecycle (cancellation, cleanup, timeout)
2. Activity output handling - should result trigger events automatically?
3. Error handling patterns
4. Testing patterns for activities
5. Graph visualization integration
6. DevTools integration for activity tracing
