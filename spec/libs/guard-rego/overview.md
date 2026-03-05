# @hex-di/guard-rego — Overview

## Package Metadata

| Field              | Value                |
| ------------------ | -------------------- |
| Name               | `@hex-di/guard-rego` |
| Version            | 0.1.0                |
| License            | MIT                  |
| Repository         | `libs/guard/rego`    |
| Module format      | ESM                  |
| Side effects       | None                 |
| Node version       | >= 20                |
| TypeScript version | >= 5.6               |

---

## Mission

Provide an OPA/Rego policy engine adapter for `@hex-di/guard` that enables Rego-based authorization policies evaluated via an OPA sidecar daemon's REST API.

---

## Public API Surface

### Core Exports

| Export              | Kind             | Source file      |
| ------------------- | ---------------- | ---------------- |
| `RegoEnginePort`    | interface        | `src/port.ts`    |
| `createRegoEngine`  | factory function | `src/factory.ts` |
| `createRegoAdapter` | factory function | `src/factory.ts` |
| `regoPolicy`        | factory function | `src/policy.ts`  |

### Type Exports

| Export                | Kind      | Source file    |
| --------------------- | --------- | -------------- |
| `OpaQueryRequest`     | interface | `src/types.ts` |
| `OpaQueryResponse`    | interface | `src/types.ts` |
| `OpaHealthStatus`     | interface | `src/types.ts` |
| `OpaMetrics`          | interface | `src/types.ts` |
| `OpaDecisionDocument` | interface | `src/types.ts` |
| `OpaInputDocument`    | interface | `src/types.ts` |
| `OpaInputSubject`     | interface | `src/types.ts` |
| `RegoAdapter`         | interface | `src/types.ts` |
| `RegoAdapterConfig`   | interface | `src/types.ts` |
| `RegoPolicyOptions`   | interface | `src/types.ts` |
| `RegoEvaluateOptions` | interface | `src/types.ts` |

### Error Exports

| Export                    | Kind       | Source file     |
| ------------------------- | ---------- | --------------- |
| `RegoEngineCreationError` | type alias | `src/errors.ts` |
| `RegoEngineError`         | type alias | `src/errors.ts` |
| `RegoDecisionParseError`  | type alias | `src/errors.ts` |
| `RegoInputMappingError`   | type alias | `src/errors.ts` |
| `RegoAdapterError`        | type alias | `src/errors.ts` |

---

## Subpath Exports

| Subpath              | Resolves to    | Description     |
| -------------------- | -------------- | --------------- |
| `@hex-di/guard-rego` | `src/index.ts` | Full public API |

---

## Source File Map

| Source file              | Responsibility                                       |
| ------------------------ | ---------------------------------------------------- |
| `src/index.ts`           | Public API barrel export                             |
| `src/port.ts`            | `RegoEnginePort` interface definition                |
| `src/client.ts`          | HTTP-backed OPA client implementation                |
| `src/factory.ts`         | `createRegoEngine` and `createRegoAdapter` factories |
| `src/policy.ts`          | `regoPolicy` Guard PolicyConstraint factory          |
| `src/input-mapper.ts`    | AuthSubject/Resource → OPA input document mapping    |
| `src/decision-mapper.ts` | OPA response → Guard Decision mapping                |
| `src/errors.ts`          | Error type definitions (discriminated unions)        |
| `src/types.ts`           | Shared type definitions                              |

---

## Specification & Process Files

| File                               | Responsibility                                      |
| ---------------------------------- | --------------------------------------------------- |
| `README.md`                        | Document Control hub + TOC                          |
| `01-overview.md`                   | Mission, scope, architecture                        |
| `02-rego-engine-port.md`           | RegoEnginePort interface and request/response types |
| `03-policy-translation.md`         | Guard-Rego policy integration model                 |
| `04-input-document-mapping.md`     | Subject/Resource → OPA input document translation   |
| `05-bundle-management.md`          | OPA bundle lifecycle and data documents             |
| `06-decision-mapping.md`           | OPA Response → Guard Decision translation           |
| `07-error-handling.md`             | Error taxonomy and recovery                         |
| `08-configuration.md`              | Adapter factory and DI integration                  |
| `09-definition-of-done.md`         | Test enumeration                                    |
| `overview.md`                      | This file — API surface and source map              |
| `invariants.md`                    | Runtime guarantees                                  |
| `glossary.md`                      | Domain terminology                                  |
| `decisions/001-*.md`               | ADR: HTTP Sidecar over Embedded WASM                |
| `decisions/002-*.md`               | ADR: Structured Decision Documents                  |
| `decisions/003-*.md`               | ADR: Input Document Convention                      |
| `process/definitions-of-done.md`   | Feature-level acceptance checklist                  |
| `process/test-strategy.md`         | Test pyramid and coverage targets                   |
| `process/requirement-id-scheme.md` | RG prefix ID scheme                                 |
