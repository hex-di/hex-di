# Phase 18: Testing - Research

**Researched:** 2026-02-05
**Domain:** Test coverage for runtime hook APIs, inspector API, and tracer API
**Confidence:** HIGH

## Summary

Phase 18 focuses on comprehensive test coverage for the consolidated runtime APIs from Phases 15-17: resolution hooks (beforeResolve/afterResolve), hook composition, inspector API, and tracer API. All APIs are now integrated into the core runtime — no plugin system exists. The codebase uses Vitest with a mature test infrastructure and consistent patterns.

Research reveals:

1. **Hook API is fully implemented** with addHook/removeHook methods on Container, supporting both beforeResolve and afterResolve hooks with rich context
2. **Existing hook tests are minimal** — only 6 tests in async-resolution.test.ts covering basic scenarios
3. **Inspector API is comprehensive** with 14 methods across pull-based queries, push-based subscriptions, metadata, hierarchy, and graph data
4. **Tracer API provides filtering** with TraceFilter supporting portName, lifetime, isCacheHit, minDuration, maxDuration, scopeId, and isPinned
5. **Test patterns are well-established** — realistic ports/adapters, describe/test structure, vi.fn() for mocks, assertion helpers

**Primary recommendation:** Create dedicated test files for hooks (resolution-hooks.test.ts, hook-composition.test.ts), expand inspector tests with lifecycle/hierarchy coverage, and add tracer filtering/cross-scope tests. Use existing test patterns with realistic dependency graphs.

## Standard Stack

### Core Testing Infrastructure

| Library       | Version | Purpose                           | Why Standard                                                |
| ------------- | ------- | --------------------------------- | ----------------------------------------------------------- |
| Vitest        | Latest  | Test runner and assertion library | Already in use across all packages, fast, TypeScript-native |
| @hex-di/core  | Local   | Port and adapter primitives       | Required for creating test fixtures                         |
| @hex-di/graph | Local   | GraphBuilder for test graphs      | Required for container creation                             |

### Test Utilities

| Tool               | Purpose          | When to Use                    |
| ------------------ | ---------------- | ------------------------------ |
| vi.fn()            | Mock functions   | Tracking calls in services     |
| vi.spyOn()         | Spy on methods   | Verifying hook invocation      |
| expect().toThrow() | Error assertions | Testing hook error propagation |
| Promise assertions | Async testing    | Testing async hooks            |

**Installation:**
No new packages needed — all infrastructure exists.

## Architecture Patterns

### Recommended Test File Structure

Based on codebase analysis and success criteria counts:

```
packages/runtime/tests/
├── resolution-hooks.test.ts         # 20+ resolution hook scenarios
├── hook-composition.test.ts         # 10+ composition/ordering tests
├── inspector.test.ts               # Expand existing with lifecycle tests
├── tracer.test.ts                  # New: filtering and cross-scope tests
└── [existing files...]
```

**Rationale:**

- Separate files for hooks (20+ tests) vs composition (10+ tests) keeps files focused
- inspector.test.ts exists (15KB, ~100 lines) — expand rather than replace
- tracer tests currently missing — create new file

### Pattern 1: Realistic Hook Test with Dependency Graph

**What:** Use real ports/adapters with meaningful dependencies, not minimal doubles
**When to use:** All resolution hook tests per CONTEXT.md requirements

**Example:**

```typescript
// From CONTEXT.md requirement: "Use real adapters and ports"
describe("Resolution hooks with dependencies", () => {
  test("tracks parent-child resolution chain", () => {
    const hookCalls: Array<{ portName: string; parentPort: string | null; depth: number }> = [];

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ apiKey: "test-key" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: ({ resolve }) => ({
        query: () => resolve(ConfigPort).apiKey,
      }),
    });

    const container = createContainer({
      graph: GraphBuilder.create().provide(ConfigAdapter).provide(DatabaseAdapter).build(),
      name: "Test",
    });

    container.addHook("beforeResolve", ctx => {
      hookCalls.push({
        portName: ctx.portName,
        parentPort: ctx.parentPort?.__portName ?? null,
        depth: ctx.depth,
      });
    });

    container.resolve(DatabasePort);

    expect(hookCalls).toHaveLength(2);
    expect(hookCalls[0]).toEqual({ portName: "Database", parentPort: null, depth: 0 });
    expect(hookCalls[1]).toEqual({ portName: "Config", parentPort: "Database", depth: 1 });
  });
});
```

