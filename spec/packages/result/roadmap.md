# Roadmap

Planned future additions to the `@hex-di/result` specification. Each item describes scope and rationale. These are **not** part of the current spec — they will be developed as separate documents.

## GxP Compliance

**Status**: Specified.

**Deliverable**: [spec/result/compliance/gxp.md](compliance/gxp.md)

## Definitions of Done

**Status**: Specified.

**Deliverable**: [spec/result/process/definitions-of-done.md](process/definitions-of-done.md)

## Test Strategy

**Status**: Specified.

**Deliverable**: [spec/result/process/test-strategy.md](process/test-strategy.md)

## Competitor Comparisons

**Status**: Specified.

**Deliverable**: [spec/result/comparisons/competitors.md](comparisons/competitors.md)

## ESLint Plugin

**Scope**: A dedicated ESLint plugin (`eslint-plugin-hex-result`) with rules for enforcing safe Result usage patterns.

**Rules**:

- `must-use-result` — Warn when a `Result`-returning function call is not consumed (assigned, returned, or passed). Prevents accidentally ignoring errors.
- `no-unsafe-import` — Error when importing from `@hex-di/result/unsafe` in production code (configurable by file pattern). Complements the subpath gating from [ADR-010](decisions/010-unsafe-subpath.md).
- `prefer-match` — Suggest `match()` over manual `_tag` checks when all branches return the same type.

**Rationale**: Static analysis catches error handling mistakes that the type system alone cannot prevent (e.g., unused Result values).

**Deliverable**: `eslint-plugin-hex-result` (separate package, spec TBD)

## toJSON Schema Versioning

**Status**: Specified (v1.0.0).

**Scope**: The `toJSON()` output for all Result and Option types embeds a `_schemaVersion` field natively, enabling long-term archive compatibility without consumer-side schema versioning envelopes.

**Deliverable**: `toJSON()` output includes `_schemaVersion: 1` for all variants: `{ "_tag": "Ok", "_schemaVersion": 1, "value": T }`, `{ "_tag": "Err", "_schemaVersion": 1, "error": E }`, `{ "_tag": "Some", "_schemaVersion": 1, "value": T }`, `{ "_tag": "None", "_schemaVersion": 1 }`. `fromJSON()` and `fromOptionJSON()` accept both the legacy (no `_schemaVersion`) and versioned formats.

