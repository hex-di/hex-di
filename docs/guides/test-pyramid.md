---
title: Test Pyramid
description: Overview of the six test tiers in HexDI and which commands run each tier.
sidebar_position: 3
---

# Test Pyramid

HexDI uses six test tiers, each catching different classes of defects. This page documents what each tier does and how to run it.

```
                    ┌──────────┐
                    │   E2E    │  Playwright
                   ┌┴──────────┴┐
                   │    BDD     │  Cucumber
                  ┌┴────────────┴┐
                  │   Mutation   │  Stryker
                 ┌┴──────────────┴┐
                 │  Type-Level    │  Vitest typecheck
                ┌┴────────────────┴┐
                │   Integration    │  Vitest
               ┌┴──────────────────┴┐
               │       Unit         │  Vitest
               └────────────────────┘
```

## Tiers

### 1. Unit Tests (Vitest)

Test individual adapters, factories, and utilities in isolation with mocked dependencies.

```bash
pnpm test                              # all unit + integration tests
pnpm --filter @hex-di/<name> test      # single package
```

### 2. Integration Tests (Vitest)

Test service compositions with real or partially mocked dependency graphs. Files live in `tests/integration/` within each package.

```bash
pnpm test                              # runs alongside unit tests
```

### 3. Type-Level Tests (Vitest typecheck)

Verify compile-time contracts using `.test-d.ts` files with `expectTypeOf`. Catches regressions in generic type inference, branded types, and conditional type logic.

```bash
pnpm test:types                        # all workspaces
```

### 4. Mutation Tests (Stryker)

Verify test quality by introducing code mutations and checking that tests detect them. Configured per-package in `stryker.config.json`. CI runs mutation tests on PRs when source files change.

```bash
pnpm --filter @hex-di/<name> test:mutation   # single package
```

### 5. BDD / Acceptance Tests (Cucumber)

Behaviour-driven scenarios in Gherkin `.feature` files with TypeScript step definitions. Cover `@hex-di/result`, `@hex-di/result-react`, `@hex-di/result-testing`, and `@hex-di/guard-features`.

```bash
pnpm --filter @hex-di/result test:cucumber
pnpm --filter @hex-di/result-react test:cucumber
pnpm --filter @hex-di/result-testing test:cucumber
pnpm --filter @hex-di/guard-features test
```

### 6. End-to-End Tests (Playwright)

Full-stack browser and API tests against running example applications (react-showcase, hono-todo, pokenerve).

```bash
pnpm exec playwright install --with-deps chromium   # one-time browser install
pnpm test:e2e                                        # all E2E suites
pnpm test:e2e:ui                                     # interactive Playwright UI
```

## CI Mapping

| CI Job       | Tiers Covered               | Command                                                 |
| ------------ | --------------------------- | ------------------------------------------------------- |
| `test`       | Unit, Integration, Cucumber | `pnpm test -- --coverage` + per-package `test:cucumber` |
| `test-types` | Type-Level                  | `pnpm test:types`                                       |
| `e2e`        | End-to-End                  | `pnpm test:e2e`                                         |
| `mutation`   | Mutation (PR only)          | `pnpm --filter <pkg> test:mutation`                     |

## Running Everything Locally

```bash
pnpm validate    # includes unit, integration, and type-level tests
pnpm test:e2e    # E2E (separate, requires Playwright browsers)
```

Or use the single full-parity command:

```bash
pnpm validate:full   # validate + guard-features BDD + Playwright E2E
```

See [AGENTS.md](https://github.com/leaderiop/hex-di/blob/main/AGENTS.md) for the full CI parity checklist.

### Tier-to-Script-to-CI Mapping

| Tier        | Local Command                               | CI Job                         | Runner           |
| ----------- | ------------------------------------------- | ------------------------------ | ---------------- |
| Unit        | `pnpm test`                                 | `test`                         | Vitest           |
| Integration | `pnpm test`                                 | `test`                         | Vitest           |
| Type-Level  | `pnpm test:types`                           | `test-types`                   | Vitest typecheck |
| Mutation    | `pnpm --filter <pkg> test:mutation`         | `mutation` (PR, path-filtered) | Stryker          |
| BDD         | `pnpm --filter @hex-di/guard-features test` | `test` (guard-features step)   | Cucumber         |
| E2E         | `pnpm test:e2e`                             | `e2e`                          | Playwright       |

## Flake Policy

Test stability is essential for AI-assisted development. Flaky tests erode trust in CI and make it harder for agents to determine whether their changes broke something.

### Guidelines

- **No tolerance for flaky unit/integration tests** — a test that passes inconsistently must be fixed immediately, not retried
- **E2E tests** get a CI retry budget of 2 retries (configured in `playwright.config.ts`) since they depend on external processes
- **Mutation tests** may time out on slow runners — the CI matrix uses `--concurrency 2` to reduce flakiness

### Quarantine Process

If a test is identified as flaky:

1. Open an issue tagged `flaky-test` with the test name and failure frequency
2. If the test cannot be fixed within 48 hours, mark it with `.skip` and reference the issue in a comment
3. Skipped tests must be tracked and resolved within one sprint — do not let quarantined tests accumulate
4. The `pnpm test` CI job must always run green on `main`; quarantining is a temporary measure

### Diagnosing Flakes

- Check `docs/debug-playbook.md` for common CI failure patterns
- For timing-sensitive tests, use `vi.useFakeTimers()` instead of real delays
- For tests that depend on execution order, ensure proper `beforeEach`/`afterEach` cleanup
