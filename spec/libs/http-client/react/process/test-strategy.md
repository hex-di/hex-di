# @hex-di/http-client-react — Test Strategy

## Document Control

| Field | Value |
| --- | --- |
| Document ID | SPEC-HCR-PRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/process/test-strategy.md` |
| Status | Effective |

---

## Test Pyramid

Five test levels apply to `@hex-di/http-client-react`.

| Level | File Pattern | Purpose | Status |
| --- | --- | --- | --- |
| **Unit** | `tests/unit/*.test.ts`, `tests/unit/*.test.tsx` | Individual hook and component behavior | ✓ Required |
| **Type** | `tests/*.test-d.ts` | Compile-time type contracts for public API | ✓ Required |
| **Integration** | `tests/integration/*.test.tsx` | Full render cycle with mock adapter | ✓ Required |
| **Mutation** | Stryker/vitest-coverage | Mutation score on state transition paths | ✓ Required |
| **Performance** | N/A | React hooks have no latency SLA | — Not required |

---

## Test File Naming Conventions

```
libs/http-client/react/
  tests/
    unit/
      provider.test.tsx             # §9–§12 (HttpClientProvider)
      use-http-client.test.ts       # §13 (useHttpClient)
      use-http-request.test.ts      # §14–§15, §18 (useHttpRequest)
      use-http-mutation.test.ts     # §16–§17, §18 (useHttpMutation)
      testing-utils.test.ts         # §20 (createHttpClientTestProvider)
    integration/
      provider-integration.test.tsx # Provider nesting, full render
      hooks-integration.test.tsx    # Hook + mock adapter full cycles
    http-client-react.test-d.ts     # Type-level: hook return types, generic narrowing
```

---

## Coverage Targets

| Metric | Target | Regulatory Basis |
| --- | --- | --- |
| Line coverage | ≥ 95% | GAMP 5 Category 5 |
| Branch coverage | ≥ 90% | GAMP 5 Category 5 |
| Mutation score (aggregate) | ≥ 88% | ICH Q9 risk-proportionate testing |
| Mutation score (useHttpRequest state transitions) | ≥ 95% | Reactive state is High-risk per risk assessment |
| Type test coverage | 100% of public API types | ADR-HCR-002 (Result-typed contract requires type verification) |

---

## Test Data Strategy

| Test Level | Data Strategy |
| --- | --- |
| Unit | `createMockHttpClient` from `@hex-di/http-client-testing`; `renderHook` with `wrapper` |
| Type | Compile-time only; no runtime data |
| Integration | `createHttpClientTestProvider` with mock client; `render` + `screen.findBy*` assertions |

---

## CI Integration

Tests run in the following CI stages:

1. `pnpm test --filter @hex-di/http-client-react` — full unit + integration + type test suite
2. `pnpm typecheck --filter @hex-di/http-client-react` — TypeScript strict mode compilation
3. `pnpm lint --filter @hex-di/http-client-react` — ESLint with no-any enforcement
4. Mutation tests: `pnpm stryker run` — on `main` merge only
