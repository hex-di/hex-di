# Saga Spec Harmonization Report

**Reviewer:** saga-specialist
**Spec:** `@hex-di/saga` (spec/saga/)
**Date:** 2026-02-07
**Files Reviewed:** README.md, 01-overview.md through 17-definition-of-done.md (18 files)
**Cross-Referenced:** spec/result/README.md, spec/store/README.md, spec/query/README.md, spec/flow/README.md

---

## 1. Consistent Patterns (What Saga Gets Right)

### 1.1 Port/Adapter Architecture

Saga follows the ecosystem-wide hexagonal pattern faithfully:

- **Curried generic factories**: `sagaPort<TInput, TOutput, TError>()({ name: "orderSaga" })` matches `activityPort<>()({})` from Flow and the general `createPort<>()({})` pattern from Core.
- **Branded port types**: `SagaPort` carries `__sagaPortBrand` symbol, following `__portBrand` from Core and `__activityPortBrand` from Flow.
- **Compile-time validation**: `NotASagaPortError<T>`, `NotAStepDefinitionError<T>`, `NotASagaDefinitionError<T>` follow the `NotAPortError<T>` branded error pattern from Core.
- **GraphBuilder composition**: Saga adapters register via `graphBuilder.bind(port).to(adapter)`, consistent with all other packages.
- **Captive dependency validation**: Saga validates that scoped adapters don't capture singleton dependencies, matching the Core graph validation model.

### 1.2 Builder Pattern with Progressive Type Narrowing

- `defineStep(name).io<I, O, E>().invoke(fn).compensate(fn).build()` mirrors the staged builder pattern used by Flow's `createMachine(name).context<C>().states({}).build()`.
- Each stage narrows the type, preventing invalid configurations at compile time.
- `defineSaga(name).input<I>().step(s1).step(s2).output(fn).build()` accumulates step types progressively.

### 1.3 Result-Based Error Handling

- All saga outcomes are `Result<SagaSuccess<TOutput>, SagaError<TErrors>>` via `@hex-di/result`.
- `SagaError<TCause>` is a tagged union with `_tag` discriminant, following the ecosystem-wide tagged error union pattern.
- `safeTry` generator-based execution for sequential step orchestration aligns with Result's generator support.
- Error type accumulation at compile time (`AccumulatedErrors<TSteps>`) follows the same philosophy as Query's typed error generics.

### 1.4 React Integration Patterns

- Hooks resolve ports from `ContainerProvider`, consistent with Store's `useStateValue(port)`, Query's `useQuery(port)`, and Flow's `useMachine(port)`.
- `useSaga(port)` returns a structured result object with status/data/error fields, similar to Query's `useQuery` return shape.
- `SagaBoundary` error boundary component follows Flow's `MachineBoundary` pattern.

### 1.5 Testing Patterns

- `createSagaTestHarness` composes with `TestGraphBuilder.from().override()`, consistent with the ecosystem testing pattern.
- Step-level mocking via adapter overrides in the test graph follows the same port-based isolation approach used across all packages.

### 1.6 Introspection / DevTools

- `SagaInspector` API follows the same pattern as Store's `StoreInspector` and Flow's `MachineInspector`.
- MCP resources under `hexdi://saga/*` namespace is consistent with the ecosystem-wide MCP resource model.
- A2A skill publishing aligns with the broader HexDI nervous system vision.

### 1.7 Scoped Lifetime Defaults

- Saga adapters default to "scoped" lifetime, matching Flow's approach where stateful execution contexts are scope-bound.
- Scope disposal triggers cancellation via `AbortSignal`, consistent with the runtime disposal model.

---

## 2. Inconsistencies Found

### 2.1 SagaPersister Methods Return `Promise` Instead of `ResultAsync`

**Location:** spec/saga/08-persistence.md, SS 8.1

**Issue:** The `SagaPersister` interface methods return `Promise<void>`, `Promise<SagaExecutionState | null>`, and `Promise<string[]>`:

