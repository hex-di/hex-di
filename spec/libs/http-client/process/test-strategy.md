# @hex-di/http-client — Test Strategy

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-003 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/test-strategy.md` |
| Status | Effective |

---

## Test Pyramid

Six test levels apply to `@hex-di/http-client`. Levels marked ✓ are active; levels marked ○ are planned but not yet implemented.

| Level | File Pattern | Purpose | Status |
|-------|-------------|---------|--------|
| **Unit** | `tests/unit/*.test.ts` | Individual function and combinator behavior | ✓ Required |
| **Type** | `tests/*.test-d.ts` | Compile-time type contracts for public API | ✓ Required |
| **GxP Integrity** | `tests/unit/gxp-*.test.ts` | High-risk invariant verification (INV-HC-3 primary) | ✓ Required for High-risk |
| **Integration** | `tests/integration/*.test.ts` | Cross-combinator chains, full request/response cycles via mock adapter | ✓ Required |
| **Mutation** | Stryker/vitest-coverage | Mutation score on critical paths | ✓ Required |
| **Performance** | `tests/benchmarks/*.bench.ts` | Latency benchmarks for combinator overhead | ✓ Required |

---

## Test File Naming Conventions

```
libs/http-client/
  tests/
    unit/
      # Core types (DoD 1)
      headers.test.ts                    # CT-001–CT-007 (Headers)
      url-params.test.ts                 # CT-008–CT-013 (UrlParams)
      body.test.ts                       # CT-014–CT-017 (HttpBody)
      # HTTP request (DoD 2)
      request.test.ts                    # RQ-001–RQ-004, RQ-018 (constructors, display)
      request-combinators.test.ts        # RQ-005–RQ-020 (header/URL/body/signal combinators)
      # HTTP response (DoD 3)
      response.test.ts                   # RS-001–RS-005, RS-011 (body accessors, back-ref)
      response-status.test.ts            # RS-006–RS-008 (status utilities)
      response-headers.test.ts           # RS-009–RS-010 (header utilities)
      # Error types (DoD 4)
      errors.test.ts                     # ER-001–ER-003 (error constructors)
      error-guards.test.ts               # ER-004–ER-014 (type guards, transient check)
      error-codes.test.ts                # ER-015 (error code constants)
      error-freezing.test.ts             # EF-001–EF-005 (populate-freeze-return; DoD 11)
      # HTTP client port (DoD 5)
      port.test.ts                       # PT-001–PT-004 (port metadata, isHttpClientPort)
      # Client combinators (DoD 6)
      combinators.test.ts                # CC-001–CC-013, CC-029–CC-030 (mapRequest, filterStatus, auth…)
      retry.test.ts                      # CC-014–CC-023 (retry, retryTransient, backoff)
      timeout.test.ts                    # CC-024–CC-025 (timeout combinator)
      error-recovery.test.ts             # CC-026–CC-027 (catchError, catchAll)
      combinator-composition.test.ts     # CC-028 (order determinism)
      # Introspection (DoD 8–12, 14–18)
      registry.test.ts                   # IN-001–IN-003 (active request registry)
      inspector.test.ts                  # IN-004–IN-014 (inspector API, snapshot, stats)
      audit-integrity.test.ts            # AI-001–AI-010, GX-037–GX-038 (hash chain)
      audit-sink.test.ts                 # AS-001–AS-006, GX-013–GX-015 (sink write/flush)
      monotonic-timing.test.ts           # MT-001–MT-005 (monotonic timestamps)
      audit-warning.test.ts              # MT-006–MT-009 (HTTP_WARN_001 warnings)
      library-inspector-bridge.test.ts   # LI-001–LI-012 (library inspector bridge)
      combinator-state.test.ts           # CS-001–CS-007 (circuit breakers, rate limiters)
      health.test.ts                     # HL-001–HL-008 (health abstraction)
      combinator-chain.test.ts           # CH-001–CH-006 (chain introspection)
      mcp-resources.test.ts              # MR-001–MR-009 (MCP resource mapping)
      # Testing utilities (DoD 13)
      mock-client.test.ts                # TU-001–TU-005 (createMockHttpClient)
      recording-client.test.ts           # TU-006–TU-009 (createRecordingClient)
      response-factory.test.ts           # TU-010–TU-011 (mockResponse, mockJsonResponse)
      mock-adapter.test.ts               # TU-012 (MockHttpClientAdapter)
      matchers.test.ts                   # TU-013–TU-015 (vitest matchers)
      # A2A skills (DoD 19)
      a2a-skills.test.ts                 # A2-001–A2-002 (skill definitions)
      # Advanced combinators (DoD 19d–19g)
      interceptor-chain.test.ts          # IC-001–IC-005 (composeInterceptors, DI-Aware adapter)
      circuit-breaker.test.ts            # CB-001–CB-008 (state machine, failure threshold, probe)
      rate-limiter.test.ts               # RL-001–RL-004 (window quota, queue/reject strategies)
      cache.test.ts                      # RC-001–RC-005 (cache hits, TTL, eviction, isCacheable)
      # Transport security (DoD 19b)
      transport-security.test.ts         # SEC-001–SEC-008 (requireHttps)
      payload-integrity.test.ts          # SEC-009–SEC-015 (withPayloadIntegrity)
      credential-protection.test.ts      # SEC-016–SEC-022 (withCredentialProtection)
      payload-validation.test.ts         # SEC-023–SEC-028 (withPayloadValidation)
      token-lifecycle.test.ts            # SEC-029–SEC-035 (withTokenLifecycle, auth policy)
      ssrf-protection.test.ts            # SEC-036–SEC-040 (withSsrfProtection)
      hsts-csrf.test.ts                  # SEC-041–SEC-046 (withHstsEnforcement, withCsrfProtection)
      # GxP integrity tests (DoD 19c)
      gxp-body-consumption.test.ts       # FM-3 / INV-HC-3 — High-risk GxP test
      gxp-error-freeze.test.ts           # FM-4, FM-5 / INV-HC-4, INV-HC-5 — defense-in-depth
      gxp-compliance.test.ts             # GX-001–GX-003, GX-010 (cross-chain, ALCOA+ coverage)
      gxp-audit-bridge.test.ts           # GX-004–GX-006 (GxP audit sink adapter)
      gxp-schema-versioning.test.ts      # GX-007–GX-009 (versioned audit entry)
      gxp-available.test.ts              # GX-012 (real-time query access)
      gxp-fail-fast.test.ts              # GX-016–GX-019 (ConfigurationError on bad GxP setup)
      gxp-sink-retry.test.ts             # GX-020–GX-023 (retry queue)
      gxp-body-snapshot.test.ts          # GX-024–GX-029 (body snapshot, SHA-256 digest)
      gxp-eviction.test.ts               # GX-030–GX-036 (persistence-aware eviction)
    integration/
      # Transport adapters (DoD 7–7e)
      fetch-adapter.test.ts              # FA-001–FA-010 (Fetch adapter)
      axios-adapter.test.ts              # AX-001–AX-010 (Axios adapter)
      got-adapter.test.ts                # GT-001–GT-010 (Got adapter)
      ky-adapter.test.ts                 # KY-001–KY-010 (Ky adapter)
      ofetch-adapter.test.ts             # OF-001–OF-010 (Ofetch adapter)
      # DI integration (DoD 5 + IT-*)
      graph-integration.test.ts          # PT-005, IT-004 (GraphBuilder validation)
      container-integration.test.ts      # IT-001 (adapter resolved from container)
      scoped-client.test.ts              # IT-002–IT-003 (scoped client lifecycle)
      inspector-integration.test.ts      # IT-005 (stats after multiple requests)
      tracing-integration.test.ts        # IT-006 (tracer bridge span creation)
      mock-adapter-integration.test.ts   # IT-007 (mock adapter in DI graph)
      cross-library.test.ts              # IT-008 (query adapter + HttpClient)
      library-inspector-integration.test.ts # IT-009 (bridge auto-registers via afterResolve)
      audit-sink-integration.test.ts     # IT-010 (sink receives integrity-hashed entries)
      audit-warning-integration.test.ts  # IT-011 (HTTP_WARN_001 in integration scenario)
      # Transport security integration (DoD 19b)
      gxp-security-pipeline.test.ts      # SEC-047–SEC-050 (security combinator composition)
      # GxP integration (DoD 19c)
      gxp-enduring.test.ts               # GX-011 (audit sink survives inspector disposal)
    e2e/
      e2e-pipeline.test.ts               # E2E-001 (full adapter → combinators → json pipeline)
      e2e-resilience.test.ts             # E2E-002 (retry + timeout: transient failure then success)
      e2e-scoped.test.ts                 # E2E-003 (scoped client lifecycle)
      e2e-errors.test.ts                 # E2E-004 (error classification)
      e2e-interceptors.test.ts           # E2E-005 (auth + baseUrl + filterStatusOk + retry + timeout)
      e2e-gxp-pipeline.test.ts           # E2E-006 (HTTPS + attribution + RBAC + e-sig + audit)
      e2e-audit-chain.test.ts            # E2E-007 (100-op audit chain with verification)
      e2e-transport-security.test.ts     # E2E-008 (HTTPS + payload integrity + redaction)
      e2e-cross-correlation.test.ts      # E2E-009 (guard → HTTP → audit cross-correlation)
      e2e-cert-pinning.test.ts           # E2E-010 (certificate pinning)
      e2e-wal-recovery.test.ts           # E2E-011 (WAL crash recovery)
      e2e-token-lifecycle.test.ts        # E2E-012 (expired token → auto-refresh → success)
      e2e-ssrf-protection.test.ts        # E2E-013 (internal IP blocked)
      e2e-electronic-signature.test.ts   # E2E-014 (e-sig ceremony → verification → audit)
      e2e-scope-isolation.test.ts        # E2E-015 (two concurrent scopes, independent audit chains)
      e2e-payload-validation.test.ts     # E2E-016 (schema-conforming accepted, non-conforming rejected)
      e2e-hsts.test.ts                   # E2E-017 (HSTS cached host rejects plaintext downgrade)
      e2e-body-snapshot.test.ts          # E2E-018 (body snapshots in GxP audit trail)
      e2e-encryption.test.ts             # E2E-019 (encrypt → persist → retrieve → decrypt → verify)
      e2e-degraded-mode.test.ts          # E2E-020 (slow sink → degraded mode → recovery)
      e2e-config-change-control.test.ts  # E2E-021 (config mutation → audit → rollback → audit)
      e2e-auth-strength.test.ts          # E2E-022 (MFA enforcement, session timeout)
    benchmarks/
      combinator-overhead.bench.ts       # Latency per combinator in a chain of 5
      execute-throughput.bench.ts        # Requests/sec via mock adapter
    # Type-level tests (TL-001–TL-012)
    http-client-port.test-d.ts           # TL-001–TL-003 (InferHttpClient, port type)
    http-request.test-d.ts               # TL-004–TL-006 (request return types)
    combinators.test-d.ts                # TL-007–TL-009 (combinator return types)
    http-response.test-d.ts              # TL-010–TL-011 (response body accessor types)
    error-types.test-d.ts                # TL-012, INV-HC-6 (error union, _tag literals)
```

---

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|-----------------|
| Line coverage | ≥ 95% | GAMP 5 Category 5 (custom software) |
| Branch coverage | ≥ 90% | GAMP 5 Category 5 |
| Mutation score (aggregate) | ≥ 88% | ICH Q9 risk-proportionate testing |
| Mutation score (High-risk paths) | ≥ 95% | ICH Q9, High-risk invariant threshold |
| Type test coverage | 100% of public API types | ADR-HC-003 (Result-only contract requires type verification) |
| GxP integrity test coverage | 100% of High-risk invariants | `risk-assessment.md` High-risk requirement |

---

## Test Scope by Invariant

| Invariant | Risk Level | Required Tests | GxP Test File |
|-----------|-----------|----------------|---------------|
| INV-HC-1: Request immutability | Medium | Unit + type | — |
| INV-HC-2: Body caching | Low | Unit | — |
| INV-HC-3: Body single-consumption | **High** | Unit + type + GxP + mutation | `gxp-body-consumption.test.ts` |
| INV-HC-4: Error immutability | Low | Unit + GxP (defense-in-depth) | `gxp-error-freeze.test.ts` (FM-4; shared with INV-HC-5) |
| INV-HC-5: Populate-freeze-return | Negligible | Unit (defense-in-depth; see note) | `error-freezing.test.ts` (EF-001–EF-005); `gxp-error-freeze.test.ts` (FM-5; defense-in-depth) |
| INV-HC-6: Error discriminant | Negligible | Compile-time only | — |
| INV-HC-7: Never-throw contract | Medium | Unit + type | — |
| INV-HC-8: Response back-reference | Medium | Unit | — |
| INV-HC-9: Combinator order | Low | Unit | — |
| INV-HC-10: Header case-normalization | Medium | Unit | — |

> **Defense-in-depth note (INV-HC-4, INV-HC-5)**: These invariants are enforced at low/negligible risk by `Object.freeze()` in the source. The GxP tests (`gxp-error-freeze.test.ts`) and unit tests (`error-freezing.test.ts` EF-001–EF-005) go beyond the minimum required by their risk classification. They verify the populate-freeze-return ordering directly and are retained as defense-in-depth because error immutability is an ALCOA+ Original principle for audit trail integrity. See [ADR-HC-006](../decisions/006-error-freeze-for-alcoa.md).

---

## Qualification Protocols (GxP)

For deployments in GxP-regulated environments, the following protocols must be executed:

| Protocol | Scope | Tests That Satisfy It | Reference |
|----------|-------|----------------------|-----------|
| **IQ (Installation Qualification)** | Package installs, subpath exports resolve, TypeScript compiles | `pnpm install`, `tsc --noEmit` | `compliance/gxp.md` §OQ table |
| **OQ (Operational Qualification)** | All DoD items pass, all pyramid levels green | Full test suite + `17-definition-of-done.md` `OQ-HT-*` checks | `compliance/gxp.md` §OQ table |
| **PQ (Performance Qualification)** | Combinator overhead < 0.1ms, mock adapter throughput ≥ 10k req/s | Benchmark suite | `compliance/gxp.md` §PQ table |

Detailed IQ/OQ/PQ protocols are documented in [`compliance/gxp.md`](../compliance/gxp.md). This document defines the test pyramid that supports their execution.

---

## Test Data Strategy

| Test Level | Data Strategy |
|-----------|---------------|
| Unit | Inline fixtures; no external network calls; frozen `HttpRequest` / `HttpResponse` factory functions |
| Type | Compile-time only; no runtime data |
| GxP Integrity | Programmatically constructed error objects; `Object.isFrozen` assertions; deterministic ordering tests |
| Integration | `MockHttpClientAdapter` from `@hex-di/http-client-testing`; no real network calls |
| Benchmarks | In-process mock adapter; no network I/O; isolated from CI flakiness |

---

## CI Integration

Tests run in the following CI stages (see [process/ci-maintenance.md](./ci-maintenance.md)):

1. `pnpm test --filter @hex-di/http-client` — full unit + integration + type test suite
2. `pnpm typecheck --filter @hex-di/http-client` — TypeScript strict mode compilation
3. `pnpm lint --filter @hex-di/http-client` — ESLint with no-any enforcement
4. Mutation tests: `pnpm stryker run` — on `main` merge only, not on every PR
