# Test Strategy — @hex-di/guard-cedar

## Document Control

| Field       | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Document ID | SPEC-CD-PRC-002                                                               |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/test-strategy.md` |
| Status      | Effective                                                                     |

---

## Test Pyramid

| Level             | File pattern                  | Purpose                           | Applicable                     |
| ----------------- | ----------------------------- | --------------------------------- | ------------------------------ |
| **Unit**          | `tests/unit/*.test.ts`        | Individual function behavior      | Yes                            |
| **Type**          | `tests/*.test-d.ts`           | Compile-time type contracts       | Yes                            |
| **Integration**   | `tests/integration/*.test.ts` | Cedar + Guard end-to-end          | Yes                            |
| **Mutation**      | Stryker config                | Mutation score for critical paths | Yes                            |
| **GxP Integrity** | `tests/unit/gxp-*.test.ts`    | High-risk invariant verification  | No (inherited from guard core) |
| **Performance**   | `tests/benchmarks/*.bench.ts` | WASM evaluation latency           | Planned (v0.2.0)               |

---

## Coverage Targets

| Metric                            | Target                   | Rationale                                                                                           |
| --------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| Branch coverage                   | >= 90%                   | Standard for adapter libraries                                                                      |
| Line coverage                     | >= 95%                   | Standard for adapter libraries                                                                      |
| Mutation score (entity mapping)   | >= 80%                   | Entity mapping correctness is critical — incorrect mapping silently changes authorization semantics |
| Mutation score (decision mapping) | >= 80%                   | Decision mapping correctness directly affects security                                              |
| Type test coverage                | 100% of public API types | All exported interfaces must have type-level tests                                                  |

---

## Test File Naming

```
tests/
  unit/
    engine.test.ts              # CedarEngine WASM wrapper
    entity-mapper.test.ts       # Subject/Resource → Cedar Entity
    schema-loader.test.ts       # Schema loading and validation
    policy-store.test.ts        # Policy text storage
    decision-mapper.test.ts     # Cedar Response → Guard Decision
    errors.test.ts              # Error construction and freezing
    factory.test.ts             # createCedarAdapter factory
  integration/
    cedar-guard.test.ts         # End-to-end Cedar + Guard evaluation
  cedar-policy.test-d.ts        # Type-level tests
```

---

## Test Dependencies

| Dependency                 | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `vitest`                   | Test runner                                              |
| `@hex-di/guard-testing`    | `createTestSubject`, `testPolicy` utilities              |
| `@cedar-policy/cedar-wasm` | Cedar WASM engine (real, not mocked — integration tests) |

---

## WASM Testing Considerations

- Unit tests for the engine wrapper use the real Cedar WASM module (not mocked). WASM initialization is a one-time cost per test suite.
- Entity mapper and decision mapper tests do NOT require WASM — they test pure mapping functions with plain objects.
- Integration tests create a full `CedarAdapter` with real WASM engine, real policies, and real schema.
- Tests MUST NOT assume WASM module loading order. Each test file initializes its own engine instance.

---

## Test Data

- Cedar schemas and policies for tests are stored as string constants in test files (not external files). This keeps tests self-contained and readable.
- Entity mapping tests use Guard's `createTestSubject` fixture from `@hex-di/guard-testing` for subject construction.
- Integration tests use a standard "document management" scenario: Users, Roles (admin, editor, viewer), Documents with classification levels. This mirrors the example in [08-configuration.md](../08-configuration.md).