```typescript
interface SagaPersister {
  save(id: string, state: SagaExecutionState): Promise<void>;
  load(id: string): Promise<SagaExecutionState | null>;
  delete(id: string): Promise<void>;
  list(sagaName: string): Promise<string[]>;
  update(id: string, patch: Partial<SagaExecutionState>): Promise<void>;
}
```

Meanwhile, `SagaExecutor` and `SagaManagementExecutor` correctly return `ResultAsync`. The persister operates at a system boundary (storage I/O) where failures are common and should be typed.

**Recommendation:** Change all `SagaPersister` methods to return `ResultAsync<T, PersistenceError>` where `PersistenceError` is a tagged error type. This aligns with the ecosystem philosophy that all fallible operations return `Result`/`ResultAsync`.

**Severity:** High -- this is an architectural inconsistency at a system boundary.

### 2.2 SagaPersisterPort Uses `createPort` Instead of Specialized Factory

**Location:** spec/saga/08-persistence.md, SS 8.3

**Issue:** `SagaPersisterPort` is created with the generic `createPort` from Core:

```typescript
const SagaPersisterPort = createPort<SagaPersister>("SagaPersister");
```

But saga domain ports use the specialized `sagaPort()` curried factory. Infrastructure ports in other packages also have specialized factories (e.g., Store has state-specific port factories, Query has `createQueryPort`/`createMutationPort`).

**Recommendation:** Either:

- (a) Create a `sagaPersisterPort()` specialized factory if persistence ports need saga-specific branding/validation, or
- (b) Document explicitly that infrastructure ports (persistence, event bus) intentionally use `createPort` because they are generic infrastructure concerns, not saga-specific domain ports.

Option (b) is likely correct -- the persister is a generic infrastructure port, not a saga domain port. But this design decision should be documented in the appendices.

**Severity:** Low -- this may be intentional but lacks documentation of the rationale.

### 2.3 Return Type Inconsistency: `SagaManagementExecutor`

**Location:** spec/saga/05-ports-and-adapters.md (SS 5.5) vs spec/saga/07-runtime.md (SS 7.1)

**Issue:** In SS 5, `SagaManagementExecutor` methods return `ResultAsync`:

```typescript
interface SagaManagementExecutor<...> {
  resume(executionId: string, input?: Partial<TInput>): ResultAsync<SagaSuccess<TOutput>, SagaError<TErrors>>;
  cancel(executionId: string): ResultAsync<void, ManagementError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  listExecutions(): ResultAsync<SagaExecutionSummary[], ManagementError>;
}
```

In SS 7, the `SagaRunner` interface shows some methods returning `Promise`:

```typescript
interface SagaRunner {
  getStatus(executionId: string): Promise<SagaStatus>;
  // ...
}
```

The `SagaRunner` (internal runtime) vs `SagaManagementExecutor` (port-facing) distinction may explain the difference, but this is not clearly stated.

**Recommendation:** Clarify in SS 7 that `SagaRunner` is an internal implementation concern and its `Promise`-based API is intentionally different from the `ResultAsync`-based port API. Alternatively, make `SagaRunner` also use `ResultAsync` for consistency.

**Severity:** Medium -- this creates confusion about which interface is the canonical one.

### 2.4 `SagaErrorBase` Field Mismatch Between SS 9 and SS 15

**Location:** spec/saga/09-error-handling.md vs spec/saga/15-api-reference.md

**Issue:** SS 9 defines `SagaErrorBase` with fields:

```typescript
type SagaErrorBase = {
  sagaName: string;
  executionId: string;
  timestamp: number;
};
```

And individual error variants add `stepName`, `stepIndex`, `completedSteps`, `compensatedSteps` as needed.

SS 15 (API reference) defines `SagaErrorBase` with an additional `message: string` field and slightly different field distributions per variant. This creates ambiguity about the canonical type definition.

