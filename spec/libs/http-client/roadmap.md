# @hex-di/http-client — Roadmap

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-RMP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/roadmap.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- spec/libs/http-client/roadmap.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- spec/libs/http-client/roadmap.md` |
| Status | Effective |

---

Planned future work for `@hex-di/http-client`. Items are organized by target release. Status values: **Planned** (not yet started), **Specified** (spec written, not yet implemented), **In Progress**, **Delivered**.

---

## Blocking Dependency Graph

```
Mutation Testing ──────────────────────────────────┐
Performance Benchmarks ────────────────────────────┤
React Hooks (spec only: delivered) ────────────────┤──► API Stability Guarantee ──► Full OQ
Streaming Support ─────────────────────────────────┤
HTTP/2 Server Push ────────────────────────────────┘
```

Key constraints:
- **API Stability Guarantee** must be declared before the 0.1.0 release tag is cut; all other 0.1.0 items are prerequisites.
- **Full OQ Test Execution** is gated on all other 0.1.0 items being **Delivered** (it qualifies the completed release, not individual features).
- **React Hooks implementation** may proceed in parallel with Streaming; neither blocks the other.
- Deferred items have no dependency on 0.1.0 delivery except where explicitly noted in their advancement criteria.

---

## 0.1.0 — Mutation Testing & Performance

### Mutation Testing

**Status**: Specified

**Scope**: Add Stryker mutation testing to the CI pipeline. Establish per-invariant mutation score targets (≥ 95% for High-risk, ≥ 88% aggregate). Focus initial coverage on INV-HC-3 (Body Single-Consumption), INV-HC-1 (Request Immutability), and INV-HC-7 (Never-Throw Contract).

**Deliverable**: Stryker configuration in `libs/http-client/core/stryker.config.json`; updated coverage targets in [process/test-strategy.md](./process/test-strategy.md).

---

### Performance Benchmarks

**Status**: Specified

**Scope**: Add Vitest benchmark suite measuring combinator overhead latency. Establish baselines for: `pipe()` with 5 combinators, `baseUrl` + `bearerAuth` + `timeout` + `retry` composition, single `execute()` call through mock adapter.

**Deliverable**: `libs/http-client/core/tests/benchmarks/` directory with at least 3 benchmark files; baseline numbers documented in [process/test-strategy.md](./process/test-strategy.md).

---

### React Hooks (`@hex-di/http-client-react`)

**Spec status**: **Delivered** — `spec/libs/http-client/react/` spec directory is complete.

**Implementation status**: **Planned** — `libs/http-client/react/` package is not yet implemented.

**Scope**: New package providing React hooks that expose `HttpClientPort` to React components via Context.

Planned hooks:
- `useHttpClient()` — resolves `HttpClientPort` from the nearest `HttpClientProvider`
- `useHttpRequest(request)` — executes a request reactively, returns `Result | undefined` with loading state
- `useHttpMutation()` — imperative mutation hook returning `[mutate, state]`

**Spec deliverable**: `spec/libs/http-client/react/` — **Done**.

**Implementation deliverable**: `libs/http-client/react/` package — Pending.

**Risk**: React 18+ Concurrent Mode transitions (Suspense / `useTransition`) may conflict with the `useHttpRequest` loading-state model. The spec mitigates this via `AbortController` lifecycle (ADR-HC-REACT-004) and Concurrent Mode safety analysis (`react/decisions/006-concurrent-rendering-safety.md`), but integration tests against React canary releases are required before 0.1.0.

---

## 0.1.0 — Streaming & WebSocket

### Streaming Support (`@hex-di/http-client-stream`)

**Status**: Planned

**Scope**: New package for Server-Sent Events (SSE) and `ReadableStream`-based response consumption. Not part of the core `HttpClient` interface (protocol-specific).

**Deliverable**: `spec/libs/http-client/stream/` spec directory (forthcoming); `libs/http-client/stream/` implementation package.

**Risk**: The WHATWG `ReadableStream` API is available in Node.js ≥ 18 and all modern browsers, but byte-mode streams and `pipeTo` semantics have cross-environment inconsistencies. The implementation must define a compatibility baseline (Node.js 18+, no IE) and test against the Fetch API's native `Response.body` across all supported transport adapters.

---

### HTTP/2 Server Push

**Status**: Planned

**Scope**: HTTP/2 server push support via the Undici transport adapter (`@hex-di/http-client-undici`). Requires extending the transport adapter contract.

**Deliverable**: Extension to `08-transport-adapters.md` §39; updated Undici adapter. Spec update forthcoming.

**Risk**: Undici's HTTP/2 server push API (`Client.dispatch` push streams) was experimental through Node.js 22 and is subject to breaking changes. This item is gated on Undici reaching a stable push API contract. If Undici removes or substantially changes server push before it stabilizes, the deliverable scope reduces to specification only (no implementation), and the item moves to Deferred.

---

## 0.1.0 — Stable API

### API Stability Guarantee

**Status**: Planned

**Scope**: Declare the `HttpClient`, `HttpRequest`, `HttpResponse`, `HttpClientError`, and combinator interfaces stable. No breaking changes after 0.1.0 without a major version bump.

**Deliverable**: Updated ADR documenting the stability boundary; CHANGELOG entry.

---

### Full OQ Test Execution

**Status**: Planned

**Scope**: Run all 116 OQ checks (OQ-HT-01 through OQ-HT-93 + chaos/load/soak) as part of the 0.1.0 release qualification. Document results in a release qualification report.

**Deliverable**: Qualification report in `compliance/` directory (GxP deployments only).

---

## Deferred / Under Consideration

Items in this section are not planned for any specific release. Advancement criteria are listed for each item — when criteria are met, the item moves to the next scheduled release section with **Status: Planned**.



### GraphQL Client (`@hex-di/graphql-client`)

**Status**: Planned

**Scope**: GraphQL-specific client built on top of `@hex-di/http-client`. Separate package — GraphQL concerns (operation types, variables, fragments) do not belong in the core HTTP client.

**Deliverable**: Separate spec and package outside `http-client` scope.

**Advancement criteria**: `@hex-di/http-client` 0.1.0 reaches stable API; a concrete consumer use case requiring typed GraphQL operations is identified.

---

### Cookie Jar / Session Management

**Status**: Planned

**Scope**: Stateful HTTP session management (cookies, redirects with cookie forwarding). Likely a combinator or separate `@hex-di/http-client-session` package rather than a core feature.

**Deliverable**: TBD — requires design decision on scope boundary.

**Advancement criteria**: ADR written deciding between (a) combinator approach and (b) separate session package; at least one non-trivial consumer use case requiring cookie persistence is identified.

---

### Caching Layer Integration

**Status**: Planned

**Scope**: HTTP caching (Cache-Control, ETag/If-None-Match, stale-while-revalidate) via combinator or integration with `@hex-di/query`. This is a consumer-side concern by design (see `01-overview.md` §What this package does NOT provide).

**Deliverable**: TBD — likely an ADR extending ADR-HC-001 (combinators) to cover caching interceptors.

**Advancement criteria**: `@hex-di/query` 0.1.0 reaches stable API; caching boundary between query-level and transport-level cache is resolved by ADR.

---

### Request Deduplication / In-Flight Coalescing

**Status**: Planned

**Scope**: When multiple callers fire identical requests concurrently (same method + URL + headers), deduplicate them into a single in-flight transport call and fan the single `Result` back to all waiters. This is a consumer-side combinator concern (not a transport concern) and must not violate INV-HC-1 (request immutability) or INV-HC-7 (never-throw).

**Deliverable**: TBD — likely a `deduplicateInFlight()` combinator in `libs/http-client/core/src/combinators/`; spec extension to `07-client-combinators.md`.

**Advancement criteria**: A concrete consumer use case requiring deduplication (e.g., parallel component mounts triggering duplicate auth-token refreshes) is identified and documented; the combinator design does not require shared mutable state at the `HttpClient` level (must remain a pure function wrapping the client).

---

### WebSocket Client (`@hex-di/ws-client`)

**Status**: Planned

**Scope**: A separate port-and-adapter abstraction for WebSocket connections, with the HTTP upgrade handshake delegated to `@hex-di/http-client`'s transport layer. Out of scope for the core HTTP client — WebSocket is a different protocol with different lifetime and framing semantics.

**Deliverable**: Separate spec (`spec/libs/ws-client/`) and package (`libs/ws-client/`) outside `http-client` scope.

**Advancement criteria**: `@hex-di/http-client` 0.1.0 reaches stable API; the HTTP-to-WebSocket upgrade handshake contract is specified in an ADR; at least one consumer use case requiring duplex messaging is identified.
