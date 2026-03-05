### TG-07: Adapter Lifecycle States

**Package:** `@hex-di/core`, `@hex-di/runtime` | **Spec:** [BEH-CO-08](core/behaviors/08-adapter-lifecycle-states.md) | **Dependencies:** TG-04

#### 7.1 Define AdapterLifecycleState type and AdapterHandle interface

- [x] `AdapterLifecycleState = "created" | "initialized" | "active" | "disposing" | "disposed"`
- [x] `AdapterHandle<T, TState>` with conditional methods based on `TState`
- [x] `StateGuardedMethod<TState, TAllowed, TSignature>` utility type
- [x] Acceptance: Type tests verify methods are `never` in wrong states

#### 7.2 Define ValidTransition conditional type

- [x] `ValidTransition<TFrom>` maps each state to its sole successor
- [x] `CanTransition<TFrom, TTo>` boolean check
- [x] Acceptance: Type tests for all valid and invalid transitions

#### 7.3 Implement runtime AdapterHandle

- [x] Handle wraps adapter instance with state tracking
- [x] Each transition method returns new handle in next state (immutable state transitions)
- [x] Runtime `assertTransition(from, to)` as safety net
- [x] Acceptance: Handle transitions through full lifecycle in unit test

#### 7.4 Integrate into container resolution pipeline

- [x] Resolution engine creates `AdapterHandle<T, "created">` → initializes → activates
- [x] Only `"active"` handles expose service
- [x] Acceptance: Container resolves services through handle pipeline

#### 7.5 Write type-level and runtime tests

- [x] Type tests: all state transitions, method availability per state
- [x] Runtime tests: full lifecycle, invalid transition throws
- [x] Acceptance: `pnpm test` and `pnpm test:types` pass

---

### TG-08: Scoped Reference Tracking

**Package:** `@hex-di/core` | **Spec:** [BEH-CO-09](core/behaviors/09-scoped-reference-tracking.md) | **Dependencies:** TG-07

#### 8.1 Define ScopedRef<T> branded wrapper

- [x] `ScopedRef<T, TScopeId>` branded type with unique symbol phantom brand
- [x] `IsScopedRef<T>` type predicate
- [x] `ExtractScopeId<T>` and `ExtractService<T>` type utilities
- [x] `ScopedContainer<TProvides, TScopeId, TPhase>` interface with phase-conditional resolve
- [x] Acceptance: Type tests verify cross-scope incompatibility and gradual adoption

#### 8.2 Track scope-to-reference bindings

- [x] `ScopeBound<TScopeId>` type for scope-bound function signatures
- [x] `ScopeCallback<TProvides, TScopeId, TResult>` callback type
- [x] `WithScopeFn` type signature for scope-bounded execution
- [x] Acceptance: Type tests verify scope-bound functions accept matching refs

#### 8.3 Implement stale reference detection

- [x] `ContainsScopedRef<T, TScopeId>` recursive type detection (bounded to 5 levels)
- [x] `AssertNoEscape<TResult, TScopeId>` compile-time escape prevention
- [x] Detects direct, nested object, Promise-wrapped, and array-wrapped scoped refs
- [x] `transferRef(ref, fromScope, toScope)` re-brands references across scopes
- [x] `createTransferRecord(from, to, portName)` creates frozen transfer records
- [x] `ScopeTransferError` with `_tag`, `code`, frozen per INV-CO-6
- [x] Acceptance: Type tests for all escape detection scenarios; runtime tests for transfer

#### 8.4 Write tests

- [x] Type tests: 27 tests covering ScopedRef branding, escape detection, utilities
- [x] Runtime tests: 16 tests covering transferRef, createTransferRecord, ScopeTransferError
- [x] Acceptance: `pnpm test` and `pnpm typecheck` pass

---

### TG-09: Contract Validation at Binding

**Package:** `@hex-di/core`, `@hex-di/runtime` | **Spec:** [BEH-CO-10](core/behaviors/10-contract-validation.md) | **Dependencies:** TG-03

#### 9.1 Define ConformanceCheckResult and ContractViolation types