**Recommendation:** Reconcile the two definitions. The API reference (SS 15) should be the canonical source and SS 9 should be updated to match, or vice versa. Add `message: string` to `SagaErrorBase` if intended (it makes sense for error types to carry a human-readable message).

**Severity:** Medium -- type definition inconsistency within the same spec.

### 2.5 `useSagaHistory` Error Field Uses `Error | null`

**Location:** spec/saga/11-react-integration.md, SS 11.3

**Issue:** The `useSagaHistory` hook returns:

```typescript
{
  executions: SagaExecutionSummary[];
  isLoading: boolean;
  error: Error | null;  // <-- class-based Error
}
```

This uses a class-based `Error | null` instead of a `Result`-based approach. Other hooks in the ecosystem (Query's `useQuery`, Store's hooks) generally use typed error generics or Result types for errors.

**Recommendation:** Change to `error: SagaError<ManagementError> | null` or use a more specific typed error. Alternatively, if the intent is to match React Query's `error: Error | null` convention for familiarity, document this as an intentional deviation.

**Severity:** Low -- affects only the history monitoring hook, not core saga execution.

### 2.6 README.md Format Diverges from Other Packages

**Location:** spec/saga/README.md

**Issue:** The saga README lacks the structured `Package`/`Version`/`Dependencies` table format used by result, store, and query READMEs. The saga README has a pure ToC structure without the metadata header.

**Recommendation:** Add the standard metadata header format:

```markdown
**Package:** `@hex-di/saga`
**Version:** 0.1.0
**Status:** Draft

## Packages

| Package        | Description                                     |
| -------------- | ----------------------------------------------- |
| `@hex-di/saga` | Core saga definitions, ports, adapters, runtime |

| ...

## Dependencies

| Package        | Dependencies                                                                            | Peer Dependencies |
| -------------- | --------------------------------------------------------------------------------------- | ----------------- |
| `@hex-di/saga` | `@hex-di/core`, `@hex-di/runtime`, `@hex-di/result`, `@hex-di/graph`, `@hex-di/tracing` | -                 |

| ...
```

**Severity:** Low -- cosmetic but important for ecosystem consistency.

---

## 3. Missing Integration Points

### 3.1 No Store Integration

**Issue:** The saga spec has no mention of `@hex-di/store` integration. Common patterns like "saga step completes -> update store state" or "saga compensation -> rollback store state" are not addressed.

**Expected Integration:**

- A saga step could dispatch store actions on success/failure
- Saga completion could trigger store state transitions
- Store state could be read as saga step input (dependency injection via ports already supports this, but it is not documented)

**Recommendation:** Add a subsection to SS 10 (Integration) covering Store integration patterns. At minimum, document that saga steps can depend on Store ports via the graph, and provide an example of a saga step that reads/writes store state through port dependencies.

**Severity:** Medium -- this is a common real-world pattern that users will need.

### 3.2 No Query Integration

**Issue:** The saga spec has no mention of `@hex-di/query` integration. Common patterns like "saga completes -> invalidate relevant queries" or "saga step wraps a query/mutation" are not addressed.

**Expected Integration:**

- Saga completion could invalidate query cache entries
- A saga step could wrap a mutation port (dual-port pattern)
- Query prefetching could be triggered as a saga side-effect

**Recommendation:** Add a subsection to SS 10 covering Query integration. Document how saga completion can trigger query cache invalidation via an effect port, and how mutation ports can be used within saga steps.

**Severity:** Medium -- saga and query will frequently interact in real applications.

### 3.3 No Explicit `@hex-di/saga-testing` Package

**Issue:** The README and SS 1 list three packages: `@hex-di/saga`, `@hex-di/saga-react`, `@hex-di/saga-devtools`. Testing utilities are documented as a subpath export (`@hex-di/saga/testing`) rather than a separate package.

Meanwhile, other libraries have dedicated testing packages: `@hex-di/result-testing`, `@hex-di/store-testing`, `@hex-di/query-testing`.

