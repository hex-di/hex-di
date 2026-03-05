---
id: PROC-SF-006
kind: process
title: Test Strategy
status: active
---

# Test Strategy

Testing approach for verifying SpecForge implementation against its specification.

---

## Test Pyramid

| Level       | Scope                                                 | Tools                           | Target                        |
| ----------- | ----------------------------------------------------- | ------------------------------- | ----------------------------- |
| Unit        | Individual port implementations, pure functions       | Vitest                          | Fast feedback, isolated logic |
| Type        | Compile-time contract verification                    | vitest-type (`expectTypeOf`)    | Port/adapter type safety      |
| Integration | Port-adapter wiring, cross-component flows            | Vitest + test adapters          | Component collaboration       |
| GxP         | Regulatory compliance behaviors (BEH-SF-123–132)      | Vitest + audit trail assertions | 21 CFR Part 11, ALCOA+        |
| Mutation    | Fault injection on high-risk behaviors                | Stryker                         | Mutation kill rate            |
| Performance | Token budget, convergence timing, graph query latency | Vitest bench                    | Non-functional requirements   |

---

## Coverage Targets

| Risk Level | Branch Coverage | Line Coverage | Mutation Kill Rate |
| ---------- | --------------- | ------------- | ------------------ |
| High       | >= 90%          | >= 95%        | >= 80%             |
| Medium     | >= 80%          | >= 90%        | >= 60%             |
| Low        | >= 70%          | >= 85%        | —                  |

Risk levels are assigned per behavior file in [traceability/index.md](../traceability/index.md) (Capability-Level Traceability table).

---

## File Naming Conventions

| Test Level  | Pattern                       | Location                  |
| ----------- | ----------------------------- | ------------------------- |
| Unit        | `*.test.ts`                   | `tests/` or `tests/unit/` |
| Type        | `*.test-d.ts`                 | `tests/`                  |
| Integration | `tests/integration/*.test.ts` | `tests/integration/`      |
| GxP         | `tests/gxp/*.test.ts`         | `tests/gxp/`              |
| E2E         | `tests/e2e/*.test.ts`         | `tests/e2e/`              |
| Performance | `tests/perf/*.bench.ts`       | `tests/perf/`             |

---

## Qualification Protocols

For GxP-regulated deployments, testing aligns with GAMP 5 qualification:

| Protocol                        | Spec Level     | What It Verifies                                                |
| ------------------------------- | -------------- | --------------------------------------------------------------- |
| IQ (Installation Qualification) | Infrastructure | Dependencies installed, Neo4j reachable, environment configured |
| OQ (Operational Qualification)  | Functional     | All BEH-SF behaviors execute correctly under normal conditions  |
| PQ (Performance Qualification)  | Operational    | System performs under expected load and concurrent usage        |

---

## Test-to-Requirement Traceability

Every test file SHOULD include a header comment linking to the BEH-SF IDs it verifies:

```typescript
/**
 * @requirements BEH-SF-057, BEH-SF-058
 * @invariants INV-SF-3
 */
```

Automated traceability verification checks that every BEH-SF ID in `behaviors/*.md` has at least one test file referencing it (deferred until implementation begins).

---

## Cross-References

- [definitions-of-done.md](./definitions-of-done.md) — completion criteria
- [../traceability/index.md](../traceability/index.md) — requirement-to-test traceability
- [../risk-assessment/index.md](../risk-assessment/index.md) — risk levels driving coverage targets
