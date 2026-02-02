# Domain Pitfalls: GraphBuilder Type-Level Improvements

**Domain:** Type-level DI system enhancements
**Researched:** 2026-02-02

## Critical Pitfalls

Mistakes that cause rewrites, unsoundness, or major breaking changes.

### Pitfall 1: Async Detection False Negatives with Promise-like Types

**What goes wrong:** Type-level Promise detection using `ReturnType<Factory> extends Promise<any>` produces false negatives when factory returns promise-like objects (thenables) or wrapped promises.

**Why it happens:** TypeScript's structural typing means any object with a `.then()` method matches `Promise<T>`. Custom promise implementations, async iterators, or wrapper types may not extend `Promise` but are still async.

**Consequences:**

- Async factories marked as sync at compile time
- Runtime race conditions when container assumes synchronous instantiation
- Violation of lifetime constraints (async scoped/transient not caught)
- Memory leaks if async cleanup not registered

**Prevention:**

1. Use `Awaited<ReturnType<Factory>>` instead of `Promise` check
2. Test with custom promise implementations (Bluebird, Q, native Promise subclasses)
3. Add runtime validation in `createAdapter` that checks `factory.constructor.name === "AsyncFunction"`
4. Document that factory must be `async function`, not function returning Promise

**Detection:**

- Type tests show sync lifetime accepted for async factory
- Runtime tests show concurrent initialization when expecting serial
- Missing finalizer registration for async services

**Phase warning:** Phase implementing async detection (unified `provide()`) must test extensively with promise-like edge cases.

**References:**

- `/packages/core/tests/async-lifetime-enforcement.test-d.ts` (lines 1-294) - Current implementation
- `/packages/graph/tests/async-adapter.test.ts` (lines 54-120) - Async adapter creation tests

---

### Pitfall 2: Bidirectional Captive Validation Performance Explosion

**What goes wrong:** Bidirectional captive validation (checking both forward and reverse captive dependencies) causes O(n²) type computation where n is the number of adapters, leading to "Type instantiation is excessively deep" (TS2589) errors in graphs with >50 adapters.

**Why it happens:** Each `provide()` must:

1. Check if new adapter captures existing ports (forward captive)
2. Check if existing adapters would capture new port (reverse captive)
3. Both checks iterate over all existing adapters and their dependencies

**Consequences:**

- TypeScript compilation hangs or fails with TS2589
- IDE becomes unresponsive when hovering over builder methods
- Validation becomes unsound if depth limit hit before validation completes
- Users forced to use `withUnsafeDepthOverride()`, losing safety

**Prevention:**

1. **Lazy validation:** Only validate captive on `build()`, not on each `provide()`
2. **Batch validation:** Use `provideMany()` to amortize validation cost
3. **Depth budgeting:** Reserve depth budget for validation (e.g., max 25 levels for cycle check, 25 for captive)
4. **Progressive validation:** Fast path for common cases (no dependencies, singleton lifetime), deep validation only when needed
5. **Memoization:** Cache validation results using mapped types

**Detection:**

- TS2589 errors in user code with >30 adapters
- Type checking time >5 seconds for graph operations
- `typeComplexityScore > 100` in inspection
- IDE shows "Computing..." for extended periods

**Phase warning:** Any phase adding bidirectional validation must implement depth limiting and provide escape hatches before release.

**References:**

- `/packages/graph/src/validation/types/cycle/depth.ts` (lines 1-150) - Depth limiting implementation
- `/packages/graph/tests/batch-reverse-captive.test-d.ts` (lines 1-100) - Reverse captive detection tests
- `/.planning/codebase/CONCERNS.md` (lines 71-107) - Type complexity concerns

---

### Pitfall 3: Disposal Ordering Violations with Async Finalizers

**What goes wrong:** Async finalizers don't maintain LIFO disposal order when multiple finalizers run concurrently, causing services to access disposed dependencies.

**Why it happens:** Without explicit sequencing, `await Promise.all(finalizers)` runs all finalizers in parallel. If ServiceA depends on ServiceB and both have async finalizers, ServiceB may dispose before ServiceA finishes cleanup.

