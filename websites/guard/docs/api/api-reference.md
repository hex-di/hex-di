---
sidebar_position: 1
title: API Reference
---

# API Reference

Complete reference for all exports from `@hex-di/guard`.

## Tokens

| Export                  | Type     | Description                                                     |
| ----------------------- | -------- | --------------------------------------------------------------- |
| `createPermission`      | function | Creates a branded nominal permission token using `Symbol.for()` |
| `Permission`            | type     | The branded permission token type                               |
| `createPermissionGroup` | function | Bundles related permissions into a named group                  |
| `PermissionGroup`       | type     | Type for permission groups                                      |
| `createRole`            | function | Creates a role with permissions and optional inheritance        |
| `Role`                  | type     | The role type with flattened permissions                        |

## Policy Combinators

| Export                 | Type     | Description                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| `hasPermission`        | function | Checks if subject has a specific permission     |
| `hasRole`              | function | Checks if subject has a specific role           |
| `hasAttribute`         | function | Checks if subject attribute matches a value     |
| `hasResourceAttribute` | function | Checks if resource attribute matches a value    |
| `hasSignature`         | function | Checks if electronic signature is present       |
| `hasRelationship`      | function | Checks if subject has relationship to resource  |
| `allOf`                | function | All sub-policies must grant (AND logic)         |
| `anyOf`                | function | At least one sub-policy must grant (OR logic)   |
| `not`                  | function | Inverts the decision of a sub-policy            |
| `withLabel`            | function | Attaches a human-readable label to a policy     |
| `anyOfRoles`           | function | Shorthand for `anyOf` with multiple role checks |
| `PolicyConstraint`     | type     | Discriminated union type for all policies       |

## Evaluation

| Export                     | Type     | Description                                    |
| -------------------------- | -------- | ---------------------------------------------- |
| `evaluate`                 | function | Synchronous pure policy evaluation             |
| `evaluateAsync`            | function | Async evaluation with attribute resolution     |
| `Decision`                 | type     | Result of policy evaluation with trace         |
| `EvaluationTrace`          | type     | Recursive tree of evaluation steps             |
| `EvaluationContext`        | type     | Context for resource attributes and signatures |
| `EvaluateOptions`          | type     | Options for evaluation (e.g., maxDepth)        |
| `AttributeResolver`        | type     | Async function for resolving attributes        |
| `RelationshipResolver`     | type     | Interface for resolving relationships          |
| `NoopRelationshipResolver` | const    | No-op implementation of relationship resolver  |

## Subject

| Export                | Type     | Description                                      |
| --------------------- | -------- | ------------------------------------------------ |
| `AuthSubject`         | type     | Identity with permissions, roles, and attributes |
| `createAuthSubject`   | function | Factory for creating auth subjects               |
| `withAttributes`      | function | Creates new subject with additional attributes   |
| `getAttribute`        | function | Type-safe attribute retrieval                    |
| `PrecomputedSubject`  | class    | Optimized subject with flattened permissions     |
| `SubjectProviderPort` | const    | Port for resolving current subject               |
| `SubjectProvider`     | type     | Interface for subject providers                  |

## Guard/Enforcement

| Export                        | Type     | Description                                      |
| ----------------------------- | -------- | ------------------------------------------------ |
| `enforcePolicy`               | function | Wraps adapter with policy enforcement            |
| `AccessDeniedError`           | const    | Error when policy denies access                  |
| `AuditWriteFailedError`       | const    | Error when audit trail write fails               |
| `createGuardGraph`            | function | Creates graph fragment with guard infrastructure |
| `createGuardHealthCheck`      | function | Creates health check for guard infrastructure    |
| `createCompletenessMonitor`   | function | Monitors audit trail completeness                |
| `GuardOptions`                | type     | Options for guard enforcement                    |
| `AuditEntry`                  | type     | Audit trail entry structure                      |
| `AuditTrail`                  | type     | Interface for audit trail implementations        |
| `AuditTrailPort`              | type     | Port for audit trail                             |
| `createNoopAuditTrailAdapter` | function | No-op audit trail for testing                    |

