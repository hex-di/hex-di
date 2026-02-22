# Competitor Comparison

Feature matrix comparing `@hex-di/result` against TypeScript Result/Either libraries and cross-language implementations.

> **Regulatory note**: This document is **informational, not normative**. The self-assessed scores have not been independently validated and should not be cited as evidence in regulatory submissions. Organizations conducting their own technology evaluations should perform independent assessments appropriate to their risk tolerance and regulatory requirements.

**Last updated**: 2026-02-16. Data sourced from npm registry, GitHub API, and source code review.

## Package Overview

| Package | Version Assessed | Last Release | Weekly Downloads | GitHub Stars | Category |
|---------|:----------------:|:------------:|:----------------:|:------------:|----------|
| `@hex-di/result` | 0.2.0 | 2025 | Pre-release | — | Standalone Result |
| `neverthrow` | 8.2.0 | 2025-02-21 | 1,283,820 | 7,178 | Standalone Result |
| `effect` (Effect) | 3.19.17 | 2026-02-14 | 7,273,744 | 13,211 | Full framework |
| `fp-ts` | 2.16.11 | 2025-08-18 | 3,851,679 | 11,473 | FP toolkit (maintenance mode) |
| `true-myth` | 9.3.1 | 2025-11-25 | 470,565 | 1,319 | Standalone Result |
| `oxide.ts` | 1.1.0 | 2022-10-25 | 24,798 | 585 | Standalone Result (abandoned) |
| `purify-ts` | 2.1.4 | 2025-12-16 | 54,184 | 1,593 | FP toolkit |
| `option-t` | 55.1.1 | 2026-01-13 | 117,530 | 354 | Standalone Result/Option |
| `ts-results-es` | 7.0.0 | 2026-02-16 | 23,207 | 125 | Standalone Result |

### Maintenance Status Summary

