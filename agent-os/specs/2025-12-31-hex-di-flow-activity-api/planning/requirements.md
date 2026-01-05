# Spec Requirements: HexDI Flow Activity API Redesign

## Initial Description

Redesign the Activity API in `@hex-di/flow` to follow HexDI patterns and eliminate the service locator anti-pattern. The current implementation requires activities to manually call `container.resolve()` to get dependencies, which violates HexDI's explicit dependency declaration principles.

## Requirements Discussion

### First Round Questions

**Q1:** I assume activities should support timeout configuration via an optional `timeout` property in the activity config (e.g., `timeout: 30_000` for 30 seconds), and when triggered, the AbortSignal would be aborted with a timeout-specific reason. Is that correct, or should timeouts be handled externally by the caller?
**Answer:** Option C - Layered defaults (manager -> activity -> spawn). Timeouts configurable at three levels with fallback chain: manager default, activity default, and spawn-time override.

**Q2:** For cleanup/finalization, I'm thinking activities should have an optional `cleanup` callback that runs on abort, timeout, or error (similar to adapter finalizers). Should this be `cleanup(reason: 'completed' | 'cancelled' | 'timeout' | 'error')` so the activity knows why it's cleaning up, or just `cleanup()` without the reason?
**Answer:** Option C - Hybrid (optional cleanup, manager orchestrates). Cleanup receives reason for context-aware resource release. ActivityManager orchestrates lifecycle and guarantees cleanup is called.

**Q3:** I assume that activity output should NOT automatically trigger events - the activity author should explicitly emit a completion event via the TypedEventSink if they want the machine to react. This keeps the API explicit and avoids magic behavior. Is that correct, or should there be automatic `ACTIVITY_COMPLETED` / `ACTIVITY_FAILED` events?
**Answer:** Option A - Captured, no auto-event. Activity return value is captured by ActivityManager for programmatic access, but no automatic events are emitted. Activity author explicitly emits events via TypedEventSink.

**Q4:** For `emits: [Event1, Event2]` declarations, should these be event schemas/types (like `{ type: 'PROGRESS'; percent: number }`) or just string literal types for event names (like `'PROGRESS' | 'COMPLETE'`)? I'm leaning toward full event type objects for maximum type safety.
**Answer:** Option E - `defineEvents` helper with type inference from functions. Event payloads are inferred from factory functions. Pattern is familiar from action creators in Redux/XState.

**Q5:** I assume activity errors should be surfaced via the EventSink (e.g., the activity emits an error event) rather than throwing exceptions that propagate up. This keeps error handling explicit and type-safe. However, should there be a standard `ActivityError<TEmits>` event type that all activities implicitly can emit, or should each activity explicitly declare its error events in `emits`?
**Answer:** Option B - Implicit system errors + explicit domain errors. System errors (abort, timeout, uncaught exceptions) handled by ActivityManager. Domain errors must be explicitly declared in `emits` and emitted by the activity.

**Q6:** For testing activities in isolation, I'm thinking we provide a `createTestEventSink()` utility that captures emitted events for assertions, and a `createTestDeps()` helper that creates mock dependencies matching the activity's `requires`. Is that the right approach, or should activities be tested differently?
**Answer:** Option C - Both harness + composable utilities. High-level `testActivity()` harness for common cases, plus low-level utilities (`createTestEventSink`, `createTestSignal`, `createTestDeps`) for complex scenarios.

**Q7:** When `FlowAdapter` declares `activities: [Activity1, Activity2]`, should the graph validator ensure all activities' `requires` ports are satisfied by adapters in the same graph? This would catch missing activity dependencies at compile-time. Is this the expected behavior?
**Answer:** Hybrid - Merge into FlowAdapter + DevTools visibility. FlowAdapter declares `activities` array with compile-time validation ensuring activity `requires` ports are satisfied. DevTools shows activities in dependency visualization.

**Q8:** Is there anything that should explicitly be OUT of scope for this redesign (e.g., activity retry logic, activity saga patterns, distributed activities)?
**Answer:** Out of scope: Activity retry logic, activity saga/orchestration patterns, distributed activities, activity persistence/replay.

### Extended Questions