- [x] `ContractViolation` discriminated union with `MissingMethod`, `TypeMismatch`, `MissingProperty` tags
- [x] `ConformanceCheckResult` with `conforms: boolean` and `violations: ReadonlyArray<ContractViolation>`
- [x] `SignatureCheck` for arity verification results
- [x] `PortMethodSpec` and `PortMemberSpec` for expected member specifications
- [x] `ContractCheckMode = "off" | "warn" | "strict"` for opt-in configuration
- [x] Acceptance: Types compile with readonly fields and freeze semantics

#### 9.2 Implement checkConformance function

- [x] `checkConformance(instance, memberSpecs)` verifies structural conformance
- [x] `deriveMethodSpecs(methods)` converts port method names to `PortMemberSpec[]`
- [x] Handles null, undefined, and primitive instances gracefully
- [x] Result and all violation objects are `Object.freeze()`d
- [x] Acceptance: 11 unit tests covering conforming, missing, type mismatch, edge cases

#### 9.3 Implement checkSignatures for arity verification

- [x] `checkSignatures(instance, methodSpecs)` compares `Function.prototype.length` to expected arity
- [x] Skips non-function members (conformance check handles those)
- [x] Results frozen per INV-CO-6
- [x] Acceptance: 4 unit tests covering matching, mismatched, non-function members

#### 9.4 Create ContractViolationError with blame integration

- [x] `ContractViolationError` extends `ContainerError` with `_tag: "ContractViolationError"`
- [x] Carries `portName`, `adapterName`, frozen `violations` array
- [x] Accepts optional `BlameContext` from TG-03 blame system
- [x] Formats single and multi-violation error messages
- [x] Added to `ResolutionError` union type
- [x] Error is `Object.freeze()`d per INV-CO-6
- [x] Acceptance: 7 unit tests covering tag, properties, freezing, blame context

#### 9.5 Integrate into resolution pipeline (opt-in)

- [x] Added `contractChecks?: ContractCheckMode` to `RuntimeSafetyOptions`
- [x] `ResolutionEngine` and `AsyncResolutionEngine` accept contract check mode
- [x] `maybeCheckContract()` called after factory Ok, before freeze
- [x] `"off"` mode: zero overhead (no function calls)
- [x] `"warn"` mode: logs violations to console, resolution proceeds
- [x] `"strict"` mode: throws `ContractViolationError` with blame context
- [x] Ports without `methods` metadata skip checking regardless of mode
- [x] Acceptance: 11 integration tests covering all modes, sync/async, type mismatch

---

### TG-10: Capability Analyzer

**Package:** `@hex-di/core` | **Spec:** [BEH-CO-11](core/behaviors/11-capability-analyzer.md) | **Dependencies:** TG-02

#### 10.1 Define CapabilityReport type

- [x] Per-adapter report listing capabilities accessed, ambient authority usage, port directions
- [x] Acceptance: Type compiles with readonly fields

#### 10.2 Implement static capability analysis

- [x] Analyze adapter factory closures for ambient authority patterns (global refs, singletons)
- [x] Use port direction metadata to classify capabilities
- [x] Acceptance: Detects ambient authority in test adapter

#### 10.3 Integrate into graph inspection

- [x] Add capability report to `GraphInspection` output
- [x] Available via `graph.inspect().capabilities`
- [x] Acceptance: Inspection includes capability data

---

### TG-11: Protocol State Machines

**Package:** `@hex-di/core` | **Spec:** [BEH-CO-12](core/behaviors/12-protocol-state-machines.md) | **Dependencies:** TG-07

#### 11.1 Define ProtocolSpec and ProtocolState types

- [x] `ProtocolPort<TName, TService, TState>` with phantom state brand
- [x] `TransitionMap` type mapping `(State, Method) -> NextState`
- [x] `Transition<TMap, TState, TMethod>` conditional type for state lookups
- [x] `AvailableMethods<TMap, TState>` extracts method names per state
- [x] `ProtocolError<TState, TMethod, TAvailable>` descriptive error type
- [x] `ProtocolMethod<TMap, TState, TMethod, TSignature>` conditional method type
- [x] `ProtocolSpec<TStates, TMap>` runtime protocol specification interface
- [x] `ValidateTransitionMap<TStates, TMap>` type-level validation
- [x] Acceptance: Types compile with readonly fields, follow `NotAPortError` pattern

#### 11.2 Implement defineProtocol factory

