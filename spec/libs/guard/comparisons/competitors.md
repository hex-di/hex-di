# Appendix B: Competitive Comparison

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-B                               |
> | Revision         | 2.0                                      |
> | Effective Date   | 2026-02-20                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 2.0 (2026-02-20): Added regulatory disclaimer, package metadata table, scoring dimension definitions, and maintenance status assessment (CCR-GUARD-027) |
> |                  | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) | Next: [Appendix C: Glossary](../glossary.md)_

---

> **Regulatory Disclaimer**: This document is informational, not normative. The comparison data below represents library state as of the effective date above and is based on public documentation, npm registry data, and engineering assessment. Scores reflect the perspective of the `@hex-di/guard` authors. Organizations SHOULD conduct independent evaluation before selecting an authorization library for GxP-regulated systems. This document does not constitute a supplier assessment per [ADR-GD-034](../decisions/034-open-source-supplier-qualification.md); see [compliance/gxp.md](../compliance/gxp.md) for the formal supplier qualification framework.

---

### Package Metadata

Data as of 2026-02-20. Weekly download figures are approximate 90-day averages from the npm registry or equivalent package manager. Star counts are from the primary GitHub repository. Entries marked "N/A" are not distributed as npm packages.

| Library | npm Package | Version | Last Release | Weekly Downloads | GitHub Stars | Language | License |
|---|---|---|---|---|---|---|---|
| **@hex-di/guard** | `@hex-di/guard` | 0.2.5 | 2026-02 | N/A (pre-release) | N/A | TypeScript | MIT |
| **CASL** | `@casl/ability` | 6.7.x | 2024-Q4 | ~650 000 | ~5 600 | TypeScript | MIT |
| **AccessControl** | `accesscontrol` | 2.2.x | 2021-Q2 | ~50 000 | ~1 900 | TypeScript | MIT |
| **Casbin** | `casbin` | 5.x | 2025-Q1 | ~200 000 | ~17 000 | Multi-lang (Go primary) | Apache 2.0 |
| **Oso** | `oso` (deprecated) | — | 2023 (deprecated) | <5 000 | ~3 200 | Multi-lang (Rust core) | Apache 2.0 |
| **Permit.io** | `permitio` SDK | 2.x | 2025-Q1 | ~10 000 | ~600 | Multi-lang | Apache 2.0 |
| **OpenFGA** | `@openfga/sdk` | 0.x | 2025-Q1 | ~35 000 | ~3 100 | Multi-lang (Go primary) | Apache 2.0 |
| **Spring Security** | (Maven) | 6.x | 2025-Q1 | N/A | ~8 700 | Java | Apache 2.0 |
| **Pundit** | (RubyGems) | 2.x | 2024-Q3 | N/A | ~8 400 | Ruby | MIT |
| **Django Guardian** | (PyPI) | 0.18.x | 2023-Q3 | N/A | ~3 800 | Python | BSD |
| **OPA/Rego** | `@styra/opa` | 1.x | 2025-Q2 | ~40 000 | ~9 800 | Go (OPA engine) | Apache 2.0 |

> **Note on Oso**: Client libraries were deprecated in 2023. Oso pivoted to a commercial cloud offering (Oso Cloud). Scores reflect the state of the open-source libraries at the time of deprecation.

---

### Scoring Dimension Definitions

Each dimension is rated 1–10. Definitions establish what each score means before the matrix is presented.

