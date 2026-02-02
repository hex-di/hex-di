# Project Research Summary

**Project:** HexDI v4.0 GraphBuilder Improvements
**Domain:** Type-level DI container with compile-time validation
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

HexDI v4.0 is a **consolidation and enhancement milestone**, not a ground-up rebuild. Research reveals that two of the three core technical capabilities (async detection and disposal lifecycle) are **already fully implemented and battle-tested** in the codebase. Phase 10 shipped comprehensive async detection via `IsAsyncFactory<T>` (262 lines of type tests), and the runtime has production-ready LIFO disposal with async support, error aggregation, and idempotent cleanup.

The recommended approach is **incremental type-level enhancement plus API cleanup**: remove deprecated methods (`provideAsync()`, `provideFirstError()`, `provideUnchecked()`), add override lifetime validation (single type-level check preventing captive escapes), and optionally integrate TC39 disposal symbols (~30 lines). This is a **medium-scope milestone**—mostly deletions with one targeted validation addition—not a complex feature expansion.

Key risks are **type complexity budget exhaustion** (bidirectional captive validation would add O(n²) type computation), **breaking changes impacting test infrastructure** (override validation may break mocks that use mismatched lifetimes), and **migration burden** (removing `provideAsync()` affects 100+ call sites). Mitigation: defer bidirectional captive to v4.1+, provide `unsafeOverride()` escape hatch for tests, ship comprehensive codemod scripts for deprecated API removal, and implement lazy validation strategies to preserve depth budget.

## Key Findings

### Recommended Stack

**Status:** No stack changes required. TypeScript 5.6, Node.js 25.4.0, and existing type-level programming features provide all necessary capabilities.

**Core technologies:**

- **TypeScript 5.6 Conditional Types** — Already powering async detection (`IsAsyncFactory<T>`), captive validation, and cycle detection; ready for override lifetime validation with same patterns
- **TC39 Stage 3 Explicit Resource Management** — Optional integration via `Symbol.asyncDispose` on Container/Scope; backwards compatible (existing `dispose()` unchanged)
- **Existing Type-State Machine** — Phantom type parameters (`TProvides`, `TRequires`, `TAsyncPorts`, `TLifetimeMap`) enable compile-time validation with zero runtime cost

**Key insight:** The codebase already has working implementations of async detection (`packages/core/src/adapters/unified-types.ts:85-101`) and disposal (`packages/runtime/src/container/internal/lifecycle-manager.ts:152-180`). The milestone is about **API consolidation** (removing redundant methods) and **targeted validation** (override lifetime check), not building new capabilities from scratch.

**Technology Decision Summary:**

| Area                 | Decision                            | Rationale                                                    |
| -------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Async detection      | Use existing `IsAsyncFactory<T>`    | Already implemented, tested (262 lines), comprehensive       |
| Disposal lifecycle   | Use existing finalizer system       | TC39-aligned, LIFO ordering, async support, battle-tested    |
| Symbol.asyncDispose  | Add as optional enhancement         | Ergonomic for Node.js 20.4+, no breaking changes (~30 lines) |
| Override validation  | Implement type-level lifetime check | Maintains compile-time guarantee, low cost (~50 lines)       |
| Union return types   | Do NOT support                      | Ambiguous semantics (async or not?), no clear use case       |
| Method proliferation | Do NOT add specialized methods      | Single `provide()` with auto-detection is sufficient         |

### Expected Features

**Must have (table stakes):**

- **Auto-detect async factories** — Users expect 2026 DI containers to handle async automatically without manual `provideAsync()` ceremony; TypeScript's type system makes this trivially detectable
- **Override lifetime validation** — Preventing lifetime mismatches is critical for maintaining captive dependency guarantees when using child containers
- **Disposal ordering guarantees** — LIFO disposal in reverse dependency order is standard across all DI frameworks (.NET, NestJS, Angular)
- **Basic graph introspection** — `inspect()` summary mode for CI/DevTools health checks (quick validation without 20+ verbose fields)

