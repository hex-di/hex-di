# @hex-di/http-client — Competitive Analysis

> **Regulatory disclaimer**: This document is informational, not normative. The comparisons below reflect the design intent and documented behaviors of each library at the time of writing (February 2026). Scores represent an opinion of fit for the HexDI use case and are not a general endorsement or criticism of any library. Production decisions should be based on evaluation against your specific requirements.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-CMP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/comparisons/competitors.md` |
| Status | Informational |

---

## Packages Under Comparison

| Package | Version (at writing) | Weekly Downloads | Stars | License | Maintenance |
|---------|---------------------|-----------------|-------|---------|------------|
| `@hex-di/http-client` | 0.1.0 | — (new) | — (new) | MIT | Active |
| `axios` | 1.7.x | ~54M / week | ~106k | MIT | Active |
| `ky` | 1.x | ~3M / week | ~14k | MIT | Active |
| `ofetch` | 1.3.x | ~12M / week | ~5k | MIT | Active |
| `node-fetch` | 3.x | ~32M / week | ~9k | MIT | Maintenance mode |
| `got` | 14.x | ~8M / week | ~14k | MIT | Active |

---

## Scoring Dimensions

Scores are 0–10 on each dimension. Definitions:

| Dimension | What is scored |
|-----------|---------------|
| **DI / Port compatibility** | How easily the library integrates as a resolved dependency in a DI container without global state |
| **Typed error channel** | Whether errors are in the type signature rather than thrown; exhaustive discriminated union |
| **Immutable requests** | Whether request objects are value types (frozen, no mutation) rather than mutable config objects |
| **Composable middleware** | Whether cross-cutting concerns (auth, retry, timeout) are expressed as pure functions over the client rather than imperative interceptors |
| **Result / no-throw** | Whether the API guarantees no thrown exceptions (all errors in a typed return value) |
| **GxP / audit compliance** | Whether the library provides or makes easy: audit trail integration, ALCOA+ compliant error objects, HTTPS enforcement, credential protection |
| **Testing ergonomics** | Whether mocking / intercepting is type-safe, isolated (no global state), and composable |
| **Bundle size** | Suitability for browser / edge environments (lower is better) |

---

## Score Matrix

| Dimension | `@hex-di/http-client` | `axios` | `ky` | `ofetch` | `node-fetch` | `got` |
|---|---|---|---|---|---|---|
| DI / Port compatibility | **10** | 4 | 5 | 5 | 3 | 4 |
| Typed error channel | **10** | 3 | 4 | 3 | 2 | 4 |
| Immutable requests | **10** | 2 | 3 | 3 | 2 | 2 |
| Composable middleware | **9** | 5 | 6 | 6 | 2 | 5 |
| Result / no-throw | **10** | 1 | 2 | 2 | 1 | 2 |
| GxP / audit compliance | **10** | 1 | 1 | 1 | 1 | 1 |
| Testing ergonomics | **9** | 5 | 6 | 5 | 4 | 5 |
| Bundle size | 6 | 5 | 9 | 8 | 8 | 4 |
| **Total** | **74** | **26** | **36** | **33** | **23** | **27** |

---

## Dimension Analysis

### DI / Port Compatibility

`@hex-di/http-client` scores 10 because it is designed from the ground up as a port in a DI container — the transport adapter is an `Adapter` registered with `GraphBuilder`, and the `HttpClientPort` is resolved by the container. There is no global state; each container has its own isolated client instance.

Competitors score low because they expose global or module-level instances by default. While wrappers and service classes can be written, they require boilerplate and don't integrate natively with a DI graph.

### Typed Error Channel

`@hex-di/http-client` surfaces all errors as `Err(HttpClientError)` with a three-variant discriminated union (`HttpRequestError | HttpResponseError | HttpBodyError`). TypeScript enforces exhaustiveness at `switch` statements.

All competitors throw `Error` subtypes and rely on `instanceof` checks or `error.response` field inspection after `catch`. Neither is as type-safe nor as exhaustive.

### Immutable Requests

`@hex-di/http-client` uses `Object.freeze()` on all `HttpRequest` instances with `readonly` TypeScript fields. Combinators return new instances.

Competitors use mutable config objects (`AxiosRequestConfig`, `RequestInit`, `got.Options`) that can be accidentally mutated after creation.

### Composable Middleware

`@hex-di/http-client` combinators are pure functions `(HttpClient) => HttpClient`, composed via `pipe()`. The execution order is visible in the source code.

`axios` and `got` use imperative interceptor arrays with `use()` / `eject()` calls. `ky` uses hooks (`beforeRequest`, `afterResponse`). Both approaches have implicit ordering semantics.

### Result / No-Throw

`@hex-di/http-client` never throws — all errors including network failures, timeouts, and body parse errors are returned as `Err`. Application code never needs `try/catch`.

All competitors throw on network errors and (depending on configuration) on 4xx/5xx status codes.

### GxP / Audit Compliance

`@hex-di/http-client` is the only library reviewed that provides: audit trail port integration, ALCOA+ compliant frozen error objects, HTTPS enforcement combinators, credential redaction, and electronic signature hooks. These are optional port adapters.

No competitor library provides GxP-specific features.

### Testing Ergonomics

`@hex-di/http-client-testing` provides: `createMockHttpClient` (in-memory, no network), `createRecordingClient` (captures requests for assertion), `mockResponse` factory, and Vitest matchers (`toHaveBeenCalledWith`, `toHaveRespondedWith`). All testing utilities are pure functions; no global `nock` or `msw` setup required (though MSW integration is also supported as a transport adapter).

Competitors typically rely on `nock`, `msw`, or `jest.mock('axios')` for mocking — global, process-level mocking that can cause test isolation problems.

### Bundle Size

`@hex-di/http-client` core has moderate bundle size due to the Result type dependency (`@hex-di/result`). `ky` and `ofetch` are smaller because they are thin `fetch` wrappers without the typed error infrastructure.

---

## Maintenance Status Assessment

| Package | Status | Notes |
|---------|--------|-------|
| `@hex-di/http-client` | Active — maintained as part of hex-di monorepo | |
| `axios` | Active — widely used, stable API since v1.0 | |
| `ky` | Active — maintained by Sindre Sorhus | |
| `ofetch` | Active — maintained by UnJS team (Nuxt ecosystem) | |
| `node-fetch` | Maintenance mode — Node 18+ native `fetch` reduces need | Last major release 2022 |
| `got` | Active — Node.js only | |

---

## When to Use Alternatives

| Scenario | Recommendation |
|----------|---------------|
| Minimal bundle size, browser-only, no DI | `ky` or `ofetch` |
| Node.js with extensive retry/pagination needs, no DI | `got` |
| Existing `axios` codebase, no DI migration planned | Keep `axios` |
| HexDI application, type-safe errors, testable | **`@hex-di/http-client`** |
| Regulated (GxP) environment, HexDI application | **`@hex-di/http-client`** (only option with compliance support) |
