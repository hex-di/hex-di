# Phase 28 Research: Tracing Test Coverage

**Research Goal:** What do I need to know to PLAN this phase well?

**Answer:** Understand the exact test coverage gaps identified in the v7.0 audit, the behavior that needs verification, the existing test infrastructure patterns, and the architectural decisions that inform test structure.

---

## Executive Summary

Phase 28 addresses **8 specific test coverage gaps** from the v7.0 milestone audit, focusing on two critical areas:

1. **Phase 24 Gap:** Zero behavioral tests for instrumentation code (instrumentContainer, span stack, createTracingHook)
2. **Phase 25 Gap:** No automated tests for OTel backend packages (tracing-otel, tracing-jaeger, tracing-zipkin, tracing-datadog)

All functionality works and is verified through code inspection, type checking, and indirect testing via examples. This phase adds **dedicated unit and integration tests** to prove correctness and prevent regressions.

**Key Finding:** The instrumentation code in Phase 24 is thoroughly documented with JSDoc but has **zero dedicated test files**. All 223 passing tests in @hex-di/tracing pre-date Phase 24 or test utilities added in Phase 27. The backend packages have **zero test directories**.

---

## 1. Audit Findings: Specific Test Gaps

### 1.1 Phase 24: Container Instrumentation Gaps

From `.planning/v7.0-MILESTONE-AUDIT.md`:

> **Zero behavioral tests for instrumentation** — No unit tests for instrumentContainer, createTracingHook, span stack LIFO ordering, port filtering, cleanup functions, error recording, or parent-child span relationships. Instrumentation is tested indirectly via react-showcase example tests (tracing.test.ts:34-127), but no dedicated unit test suite exists.

**Specific untested behaviors:**

1. **Span Stack (span-stack.ts)**
   - LIFO ordering (push/pop symmetry)
   - Empty stack behavior (popSpan returns undefined)
   - clearStack resets to empty state
   - getActiveSpan returns top without removal
   - getStackDepth accuracy

2. **instrumentContainer (container.ts)**
   - Hook installation (addHook calls for beforeResolve/afterResolve)
   - Span creation on resolution start
   - Span completion on resolution end
   - Error recording (span.recordException, setStatus('error'))
   - Cleanup function removes hooks
   - Double-instrumentation handling (old hooks removed before new ones)
   - Port filtering (include/exclude/predicate)
   - Duration filtering (minDurationMs threshold)
   - Cached resolution filtering (traceCachedResolutions: false)

3. **Port Filtering (types.ts evaluatePortFilter)**
   - Predicate filter function execution
   - Declarative filter include array
   - Declarative filter exclude array
   - Include takes precedence over exclude
   - Empty filter (undefined) traces all ports

4. **Cross-Container Relationships (tree.ts)**
   - Parent-child span relationships across container boundaries
   - Tree walking of existing children
   - instrumentContainerTree cleanup

5. **createTracingHook (hooks.ts)**
   - Returns valid ResolutionHooks object
   - Same span lifecycle as instrumentContainer
   - Shared hook reuse across containers

### 1.2 Phase 25: OTel Backend Gaps

From `.planning/v7.0-MILESTONE-AUDIT.md`:

> **No automated tests for OTel packages** — packages/tracing-otel/, packages/tracing-jaeger/, packages/tracing-zipkin/, and packages/tracing-datadog/ have no test directories. All components verified by code inspection, typecheck, and build, but zero automated regression tests exist.

**Specific untested behaviors:**

1. **Span Adapter (tracing-otel/src/adapters/span-adapter.ts)**
   - convertToReadableSpan field mapping accuracy
   - HrTime conversion (milliseconds → [seconds, nanoseconds])
   - SpanKind enum conversion (internal/server/client)
   - SpanStatus conversion (unset/ok/error)
   - SpanEvent conversion (time, name, attributes)
   - SpanLink conversion (traceId, spanId, attributes)
   - TraceState serialization for immutable spans
   - ParentSpanContext generation from parentSpanId
   - Default resource creation

2. **Batch Processor (tracing-otel/src/processors/batch.ts)**
   - Buffer accumulation up to maxQueueSize
   - FIFO drop policy when buffer exceeds limit
   - Immediate flush when batch size reached
   - Scheduled flush after delay
   - Export batching (multiple batches for large buffers)
   - Shutdown flush (all buffered spans exported)
   - Timeout protection on exporter shutdown
   - Error logging without throwing