**Consequences:**

- Dangling references to disposed services
- "Cannot read property of undefined" errors during disposal
- Resource leaks (connections not closed, files not flushed)
- Difficult-to-reproduce bugs (timing-dependent)

**Prevention:**

1. **Sequential disposal:** Await each finalizer before starting next (current implementation in `/packages/runtime/tests/disposal.test.ts` lines 579-619)
2. **Dependency-aware disposal:** Dispose in reverse topological order, respecting adapter dependencies
3. **Timeout enforcement:** Kill finalizers that exceed timeout (default 5s)
4. **Error aggregation:** Collect all finalizer errors, don't stop on first failure

**Detection:**

- Finalizer ordering tests fail (`disposal.test.ts` lines 84-177)
- AggregateError not thrown when multiple finalizers fail
- Disposal order tests show non-LIFO behavior
- Integration tests show services accessing disposed dependencies

**Phase warning:** Phase implementing disposal lifecycle must test async finalizers extensively, including error cases and timeout scenarios.

**References:**

- `/packages/runtime/tests/disposal.test.ts` (lines 540-646) - Async finalizer tests
- `/packages/runtime/tests/disposal.test.ts` (lines 84-177) - LIFO ordering tests

---

### Pitfall 4: Override Lifetime Validation Breaking Existing Tests

**What goes wrong:** Adding compile-time validation that overrides must have compatible lifetimes breaks existing test code that uses runtime override for mocking purposes.

**Why it happens:** Tests often override singleton services with transient mocks. This is technically a captive dependency violation, but acceptable in test environments.

**Consequences:**

- 100+ test files fail after adding validation
- Users can't upgrade without rewriting test infrastructure
- Feature rollback or long migration period required
- Lost trust in breaking changes

**Prevention:**

1. **Test-specific escape hatch:** Add `unsafeOverride()` method that skips validation
2. **Warning-only mode:** Emit TypeScript warnings, not errors, for first major version
3. **Gradual enforcement:** Add validation behind feature flag, enable by default in next major
4. **Compatibility shim:** Keep old `override()` behavior, add `safeOverride()` with validation
5. **Clear migration path:** Document test patterns and provide codemod

**Detection:**

- Test suite failures after adding validation
- User reports of breaking changes in minor versions
- GitHub issues requesting opt-out mechanism
- High percentage of `@ts-expect-error` comments in user code

**Phase warning:** Any phase adding override validation must audit test suite first and provide escape hatch for test environments.

**References:**

- `/packages/testing/src/mock-adapter.ts` - Test mocking infrastructure
- `/packages/testing/tests/mock-adapter.test.ts` - Mock adapter tests
- `CLAUDE.md` (lines 52-55) - Breaking changes policy

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or partial soundness violations.

### Pitfall 5: Port Direction Migration Complexity

**What goes wrong:** Removing `createInboundPort()` and `createOutboundPort()` in favor of unified `createPort({ direction })` requires updating all port definitions across codebase and examples.

**Why it happens:** Port creation is scattered throughout:

- All test files (100+ files)
- Documentation examples (50+ examples)
- Example projects (react-showcase, hono-todo)
- User codebases depending on library

**Prevention:**

1. **Deprecation period:** Mark old functions deprecated in v4.0, remove in v5.0
2. **Codemod script:** Provide automated migration tool
3. **Runtime compatibility:** Keep old functions as thin wrappers
4. **Clear migration guide:** Step-by-step instructions with before/after
5. **Version-gated docs:** Show both APIs until removal

**Migration script:**

```typescript
// packages/core/scripts/migrate-ports.ts
export function migratePortCreation(code: string): string {
  return code
    .replace(
      /createInboundPort<(['"])(\w+)\1,\s*(\w+)>\(\{\s*name:\s*\1\2\1\s*\}\)/g,
      'createPort<$2, $3>({ name: $2, direction: "inbound" })'
    )
    .replace(
      /createOutboundPort<(['"])(\w+)\1,\s*(\w+)>\(\{\s*name:\s*\1\2\1\s*\}\)/g,
      "createPort<$2, $3>({ name: $2 })" // outbound is default
    );
}
```

