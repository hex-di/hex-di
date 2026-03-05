# HexDI Guard Cedar Specification

> **Document Control**
>
> | Property       | Value                                   |
> | -------------- | --------------------------------------- |
> | Document ID    | GUARD-CEDAR-00                          |
> | Revision       | 1.0                                     |
> | Effective Date | 2026-02-23                              |
> | Status         | Draft                                   |
> | Author         | HexDI Engineering                       |
> | Reviewer       | Technical Review                        |
> | Approved By    | Technical Lead                          |
> | Classification | Technical Specification                 |
> | DMS Reference  | Git VCS                                 |
> | Change History | 1.0 (2026-02-23): Initial specification |

**Package:** `@hex-di/guard-cedar`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-23

---

## Document Classification

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| **GAMP 5 Category** | Category 5 (Custom Software)         |
| **Document Type**   | URS + FS + DS combined specification |
| **Governance Tier** | Technical + behaviors                |

---

## Sub-Document Version Control

Individual chapter files (`01-overview.md` through `09-definition-of-done.md`) do **NOT** carry separate version numbers. The suite-level revision in this README.md is the authoritative version identifier for the entire `@hex-di/guard-cedar` specification suite.

When any chapter is modified, the suite revision in this README.md's Document Control header MUST be incremented and a Change History entry appended.

---

## Combined Specification Approach

This specification combines URS, FS, and DS into a single document set per the GAMP 5 scalability principle (Appendix D, "Proportionate Effort").

**Justification:**

- **Focused scope**: `@hex-di/guard-cedar` is an adapter library with a narrow API surface — it translates between HexDI Guard's evaluation context and the Cedar policy engine. Three separate documents would repeat the same domain context.
- **Proportionate effort (ICH Q9)**: The risk profile is concentrated in policy translation fidelity and entity mapping correctness. These are fully addressable in a combined spec.
- **Traceability is maintained**: The traceability matrix provides complete requirement-to-test mapping.
- **Independent review is preserved**: Technical review covers the full scope; GxP compliance is inherited from the `@hex-di/guard` core specification.

---

## Version Relationship Policy

| Track                   | Format                    | Increments when                      |
| ----------------------- | ------------------------- | ------------------------------------ |
| **Spec revision**       | Major.Minor (e.g., `1.0`) | Any spec file is modified            |
| **npm package version** | SemVer (e.g., `0.1.0`)    | Implementation changes are published |

**Implementation requirement:** The `@hex-di/guard-cedar` package MUST expose a `specRevision` constant (via `getMetadata()` or equivalent export) whose value matches the current suite-level spec revision at the time of the npm release.

---

## Summary

`@hex-di/guard-cedar` provides a Cedar policy engine adapter for the HexDI Guard authorization system. It translates Guard's `EvaluationContext` (subject, resource, policy) into Cedar authorization requests, evaluates them against Cedar policies and entity data, and maps Cedar's response back to Guard's `Decision` type.

Cedar is AWS's open-source authorization policy language designed for formal verification. It uses a `permit`/`forbid` effect model with default-deny semantics, typed entity hierarchies, and a non-Turing-complete language that enables automated reasoning about policy correctness.

This adapter enables Guard users to:

- Define fine-grained authorization policies in Cedar's declarative syntax
- Leverage Cedar's formal verification to prove policy correctness
- Map Guard subjects and resources to Cedar's typed entity DAG
- Compose Cedar policy evaluation with Guard's native policy combinators (`allOf`, `anyOf`, `not`)

## Dependencies

| Package                    | Relationship                                                                   |
| -------------------------- | ------------------------------------------------------------------------------ |
| `@hex-di/guard`            | Peer dependency — provides `PolicyConstraint`, `Decision`, `EvaluationContext` |
| `@hex-di/result`           | Peer dependency — `Result<T, E>` return type                                   |
| `@cedar-policy/cedar-wasm` | Runtime dependency — Cedar evaluation engine (WASM)                            |

---

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

- [Mission](./01-overview.md#mission)
- [Design Philosophy](./01-overview.md#design-philosophy)
- [Package Structure](./01-overview.md#package-structure)
- [Architecture Diagram](./01-overview.md#architecture-diagram)

### [02 - Cedar Engine Port](./02-cedar-engine-port.md)

- [CedarEnginePort Interface](./02-cedar-engine-port.md#cedarengineport-interface)
- [Authorization Request](./02-cedar-engine-port.md#authorization-request)
- [Authorization Response](./02-cedar-engine-port.md#authorization-response)
- [Port Factory](./02-cedar-engine-port.md#port-factory)

### [03 - Policy Translation](./03-policy-translation.md)

- [Guard Policy to Cedar Mapping](./03-policy-translation.md#guard-policy-to-cedar-mapping)
- [Cedar Policy Syntax](./03-policy-translation.md#cedar-policy-syntax)
- [Policy Store](./03-policy-translation.md#policy-store)

### [04 - Entity Mapping](./04-entity-mapping.md)

- [Guard Subject to Cedar Principal](./04-entity-mapping.md#guard-subject-to-cedar-principal)
- [Guard Resource to Cedar Resource](./04-entity-mapping.md#guard-resource-to-cedar-resource)
- [Action Mapping](./04-entity-mapping.md#action-mapping)
- [Entity Hierarchy](./04-entity-mapping.md#entity-hierarchy)

### [05 - Schema Management](./05-schema-management.md)

- [Cedar Schema Format](./05-schema-management.md#cedar-schema-format)
- [Schema Loading](./05-schema-management.md#schema-loading)
- [Schema Validation](./05-schema-management.md#schema-validation)

### [06 - Decision Mapping](./06-decision-mapping.md)

- [Cedar Response to Guard Decision](./06-decision-mapping.md#cedar-response-to-guard-decision)
- [Diagnostics Propagation](./06-decision-mapping.md#diagnostics-propagation)
- [Field Visibility](./06-decision-mapping.md#field-visibility)

### [07 - Error Handling](./07-error-handling.md)

- [Error Taxonomy](./07-error-handling.md#error-taxonomy)
- [Error Types](./07-error-handling.md#error-types)
- [Recovery Strategies](./07-error-handling.md#recovery-strategies)

### [08 - Configuration](./08-configuration.md)

- [Adapter Factory](./08-configuration.md#adapter-factory)
- [Policy Loading Options](./08-configuration.md#policy-loading-options)
- [Entity Provider Options](./08-configuration.md#entity-provider-options)
- [Guard Integration](./08-configuration.md#guard-integration)

### [09 - Definition of Done](./09-definition-of-done.md)

- [Test Enumeration](./09-definition-of-done.md#test-enumeration)

### Governance Documents

- [Overview — API Surface & Source File Map](./overview.md)
- [Invariants — Runtime Guarantees](./invariants.md)
- [Glossary — Domain Terminology](./glossary.md)
- [Decisions](./decisions/)
  - [ADR-CD-001: Embedded WASM over HTTP Sidecar](./decisions/001-embedded-wasm-over-http-sidecar.md)
  - [ADR-CD-002: Entity DAG Mapping Strategy](./decisions/002-entity-dag-mapping-strategy.md)
  - [ADR-CD-003: Schema-First Policy Authoring](./decisions/003-schema-first-policy-authoring.md)
- [Process](./process/)
  - [Definitions of Done](./process/definitions-of-done.md)
  - [Test Strategy](./process/test-strategy.md)
  - [Requirement ID Scheme](./process/requirement-id-scheme.md)