3. **Simple Processor (tracing-otel/src/processors/simple.ts)**
   - Immediate export on span end
   - Fire-and-forget semantics (non-blocking)
   - Shutdown calls exporter.shutdown with timeout
   - Error logging without throwing

4. **Backend Exporters**
   - **Jaeger (tracing-jaeger/src/exporter.ts):**
     - Resource metadata attachment
     - Callback-based export adapter (Promise wrapper)
     - Success/failure result handling
     - forceFlush delegation
     - shutdown delegation

   - **Zipkin (tracing-zipkin/src/exporter.ts):**
     - Same patterns as Jaeger with Zipkin exporter

   - **DataDog (tracing-datadog/src/bridge.ts):**
     - dd-trace span creation with timing
     - Parent-child relationship via childOf
     - Attribute → tag conversion
     - Error status handling
     - Event serialization as tags
     - ActiveSpan map management
     - flush return type handling (Promise | void)

---

## 2. Existing Test Infrastructure

### 2.1 Current Test Coverage

**Packages with tests:**

- `@hex-di/tracing`: 8 test files, 223 tests (all passing)
  - Unit tests: noop, memory, console adapters
  - Unit tests: ID generation, propagation
  - Unit tests: matchers, assertions (Phase 27)
  - Integration tests: end-to-end workflows

**Packages without tests:**

- `@hex-di/tracing-otel`: 0 test files
- `@hex-di/tracing-jaeger`: 0 test files
- `@hex-di/tracing-zipkin`: 0 test files
- `@hex-di/tracing-datadog`: 0 test files

**Indirect test coverage:**

- `examples/react-showcase/tests/tracing.test.ts`: 3 tests verifying instrumentContainer behavior
- `integrations/hono/tests/tracing-middleware.test.ts`: 14 tests verifying middleware (uses tracer, not instrumentation)
- `integrations/react/tests/tracing-hooks.test.tsx`: 14 tests verifying hooks (uses tracer, not instrumentation)

### 2.2 Test Tooling Available

**From Phase 27 (TEST-01..04):**

1. **MemoryTracer** (createMemoryTracer)
   - Transient lifetime for test isolation
   - getCollectedSpans() returns SpanData[]
   - clear() resets collected spans
   - withSpan/withSpanAsync helpers

2. **assertSpanExists** (SpanMatcher)
   - Find spans by name (string or RegExp)
   - Match status, attributes, hasEvent, minDuration
   - Descriptive error messages

3. **Matcher Predicates**
   - hasAttribute(span, key, value?)
   - hasEvent(span, name)
   - hasStatus(span, status)
   - hasDuration(span, minMs?, maxMs?)

**Vitest framework:**

- Used consistently across all packages
- vi.fn() for mock functions
- beforeEach/afterEach for setup/teardown
- describe/it/expect standard assertions

### 2.3 Test Patterns from Existing Code

**From packages/tracing/tests/unit/memory.test.ts:**

```typescript
describe("MemoryTracer", () => {
  let tracer: MemoryTracer;

  beforeEach(() => {
    tracer = createMemoryTracer();
  });

  it("should collect spans via withSpan", () => {
    tracer.withSpan("test", span => {
      span.setAttribute("key", "value");
    });

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("test");
    expect(spans[0].attributes.key).toBe("value");
  });
});
```

**From examples/react-showcase/tests/tracing.test.ts:**

```typescript
describe("instrumentContainer", () => {
  let tracer: MemoryTracer;

  beforeEach(() => {
    tracer = createMemoryTracer();
  });

  it("should capture spans when services are resolved", () => {
    const container = createContainer({ graph, name: "Test" });
    const cleanup = instrumentContainer(container, tracer);

    expect(tracer.getCollectedSpans()).toHaveLength(0);

    container.resolve(SomePort);

    const spans = tracer.getCollectedSpans();
    expect(spans.length).toBeGreaterThan(0);

    cleanup();
    void container.dispose();
  });
});
```

---

## 3. Code Architecture Relevant to Testing

### 3.1 Instrumentation Module Structure

**Key files:**