### Pattern 2: Hook Parity Testing (Creation vs Runtime)

**What:** Verify hooks passed at creation behave identically to addHook at runtime
**When to use:** Required by CONTEXT.md "Parity tests" decision

**Example:**

```typescript
describe("Hook registration parity", () => {
  test("hooks at creation and addHook produce same behavior", () => {
    const creationCalls: string[] = [];
    const runtimeCalls: string[] = [];

    // Container with hooks at creation
    const container1 = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Creation",
      hooks: {
        beforeResolve: ctx => creationCalls.push(ctx.portName),
      },
    });

    // Container with hooks via addHook
    const container2 = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Runtime",
    });
    container2.addHook("beforeResolve", ctx => runtimeCalls.push(ctx.portName));

    container1.resolve(LoggerPort);
    container2.resolve(LoggerPort);

    expect(creationCalls).toEqual(runtimeCalls);
  });
});
```

### Pattern 3: Hook Error Propagation

**What:** Test error bubbling AND cleanup guarantees when hooks throw
**When to use:** Required by CONTEXT.md "Test both error propagation chain AND cleanup guarantees"

**Example:**

```typescript
describe("Hook error handling", () => {
  test("beforeResolve error bubbles up, subsequent hooks don't fire, container remains usable", () => {
    const firstHookCalled = vi.fn();
    const secondHookCalled = vi.fn();
    const afterHookCalled = vi.fn();

    const container = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Test",
    });

    container.addHook("beforeResolve", ctx => {
      firstHookCalled(ctx.portName);
      throw new Error("Hook error");
    });
    container.addHook("beforeResolve", ctx => secondHookCalled(ctx.portName));
    container.addHook("afterResolve", ctx => afterHookCalled(ctx.portName));

    expect(() => container.resolve(LoggerPort)).toThrow("Hook error");

    // Verify cleanup guarantees
    expect(firstHookCalled).toHaveBeenCalledWith("Logger");
    expect(secondHookCalled).not.toHaveBeenCalled(); // Subsequent hooks don't fire
    expect(afterHookCalled).not.toHaveBeenCalled(); // After hook doesn't fire on error

    // Container remains usable
    expect(() => container.resolve(LoggerPort)).toThrow("Hook error"); // Same error
  });
});
```

### Pattern 4: FIFO Ordering Verification

**What:** Strict registration order = execution order for beforeResolve
**When to use:** Required by CONTEXT.md "Strict FIFO ordering guarantee"

**Example:**

```typescript
describe("Hook composition ordering", () => {
  test("beforeResolve hooks execute in FIFO order", () => {
    const executionOrder: number[] = [];
    const container = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Test",
    });

    container.addHook("beforeResolve", () => executionOrder.push(1));
    container.addHook("beforeResolve", () => executionOrder.push(2));
    container.addHook("beforeResolve", () => executionOrder.push(3));

    container.resolve(LoggerPort);

    expect(executionOrder).toEqual([1, 2, 3]); // FIFO: first-in, first-out
  });

  test("afterResolve hooks execute in LIFO order (middleware pattern)", () => {
    const executionOrder: number[] = [];
    const container = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Test",
    });

    container.addHook("afterResolve", () => executionOrder.push(1));
    container.addHook("afterResolve", () => executionOrder.push(2));
    container.addHook("afterResolve", () => executionOrder.push(3));

    container.resolve(LoggerPort);

    expect(executionOrder).toEqual([3, 2, 1]); // LIFO: last-in, first-out (middleware)
  });
});
```

### Pattern 5: Mid-Resolution Hook Removal

**What:** Test behavior when a hook calls removeHook during active resolution
**When to use:** Required by CONTEXT.md "Mid-resolution edge case"

**Example:**

```typescript
describe("Hook composition edge cases", () => {
  test("removeHook during resolution affects only subsequent resolutions", () => {
    const calls: number[] = [];
    const container = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Test",
    });

    const hook1 = () => calls.push(1);
    const hook2 = () => {
      calls.push(2);
      container.removeHook("beforeResolve", hook3); // Remove hook3 mid-resolution
    };
    const hook3 = () => calls.push(3);

    container.addHook("beforeResolve", hook1);
    container.addHook("beforeResolve", hook2);
    container.addHook("beforeResolve", hook3);

    container.resolve(LoggerPort);
    expect(calls).toEqual([1, 2, 3]); // All hooks fire in first resolution

    calls.length = 0;
    container.resolve(LoggerPort);
    expect(calls).toEqual([1, 2]); // hook3 removed, doesn't fire in second resolution
  });
});
```

