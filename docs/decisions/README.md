# Architecture Decision Records

Architecture Decision Records (ADRs) document the rationale behind significant design choices. In this monorepo, ADRs live alongside their package specifications in `spec/` rather than in `docs/`.

This page serves as a navigator to all ADR directories. The auto-generated flat index is in [index.md](./index.md).

## ADR Landscape

The monorepo contains **161 ADRs** across 12 scopes:

| Scope                                | Count | Primary Concerns                                          |
| ------------------------------------ | ----- | --------------------------------------------------------- |
| `@hex-di/guard`                      | 56    | RBAC, audit trails, GxP compliance, policy evaluation     |
| `@hex-di/result`                     | 19    | Monadic error handling, closures, brands, async           |
| SpecForge                            | 26    | Tooling architecture, agent protocols, session management |
| `@hex-di/clock`                      | 10    | Time ports, branded timestamps, caching                   |
| `@hex-di/http-client`                | 10    | Combinator composition, frozen value objects, transport   |
| `@hex-di/result-react`               | 8     | React hook integration, render props, adapter strategy    |
| `@hex-di/core`                       | 7     | Frozen ports, blame context, disposal state, capabilities |
| `@hex-di/http-client-react`          | 6     | Context providers, abort lifecycle, SSR, concurrency      |
| `@hex-di/graph`                      | 5     | Type-level topology, ASCII cycle diagrams, protocols      |
| `@hex-di/runtime`                    | 3     | Container implementation decisions                        |
| `@hex-di/result-testing`             | 3     | Vitest-only, tag discrimination, deep equality            |
| `@hex-di/guard-cedar` / `guard-rego` | 6     | Policy engine integration (WASM vs HTTP sidecar)          |

## Recent Decisions

A quick-orientation digest of notable ADRs across scopes:

| ADR                                                                                                                                | Scope         | Topic                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- |
| [ADR-CC-001](https://github.com/leaderiop/hex-di/blob/main/spec/cross-cutting/decisions/001-shared-validation-schemas.md)          | Cross-cutting | Shared validation schema strategy                       |
| [ADR-GD-056](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard/decisions/056-consumer-owned-integration-types.md)      | Guard         | Consumer libraries own integration-specific types       |
| [ADR-HC-010](https://github.com/leaderiop/hex-di/blob/main/spec/libs/http-client/decisions/010-introspection-port-architecture.md) | HTTP Client   | Introspection port architecture                         |
| [ADR-014](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/decisions/014-catch-tag-effect-elimination.md)        | Result        | catchTag / catchTags / andThenWith — Effect elimination |
| [ADR-R008](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/react/decisions/R008-no-do-notation-hook.md)         | Result-React  | No do-notation hook                                     |
| [ADR-RT-003](https://github.com/leaderiop/hex-di/blob/main/spec/packages/runtime/decisions/003-resolution-hooks-pipeline.md)       | Runtime       | Resolution hooks pipeline                               |
| [007](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/decisions/007-effect-capability-unification.md)             | Core          | Effect capability unification                           |
| [005](https://github.com/leaderiop/hex-di/blob/main/spec/packages/graph/decisions/005-multiparty-protocols.md)                     | Graph         | Multiparty protocols                                    |
| [ADR-026](https://github.com/leaderiop/hex-di/blob/main/spec/specforge/decisions/ADR-026-spec-structural-validation.md)            | SpecForge     | Spec structural validation                              |

For the full flat index, see [index.md](./index.md).

## Where to Look

Architecture knowledge is distributed across three locations:

| Location                                   | What lives there                                          |
| ------------------------------------------ | --------------------------------------------------------- |
| `spec/<package>/decisions/`                | Formal ADRs per package (linked below)                    |
| [docs/architecture.md](../architecture.md) | High-level layer diagram, dependency rules, package index |
| `packages/*/ARCHITECTURE.md`               | Per-package architecture notes (where present)            |

Start with `docs/architecture.md` for the big picture, then drill into the relevant `spec/` ADRs for design rationale.

## Core Packages

| Package           | ADRs | Location                                                                                                           |
| ----------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `@hex-di/core`    | 7    | [spec/packages/core/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/decisions/)       |
| `@hex-di/graph`   | 5    | [spec/packages/graph/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/graph/decisions/)     |
| `@hex-di/runtime` | 3    | [spec/packages/runtime/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/runtime/decisions/) |
| `@hex-di/result`  | 19   | [spec/packages/result/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/decisions/)   |

## Libraries

| Package               | ADRs | Location                                                                                                           |
| --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `@hex-di/clock`       | 10   | [spec/libs/clock/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/clock/decisions/)             |
| `@hex-di/guard`       | 56   | [spec/libs/guard/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard/decisions/)             |
| `@hex-di/guard-cedar` | 3    | [spec/libs/guard-cedar/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard-cedar/decisions/) |
| `@hex-di/guard-rego`  | 3    | [spec/libs/guard-rego/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard-rego/decisions/)   |
| `@hex-di/http-client` | 10   | [spec/libs/http-client/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/http-client/decisions/) |

## Integrations

| Package                     | ADRs | Location                                                                                                                         |
| --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@hex-di/result-react`      | 8    | [spec/packages/result/react/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/react/decisions/)     |
| `@hex-di/result-testing`    | 3    | [spec/packages/result/testing/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/testing/decisions/) |
| `@hex-di/http-client-react` | 6    | [spec/libs/http-client/react/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/libs/http-client/react/decisions/)   |

## Tooling

| Package   | ADRs | Location                                                                                             |
| --------- | ---- | ---------------------------------------------------------------------------------------------------- |
| SpecForge | 26   | [spec/specforge/decisions/](https://github.com/leaderiop/hex-di/blob/main/spec/specforge/decisions/) |

## Contributing ADRs

ADRs are added to `spec/<package>/decisions/`, not to `docs/decisions/`. Follow this workflow:

1. **Create the file** in the relevant package's decisions directory: `spec/packages/<name>/decisions/NNN-<slug>.md` (or `spec/libs/<name>/decisions/NNN-<slug>.md` for libraries)
2. **Use the standard format** — include frontmatter with `id`, `title`, `status` (Accepted / Proposed / Superseded), `date`, and a body with Context, Decision, and Consequences sections
3. **Number sequentially** — use the next available number in that package's decisions directory
4. **Regenerate the index** — run `bash scripts/generate-adr-index.sh` to update `docs/decisions/index.md`
5. **Never hand-edit** `docs/decisions/index.md` — it is auto-generated and will be overwritten

When an ADR is superseded, update the original's status to `Superseded by NNN` and link to the replacement.
