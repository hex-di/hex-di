# Competitor Comparison — React Integration

Feature matrix comparing `@hex-di/result-react` against React integration stories of TypeScript Result/Either libraries and the broader React ecosystem.

> **Regulatory note**: This document is **informational, not normative**. The self-assessed scores have not been independently validated and should not be cited as evidence in regulatory submissions. The ratings reflect the library maintainer's assessment based on publicly available documentation and source code as of the assessment date. Organizations conducting their own technology evaluations should perform independent assessments appropriate to their risk tolerance and regulatory requirements.

**Last updated**: 2026-02-16. Data sourced from npm registry, GitHub API, and source code review.

Companion to the [core library comparison](../../comparisons/competitors.md).

## Package Overview

| Package | React Integration | Type | Notes |
|---------|------------------|------|-------|
| `@hex-di/result-react` | Official package (spec'd) | Standalone hooks + components | This package |
| `neverthrow` | None (custom hooks) | Community DIY | Known React 19 Server Component incompatibility ([#643](https://github.com/supermacro/neverthrow/issues/643)) |
| `effect` | None official | Community DIY | No `@effect/rx`, `@effect/rx-react`, or `@effect/react` on npm |
| `fp-ts` | None (unmaintained community) | Community DIY | `fp-ts-react` abandoned since 2022. Library in maintenance mode. |
| `true-myth` | None | Community DIY | `Task<T,E>` implements `PromiseLike` — works with React 19 `use()` out of the box |
| `oxide.ts` | None | Community DIY | Library abandoned since Oct 2022 |
| `purify-ts` | None | Community DIY | No known React packages |
| `option-t` | None | Community DIY | No known React packages |
| `ts-results-es` | None | Community DIY | No known React packages |

### Key Landscape Changes Since Initial Assessment

1. **Effect has NO official React integration.** Despite 7.27M weekly downloads, there is no `@effect/react`, `@effect/rx`, or `@effect/rx-react` package on npm. The `Reactivity.ts` module in `@effect/experimental` is about data-level cache invalidation, not React.js. Community packages exist (`@rikalabs/effect-react` v0.0.2, `@mcrovero/effect-react-cache` v0.2.3) but are early-stage.

2. **neverthrow has active React incompatibilities.** Issue [#643](https://github.com/supermacro/neverthrow/issues/643): `ResultAsync.fromPromise` fails with React 19 Server Components (flight promises lack `.catch`). Issue [#646](https://github.com/supermacro/neverthrow/issues/646): Next.js caching treats `Ok` class's `[Symbol.iterator]` as an iterable. Both are unresolved with no maintainer response.

3. **true-myth's `Task<T,E>`** implements `PromiseLike<Result<T, E>>`, making it compatible with React 19's `use()` hook and Suspense out of the box — no wrapper needed.

## Scoring Dimensions

Each dimension is rated 0–10. A score of 10 represents the theoretical best for a React integration layer of a standalone TypeScript Result library.

| # | Dimension | What It Measures |
|---|-----------|------------------|
| 1 | Pattern Matching UI | Declarative rendering of Ok/Err branches — components, render props, exhaustiveness enforcement |
| 2 | State Management | Hooks for holding Result in React state with ergonomic setters and stable references |
| 3 | Async Integration | Hooks for async Result operations — loading state, abort, race condition handling, generation tracking |
| 4 | Suspense Support | Integration with React Suspense — thrown promises, React 19 `use()`, streaming |
| 5 | Type Inference in JSX | Generic propagation from Result to render callbacks, overload selection, phantom type handling |
| 6 | Concurrent Mode Safety | StrictMode double-mount handling, abort-on-cleanup, stale closure prevention, transition support |
| 7 | Server Component Compat | Works in RSC context, proper "use client" boundaries, server action integration |
| 8 | Data Fetching Adapters | Integration with TanStack Query, SWR, or other caching layers |
| 9 | Optimistic Updates | Support for React 19 `useOptimistic` or equivalent patterns |
| 10 | Composition / Do-Notation | Sequential multi-Result composition within React lifecycle (generators, do-notation) |
| 11 | Testing Utilities | Custom matchers, render helpers, hook testing support |
| 12 | API Consistency | Naming alignment with core library, consistent return shapes, follows established patterns |
| 13 | Bundle Impact | Additional bundle cost of the React layer, tree-shaking, subpath exports |
| 14 | Documentation Quality | Usage examples, type-level docs, migration guides, spec-level documentation |
| 15 | Philosophy Alignment | Maintains core library's "errors as values" principle in the React layer |

## React Integration Ratings

| Dimension | hex-di/result-react | neverthrow (DIY) | Effect (DIY) | fp-ts (DIY) | true-myth (DIY) | oxide.ts (DIY) | purify-ts (DIY) | option-t (DIY) | ts-results-es (DIY) |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Pattern Matching UI | 9 | 4 | 6 | 5 | 5 | 3 | 4 | 3 | 3 |
| State Management | 9 | 5 | 5 | 4 | 4 | 3 | 4 | 3 | 3 |
| Async Integration | 10 | 5 | 7 | 4 | 4 | 2 | 3 | 2 | 3 |
| Suspense Support | 9 | 2 | 5 | 2 | 4 | 1 | 1 | 1 | 1 |
| Type Inference in JSX | 10 | 6 | 7 | 6 | 5 | 4 | 5 | 4 | 4 |
| Concurrent Mode Safety | 10 | 3 | 6 | 3 | 2 | 2 | 2 | 2 | 2 |
| Server Component Compat | 9 | 3 | 4 | 3 | 4 | 1 | 3 | 3 | 3 |
| Data Fetching Adapters | 9 | 4 | 5 | 3 | 2 | 2 | 2 | 2 | 2 |
| Optimistic Updates | 8 | 1 | 3 | 1 | 1 | 1 | 1 | 1 | 1 |
| Composition / Do-Notation | 9 | 4 | 8 | 6 | 3 | 2 | 3 | 2 | 2 |
| Testing Utilities | 9 | 2 | 5 | 2 | 3 | 1 | 1 | 1 | 1 |
| API Consistency | 10 | 5 | 6 | 5 | 5 | 5 | 5 | 5 | 4 |
| Bundle Impact | 9 | 8 | 3 | 5 | 9 | 9 | 7 | 9 | 8 |
| Documentation Quality | 9 | 3 | 5 | 3 | 4 | 2 | 2 | 2 | 2 |
| Philosophy Alignment | 10 | 6 | 6 | 7 | 7 | 5 | 5 | 6 | 5 |
| **TOTAL** | **139** | **61** | **85** | **59** | **62** | **43** | **48** | **46** | **44** |

## Per-Library Justifications

### @hex-di/result-react (139/150)

- **Pattern Matching UI 9**: Render-prop `Match` component with full exhaustiveness enforcement. Both `ok` and `err` required at type level. Key isolation for independent branch state. `matchResult`/`matchOption` server utilities extend pattern matching to RSC. Loses 1pt: no Option-specific React component (intentional — see [ADR-R005](../decisions/R005-no-option-hooks.md)).
- **State Management 9**: `useResult` with stable action references ([INV-R1](../invariants.md#inv-r1-stable-action-references)), overloads for initialized/uninitialized. Loses 1pt: phantom type `E = never` issue requires explicit type params when using `setErr` with an Ok-initialized result.
- **Async Integration 10**: `useResultAsync` (eager) + `useResultAction` (lazy) with generation tracking ([INV-R3](../invariants.md#inv-r3-generation-guard)), AbortSignal support on both hooks ([INV-R2](../invariants.md#inv-r2-abort-on-cleanup)), race condition prevention. Built-in retry with exponential backoff (`retry`, `retryDelay`, `retryOn`) — retries respect abort signals ([INV-R8](../invariants.md#inv-r8-retry-abort-propagation)).
- **Suspense Support 9**: `useResultSuspense` with React 19 `use()` support. `createResultResource` for render-as-you-fetch pattern with `preload()`, `read()`, and `invalidate()` ([INV-R9](../invariants.md#inv-r9-resource-cache-isolation)). Errors remain as values in `Err` branch. Loses 1pt: no streaming SSR integration (framework-specific).
- **Type Inference in JSX 10**: Render props provide full generic inference from `result` to callbacks. No compound component inference breakage. Phantom types documented with explicit workarounds. See [type-system/inference.md](../type-system/inference.md).
- **Concurrent Mode Safety 10**: StrictMode double-mount handled via abort + generation pattern ([INV-R7](../invariants.md#inv-r7-strict-mode-compatibility)). `useOptimisticResult` supports transitions. `useResultTransition` wraps React 19 `useTransition` with Result semantics.
- **Server Component Compat 9**: Dedicated `/server` subpath with `matchResult`, `matchResultAsync`, `matchOption`, `resultAction` — all RSC-safe pure functions ([INV-R10](../invariants.md#inv-r10-server-utility-purity)). Clear `"use client"` boundary guidance table. React version compatibility matrix documents per-export React 18/19 support. `fromAction` + `resultAction` cover client and server action patterns. Loses 1pt: RSC ecosystem still evolving, streaming integration deferred.
- **Data Fetching Adapters 9**: `toQueryFn`, `toQueryOptions`, `toMutationFn`, `toMutationOptions` for TanStack Query. `toSwrFetcher` for SWR. `to*` naming convention documented in [ADR-R007](../decisions/R007-adapter-naming.md). Optional peer dependencies documented in overview. Loses 1pt: no cache-hydration helpers (framework-specific).
- **Optimistic Updates 8**: `useOptimisticResult` wraps React 19 `useOptimistic` with Result semantics. Loses 2pts: React 19 only (no fallback for React 18), no rollback integration with error display.
- **Composition / Do-Notation 9**: `useSafeTry` (sync + async generators) bridges the core library's `safeTry` into React lifecycle. Core `bind`/`let_` Do notation available directly inside `useResultAsync` for imperative-style composition (see [ADR-R008](../decisions/R008-no-do-notation-hook.md) for why a dedicated hook was not provided). Loses 1pt: Effect's fiber-based composition handles more complex concurrency patterns.
- **Testing Utilities 9**: Custom Vitest matchers (`toBeOk`, `toBeErr`, `toBeLoading`), `renderWithResult` helper, `createResultFixture` for test data factories with `ok()`/`err()`/`okAsync()`/`errAsync()`, `mockResultAsync` for controllable deferred resolution with explicit single-resolution contract, `ResultDecorator` for Storybook. Loses 1pt: no MSW integration helpers (external dependency).
- **API Consistency 10**: Follows core library's `from*` constructor pattern, `match` naming, consistent object return shapes. `useResultAction` naming avoids React collision. `to*` adapter prefix documented in [ADR-R007](../decisions/R007-adapter-naming.md), complementing core's `from*`/`to*` directionality.
- **Bundle Impact 9**: Four subpath exports (core/adapters/server/testing). No barrel re-exports of core types. Adapters and server utilities tree-shake when unused. Loses 1pt: React peer dependency is inherent overhead.
- **Documentation Quality 9**: Full spec with 7 behavior specs, 8 ADRs, 12 invariants, type-system docs, test strategy with integration test plans, competitor comparison matrix. Loses 1pt: no interactive playground (requires infrastructure).
- **Philosophy Alignment 10**: No error boundary component. No exception promotion. Errors always flow as values through render props and hook returns. Server utilities maintain the same principle. Explicit decision record explaining why ([ADR-R001](../decisions/R001-no-error-boundary.md)).

### neverthrow — DIY (61/150)

- **Pattern Matching UI 4**: No component. Inline `.match()` works but no exhaustiveness enforcement in JSX, no key isolation between branches.
- **State Management 5**: Manual `useState<Result<T, E>>()`. No stable setters, no ergonomic helpers. Users write custom hooks.
- **Async Integration 5**: `ResultAsync` exists as a chaining primitive. Users build their own `useResultAsync` with `useEffect`. No generation tracking or abort handling. **Broken with React 19 Server Components** ([#643](https://github.com/supermacro/neverthrow/issues/643)): `ResultAsync.fromPromise` fails on flight promises. **Next.js caching issue** ([#646](https://github.com/supermacro/neverthrow/issues/646)): Ok's `[Symbol.iterator]` treated as iterable. Downgraded from 6→5 due to confirmed incompatibilities.
- **Suspense Support 2**: No Suspense integration. Users must manually throw promises. Class-based types don't serialize across RSC boundaries.
- **Type Inference in JSX 6**: `.match()` infers types correctly. No component-level inference. Generic propagation depends on user implementation.
- **Concurrent Mode Safety 3**: No built-in handling. Users must implement abort + generation patterns themselves.
- **Server Component Compat 3**: `Result` types are class instances — **not serializable across RSC boundaries**. No server action helpers. Confirmed issues with Next.js. Downgraded from 4→3.
- **Data Fetching Adapters 4**: No adapters. Users wrap `ResultAsync` in `queryFn` manually. Blog posts document the pattern.
- **Optimistic Updates 1**: No integration. Manual implementation required.
- **Composition / Do-Notation 4**: `safeTry` generators exist in core but no React lifecycle bridge.
- **Testing Utilities 2**: No React testing utilities. Core has `_unsafeUnwrap`/`_unsafeUnwrapErr` for test extraction.
- **API Consistency 5**: Core API is consistent but no React-specific naming conventions.
- **Bundle Impact 8**: Small core library (~6KB minified+gzipped). No React layer overhead. But no tree-shaking support ([#660](https://github.com/supermacro/neverthrow/issues/660)).
- **Documentation Quality 3**: Good core README. No React usage docs beyond community blog posts.
- **Philosophy Alignment 6**: Core is errors-as-values. But `_unsafeUnwrap` is ungated — no import restriction means developers may reach for it with error boundaries.

### Effect — DIY (85/150)

- **Pattern Matching UI 6**: `Match` module (`Match.type<T>()`, `Match.tag()`, `Match.when()`, `Match.exhaustive`) provides powerful functional pattern matching. Not a React component — used with `pipe()`. Works but not React-idiomatic. Downgraded from 7→6: confirmed no React-specific component.
- **State Management 5**: No official React state hooks. Users create custom hooks around `ManagedRuntime`. Runtime initialization adds complexity. Downgraded from 6→5.
- **Async Integration 7**: Effect fibers provide advanced async with interruption, timeout, retry via `Schedule`. Users bridge via `runtime.runPromise(effect)` in custom hooks. More powerful than simple hooks but heavier. No turnkey `useResultAsync` equivalent.
- **Suspense Support 5**: `Runtime.runPromise` can trigger Suspense. `Micro` module provides lighter alternative. No turnkey `useResultSuspense`. Downgraded from 7→5: confirmed no official React Suspense integration.
- **Type Inference in JSX 7**: Strong inference via Effect's type system. The `R` (requirements) type parameter adds complexity in React context. Pipe-first style less ergonomic in JSX callbacks.
- **Concurrent Mode Safety 6**: Fiber interruption handles cleanup. But requires manual `ManagedRuntime` setup in React providers. No StrictMode-specific guidance. Downgraded from 8→6.
- **Server Component Compat 4**: Effect runtime needs client-side initialization (`ManagedRuntime`). No RSC-safe utilities, no server action wrappers. `Either` values are branded objects (serializable) but `Effect` values are not. Downgraded from 6→4.
- **Data Fetching Adapters 5**: Effect has its own HTTP client (`@effect/platform`). No TanStack Query/SWR adapters. The ecosystem expects you to use Effect's data layer end-to-end.
- **Optimistic Updates 3**: Can be implemented via Effect's state management (`Ref`/`SynchronizedRef`) but no turnkey `useOptimistic` bridge.
- **Composition / Do-Notation 8**: `Effect.gen(function*() { ... })` is best-in-class generator Do notation. Users bridge to React via `runtime.runPromise`. Powerful but requires full Effect buy-in.
- **Testing Utilities 5**: `@effect/vitest` provides Effect-aware test utilities. No React-specific testing helpers. `Layer.mock` (v3.17.0) helps with service mocking.
- **API Consistency 6**: Consistent within Effect's ecosystem. `useEffect` name collision with React's hook requires careful imports. Pipe-first style differs from React conventions.
- **Bundle Impact 3**: Effect runtime ~50KB+ even with tree-shaking. `fast-check` production dependency. Downgraded from 4→3 based on confirmed 27MB unpacked, `fast-check` dep.
- **Documentation Quality 5**: Comprehensive Effect docs site. But React integration guidance is sparse — no official React tutorial, patterns, or hook examples. Downgraded from 7→5.
- **Philosophy Alignment 6**: Effect treats errors as typed values (defects vs failures via `Cause`). The framework's power encourages patterns more complex than simple Result matching. No explicit guidance on avoiding error boundaries in React.

### fp-ts — DIY (59/150)

- **Pattern Matching UI 5**: `fold` / `match` on `Either` works inline. No component. `pipe(either, fold(...))` is idiomatic but verbose.
- **State Management 4**: Manual `useState<Either<E, T>>()`. HKT encoding makes custom hooks harder to type.
- **Async Integration 4**: `TaskEither` exists but bridging to React lifecycle is manual and awkward. No abort handling.
- **Suspense Support 2**: No integration. Manual promise extraction from `TaskEither`.
- **Type Inference in JSX 6**: `fold` infers well. Pipe chains have good inference. HKT encoding occasionally confuses.
- **Concurrent Mode Safety 3**: No built-in handling.
- **Server Component Compat 3**: `Either` types work in RSC (plain objects). No server action helpers.
- **Data Fetching Adapters 3**: Manual wrapping. `fp-ts-remote-data` pattern exists in community.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 6**: `Do` notation via `chain` and `bind`. Works but is verbose and less ergonomic than generators.
- **Testing Utilities 2**: No React testing utilities.
- **API Consistency 5**: Consistent within fp-ts. Different naming (`Either` vs `Result`, `fold` vs `match`).
- **Bundle Impact 5**: ~30KB for Either + Option imports. Poor tree-shaking due to HKT module structure.
- **Documentation Quality 3**: API docs are terse. Community-driven React tutorials. Library in maintenance mode — no new React guidance expected.
- **Philosophy Alignment 7**: Strictly functional. Errors always as values. But verbose style discourages adoption in React codebases.

### true-myth — DIY (62/150)

- **Pattern Matching UI 5**: `.match()` method works inline. Standalone `match` function for pipe style. Callback-based `match({ Ok, Err })` is ergonomic.
- **State Management 4**: Manual `useState`. No helpers.
- **Async Integration 4**: `Task<T, E>` provides async operations with retry strategies and combinators. But no React-specific hooks — users must bridge `Task` to React lifecycle manually. Upgraded from 2→4 for Task.
- **Suspense Support 4**: `Task<T, E>` implements `PromiseLike<Result<T, E>>` — **directly compatible with React 19's `use()` hook**. Users can pass a Task to `use()` and it resolves to a Result. No dedicated Suspense wrapper needed but no resource/preload pattern. Upgraded from 1→4.
- **Type Inference in JSX 5**: Good method-level inference. No component-level. Type-level brands via `unique symbol` prevent structural confusion.
- **Concurrent Mode Safety 2**: No handling. Task has no abort/cancel mechanism.
- **Server Component Compat 4**: `Result` values are class instances with private fields. `Task` is `PromiseLike`. Both may work with RSC serialization depending on framework. No server action helpers. Upgraded from 3→4 for PromiseLike compatibility.
- **Data Fetching Adapters 2**: No adapters.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 3**: No generators, no Do notation. Pipe-friendly standalone functions available.
- **Testing Utilities 3**: `true-myth/test-support` module provides test helpers. No React-specific utilities. Upgraded from 2→3.
- **API Consistency 5**: Consistent naming within library. Uses `Maybe` not `Option`, `variant` not `_tag`.
- **Bundle Impact 9**: 5.2KB total brotli for entire library. Per-module tree-shaking. Near-zero React overhead.
- **Documentation Quality 4**: Dedicated docs site (true-myth.js.org) with API docs. No React-specific documentation. Upgraded from 3→4 for docs site.
- **Philosophy Alignment 7**: Errors as values. Deliberate omission of `unwrap()` prevents exception promotion. But no React-specific guidance on avoiding error boundaries.

### oxide.ts — DIY (43/150)

- **Pattern Matching UI 3**: Rich `match()` with wildcards and compiled match. But library is abandoned — no TS 5.x compatibility guaranteed.
- **State Management 3**: Manual `useState`. Library abandoned.
- **Async Integration 2**: Only `safe()` wrappers. No async class.
- **Suspense Support 1**: No integration.
- **Type Inference in JSX 4**: Basic inference. Built for TS 4.6.
- **Concurrent Mode Safety 2**: No handling.
- **Server Component Compat 1**: Class instances. Library abandoned, untested with React 19 or RSC. Downgraded from 3→1.
- **Data Fetching Adapters 2**: No adapters.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 2**: No generators, no Do notation.
- **Testing Utilities 1**: No utilities.
- **API Consistency 5**: Rust-faithful naming.
- **Bundle Impact 9**: Very small (~3KB). Zero dependencies.
- **Documentation Quality 2**: README only. Stale.
- **Philosophy Alignment 5**: Errors as values but `unwrap()` is ungated.

### purify-ts — DIY (48/150)

- **Pattern Matching UI 4**: `.caseOf()` method provides pattern matching. No component.
- **State Management 4**: Manual `useState`. Class instances.
- **Async Integration 3**: `EitherAsync` exists but limited.
- **Suspense Support 1**: No integration.
- **Type Inference in JSX 5**: ADT-based, decent inference.
- **Concurrent Mode Safety 2**: No handling.
- **Server Component Compat 3**: Class instances. `instanceof` checking may break across RSC boundaries.
- **Data Fetching Adapters 2**: No adapters.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 3**: Chain-based. No generators.
- **Testing Utilities 1**: No utilities.
- **API Consistency 5**: Haskell-inspired naming.
- **Bundle Impact 7**: Moderate (~196KB unpacked). Has `@types/json-schema` dependency.
- **Documentation Quality 2**: Docs site with examples. No React docs.
- **Philosophy Alignment 5**: Errors as values. Codec validation is a strength.

### option-t — DIY (46/150)

- **Pattern Matching UI 3**: Function-based `unwrap_or_else`. No component.
- **State Management 3**: Manual `useState`. Plain objects.
- **Async Integration 2**: Per-function `_async` variants. No wrapper.
- **Suspense Support 1**: No integration.
- **Type Inference in JSX 4**: Simple types, basic inference.
- **Concurrent Mode Safety 2**: No handling.
- **Server Component Compat 3**: Plain objects — serializable across RSC boundaries. But no server action helpers.
- **Data Fetching Adapters 2**: No adapters.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 2**: Function composition only.
- **Testing Utilities 1**: No utilities.
- **API Consistency 5**: Consistent internally. Snake_case.
- **Bundle Impact 9**: Tiny bundle via granular imports.
- **Documentation Quality 2**: Sparse docs.
- **Philosophy Alignment 6**: Plain objects, functional style. No unsafe methods.

### ts-results-es — DIY (44/150)

- **Pattern Matching UI 3**: `.match()` method. No component.
- **State Management 3**: Manual `useState`. Class instances.
- **Async Integration 3**: `AsyncResult`/`AsyncOption` for async chaining. No React hooks. Upgraded from 2→3 for AsyncResult.
- **Suspense Support 1**: No integration.
- **Type Inference in JSX 4**: Basic generics.
- **Concurrent Mode Safety 2**: No handling.
- **Server Component Compat 3**: Class instances. `instanceof` checking.
- **Data Fetching Adapters 2**: No adapters. RxJS operators exist but are not React-specific.
- **Optimistic Updates 1**: No integration.
- **Composition / Do-Notation 2**: No generators.
- **Testing Utilities 1**: No utilities.
- **API Consistency 4**: Rust-inspired but some divergence.
- **Bundle Impact 8**: Small ESM bundle. Two subpath exports.
- **Documentation Quality 2**: Sphinx/ReadTheDocs. No React docs.
- **Philosophy Alignment 5**: `unwrap()` is ungated.

## Consolidated Rating Matrix

| Dimension | hex-di | neverthrow | Effect | fp-ts | true-myth | oxide.ts | purify-ts | option-t | ts-results-es |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Pattern Matching UI | 9 | 4 | 6 | 5 | 5 | 3 | 4 | 3 | 3 |
| State Management | 9 | 5 | 5 | 4 | 4 | 3 | 4 | 3 | 3 |
| Async Integration | 10 | 5 | 7 | 4 | 4 | 2 | 3 | 2 | 3 |
| Suspense Support | 9 | 2 | 5 | 2 | 4 | 1 | 1 | 1 | 1 |
| Type Inference in JSX | 10 | 6 | 7 | 6 | 5 | 4 | 5 | 4 | 4 |
| Concurrent Mode Safety | 10 | 3 | 6 | 3 | 2 | 2 | 2 | 2 | 2 |
| Server Component Compat | 9 | 3 | 4 | 3 | 4 | 1 | 3 | 3 | 3 |
| Data Fetching Adapters | 9 | 4 | 5 | 3 | 2 | 2 | 2 | 2 | 2 |
| Optimistic Updates | 8 | 1 | 3 | 1 | 1 | 1 | 1 | 1 | 1 |
| Composition / Do-Notation | 9 | 4 | 8 | 6 | 3 | 2 | 3 | 2 | 2 |
| Testing Utilities | 9 | 2 | 5 | 2 | 3 | 1 | 1 | 1 | 1 |
| API Consistency | 10 | 5 | 6 | 5 | 5 | 5 | 5 | 5 | 4 |
| Bundle Impact | 9 | 8 | 3 | 5 | 9 | 9 | 7 | 9 | 8 |
| Documentation Quality | 9 | 3 | 5 | 3 | 4 | 2 | 2 | 2 | 2 |
| Philosophy Alignment | 10 | 6 | 6 | 7 | 7 | 5 | 5 | 6 | 5 |
| **TOTAL** | **139** | **61** | **85** | **59** | **62** | **43** | **48** | **46** | **44** |

## Ranking

| Rank | Implementation | Score | Gap to #1 | React Layer Type |
|:----:|----------------|:-----:|:---------:|------------------|
| 1 | **@hex-di/result-react** | **139** | — | Official package |
| 2 | Effect | 85 | −54 | Community DIY |
| 3 | true-myth | 62 | −77 | Community DIY |
| 4 | neverthrow | 61 | −78 | Community DIY |
| 5 | fp-ts | 59 | −80 | Community DIY |
| 6 | purify-ts | 48 | −91 | Community DIY |
| 7 | option-t | 46 | −93 | Community DIY |
| 8 | ts-results-es | 44 | −95 | Community DIY |
| 9 | oxide.ts | 43 | −96 | Community DIY |

## Key Observations

### Why @hex-di/result-react leads

1. **Purpose-built** — The only standalone Result library with a dedicated, spec-driven React package. All 8 other libraries have zero official React support.
2. **Philosophy consistency** — The explicit decision to reject `ResultBoundary` ([ADR-R001](../decisions/R001-no-error-boundary.md)) keeps the "errors as values" principle intact through the React layer.
3. **Type inference** — Render props enforce exhaustiveness at compile time. No other library's React story achieves this.
4. **Modern React** — React 19 features (`useOptimistic`, `use()`, server actions) are first-class, not afterthoughts.

### Score changes since initial assessment

| Library | Previous | Current | Delta | Reason |
|---------|:--------:|:-------:|:-----:|--------|
| Effect | 96 | 85 | −11 | Confirmed no official React package. Previous score overestimated `@effect/experimental` React features. |
| neverthrow | 63 | 61 | −2 | React 19 incompatibilities confirmed and unresolved. |
| true-myth | 52 | 62 | +10 | `Task<T,E>` with `PromiseLike` enables React 19 `use()`. Dedicated docs site. Test support module. |
| oxide.ts | 45 | 43 | −2 | Confirmed abandoned. RSC compatibility untestable. |
| ts-results-es | 43 | 44 | +1 | AsyncResult adds minor async capability. |

### Where Effect stands without official React support

The previous assessment assumed `@effect/experimental` provided React hooks. Research confirms:
- No `@effect/react`, `@effect/rx`, or `@effect/rx-react` exists on npm
- The `Reactivity` module is about data cache invalidation, not React.js
- Community packages are v0.0.x stage
- Users must build custom `ManagedRuntime`-based providers and hooks

This makes Effect's React story fundamentally DIY, similar to neverthrow but with more powerful primitives (fibers, interruption, `Effect.gen`).

### Where true-myth improved

true-myth's `Task<T, E>` (Jan 2025) is a significant development:
- `PromiseLike<Result<T, E>>` enables direct use with React 19's `use()` hook
- Retry strategies (`exponential`, `linear`, `constant`) provide production-grade async
- But no AbortSignal, no generation tracking, no React lifecycle bridge means the DIY gap remains large

### Remaining gap analysis

Dimensions where `@hex-di/result-react` scores below 10:

| Dimension | Score | Gap | Reason |
|-----------|:-----:|:---:|--------|
| Pattern Matching UI | 9 | 1 | No Option-specific React component (intentional per [ADR-R005](../decisions/R005-no-option-hooks.md)). |
| State Management | 9 | 1 | Phantom type `E = never` issue with `setErr` on Ok-initialized results. |
| Suspense Support | 9 | 1 | No streaming SSR integration (framework-specific). |
| Data Fetching Adapters | 9 | 1 | No cache-hydration helpers (framework-specific). |
| Optimistic Updates | 8 | 2 | React 19 only. No rollback-to-error integration. |
| Composition / Do-Notation | 9 | 1 | Effect's fibers handle more complex concurrency. |
| Testing Utilities | 9 | 1 | No MSW integration (external dependency). |
| Bundle Impact | 9 | 1 | React peer dependency overhead. |
| Documentation Quality | 9 | 1 | No interactive playground. |
| Server Component Compat | 9 | 1 | RSC ecosystem still evolving. |

The 11-point gap from 139 to 150 breaks down as: 5 dimensions at ceiling (10/10), 8 dimensions at 9/10, and 1 dimension at 8/10 (Optimistic Updates, React 19 only).

## Strategic Summary

### Competitive position

`@hex-di/result-react` is the **only dedicated React integration package** for a standalone TypeScript Result library. The updated landscape:

- **8 of 8 competitor libraries** have zero official React support
- **Effect** was previously scored with React features it doesn't have — actual React story is DIY with `ManagedRuntime`
- **neverthrow** has confirmed React 19 Server Component incompatibilities with no fix in sight
- **true-myth**'s `Task` brings `PromiseLike` compatibility but no React hooks or components

### Biggest advantages

1. **Sole official package** — 54-point lead over the nearest competitor (Effect DIY at 85). 77+ point lead over all standalone library DIY solutions.
2. **Type-level exhaustiveness** — Render props ensure both Ok and Err branches are handled at compile time.
3. **Modern React first-class** — React 19 features are designed in, not retrofitted.
4. **Adapter strategy** — Works with TanStack Query/SWR instead of competing.

### Biggest risks

1. **Ecosystem** — No users yet. The spec is comprehensive but untested in production.
2. **React 19 dependency** — `useOptimisticResult` and `useResultTransition` require React 19 (throw at import time on React 18).
3. **Framework evolution** — RSC patterns are still stabilizing. Server Component utilities may need redesign.
4. **Effect's potential** — If Effect ships an official React package, it could close the gap quickly given its ecosystem momentum and fiber-based primitives.