- [x] `defineProtocol(config)` creates frozen `ProtocolSpec` from declarative config
- [x] Validates initial state is in declared states
- [x] Validates all transition source states are in declared states
- [x] Validates all transition target states are in declared states
- [x] Deep-freezes spec, states array, and transition entries
- [x] `InvalidProtocolError` extends `ContainerError` with `_tag`, `code`, frozen
- [x] Acceptance: Factory creates valid specs, rejects invalid configs

#### 11.3 Implement runtime protocol utilities

- [x] `isMethodAvailable(spec, state, method)` runtime method availability check
- [x] `getNextState(spec, state, method)` runtime transition lookup
- [x] `getAvailableMethodNames(spec, state)` returns frozen array of method names
- [x] Acceptance: Utilities correctly query protocol specs at runtime

#### 11.4 Write type and runtime tests

- [x] Type tests: `Transition` resolves correct next state for valid/invalid transitions (36 tests)
- [x] Type tests: `AvailableMethods` extracts method names per state
- [x] Type tests: `ProtocolError` produces descriptive error structure
- [x] Type tests: `ProtocolMethod` conditionally enables/disables methods
- [x] Type tests: End-to-end protocol-typed service interface enforcement
- [x] Runtime tests: `defineProtocol` creates frozen specs (26 tests)
- [x] Runtime tests: Validation rejects invalid initial state and transition targets
- [x] Runtime tests: `InvalidProtocolError` properties, freezing, inheritance
- [x] Runtime tests: `isMethodAvailable`, `getNextState`, `getAvailableMethodNames`
- [x] Runtime tests: End-to-end protocol lifecycle simulation
- [x] Acceptance: `pnpm test` passes (62 total tests across type and runtime)

---

### TG-12: Behavioral Port Specifications

**Package:** `@hex-di/core` | **Spec:** [BEH-CO-13](core/behaviors/13-behavioral-port-specs.md) | **Dependencies:** TG-09

#### 12.1 Define PortBehaviorSpec type

- [x] `Predicate<T>` function type for contract checks
- [x] `NamedCondition<T>` with name, check predicate, and message
- [x] `MethodContract<TArgs, TReturn>` with preconditions and postconditions arrays
- [x] `BehavioralPortSpec<T>` with methods map (only function keys, all optional)
- [x] `StateInvariant<T>` for invariant conditions on service state
- [x] `StatefulPortSpec<T>` extending `BehavioralPortSpec` with invariants array
- [x] `VerificationConfig` with runtimeVerification, verificationMode, onViolation
- [x] `VerificationViolation` with \_tag, contractName, message, portName, methodName
- [x] Async method postconditions receive unwrapped (resolved) value via `UnwrapPromise<R>`
- [x] Acceptance: Types compile, function keys correctly extracted, partial methods allowed

#### 12.2 Implement runtime behavior validation (dev mode Proxy wrapper)

- [x] `wrapWithVerification(instance, spec, portName, config?)` wraps service in Proxy
- [x] Proxy `get` trap intercepts function properties with matching method contracts
- [x] Non-function properties and methods without contracts pass through
- [x] Check order: pre-invariants, preconditions, method execution, postconditions, post-invariants
- [x] Async methods: preconditions checked before await, postconditions after resolve
- [x] `PreconditionViolationError` with `_tag`, `code`, frozen per INV-CO-6
- [x] `PostconditionViolationError` with `_tag`, `code`, frozen per INV-CO-6
- [x] `InvariantViolationError` with `_tag`, `code`, `checkedAt`, frozen per INV-CO-6
- [x] `onViolation: "error"` throws, `"warn"` logs warning, `"log"` logs info
- [x] `verificationMode` filters which checks run (all, preconditions, postconditions, invariants)
- [x] Exported from `contracts/verification.ts` and `@hex-di/core` index
- [x] Acceptance: All error classes extend ContainerError, violations are frozen

#### 12.3 Write tests