| Package | Status | Notes |
|---------|--------|-------|
| `@hex-di/result` | Active | Spec-driven development, CI matrix, changesets |
| `neverthrow` | Stalled | No releases in 12 months. Issue [#670](https://github.com/supermacro/neverthrow/issues/670) questions maintenance. ESLint plugin broken. |
| `effect` | Very active | Daily patch releases, minor every 6-10 weeks. 30 packages in monorepo. |
| `fp-ts` | Maintenance mode | Superseded by Effect. Creator (Giulio Canti) joined Effect org. No new features since 2023. |
| `true-myth` | Very active | 13+ releases in 2025, nightly TS CI, 100% coverage, dedicated docs site |
| `oxide.ts` | Abandoned | No commits since Oct 2022. Built for TS 4.6, untested on 5.x. Unanswered issues. |
| `purify-ts` | Moderate | Releases in Dec 2025 (v2.1.3-v2.1.4), but pattern of build-fix releases. Single maintainer. |
| `option-t` | Active | Regular releases, but 55 major versions indicate unstable API surface. |
| `ts-results-es` | Active | Corporate backer (Lune Climate). 3 majors in 12 months. |

## Scoring Dimensions

Each dimension is rated 0-10. A score of 10 represents the theoretical best for a standalone TypeScript Result library.

| # | Dimension | What It Measures |
|---|-----------|------------------|
| 1 | Type Safety | Inference quality, phantom types, error accumulation types, narrowing |
| 2 | API Completeness | Breadth of methods/constructors vs Rust's `Result` + community expectations |
| 3 | Composability | Chaining, piping, generator support, Do notation, combinators |
| 4 | Dev Ergonomics | Learning curve, discoverability, editor support, error messages |
| 5 | Async Support | Native async wrapper, Promise integration, async combinators |
| 6 | Error Handling Patterns | Tagged errors, error groups, exhaustiveness, accumulation strategies |
| 7 | Immutability | Runtime enforcement, freeze guarantees, shallow vs deep |
| 8 | Safety Guarantees | Brand validation, forgery resistance, runtime invariants |
| 9 | Performance | Overhead per operation, allocation cost, zero-cost abstractions |
| 10 | Bundle Efficiency | Tree-shaking, subpath exports, dead code elimination |
| 11 | Interop | JSON serialization, schema standards, framework bridges |
| 12 | Documentation Quality | API docs, guides, examples, migration paths |
| 13 | Ecosystem & Adoption | npm downloads, GitHub stars, community size |
| 14 | Maintenance & CI | Release cadence, TS matrix, mutation testing, changelogs |
| 15 | Cross-Language Alignment | Faithfulness to Rust/Haskell/Kotlin Result idioms |

## TypeScript Library Ratings

| Dimension | hex-di/result | neverthrow | Effect | fp-ts | true-myth | oxide.ts | purify-ts | option-t | ts-results-es |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Type Safety | 10 | 7 | 10 | 9 | 8 | 6 | 7 | 6 | 5 |
| API Completeness | 10 | 7 | 10 | 9 | 9 | 6 | 7 | 6 | 6 |
| Composability | 10 | 8 | 10 | 9 | 9 | 5 | 7 | 8 | 5 |
| Dev Ergonomics | 9 | 8 | 5 | 4 | 8 | 6 | 6 | 4 | 7 |
| Async Support | 10 | 8 | 10 | 5 | 8 | 3 | 4 | 5 | 5 |
| Error Handling | 10 | 5 | 10 | 7 | 5 | 4 | 5 | 3 | 3 |
| Immutability | 10 | 5 | 8 | 7 | 9 | 5 | 6 | 8 | 5 |
| Safety Guarantees | 10 | 3 | 7 | 5 | 6 | 3 | 3 | 3 | 2 |
| Performance | 8 | 8 | 6 | 5 | 8 | 8 | 6 | 9 | 8 |
| Bundle Efficiency | 9 | 6 | 4 | 3 | 10 | 7 | 5 | 10 | 7 |
| Interop | 9 | 5 | 9 | 5 | 7 | 4 | 6 | 4 | 6 |
| Documentation | 9 | 7 | 9 | 5 | 9 | 4 | 6 | 4 | 5 |
| Ecosystem | 2 | 8 | 10 | 7 | 5 | 2 | 4 | 3 | 2 |
| Maintenance | 8 | 4 | 10 | 2 | 9 | 1 | 5 | 6 | 6 |
| Cross-Language | 10 | 6 | 7 | 8 | 7 | 8 | 6 | 5 | 6 |
| **Total** | **134** | **95** | **125** | **90** | **117** | **72** | **83** | **84** | **78** |

### Per-Library Justifications

#### @hex-di/result (134/150)

- **Type Safety 10**: Phantom types (`Ok<T, never>`, `Err<never, E>`), `RESULT_BRAND` unique symbol validation, full discriminated union narrowing, comprehensive inference utilities (`InferOk`, `InferErr`, `FlattenResult`, `InferOkTuple`, `InferErrUnion`, `InferOkRecord`).
- **API Completeness 10**: Full Rust `Result` parity plus TypeScript additions: `Option<T>`, `and()`/`or()`, `contains()`/`containsErr()`, `mapOr()`/`mapOrElse()`, `transpose()`, `flip()`, `merge()`, `intoTuple()`, `toJSON()`/`fromJSON()`, `toSchema()`.
- **Composability 10**: Generator-based early return (`safeTry`), Do notation (`bind`/`let_`), 7 combinators (`all`, `allSettled`, `any`, `collect`, `partition`, `forEach`, `zipOrAccumulate`), dual API (method chaining + standalone curried functions via `/fn`), `pipe()` up to 11 steps.
- **Dev Ergonomics 9**: Clear Rust-aligned naming, unsafe operations gated behind `/unsafe` subpath, structured `UnwrapError` with context, TypeScript plugin for real-time editor diagnostics. Loses 1pt: new library with limited community examples and adoption patterns.
- **Async Support 10**: Full `ResultAsync` class with brand-based `isResultAsync()`, internal promise never rejects, `fromCallback` for Node.js, `race` combinator, built-in retry with exponential backoff and AbortSignal, generation tracking.
- **Error Handling 10**: `createError(tag)` for frozen tagged errors, `createErrorGroup(namespace)` for two-level discrimination (`_namespace` + `_tag`), `assertNever`, `zipOrAccumulate` for error accumulation, `partition` for bulk processing.
- **Immutability 10**: `Object.freeze()` on every `Result`, `Option`, and `createError()` instance. Documented invariant (INV-1, INV-10). **Only TypeScript Result library with runtime immutability enforcement.**
- **Safety Guarantees 10**: `RESULT_BRAND` unique symbol prevents structural forgery, frozen instances prevent tampering, generator protocol safety (Err throws if iterated past yield point), `OPTION_BRAND` for Option. **No competitor combines brand + freeze.**
- **Performance 8**: Closure-based (no prototype), frozen objects. Minor per-instance allocation cost vs class-based approaches. No published benchmark suite yet.
- **Bundle Efficiency 9**: 9 subpath exports, granular `/fn/*` individual function imports, blocked `/internal/*`. ESM-only, zero dependencies, `sideEffects: false`. Loses 1pt vs option-t's 170 granular exports.
- **Interop 9**: `toJSON()`/`fromJSON()` with schema versioning, `toSchema()` for Standard Schema V1, `intoTuple()` for Go-style destructuring. Loses 1pt: no RxJS operators.
- **Documentation 9**: Full spec suite (20+ documents), ADRs, glossary, 21 invariants, `llms.txt` (674 lines), comprehensive README. Loses 1pt: no interactive docs site.
- **Ecosystem 2**: Published on npm with 4 packages. Pre-release adoption phase — minimal downloads and community.
- **Maintenance 8**: GitHub Actions CI, conventional commits, changesets, published releases, TypeScript 5.x support. Loses 2pts: no nightly canary, limited release history.
- **Cross-Language 10**: Faithful to Rust's `Result` API naming (`andThen`, `orElse`, `mapErr`, `flatten`, `flip`, `transpose`, `expect`). Rust developers get instant familiarity.

#### neverthrow (95/150)

- **Type Safety 7**: Good inference, `Result<T, E>` union type. No phantom types (both type params required on both variants). No brand validation. Several internal `any` casts, compiled with `strict: false`.
- **API Completeness 7**: Core methods present. Missing `flip`, `mapBoth`, `flatten`, `intoTuple`, `merge`, `contains`, `mapOr`/`mapOrElse`. No `Option` type. No `fromJSON`.
- **Composability 8**: `safeTry` generators (v8.1.0 removed need for `.safeUnwrap()`), method chaining, `combine`/`combineWithAllErrors`. `andTee`/`orTee`/`andThrough` added in v7.1-v8.2. No standalone functions, no Do notation.
- **Dev Ergonomics 8**: Simple API, easy learning curve, good naming. Most popular standalone Result library.
- **Async Support 8**: `ResultAsync` class with chaining, `fromPromise`, `fromSafePromise`, `fromThrowable`. No retry, no `race`, no `fromCallback`, no AbortSignal, no generation tracking. Known React 19 Server Component incompatibility ([#643](https://github.com/supermacro/neverthrow/issues/643)).
- **Error Handling 5**: `combineWithAllErrors` for accumulation. No tagged error factory, no error groups, no `assertNever`. `_unsafeUnwrap` is ungated.
- **Immutability 5**: `readonly` on constructor params only. No `Object.freeze()`. Internal combinators use mutable `.push()`.
- **Safety Guarantees 3**: No brand symbol — structural checking only. `_unsafeUnwrap` available without import gating. `ErrorConfig.withStackTrace` disabled by default.
- **Performance 8**: Class-based with prototype sharing. Low per-instance cost.
- **Bundle Efficiency 6**: No tree-shaking support ([#660](https://github.com/supermacro/neverthrow/issues/660)). No `sideEffects` in package.json. No subpath exports. Single entry point. CJS + ESM dual output.
- **Interop 5**: Basic serialization via structural equality. No Standard Schema, no `fromJSON`, no framework adapters.
- **Documentation 7**: Good README with examples, JSDoc. No spec-level documentation, no dedicated docs site.
- **Ecosystem 8**: 1.28M weekly downloads, 7.1K stars. Stable adoption but flat growth curve.
- **Maintenance 4**: No releases in 12 months (last: v8.2.0, Feb 2025). Community questioning maintenance status ([#670](https://github.com/supermacro/neverthrow/issues/670)). ESLint plugin broken and abandoned. Compiled with TypeScript 4.7.2. 73 open issues.
- **Cross-Language 6**: Rust-inspired but diverges on naming (`_unsafeUnwrap`, `combineWithAllErrors`, no `flip`/`flatten`).

#### Effect (125/150)

- **Type Safety 10**: Advanced type-level programming, `TypeId` unique symbol branding on `Either`/`Option`/`Exit`, full inference, `Data.TaggedError` for branded error types.
- **API Completeness 10**: Exhaustive. `Either`, `Option`, `Exit` (with `Cause`), `Effect`, `Stream`, `Schema`, `Match`, `Data`, `Micro`, and 179 subpath exports across 30 packages.
- **Composability 10**: `pipe()`, generator-based Do notation (`Effect.gen`, `Either.gen`), layers, streams, full concurrency primitives.
- **Dev Ergonomics 5**: Steep learning curve, large surface area (~2,700 files). Three type parameters (`Effect<A, E, R>`) add cognitive overhead. `Either` parameter order will flip in 4.0 (breaking change planned).
- **Async Support 10**: Fiber-based runtime with structured concurrency, cancellation, timeouts, retry with `Schedule`, `Effect.race`, `Effect.raceAll`. No `EitherAsync` — users must graduate to full `Effect<A,E,R>` for async.
- **Error Handling 10**: `Cause` tracking (failures vs defects vs interruptions), `Effect.catchTag`/`catchTags`, `Data.TaggedError`, error accumulation via `Effect.all({ mode: "validate" })`, composite `Sequential`/`Parallel` causes.
- **Immutability 8**: Convention + `TypeId` branding. `Data.struct()` creates structurally-equatable values. Controlled mutation via explicit `MutableRef`/`MutableHashMap`. No universal `Object.freeze()`.
- **Safety Guarantees 7**: `TypeId` unique symbol branding prevents forgery. But massive surface area creates more vectors for misuse. Complexity itself is a safety risk.
- **Performance 6**: Fiber runtime overhead for simple Result use cases. `fast-check` as production dependency adds footprint.
- **Bundle Efficiency 4**: 27MB unpacked. `fast-check` production dependency. `sideEffects: []` declared but importing `Either` alone still pulls shared infrastructure (~50KB+ minified).
- **Interop 9**: Standard Schema V1 integration (v3.13.0), `@effect/platform` for cross-platform, SQL/RPC/OpenTelemetry packages.
- **Documentation 9**: Comprehensive docs site with tutorials, API reference, getting-started guides.
- **Ecosystem 10**: 7.27M weekly downloads (4.7x growth in H2 2025), 13.2K stars, 30 monorepo packages, corporate adoption wave. AI ecosystem (`@effect/ai`). Largest TypeScript FP ecosystem.
- **Maintenance 10**: Daily patch releases, minor every 6-10 weeks. Full CI matrix, conventional commits. `@effect/language-service` TS plugin actively maintained (v0.74.0).
- **Cross-Language 7**: Inspired by Scala ZIO and Haskell. `Either<A, E>` uses Haskell naming (Left/Right), not Rust naming (Ok/Err).

#### fp-ts (90/150)

- **Type Safety 9**: Higher-kinded type emulation, full algebraic type classes. Strong inference within pipe chains.
- **API Completeness 9**: `Either`, `Option`, `TaskEither`, `IO`, `Reader`, full FP toolkit.
- **Composability 9**: `pipe()`, `flow()`, type class instances, extensive combinators.
- **Dev Ergonomics 4**: Steep learning curve, HKT encoding is complex, error messages are cryptic.
- **Async Support 5**: `TaskEither` exists but awkward compared to native async/await. No AbortSignal, no retry.
- **Error Handling 7**: `Either` + type classes, `Validation` applicative for error accumulation. No tagged error helpers.
- **Immutability 7**: Functional style encourages immutability, no runtime enforcement.
- **Safety Guarantees 5**: No brand validation on `Either`. `newtype-ts` companion library exists separately.
- **Performance 5**: Function call overhead from pipe chains. No runtime optimization.
- **Bundle Efficiency 3**: 4.5MB unpacked. Poor tree-shaking due to HKT encoding and module structure.
- **Interop 5**: `io-ts` for schema validation. No Standard Schema.
- **Documentation 5**: API docs exist but are terse. Community migrating to Effect.
- **Ecosystem 7**: 3.85M weekly downloads, 11.5K stars. But declining — officially superseded by Effect.
- **Maintenance 2**: Maintenance mode. Creator joined Effect org. No new features since 2023. Last release: bugfix in Aug 2025.
- **Cross-Language 8**: Faithful to Haskell type class hierarchy.

#### true-myth (117/150)

- **Type Safety 8**: Type-level branding via `declare const IsResult: unique symbol` and `declare const IsTask: unique symbol`. Full narrowing. `SomeResult<T, E>` branded helper types. No phantom types on Ok/Err.
- **API Completeness 9**: `Maybe<T>`, `Result<T, E>`, `Task<T, E>` (async). `transpose`, `flatten`, `inspect`, Standard Schema V1 integration. `Unit` type. No `Option` naming (uses `Maybe`). No `intoTuple`, no `merge`, no `fromJSON`.
- **Composability 9**: Standalone auto-curried functions + method chaining. All Task methods available as module-scope curried functions (v8.4.0). Pipe-friendly. No Do notation, no generators.
- **Dev Ergonomics 8**: Dedicated docs site (true-myth.js.org). Clear naming, test helpers (`true-myth/test-support`). Deliberate omission of `unwrap()` encourages safe patterns. Requires `moduleResolution: "Node16"`.
- **Async Support 8**: `Task<T, E>` (v8.2.0, Jan 2025) — full async monad with `fromPromise`, `tryOr`, `tryOrElse`, `safelyTry`. Collection combinators: `all`, `allSettled`, `any`, `race`. Retry via `Task.withRetries()` with delay strategies (`exponential`, `linear`, `constant`, `.jitter()`, `.take(n)`). Implements `PromiseLike<Result<T, E>>`. No AbortSignal, no generation tracking.
- **Error Handling 5**: Basic `match({ Ok, Err })` pattern. No tagged error factory, no error groups, no `assertNever`, no `zipOrAccumulate`.
- **Immutability 9**: True private fields (`#field`) prevent property access at runtime. All transformation methods return new instances. No mutating methods. No `Object.freeze()` but private fields provide strong encapsulation.
- **Safety Guarantees 6**: Type-level brand prevents structural confusion at compile time. Private fields prevent runtime property access. No `unwrap()` method by design. But brand is `declare`-only (no runtime Symbol), so no runtime forgery detection.
- **Performance 8**: 972 bytes brotli for Result module. Class-based with true private fields. Efficient.
- **Bundle Efficiency 10**: 5.2KB total brotli for entire library. Per-module tree-shaking. ESM-only. Detailed size table published in README. Gold standard for small Result libraries.
- **Interop 7**: Standard Schema V1 (v9.1.0, integrates with Zod/Valibot/ArkType). JSON round-trip support. `PromiseLike` enables React 19 `use()`. No RxJS operators.
- **Documentation 9**: Dedicated docs site (true-myth.js.org), full API docs, type-level documentation. Semantic Versioning for TypeScript Types specification.
- **Ecosystem 5**: 470K weekly downloads, 1.3K stars. Growing steadily.
- **Maintenance 9**: 13+ releases in 2025, nightly TypeScript `next` CI, 100% test coverage enforced, SemVer for types. Active maintainer (Chris Krycho) with regular commits into 2026.
- **Cross-Language 7**: Inspired by Rust and Elm. Uses `Maybe` (Haskell) not `Option` (Rust). `variant` property not `_tag`.

#### oxide.ts (72/150)

- **Type Safety 6**: Basic inference, no phantom types, no brand. Class-based without readonly enforcement.
- **API Completeness 6**: Core Rust methods. Rich pattern matching (`match()` with wildcards, chains, compiled match). `intoTuple()`. Missing async, error helpers. No `flatten` standalone.
- **Composability 5**: Method chaining only. No pipe, no generators, no Do notation.
- **Dev Ergonomics 6**: Rust-familiar API. But built for TS 4.6, untested on 5.x, stale documentation.
- **Async Support 3**: Only `Result.safe()` / `Option.safe()` wrappers for Promises. No async class.
- **Error Handling 4**: Basic `unwrap`/`expect`, no tagged error support, no accumulation.
- **Immutability 5**: No `Object.freeze()`. Class instances without readonly enforcement on private fields.
- **Safety Guarantees 3**: No brand, structural checks. `unwrap()` is ungated.
- **Performance 8**: Lightweight, minimal overhead.
- **Bundle Efficiency 7**: Two entry points (`oxide.ts` and `oxide.ts/core`). Zero dependencies.
- **Interop 4**: Minimal serialization. `intoTuple()` for Go-style.
- **Documentation 4**: README-only. No docs site, no API reference.
- **Ecosystem 2**: 24.8K weekly downloads, 585 stars. Declining.
- **Maintenance 1**: **Abandoned.** No commits since Oct 2022 (3+ years). Untested on TypeScript 5.x. Issue asking about maintenance status is unanswered.
- **Cross-Language 8**: Very faithful to Rust naming and semantics.

#### purify-ts (83/150)

- **Type Safety 7**: ADT-based, decent inference. Some type widening issues.
- **API Completeness 7**: `Either`, `Maybe`, `List`, `NonEmptyList`, `Tuple`, `EitherAsync`, `MaybeAsync`, `Codec`. `fromPredicate`/`fromGuard` added in v2.1.3.
- **Composability 7**: Method chaining, codec composition. Fantasy Land conformant. No generators, no Do notation.
- **Dev Ergonomics 6**: Class-based API, reasonable learning curve. Elm/Kotlin Arrow-inspired.
- **Async Support 4**: `EitherAsync` exists but limited. No retry, no combinators beyond basic chaining.
- **Error Handling 5**: `caseOf()` for pattern matching. No tagged error helpers, no accumulation.
- **Immutability 6**: Class instances, no `Object.freeze()`. Convention only.
- **Safety Guarantees 3**: `instanceof` checks only — breaks across realms, bundler duplicates, and SSR boundaries.
- **Performance 6**: Class overhead. Codec validation cost.
- **Bundle Efficiency 5**: 196KB unpacked. Has `@types/json-schema` dependency. Wildcard subpath exports for moderate tree-shaking.
- **Interop 6**: Built-in `Codec` module for runtime validation (competes with io-ts/zod in lighter form).
- **Documentation 6**: Docs site with examples.
- **Ecosystem 4**: 54K weekly downloads, 1.6K stars.
- **Maintenance 5**: Releases in Dec 2025 (v2.1.3-v2.1.4) but pattern of immediate build-fix releases. Single maintainer. Only 2 open issues.
- **Cross-Language 6**: Haskell-inspired naming (`Either`, `Maybe`). Some Kotlin Arrow influence.

#### option-t (84/150)

- **Type Safety 6**: Simple plain-object types (`PlainResult<T, E>` with `ok: boolean` discriminant). No phantom types.
- **API Completeness 6**: Covers basics plus 5 nullable type families (`Maybe`, `Nullable`, `Undefinable`, `PlainResult`, `ClassicOption`/`ClassicResult`). Function-based, no methods on types.
- **Composability 8**: 170 granular subpath exports enable precise imports. Per-function composition. Each function independently importable (e.g., `option-t/plain_result/map`). Pipe-friendly.
- **Dev Ergonomics 4**: Snake_case naming (Rust-faithful but unfamiliar in TS). 55 major versions indicates unstable API. Sparse documentation.
- **Async Support 5**: Per-function `_async` variants rather than async wrapper class. No retry, no combinators, no AbortSignal.
- **Error Handling 3**: No error utilities, no tagged errors, no accumulation.
- **Immutability 8**: Plain objects with functional architecture naturally discourage mutation. No mutating methods.
- **Safety Guarantees 3**: No brand, structural typing. Plain objects have no identity protection.
- **Performance 9**: Near-zero overhead, minimal allocations. Gold standard for lightweight approaches.
- **Bundle Efficiency 10**: 170 granular subpath exports — best-in-class tree-shaking. Zero dependencies, ESM-first.
- **Interop 4**: Nullable type unification across families with conversion utilities.
- **Documentation 4**: Sparse. No docs site, minimal examples.
- **Ecosystem 3**: 117K weekly downloads, 354 stars.
- **Maintenance 6**: Very actively maintained (last commit: today). But 55 major versions across the library's lifetime indicates frequent breaking changes.
- **Cross-Language 5**: Loosely Rust-inspired, snake_case naming.

#### ts-results-es (78/150)

- **Type Safety 5**: Basic generics, no phantom types, no inference utilities.
- **API Completeness 6**: `Result<T, E>`, `Option<T>`, `AsyncResult<T, E>`, `AsyncOption<T>` (new). `Option.fromNullable()`, `fromOptional()`, `fromNullish()` (v7.0.0). Static `all()`/`any()`.
- **Composability 5**: Method chaining + RxJS operators subpath. No generators, no Do notation, no standalone functions.
- **Dev Ergonomics 7**: Very simple API, easy to learn. Rust-inspired simplicity.
- **Async Support 5**: `AsyncResult`/`AsyncOption` for async chaining. Basic — no retry, no abort, no race.
- **Error Handling 3**: Basic `unwrap()`/`expect()`. No tagged error support, no accumulation.
- **Immutability 5**: Class instances. No `Object.freeze()`. Convention only.
- **Safety Guarantees 2**: `instanceof` checks only. `unwrap()` ungated.
- **Performance 8**: Lightweight class instances.
- **Bundle Efficiency 7**: ESM-first. Two subpath exports (`.` and `./rxjs-operators`). 309KB unpacked. Zero dependencies.
- **Interop 6**: **Only Result library with built-in RxJS operators** (`resultMap`, `resultSwitchMap`, `filterResultOk`, etc.). Unique differentiator.
- **Documentation 5**: Sphinx/ReadTheDocs documentation site.
- **Ecosystem 2**: 23K weekly downloads, 125 stars.
- **Maintenance 6**: Corporate backer (Lune Climate). Active releases. But 3 major versions in 12 months (v5-v7).
- **Cross-Language 6**: Rust-inspired naming and semantics.

## Cross-Language Ratings

Reference implementations from languages with native or established Result types.

| Dimension | Rust std | Kotlin Arrow | Swift Result | Scala ZIO | Haskell Either | Gleam Result | Go errors |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Type Safety | 10 | 9 | 8 | 10 | 10 | 9 | 3 |
| API Completeness | 10 | 9 | 7 | 10 | 9 | 7 | 4 |
| Composability | 10 | 9 | 6 | 10 | 10 | 8 | 2 |
| Dev Ergonomics | 8 | 7 | 9 | 5 | 4 | 9 | 8 |
| Async Support | 9 | 9 | 8 | 10 | 7 | 7 | 6 |
| Error Handling | 10 | 8 | 7 | 10 | 8 | 7 | 5 |
| Immutability | 9 | 8 | 7 | 9 | 10 | 10 | 3 |
| Safety Guarantees | 10 | 8 | 8 | 9 | 9 | 9 | 2 |
| Performance | 10 | 7 | 9 | 7 | 7 | 8 | 9 |
| Bundle Efficiency | 10 | 7 | 9 | 6 | 7 | 9 | 10 |
| Interop | 8 | 8 | 8 | 8 | 6 | 7 | 7 |
| Documentation | 10 | 8 | 9 | 8 | 7 | 8 | 9 |
| Ecosystem | 10 | 7 | 10 | 7 | 8 | 4 | 10 |
| Maintenance | 10 | 8 | 10 | 8 | 8 | 7 | 10 |
| Cross-Language | 10 | 8 | 7 | 8 | 10 | 8 | 3 |
| **Total** | **144** | **120** | **122** | **125** | **120** | **118** | **81** |

## Consolidated Score Matrix

All 16 implementations rated across 15 dimensions.

| Dimension | hex-di | neverthrow | Effect | fp-ts | true-myth | oxide.ts | purify-ts | option-t | ts-results-es | Rust | Kotlin Arrow | Swift | Scala ZIO | Haskell | Gleam | Go |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Type Safety | 10 | 7 | 10 | 9 | 8 | 6 | 7 | 6 | 5 | 10 | 9 | 8 | 10 | 10 | 9 | 3 |
| API Completeness | 10 | 7 | 10 | 9 | 9 | 6 | 7 | 6 | 6 | 10 | 9 | 7 | 10 | 9 | 7 | 4 |
| Composability | 10 | 8 | 10 | 9 | 9 | 5 | 7 | 8 | 5 | 10 | 9 | 6 | 10 | 10 | 8 | 2 |
| Dev Ergonomics | 9 | 8 | 5 | 4 | 8 | 6 | 6 | 4 | 7 | 8 | 7 | 9 | 5 | 4 | 9 | 8 |
| Async Support | 10 | 8 | 10 | 5 | 8 | 3 | 4 | 5 | 5 | 9 | 9 | 8 | 10 | 7 | 7 | 6 |
| Error Handling | 10 | 5 | 10 | 7 | 5 | 4 | 5 | 3 | 3 | 10 | 8 | 7 | 10 | 8 | 7 | 5 |
| Immutability | 10 | 5 | 8 | 7 | 9 | 5 | 6 | 8 | 5 | 9 | 8 | 7 | 9 | 10 | 10 | 3 |
| Safety Guarantees | 10 | 3 | 7 | 5 | 6 | 3 | 3 | 3 | 2 | 10 | 8 | 8 | 9 | 9 | 9 | 2 |
| Performance | 8 | 8 | 6 | 5 | 8 | 8 | 6 | 9 | 8 | 10 | 7 | 9 | 7 | 7 | 8 | 9 |
| Bundle Efficiency | 9 | 6 | 4 | 3 | 10 | 7 | 5 | 10 | 7 | 10 | 7 | 9 | 6 | 7 | 9 | 10 |
| Interop | 9 | 5 | 9 | 5 | 7 | 4 | 6 | 4 | 6 | 8 | 8 | 8 | 8 | 6 | 7 | 7 |
| Documentation | 9 | 7 | 9 | 5 | 9 | 4 | 6 | 4 | 5 | 10 | 8 | 9 | 8 | 7 | 8 | 9 |
| Ecosystem | 2 | 8 | 10 | 7 | 5 | 2 | 4 | 3 | 2 | 10 | 7 | 10 | 7 | 8 | 4 | 10 |
| Maintenance | 8 | 4 | 10 | 2 | 9 | 1 | 5 | 6 | 6 | 10 | 8 | 10 | 8 | 8 | 7 | 10 |
| Cross-Language | 10 | 6 | 7 | 8 | 7 | 8 | 6 | 5 | 6 | 10 | 8 | 7 | 8 | 10 | 8 | 3 |
| **TOTAL** | **134** | **95** | **125** | **90** | **117** | **72** | **83** | **84** | **78** | **144** | **120** | **122** | **125** | **120** | **118** | **81** |

### Ranking

| Rank | Implementation | Score | Category |
|:----:|----------------|:-----:|----------|
| 1 | Rust std | 144 | Cross-language |
| 2 | **hex-di/result** | **134** | **TypeScript** |
| 3 | Effect | 125 | TypeScript |
| 3 | Scala ZIO | 125 | Cross-language |
| 5 | Swift Result | 122 | Cross-language |
| 6 | Kotlin Arrow | 120 | Cross-language |
| 6 | Haskell Either | 120 | Cross-language |
| 8 | Gleam Result | 118 | Cross-language |
| 9 | true-myth | 117 | TypeScript |
| 10 | neverthrow | 95 | TypeScript |
| 11 | fp-ts | 90 | TypeScript |
| 12 | option-t | 84 | TypeScript |
| 13 | purify-ts | 83 | TypeScript |
| 14 | Go errors | 81 | Cross-language |
| 15 | ts-results-es | 78 | TypeScript |
| 16 | oxide.ts | 72 | TypeScript |

`hex-di/result` ranks **2nd overall** and **1st among TypeScript libraries**. The 9-point lead over Effect (134 vs 125) comes from Immutability (+2), Safety Guarantees (+3), Dev Ergonomics (+4), Performance (+2), Bundle Efficiency (+5), and Cross-Language Alignment (+3), offsetting Effect's leads in Ecosystem (−8), Maintenance (−2), and Dev Ergonomics at scale.

## Landscape Changes Since Initial Assessment

### Major shifts (2025-2026)

1. **Effect's adoption explosion**: Downloads grew 4.7x in H2 2025 (6M → 28M monthly), reaching 7.27M weekly. Now the most-downloaded TypeScript FP library. Standard Schema V1 integration and `@effect/ai` drove corporate adoption.

2. **true-myth's transformation**: Added `Task<T, E>` async monad (Jan 2025), Standard Schema support (Aug 2025), type-level branding, retry strategies, and a dedicated docs site. Score improved from 93 → 117.

3. **neverthrow's stall**: No releases in 12 months despite 1.28M weekly downloads. ESLint plugin abandoned. React 19 Server Component incompatibility unresolved. Community questioning maintenance status.

4. **fp-ts entering decline**: Officially superseded by Effect. Creator joined Effect org. Downloads still high (3.85M) but represent legacy usage.

5. **oxide.ts confirmed abandoned**: 3+ years without commits. Untested on TypeScript 5.x. Maintenance question unanswered.

6. **ts-results-es gaining features**: Added AsyncResult/AsyncOption, RxJS operators. Corporate backing from Lune Climate. But 3 major versions in 12 months signals instability.

### @hex-di/result's position improvement

The library moved from 119/150 (projected 137) to 134/150 as many previously-planned features are now implemented:

| Feature | Previous Status | Current Status |
|---------|:-:|:-:|
| Option type | Planned | Implemented |
| Do notation (`bind`/`let_`) | Planned | Implemented |
| Standalone pipe functions (`/fn`) | Planned | Implemented |
| Subpath exports (9 paths) | Planned | Implemented |
| Unsafe gating (`/unsafe`) | Planned | Implemented |
| `createErrorGroup()` | Planned | Implemented |
| `fromJSON()` / `toJSON()` | Planned | Implemented |
| Standard Schema (`toSchema()`) | Planned | Implemented |
| `zipOrAccumulate` | Planned | Implemented |
| `fromCallback` / `race` | Planned | Implemented |
| CI matrix + changesets | Planned | Implemented |

## Remaining Gap Analysis

Dimensions where `@hex-di/result` scores below 10:

| Dimension | Current | Gap | Improvement Path |
|-----------|:-------:|:---:|-----------------|
| Dev Ergonomics | 9 | 1 | Community examples, adoption patterns, migration guides |
| Performance | 8 | 2 | Published benchmark suite; selective prototype optimization if needed |
| Bundle Efficiency | 9 | 1 | More granular subpath exports (option-t has 170) |
| Interop | 9 | 1 | RxJS operators or `structuredClone` guidance |
| Documentation | 9 | 1 | Interactive docs site / playground |
| Ecosystem | 2 | 8 | Requires community adoption over time (cannot be spec'd) |
| Maintenance | 8 | 2 | Nightly canary, longer release track record |

The 16-point gap from 134 to 150 breaks down as: Ecosystem 8pts (requires adoption over time), Performance 2pts (benchmark suite needed), Maintenance 2pts (track record), and 4 dimensions each losing 1pt to platform/time constraints.

## Strategic Summary

### Strengths to preserve

1. **Type Safety + Safety Guarantees (10+10)**: The combination of phantom types, brand validation, and `Object.freeze()` is unique among all TypeScript Result libraries.
2. **Error Handling (10)**: Two-level discrimination (`createErrorGroup`), error accumulation (`zipOrAccumulate`), and compile-time exhaustiveness — no standalone competitor matches this.
3. **Cross-Language Alignment (10)**: Faithful Rust naming enables instant familiarity and reduces cognitive overhead for polyglot teams.
4. **Async Support (10)**: ResultAsync with retry, abort, race, fromCallback, and generation tracking exceeds neverthrow and true-myth's async stories.

### Competitive landscape summary

| Segment | Leader | hex-di Position |
|---------|--------|-----------------|
| Lightweight Result | true-myth (117) | Leads by 17pts. True-myth is the closest standalone competitor with strong recent improvements. |
| Full framework | Effect (125) | Leads by 9pts. Effect dominates ecosystem/maintenance but hex-di wins on ergonomics, bundle, safety. |
| Popular adoption | neverthrow (95) | Leads by 39pts on features. neverthrow's maintenance stall creates an adoption opportunity. |
| FP ecosystem | fp-ts (90) | Leads by 44pts. fp-ts is in decline. Its users are migrating to Effect. |
| Minimalist | option-t (84) | Leads by 50pts. option-t wins on tree-shaking granularity. |

### What cannot be spec'd

- **Ecosystem** requires community adoption over time. neverthrow's stall and fp-ts's decline create a window for adoption.
- **Performance** beyond 9 requires Rust-level zero-cost abstractions (not possible in JavaScript). 9 is achievable via published benchmarks.