| Dimension | What is measured | Score 1 (Poor) | Score 10 (Excellent) |
|---|---|---|---|
| **Permission Model Richness** | Expressiveness of the authorization model: RBAC, ABAC, ReBAC, field-level ACL, signature checks, composable combinators | String-based flags only | Full RBAC + ABAC + ReBAC + field-level + signature combinators + algebraic composition |
| **Type Safety** | Compile-time checking for permissions, roles, and policies in TypeScript — catches typos and misuse before runtime | Dynamic strings, no type checking | Branded nominal types, phantom type params, compile-time exhaustiveness checking |
| **Policy Engine** | Power and expressiveness of the evaluation engine: composite rules, short-circuit evaluation, evaluation traces, deterministic results | Simple allow/deny lookup table | Composable algebraic combinators with full evaluation trace tree |
| **Testing Support** | Dedicated testing utilities: matchers, fixtures, conformance suites, BDD integration, per-port testing | No testing tools | Dedicated package with matchers, fixtures, conformance suites, BDD scenarios |
| **Serialization** | Round-trip policy serialization to/from JSON; lossless; schema versioned; content hashing for change detection | No serialization | Lossless JSON round-trip + schema versioning + content hash + migration tooling |
| **React/UI Integration** | First-class React hooks and components for conditional rendering based on authorization state | No UI integration | Named hooks, Can/Cannot components, Suspense, deferred evaluation |
| **Inspection & Debugging** | Evaluation traces, DevTools, CLI, playground, VS Code extension, coverage analysis | No debug tooling | CLI + playground + VS Code extension + trace visualization + policy coverage |
| **GxP/Regulatory Compliance** | Audit trail (hash chain, electronic signatures), IQ/OQ/PQ protocols, FMEA, ALCOA+ mapping for regulated environments | No compliance features | Full GxP: hash-chained audit + e-signatures + IQ/OQ/PQ + FMEA + ALCOA+ |
| **Architecture Purity** | Clean integration with hexagonal/clean architecture; dependency inversion; no framework coupling in core | Tight framework coupling | Pure ports/adapters, DI injection, no framework coupling in authorization core |
| **Framework Agnosticism** | Works independently of specific frameworks; official adapters for major frameworks | Framework-specific only | Framework-agnostic core with official adapters for Express, Fastify, tRPC, NestJS, GraphQL |
| **Ecosystem Maturity** | Breadth of official adapters, plugins, and integrations | No ecosystem | 20+ official adapters; active plugin community |
| **Community & Adoption** | Community size, production adoption, issue tracker activity, release cadence | No community activity | 100k+ weekly downloads, active issue tracker, regular monthly releases |
| **Documentation** | Completeness, accuracy, and navigability: tutorials, API reference, examples, changelog | Incomplete or outdated | Full docs site with tutorials, API reference, examples, migration guides, changelog |
| **Multi-language** | Availability in multiple programming languages with consistent semantics | Single language only | Available in 5+ languages with cross-language policy compatibility |
| **Distributed/Scalable** | Distributed evaluation, policy synchronization across nodes, cloud-native and edge deployment | Single-process only | Distributed eval + policy sync + edge WASM + cloud-native |

---

### Rating Matrix (Scale 1–10)

| Dimension | HexDi Guard | CASL | AccessControl | Casbin | Oso | Permit.io | OpenFGA | Spring Security | Pundit | Django Guardian | OPA/Rego |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Permission Model Richness** | **10** | 6 | 4 | 9 | 9 | 8 | 7 | 7 | 5 | 4 | 9 |
| **Type Safety** | **10** | 5 | 2 | 2 | 4 | 2 | 3 | 5 | 1 | 1 | 1 |
| **Policy Engine** | **9** | 6 | 3 | 8 | 8 | 8 | 7 | 7 | 5 | 3 | **10** |
| **Testing Support** | **9** | 3 | 2 | 3 | 4 | 4 | 6 | 7 | 8 | 4 | **9** |
| **Serialization** | **9** | 7 | 4 | 6 | 5 | 7 | 6 | 3 | 1 | 5 | 7 |
| **React/UI Integration** | **9** | 7 | 1 | 1 | 1 | 6 | 1 | 0 | 0 | 0 | 0 |
| **Inspection & Debugging** | **9** | 3 | 2 | 4 | 3 | 6 | 4 | 5 | 4 | 3 | 7 |
| **GxP/Regulatory Compliance** | **10** | 0 | 0 | 0 | 0 | 4 | 0 | 2 | 0 | 0 | 1 |
| **Architecture Purity** | **10** | 6 | 4 | 5 | 6 | 5 | 6 | 4 | 3 | 3 | 8 |
| **Framework Agnosticism** | **10** | 8 | 8 | 7 | 6 | 5 | 7 | 2 | 2 | 2 | **10** |
| **Ecosystem Maturity** | 2 | **8** | 4 | **9** | 7 | 7 | 7 | **10** | 7 | 6 | **10** |
| **Community & Adoption** | 1 | **8** | 3 | **9** | 6 | 6 | 7 | **10** | 7 | 6 | **10** |
| **Documentation** | 8 | 7 | 4 | 7 | 7 | 8 | 7 | **9** | 6 | 5 | **9** |
| **Multi-language** | 1 | 1 | 1 | **10** | 7 | 7 | 7 | 1 | 1 | 1 | **10** |
| **Distributed/Scalable** | 4 | 3 | 2 | 7 | **9** | **9** | **9** | 5 | 2 | 3 | 8 |