**Q9:** For TypedEventSink design, should it use emit(event) only, emit(type, payload) only, or hybrid?
**Answer:** Option C - Hybrid emit(type) or emit(type, payload). Both `sink.emit(TaskEvents.PROGRESS(50))` and `sink.emit('PROGRESS', { percent: 50 })` work with full type safety.

**Q10:** How should dependencies be accessed in execute - positional (deps[0], deps[1]) or name-keyed (deps.Api, deps.Logger)?
**Answer:** Option A - Name-keyed object. Consistent with HexDI adapter pattern where port names become property keys.

**Q11:** What type should `activityPort` return and how should it relate to the standard Port system?
**Answer:** ActivityPort type with clean API: `activityPort<Input, Output>()('Name')` creates typed token. Mirrors `createPort` pattern but specialized for activities.

**Q12:** How should activity registration work in FlowAdapter?
**Answer:** Explicit array with type-level + runtime validation. Type-level validates all activity `requires` are subset of available ports. Runtime validates uniqueness.

**Q13:** What should be the lifetime management model for activities?
**Answer:** Definition is value/singleton, execution is transient. Each spawn creates an independent execution instance.

**Q14:** How should activities resolve their scope for dependency injection?
**Answer:** Option A - FlowAdapter's scope. Activities resolve dependencies from the FlowAdapter's container scope.

### Existing Code to Reference

**Similar Features Identified:**

- Feature: createAdapter - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/adapter/factory.ts`
- Feature: Adapter types - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/adapter/types.ts`
- Feature: Current Activity implementation - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/`
- Feature: ActivityManager - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/manager.ts`

Components to potentially reuse:

- Port system from `@hex-di/ports`
- `const` type parameter pattern from `createAdapter`
- AdapterAny pattern for ActivityAny
- ResolvedDeps type for dependency injection typing

### Follow-up Questions

No additional follow-up questions were needed. All requirements were clarified through the 13 questions above.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A - This is a type-level API design, visual mockups not applicable.

## Requirements Summary

### Functional Requirements

**Core Activity API:**

- `activityPort<Input, Output>()('Name')` - Creates typed activity port token
- `activity(port, config)` - Creates activity implementation with:
  - `requires: [Port1, Port2]` - Explicit port dependencies
  - `emits: EventDefinition` - Type-safe event declarations via `defineEvents`
  - `execute(input, context)` - Async execution function
  - `cleanup?(reason)` - Optional cleanup callback
  - `timeout?` - Optional activity-level timeout

**Event System:**

- `defineEvents({ NAME: (args) => payload })` - Type-safe event factory definitions
- `TypedEventSink<TEvents>` - Hybrid emit supporting both:
  - `emit(EventFactory(...args))`
  - `emit('TYPE', payload)`

**Dependency Injection:**

- Name-keyed deps object: `deps.Api`, `deps.Logger`
- Dependencies resolved from FlowAdapter's container scope
- Compile-time validation of activity requirements

**Lifecycle Management:**

- Layered timeout defaults (manager -> activity -> spawn)
- Cleanup callback with reason parameter
- ActivityManager orchestrates lifecycle

**Graph Integration:**

- FlowAdapter declares `activities: [...]` array
- Type-level validation of activity requirements against available ports
- Runtime validation for uniqueness
- DevTools visualization of activities

### Reusability Opportunities

- Port system from `@hex-di/ports`
- `const` type parameter modifier pattern from `createAdapter`
- AdapterAny variance pattern for ActivityAny
- ResolvedDeps type mapping for dependency injection
- Existing ActivityManager lifecycle logic

### Scope Boundaries

**In Scope:**

- `activityPort` factory function
- `activity` factory function
- `defineEvents` helper
- `TypedEventSink` type and implementation
- FlowAdapter `activities` integration
- Compile-time dependency validation
- Testing utilities (`testActivity`, `createTestEventSink`, `createTestSignal`)
- DevTools activity visualization

**Out of Scope:**

- Activity retry logic (can be built on top)
- Activity saga/orchestration patterns
- Distributed activities
- Activity persistence/replay

### Technical Considerations

- TypeScript 5.0+ required for `const` type parameter modifier
- Must maintain backward compatibility with existing flow package
- Event sink must work with existing state machine runner
- Activities must integrate with existing tracing infrastructure
- Type inference must work without explicit type annotations
- Must follow HexDI patterns established in `createAdapter`