### Pattern 6: Inspector Lifecycle Stage Testing

**What:** Verify inspect returns accurate data at all lifecycle stages
**When to use:** Required by CONTEXT.md "All lifecycle stages"

**Example:**

```typescript
describe("Inspector lifecycle coverage", () => {
  test("inspect returns accurate data pre-resolve, mid-resolve, post-dispose", () => {
    const container = createContainer({
      graph: GraphBuilder.create().provide(LoggerAdapter).build(),
      name: "Test",
    });

    // Pre-resolve: no singletons cached
    const preSnapshot = inspect(container);
    expect(preSnapshot.singletons.length).toBe(1);
    expect(preSnapshot.singletons[0].isResolved).toBe(false);

    // Mid-resolve: via hook
    let midSnapshot: ContainerSnapshot | null = null;
    container.addHook("beforeResolve", () => {
      midSnapshot = inspect(container);
    });
    container.resolve(LoggerPort);
    expect(midSnapshot).not.toBeNull();
    expect(midSnapshot!.singletons[0].isResolved).toBe(false); // Not yet cached during beforeResolve

    // Post-resolve: singleton cached
    const postSnapshot = inspect(container);
    expect(postSnapshot.singletons[0].isResolved).toBe(true);

    // Post-dispose: marked disposed
    await container.dispose();
    const disposedSnapshot = inspect(container);
    expect(disposedSnapshot.isDisposed).toBe(true);
  });
});
```

### Pattern 7: Tracer Filter Testing

**What:** Test all filter dimensions: portName, lifetime, isCacheHit, minDuration, maxDuration, scopeId, isPinned
**When to use:** Required by CONTEXT.md "Full filter coverage"

**Example:**

```typescript
describe("Tracer filtering", () => {
  test("filters traces by lifetime", () => {
    const container = createContainer({
      graph: GraphBuilder.create().provide(SingletonAdapter).provide(TransientAdapter).build(),
      name: "Test",
    });

    container.resolve(SingletonPort);
    container.resolve(TransientPort);

    const singletonTraces = container.tracer.getTraces({ lifetime: "singleton" });
    const transientTraces = container.tracer.getTraces({ lifetime: "transient" });

    expect(singletonTraces).toHaveLength(1);
    expect(singletonTraces[0].portName).toBe("Singleton");
    expect(transientTraces).toHaveLength(1);
    expect(transientTraces[0].portName).toBe("Transient");
  });

  test("filters traces by duration range", () => {
    const container = createContainer({
      graph: GraphBuilder.create().provide(FastAdapter).provide(SlowAdapter).build(),
      name: "Test",
    });

    container.resolve(FastPort);
    container.resolve(SlowPort);

    const slowTraces = container.tracer.getTraces({ minDuration: 50 });
    expect(slowTraces.every(t => t.duration >= 50)).toBe(true);

    const fastTraces = container.tracer.getTraces({ maxDuration: 10 });
    expect(fastTraces.every(t => t.duration <= 10)).toBe(true);
  });
});
```

### Anti-Patterns to Avoid

- **Minimal test doubles:** Don't use `{ log: () => {} }` directly — use createAdapter for realistic scenarios
- **String-based testing:** Don't rely on error messages — use instanceof for error types
- **Mutation in hooks:** Hooks are observers, not mutators — don't test modification of results (API doesn't support this)
- **Ignoring async timing:** Don't assume instant resolution — use proper async patterns even for sync adapters

## Don't Hand-Roll

| Problem            | Don't Build             | Use Instead            | Why                                     |
| ------------------ | ----------------------- | ---------------------- | --------------------------------------- |
| Test fixtures      | Inline service objects  | createAdapter + port   | Type safety, realistic behavior         |
| Hook tracking      | Custom observer pattern | Array + push in hook   | Simple, matches codebase patterns       |
| Error assertions   | String matching         | instanceof checks      | Type-safe, resilient to message changes |
| Async coordination | setTimeout chains       | async/await + Promises | Readable, reliable                      |