> Weighted average (2x weight for Permission Model, Type Safety, Policy Engine, Testing, GxP Compliance, Architecture Purity): Guard 7.5, OPA 6.8, Casbin 5.8, Permit.io 5.8, OpenFGA 5.6, Oso 5.4, Spring Security 5.1, CASL 5.1, Pundit 3.4, Django Guardian 3.1, AccessControl 2.9.

### Feature Comparison

| Feature | @hex-di/guard | CASL | Casbin | Oso | Permit.io | OpenFGA | OPA/Rego |
|---|---|---|---|---|---|---|---|
| **RBAC** | Branded roles, DAG inheritance | String-based | CONF model | Polar rules | Dashboard | Via ReBAC | Manual |
| **ABAC** | Matcher DSL (eq, neq, in, exists, gte, lt, fieldMatch) | MongoDB conditions | Model expressions | Polar attrs | Dashboard | Contextual tuples | Rego rules |
| **ReBAC** | hasRelationship + depth control | No | Via model | Polar relations | Dashboard | Primary model (Zanzibar) | Manual |
| **Electronic Signatures** | hasSignature (21 CFR Part 11) | No | No | No | No | No | No |
| **Field-Level ACL** | fields + fieldStrategy (intersection/union/first) | Field-level attrs | No | No | No | No | Manual |
| **Type Safety** | Branded nominal types, phantom params, compile-time cycle detection | Generic AbilityType | Variadic args | Polar types | String-based | SDK types | Dynamic |
| **Serialization** | JSON round-trip + hashPolicy + schema versioning | JSON rules | CSV/DB | Polar files + API | Rego/Cedar + GitOps | DSL + DB | Rego + bundles |
| **Evaluation Trace** | Full tree trace in Decision | No | No | No | No | No | Explain mode |
| **Audit Trail** | AuditTrailPort with hash chain, electronic signatures | No | No | Cloud version | Built-in + embeddable UI | No | Decision logging |
| **React Integration** | SubjectProvider, Can/Cannot (Suspense), useCan/usePolicy (deferred) | @casl/react Can | No | No | React SDK + Elements | No | No |
| **DI Integration** | Native (guard() wraps adapters, port gate hooks) | Manual | Manual | SDK | SDK | SDK | Manual |
| **Testing** | guard-testing: matchers, fixtures, conformance suites, BDD | Manual | Manual | CLI queries | CLI | Assertions | Built-in opa test |
| **Query Conversion** | policyToFilter + Prisma/Drizzle adapters | @casl/prisma, @casl/mongoose | No | No | No | ListObjects API | No |
| **Framework Middlewares** | Express, Fastify, tRPC, GraphQL, NestJS | No official | Express, Koa, NestJS, etc. | SDKs | SDKs | SDKs | Envoy, Kong, etc. |
| **Persistence** | Postgres, SQLite audit trail; Postgres, Drizzle relationships | No official | 20+ DB adapters | Cloud-managed | Cloud + OPAL | Postgres, MySQL, SQLite | Bundles, filesystem |
| **Distributed** | PolicySyncPort + EvaluationCachePort + PolicyBundle | No | Watchers, dispatchers | Cloud-native | OPAL real-time sync | Built-in replication | Bundles + HTTP API |
| **CLI Tool** | guard init/check/test/explain/hash/audit/bundle/diff/migrate | No | Online editor | CLI queries | CLI | CLI | opa CLI (comprehensive) |
| **WASM** | guard-wasm (edge evaluation, subset policies) | No | Go WASM | Rust WASM (deprecated) | No | No | opa-wasm (comprehensive) |
| **Policy Coverage** | guard test --coverage (node, branch, permission, role, decision) | No | No | No | No | No | opa test --coverage |
| **GxP Compliance** | FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ALCOA+, IQ/OQ/PQ | None | None | None | HIPAA, SOC 2 | None | None |