1. `packages/tracing/src/instrumentation/span-stack.ts` (134 lines)
   - Pure module-level state (array)
   - 5 exported functions
   - Zero external dependencies
   - **Test strategy:** Unit test each function in isolation

2. `packages/tracing/src/instrumentation/container.ts` (252 lines)
   - Single export: instrumentContainer
   - Dependencies: span-stack, types, runtime hooks
   - Stateful: WeakMap for cleanup tracking
   - **Test strategy:** Unit tests with mock containers, integration tests with real containers

3. `packages/tracing/src/instrumentation/types.ts` (338 lines)
   - Type definitions + evaluatePortFilter function
   - Pure logic (no side effects)
   - **Test strategy:** Unit test evaluatePortFilter with all filter types

4. `packages/tracing/src/instrumentation/tree.ts` (217 lines)
   - Single export: instrumentContainerTree
   - Dependencies: container, utils, InspectorAPI
   - **Test strategy:** Integration tests with parent-child containers

5. `packages/tracing/src/instrumentation/hooks.ts` (233 lines)
   - Single export: createTracingHook
   - Same logic as instrumentContainer but returns ResolutionHooks
   - **Test strategy:** Unit tests + verify equivalence with instrumentContainer

### 3.2 OTel Package Structure

**Common pattern across all backend packages:**

```
packages/tracing-otel/
  src/
    adapters/span-adapter.ts  # convertToReadableSpan
    processors/batch.ts       # createBatchSpanProcessor
    processors/simple.ts      # createSimpleSpanProcessor
  tests/  # MISSING
```

**Key architectural decisions for testing:**

1. **No type casts** (PERF-05): All conversions use explicit field mapping
2. **Factory functions**: createBatchSpanProcessor, createSimpleSpanProcessor (no classes)
3. **Graceful degradation**: Errors logged, never thrown
4. **Timeout protection**: Promise.race for shutdown timeouts
5. **Environment independence**: globalThis patterns for timers/console

### 3.3 Testing Challenges

**Instrumentation:**

1. **Async timing**: span-start and span-end happen in separate hook calls
2. **LIFO stack correctness**: Nested resolutions must maintain proper parent-child relationships
3. **Cleanup verification**: How to verify hooks are actually removed?
4. **Container lifecycle**: Tests must properly dispose containers
5. **Mock vs real containers**: When to use each?

**OTel Processors:**

1. **Timing-dependent behavior**: BatchProcessor flush triggers after delay
2. **Timer mocking**: Need to mock setTimeout/clearTimeout
3. **Async batching**: Multiple export calls for large buffers
4. **Shutdown race conditions**: Timeout vs actual shutdown completion

**Backend Exporters:**

1. **External dependencies**: OTel exporters, dd-trace
2. **Network mocking**: Don't make real HTTP calls to Jaeger/Zipkin
3. **Callback-based APIs**: JaegerExporter/ZipkinExporter use callbacks, not Promises
4. **dd-trace peer dependency**: DataDog tests need to work without dd-trace installed

---

## 4. Key Decisions from Prior Phases

### 4.1 Instrumentation Design Decisions

**From Phase 24 planning:**

1. **Module-level span stack** (INST-03)
   - Simple array, no AsyncLocalStorage
   - Works in all JS environments
   - LIFO ordering guarantees parent-child relationships

2. **HookableContainer interface** (24-01)
   - Minimal interface: addHook, removeHook
   - Avoids dependency on full container types
   - Enables testing with mock containers

3. **Double-instrumentation handling** (24-01)
   - WeakMap tracks cleanup functions per container
   - Auto-cleanup old hooks before installing new ones
   - Tests must verify this behavior

4. **Resolution key uniqueness** (24-01)
   - Combines containerId, portName, depth, timestamp
   - Not directly tested but influences span ordering

5. **Duration filtering at span-end** (24-01)
   - minDurationMs checked in afterResolve
   - Span created but may be filtered before export
   - Tests can verify filtered spans still end correctly

### 4.2 OTel Package Design Decisions

**From Phase 25 planning:**

1. **No type casts** (25-01)
   - Explicit field-by-field conversion
   - Tests verify type correctness without casts

2. **FIFO drop policy** (25-02)
   - spanBuffer.shift() when maxQueueSize exceeded
   - Tests must verify oldest span dropped