**Recommendation:** Either:

- (a) Create `@hex-di/saga-testing` as a dedicated package for consistency, or
- (b) Document explicitly that `@hex-di/saga/testing` is the subpath export pattern and explain why it differs from other packages.

The subpath export approach is defensible (testing utilities are tightly coupled to saga internals), but the inconsistency should be acknowledged.

**Severity:** Low -- organizational consistency.

### 3.4 No Store-Based Persistence Adapter

**Issue:** SS 8 defines a `SagaPersister` interface with `InMemoryPersister` and a PostgreSQL example. There is no mention of a Store-based persister that would keep saga execution state in the reactive Store for DevTools visibility.

**Recommendation:** Consider documenting a `StorePersister` adapter that persists saga execution state to a Store state port. This would enable real-time DevTools visualization of saga execution progress via Store subscriptions and the existing Store introspection infrastructure.

**Severity:** Low -- nice-to-have for DevTools integration.

---

## 4. Cross-Library Pattern Analysis

### 4.1 Port Factory Pattern Comparison

| Library        | Factory                                   | Style                   |
| -------------- | ----------------------------------------- | ----------------------- |
| Core           | `createPort<T>(name)`                     | Single generic call     |
| Saga           | `sagaPort<I, O, E>()({ name })`           | Curried generic         |
| Saga (mgmt)    | `sagaManagementPort<I, O, E>()({ name })` | Curried generic         |
| Saga (persist) | `createPort<SagaPersister>(name)`         | Single generic (Core)   |
| Flow           | `activityPort<I, O, E>()({ name })`       | Curried generic         |
| Store          | `createStatePort<T, A>(config)`           | Single call with config |
| Query          | `createQueryPort<T, E>(config)`           | Single call with config |

**Observation:** Saga and Flow use curried generics for domain ports, while Store and Query use single-call factories. The curried approach is needed when the factory has 3+ explicit type parameters that cannot be inferred. This is a defensible divergence but should be documented as a design decision.

### 4.2 Error Type Pattern Comparison

| Library | Error Type                                    | Style                       |
| ------- | --------------------------------------------- | --------------------------- |
| Result  | `E` generic                                   | User-defined                |
| Saga    | `SagaError<TCause>` tagged union (7 variants) | Library-defined with `_tag` |
| Flow    | `MachineError<TCause>` tagged union           | Library-defined with `_tag` |
| Query   | `QueryError<TCause>` tagged union             | Library-defined with `_tag` |
| Store   | `StoreError` tagged union                     | Library-defined with `_tag` |

**Observation:** Consistent pattern across the ecosystem. Saga's 7 error variants are the most comprehensive, which is appropriate given saga complexity.

### 4.3 React Hook Return Shape Comparison

| Hook            | Returns                                 | Status Field                     | Error Field |
| --------------- | --------------------------------------- | -------------------------------- | ----------- |
| `useQuery`      | `{ data, error, isLoading, ... }`       | `status: string`                 | Typed error |
| `useMutation`   | `{ mutate, data, error, ... }`          | `status: string`                 | Typed error |
| `useSaga`       | `{ execute, data, error, status, ... }` | `SagaStatus` discriminated union | `SagaError` |
| `useMachine`    | `{ state, send, ... }`                  | Machine state                    | -           |
| `useStateValue` | `DeepReadonly<T>`                       | -                                | -           |

**Observation:** `useSaga` aligns well with `useMutation` in shape (imperative trigger + status tracking). The `SagaStatus` discriminated union is more type-safe than a string status, which is good.

### 4.4 Testing Harness Comparison

| Library | Factory                            | Config Pattern                    |
| ------- | ---------------------------------- | --------------------------------- |
| Saga    | `createSagaTestHarness(config)`    | `{ saga, overrides, persister? }` |
| Flow    | `createMachineTestHarness(config)` | `{ machine, overrides }`          |
| Query   | `createQueryTestHarness(config)`   | `{ port, overrides }`             |

