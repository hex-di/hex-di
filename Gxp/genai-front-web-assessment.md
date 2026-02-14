# GxP Compliance Assessment: genai-front-web

**Date:** 2026-02-10
**Regulatory Framework:** FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ALCOA+ Data Integrity Guidance
**Target Project:** `@sanofi-genai-commercial/app` (React SPA, Vite, TypeScript)
**Proposed Solution:** HexDi Stack (Core, Runtime, Result, Tracing, Logger, Store, Query, Saga, Flow)

---

## 1. Project Profile

| Attribute        | Value                                              |
| ---------------- | -------------------------------------------------- |
| Framework        | React 18 + Vite                                    |
| State Management | Zustand (30+ stores, ~6,900 LOC)                   |
| API Layer        | openapi-fetch with MSAL token injection            |
| Authentication   | Azure MSAL SSO (session storage, PII filtering)    |
| Feature Flags    | LaunchDarkly (38+ flags)                           |
| Monitoring       | Datadog RUM (session replay, resource tracking)    |
| AI Tracing       | Langfuse (feedback only)                           |
| Analytics        | Google Analytics (gtag)                            |
| Validation       | Zod + react-hook-form                              |
| Testing          | Vitest (unit) + Playwright (E2E)                   |
| CI/CD            | GitHub Actions (lint, test, e2e, dependency audit) |
| Source Files     | ~1,110                                             |
| Test Files       | ~104 (~9% file-level coverage)                     |

---

## 2. Current State Assessment

### 2.1 Audit Trail (21 CFR Part 11.10(e))

**Score: 1/10**

No mechanism records who did what, when, or why. Zustand stores mutate state via `set()` without event logging. No action history is maintained. User actions (content generation, MLR review, translations) are fire-and-forget with no persistent record.

**Evidence:**

- `src/stores/user.ts`: `setUser` directly overwrites state with no event emission
- `src/stores/editor-data.ts`: 700+ LOC store with `console.log` debug statements but no audit events
- No audit-related files or patterns found across the codebase

---

### 2.2 Data Integrity (ALCOA+)

**Score: 2/10**

| ALCOA+ Principle    | Status                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Attributable**    | Partial - MSAL user identity exists but is not systematically linked to data mutations |
| **Legible**         | Partial - UI displays data but no structured export for compliance review              |
| **Contemporaneous** | Missing - No timestamps on state transitions, only `lastModified` on some stores       |
| **Original**        | Missing - No original record preservation; state is overwritten in place               |
| **Accurate**        | Partial - Zod validation at form boundaries only                                       |
| **Complete**        | Missing - No completeness checks on data records                                       |
| **Consistent**      | Missing - No cross-store consistency validation                                        |
| **Enduring**        | Missing - `localStorage` persistence with no integrity verification                    |
| **Available**       | Partial - Data accessible in browser but no structured retrieval API                   |

**Evidence:**

- `src/stores/editor-data.ts:214`: `persist` middleware stores to `localStorage` with no integrity hash
- `src/lib/api/client/common.ts:57-69`: `logMessage()` only logs on `localhost`, production logging is a comment placeholder

---

### 2.3 Error Handling

**Score: 3/10**

Ad-hoc error handling with ~52 try/catch blocks scattered across stores and routes. Errors are caught and either logged to console or silently stored as string state (`set({ error: 'message' })`). No centralized error boundary despite `react-error-boundary` being a dependency (used only in 1 NPS survey component).

A local `Result` type exists (`src/lib/result.ts`) with `success`/`failure` discriminated union, `mapResult`, `unwrapResult`, and `wrapAsync` utilities. This is a positive signal but is not systematically adopted across the codebase.

**Evidence:**

- `src/lib/api/client/common.ts:47-54`: `isApiError` type guard uses `as ApiError` cast
- `src/stores/editor-data.ts:254-259`: Errors caught and stored as interpolated strings: ``set({ error: `Failed to load template: ${error}` })``
- `src/lib/result.ts`: Well-documented Result type exists but limited adoption
- `react-error-boundary` imported only in `src/features/nps/nps-survey-provider.tsx`

---

### 2.4 Traceability / Observability

**Score: 2/10**