## GxP Infrastructure

| Export                           | Type     | Description                                    |
| -------------------------------- | -------- | ---------------------------------------------- |
| `createWriteAheadLog`            | function | Creates WAL for durability                     |
| `WalEntry`                       | type     | Write-ahead log entry                          |
| `createCircuitBreaker`           | function | Creates circuit breaker for fault tolerance    |
| `CircuitBreakerState`            | type     | Circuit breaker states (closed/open/half-open) |
| `detectClockDrift`               | function | Detects clock drift between components         |
| `checkClockDrift`                | function | Validates clock synchronization                |
| `enforceRetention`               | function | Applies retention policy to audit entries      |
| `getPurgeableEntries`            | function | Identifies entries for retention               |
| `RetentionPolicy`                | type     | Configuration for data retention               |
| `createMetaAuditEntry`           | function | Creates meta-audit entry                       |
| `MetaAuditTrail`                 | type     | Interface for meta-audit trail                 |
| `archiveAuditTrail`              | function | Archives audit entries to cold storage         |
| `createDecommissioningChecklist` | function | Generates system decommissioning checklist     |
| `createScopeDisposalVerifier`    | function | Verifies proper scope disposal                 |
| `createScopeRegistry`            | function | Manages scope lifecycle                        |

## Hooks

| Export               | Type     | Description                             |
| -------------------- | -------- | --------------------------------------- |
| `createPortGateHook` | function | Creates resolution hook for port gating |
| `createRoleGate`     | function | Shorthand for role-based port gating    |
| `PortGatedError`     | type     | Error when port gate blocks resolution  |
| `PortGate`           | type     | Configuration for port gates            |

## Serialization

| Export                       | Type     | Description                                 |
| ---------------------------- | -------- | ------------------------------------------- |
| `serializePolicy`            | function | Converts policy to JSON string              |
| `deserializePolicy`          | function | Converts JSON string to policy              |
| `explainPolicy`              | function | Generates human-readable policy description |
| `PolicyDeserializationError` | type     | Error during deserialization                |

## Inspection

| Export                         | Type     | Description                      |
| ------------------------------ | -------- | -------------------------------- |
| `GuardInspector`               | class    | Inspector for guard system state |
| `GuardInspectorPort`           | const    | Port for guard inspector         |
| `createGuardLibraryInspector`  | function | Creates library-level inspector  |
| `GuardLibraryInspectorPort`    | const    | Port for library inspector       |
| `GuardLibraryInspectorAdapter` | const    | Adapter for library inspection   |
| `GuardInspectionSnapshot`      | type     | Snapshot of guard state          |

## Events & Spans

| Export               | Type  | Description                         |
| -------------------- | ----- | ----------------------------------- |
| `GuardEvent`         | type  | Discriminated union of guard events |
| `GuardEventSink`     | type  | Interface for event handling        |
| `GuardEventSinkPort` | type  | Port for event sink                 |
| `NoopGuardEventSink` | const | No-op event sink                    |
| `GuardSpanSink`      | type  | Interface for span tracking         |
| `GuardSpanSinkPort`  | type  | Port for span sink                  |
| `NoopGuardSpanSink`  | const | No-op span sink                     |

## Signature Service

| Export                 | Type  | Description                           |
| ---------------------- | ----- | ------------------------------------- |
| `SignatureServicePort` | type  | Port for electronic signature service |
| `NoopSignatureService` | const | No-op signature service               |
| `ElectronicSignature`  | type  | Electronic signature structure        |
| `SignatureMeaning`     | type  | Signature type meanings               |

## Utilities

| Export               | Type     | Description                              |
| -------------------- | -------- | ---------------------------------------- |
| `flattenPermissions` | function | Flattens permissions from role hierarchy |
| `inferPolicyType`    | function | Infers TypeScript type from policy       |