**Key insight:** The codebase has mature patterns — follow them. Don't invent new test utilities when existing patterns work.

## Common Pitfalls

### Pitfall 1: Testing Hook Result Mutation

**What goes wrong:** Writing tests that expect hooks to modify resolution results
**Why it happens:** Confusion between hooks (observers) and middleware (transformers)
**How to avoid:** Research shows hooks are read-only observers — they receive context but cannot modify results. The API signature is `(context) => void`, not `(context) => context`.
**Warning signs:** Tests trying to access modified values after hook execution

### Pitfall 2: Assuming Hooks Can't Throw

**What goes wrong:** Not testing error scenarios in hooks
**Why it happens:** Most hooks are meant to observe, not fail
**How to avoid:** CONTEXT.md explicitly requires "Test both error propagation chain AND cleanup guarantees when hooks throw". Hooks CAN throw, and it should interrupt resolution.
**Warning signs:** Zero tests with `expect(() => ...).toThrow()` in hook tests

### Pitfall 3: Forgetting Hook Registration Path Parity

**What goes wrong:** Only testing addHook, not creation-time hooks
**Why it happens:** addHook is more flexible, easier to test
**How to avoid:** CONTEXT.md requires "Explicit tests proving both registration paths produce the same behavior". Every behavior test needs a parity variant.
**Warning signs:** No tests passing hooks in ContainerOptions

### Pitfall 4: Ignoring Parent Stack During Nested Resolution

**What goes wrong:** Testing only top-level resolution, missing dependency depth tracking
**Why it happens:** Top-level tests are simpler
**How to avoid:** Use dependency graphs (e.g., Database depends on Config) and verify depth/parentPort in hook context
**Warning signs:** All test adapters have `requires: []`

### Pitfall 5: Not Testing Cross-Scope Behavior

**What goes wrong:** Missing bugs in child containers, scopes, and override containers
**Why it happens:** Root container tests are easier to write
**How to avoid:** CONTEXT.md requires "Include scoped container interactions: hooks tested across parent/child containers, override containers, and disposal". Create child containers and scopes in tests.
**Warning signs:** No calls to container.createChild() or container.createScope() in hook tests

### Pitfall 6: Testing Disabled Tracing Without Performance Validation

**What goes wrong:** Assuming disabled tracing has zero overhead without proof
**Why it happens:** Overhead testing is hard
**How to avoid:** CONTEXT.md requires "Overhead test: verify disabled tracing adds negligible cost to resolution". Use Vitest benchmarks or timing assertions.
**Warning signs:** No performance comparison between traced and untraced resolutions

## Code Examples

Verified patterns from implementation analysis:

### Hook Context Structure (from hooks.ts)

```typescript
// Source: packages/runtime/src/resolution/hooks.ts
interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly scopeId: string | null;
  readonly parentPort: Port<unknown, string> | null;
  readonly isCacheHit: boolean;
  readonly depth: number;
  readonly containerId: string;
  readonly containerKind: ContainerKind;
  readonly inheritanceMode: InheritanceMode | null;
  readonly parentContainerId: string | null;
}

interface ResolutionResultContext extends ResolutionHookContext {
  readonly duration: number;
  readonly error: Error | null;
}
```

### Hook Registration (from container.ts)

```typescript
// Source: packages/runtime/src/types/container.ts
// Two registration paths - must behave identically
container.addHook<T extends HookType>(type: T, handler: HookHandler<T>): void;
container.removeHook<T extends HookType>(type: T, handler: HookHandler<T>): void;

// Via creation options
const container = createContainer({
  graph: graph,
  name: "App",
  hooks: {
    beforeResolve: (ctx) => console.log(ctx.portName),
    afterResolve: (ctx) => console.log(ctx.duration),
  },
});
```

### Inspector API Methods (from inspector-types.ts)

```typescript
// Source: packages/core/src/inspection/inspector-types.ts
interface InspectorAPI {
  // Pull-based queries
  getSnapshot(): ContainerSnapshot;
  getScopeTree(): ScopeTree;
  listPorts(): readonly string[];
  isResolved(portName: string): boolean | "scope-required";

  // Push-based subscriptions
  subscribe(listener: InspectorListener): () => void;

  // Container metadata
  getContainerKind(): ContainerKind;
  getPhase(): ContainerPhase;
  readonly isDisposed: boolean;

  // Hierarchy traversal
  getChildContainers(): readonly InspectorAPI[];

  // Graph data
  getAdapterInfo(): readonly AdapterInfo[];
  getGraphData(): ContainerGraphData;
}
```