**Phase warning:** Port API redesign phase must include migration tooling before removing old APIs.

**References:**

- `/docs/improvements.md` (lines 1-337) - Port API redesign proposal
- Project policy: "No compatibility shims" but reasonable migration path required

---

### Pitfall 6: Merge Type Complexity with Multiple Graphs

**What goes wrong:** `merge()` and `mergeWith()` operations duplicate validation logic, making them diverge over time. Adding new validation (async ports, overrides) requires updating multiple code paths.

**Why it happens:** Type-level merge has three implementations:

1. `merge(other)` - replaces conflicts with other's adapter
2. `mergeWith(other)` - preserves this graph's adapter on conflict
3. `mergeMany([g1, g2, g3])` - variadic merge with configurable strategy

Each has separate validation logic for duplicates, captives, cycles.

**Prevention:**

1. **Unified merge type:** Single `MergeOperation<G1, G2, Strategy>` type with strategy parameter
2. **Shared validation:** Extract common validation into reusable utilities
3. **Property-based tests:** Test that `merge` and `mergeWith` are inverses
4. **Type-level tests:** Verify all merge variants produce same validation errors

**Detection:**

- Merge operations accept invalid graphs in one variant but reject in another
- Test coverage differs between merge variants
- Bug fixes applied to one variant but not others

**Phase warning:** Any phase modifying merge behavior must update all three variants consistently.

**References:**

- `/packages/graph/src/builder/types/merge.ts` (810 lines) - Merge type implementations
- `/.planning/codebase/CONCERNS.md` (lines 21-46) - parentProvides merge bug

---

### Pitfall 7: Type Error Message Quality Degradation

**What goes wrong:** As type-level validation complexity increases, TypeScript error messages become cryptic, showing internal type names instead of user-facing errors.

**Why it happens:** Deep generic type hierarchies cause TypeScript to show intermediate types in error messages:

```
Type 'GraphBuilder<{ provides: Port<Logger, "Logger", 1> | Port<Database, "Database", 2>, ... }>'
is not assignable to type 'GraphBuilder<{ ... }>'
```

Instead of:

```
ERROR[HEX003]: Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'
```

**Prevention:**

1. **Error types return string literals:** Use template literal types for user-facing messages
2. **Type-level result wrappers:** Return `{ error: string } | { success: Builder }` instead of raw builder
3. **Branded error types:** Mark error types with `{ __error: true, message: string }`
4. **Documentation examples:** Show actual error messages in docs
5. **IDE integration:** Consider custom TypeScript Language Service plugin for better errors

**Example structure:**

```typescript
type ProvideResult<B, A> =
  ValidateDuplicate<B, A> extends infer Error extends string
    ? Error
    : ValidateCaptive<B, A> extends infer Error extends string
      ? Error
      : UpdateBuilderState<B, A>;
```

**Detection:**

- User bug reports mention "confusing type errors"
- Error messages reference internal types like `BuilderInternals`
- Stack Overflow questions asking how to interpret errors

**Phase warning:** Every phase adding validation must test that error messages are actionable.

**References:**

- `/packages/graph/src/validation/types/error-messages.ts` (644 lines) - Error message definitions
- `/.planning/codebase/CONCERNS.md` (lines 318-324) - Limited debugging support

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 8: Inconsistent API Naming After Removal

**What goes wrong:** Removing deprecated APIs (`provideAsync`, `provideFirstError`, `provideUnchecked`) leaves naming inconsistencies in remaining APIs.

**Why it happens:** When designing parallel APIs (sync/async variants), naming conventions emerge organically. Removing one variant makes the naming of the remaining variant look odd.

Example:

- Before: `provide()` (sync) and `provideAsync()` (async)
- After: `provide()` handles both → why not `provideSync()` for symmetry?

**Prevention:**

1. **Naming audit:** Review all API methods after removals
2. **Consistency check:** Ensure verb/noun patterns match across API surface
3. **Documentation update:** Explain why certain names were chosen
4. **Deprecation aliases:** Keep old names as deprecated exports temporarily

**Phase warning:** API removal phase should include naming consistency review.