**Should have (competitive differentiators):**

- **Compile-time Promise detection** — Most competitors (InversifyJS, TSyringe) detect at runtime or require manual marking; HexDI leverages types for zero-cost abstraction
- **Compile-time override validation** — .NET throws runtime exception, InversifyJS allows silent bugs; HexDI catches lifetime mismatches before code runs with actionable compile-time errors
- **Bidirectional captive validation** — Order-independent validation (catches violations regardless of registration sequence); most DI containers only validate forward references
- **Optional TC39 integration** — `Symbol.asyncDispose` for ergonomic `await using` patterns on Node.js 20.4+, backwards compatible

**Defer (v2+ or separate milestone):**

- **Bidirectional captive validation** — High complexity (requires new `TPendingConstraints` builder state parameter affecting all method signatures); high value but defer to v4.1 or v5.0 to avoid type complexity explosion
- **Disposal warnings in inspect()** — Nice-to-have proactive issue detection (warn when dependent has finalizer but dependency doesn't), not essential for v4.0 launch
- **Adapter-level disposal metadata** — Current container-level disposal tracking is sufficient; per-adapter metadata is enhancement, not critical

**Anti-features (explicitly do NOT build):**

- **Dynamic lifetime changes** — Breaks container contracts, causes subtle state bugs; validate lifetime immutability at compile time instead
- **Manual async marking after detection** — Creates ceremony and forgetting-to-mark bugs; auto-detect always, no `provideAsync()` needed
- **Runtime-only async detection** — Misses optimization opportunities, slower startup; detect at type level, runtime assumes correctness
- **Optional disposal ordering** — Use-after-dispose bugs too common; always enforce reverse dependency order, no opt-out
- **Sync-only disposal forcing** — Modern apps need async cleanup (DB connections, file handles); support both sync and async finalizers

### Architecture Approach

HexDI follows **strict layered separation** between compile-time (graph builder) and runtime (container) concerns. Graph builder in `@hex-di/graph` handles type-level validation via phantom type parameters in a type-state machine. Runtime container in `@hex-di/runtime` handles instantiation, memoization, and disposal orchestration. This separation must be preserved—**disposal belongs in runtime container, not graph builder**.

**Major components:**

1. **GraphBuilder type-state machine** (`@hex-di/graph`) — Threads phantom types through method chains (`TProvides`, `TRequires`, `TAsyncPorts`, `TOverrides`, `TLifetimeMap`), enabling compile-time validation (cycles, captive dependencies, override conflicts) with zero runtime cost
2. **Validation chain extensions** — New features integrate as conditional branches in existing validation types: async detection branches `ProvideResult`, override validation extends `OverrideResult`, bidirectional captive would add `CheckPendingConstraints` step
3. **Runtime disposal orchestration** (`@hex-di/runtime`) — `LifecycleManager` + `MemoMap` track instance creation order, invoke finalizers in reverse (LIFO), support async disposal with error aggregation via `AggregateError`

**Integration patterns:**

| Feature                      | Integration Pattern                               | Complexity  | Package           |
| ---------------------------- | ------------------------------------------------- | ----------- | ----------------- |
| Async detection              | Type-level branching in `ProvideResult`           | LOW         | `@hex-di/graph`   |
| Override lifetime validation | Extend validation chain in `OverrideResult`       | LOW-MEDIUM  | `@hex-di/graph`   |
| Bidirectional captive        | New state parameter `TPendingConstraints`         | MEDIUM-HIGH | `@hex-di/graph`   |
| Disposal lifecycle           | Runtime augmentation (MemoMap + LifecycleManager) | MEDIUM      | `@hex-di/runtime` |

**Key architectural insight:** Type-state machine enables compile-time validation by threading phantom type parameters through method chains. New validations extend this pattern by adding steps to existing chains (async detection, override lifetime) or adding new state tracking (pending constraints). Breaking this pattern would compromise HexDI's core value proposition: "if types say valid, it is valid."

### Critical Pitfalls

1. **Async Detection False Negatives with Promise-like Types** — Using `ReturnType<Factory> extends Promise<any>` produces false negatives for thenables, custom Promise implementations (Bluebird, Q), or wrapped promises. **Prevention:** Use `Awaited<ReturnType<Factory>>` pattern, add runtime validation in `createAdapter`, test extensively with non-native promise types. **Phase warning:** Phase 1 (unified provide) must test with custom promise implementations.

2. **Type Complexity Budget Exhaustion** — Bidirectional captive validation adds O(n²) type computation (each `provide()` checks if new adapter captures existing ports AND if existing adapters capture new port), causing TS2589 errors in graphs with >50 adapters. **Prevention:** Lazy validation (defer to `build()`), batch operations (`provideMany()`), depth budgeting (reserve 25 levels per validation type), progressive validation (fast path for common cases). **Phase warning:** Any phase adding bidirectional validation must implement depth limiting before release.

3. **Disposal Ordering Violations with Async Finalizers** — Using `await Promise.all(finalizers)` runs finalizers in parallel, breaking LIFO order when ServiceA depends on ServiceB—ServiceB may dispose before ServiceA finishes cleanup. **Prevention:** Sequential disposal (`for await` loop, not `Promise.all()`), timeout enforcement (kill finalizers exceeding 5s), error aggregation (collect all errors, don't stop on first). **Phase warning:** Phase 3 (disposal integration) must verify async finalizers execute sequentially.

4. **Override Validation Breaking Test Mocks** — Tests often override singleton services with transient mocks (technically captive violation but acceptable in test environments), so adding compile-time validation breaks 100+ test files without escape hatch. **Prevention:** Provide `unsafeOverride()` method for tests, warning-only mode initially, gradual enforcement, clear migration guide. **Phase warning:** Phase 2 (override validation) must audit test suite and provide test-specific escape hatch.

5. **Breaking Changes Migration Pain** — Removing `provideAsync()` requires updating call sites across codebase and user projects; adding override validation causes compile errors in previously valid code. **Prevention:** Comprehensive codemod scripts, deprecation period (warn in v4.0, remove in v5.0), version-gated documentation showing both old and new APIs. **Phase warning:** Phase implementing API removal (Phase 4) must include automated migration tooling.

**Additional moderate pitfalls:**

- **Port Direction Migration Complexity:** Removing `createInboundPort()`/`createOutboundPort()` requires updating 100+ files; provide codemod script
- **Merge Type Complexity:** Three merge variants (`merge`, `mergeWith`, `mergeMany`) duplicate validation logic; unify with single type and strategy parameter
- **Type Error Message Quality Degradation:** Deep generic hierarchies show internal types instead of user-facing errors; use template literal types for messages

## Implications for Roadmap

Based on research, v4.0 should prioritize **API consolidation** (high impact, low complexity) over **validation expansion** (high complexity, can defer). Bidirectional captive validation is most complex feature—defer to separate milestone to avoid type complexity explosion and scope creep.

### Suggested Phase Structure

**Phase 1: Unified Provide with Async Auto-Detection**
**Rationale:** Foundation for other changes; leverages existing `IsAsyncFactory<T>` shipped in Phase 10; unblocks method removal
**Delivers:** Single `provide()` method auto-detects async; removes `provideAsync()` (with deprecation warning)
**Addresses:** Must-have feature (auto-async detection), differentiator (compile-time detection)
**Avoids:** Pitfall 1 (async false negatives) by testing with promise-like types, Awaited<> utility
**Complexity:** LOW (reuse existing implementation, branch `ProvideResult` based on `IsAsyncFactory<T>`)
**Estimated effort:** 1-2 days

**Phase 2: Override Lifetime Validation**
**Rationale:** High-value safety feature with low implementation cost; extends existing validation chain similar to captive validation
**Delivers:** Compile-time error HEX022 when override lifetime mismatches parent (exact equality required: singleton can only override singleton)
**Addresses:** Must-have feature (override validation), differentiator (compile-time vs .NET runtime validation)
**Avoids:** Pitfall 4 (breaking test mocks) by providing `unsafeOverride()` escape hatch for test environments
**Complexity:** LOW-MEDIUM (add `_lifetimeMap` to Graph type, lifetime check to `OverrideResult`, error message type)
**Estimated effort:** 4-6 hours (~50 lines type-level code, 150 lines tests)

**Phase 3: Optional TC39 Disposal Integration**
**Rationale:** Low-hanging ergonomic win; backwards compatible (existing `dispose()` still works); no dependencies on other phases
**Delivers:** `Symbol.asyncDispose` on Container, Scope, OverrideContext; documentation with `await using` examples
**Addresses:** Should-have feature (TC39 integration), ergonomic disposal for Node.js 20.4+ users
**Avoids:** No pitfalls (purely additive, opt-in, older Node.js versions gracefully degrade)
**Complexity:** LOW (~10 lines per class, delegates to existing `dispose()`)
**Estimated effort:** 2-3 hours

**Phase 4: API Removal and Consolidation**
**Rationale:** Clean up deprecated methods after unified `provide()` ships; simplifies API surface and reduces maintenance burden
**Delivers:** Remove `provideAsync()`, `provideFirstError()`, `provideUnchecked()`, potentially `mergeWith()`; migration guide and codemod script
**Addresses:** API simplification, eliminates redundant/confusing method variants
**Avoids:** Pitfall 5 (migration pain) with automated codemod scripts, clear deprecation warnings, comprehensive documentation
**Complexity:** MEDIUM (requires migration tooling, extensive test updates, version-gated documentation)
**Estimated effort:** 2-3 days (tooling + testing + docs)

**Phase 5: Inspection Summary Mode (Optional)**
**Rationale:** Low complexity, high utility for DevTools/CI; independent of all other phases (can parallelize or defer)
**Delivers:** `inspect({ summary: true })` with filtered fields: adapterCount, asyncAdapterCount, isComplete, errors
**Addresses:** Must-have feature (basic introspection for health checks)
**Avoids:** No pitfalls (pure addition, conditional return type, filter existing data)
**Complexity:** LOW (conditional return type based on options, no new computation)
**Estimated effort:** 3-4 hours

### Phase Ordering Rationale

- **Phase 1 is foundation:** Async detection unblocks method removal and establishes single `provide()` pattern; must complete before Phase 4 (API removal)
- **Phase 2 extends validation:** Override validation needs access to parent `TLifetimeMap` (already exists); similar pattern to existing captive validation; can parallelize with Phase 1 if desired
- **Phase 3 is independent:** TC39 disposal is runtime-only, no graph builder dependencies; can implement anytime or parallelize with Phase 1-2
- **Phase 4 after Phase 1:** Cannot remove `provideAsync()` until unified `provide()` is available and stable; migration tooling depends on new API
- **Phase 5 is independent:** Inspection changes touch different code paths (`inspect()` implementation); can implement anytime or defer to v4.1

**Critical path:** Phase 1 → Phase 4 (method removal depends on unified provide)

**Parallel workstreams:** Phase 2 (override validation), Phase 3 (disposal symbols), Phase 5 (inspection) can all proceed independently

**NOT recommended for v4.0:**

- **Bidirectional captive validation:** Requires new `TPendingConstraints` builder state parameter (8th phantom type parameter affecting every method signature, merge operation, and validation chain). High complexity, high risk of TS2589 errors (Pitfall 2). **Defer to v4.1 or v5.0** as dedicated feature milestone.
- **Disposal warnings in inspect():** Proactive issue detection is nice-to-have but not critical; requires dependency graph traversal to identify finalizer ordering issues. **Defer to v4.1+** or implement if Phase 5 scope allows.
- **Adapter-level disposal metadata:** Current container-level disposal is sufficient; per-adapter metadata tracking would require resolution engine changes. **Defer indefinitely** unless user demand emerges.

### Research Flags

**Phases with standard patterns (skip `/gsd:research-phase`):**

- **Phase 1:** Well-documented TypeScript conditional types, existing `IsAsyncFactory<T>` implementation to reference
- **Phase 2:** Similar to existing captive validation, clear type-level pattern from codebase
- **Phase 3:** TC39 Stage 3 proposal documented, TypeScript 5.2+ support verified, straightforward symbol implementation
- **Phase 4:** Standard deprecation/migration pattern, no novel research needed (tooling best practices established)
- **Phase 5:** Extends existing `inspect()` API with trivial filtering, no unknowns

**No phases require deeper research** — all features have clear implementation paths from existing codebase patterns, official documentation, or industry standards.

### Phase-Specific Warnings

| Phase                         | Likely Pitfall                                      | Mitigation                                                            |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Phase 1 (Unified provide)     | False negatives with promise-like types (Pitfall 1) | Test with Awaited<>, Bluebird, Q, custom promise types                |
| Phase 2 (Override validation) | Breaking existing test mocks (Pitfall 4)            | Add `unsafeOverride()`, audit test suite, warning-only mode initially |
| Phase 3 (TC39 disposal)       | Async finalizer ordering violations (Pitfall 3)     | Verify sequential disposal in tests, not parallel                     |
| Phase 4 (API removal)         | Migration pain, naming inconsistency (Pitfall 5)    | Codemod script, deprecation warnings, API naming audit                |
| Phase 5 (Inspection)          | None (low-risk addition)                            | —                                                                     |

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                    |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | All required features exist in TypeScript 5.6 and Node.js 25.4; async detection and disposal already implemented and tested              |
| Features     | HIGH       | Feature landscape clear from existing codebase, competitive analysis, and .NET DI patterns; table stakes vs differentiators well-defined |
| Architecture | HIGH       | Integration points mapped to existing type-state machine; separation between compile-time (graph) and runtime (container) preserved      |
| Pitfalls     | HIGH       | Critical pitfalls identified from `.planning/codebase/CONCERNS.md` and standard DI patterns; mitigation strategies specified and tested  |

**Overall confidence:** HIGH

All research areas have authoritative sources: existing codebase implementation (`IsAsyncFactory<T>`, disposal lifecycle), official TypeScript documentation (conditional types, TC39 Stage 3 support), .NET DI patterns (LIFO disposal, override lifetime validation). No speculative or unverified findings. Research is based on shipped code and established practices.

### Gaps to Address

**Minor gaps (low priority, address during implementation):**

- **Disposal error handling strategy:** Research recommends "collect errors" approach (continue disposing, aggregate errors via `AggregateError`). Needs validation during implementation—verify `AggregateError` is acceptable or if custom error type with better messaging needed.

- **Test infrastructure migration effort:** Override validation may break existing test mocks that use mismatched lifetimes (Pitfall 4). Needs audit of `packages/testing/` during Phase 2 planning to quantify impact and design `unsafeOverride()` API (should it be separate method or config flag?).

- **Codemod script scope:** Phase 4 requires automated migration for `provideAsync()` → `provide()`. During planning, audit all call sites to determine if simple regex replacement suffices or if AST transformation needed (e.g., via jscodeshift or TypeScript Compiler API).

- **Type complexity budget allocation:** Research recommends depth budgeting (reserve 25 levels per validation type). During Phase 2, measure actual type recursion depth with representative graphs (30-50 adapters) to ensure override validation doesn't trigger TS2589.

**No blocking gaps:** All features have clear implementation paths. Gaps are tactical details for phase planning (API design choices, tool selection), not strategic uncertainties requiring additional research.

## Sources

### Primary (HIGH confidence)

- **Existing codebase implementation:**
  - `packages/core/src/adapters/unified-types.ts:85-101` — `IsAsyncFactory<T>` async detection (shipped in Phase 10)
  - `packages/core/tests/async-lifetime-enforcement.test-d.ts` — 262 lines of async detection validation tests
  - `packages/runtime/src/container/internal/lifecycle-manager.ts:152-180` — LIFO disposal ordering with async support
  - `packages/runtime/tests/disposal.test.ts` — Comprehensive disposal lifecycle tests (LIFO, async, error aggregation)
  - `packages/graph/src/builder/types/merge.ts:773-810` — Current `OverrideResult` implementation (foundation for lifetime validation)
- **Official documentation:**
  - TypeScript Handbook: Conditional Types — Foundation for `extends Promise<any>` detection pattern
  - TypeScript 5.2 announcement — Explicit Resource Management (TC39 Stage 3) support with `Symbol.asyncDispose`
  - TC39 Explicit Resource Management proposal (Stage 3) — `Symbol.asyncDispose` semantics, LIFO disposal guarantees
- **Domain standards:**
  - .NET DI documentation — LIFO disposal order rationale, override lifetime validation patterns (runtime validation exists)
  - NestJS lifecycle documentation — `onModuleDestroy` called in reverse dependency order (validates LIFO approach)

### Secondary (MEDIUM confidence)

- **Planning documents:**
  - `.planning/codebase/CONCERNS.md` — Known technical debt (type complexity, `parentProvides` merge bug, fragile areas)
  - `docs/improvements/graph-builder.md` — HEX022 error code specification for override lifetime validation
  - `CLAUDE.md:52-55` — Breaking changes policy ("no backward compatibility, break and change freely")
- **Competitive analysis:**
  - InversifyJS documentation — Disposal patterns, override behavior (lifetime validation not documented)
  - TSyringe README — Lifecycle scopes, no override validation found
  - typed-inject README — LIFO disposal documented, no override concept found

### Tertiary (LOW confidence, requires validation)

- **Edge cases needing testing:**
  - Custom promise implementations (Bluebird, Q) — Behavior with `Awaited<>` vs `extends Promise` needs practical testing in Phase 1
  - Union return types (`T | Promise<T>`) — Should these be rejected or treated as async? Currently undefined behavior, needs policy decision
- **User adoption patterns:**
  - Escape hatch usage (`unsafeOverride()`) — Will need monitoring after release to validate API design
  - Migration tooling effectiveness — Codemod script success rate unknown until real codebases tested
- **Performance:**
  - IDE performance impact of type complexity — Should profile during Phase 2 with realistic graphs (30-50 adapters)
  - Type checking time regression — Benchmark before/after to ensure no >2x slowdown

---

## Ready for Roadmap

**Status:** Research complete, ready for roadmap creation.

**Key recommendations for roadmap:**

1. **Core v4.0 scope:** Phases 1-3 (unified provide, override validation, TC39 disposal) + Phase 4 (API removal with migration tooling)
2. **Optional Phase 5:** Inspection summary mode (low complexity, can defer to v4.1 if timeline pressure)
3. **Explicit deferral:** Bidirectional captive validation to v4.1/v5.0 (high complexity, requires builder state expansion, risk of TS2589)
4. **Migration strategy:** Codemod scripts are critical for Phase 4; include in milestone scope, not post-release follow-up
5. **Test escape hatches:** Phase 2 must include `unsafeOverride()` before shipping validation (don't break test infrastructure)
6. **Version strategy:** Ship as major version v4.0 given breaking changes (removed APIs, new compile-time errors from override validation)

**Estimated timeline:** 1-2 weeks for Phases 1-4 (5-8 days total effort accounting for testing, documentation, migration tooling)

---

_Research completed: 2026-02-02_
_Synthesized from: STACK.md (576 lines), FEATURES.md (523 lines), ARCHITECTURE.md (932 lines), PITFALLS.md (464 lines)_
_Total research corpus: 2,495 lines across 4 specialized research documents_
_Ready for requirements definition: yes_