**Observation:** Consistent pattern. Saga adds persistence config, which is appropriate.

---

## 5. Concrete Recommendations

### Priority 1 (Must Fix Before Implementation)

1. **R1: Make `SagaPersister` methods return `ResultAsync`** (SS 2.1)
   - Change all `Promise<T>` returns to `ResultAsync<T, PersistenceError>`
   - Define `PersistenceError` as a tagged union: `{ _tag: "SerializationFailed" | "StorageUnavailable" | "NotFound" | "ConcurrencyConflict" }`
   - Update all downstream code (checkpointing, resumption) to handle `ResultAsync`

2. **R2: Reconcile `SagaErrorBase` definitions** (SS 2.4)
   - Pick one canonical definition (recommend SS 15 with `message` field)
   - Update SS 9 to match
   - Ensure all 7 error variants have consistent field distributions

3. **R3: Clarify `SagaRunner` vs `SagaManagementExecutor` return types** (SS 2.3)
   - If `SagaRunner` is internal: mark it as `@internal` and document that it is not part of the public API
   - If `SagaRunner` is public: make it return `ResultAsync` like `SagaManagementExecutor`

### Priority 2 (Should Fix for Ecosystem Consistency)

4. **R4: Add Store integration section to SS 10** (SS 3.1)
   - Document how saga steps can depend on Store state ports
   - Provide example: order saga step reads inventory from Store, updates order status in Store
   - Document compensation pattern: saga rollback dispatches compensating store actions

5. **R5: Add Query integration section to SS 10** (SS 3.2)
   - Document query cache invalidation on saga completion via effect ports
   - Provide example: order saga completes -> invalidate "orders" query cache
   - Document how mutation ports can be used within saga steps

6. **R6: Standardize README.md format** (SS 2.6)
   - Add Package/Version/Status metadata header
   - Add Packages table
   - Add Dependencies table with peer dependencies

7. **R7: Fix `useSagaHistory` error type** (SS 2.5)
   - Change `error: Error | null` to `error: SagaError<ManagementError> | null`
   - Or define a specific `SagaHistoryError` tagged type

### Priority 3 (Nice to Have)

8. **R8: Document `createPort` vs curried factory design decision** (SS 2.2)
   - Add to Appendix C: "Infrastructure ports (persistence, event bus) use Core's `createPort` because they are generic infrastructure concerns. Domain ports (saga execution, management) use specialized curried factories for type-safe multi-parameter generics."

9. **R9: Address `@hex-di/saga-testing` package inconsistency** (SS 3.3)
   - Recommend keeping `@hex-di/saga/testing` subpath export but add a note in README explaining the divergence from `@hex-di/result-testing`/`@hex-di/store-testing`/`@hex-di/query-testing` pattern.

10. **R10: Consider Store-based persistence adapter for DevTools** (SS 3.4)
    - Document as a future DevTools enhancement, not blocking for 0.1.0

---

## 6. Summary

The `@hex-di/saga` spec is well-designed and largely consistent with the HexDI ecosystem. The port/adapter architecture, builder patterns, Result-based error handling, React integration, testing approach, and introspection model all follow established ecosystem conventions.

The most significant issue is **SagaPersister returning `Promise` instead of `ResultAsync`** (R1), which violates the ecosystem's fundamental "all fallible operations return Result" principle. The **SagaErrorBase field mismatch** (R2) and **SagaRunner/SagaManagementExecutor return type confusion** (R3) are internal consistency issues that should be resolved before implementation.

The **missing Store and Query integration sections** (R4, R5) are important for real-world usability -- users will inevitably combine sagas with state management and data fetching, and the spec should guide them.

Overall, the saga spec demonstrates strong ecosystem alignment. The 10 recommendations above are refinements, not fundamental redesigns.

---

_End of Saga Harmonization Report_
