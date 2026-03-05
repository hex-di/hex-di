# Test Strategy — @hex-di/guard-rego

## Document Control

| Field       | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Document ID | SPEC-RG-PRC-002                                                               |
| Version     | Derived from Git — `git log -1 --format="%H %ai" -- process/test-strategy.md` |
| Status      | Effective                                                                     |

---

## Test Pyramid

| Level             | File pattern                  | Purpose                           | Applicable                     |
| ----------------- | ----------------------------- | --------------------------------- | ------------------------------ |
| **Unit**          | `tests/unit/*.test.ts`        | Individual function behavior      | Yes                            |
| **Type**          | `tests/*.test-d.ts`           | Compile-time type contracts       | Yes                            |
| **Integration**   | `tests/integration/*.test.ts` | Rego + Guard end-to-end           | Yes                            |
| **Mutation**      | Stryker config                | Mutation score for critical paths | Yes                            |
| **GxP Integrity** | `tests/unit/gxp-*.test.ts`    | High-risk invariant verification  | No (inherited from guard core) |
| **Performance**   | `tests/benchmarks/*.bench.ts` | HTTP latency and throughput       | Planned (v0.2.0)               |

---

## Coverage Targets

| Metric                            | Target                   | Rationale                                                          |
| --------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Branch coverage                   | >= 90%                   | Standard for adapter libraries                                     |
| Line coverage                     | >= 95%                   | Standard for adapter libraries                                     |
| Mutation score (input mapping)    | >= 80%                   | Input mapping correctness directly affects what OPA evaluates      |
| Mutation score (decision mapping) | >= 80%                   | Decision mapping correctness directly affects security             |
| Mutation score (fail-closed)      | >= 90%                   | Fail-closed behavior is security-critical — must survive mutations |
| Type test coverage                | 100% of public API types | All exported interfaces must have type-level tests                 |

---

## Test File Naming

```
tests/
  unit/
    client.test.ts              # OPA HTTP client (mocked fetch)
    input-mapper.test.ts        # Subject/Resource → OPA input document
    decision-mapper.test.ts     # OPA response → Guard Decision
    errors.test.ts              # Error construction and freezing
    factory.test.ts             # createRegoAdapter factory
    failover.test.ts            # Fail-closed behavior on OPA unavailability
  integration/
    rego-guard.test.ts          # End-to-end Rego + Guard evaluation
  rego-policy.test-d.ts         # Type-level tests
```

---

## Test Dependencies

| Dependency                  | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `vitest`                    | Test runner                                 |
| `@hex-di/guard-testing`     | `createTestSubject`, `testPolicy` utilities |
| `msw` (Mock Service Worker) | HTTP mocking for OPA API calls              |

---

## HTTP Testing Considerations

- Unit tests mock `fetch` via injectable `fetchImpl` parameter. This avoids network dependencies in unit tests.
- Integration tests use Mock Service Worker (msw) to simulate a full OPA sidecar:
  - `POST /v1/data/{path}` — returns configurable decision results
  - `GET /health` — returns configurable health status
  - Error scenarios: timeout, 500, invalid JSON, etc.
- Integration tests do NOT require a running OPA instance. The msw handler simulates OPA's API contract.
- A separate CI job MAY run integration tests against a real OPA Docker container for smoke testing, but this is not required for the test suite to pass.

---

## Test Data

- Input document tests use Guard's `createTestSubject` fixture from `@hex-di/guard-testing` for subject construction.
- Decision mapping tests use inline JSON objects representing OPA responses (both boolean and structured formats).
- Integration tests use a standard "document management" scenario matching the Cedar adapter's test scenario for consistency.
- Rego policies for integration tests are defined as string constants in the msw handlers (the OPA sidecar would normally hold them, but since we mock the API, we just configure the expected responses).

---

## Fail-Closed Testing

The fail-closed invariant (INV-RG-1) is critical to security and has elevated testing requirements:

- **Dedicated test file** (`tests/unit/failover.test.ts`) — isolates fail-closed behavior from general error handling
- **Mutation score >= 90%** — higher than other modules because a surviving mutant could turn a deny into an allow
- **Scenarios covered**: network error, DNS failure, connection refused, timeout, HTTP 500, malformed response, empty response
- Each scenario verifies: (1) result is `Deny`, (2) reason includes error details, (3) original error is preserved as `cause`
