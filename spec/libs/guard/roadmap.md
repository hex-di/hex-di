# Roadmap

> **Document Control**
>
> | Property         | Value                                                                                                                                                      |
> |------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
> | Document ID      | GUARD-RMP                                                                                                                                                  |
> | Revision         | 3.1                                                                                                                                                        |
> | Effective Date   | 2026-02-20                                                                                                                                                 |
> | Author           | HexDI Engineering                                                                                                                                          |
> | Reviewer         | Technical Lead                                                                                                                                             |
> | Approved By      | Technical Lead                                                                                                                                             |
> | Classification   | Implementation Task List                                                                                                                                   |
> | Change History   | 3.1 (2026-02-20): Corrected v0.1.0 test estimate from ~1035 to 1294 tests per final DoD 1–29 count (CCR-GUARD-045) |
> |                  | 3.0 (2026-02-20): Converted Document Control to visible blockquote format; added `@hex-di/guard-validation` to Core Authorization packages; expanded Core Authorization Deliverable to reference all 4 packages and both DoD documents (CCR-GUARD-037) |
> |                  | 2.0 (2026-02-20): Added per-item Status/Scope/Deliverable structure and status summary table (CCR-GUARD-027)                                               |
> |                  | 1.0 (2026-02-17): Initial draft consolidated from README.md Release Scope (CCR-GUARD-018)                                                                  |

## Status Summary

| # | Feature | Status | Spec Sections | Packages |
|---|---------|--------|--------------|----------|
| 1 | Core Authorization | Specified | §1–73 | `@hex-di/guard`, `@hex-di/guard-testing`, `@hex-di/guard-validation`, `integrations/react-guard` |
| 2 | Distributed Evaluation | Specified | §74 | `guard-sync-redis`, `guard-sync-nats`, `guard-cache-redis`, `guard-cache-memory` |
| 3 | Framework Middleware Adapters | Specified | §75 | `guard-express`, `guard-fastify`, `guard-trpc`, `guard-graphql`, `guard-nestjs` |
| 4 | Persistence Adapters | Specified | §76 | `guard-audit-postgres`, `guard-audit-sqlite`, `guard-relationships-postgres`, `guard-relationships-drizzle` |
| 5 | Query Conversion | Specified | §77 | `guard-prisma`, `guard-drizzle` |
| 6 | WASM Compilation | Specified | §78 | `guard-wasm` |
| 7 | CLI Tool | Specified | §79 | `guard-cli` |
| 8 | Policy Playground | Specified | §80 | `guard-playground` |
| 9 | VS Code Extension | Specified | §81 | `hex-di-guard-vscode` |
| 10 | Policy Coverage Analysis | Specified | §82 | `guard-coverage` (ships in CLI) |
| 11 | Policy Diff & Migration | Specified | §83 | `guard-diff` (ships in CLI) |

---

## Version History

| Version | Status | Scope |
|---------|--------|-------|
| 0.1.0 | Specified | Full library: core authorization (§1–73), ecosystem extensions (§74–78), developer experience (§79–83), Appendices A–V, DoD 1–29. 1294 tests, 56 ADRs, 36 FMEA failure modes, 39 STRIDE threats, 23 packages, 35 integration test scenarios. |

---

## Core Authorization (§1–73)

**Status**: Specified

**Scope**: Complete authorization core covering: permission tokens (branded nominal types, `PermissionRegistry`, dedup detection), role tokens (DAG inheritance, cycle detection via `flattenPermissions()`), 10 policy kinds (`hasPermission`, `hasRole`, `hasAttribute`, `hasResourceAttribute`, `hasSignature`, `hasRelationship`, `allOf`, `anyOf`, `not`, `labeled`), policy evaluation engine with full trace tree, subject provider (scoped, immutable, frozen), `guard()` adapter wrapper, port gate hook (`useGuardPortGate`), JSON serialization (schema versioning, `hashPolicy`, lossless round-trip), cross-library integration (Logger/Tracing/Clock ports), React integration (SubjectProvider, Can/Cannot, `useCan`, `usePolicy`, `usePolicies`, `usePoliciesDeferred`), inspection (LibraryInspector bridge), testing infrastructure (`@hex-di/guard-testing`: matchers, fixtures, conformance suites, BDD), GxP audit trail (hash chain, WAL crash recovery, electronic signatures, completeness monitoring, administrative controls), and validation tooling (`checkGxPReadiness`, `createGuardHealthCheck`).

**Deliverable**: `packages/guard/`, `packages/guard-testing/`, `packages/guard-validation/`, `integrations/react-guard/` — specification in [behaviors/](behaviors/), [16-definition-of-done.md](16-definition-of-done.md), and [process/definitions-of-done.md](process/definitions-of-done.md).