Datadog RUM is initialized in `src/main.tsx:25-41` for session replay, user interaction tracking, resource tracking, and long task monitoring. However, there is no distributed tracing, no correlation IDs, and no span-based request tracking. Langfuse is present but only for AI feedback collection, not operational tracing.

No mechanism exists to correlate a user action through its entire lifecycle: UI event -> state change -> API call -> response handling -> state update.

**Evidence:**

- `src/main.tsx:25-41`: Datadog RUM configuration with 100% session sampling
- `src/components/langfuse/`: Contains `feedback-form.tsx` and `global-feedback.tsx` only
- `src/lib/api/client/common.ts:33`: Raw `fetch()` call with no tracing headers
- No correlation ID generation anywhere in the codebase

---

### 2.5 Access Control (21 CFR Part 11.10(d))

**Score: 6/10**

Azure MSAL SSO provides a solid authentication foundation with session storage, PII filtering in MSAL logs, token renewal offset handling, and silent/redirect token acquisition. Role-based checks exist (`isManager`, `isGlobalMarketer`, `isLocalMarketer` in `src/stores/user.ts`). LaunchDarkly feature flags (38+ flags in `src/lib/feature-flags.ts`) provide granular feature access.

However, authorization enforcement is UI-only. There is no route-level RBAC middleware, no component-level access gates beyond feature flags, and backend enforcement is assumed but not verified from the frontend.

**Evidence:**

- `src/lib/msal/config.ts:31-90`: Comprehensive MSAL configuration with secure cookies in production
- `src/lib/msal/token.ts`: Token acquisition with redirect fallback for expired sessions
- `src/stores/user.ts:27-32`: Role checks based on `role.id` string patterns
- `src/lib/feature-flags.ts`: 38+ feature flags with kebab-case typed accessor

---

### 2.6 Electronic Records Validation (21 CFR Part 11.10(a))

**Score: 3/10**

TypeScript type-checking (`tsgo`) runs in CI. ESLint and Biome format checks are enforced. However, there is no formal IQ/OQ/PQ validation process, no validation protocol documentation, and no system requirement specifications traceable to test cases.

**Evidence:**

- `.github/workflows/ci.yaml`: CI runs `typecheck`, `lint`, `format:check`, `test`, `e2e`, `audit`
- No validation protocol documents found
- No traceability matrix linking requirements to tests

---

### 2.7 Change Control

**Score: 5/10**

GitHub Actions CI provides automated quality gates: lint, type-check, unit tests, E2E tests, and dependency audit. PR templates and commit lint (`@commitlint/config-conventional`) enforce standards. Multiple deploy workflows exist for dev, staging, and production environments. Label automation and PR title validation are configured.

However, there is no formal change control board, no approval workflow enforced in CI pipelines (no required reviewers configured in workflows), and no signed commits.

**Evidence:**

- `.github/workflows/`: 13 workflow files covering CI, deploy, PR management
- `.github/workflows/ci.yaml:182-205`: `pnpm audit --omit=dev` dependency security audit
- `.github/pull_request_template.md`: PR template exists
- `@commitlint/cli` and `@commitlint/config-conventional` in devDependencies

---

### 2.8 State Management Determinism

**Score: 2/10**

30+ Zustand stores manage application state with mutable `set()` calls. No action serialization, no event sourcing, and no replay capability. Debug logging uses emoji-prefixed console.logs (`console.log('🔄 Store Update...')`). The `devtools` middleware enables Zustand DevTools but provides no audit capability. State transitions are not deterministic or reproducible.

**Evidence:**

- `src/stores/editor-data.ts:309-339`: `updateCustomEditorContent` with emoji debug logging
- `src/stores/editor-data.ts:396-404`: `loadBeeEditorTemplate` dispatches `CustomEvent` on `window` (global side effect)
- `src/stores/translation-memory.ts`: 440 LOC store with 9 try/catch blocks
- All stores use `zustand/middleware/devtools` but no audit middleware

---

### 2.9 Logging & Monitoring

**Score: 1/10**

The `logMessage()` utility in `src/lib/api/client/common.ts:57-69` conditionally logs only when `window.location.hostname === 'localhost'`. Production has zero structured application logging. Approximately 56 `console.log/error/warn` calls are scattered across the codebase with no consistent format, no context propagation, and no log levels.