---

### Pitfall 9: Test Doubles Drift from Production Types

**What goes wrong:** Mock adapters in test utilities don't keep up with validation changes, causing test-only type errors that don't reflect real usage.

**Why it happens:** Test utilities like `createMockAdapter()` may not enforce the same constraints as production `createAdapter()`, allowing invalid configurations in tests.

**Prevention:**

1. **Shared test fixtures:** Use real adapter creation in tests, not simplified mocks
2. **Type-level test utilities:** Provide `createTestAdapter()` that mirrors production constraints
3. **Integration test coverage:** Test with production APIs, not just unit tests with mocks
4. **Mock adapter validation tests:** Test that mocks respect same constraints as production

**Detection:**

- Tests pass but production code fails type checking
- Tests use `any` or type assertions to work around constraints
- Mock factories accept invalid configurations

**Phase warning:** Test infrastructure must be updated alongside production validation.

**References:**

- `/packages/testing/src/mock-adapter.ts` - Mock adapter implementation
- `/packages/testing/tests/mock-adapter.test.ts` - Mock adapter tests

---

## Phase-Specific Warnings

| Phase Topic                              | Likely Pitfall                                      | Mitigation                                                                 |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Unified `provide()` with async detection | False negatives with promise-like types (Pitfall 1) | Test with Awaited<>, runtime validation, custom promise types              |
| Disposal lifecycle                       | Async finalizer ordering violations (Pitfall 3)     | Sequential disposal, dependency-aware ordering, timeout enforcement        |
| Override validation                      | Breaking existing test mocks (Pitfall 4)            | Add `unsafeOverride()`, warning-only mode, test-specific escape hatch      |
| Bidirectional captive validation         | Performance explosion (Pitfall 2)                   | Lazy validation, batch operations, depth budgeting, progressive validation |
| API removal (provideAsync, etc.)         | Migration pain, inconsistent naming (Pitfall 5, 8)  | Codemod script, deprecation period, naming audit                           |
| Port API unification                     | Direction migration complexity (Pitfall 5)          | Automated migration tool, runtime compatibility layer                      |
| Merge operations                         | Type duplication divergence (Pitfall 6)             | Unified merge type, shared validation utilities                            |

---

## Integration Pitfalls with Existing System

### Pitfall 10: Type Complexity Budget Exhaustion

**Problem:** Each new validation dimension (async, override, bidirectional captive) consumes part of TypeScript's recursion depth budget. Adding all improvements may exceed budget.

**Detection:**

- TS2589 errors appear in graphs that previously worked
- Type checking time exceeds 10 seconds
- `typeComplexityScore` jumps from 50 to 150+

**Prevention:**

1. **Measure before adding:** Benchmark type checking time for representative graphs
2. **Budget allocation:** Reserve depth budget per validation type
3. **Incremental delivery:** Ship high-value validations first, defer others
4. **Runtime fallback:** Switch to runtime validation if depth exceeded

**References:**

- `/packages/graph/src/validation/types/cycle/depth.ts` (lines 1-150) - Depth management
- `/.planning/codebase/CONCERNS.md` (lines 154-187) - Type checking performance

---

### Pitfall 11: Phased Delivery Requires Validation Flags

**Problem:** Shipping validation improvements incrementally (e.g., async detection in v4.1, bidirectional captive in v4.2) means validation behavior changes across minor versions, confusing users.

**Prevention:**

1. **Feature flags:** Allow opting into new validations before they're default
2. **Validation versioning:** `GraphBuilder.withValidation({ version: "4.2" })`
3. **Progressive enhancement:** New validations start as warnings, become errors in next major
4. **Clear changelog:** Document which validations added in which version

**Example:**

```typescript
// v4.1: Async detection available but opt-in
const builder = GraphBuilder.create({ validation: { asyncDetection: true } });

// v4.2: Async detection becomes default
const builder = GraphBuilder.create(); // includes async detection
```

---

### Pitfall 12: Disposal + Async Init Race Condition

**Problem:** If container is disposed while async initialization is in progress, finalizers may not be registered yet, causing cleanup leaks.

**Prevention:**

