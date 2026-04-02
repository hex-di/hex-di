# Spec Map

HexDI documentation lives in two directories with different audiences and purposes.

## `docs/` vs `spec/`

|              | `docs/`                                    | `spec/`                                                   |
| ------------ | ------------------------------------------ | --------------------------------------------------------- |
| **Audience** | Users, integrators                         | Contributors, AI agents, auditors                         |
| **Purpose**  | How to _use_ the framework                 | How the framework _works_ internally                      |
| **Content**  | Guides, tutorials, API reference, patterns | Behavioral contracts, ADRs, invariants, type-system specs |
| **Style**    | Task-oriented, example-heavy               | Contract-oriented, cross-referenced with IDs              |

## Tiered Reading Guide

Pick the tier that matches your role — each tier builds on the previous one.

### User / Consumer

1. **[docs/README.md](./README.md)** — Get the big picture: packages, architecture, ecosystem
2. **[docs/getting-started/](./getting-started/README.md)** — Installation, core concepts, first application, lifetimes
3. **[docs/guides/](./guides/)** — React integration, error handling, testing strategies
4. **[docs/patterns/](./patterns/)** — Composing graphs, scoped services, finalizers, project structure

### Contributor / AI Agent

5. **[docs/architecture.md](./architecture.md)** — Layer diagram and dependency boundaries
6. **Pick a spec** — Read the `overview.md` for the package you will work on (see table below)
7. **Behaviors and decisions** — Dive into `behaviors/` and `decisions/` for the contracts that govern that package

### Auditor / Compliance

8. **[spec/cross-cutting/gxp/](https://github.com/leaderiop/hex-di/blob/main/spec/cross-cutting/gxp/)** — GxP regulatory evidence and ALCOA+ mapping
9. **Per-package `compliance/`** — GAMP 5 classification, FMEA summaries, qualification protocols

## Spec Directory Contents

Each spec under `spec/packages/` or `spec/libs/` may contain:

| Document Type | File / Directory                 | What It Describes                                       |
| ------------- | -------------------------------- | ------------------------------------------------------- |
| Overview      | `overview.md`                    | Mission, API surface, module map                        |
| Glossary      | `glossary.md`                    | Domain terminology ([centralized index](./glossary.md)) |
| Behaviors     | `behaviors/`                     | Numbered behavioral contracts (`BEH-XX-NNN`)            |
| Decisions     | `decisions/`                     | Architecture Decision Records (`ADR-NNN`)               |
| Invariants    | `invariants/` or `invariants.md` | Runtime guarantees (`INV-XX-N`)                         |
| Type System   | `type-system/`                   | Phantom brands, structural safety patterns              |
| Roadmap       | `roadmap/` or `roadmap.md`       | Enhancement tiers and future work                       |
| Process       | `process/`                       | CI/CD procedures, definitions of done                   |
| Compliance    | `compliance/`                    | GxP regulatory evidence (where applicable)              |

## Spec Index

**Core packages:**

| Package          | Spec Root                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `@hex-di/core`   | [`spec/packages/core/`](https://github.com/leaderiop/hex-di/blob/main/spec/packages/core/overview.md)     |
| `@hex-di/graph`  | [`spec/packages/graph/`](https://github.com/leaderiop/hex-di/blob/main/spec/packages/graph/overview.md)   |
| `@hex-di/result` | [`spec/packages/result/`](https://github.com/leaderiop/hex-di/blob/main/spec/packages/result/overview.md) |

**Libraries:**

| Library               | Spec Root                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@hex-di/guard`       | [`spec/libs/guard/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/guard/overview.md)             |
| `@hex-di/clock`       | [`spec/libs/clock/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/clock/overview.md)             |
| `@hex-di/http-client` | [`spec/libs/http-client/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/http-client/overview.md) |
| `@hex-di/logger`      | [`spec/libs/logger/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/logger/overview.md)           |
| `@hex-di/query`       | [`spec/libs/query/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/query/overview.md)             |
| `@hex-di/store`       | [`spec/libs/store/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/store/overview.md)             |
| `@hex-di/flow`        | [`spec/libs/flow/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/flow/overview.md)               |
| `@hex-di/saga`        | [`spec/libs/saga/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/saga/overview.md)               |
| `@hex-di/tracing`     | [`spec/libs/tracing/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/tracing/overview.md)         |
| `@hex-di/crypto`      | [`spec/libs/crypto/`](https://github.com/leaderiop/hex-di/blob/main/spec/libs/crypto/overview.md)           |

**Cross-cutting:**

| Spec                 | Path                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GxP Compliance       | [`spec/cross-cutting/gxp/`](https://github.com/leaderiop/hex-di/blob/main/spec/cross-cutting/gxp/)                 |
| Integration Patterns | [`spec/cross-cutting/integration/`](https://github.com/leaderiop/hex-di/blob/main/spec/cross-cutting/integration/) |
| Research             | [`spec/research/`](https://github.com/leaderiop/hex-di/blob/main/spec/research/)                                   |
| SpecForge            | [`spec/specforge/`](https://github.com/leaderiop/hex-di/blob/main/spec/specforge/overview.md)                      |