Datadog RUM captures browser-level events (session replay, resource timing, long tasks) but not application-level audit events.

**Evidence:**

- `src/lib/api/client/common.ts:57-69`: `logMessage()` - localhost-only, no production path
- `src/lib/msal/config.ts:59-88`: MSAL logger configured with `console[level]` only
- `src/stores/editor-data.ts`: 8 `console.log` calls with emoji prefixes for debugging

---

### 2.10 Testing & Validation (GAMP 5)

**Score: 3/10**

104 test files across 1,110 source files (~9% file-level coverage). Tests are primarily component-level (Testing Library) and utility function tests. Store tests cover 5 of 30+ stores. E2E tests exist via Playwright but MLR-related tests are explicitly excluded from CI (`--grep-invert 'MLR'`). No integration tests between stores and API layer. No traceability matrix.

**Evidence:**

- `src/stores/__tests__/`: 5 test files (drawer-manager, localization-output, settings, translation-memory-ui, user-management)
- `src/features/`: Tests concentrated in gen-assistant, mlr, and nps features
- `.github/workflows/ci.yaml:170`: `playwright test --grep-invert "MLR"` skips MLR E2E tests
- No test coverage thresholds configured in CI

---

### 2.11 Architecture / Separation of Concerns

**Score: 3/10**

Feature-based folder structure (`features/brand-manager`, `features/gen-assistant`, etc.) provides moderate organization. However, there is no formal port/adapter separation. The API client (`openapi-fetch`) is directly imported everywhere. Stores directly call APIs and manage side effects. Global singletons dominate service instantiation (`msalInstance`, `queryClient`). No dependency injection framework.

**Evidence:**

- `src/services.ts`: Global singleton `msalInstance = new PublicClientApplication(msalConfig)`
- `src/lib/query-client.ts`: Global singleton `queryClient = new QueryClient({...})`
- `src/lib/api/client/api.ts`: Global singletons `{ GET, POST, PUT, DELETE, PATCH }`
- `src/stores/editor-data.ts:553`: Cross-store access via `useUserStore.getState()` (tight coupling)

---

### 2.12 Electronic Signatures (21 CFR Part 11.50-11.300)

**Score: 0/10**

No electronic signature capability exists. Content approval workflows, MLR review decisions, and translation sign-offs have no cryptographic or authenticated signature mechanism. No signature manifest, no signature-to-record binding, no signature meaning declaration.

---

## 3. Current Overall Score

| #   | Dimension                             |   Score    |
| --- | ------------------------------------- | :--------: |
| 1   | Audit Trail                           |    1/10    |
| 2   | Data Integrity (ALCOA+)               |    2/10    |
| 3   | Error Handling                        |    3/10    |
| 4   | Traceability / Observability          |    2/10    |
| 5   | Access Control                        |    6/10    |
| 6   | Electronic Records Validation         |    3/10    |
| 7   | Change Control                        |    5/10    |
| 8   | State Management Determinism          |    2/10    |
| 9   | Logging & Monitoring                  |    1/10    |
| 10  | Testing & Validation                  |    3/10    |
| 11  | Architecture / Separation of Concerns |    3/10    |
| 12  | Electronic Signatures                 |    0/10    |
|     | **Overall**                           | **2.6/10** |

---

## 4. Projected State with HexDi Stack

### 4.1 Audit Trail

**Score: 8/10 (+7)**

HexDi Store provides action history tracking with timestamps for every state transition. Saga provides full event audit trails with typed events: `SagaStartedEvent`, `StepStartedEvent`, `StepCompletedEvent`, `StepFailedEvent`, `StepSkippedEvent`, `CompensationStartedEvent`, `CompensationStepEvent`, `CompensationCompletedEvent`, `CompensationFailedEvent`, `SagaCompletedEvent`, `SagaFailedEvent`, `SagaCancelledEvent`.

Every content generation, MLR review, and translation workflow becomes a tracked saga with persistent event log. Tracing correlates all actions with W3C Trace Context. Store action history enables filtering, replay, and undo/redo.

**HexDi Components:** `@hex-di/store` (action history), `@hex-di/saga` (event streams), `@hex-di/tracing` (correlation)

---

### 4.2 Data Integrity (ALCOA+)

**Score: 7/10 (+5)**