- [x] Precondition tests: pass, fail, violation details, NaN input, error freezing (5 tests)
- [x] Postcondition tests: pass, fail, violation details (3 tests)
- [x] Async tests: precondition before await, postcondition on resolved value, null handling (4 tests)
- [x] Invariant tests: pre/post-method checks, pre-method violation from bad state, freezing (3 tests)
- [x] VerificationConfig tests: warn mode, log mode, preconditions-only, postconditions-only, invariants-only (5 tests)
- [x] Pass-through tests: non-function properties, methods without contracts (2 tests)
- [x] Error class tests: all three error types with correct tags and properties (3 tests)
- [x] Combined test: execution order (invariant, precondition, method, postcondition, invariant) (1 test)
- [x] Async invariant test: invariants around async method calls (1 test)
- [x] Type structure tests: partial methods, MethodContract structure (2 tests)
- [x] Acceptance: 29 tests pass, `pnpm test` and `pnpm typecheck` pass

---

### TG-13: Formal Disposal Ordering

**Package:** `@hex-di/core`, `@hex-di/runtime` | **Spec:** [BEH-CO-14](core/behaviors/14-formal-disposal-ordering.md) | **Dependencies:** TG-07, TG-08, TG-03

#### 13.1 Define DisposalOrder types

- [x] `DisposalPhaseEntry` with adapterName, portName, hasFinalizer
- [x] `DisposalPhase` with level number and adapters array
- [x] `DisposalPlan` with ordered phases and totalAdapters count
- [x] `DisposalErrorEntry` with adapterName, error, and BlameContext
- [x] `DisposalResult` with disposed list, errors list, and totalTime
- [x] `DependencyEntry` for input to disposal plan computation
- [x] All types use readonly fields and freeze semantics
- [x] Exported from `@hex-di/core` via `disposal/types.ts` and package index
- [x] Acceptance: Types compile, `pnpm typecheck` passes

#### 13.2 Implement disposal order computation (reverse topological sort)

- [x] `computeDisposalPlan(entries)` uses Kahn's algorithm on reverse dependency graph
- [x] Leaf nodes (no dependents) assigned to phase 0, working back to roots
- [x] Deterministic ordering within phases (alphabetical sort)
- [x] Dependencies on unknown (external) ports are gracefully ignored
- [x] Entire plan is deeply frozen (plan, phases, entries)
- [x] `DisposalCycleInvariantError` thrown if cycle detected (safety check for framework bugs)
- [x] Error is frozen with `code`, `remainingNodes`, and descriptive message
- [x] Acceptance: 12 tests covering empty, single, linear, diamond, complex, two-chain, external deps, determinism, freezing, cycles

#### 13.3 Update MemoMap disposal (dependency-aware order with LIFO fallback)

- [x] `MemoMap.dispose()` accepts optional `dependencyEntries` in `DisposalOptions`
- [x] When dependency entries provided, computes disposal plan and executes phase-by-phase
- [x] When no dependency entries, falls back to existing LIFO (reverse creation order)
- [x] Only disposes entries that are actually cached in this MemoMap
- [x] `lastDisposalResult` property exposes result for inspection
- [x] Existing disposal behavior fully preserved (backward compatible)
- [x] Acceptance: 10 tests covering dependency-aware ordering, LIFO fallback, error handling, edge cases

#### 13.4 Handle disposal errors (aggregate with blame context)

- [x] `executeDisposalPlan()` executes phases sequentially, adapters within phase in parallel
- [x] Uses `Promise.allSettled` for parallel disposal (one failure does not cancel others)
- [x] Each error includes `BlameContext` with `DisposalError` violation type
- [x] Adapters without finalizers listed as disposed (no-op)
- [x] Adapters not found in provider listed as disposed
- [x] Async finalizers supported with per-finalizer timeout (default 30s)
- [x] `DisposalResult` is deeply frozen
- [x] MemoMap converts plan errors to `AggregateError` for backward compatibility
- [x] Acceptance: 12 tests covering empty plan, phase ordering, parallel disposal, error collection, blame context, async finalizers, freezing

---

### TG-15: Well-Founded Cycle Support

**Package:** `@hex-di/graph` | **Spec:** [BEH-GR-08](graph/behaviors/08-well-founded-cycles.md) | **Dependencies:** TG-06

#### 15.1 Detect well-founded cycles (all edges via lazyPort)

- [x] Cycle where every back-edge goes through a `lazyPort()` is well-founded
- [x] Well-founded cycles produce warnings, not errors
- [x] Acceptance: Graph with lazy-only cycle builds successfully

#### 15.2 Distinguish well-founded from ill-founded cycles

- [x] Extend cycle detection to classify each cycle
- [x] Update CycleError with `isWellFounded: boolean`
- [x] Acceptance: Mixed graph: well-founded cycle passes, ill-founded fails