1. **Initialization state machine:** Track `INITIALIZING | INITIALIZED | DISPOSING | DISPOSED`
2. **Block disposal during init:** `dispose()` waits for init to complete first
3. **Cleanup promise tracking:** Register cleanup promises during init, not after
4. **Timeout on disposal:** If init takes >X seconds, force disposal

**Detection:**

- Finalizers not called after disposal
- Memory leaks in integration tests with concurrent init/dispose
- Race condition appears intermittently

**References:**

- `/packages/runtime/tests/async-resolution.test.ts` (871 lines) - Async resolution tests
- `/.planning/codebase/CONCERNS.md` (lines 265-289) - Lazy resolution fragility

---

## Validation and Testing Strategies

### Testing Each Pitfall

| Pitfall                 | Test Type                 | Test Location                                                  |
| ----------------------- | ------------------------- | -------------------------------------------------------------- |
| Async false negatives   | Type-level + runtime      | `packages/core/tests/async-lifetime-enforcement.test-d.ts`     |
| Captive performance     | Benchmark + edge case     | `packages/graph/tests/performance.test.ts`                     |
| Disposal ordering       | Integration               | `packages/runtime/tests/disposal.test.ts`                      |
| Override breaking tests | Migration + compatibility | `packages/testing/tests/mock-adapter.test.ts`                  |
| Port migration          | Codemod + regression      | `packages/core/tests/create-port.test.ts`                      |
| Merge divergence        | Property-based            | `packages/graph/tests/property-based/merge-operations.test.ts` |
| Type error quality      | Documentation + snapshots | `packages/graph/tests/error-messages.test-d.ts`                |
| Naming inconsistency    | API audit                 | Manual review checklist                                        |
| Test doubles drift      | Integration               | `packages/testing/tests/integration.test.ts`                   |
| Complexity budget       | Performance benchmark     | `packages/graph/tests/performance.bench.ts`                    |
| Phased delivery flags   | Feature flag              | `packages/graph/tests/validation-flags.test.ts`                |
| Disposal race           | Concurrent                | `packages/runtime/tests/concurrent.test.ts`                    |

### Warning Signs by Phase

**Research Phase:**

- [ ] Insufficient edge case analysis for promise detection
- [ ] No performance benchmarks for bidirectional validation
- [ ] Missing disposal ordering specification

**Planning Phase:**

- [ ] No escape hatch for breaking validations
- [ ] Migration tooling not planned
- [ ] Type complexity budget not calculated

**Implementation Phase:**

- [ ] TS2589 errors in test suite
- [ ] Test mocks require `any` or type assertions
- [ ] Type checking time >5 seconds

**Testing Phase:**

- [ ] Property-based tests missing for merge operations
- [ ] No concurrent disposal tests
- [ ] Missing error message snapshot tests

**Release Phase:**

- [ ] Breaking changes in minor version
- [ ] No migration guide
- [ ] Inconsistent API naming after removal

---

## Sources

**HIGH Confidence:**

- `/packages/core/tests/async-lifetime-enforcement.test-d.ts` - Async detection implementation
- `/packages/runtime/tests/disposal.test.ts` - Disposal lifecycle behavior
- `/packages/graph/tests/batch-reverse-captive.test-d.ts` - Captive validation complexity
- `/.planning/codebase/CONCERNS.md` - Known technical debt and fragile areas
- `/packages/graph/src/validation/types/cycle/depth.ts` - Depth limiting strategy

**MEDIUM Confidence:**

- `/docs/improvements.md` - Port API redesign proposal (not yet implemented)
- `/packages/graph/ROADMAP_TO_10.md` - Future improvements (planning stage)
- `CLAUDE.md` - Project breaking changes policy

**LOW Confidence:**

- Custom promise implementations behavior (requires testing)
- User adoption patterns for escape hatches (requires data collection)
- IDE performance impact of type complexity (requires profiling)

---

_Research completed: 2026-02-02_
_Confidence: HIGH for critical pitfalls, MEDIUM for moderate pitfalls_
_Gaps: Need real-world user feedback on breaking changes, performance profiling data for type complexity_