3. **Factory functions** (25-02)
   - No classes, just factory functions returning interfaces
   - Easier to test (no constructor mocking)

4. **Graceful degradation** (25-03)
   - Log errors but never throw
   - Tests verify export failures don't propagate

5. **Optional dd-trace** (25-05)
   - DataDog bridge has dd-trace as peer dependency
   - Tests must work when dd-trace not installed

### 4.3 Testing Utilities Design Decisions

**From Phase 27 planning:**

1. **Pure function matchers** (27-01)
   - No side effects or mutations
   - Composable for complex assertions

2. **MemoryTracer transient lifetime** (23-04)
   - Each test gets fresh tracer via createMemoryTracer()
   - No shared state between tests

3. **Flat span storage** (23-04)
   - Array of SpanData, not tree structure
   - Easy to iterate and assert

---

## 5. Test Organization Strategy

### 5.1 Package Test Structure

**packages/tracing/tests/** (extend existing):

```
tests/
  unit/
    instrumentation/
      span-stack.test.ts          # NEW - Plan 28-01
      container.test.ts           # NEW - Plan 28-01
      port-filtering.test.ts      # NEW - Plan 28-01
      hooks.test.ts               # NEW - Plan 28-01
  integration/
    instrumentation/
      cross-container.test.ts     # NEW - Plan 28-02
      tree-instrumentation.test.ts # NEW - Plan 28-02
```

**packages/tracing-otel/tests/** (create new):

```
tests/
  unit/
    span-adapter.test.ts          # NEW - Plan 28-03
    batch-processor.test.ts       # NEW - Plan 28-03
    simple-processor.test.ts      # NEW - Plan 28-03
```

**packages/tracing-jaeger/tests/** (create new):

```
tests/
  unit/
    jaeger-exporter.test.ts       # NEW - Plan 28-04
```

**packages/tracing-zipkin/tests/** (create new):

```
tests/
  unit/
    zipkin-exporter.test.ts       # NEW - Plan 28-04
```

**packages/tracing-datadog/tests/** (create new):

```
tests/
  unit/
    datadog-bridge.test.ts        # NEW - Plan 28-04
```

### 5.2 Plan Breakdown

**28-01-PLAN.md: Instrumentation Unit Tests**

- Scope: span-stack.ts, container.ts, types.ts, hooks.ts
- Test files: 4 new unit test files
- Focus: Pure logic, isolated behaviors

**28-02-PLAN.md: Cross-Container Integration Tests**

- Scope: tree.ts, parent-child relationships
- Test files: 2 new integration test files
- Focus: Multi-container scenarios, real InspectorAPI

**28-03-PLAN.md: OTel Span Adapter and Processor Tests**

- Scope: span-adapter.ts, batch.ts, simple.ts
- Test files: 3 new unit test files in tracing-otel
- Focus: Conversion accuracy, batching logic, timing

**28-04-PLAN.md: Backend Adapter Tests**

- Scope: Jaeger, Zipkin, DataDog exporters
- Test files: 3 new unit test files across 3 packages
- Focus: Exporter wiring, mock external dependencies

---

## 6. Testing Techniques

### 6.1 Mock Container Pattern

**For instrumentContainer unit tests:**

```typescript
interface MockHookableContainer {
  addHook: vi.Mock;
  removeHook: vi.Mock;
}

function createMockContainer(): MockHookableContainer {
  return {
    addHook: vi.fn(),
    removeHook: vi.fn(),
  };
}
```

**Usage:**

- Verify addHook called with correct hook types
- Verify removeHook called on cleanup
- No need for real DI graph

### 6.2 Real Container Pattern

**For integration tests:**

```typescript
import { createContainer, defineService, createPort } from "@hex-di/runtime";

const TestPort = createPort<string>("Test");
const testGraph = {
  [TestPort.key]: defineService(TestPort).withValue("test"),
};

const container = createContainer({ graph: testGraph, name: "TestContainer" });
```

**Usage:**

- Verify actual span creation
- Test parent-child relationships
- Must dispose containers properly

### 6.3 Timer Mocking

**For BatchProcessor scheduled flush tests:**

```typescript
import { vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("should flush after scheduledDelayMillis", async () => {
  // Create processor
  // Trigger onEnd

  vi.advanceTimersByTime(5000);

  // Verify flush called
});
```

### 6.4 Mock Exporter Pattern

**For processor tests:**

```typescript
function createMockExporter(): SpanExporter {
  return {
    export: vi.fn().mockResolvedValue(undefined),
    forceFlush: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
}
```

### 6.5 OTel Type Bridging

**For span-adapter tests:**

```typescript
import { convertToReadableSpan } from "@hex-di/tracing-otel";
import type { SpanData } from "@hex-di/tracing";

// Create test SpanData
const hexSpan: SpanData = {
  context: { traceId: "...", spanId: "...", traceFlags: 1 },
  name: "test",
  kind: "internal",
  startTime: 1000,
  endTime: 2000,
  status: "ok",
  attributes: {},
  events: [],
  links: [],
  parentSpanId: undefined,
};

// Convert and verify
const otelSpan = convertToReadableSpan(hexSpan);
expect(otelSpan.name).toBe("test");
expect(otelSpan.kind).toBe(SpanKind.INTERNAL);
```

---

## 7. Requirement Verification

### 7.1 Existing Requirements Status

All 66 v7.0 requirements are **met and verified**. Phase 28 adds no new requirements.

**Relevant requirement references:**

- **INST-01..09**: Container instrumentation (verified by 24-01..03 implementations)
- **OTEL-01..08**: OTel backend (verified by 25-01..05 implementations)
- **TEST-01..04**: Testing utilities (verified by 27-01 implementation)
- **PERF-05**: No type casts, no eslint-disable (enforced in 28 tests too)

### 7.2 Gap Closure Verification

**28-01 closes Phase 24 gap:**

- Unit tests for instrumentContainer prove INST-04 (hook installation)
- Span stack tests prove INST-03 (LIFO ordering)
- Port filtering tests prove INST-05 (selective tracing)

**28-02 closes Phase 24 cross-container gap:**

- Integration tests prove INST-09 (parent-child relationships)
- Tree tests prove INST-02 (tree-wide instrumentation)

**28-03 closes Phase 25 OTel gap:**

- Span adapter tests prove OTEL-01 (HexDI → OTel conversion)
- Processor tests prove OTEL-06 (batching), OTEL-08 (shutdown timeout)

**28-04 closes Phase 25 backend gap:**

- Exporter tests prove BACK-01..04 (Jaeger, Zipkin, DataDog, OTLP)

---

## 8. Risk Assessment

### 8.1 Low Risk

1. **Span stack unit tests**: Pure functions, deterministic behavior
2. **Port filtering unit tests**: Pure logic, no side effects
3. **Span adapter unit tests**: Field mapping verification
4. **Mock-based tests**: No external dependencies

### 8.2 Medium Risk

1. **Timer-dependent tests**: BatchProcessor scheduled flush (mitigated by vi.useFakeTimers)
2. **Container lifecycle**: Must dispose properly in tests (mitigated by beforeEach/afterEach)
3. **Async batching**: Multiple export calls in sequence (mitigated by careful Promise chaining)

### 8.3 Mitigated Risk

1. **dd-trace peer dependency**: DataDog tests mock dd-trace types (no actual installation required)
2. **OTel exporter callbacks**: Wrap in Promise for easier testing
3. **Network calls**: All tests use mocked exporters (no real HTTP)

---

## 9. Success Criteria

### 9.1 Coverage Metrics

- Instrumentation module: **100% function coverage** (all exported functions tested)
- OTel adapters: **100% function coverage** (all exported functions tested)
- Backend exporters: **100% function coverage** (all exported functions tested)

### 9.2 Behavioral Verification

**Must prove:**

1. Span stack maintains LIFO ordering
2. instrumentContainer creates spans for every resolution
3. Cleanup functions actually remove hooks
4. Port filtering works correctly (include/exclude/predicate)
5. Parent-child relationships cross container boundaries
6. BatchProcessor batches and schedules correctly
7. SimpleProcessor exports immediately
8. Span adapter converts all fields accurately
9. Backend exporters wire to underlying OTel exporters
10. DataDog bridge converts spans to dd-trace format

### 9.3 Quality Gates

- All new tests pass: `pnpm test`
- No new lint errors: `pnpm lint`
- Type checking passes: `pnpm typecheck`
- No type casts (`as X`) in test code
- No `eslint-disable` comments in test code
- Test failure messages are descriptive

---

## 10. Open Questions

### 10.1 Resolved by Research

✅ **Q:** Should tests use real containers or mocks?
**A:** Both. Unit tests use mocks (faster, isolated). Integration tests use real containers (verify actual behavior).

✅ **Q:** How to test async timing in BatchProcessor?
**A:** Use vi.useFakeTimers() and vi.advanceTimersByTime().

✅ **Q:** How to test without dd-trace installed?
**A:** Mock the dd-trace types with minimal interface wrappers.

✅ **Q:** Should tests verify intermediate state (span on stack)?
**A:** Only in unit tests. Integration tests verify end state (collected spans).

### 10.2 Deferred to Planning

- Exact test case structure (arrange/act/assert patterns)
- Specific mock return values for edge cases
- Error message validation (how strict?)
- Performance assertions (duration ranges)

---

## 11. References

### 11.1 Audit Documents

- `.planning/v7.0-MILESTONE-AUDIT.md`: Gap identification (lines 99-120)
- `.planning/ROADMAP.md`: Phase 28 overview (lines 100-112)

### 11.2 Implementation Files

**Instrumentation:**

- `packages/tracing/src/instrumentation/span-stack.ts`: 134 lines, 5 exports
- `packages/tracing/src/instrumentation/container.ts`: 252 lines, 1 export
- `packages/tracing/src/instrumentation/types.ts`: 338 lines, evaluation logic
- `packages/tracing/src/instrumentation/tree.ts`: 217 lines, tree walking
- `packages/tracing/src/instrumentation/hooks.ts`: 233 lines, hook factory

**OTel:**

- `packages/tracing-otel/src/adapters/span-adapter.ts`: 120 lines, conversion
- `packages/tracing-otel/src/processors/batch.ts`: 240 lines, batching
- `packages/tracing-otel/src/processors/simple.ts`: 144 lines, immediate export

**Backends:**

- `packages/tracing-jaeger/src/exporter.ts`: 223 lines, Jaeger wiring
- `packages/tracing-zipkin/src/exporter.ts`: 223 lines, Zipkin wiring
- `packages/tracing-datadog/src/bridge.ts`: 191 lines, dd-trace bridge

### 11.3 Existing Test Patterns

- `packages/tracing/tests/unit/memory.test.ts`: MemoryTracer usage
- `examples/react-showcase/tests/tracing.test.ts`: instrumentContainer indirect tests
- `packages/tracing/tests/integration/tracing.test.ts`: E2E workflow patterns

---

## 12. Planning Guidance

### 12.1 Task Sequencing

**Wave 1 (Parallel):**

- 28-01: Instrumentation unit tests (independent)
- 28-03: OTel unit tests (independent)

**Wave 2 (Depends on 28-01):**

- 28-02: Cross-container integration tests (needs instrumentation tests as foundation)

**Wave 3 (Depends on 28-03):**

- 28-04: Backend adapter tests (needs OTel test patterns)

### 12.2 File Organization

Each plan should:

1. Create test directory if missing (tracing-otel, tracing-jaeger, etc.)
2. Add vitest.config.ts if missing (copy from tracing package)
3. Add package.json test script if missing
4. Follow existing test file naming: `*.test.ts`

### 12.3 Test Structure Template

```typescript
describe("ComponentName", () => {
  // Setup/teardown
  beforeEach(() => {
    /* create fresh instances */
  });
  afterEach(() => {
    /* cleanup */
  });

  describe("core behavior", () => {
    it("should do X when Y", () => {
      // Arrange: setup test data
      // Act: call function
      // Assert: verify result
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      /* ... */
    });
    it("should handle null/undefined", () => {
      /* ... */
    });
  });

  describe("error conditions", () => {
    it("should log errors without throwing", () => {
      /* ... */
    });
  });
});
```

### 12.4 Verification Checklist

Each plan must verify:

- [ ] Tests pass: `pnpm --filter <package> test`
- [ ] No type errors: `pnpm --filter <package> typecheck`
- [ ] No lint errors: `pnpm --filter <package> lint`
- [ ] Coverage includes all exported functions
- [ ] Error cases tested (not just happy path)
- [ ] Cleanup verified (no memory leaks)

---

**Research Complete.** Ready to plan 4 execution plans for Phase 28.