| ALCOA+ Principle    | HexDi Improvement                                                                   |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Attributable**    | Context variables propagate user identity through the entire resolution chain       |
| **Legible**         | Structured logging with `@hex-di/logger`, `toJSON()` serialization on Result errors |
| **Contemporaneous** | Store action history with timestamps, saga events with timing                       |
| **Original**        | Saga persistence preserves original workflow state, store hydration for snapshots   |
| **Accurate**        | Result monads eliminate silent failures, frozen error objects prevent tampering     |
| **Complete**        | Saga event streams capture every step including skipped and compensated             |
| **Consistent**      | Compile-time graph validation ensures consistent wiring                             |
| **Enduring**        | Saga persistence with `ResultAsync` error handling for storage I/O                  |
| **Available**       | Inspection APIs provide queryable state snapshots on demand                         |

**HexDi Components:** `@hex-di/result` (accuracy), `@hex-di/saga` (completeness), `@hex-di/core` (deterministic IDs)

---

### 4.3 Error Handling

**Score: 9/10 (+6)**

`@hex-di/result` provides Rust-style `Result<T, E>` and `ResultAsync<T, E>` across the entire stack. Error codes (HEX001-HEX028) provide machine-readable classification. `toJSON()` serialization enables audit-grade error logging. Constructors like `fromThrowable()`, `tryCatch()`, and `fromPromise()` capture all exceptions as values. Combinators (`all`, `allSettled`, `any`, `collect`) handle parallel operations. No silent failures possible when systematically adopted.

Replaces the existing local `Result` type in `src/lib/result.ts` with a comprehensive, ecosystem-wide error handling system.

**HexDi Components:** `@hex-di/result` (core), `@hex-di/result-testing` (assertions), `@hex-di/core` (error codes)

---

### 4.4 Traceability / Observability

**Score: 9/10 (+7)**

`@hex-di/tracing` provides W3C Trace Context for cross-system correlation. Span-based request tracking through the entire resolution chain. The `tracing-datadog` package integrates directly with the existing Datadog RUM infrastructure. `@hex-di/logger` provides structured logging with automatic correlation ID linking. Container inspection APIs provide runtime state snapshots on demand.

Every API call, state mutation, and side effect becomes a traceable span with attributes, events, and timing data.

**HexDi Components:** `@hex-di/tracing` (spans), `@hex-di/tracing-datadog` (Datadog bridge), `@hex-di/logger` (correlated logs)

---

### 4.5 Access Control

**Score: 8/10 (+2)**

Existing MSAL SSO is preserved. HexDi scoped containers enable per-request/per-user service isolation. Resolution hooks can enforce authorization at service instantiation time. Context variables propagate user identity through the entire resolution chain. Directed ports (inbound/outbound) enable clean RBAC enforcement at the architectural level.

**HexDi Components:** `@hex-di/runtime` (scoped containers), `@hex-di/core` (context variables, directed ports)

---

### 4.6 Electronic Records Validation

**Score: 6/10 (+3)**

HexDi's compile-time graph validation (5-step process) catches configuration errors before runtime. Type-safe ports and adapters make invalid configurations unrepresentable at the type level. `@hex-di/result-testing` and memory adapters enable deterministic test doubles. Graph inspection enables automated dependency auditing in CI.

Formal IQ/OQ/PQ processes still require organizational adoption beyond what the framework provides.

**HexDi Components:** `@hex-di/graph` (compile-time validation), `@hex-di/result-testing` (deterministic testing)

---

### 4.7 Change Control

**Score: 7/10 (+2)**

Graph inspection enables automated dependency auditing in CI pipelines. Container snapshots document the exact service graph at deployment time. Deterministic output ordering (alphabetically sorted) enables diff-based change detection between releases. Frozen objects prevent runtime mutation of configuration.

Formal change control board processes still require organizational adoption.

**HexDi Components:** `@hex-di/graph` (inspection), `@hex-di/runtime` (snapshots), `@hex-di/core` (determinism)

---

### 4.8 State Management Determinism

**Score: 9/10 (+7)**

`@hex-di/store` replaces Zustand with pure reducer-based state transitions. Action history with filtering, replay, and undo/redo is built in. The effects-as-data pattern means side effects are declared as data structures, not executed inline. Batched updates with deterministic ordering ensure reproducible state sequences. Store inspector provides subscriber graph and state snapshot visualization.