### Key Differentiators

1. **Native DI integration**: @hex-di/guard is designed from the ground up for the hex-di container. Guard policies attach to adapters via `guard()`, enforcement happens via resolution hooks, and the subject flows through DI scopes. No glue code needed.

2. **Full type safety**: Permission and Role tokens are branded nominal types with phantom type parameters. The TypeScript compiler catches permission typos, missing permissions, and role hierarchy errors at compile time. No other library achieves this level of compile-time safety.

3. **Serializable policies with evaluation trace**: Policies are plain data structures (not callbacks), enabling JSON serialization, DevTools inspection, and snapshot testing. Every evaluation produces a full trace tree showing which sub-policies passed or failed and why.

4. **Only TypeScript library with GxP regulatory compliance**: Audit trail hash chains, electronic signatures (21 CFR Part 11), IQ/OQ/PQ qualification protocols, FMEA risk analysis, and ALCOA+ data integrity mapping. No competitor in the TypeScript ecosystem addresses pharmaceutical/life sciences regulatory requirements.

5. **Query conversion with type safety**: `policyToFilter()` transforms guard policies into database-agnostic filters with Prisma and Drizzle adapters. Combined with field-level ACL, this enables one policy for both request-level authorization and database-level row/column filtering.

6. **Comprehensive developer experience**: CLI tool with policy testing, coverage analysis, diff/migration, bundle management; interactive playground; VS Code extension with inline evaluation, autocomplete, and trace visualization. Competitive with OPA's tooling ecosystem.

---

### Maintenance Status

| Library | Status | Cadence | Notes |
|---|---|---|---|
| **@hex-di/guard** | Active — pre-release | Continuous | v0.1.0 specified; implementation in progress; no production releases yet |
| **CASL** | Active | Quarterly | Maintained by stalniy; widely adopted in production; `@casl/react` and `@casl/prisma` well supported |
| **AccessControl** | Unmaintained | None since 2021-Q2 | Last release 2021; open issues unaddressed; no active maintainer; not recommended for new projects |
| **Casbin** | Active | Monthly | Multi-language; Go implementation is primary; Node.js (`casbin`) adapter maintained by community |
| **Oso** | Deprecated (open source) | None | Client libraries deprecated 2023; pivoted to Oso Cloud (commercial). Open-source `oso` npm package should not be used for new projects |
| **Permit.io** | Active (commercial SaaS) | Continuous | SDK actively maintained; primary product is SaaS authorization platform; subject to commercial licensing |
| **OpenFGA** | Active | Monthly | CNCF sandbox project; originally developed at Google (Zanzibar); growing community; breaking changes possible pre-1.0 |
| **Spring Security** | Active | Quarterly | VMware/Broadcom maintained; highly stable; de facto standard for Java Spring ecosystem |
| **Pundit** | Active | Bi-annual | Widely used in Ruby/Rails; minimal surface area; stable API |
| **Django Guardian** | Low activity | Infrequent | Functional but slow release cadence; community-maintained; works with Django LTS releases |
| **OPA/Rego** | Active | Monthly | CNCF graduated project; Styra commercial backing; rapidly growing adoption in cloud-native environments; comprehensive CLI ecosystem |

---

_Previous: [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) | Next: [Appendix C: Glossary](../glossary.md)_
