# @hex-di/guard-cedar — Overview

## Package Metadata

| Field              | Value                              |
| ------------------ | ---------------------------------- |
| Name               | `@hex-di/guard-cedar`              |
| Version            | 0.1.0                              |
| License            | MIT                                |
| Repository         | `libs/guard/cedar`                 |
| Module format      | ESM                                |
| Side effects       | None (WASM loaded on factory call) |
| Node version       | >= 20                              |
| TypeScript version | >= 5.6                             |

---

## Mission

Provide a Cedar policy engine adapter for `@hex-di/guard` that enables declarative, formally verifiable authorization policies evaluated in-process via WASM.

---

## Public API Surface

### Core Exports

| Export               | Kind             | Source file      |
| -------------------- | ---------------- | ---------------- |
| `CedarEnginePort`    | interface        | `src/port.ts`    |
| `createCedarEngine`  | factory function | `src/factory.ts` |
| `createCedarAdapter` | factory function | `src/factory.ts` |
| `cedarPolicy`        | factory function | `src/policy.ts`  |

### Type Exports

| Export                       | Kind       | Source file            |
| ---------------------------- | ---------- | ---------------------- |
| `CedarAuthorizationRequest`  | interface  | `src/types.ts`         |
| `CedarAuthorizationResponse` | interface  | `src/types.ts`         |
| `CedarDiagnostics`           | interface  | `src/types.ts`         |
| `CedarEntityUid`             | interface  | `src/types.ts`         |
| `CedarEntity`                | interface  | `src/types.ts`         |
| `CedarValue`                 | type alias | `src/types.ts`         |
| `CedarSchema`                | interface  | `src/types.ts`         |
| `CedarAdapter`               | interface  | `src/types.ts`         |
| `CedarAdapterConfig`         | interface  | `src/types.ts`         |
| `CedarPolicyOptions`         | interface  | `src/types.ts`         |
| `CedarEvaluateOptions`       | interface  | `src/types.ts`         |
| `EntityMappingConfig`        | interface  | `src/entity-mapper.ts` |

### Error Exports

| Export                      | Kind       | Source file     |
| --------------------------- | ---------- | --------------- |
| `CedarEngineCreationError`  | type alias | `src/errors.ts` |
| `CedarEngineError`          | type alias | `src/errors.ts` |
| `CedarPolicyParseError`     | type alias | `src/errors.ts` |
| `CedarSchemaError`          | type alias | `src/errors.ts` |
| `EntityMappingError`        | type alias | `src/errors.ts` |
| `SchemaConfigMismatchError` | type alias | `src/errors.ts` |
| `CedarAdapterError`         | type alias | `src/errors.ts` |

### Utility Exports

| Export                  | Kind      | Source file            |
| ----------------------- | --------- | ---------------------- |
| `CedarPolicyStore`      | interface | `src/policy-store.ts`  |
| `CedarValidationResult` | interface | `src/types.ts`         |
| `loadSchema`            | function  | `src/schema-loader.ts` |

---

## Subpath Exports

| Subpath               | Resolves to    | Description     |
| --------------------- | -------------- | --------------- |
| `@hex-di/guard-cedar` | `src/index.ts` | Full public API |

---

## Source File Map

| Source file              | Responsibility                                         |
| ------------------------ | ------------------------------------------------------ |
| `src/index.ts`           | Public API barrel export                               |
| `src/port.ts`            | `CedarEnginePort` interface definition                 |
| `src/engine.ts`          | WASM-backed Cedar engine implementation                |
| `src/factory.ts`         | `createCedarEngine` and `createCedarAdapter` factories |
| `src/policy.ts`          | `cedarPolicy` Guard PolicyConstraint factory           |
| `src/entity-mapper.ts`   | AuthSubject/Resource → Cedar Entity mapping            |
| `src/schema-loader.ts`   | Cedar schema loading and validation                    |
| `src/policy-store.ts`    | Cedar policy text storage                              |
| `src/decision-mapper.ts` | Cedar Response → Guard Decision mapping                |
| `src/errors.ts`          | Error type definitions (discriminated unions)          |
| `src/types.ts`           | Shared type definitions                                |

---

## Specification & Process Files

| File                               | Responsibility                                       |
| ---------------------------------- | ---------------------------------------------------- |
| `README.md`                        | Document Control hub + TOC                           |
| `01-overview.md`                   | Mission, scope, architecture                         |
| `02-cedar-engine-port.md`          | CedarEnginePort interface and request/response types |
| `03-policy-translation.md`         | Guard-Cedar policy integration model                 |
| `04-entity-mapping.md`             | Subject/Resource → Cedar entity translation          |
| `05-schema-management.md`          | Schema loading and validation                        |
| `06-decision-mapping.md`           | Cedar Response → Guard Decision translation          |
| `07-error-handling.md`             | Error taxonomy and recovery                          |
| `08-configuration.md`              | Adapter factory and DI integration                   |
| `09-definition-of-done.md`         | Test enumeration                                     |
| `overview.md`                      | This file — API surface and source map               |
| `invariants.md`                    | Runtime guarantees                                   |
| `glossary.md`                      | Domain terminology                                   |
| `decisions/001-*.md`               | ADR: Embedded WASM over HTTP Sidecar                 |
| `decisions/002-*.md`               | ADR: Entity DAG Mapping Strategy                     |
| `decisions/003-*.md`               | ADR: Schema-First Policy Authoring                   |
| `process/definitions-of-done.md`   | Feature-level acceptance checklist                   |
| `process/test-strategy.md`         | Test pyramid and coverage targets                    |
| `process/requirement-id-scheme.md` | CD prefix ID scheme                                  |
