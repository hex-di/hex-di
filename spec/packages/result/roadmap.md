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