Every state change is serializable, replayable, and auditable.

**HexDi Components:** `@hex-di/store` (state management), `@hex-di/flow` (state machines for complex workflows)

---

### 4.9 Logging & Monitoring

**Score: 8/10 (+7)**

`@hex-di/logger` provides structured logging with context propagation, PII redaction utilities, sampling, and rate limiting. Memory adapter enables deterministic log testing. Correlation ID extraction from tracing context links every log entry to its trace. Log handler adapters (Winston, Pino, Bunyan) route to GxP-compliant enterprise log aggregators.

Replaces scattered `console.log` calls and the localhost-only `logMessage()` with production-grade structured logging.

**HexDi Components:** `@hex-di/logger` (structured logging), `@hex-di/logger-winston` or `@hex-di/logger-pino` (enterprise backends)

---

### 4.10 Testing & Validation

**Score: 6/10 (+3)**

Memory adapters for all ports enable deterministic unit testing without external dependencies. Override builder provides controlled dependency substitution for integration tests. Inspection APIs enable assertions on container state, singleton resolution, and scope trees. Graph validation catches wiring errors at compile time. Result matchers provide assertion libraries for error handling tests.

Organizational commitment to write comprehensive tests and create traceability matrices is still required.

**HexDi Components:** `@hex-di/result-testing` (matchers), `@hex-di/runtime` (override builder), all packages (memory adapters)

---

### 4.11 Architecture / Separation of Concerns

**Score: 9/10 (+6)**

Full hexagonal architecture with directed ports (inbound/outbound), adapters, and compile-time validated dependency graphs. `GraphBuilder` replaces global singletons with scoped, inspectable containers. `@hex-di/react` provides React integration via hooks (clean adapter layer isolating React from domain logic). Every dependency is explicit, inspectable, and replaceable.

Replaces global singletons (`msalInstance`, `queryClient`, `{ GET, POST, ... }`) with port-based service access. Eliminates cross-store coupling (`useUserStore.getState()` from within other stores).

**HexDi Components:** `@hex-di/core` (ports/adapters), `@hex-di/graph` (validation), `@hex-di/runtime` (containers), `@hex-di/react` (hooks)

---

### 4.12 Electronic Signatures

**Score: 3/10 (+3)**

HexDi provides the infrastructure foundation: audit trail (who, when, what), user attribution (context variables), deterministic state (store), and workflow orchestration (saga/flow). Saga can model the signing flow as a multi-step process with compensation. Flow can enforce valid signature state transitions via typed state machines with guards.

However, the cryptographic signature implementation itself (hash generation, certificate binding, signature meaning declaration per 21 CFR Part 11.50) requires a dedicated e-signature adapter built on top of the HexDi infrastructure.

**HexDi Components:** `@hex-di/saga` (workflow), `@hex-di/flow` (state machine), `@hex-di/store` (signature state)

---

## 5. Projected Overall Score

| #   | Dimension                             | Current | With HexDi |  Delta   |
| --- | ------------------------------------- | :-----: | :--------: | :------: |
| 1   | Audit Trail                           |    1    |     8      |  **+7**  |
| 2   | Data Integrity (ALCOA+)               |    2    |     7      |  **+5**  |
| 3   | Error Handling                        |    3    |     9      |  **+6**  |
| 4   | Traceability / Observability          |    2    |     9      |  **+7**  |
| 5   | Access Control                        |    6    |     8      |    +2    |
| 6   | Electronic Records Validation         |    3    |     6      |    +3    |
| 7   | Change Control                        |    5    |     7      |    +2    |
| 8   | State Management Determinism          |    2    |     9      |  **+7**  |
| 9   | Logging & Monitoring                  |    1    |     8      |  **+7**  |
| 10  | Testing & Validation                  |    3    |     6      |    +3    |
| 11  | Architecture / Separation of Concerns |    3    |     9      |  **+6**  |
| 12  | Electronic Signatures                 |    0    |     3      |    +3    |
|     | **Overall**                           | **2.6** |  **7.4**   | **+4.8** |

---

## 6. Highest Impact Areas

The six dimensions where HexDi moves the needle most (+6 or greater):

