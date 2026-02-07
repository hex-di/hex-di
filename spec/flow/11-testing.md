# Specification: Flow Testing

## Goal

Provide a comprehensive testing toolkit for `@hex-di/flow` that covers activity harnesses, machine-level test runners, guard/transition/effect isolation utilities, snapshot testing, and time control.

## User Stories

- As a developer, I want to test my state machines end-to-end with mocked dependencies so that I can verify state transitions, effects, and activity behavior without real services.
- As a developer, I want to test guards, transitions, and effects in isolation so that I can write focused unit tests for individual machine behaviors.

## Package Structure

**Package location:** `libs/flow/testing/`
**Package name:** `@hex-di/flow-testing`

```
libs/flow/testing/
├── src/
│   ├── index.ts                    # Public API barrel export
│   ├── test-machine.ts             # testMachine() harness
│   ├── test-guard.ts               # testGuard() utility
│   ├── test-transition.ts          # testTransition() utility
│   ├── test-effect.ts              # testEffect() utility
│   ├── test-flow-in-container.ts   # testFlowInContainer() integration harness
│   ├── snapshot.ts                 # serializeSnapshot(), snapshotMachine()
│   ├── virtual-clock.ts            # createVirtualClock()
│   └── assertions.ts               # expectEvents(), expectEventTypes()
├── tests/
│   ├── test-machine.test.ts
│   ├── test-guard.test.ts
│   ├── test-transition.test.ts
│   ├── test-effect.test.ts
│   ├── test-flow-in-container.test.ts
│   ├── snapshot.test.ts
│   ├── virtual-clock.test.ts
│   └── assertions.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**`package.json` exports:**

```json
{
  "name": "@hex-di/flow-testing",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

Single `.` entry point -- all testing utilities are exported from the root.

**Dependencies:**

- `@hex-di/flow` (workspace dependency) -- provides machine types, runner, interpreter, and effect types
- `vitest` (peer dependency) -- required for `createVirtualClock` which wraps Vitest's `vi.useFakeTimers()`

**Re-export Strategy:**

- Activity testing utilities (`testActivity`, `createTestEventSink`, `createTestSignal`, `createTestDeps`) are **re-exported** from `@hex-di/flow` (where they are implemented in `libs/flow/core/src/activities/testing/`), NOT moved to this package
- New utilities (`testMachine`, `testGuard`, `testTransition`, `testEffect`, `testFlowInContainer`, `serializeSnapshot`, `snapshotMachine`, `createVirtualClock`, `expectEvents`, `expectEventTypes`) are implemented in this testing package
- No runtime dependency cycle: `@hex-di/flow-testing` depends on `@hex-di/flow`, never the reverse

## Specific Requirements

**testActivity() harness (existing, document as baseline)**

- Already implemented in `libs/flow/core/src/activities/testing/harness.ts`
- Returns `{ result, error, events, status, cleanupCalled, cleanupReason }` for comprehensive activity verification
- Accepts `{ input, deps, timeout, abortAfter }` options for controlling execution
- Status is one of `'completed' | 'failed' | 'cancelled' | 'timeout'`
- Automatically calls cleanup after execution with appropriate `CleanupReason`
- Uses `createTestEventSink`, `createTestSignal`, and `createTestDeps` internally

**testMachine() harness (new)**

- Factory function that creates a test-oriented machine runner with mocked dependencies and synchronous test controls
- Accepts the machine definition and an options object with `context` (initial context override) and `mocks` (keyed by port name, matching `MocksFor` pattern from `createTestDeps`)
- Returns `{ runner, snapshot, send, waitForState, waitForEvent }` where `runner` is the underlying `MachineRunner`
- `snapshot()` returns the current `MachineSnapshot` synchronously
- `send(event)` calls `sendAndExecute` and returns `ResultAsync<void, TransitionError | EffectExecutionError>`
- `waitForState(stateName, timeout?)` returns a promise that resolves when the machine enters the given state, rejects on timeout
- `waitForEvent(eventType, timeout?)` returns a promise that resolves with the event payload when a matching event is processed
- Internally creates a `MachineRunner` with a mock `EffectExecutor` that resolves ports from the mocks object instead of a real container
- Disposed automatically via a `cleanup()` method on the returned object, or via explicit `runner.dispose()`

**testGuard() utility**

- Pure function that evaluates a guard function against a provided context and event
- Signature: `testGuard(guardFn, { context, event })` returns `boolean`
- The guard function signature matches the machine guard type: `(context: TContext, event: TEvent) => boolean`
- No machine or runner needed; this tests the guard function in complete isolation

**testTransition() utility**

- Pure function that computes a transition result without executing effects
- Signature: `testTransition(machine, currentState, event)` returns `Result<{ target, effects, context, transitioned }, TransitionError>`
- Delegates to the existing `transition()` function from `libs/flow/core/src/runner/interpreter.ts`, wrapping the result in `Ok` and catching guard/action throws as `Err(TransitionError)`
- `target` is the destination state name (or `undefined` if no transition matched)
- `effects` is the array of `EffectAny` descriptors collected during the transition
- `context` is the new context after applying actions (or `undefined` if unchanged)
- Enables testing that a given state+event combination produces expected target state and effects without executing anything

**testEffect() utility**

- Async function that executes a single effect descriptor against mocked dependencies
- Signature: `testEffect(effect, { mocks })` returns `ResultAsync<unknown, EffectExecutionError>`
- For `InvokeEffect`: resolves the port from mocks, calls the specified method with args, returns the result wrapped in `Ok`
- For `DelayEffect`: resolves immediately (no real delay) unless a virtual clock is provided
- For `SpawnEffect`: creates the activity using the test harness and returns its result
- For `EmitEffect`: returns the emitted event object wrapped in `Ok`
- For `ParallelEffect` / `SequenceEffect`: recursively executes child effects, short-circuiting on first `Err`

**Result Testing Assertion Utilities**

- `expectOkTransition(result)` — asserts `Ok` and returns the unwrapped `{ target, effects, context }`, failing the test on `Err`
- `expectErrTransition(result, tag)` — asserts `Err` with specific `_tag` value (e.g., `'GuardThrew'`), failing the test on `Ok`
- Re-exports `expectOk`, `expectErr`, `expectOkAsync`, `expectErrAsync` from `@hex-di/result/testing` for convenience
- Re-exports Vitest custom matchers: `toBeOk()`, `toBeErr()`, `toBeOkWith()`, `toBeErrWith()` from `@hex-di/result/testing`
- Cross-reference: spec/result/13-testing.md

**Snapshot testing support**

- `MachineSnapshot` is already a plain readonly object with `{ state, context, activities }` and is serializable
- Provide a `serializeSnapshot(snapshot)` utility that produces a deterministic JSON-safe object suitable for `expect().toMatchSnapshot()`
- Activity instances in the snapshot should have non-deterministic fields (IDs, timestamps) replaced with stable placeholders
- Provide `snapshotMachine(machine, events[])` that runs a sequence of events and returns an array of snapshots for multi-step snapshot testing

**Time control**

- Provide a `createVirtualClock()` utility that returns `{ advance(ms), now(), install(), uninstall() }`
- `install()` replaces `setTimeout`, `setInterval`, and `Date.now` with virtual implementations
- `advance(ms)` synchronously advances the virtual clock and fires any pending timers
- `uninstall()` restores the original timer functions
- `DelayEffect` execution in `testMachine` should respect the virtual clock when installed
- Designed to integrate with Vitest's `vi.useFakeTimers()` rather than reimplementing timer mocking; `createVirtualClock` wraps Vitest's API with a flow-specific interface

**Activity event assertions**

- Provide `expectEvents(events, expected)` assertion helper that verifies an event sequence
- `expected` is an array of partial event matchers (e.g., `[{ type: 'PROGRESS' }, { type: 'COMPLETED', result: expect.any(Object) }]`)
- Asserts that events match in order and count
- Provide `expectEventTypes(events, types[])` shorthand that only checks the `type` field sequence

**testFlowInContainer() integration harness**

- End-to-end test harness that creates a real isolated container with a `FlowAdapter` registered, enabling full integration testing of the adapter→DIEffectExecutor→ActivityManager pipeline
- Signature:

  ```typescript
  function testFlowInContainer<TProvides>(
    options: ContainerTestOptions<TProvides>
  ): ResultAsync<
    { service: TProvides; container: Container; dispose: () => ResultAsync<void, DisposeError> },
    FlowAdapterError
  >;

  interface ContainerTestOptions<TProvides> {
    readonly adapter: FlowAdapter;
    readonly mocks?: Record<string, unknown>;
    readonly containerName?: string;
  }
  ```

- `adapter` is the `FlowAdapter` under test, created via `createFlowAdapter` with real machine and activities
- `mocks` provides mock implementations for the adapter's required ports, keyed by port name. Each mock is registered as a singleton adapter in the test container
- `containerName` is an optional label for the test container (defaults to `'test-flow-container'`)
- Returns `ResultAsync<{ service, container, dispose }, FlowAdapterError>` where `service` is the resolved `FlowService`, `container` is the test container instance, and `dispose` tears down the container and all scoped services
- Container resolution failures produce typed `ResolutionError` (from `@hex-di/result` §53) instead of thrown exceptions
- The harness creates a `GraphBuilder`, registers the flow adapter and mock adapters, builds a `Container`, creates a scope, and resolves the flow port within that scope
- Use case: testing that the full wiring (adapter factory → effect executor → activity spawning → event routing) works correctly with real container resolution
- Guidance: prefer `testMachine()` for simpler unit tests that only need to verify state transitions and effects; use `testFlowInContainer()` for integration tests that need to verify DI wiring, scoping behavior, or disposal semantics

**Composable test utilities (existing, document and extend)**

- `createTestEventSink<TEvents>()` already implemented: captures emitted events with `events` array and `clear()` method
- `createTestSignal()` already implemented: controllable `AbortSignal` with `abort(reason?)` and `timeout(ms)` methods
- `createTestDeps(requires, mocks)` already implemented: creates typed dependency object from port tuple and mocks, throws `MissingMockError` for missing mocks
- These should be re-exported from `@hex-di/flow-testing` package for consumer convenience

## Existing Code to Leverage

**`libs/flow/core/src/activities/testing/harness.ts`**

- Complete `testActivity` implementation with `TestActivityResult` and `TestActivityOptions` types
- Pattern for composing `createTestEventSink`, `createTestSignal`, and `createTestDeps` together
- `testMachine` should follow a similar composition pattern for its internal setup

**`libs/flow/core/src/activities/testing/deps.ts`**

- `createTestDeps` and `MocksFor` type utility for building typed mock objects from port tuples
- `MissingMockError` for clear error messages when mocks are missing
- `testMachine` mocks should use the same `MocksFor` type pattern for consistency

**`libs/flow/core/src/runner/interpreter.ts` (transition function)**

- Pure `transition(currentState, currentContext, event, machine)` function that computes `TransitionResult`
- `testTransition` should be a thin wrapper around this function with a friendlier return type
- Already handles guard evaluation, action application, and effect collection

**`libs/flow/core/src/runner/create-runner.ts` and `executor.ts`**

- `createMachineRunner` factory and `createBasicExecutor` for creating runners with custom executors
- `testMachine` should use `createMachineRunner` with a test-specific executor that resolves from mocks
- `EffectExecutor` interface with single `execute(effect)` method is the seam for mock injection

**`libs/flow/core/src/runner/types.ts` (MachineRunner, MachineSnapshot)**

- `MachineRunner` interface defines `snapshot()`, `send()`, `sendAndExecute()`, `subscribe()`, `dispose()`
- `MachineSnapshot` with `{ state, context, activities }` is the basis for snapshot testing
- `testMachine` return type wraps these with test-friendly async helpers (`waitForState`, `waitForEvent`)

## Out of Scope

- Visual state machine diffing tools
- Code coverage measurement for state/transition coverage
- Property-based/generative testing of machines
- Playwright or Cypress integration for E2E flow testing
- Performance benchmarking utilities
- Test report generation or CI integration
- Mutation testing for guards and actions
- Mock generation from port definitions (mocks are always manually provided)
- React component testing utilities (those belong in `@hex-di/flow-react` testing)
- Distributed/multi-machine test orchestration