**Rationale**: GxP data retention requirements (see [compliance/gxp.md Data Retention Guidance](compliance/gxp.md#data-retention-guidance)) mandate that serialized Results remain deserializable for the applicable retention period (up to 15 years for clinical trial data). Embedding the schema version natively eliminates reliance on consumer-side envelopes and simplifies migration verification procedures.

## Option Serialization

**Status**: Specified (v1.0.0).

**Scope**: The `Option<T>` type provides native `toJSON()` methods on `Some` and `None` instances, and a standalone `fromOptionJSON()` function for deserialization. This resolves DRR-4 (Option serialization gap) and RR-5 (residual risk).

**Deliverable**: `some(value).toJSON()` returns `{ "_tag": "Some", "_schemaVersion": 1, "value": T }`. `none().toJSON()` returns `{ "_tag": "None", "_schemaVersion": 1 }`. `fromOptionJSON(json)` accepts both versioned and legacy formats and returns a branded, frozen `Option`.

**Rationale**: GxP consumers previously had to wrap Options in Results for data retention (DRR-4). Native serialization provides direct ALCOA+ "Enduring" and "Available" support for Option values without the indirection of Result wrapping.

## Training Self-Assessment

**Status**: Specified (v1.0.0 release blocker).

**Scope**: Library maintainers complete a self-assessment against the [Sample Assessment Questionnaire](compliance/gxp.md#sample-assessment-questionnaire) to verify that the GxP training templates are executable and that the questions accurately reflect the library's behavior.

**Deliverable**: Self-assessment outcome recorded in the [Review History](process/ci-maintenance.md#review-history), including: date, assessor, per-question pass/fail, and any corrections made to the questionnaire.

**Rationale**: The training templates in [compliance/gxp.md Training Guidance](compliance/gxp.md#training-guidance) are consumer-facing. If the questions are ambiguous or answers are incorrect, GxP consumers will discover this during their own training programs — undermining confidence in the library's compliance documentation. A maintainer self-assessment validates the templates before consumers rely on them.

## Independent Risk Assessment Review

**Status**: Specified (v1.0.0 release blocker).

**Scope**: An independent QA reviewer (no authorship of assessed invariants) reviews all 14 invariant risk classifications in [compliance/gxp.md Risk Assessment](compliance/gxp.md#risk-assessment-methodology).

**Deliverable**: Completed [Independent Review Sign-Off](compliance/gxp.md#independent-review-sign-off) block in the compliance document, merged via PR before the v1.0 release tag.

**Rationale**: ICH Q9 §5 requires that risk assessments are proportionate and unbiased. An independent review mitigates assessor familiarity bias.

## Documentation Site

**Scope**: A documentation website providing comprehensive guides and API reference.

**Covers**:

- **Migration guides** — Step-by-step migration paths from `neverthrow`, `fp-ts` `Either`, and Effect `Exit`/`Either` to `@hex-di/result`
- **API reference** — Auto-generated from TypeScript declarations with JSDoc annotations
- **Interactive examples** — Runnable TypeScript Playground links for each API method
- **Cookbook** — Common patterns (form validation, API error handling, database queries, etc.)
- **Architecture guide** — How the library is built, ADR summaries, design philosophy deep-dives

**Rationale**: Documentation quality is a major adoption driver. Migration guides lower the switching cost from competitor libraries.

**Deliverable**: Documentation site (framework TBD — likely Docusaurus or Astro Starlight)

## CI & Maintenance

**Status**: Specified.

**Deliverable**: [spec/result/process/ci-maintenance.md](process/ci-maintenance.md)

## Performance Benchmarks

**Status**: Specified.

**Deliverable**: [spec/result/behaviors/14-benchmarks.md](behaviors/14-benchmarks.md), [spec/result/decisions/013-performance-strategy.md](decisions/013-performance-strategy.md)

## Effect-Based Error Handling (Tier 1)

**Status**: Specified.

**Scope**: Per-tag error elimination via `catchTag`, `catchTags`, and `andThenWith`. Enables selective error recovery with type-safe narrowing using `Extract`/`Exclude` on the `_tag` discriminant.

**Deliverable**: [spec/result/behaviors/15-effect-error-handling.md](behaviors/15-effect-error-handling.md), [spec/result/decisions/014-catch-tag-effect-elimination.md](decisions/014-catch-tag-effect-elimination.md), [spec/research/RES-01-type-and-effect-systems.md](../../research/RES-01-type-and-effect-systems.md)

## Adapter Error Handlers (Tier 2)

**Status**: Accepted.

**Scope**: `adapterOrHandle(adapter, handlers)` utility in `@hex-di/core` for handling adapter construction errors at the composition boundary with tag-selective error recovery and type-safe error narrowing.

**Deliverable**: [spec/result/decisions/015-adapter-or-handle.md](decisions/015-adapter-or-handle.md)

## Type-Level Error Utilities (Tier 3)

**Status**: Specified.

**Scope**: Type-level utilities for working with tagged error unions: `TaggedError<Tag, Fields>` for branded error type construction, `TagsOf`, `HasTag`, `ErrorByTag`, `RemoveTag`, `RemoveTags` for error row operations, and `ExhaustiveHandlerMap<E, T>` for compile-time verification that all error tags are handled. All pure types — zero runtime cost.

**Deliverable**: [spec/result/type-system/error-row.md](type-system/error-row.md)

## Property-Based Monad Law Testing (Tier 1)

**Status**: Specified.

**Scope**: Property-based tests using `fast-check` to verify monad, functor, and combinator laws for `Result`, `ResultAsync`, and `Option`. Covers left identity, right identity, associativity, functor identity, and functor composition.

**Deliverable**: [behaviors/16-property-based-laws.md](behaviors/16-property-based-laws.md), [decisions/016-property-based-monad-laws.md](decisions/016-property-based-monad-laws.md)

**Research**: [RES-07 (Category Theory)](../../research/RES-07-category-theory-composition.md)

**Invariants**: [INV-17](invariants.md#inv-17-monad-left-identity), [INV-18](invariants.md#inv-18-monad-right-identity), [INV-19](invariants.md#inv-19-monad-associativity)

## Higher-Order Effect Handlers (Tier 3)

**Status**: Specified.

**Scope**: Composable, first-class effect handlers. `composeHandlers()` combines handlers into reusable error recovery pipelines. Handler composition forms a monoid (associative with identity element).

**Deliverable**: [behaviors/17-higher-order-effects.md](behaviors/17-higher-order-effects.md), [decisions/017-higher-order-effect-handlers.md](decisions/017-higher-order-effect-handlers.md)

**Research**: [RES-01 (Type & Effect Systems)](../../research/RES-01-type-and-effect-systems.md), [RES-07 (Category Theory)](../../research/RES-07-category-theory-composition.md)

## Effect Contracts (Tier 3)

**Status**: Specified.

**Scope**: Type-level function contracts (`EffectContract<In, Out, Effects>`) declaring the effects a function may produce. `SatisfiesContract<Fn, Contract>` verifies implementations at compile time. Contract composition tracks effect accumulation through function pipelines.

**Deliverable**: [behaviors/18-effect-contracts.md](behaviors/18-effect-contracts.md), [decisions/018-effect-contracts.md](decisions/018-effect-contracts.md), [type-system/effect-polymorphism.md](type-system/effect-polymorphism.md)

**Research**: [RES-01 (Type & Effect Systems)](../../research/RES-01-type-and-effect-systems.md)

## Cross-Package Specifications

The following packages also have specification documents:

- **@hex-di/core**: [spec/packages/core/roadmap.md](../core/roadmap.md) — Port freezing, blame contexts, phantom disposal types, capability analysis, protocol state machines
- **@hex-di/graph**: [spec/packages/graph/roadmap.md](../graph/roadmap.md) — Operation completeness, cycle diagnostics, composition laws, effect propagation

## RxJS Companion Package

**Scope**: A companion package `@hex-di/result-rxjs` providing RxJS operators for working with `Observable<Result<T, E>>`.

**Operators**:

- `mapResult(f)` — Map Ok values in an Observable stream
- `filterOk()` — Filter and unwrap only Ok values
- `filterErr()` — Filter and unwrap only Err values
- `switchMapResult(f)` — FlatMap with Result-returning functions
- `catchToResult(mapErr)` — Convert Observable errors to Err values

**Rationale**: RxJS is widely used in Angular and reactive architectures. A dedicated companion package avoids adding RxJS as a dependency of the core library.

**Deliverable**: `@hex-di/result-rxjs` (separate package, spec TBD)