| Rank | Dimension         | Delta | Key HexDi Package                                                 |
| ---- | ----------------- | :---: | ----------------------------------------------------------------- |
| 1    | Audit Trail       |  +7   | `@hex-di/saga` (event streams) + `@hex-di/store` (action history) |
| 2    | Traceability      |  +7   | `@hex-di/tracing` + `@hex-di/tracing-datadog`                     |
| 3    | Logging           |  +7   | `@hex-di/logger` + enterprise backend adapters                    |
| 4    | State Determinism |  +7   | `@hex-di/store` (pure reducers) + `@hex-di/flow` (state machines) |
| 5    | Error Handling    |  +6   | `@hex-di/result` + `@hex-di/result-testing`                       |
| 6    | Architecture      |  +6   | `@hex-di/core` + `@hex-di/graph` + `@hex-di/runtime`              |

---

## 7. Natural Integration Points

Three areas where HexDi has the most natural fit with the existing genai-front-web stack:

### 7.1 Datadog RUM -> HexDi Tracing-Datadog

The project already initializes Datadog RUM (`src/main.tsx:25-41`). `@hex-di/tracing-datadog` bridges HexDi's span-based tracing directly into Datadog APM, adding distributed tracing, correlation IDs, and structured span attributes to the existing monitoring infrastructure without requiring a new observability vendor.

### 7.2 Zustand Stores -> HexDi Store

The 30+ Zustand stores can be incrementally migrated to `@hex-di/store`. The pure-reducer pattern, action history, and effects-as-data replace mutable `set()` calls with auditable, deterministic state management. The `@hex-di/store-react` integration provides React hooks that are drop-in compatible with existing component patterns.

### 7.3 Content/MLR/Translation Workflows -> HexDi Saga

Content generation, MLR review, and translation workflows are inherently multi-step processes. `@hex-di/saga` models these as typed saga definitions with compensation (rollback on failure), persistence (durable state), and full event audit trails. `@hex-di/flow` can model the state machine aspects (e.g., content status: draft -> review -> approved -> published).

---

## 8. Residual Gaps (What HexDi Cannot Solve Alone)

The following areas require organizational process changes beyond framework adoption:

| Gap                                  | Current Score | With HexDi | Residual Need                                                                          |
| ------------------------------------ | :-----------: | :--------: | -------------------------------------------------------------------------------------- |
| Formal IQ/OQ/PQ validation protocols |       3       |     6      | Validation documentation, protocol execution, evidence collection                      |
| Change control board                 |       5       |     7      | Formal approval workflows, signed commits, release management                          |
| Electronic signatures                |       0       |     3      | Cryptographic signature adapter, certificate management, signature meaning declaration |
| Traceability matrix                  |       3       |     6      | Requirement-to-test mapping, test plan documentation                                   |
| Test coverage targets                |       3       |     6      | Organizational commitment to write tests, coverage thresholds in CI                    |

---

## 9. Recommended Migration Strategy

### Phase 1: Foundation (Infrastructure)

1. Introduce `@hex-di/core`, `@hex-di/runtime`, `@hex-di/graph` as the DI foundation
2. Replace global singletons (`msalInstance`, `queryClient`) with port-based container access
3. Introduce `@hex-di/result` to replace the local `src/lib/result.ts`
4. Wire `@hex-di/react` hooks into the React provider tree

### Phase 2: Observability (Tracing + Logging)

1. Introduce `@hex-di/tracing` with `@hex-di/tracing-datadog` alongside existing Datadog RUM
2. Replace `logMessage()` and scattered console.logs with `@hex-di/logger`
3. Configure correlation ID propagation between tracing and logging
4. Add structured audit event logging at API boundaries

### Phase 3: State Management (Store + Flow)

1. Migrate critical stores (user, editor-data, content-project) to `@hex-di/store`
2. Introduce `@hex-di/flow` for content status state machines
3. Enable action history tracking for GxP-critical state transitions
4. Add store inspection to CI for regression detection

### Phase 4: Workflow Orchestration (Saga + Query)

1. Model content generation workflows as sagas with `@hex-di/saga`
2. Replace direct `openapi-fetch` usage with `@hex-di/query` ports
3. Enable saga persistence for durable workflow state
4. Add saga event logging to audit trail
