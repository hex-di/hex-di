# Test Strategy

> **Extracted from:** [behaviors/12-testing.md](../behaviors/12-testing.md) methodology sections during spec restructure (CCR-GUARD-018, 2026-02-17)

## Overview

The guard specification mandates a multi-level testing strategy aligned with GAMP 5 validation requirements.

## Test Pyramid

The guard library applies all six standard hex-di test levels, plus BDD acceptance tests for stakeholder-readable scenario validation.

| Level | File Pattern | Purpose | Status |
|-------|-------------|---------|--------|
| **Unit** | `tests/unit/*.test.ts` | Individual function/type behavior | Required |
| **Type** | `tests/*.test-d.ts` | Compile-time type contracts (branded types, phantom brands) | Required |
| **GxP Integrity** | `tests/unit/gxp-*.test.ts` | High-risk invariant verification (INV-GD-001–INV-GD-037) | Required |
| **Integration** | `tests/integration/*.test.ts` | Cross-module and cross-package behavior | Required |
| **Mutation** | Stryker | Mutation score for critical authorization paths | Required |
| **Performance** | `tests/benchmarks/*.bench.ts` | Policy evaluation latency and throughput baselines | Required |
| **BDD Acceptance** | `features/**/*.feature` (Cucumber) | Stakeholder-readable scenario coverage (118 scenarios) | Required |

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|-----------------|
| Line coverage | ≥ 95% | GAMP 5 Category 5 — complete functional verification |
| Branch coverage | ≥ 90% | GAMP 5 Category 5 — decision logic verification |
| Mutation score — policy evaluation core and combinators | 100% | ICH Q9 — zero tolerance for logic errors in authorization decisions |
| Mutation score — GxP-critical paths (hash chain, WAL, signatures, serialization) | ≥ 95% | ICH Q9 — high-risk invariant verification |
| Mutation score — standard paths (React components, inspector, DevTools) | ≥ 90% | ICH Q9 — risk-proportionate testing |
| Type test coverage | 100% of public API types | ADR-GD-003 — compile-time safety for permission and role tokens |
| BDD scenario coverage | 118 scenarios | GAMP 5 OQ — operational qualification via stakeholder-readable tests |

## Test File Naming Conventions

```
libs/guard/
  tests/
    unit/
      permissions.test.ts           # Permission token creation, branding, PermissionRegistry
      roles.test.ts                 # Role tokens, DAG walk, cycle detection, SoD constraints
      policies.test.ts              # Policy discriminated union, hashPolicy
      evaluator.test.ts             # evaluate(), evaluateBatch(), short-circuit logic
      serialization.test.ts         # serializePolicy, deserializePolicy, explainPolicy
      subject.test.ts               # SubjectProviderPort, withAttributes, getAttribute
      guard-adapter.test.ts         # guard() wrapper, GuardedAdapter<A> type transform
      port-gate-hook.test.ts        # createPortGateHook, coarse/fine-grained enforcement
      gxp-hash-chain.test.ts        # GxP: audit trail hash chain integrity (INV-GD-015)
      gxp-wal-recovery.test.ts      # GxP: WAL crash recovery (INV-GD-016)
      gxp-signature-verification.test.ts  # GxP: constant-time comparison (INV-GD-020)
      gxp-chain-break.test.ts       # GxP: chain break detection (INV-GD-017)
    integration/
      guard-adapter.test.ts         # Guard adapter integrated with DI graph
      cross-library.test.ts         # Logger, tracing, query/store, saga/flow integration
    benchmarks/
      policy-evaluation.bench.ts    # evaluate() latency at P50/P99; baseline for SLA tracking
    permissions.test-d.ts           # Type-level: Permission<R,A> branding, PermissionGroupMap
    roles.test-d.ts                 # Type-level: Role hierarchy, MutuallyExclusiveRoles
    policies.test-d.ts              # Type-level: PolicyKind discriminated union exhaustiveness
    evaluator.test-d.ts             # Type-level: PoliciesDecisions<M> mapped type
  features/                         # Cucumber BDD acceptance tests (118 scenarios)
    permissions/
    roles/
    guard-adapter/
    react/
```

## Test Levels

| Level | Tool | Purpose | Count |
|-------|------|---------|-------|
| **Unit Tests** | Vitest | Individual function/type verification | 1176 |
| **Type Tests** | vitest-typecheck | Compile-time type safety | Included above |
| **Integration Tests** | Vitest | Cross-module interaction | Included above |
| **BDD Acceptance Tests** | Cucumber | Stakeholder-readable scenarios | 118 scenarios |
| **Mutation Testing** | Stryker | Test quality verification | ≥90% kill rate |

## Qualification Protocols

| Protocol | GAMP 5 Role | File |
|----------|-------------|------|
| **IQ** (Installation Qualification) | Verifies correct installation | [compliance/test-protocols.md](../17-gxp-compliance.md#71-iq-protocols) |
| **OQ** (Operational Qualification) | Verifies functional requirements | [compliance/test-protocols.md](../17-gxp-compliance.md#72-oq-protocols) |
| **PQ** (Performance Qualification) | Verifies production-like performance | [compliance/test-protocols.md](../17-gxp-compliance.md#73-pq-protocols) |

## Test Packages

| Package | Purpose |
|---------|---------|
| `@hex-di/guard-testing` | Memory adapters, custom matchers, subject fixtures, testPolicy utility |
| `@hex-di/guard-validation` | Programmatic IQ/OQ/PQ runners, traceability matrix generation |

## Conformance Suite

The `createAuditTrailConformanceSuite()` harness in `@hex-di/guard-testing` provides standardized adapter validation (17 conformance tests). See [behaviors/12-testing.md](../behaviors/12-testing.md).

## Definition of Done

Each feature has explicit DoD criteria in [process/definitions-of-done.md](./definitions-of-done.md) with specific test counts, mutation thresholds, and type-level requirements.