### Tracer API Methods (from tracing-types.ts)

```typescript
// Source: packages/core/src/inspection/tracing-types.ts
interface TracingAPI {
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  getStats(): TraceStats;
  pause(): void;
  resume(): void;
  clear(): void;
  subscribe(callback: (entry: TraceEntry) => void): () => void;
  isPaused(): boolean;
  pin(traceId: string): void;
  unpin(traceId: string): void;
}

interface TraceFilter {
  readonly portName?: string;
  readonly lifetime?: Lifetime;
  readonly isCacheHit?: boolean;
  readonly minDuration?: number;
  readonly maxDuration?: number;
  readonly scopeId?: string | null;
  readonly isPinned?: boolean;
}
```

### Standalone Functions (from trace.ts and inspect.ts)

```typescript
// Source: packages/runtime/src/trace.ts and packages/runtime/src/inspect.ts
function trace<R>(container: Container, fn: () => R): TraceResult<R>;
function enableTracing(container: Container, callback?: TraceCallback): () => void;
function inspect(container: Container): ContainerSnapshot;
```

## State of the Art

| Old Approach                           | Current Approach                               | When Changed | Impact                               |
| -------------------------------------- | ---------------------------------------------- | ------------ | ------------------------------------ |
| Plugin system with HOOKS_ACCESS symbol | Direct addHook/removeHook methods              | Phase 15-03  | Simpler API, no symbol imports       |
| Plugin-based inspector/tracer          | Built-in container.inspector/tracer properties | Phase 15-04  | Zero-ceremony access, better DX      |
| String-based override API              | Adapter-based override API                     | Phase 17-04  | Type safety, compile-time validation |
| Separate installHooks/uninstall        | addHook/removeHook per-handler                 | Phase 15-03  | Fine-grained control                 |

**Deprecated/outdated:**

- HOOKS_ACCESS symbol: Removed from public exports (Phase 15-03)
- Plugin registration pattern: No longer exists
- String-keyed overrides: Replaced with adapter-based API

## Test Coverage Mapping

Based on success criteria and CONTEXT.md requirements:

### Resolution Hook Tests (20+ tests) → resolution-hooks.test.ts

1. **Basic beforeResolve scenarios (4 tests)**
   - beforeResolve called with correct context
   - beforeResolve receives port, portName, lifetime
   - beforeResolve tracks isCacheHit correctly
   - beforeResolve not called for transient cache misses

2. **Basic afterResolve scenarios (4 tests)**
   - afterResolve called with duration
   - afterResolve called with error on failure
   - afterResolve called even when resolution throws
   - afterResolve receives same context as beforeResolve plus duration/error

3. **Dependency tracking (4 tests)**
   - parentPort tracking through dependency chain
   - depth tracking (0 for top-level, 1+ for dependencies)
   - Multiple levels of nested dependencies tracked correctly
   - Concurrent resolutions don't mix parent stacks

4. **Error scenarios (4 tests)**
   - beforeResolve throw bubbles up to caller
   - afterResolve throw bubbles up after resolution
   - Subsequent hooks don't fire when early hook throws
   - Container remains usable after hook error