---

## Distributed Evaluation (§74)

**Status**: Specified

**Scope**: In-process evaluation remains unchanged. Distribution is handled through two new outbound ports: `PolicySyncPort` (publish/subscribe policy bundles across nodes) and `EvaluationCachePort` (decision caching keyed by policy hash + subject + resource, with invalidation by policy or subject). Policy bundles (`PolicyBundle`) are versioned, signed artifacts with `contentHash`, `permissionRegistry`, and role definitions. `EvaluationCachePort` is incompatible with `gxp: true` at compile time (ALCOA+ Contemporaneous). Consistency model: eventual for policy distribution, best-effort for cache, strong per-scope for audit trail. Four official adapters: Redis Pub/Sub sync, NATS sync, Redis cache, in-process LRU cache.

**Deliverable**: Specification in [roadmap/ecosystem-extensions.md § 74](roadmap/ecosystem-extensions.md#74-distributed-evaluation).

---

## Framework Middleware Adapters (§75)

**Status**: Specified

**Scope**: Thin bridge adapters for five frameworks. Each adapter: extracts `AuthSubject` from the framework's request context, creates a per-request DI scope, registers the subject on `SubjectProviderPort`, and attaches the scope to the request object. No authorization logic in adapters — all evaluation delegated to `evaluate()` and `guard()`. Error translation: `AccessDeniedError` → HTTP 403 / `TRPCError(FORBIDDEN)` / `GraphQLError` / `ForbiddenException`. Five adapters: Express/Connect (`createGuardMiddleware`), Fastify plugin (`guardPlugin`), tRPC middleware, GraphQL schema directive (`@authorized`), NestJS method decorator (`UseGuardPolicy`).

**Deliverable**: Specification in [roadmap/ecosystem-extensions.md § 75](roadmap/ecosystem-extensions.md#75-framework-middleware-adapters).

---

## Persistence Adapters (§76)

**Status**: Specified

**Scope**: Durable storage adapters implementing existing ports — no new core ports. `AuditTrailPort` adapters: Postgres (append-only table with REVOKE, date-based partitioning, per-scope chain, indexes for hash verification and subject lookup) and SQLite (WAL mode, append-only triggers, for single-node/edge/desktop). `RelationshipResolverPort` adapters: Postgres (Zanzibar-style tuples table, transitive CTE queries bounded by depth) and Drizzle ORM (type-safe queries across Postgres/MySQL/SQLite). All adapters must pass `createAuditTrailConformanceSuite()` (17 conformance tests). GxP requirement: Postgres adapter must use database-level `REVOKE UPDATE, DELETE` for defense-in-depth.

**Deliverable**: Specification in [roadmap/ecosystem-extensions.md § 76](roadmap/ecosystem-extensions.md#76-persistence-adapters).

---

## Query Conversion (§77)

**Status**: Specified

**Scope**: Pure function `policyToFilter(policy, subject): PolicyFilter | undefined` that transforms a guard policy tree into a database-agnostic filter. `hasPermission`/`hasRole` policies are pre-evaluated against the subject and folded into boolean constants (`true`/`false` filters). `hasAttribute` policies map to typed filter nodes (`eq`, `neq`, `in`, `exists`, `gte`, `lt`). `allOf`/`anyOf`/`not` map to `and`/`or`/`not`. `hasSignature`/`hasRelationship` return `undefined` (not convertible). ORM adapters: Prisma (`policyToPrismaWhere`, `policyToPrismaSelect` for field masking) and Drizzle (`policyToDrizzleWhere`). OQ cross-validation: 100 subject/resource combinations verified against `evaluate()`.

**Deliverable**: Specification in [roadmap/ecosystem-extensions.md § 77](roadmap/ecosystem-extensions.md#77-query-conversion).

---

## WASM Compilation (§78)

**Status**: Specified

**Scope**: Compiles a policy bundle into a WASM module for edge evaluation (Cloudflare Workers, Deno Deploy, Vercel Edge Functions). `compilePolicyToWasm(bundle): Promise<Uint8Array>` bakes the policy tree and evaluation logic into a binary with no external I/O. `loadWasmGuard(wasm): WasmGuardEvaluator` loads the module. Supported policy kinds: `hasPermission`, `hasRole`, `hasAttribute`, `allOf`/`anyOf`/`not`. Unsupported: `hasSignature`, `hasRelationship` (require external I/O). WASM evaluations produce no audit trail (edge pre-checks only; authoritative evaluation at origin). Modules carry source `contentHash`; rejected if bundle contains unsupported kinds.

**Deliverable**: Specification in [roadmap/ecosystem-extensions.md § 78](roadmap/ecosystem-extensions.md#78-wasm-compilation).

---

## CLI Tool (§79)

**Status**: Specified

**Scope**: Standalone `@hex-di/guard-cli` Node.js binary. Commands: `guard init` (scaffold permissions/roles/policies/config), `guard check` (validate policy JSON against schema and permission registry), `guard test` (run declarative allow/deny assertion files), `guard explain` (human-readable evaluation trace), `guard hash` (SHA-256 content hash of a policy), `guard audit verify` (verify hash chain integrity of an exported audit trail), `guard bundle pack` (create signed policy bundle), `guard bundle verify` (verify bundle integrity and signature), `guard diff` (structural policy diff, see §83), `guard migrate` (schema migration, see §83), `guard test --coverage` (policy coverage, see §82). Seven CLI integration test scenarios (CL-1 through CL-7).

**Deliverable**: Specification in [roadmap/developer-experience.md § 79](roadmap/developer-experience.md#79-cli-tool).

---

## Policy Playground (§80)

**Status**: Specified

**Scope**: Web SPA (`@hex-di/guard-playground`) deployable to any static host. Features: visual policy tree builder (drag-and-drop composition of all 10 policy kinds), JSON subject editor with registry autocomplete, live evaluation with EvaluationTrace tree, serialization preview (TypeScript ↔ JSON), share URLs (policy + subject encoded in URL hash via compressed base64url), example gallery (RBAC Blog, ABAC Healthcare, ReBAC Document Sharing, GxP Audit Trail, Field-Level Security). GxP mode: non-dismissible amber banner when `gxpMode: true` is detected; Share URL disabled in GxP mode; no session persistence of GxP subject data. Architecture: `@hex-di/guard` bundled in browser; no server-side evaluation.

**Deliverable**: Specification in [roadmap/developer-experience.md § 80](roadmap/developer-experience.md#80-policy-playground).

---

## VS Code Extension (§81)

**Status**: Specified

**Scope**: `hex-di-guard-vscode` (VS Code Marketplace). Features: JSON schema for `.guard.json` files (autocomplete, validation, inline docs), inline evaluation code lens above `guard()` calls (shows allow/deny per test fixture subject), permission/role autocomplete for `hasPermission()` and `hasRole()` arguments, trace tree sidebar panel (collapsible EvaluationTrace tree, real-time updates), policy diff view (structural side-by-side with add/remove/change highlighting). Architecture: Language Server (Node.js) + VS Code Extension Client (Code Lens, Completion, Tree View, Diff View providers).

**Deliverable**: Specification in [roadmap/developer-experience.md § 81](roadmap/developer-experience.md#81-vs-code-extension).

---

## Policy Coverage Analysis (§82)

**Status**: Specified

**Scope**: `@hex-di/guard-coverage` (ships inside `@hex-di/guard-cli`). Five coverage metrics: node coverage (policy tree nodes evaluated), branch coverage (`allOf`/`anyOf` branches evaluated in both allow and deny), permission coverage (permissions tested as both allow AND deny), role coverage (roles tested as both allow AND deny), decision coverage (guarded ports tested with at least one allow and one deny). Coverage collected by wrapping `evaluate()`. CLI: `guard test --coverage`, `--reporter json|html|junit`, `--min-coverage <n>` (exit code 1 if below threshold). GxP recommendation: 100% permission coverage + 100% decision coverage as OQ evidence.

**Deliverable**: Specification in [roadmap/developer-experience.md § 82](roadmap/developer-experience.md#82-policy-coverage-analysis).

---

## Policy Diff & Migration (§83)

**Status**: Specified

**Scope**: `@hex-di/guard-diff` (ships inside `@hex-di/guard-cli`). Policy diff: `diffPolicies(old, new): PolicyDiff` — structural comparison producing a typed tree (unchanged / added / removed / changed / composite). Impact analysis: `analyzePolicyImpact(diff, roles): PolicyImpact` — identifies affected roles, added/removed permission references, and change counts. Policy migration: `migratePolicy(json, fromVersion, toVersion): Result<string, PolicyMigrationError>` — schema migration for serialized policies across guard versions. CLI: `guard diff`, `guard migrate`, `guard migrate --dry-run`, `guard migrate --backup`. GxP: policy changes recorded as `PolicyChangeAuditEntry` with old/new hash, structural diff, and CCR reference; policy changes without CCR reference are rejected.

**Deliverable**: Specification in [roadmap/developer-experience.md § 83](roadmap/developer-experience.md#83-policy-diff--migration).