#### 15.3 Update enhanced cycle errors

- [x] Well-founded cycles noted in diagram with `(lazy)` annotation
- [x] No refactoring suggestions needed for well-founded cycles
- [x] Acceptance: Well-founded cycle diagram includes `(lazy)` markers

---

### TG-16: Initialization Order Verification

**Package:** `@hex-di/graph` | **Spec:** [BEH-GR-09](graph/behaviors/09-init-order-verification.md) | **Dependencies:** TG-06

#### 16.1 Stable topological sort via computeInitializationOrder

- [x] Implement `computeInitializationOrder(adapters)` using Kahn's algorithm with level grouping
- [x] Registration-order tie-breaking for deterministic output within each level
- [x] Returns `readonly (readonly string[])[] | null` (null for cycles)
- [x] Result and inner arrays are `Object.freeze()`d (immutable)
- [x] Handles external dependencies gracefully (only internal ports counted)
- [x] Acceptance: 18 runtime tests covering empty, linear, diamond, complex, cycle, stability

#### 16.2 initializationOrder exposed via inspectGraph

- [x] Add `initializationOrder: readonly (readonly string[])[]` to `GraphInspection` type
- [x] Add `initializationOrder` to `GraphInspectionJSON` type
- [x] Wire `computeInitializationOrder()` into `inspectGraph()` inspector
- [x] Update `inspectionToJSON()` serialization to include init order
- [x] Export `computeInitializationOrder` from `@hex-di/graph/advanced`
- [x] Acceptance: Inspection includes init order for all graph configurations

#### 16.3 Type-level InitializationOrder

- [x] Implement `InitializationOrder<TBuilder>` type using type-level Kahn's algorithm
- [x] Bounded recursion (depth 50) to avoid TS2589 excessive stack depth
- [x] Degrades to `readonly string[]` for empty or complex graphs
- [x] Export from `@hex-di/graph` and `@hex-di/graph/advanced` validation types
- [x] Acceptance: 5 type-level tests verifying correct type shape

#### 16.4 Comprehensive test cases

- [x] Runtime tests: empty, single level, linear chain, diamond, tie-breaking, complex multi-level, topological invariant, cycles, immutability, external deps
- [x] Integration tests: inspectGraph includes init order, correct structure, JSON serialization, all ports included exactly once
- [x] Type-level tests: single adapter, chain, multi-level, empty graph, non-empty graph
- [x] Stability tests: identical output for same registration order, deterministic across repeated calls
- [x] Acceptance: `pnpm test` and `pnpm test:types` pass (23 total tests)

---

### TG-17: Effect Propagation Analysis

**Package:** `@hex-di/graph`, `@hex-di/core` | **Spec:** [BEH-GR-10](graph/behaviors/10-effect-propagation.md) | **Dependencies:** TG-06

#### 17.1 Compute transitive error profile per port

- [x] Add `__errorTags` runtime metadata to `AdapterConstraint` and `Adapter` types
- [x] Add `errorTags` config option to `createAdapter()` unified API
- [x] Implement `computeErrorProfile()` that walks dependency graph collecting all error tags
- [x] Implement `computeEffectSummaries()` with direct vs inherited error breakdown
- [x] Acceptance: Transitive error tags propagate through dependency chains

#### 17.2 Expose via graph inspection

- [x] Add `errorProfile: Record<string, ReadonlyArray<string>>` to `GraphInspection`
- [x] Add `effectWarnings: ReadonlyArray<string>` to `GraphInspection`
- [x] Wire `computeErrorProfile()` and `detectUnhandledErrors()` into `inspectGraph()`
- [x] Update `inspectionToJSON()` serialization to include new fields
- [x] Export new types and functions from `@hex-di/graph/advanced`
- [x] Acceptance: `inspectGraph()` returns error profile per port

#### 17.3 Detect unhandled errors at graph boundaries

- [x] Implement `detectUnhandledErrors()` that flags ports with non-empty error profiles
- [x] Warnings suggest `adapterOrDie()`, `adapterOrElse()`, or `adapterOrHandle()`
- [x] Handle diamond dependencies with deduplication
- [x] Handle cycles gracefully without infinite recursion
- [x] Acceptance: 22 tests pass covering all scenarios
