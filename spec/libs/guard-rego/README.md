# HexDI Guard Rego Specification

> **Document Control**
>
> | Property       | Value                                   |
> | -------------- | --------------------------------------- |
> | Document ID    | GUARD-REGO-00                           |
> | Revision       | 1.0                                     |
> | Effective Date | 2026-02-23                              |
> | Status         | Draft                                   |
> | Author         | HexDI Engineering                       |
> | Reviewer       | Technical Review                        |
> | Approved By    | Technical Lead                          |
> | Classification | Technical Specification                 |
> | DMS Reference  | Git VCS                                 |
> | Change History | 1.0 (2026-02-23): Initial specification |

**Package:** `@hex-di/guard-rego`
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

Individual chapter files (`01-overview.md` through `09-definition-of-done.md`) do **NOT** carry separate version numbers. The suite-level revision in this README.md is the authoritative version identifier for the entire `@hex-di/guard-rego` specification suite.

When any chapter is modified, the suite revision in this README.md's Document Control header MUST be incremented and a Change History entry appended.

---

## Combined Specification Approach

This specification combines URS, FS, and DS into a single document set per the GAMP 5 scalability principle (Appendix D, "Proportionate Effort").

**Justification:**

- **Focused scope**: `@hex-di/guard-rego` is an adapter library with a narrow API surface — it translates between HexDI Guard's evaluation context and the Open Policy Agent (OPA) evaluation engine via its REST API.
- **Proportionate effort (ICH Q9)**: The risk profile is concentrated in input document construction and decision parsing. These are fully addressable in a combined spec.
- **Traceability is maintained**: The traceability matrix provides complete requirement-to-test mapping.
- **Independent review is preserved**: Technical review covers the full scope; GxP compliance is inherited from the `@hex-di/guard` core specification.

---

## Version Relationship Policy

| Track                   | Format                    | Increments when                      |
| ----------------------- | ------------------------- | ------------------------------------ |
| **Spec revision**       | Major.Minor (e.g., `1.0`) | Any spec file is modified            |
| **npm package version** | SemVer (e.g., `0.1.0`)    | Implementation changes are published |

**Implementation requirement:** The `@hex-di/guard-rego` package MUST expose a `specRevision` constant (via `getMetadata()` or equivalent export) whose value matches the current suite-level spec revision at the time of the npm release.

---

## Summary

`@hex-di/guard-rego` provides an Open Policy Agent (OPA) / Rego adapter for the HexDI Guard authorization system. It translates Guard's `EvaluationContext` (subject, resource, policy) into an OPA input document, evaluates it against Rego policies via OPA's REST API, and maps OPA's response back to Guard's `Decision` type.

OPA is the CNCF-graduated policy engine that uses the Rego query language. Unlike Cedar's embedded evaluation, OPA runs as a sidecar daemon and exposes a REST API for policy decisions. Rego is a Datalog-inspired, Turing-complete language that can express arbitrary policy logic including partial rules, comprehensions, and negation.

This adapter enables Guard users to:

- Define authorization policies in Rego's declarative syntax
- Leverage OPA's bundle system for GitOps-style policy deployment
- Map Guard subjects and resources to OPA input documents
- Compose OPA policy evaluation with Guard's native policy combinators (`allOf`, `anyOf`, `not`)
- Use OPA's decision logging for policy audit

## Dependencies

| Package          | Relationship                                                                   |
| ---------------- | ------------------------------------------------------------------------------ |
| `@hex-di/guard`  | Peer dependency — provides `PolicyConstraint`, `Decision`, `EvaluationContext` |
| `@hex-di/result` | Peer dependency — `Result<T, E>` return type                                   |

No additional runtime dependencies. The adapter communicates with OPA via standard HTTP (`fetch`).

---

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

- [Mission](./01-overview.md#mission)
- [Design Philosophy](./01-overview.md#design-philosophy)
- [Package Structure](./01-overview.md#package-structure)
- [Architecture Diagram](./01-overview.md#architecture-diagram)

### [02 - Rego Engine Port](./02-rego-engine-port.md)

- [RegoEnginePort Interface](./02-rego-engine-port.md#regoengineport-interface)
- [OPA Query Request](./02-rego-engine-port.md#opa-query-request)
- [OPA Query Response](./02-rego-engine-port.md#opa-query-response)
- [Port Factory](./02-rego-engine-port.md#port-factory)

### [03 - Policy Translation](./03-policy-translation.md)

- [Guard Policy to OPA Mapping](./03-policy-translation.md#guard-policy-to-opa-mapping)
- [Rego Policy Conventions](./03-policy-translation.md#rego-policy-conventions)
- [Decision Document Schema](./03-policy-translation.md#decision-document-schema)

### [04 - Input Document Mapping](./04-input-document-mapping.md)

- [Guard Subject to OPA Input](./04-input-document-mapping.md#guard-subject-to-opa-input)
- [Guard Resource to OPA Input](./04-input-document-mapping.md#guard-resource-to-opa-input)
- [Action Mapping](./04-input-document-mapping.md#action-mapping)
- [Input Document Construction](./04-input-document-mapping.md#input-document-construction)

### [05 - Bundle Management](./05-bundle-management.md)

- [OPA Bundle Format](./05-bundle-management.md#opa-bundle-format)
- [Data Documents](./05-bundle-management.md#data-documents)
- [Bundle Configuration](./05-bundle-management.md#bundle-configuration)

### [06 - Decision Mapping](./06-decision-mapping.md)

- [OPA Response to Guard Decision](./06-decision-mapping.md#opa-response-to-guard-decision)
- [Structured Decision Documents](./06-decision-mapping.md#structured-decision-documents)
- [Field Visibility](./06-decision-mapping.md#field-visibility)

### [07 - Error Handling](./07-error-handling.md)

- [Error Taxonomy](./07-error-handling.md#error-taxonomy)
- [Error Types](./07-error-handling.md#error-types)
- [Recovery Strategies](./07-error-handling.md#recovery-strategies)

### [08 - Configuration](./08-configuration.md)

- [Adapter Factory](./08-configuration.md#adapter-factory)
- [OPA Connection Options](./08-configuration.md#opa-connection-options)
- [Input Mapping Options](./08-configuration.md#input-mapping-options)
- [Guard Integration](./08-configuration.md#guard-integration)

### [09 - Definition of Done](./09-definition-of-done.md)

- [Test Enumeration](./09-definition-of-done.md#test-enumeration)

### Governance Documents

- [Overview — API Surface & Source File Map](./overview.md)
- [Invariants — Runtime Guarantees](./invariants.md)
- [Glossary — Domain Terminology](./glossary.md)
- [Decisions](./decisions/)
  - [ADR-RG-001: HTTP Sidecar over Embedded WASM](./decisions/001-http-sidecar-over-embedded-wasm.md)
  - [ADR-RG-002: Structured Decision Documents](./decisions/002-structured-decision-documents.md)
  - [ADR-RG-003: Input Document Convention](./decisions/003-input-document-convention.md)
- [Process](./process/)
  - [Definitions of Done](./process/definitions-of-done.md)
  - [Test Strategy](./process/test-strategy.md)
  - [Requirement ID Scheme](./process/requirement-id-scheme.md)