5. **Async hook scenarios (4 tests)**
   - Hooks work with async factories
   - Hooks work with resolveAsync
   - Hook timing measured correctly for async
   - No timeout behavior (API doesn't support it per research)

6. **Scoped container interactions (4 tests)**
   - Hooks fire in child containers
   - Hooks fire in scopes
   - Hooks fire in override containers
   - containerId and containerKind tracked correctly

7. **Parity tests (4 tests)**
   - Creation-time hooks behave same as addHook
   - Multiple hooks at creation vs multiple addHook calls
   - Hook removal works same for both paths
   - Mixed creation + runtime hooks work together

**Note:** Target is 20+ tests; this breakdown provides 28 test scenarios covering all requirements.

### Hook Composition Tests (10+ tests) → hook-composition.test.ts

1. **FIFO ordering (3 tests)**
   - beforeResolve hooks execute in registration order
   - Registration order preserved across multiple resolutions
   - Registration order preserved with mixed creation/runtime hooks

2. **Lifecycle sequencing (3 tests)**
   - beforeResolve fires before afterResolve on same resolution
   - All beforeResolve hooks complete before first afterResolve
   - afterResolve hooks execute in LIFO order (middleware pattern)

3. **Mid-resolution removal (2 tests)**
   - removeHook during resolution affects only next resolution
   - removeHook during resolution doesn't break current execution

4. **Cross-event interactions (3 tests)**
   - beforeResolve and afterResolve share same context (verify fields match)
   - Hook state survives disposal (hooks still registered but container disposed)
   - Multiple hook types interact correctly in same container

**Note:** Target is 10+ tests; this breakdown provides 11 test scenarios.

### Inspector API Tests → inspector.test.ts (expand existing)

**Existing coverage (from inspector.test.ts):**

- createInspector factory returns frozen object
- snapshot() returns ContainerSnapshot structure
- listPorts() returns port names
- isResolved() checks singleton cache

**New coverage needed (lifecycle/hierarchy per CONTEXT.md):**

1. **Lifecycle stage tests (4 tests)**
   - Pre-resolve: isResolved returns false
   - Mid-resolve: snapshot captured during hook shows current state
   - Post-resolve: isResolved returns true
   - Post-dispose: snapshot.isDisposed is true

2. **Cross-scope hierarchy (4 tests)**
   - getChildContainers() returns child container inspectors
   - Child inspector shows parent context correctly
   - Override container inspection shows overridden adapters
   - Scope tree reflects active scopes

**Total new tests:** 8 additional scenarios in existing file

### Tracer API Tests → tracer.test.ts (new file)

1. **Filter coverage (7 tests, one per filter dimension)**
   - Filter by portName (partial match, case-insensitive)
   - Filter by lifetime (singleton/scoped/transient)
   - Filter by isCacheHit (true/false)
   - Filter by minDuration
   - Filter by maxDuration
   - Filter by scopeId
   - Filter by isPinned

2. **Combined filters (2 tests)**
   - Multiple filters ANDed together
   - Empty filter returns all traces

3. **Overhead test (1 test)**
   - Measure resolution time with tracing disabled vs minimal overhead

4. **Cross-scope tracing (2 tests)**
   - Traces collected across parent/child containers
   - Traces separated by scopeId correctly

5. **Subscription tests (2 tests)**
   - subscribe() receives real-time traces
   - Unsubscribe stops receiving traces

6. **Stats computation (2 tests)**
   - getStats() computes averageDuration correctly
   - getStats() computes cacheHitRate correctly

**Total tests:** 16 scenarios in new file

## Test File Size Guidance

Based on codebase analysis:

- Small tests: 200-400 lines (container.test.ts: 233 lines)
- Medium tests: 400-700 lines (disposal.test.ts: 756 lines)
- Large tests: 700-1600 lines (async-resolution.test.ts: 851 lines, child-container.test.ts: 1542 lines)

**Recommendations:**

- resolution-hooks.test.ts: ~800 lines (28 tests × ~30 lines each)
- hook-composition.test.ts: ~400 lines (11 tests × ~35 lines each)
- inspector.test.ts: expand by ~300 lines (8 new tests)
- tracer.test.ts: ~600 lines (16 tests × ~35 lines each)

Total new test code: ~2100 lines

## Async Hook Timeout Decision (Claude's Discretion)

**Research finding:** The API does NOT support timeout behavior for hooks.

**Evidence:**

1. Hook signatures are `(context) => void`, not `(context) => Promise<void>`
2. HooksRunner.runSync and runAsync don't await hook execution
3. No timeout configuration in ContainerOptions or HooksRunner
4. Hooks are meant to be fast observers, not async operations

**Recommendation:** Do NOT test timeout behavior. The API is synchronous by design.

## Hook Result Chaining Decision (Claude's Discretion)

**Research finding:** Hooks CANNOT modify resolution results.

**Evidence:**

1. Hook return type is `void`
2. HooksRunner doesn't capture or apply hook return values
3. Hooks are observers, not middleware transformers
4. afterResolve receives error but cannot prevent throw

**Recommendation:** Do NOT test result modification. Test observation behavior only.

## Test File Organization Decision (Claude's Discretion)

**Recommendation:** Use separate files per major API surface.

**Rationale:**

1. Success criteria targets (20+ hook tests, 10+ composition tests) suggest dedicated files
2. Existing test files average 400-800 lines — combining all hook tests would exceed this
3. Separate concerns: resolution behavior (resolution-hooks.test.ts) vs composition/ordering (hook-composition.test.ts)
4. Inspector and tracer are distinct APIs warranting separate focus

**File structure:**

- resolution-hooks.test.ts: Resolution scenarios, error handling, async, scoped, parity
- hook-composition.test.ts: Ordering, lifecycle sequencing, removal, interactions
- inspector.test.ts: Expand existing with lifecycle and hierarchy tests
- tracer.test.ts: New file for filtering, overhead, cross-scope, subscriptions

## Test Naming Convention Decision (Claude's Discretion)

**Research finding:** Codebase uses consistent patterns.

**Convention:**

1. describe() blocks: Feature/API name or scenario group
2. test()/it(): Behavior description in present tense ("should...")
3. File-level JSDoc: Lists test categories

**Example pattern (from async-resolution.test.ts):**

```typescript
/**
 * Tests for async factory resolution in @hex-di/runtime.
 *
 * These tests verify:
 * - Async adapter creation and resolution
 * - resolveAsync method behavior
 * - Error handling for async factories
 */

describe("Async Factory Resolution", () => {
  describe("resolveAsync with async adapters", () => {
    it("should resolve an async adapter via resolveAsync", async () => {
      // test implementation
    });
  });
});
```

**Recommendation:** Follow existing patterns. Use descriptive test names starting with "should" for clarity.

## Existing Test Reorganization Decision (Claude's Discretion)

**Research finding:** Minimal overlap with Phase 18 coverage.

**Current hook tests (in async-resolution.test.ts):**

- 6 tests covering async adapter hook integration
- No standalone hook behavior tests
- No composition or ordering tests
- No cross-scope or error propagation tests

**Recommendation:** DO NOT reorganize existing tests. Leave async-resolution.test.ts intact — it tests async-specific hook behavior. New dedicated hook test files cover the missing 20+ resolution scenarios and 10+ composition scenarios.

## Open Questions

None — all research areas have been thoroughly investigated with HIGH confidence.

## Sources

### Primary (HIGH confidence)

- packages/runtime/src/resolution/hooks.ts - Hook type definitions and context structure
- packages/runtime/src/resolution/hooks-runner.ts - Hook execution implementation
- packages/runtime/src/container/wrappers.ts - addHook/removeHook implementation
- packages/runtime/src/types/container.ts - Container type with hook methods
- packages/runtime/src/inspect.ts - Standalone inspect() function
- packages/runtime/src/trace.ts - Standalone trace() and enableTracing() functions
- packages/core/src/inspection/inspector-types.ts - InspectorAPI interface
- packages/core/src/inspection/tracing-types.ts - TracingAPI and TraceFilter interfaces
- packages/runtime/tests/async-resolution.test.ts - Existing hook test patterns
- packages/runtime/tests/disposal.test.ts - Test pattern examples
- packages/runtime/tests/container.test.ts - Test structure conventions
- .planning/phases/18-testing/18-CONTEXT.md - User decisions and requirements
- .planning/PROJECT.md - Project state and v5.0 milestone context
- .planning/STATE.md - Phase 15-17 completion status

### Secondary (MEDIUM confidence)

None — all findings verified from primary sources

### Tertiary (LOW confidence)

None — no unverified claims

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All test infrastructure exists and is mature
- Architecture: HIGH - Existing test patterns are clear and consistent
- Pitfalls: HIGH - Derived from API surface analysis and CONTEXT.md requirements
- Coverage mapping: HIGH - Based on API documentation and success criteria

**Research date:** 2026-02-05
**Valid until:** 60 days (stable APIs, no breaking changes expected in Phase 18)

**Test count targets:**

- Resolution hooks: 28 scenarios (target: 20+) ✓
- Hook composition: 11 scenarios (target: 10+) ✓
- Inspector API: 8 new scenarios (expand existing coverage) ✓
- Tracer API: 16 scenarios (new file) ✓
- **Total:** 63 new test scenarios
