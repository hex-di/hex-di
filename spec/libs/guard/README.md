# HexDI Guard Specification

> **Document Control**
>
> | Property       | Value |
> |----------------|-------|
> | Document ID    | GUARD-00 |
> | Revision       | 2.5 |
> | Effective Date | 2026-02-21 |
> | Status         | Effective |
> | Author         | HexDI Engineering |
> | Reviewer       | GxP Compliance Review |
> | Approved By    | Quality Assurance Manager |
> | Classification | GxP Master Specification Index |
> | DMS Reference  | Git VCS (GPG-signed tag: guard-spec-v2.0) |
> | Change History | 2.5 (2026-02-21): TOC §72→§84 (hasResourceAttribute), §73→§85 (withLabel), §74→§86 (evaluateBatch) — resolve section number collisions (CCR-GUARD-045) |
> |                | 2.4 (2026-02-20): Fixed DoD 18 ToC link: "Cross-Library Integration" → "Guard Integration Contracts" (anchor was broken) (CCR-GUARD-045) |
> |                | 2.3 (2026-02-20): Corrected v2.2 Change History test count from 1168 → 1294 (intermediate wrong value); corrected Release Scope to 1294 tests (CCR-GUARD-045) |
> |                | 2.2 (2026-02-20): §16 ToC: added DoD 20–22, 25–29 (were present in 16-definition-of-done.md but missing from ToC); updated Release Scope to DoD 1–29 / 1294 tests / 29 items (CCR-GUARD-045) |
|                | 2.1 (2026-02-20): Renamed api-reference.md → 14-api-reference.md; updated all TOC links and section references (CCR-GUARD-043) |
> |                | 2.0 (2026-02-19): Added canonical governance sections: Sub-Document Version Control, Combined Specification Approach, Version Relationship Policy, Formal Specification Approval Record, Approval Enforcement Mechanism, Distribution List; updated Type System TOC to reference split phantom-brands.md and structural-safety.md (CCR-GUARD-023) |
> |                | 1.0 (2026-02-13): Initial controlled release |

**Package:** `@hex-di/guard`
**Version:** 0.1.0
**Status:** Effective
**Created:** 2026-02-10
**Last Updated:** 2026-02-19

---

## Document Classification

| Property             | Value                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAMP 5 Category**  | Category 5 (Custom Software)                                                                                                                                               |
| **Document Type**    | URS (User Requirements Specification) + FS (Functional Specification) + DS (Design Specification)                                                                          |
| **URS Coverage**     | Sections 1-4 (Overview, Philosophy, Package Structure, Architecture)                                                                                                       |
| **FS Coverage**      | Sections 5-45 (Permission Types, Role Types, Policy Types, Evaluator, Subject, Guard Adapter, Port Gate Hook, Serialization, Cross-Library, React Integration, Inspection) |
| **DS Coverage**      | Sections 47-70 (Testing, API Reference, Appendices, GxP Compliance) + type-system/ (Branded types, mapped types, type transformations)                                      |
| **Regulatory Scope** | FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9, PIC/S PI 011-3, WHO TRS 996, MHRA Data Integrity, ALCOA+                                                              |

## Referenced Standards

| Standard                       | Full Title                                                                                             | Applicability                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **21 CFR Part 11**             | Electronic Records; Electronic Signatures                                                              | Audit trail, electronic signatures, access control |
| **EU GMP Annex 11**            | Computerised Systems                                                                                   | System validation, change control, data storage    |
| **GAMP 5**                     | Guide for Validation of Automated Systems                                                              | Validation lifecycle, Category 5 testing           |
| **ICH Q9**                     | Quality Risk Management                                                                                | FMEA methodology, risk assessment                  |
| **PIC/S PI 011-3**             | Good Practices for Data Management and Integrity                                                       | Data integrity, ALCOA+ principles                  |
| **WHO TRS 996 Annex 5**        | Guidance on Good Data and Record Management Practices                                                  | Validation evidence, supplier qualification        |
| **MHRA Data Integrity (2018)** | GxP Data Integrity Guidance and Definitions                                                            | Data integrity expectations                        |
| **ALCOA+**                     | Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available | Data integrity principles applied throughout       |

---

## Document Classification Taxonomy

This specification uses a formal document type hierarchy. Each document is assigned a classification that determines its review cycle, approval authority, and change control requirements.

| Classification                       | GAMP 5 Mapping           | Description                                                                                                    | Approval Authority                                  | Review Cycle                 |
| ------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| **GxP Master Specification Index**   | URS + FS + DS index      | Top-level specification registry listing all controlled documents, their IDs, and relationships                | Quality Assurance Manager                           | Each major release           |
| **GxP Functional Specification**     | FS (Category 5)          | Defines behavioral contracts, type interfaces, and functional requirements for guard library modules           | Technical Lead + Quality Assurance Manager          | Each major/minor release     |
| **GxP Compliance Sub-Specification** | FS + DS (Category 5)     | Regulatory compliance requirements, audit trail contracts, electronic signature protocols, and risk assessment | Regulatory Affairs Lead + Quality Assurance Manager | Each release + annual review |
| **GxP Verification Specification**   | DS (Category 5)          | Definition of Done, test requirements, mutation testing targets, and acceptance criteria                       | Technical Lead + Quality Assurance Manager          | Each release                 |
| **GxP Appendices & Reference**       | Supporting documentation | Architectural decisions, error code reference, glossary, operational runbooks, and implementation verification | Technical Lead + Quality Assurance Manager          | Each release                 |
| **Implementation Task List**         | Project planning         | Task breakdown for implementation tracking; not subject to formal change control                               | Technical Lead                                      | Continuous                   |

### Document Control Policy

```
REQUIREMENT: Every specification file in spec/guard/ MUST carry a document control
             header (HTML comment) containing: Document ID, Revision, Effective Date,
             Author, Reviewer, Approved By, Classification, and Change History.

REQUIREMENT: The "Approved By" field MUST identify a specific GxP role title from
             the approval authority matrix above. The role title MUST map to a named
             individual in the organization's GxP roles registry maintained outside
             this specification (e.g., site quality manual, organizational chart).

REQUIREMENT: Revision numbers MUST follow MAJOR.MINOR format:
             - MAJOR increment: structural changes, new REQUIREMENT blocks, removed
               sections, or changes affecting regulatory traceability.
             - MINOR increment: clarifications, typo fixes, cross-reference updates,
               or RECOMMENDED block additions.
             Each revision MUST append a Change History entry with the revision number,
             date, and summary of changes.

REQUIREMENT: When a specification file is modified, the Author, Reviewer, Approved By,
             Effective Date, and Revision fields MUST be updated. The previous revision
             entry MUST be preserved in the Change History (append-only).
             Reference: EU GMP Annex 11 §10 (change management), 21 CFR 11.10(e).
```

### Approval Authority Matrix

| Role Title                    | Responsibility                                                                         | Qualification                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Technical Lead**            | Reviews technical accuracy, API design, type safety, and architectural compliance      | Senior engineer with @hex-di/guard domain expertise                             |
| **Quality Assurance Manager** | Approves all GxP-classified documents; verifies regulatory compliance and traceability | QA professional with GxP computerized systems experience                        |
| **Regulatory Affairs Lead**   | Co-approves GxP Compliance Sub-Specifications; verifies regulatory mapping accuracy    | Regulatory affairs professional with 21 CFR Part 11 / EU GMP Annex 11 expertise |

---

## Sub-Document Version Control

Individual chapter files (`01-overview.md` through `17-gxp-compliance/`) do **NOT** carry separate version numbers. The suite-level revision in this README.md is the authoritative version identifier for the entire `@hex-di/guard` specification suite.

GxP organizations MUST use the suite-level revision (e.g., "Guard Spec Rev 2.0") — not individual file Git SHAs — in validation documentation, audit trail references, and deviation reports. Individual file change history is traceable via `git log --follow -- <file>`, but the suite revision is the controlled identifier.

When any chapter is modified, the suite revision in this README.md's Document Control header MUST be incremented and a Change History entry appended.

---

## Combined Specification Approach

This specification combines the User Requirements Specification (URS), Functional Specification (FS), and Design Specification (DS) into a single document set per the GAMP 5 scalability principle (Appendix D, "Proportionate Effort").

**Justification:**

- **Focused scope**: The `@hex-di/guard` API surface is well-bounded (permissions, roles, policies, evaluator, guard adapter, React integration). Three physically separate documents would repeat the same domain context across all three levels.
- **Proportionate effort (ICH Q9)**: Risk and complexity are concentrated in the policy evaluation core and GxP audit trail (both covered by FMEA). The risk profile does not warrant three independently managed document suites.
- **Traceability is maintained**: The [Traceability Matrix](./traceability.md) provides complete forward and backward traceability between requirements, source modules, and tests regardless of document structure.
- **Independent review is preserved**: Distinct signatory roles (Technical Reviewer, QA Reviewer, Regulatory Affairs Reviewer) review their respective sections independently, as documented in the Formal Specification Approval Record below.

Within each chapter, content is organized abstract-to-concrete to preserve specification level separation:

| Content Type | Specification Level |
|---|---|
| Interface definitions, semantic contracts, user requirements | URS |
| Behavioral requirements (`REQUIREMENT:` statements), error handling, ordering guarantees | FS |
| Platform mapping tables, factory strategies, implementation patterns, type-system docs | DS |

GxP organizations that require physically separated URS/FS/DS documents MAY extract content from this combined suite, provided traceability is maintained. This combined suite is the authoritative source.

---

## Version Relationship Policy

Specification revision and npm package version follow **independent tracks**:

| Track | Format | Increments when |
|---|---|---|
| **Spec revision** | Major.Minor (e.g., `2.0`) | Any spec file is modified — tracks specification evolution |
| **npm package version** | SemVer (e.g., `0.1.0`) | Implementation changes are published — tracks software releases |

A spec revision bump does NOT require an npm release. An npm release MAY reference the spec revision in its changelog, but is not required to.

**Implementation requirement:** The `@hex-di/guard` package MUST expose a `specRevision` constant (via `getMetadata()` or equivalent export) whose value matches the current suite-level spec revision at the time of the npm release. This provides a machine-verifiable link between a deployed artifact and the specification version it implements.

---

## Formal Specification Approval Record

> **Note**: This record is a template. Actual signatures are captured via the Approval Enforcement Mechanism described in the next section. Do not fill in names or dates in this file — approval evidence lives in signed Git tags and `APPROVAL_RECORD.json`.

| Role | Review Scope | Approval Statement | Printed Name | Date |
|---|---|---|---|---|
| **Specification Author** | All sections (1–70, Appendices, DoD 1–24, behaviors/, type-system/) | I confirm this specification accurately represents the intended design and that all requirement IDs are complete and traceable. | _[name]_ | _[date]_ |
| **Independent QA Reviewer** | GxP/compliance sections (§59–70, compliance/gxp.md, 17-gxp-compliance/), RTM (traceability.md), FMEA (risk-assessment.md), IQ/OQ/PQ (17-gxp-compliance/09-validation-plan.md) | I confirm this specification satisfies the applicable regulatory requirements listed in §Referenced Standards and that the traceability, FMEA, and validation plan are complete. | _[name]_ | _[date]_ |
| **Technical Reviewer** | Ports (§23, §54), adapters (§25–28), API surface (14-api-reference.md), type-system/, behaviors/ | I confirm the technical design is architecturally sound, the type-level constraints are correct, and the public API is consistent with the HexDI ecosystem conventions. | _[name]_ | _[date]_ |
| **Regulatory Affairs Reviewer** | ALCOA+ mapping (compliance/gxp.md), electronic signatures (17-gxp-compliance/07-electronic-signatures.md), personnel controls (17-gxp-compliance/06-administrative-controls.md) | I confirm the regulatory framework mapping is accurate and complete for the jurisdictions listed in §Referenced Standards. | _[name]_ | _[date]_ |

---

## Approval Enforcement Mechanism

Approval evidence is captured through a **layered model** — not by filling in the table above:

1. **Signed Git tags (cryptographic identity):** The authoritative approval event is a GPG-signed Git tag of the form `guard-spec-vMAJOR.MINOR` on the commit that introduced the revision. The tag message identifies the approvers and review date. The signature proves who approved and that the file set has not changed since approval.

2. **`APPROVAL_RECORD.json` (machine-verifiable, deployment-specific):** Each deployment environment that runs `@hex-di/guard` in a GxP context MUST maintain an `APPROVAL_RECORD.json` outside the source repository (in the quality management system or deployment artifact store). This file records: spec revision, npm version, approver names, approval dates, deployment environment identifier, and the Git tag SHA. It is NOT committed to the source repository because it is deployment-specific.

3. **Review Comment Log (RCL):** All review comments, responses, and dispositions from each approval cycle are recorded in the organization's quality management system under the document ID `GUARD-00`. The RCL is referenced by the signed Git tag message.

**Re-approval triggers:** A new approval cycle is required when the spec revision increments a MAJOR version. MINOR increments (clarifications, cross-reference updates) require a single Technical Reviewer sign-off via pull request approval; no new signed tag is required.

---

## Summary

`@hex-di/guard` provides compile-time-safe authorization for the HexDI ecosystem. Permissions and roles are branded nominal tokens -- created with the same `Symbol.for()` + phantom brand pattern as `@hex-di/core` ports. Policies are discriminated unions composed through algebraic combinators (`allOf`, `anyOf`, `not`, `hasPermission`, `hasRole`, `hasAttribute`, `hasSignature`), and every policy is serializable JSON data -- not a callback.

Authorization integrates directly with the HexDI dependency graph. The `guard()` function wraps adapters with policy enforcement at resolution time: the subject is resolved from a scoped adapter, the policy is evaluated synchronously, and denial produces an `AccessDeniedError` that flows through the existing container error model. On the React side, `SubjectProvider` sets the subject in React context (not a DI scope), and `<Can>`, `<Cannot>`, `useCan`, `usePolicy`, and `useSubject` provide component-level authorization gates with type safety.

`@hex-di/guard` has zero external runtime dependencies beyond `@hex-di/core`. The testing package ships memory adapters, custom Vitest matchers, subject fixtures, and the `testPolicy` utility for pure evaluation without a container.

## Packages

| Package                    | Description                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `@hex-di/guard`            | Core authorization: permissions, roles, policies, evaluator, guard adapter, port gate hook |
| `@hex-di/guard-testing`    | Test utilities: createTestSubject, testPolicy, matchers, memory adapters                   |
| `@hex-di/guard-validation` | Programmatic IQ/OQ/PQ runners and traceability matrix generation                           |
| `integrations/react-guard` | React integration: SubjectProvider, Can/Cannot, useCan/usePolicy/useSubject                |

## Table of Contents

### [00 - User Requirements Specification](./urs.md)

- [Purpose and Scope](./urs.md#1-purpose-and-scope)
- [Regulatory Scope](./urs.md#2-regulatory-scope)
- [User Groups](./urs.md#3-user-groups)
- [User Requirements](./urs.md#4-user-requirements)
- [Non-Functional Requirements](./urs.md#5-non-functional-requirements)
- [Risk Classification Summary](./urs.md#7-risk-classification-summary)

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

- [Vision Alignment](./01-overview.md#vision-alignment)

### [02 - Permission Types](./02-permission-types.md)

5. [Permission Tokens](./02-permission-types.md#5-permission-tokens)
6. [PermissionGroup](./02-permission-types.md#6-permissiongroup)
7. [Permission Branding](./02-permission-types.md#7-permission-branding)
8. [createPermission Factory](./02-permission-types.md#8-createpermission-factory)

### [03 - Role Types](./03-role-types.md)

9. [Role Tokens](./03-role-types.md#9-role-tokens)
10. [Role Inheritance](./03-role-types.md#10-role-inheritance)
11. [Permission Flattening](./03-role-types.md#11-permission-flattening)
12. [Cycle Detection](./03-role-types.md#12-cycle-detection)

### [04 - Policy Types](./04-policy-types.md)

13. [Policy Discriminated Union](./04-policy-types.md#13-policy-discriminated-union)
14. [Policy Combinators](./04-policy-types.md#14-policy-combinators)
15. [PolicyConstraint](./04-policy-types.md#15-policyconstraint)
16. [Matcher DSL](./04-policy-types.md#16-matcher-dsl)
17. [Serialization Invariant](./04-policy-types.md#17-serialization-invariant)
71. [createRoleGate Factory](./04-policy-types.md#71-createrolegate-factory)
84. [hasResourceAttribute Policy](./04-policy-types.md#84-hasresourceattribute-policy)
85. [withLabel Policy Wrapper](./04-policy-types.md#85-withlabel-policy-wrapper)

### [05 - Policy Evaluator](./05-policy-evaluator.md)

18. [evaluate() Function](./05-policy-evaluator.md#18-evaluate-function)
19. [Decision Type](./05-policy-evaluator.md#19-decision-type)
20. [EvaluationTrace](./05-policy-evaluator.md#20-evaluationtrace)
21. [Evaluation Errors](./05-policy-evaluator.md#21-evaluation-errors)
86. [evaluateBatch — Server-Side Batch Evaluation](./05-policy-evaluator.md#86-evaluatebatch--server-side-batch-evaluation)

### [06 - Subject](./06-subject.md)

22. [AuthSubject Interface](./06-subject.md#22-authsubject-interface)
23. [SubjectProviderPort](./06-subject.md#23-subjectproviderport)
24. [Scoped Subject Adapter](./06-subject.md#24-scoped-subject-adapter)
72. [Subject Enrichment Utilities](./06-subject.md#72-subject-enrichment-utilities) — `withAttributes`, `getAttribute`, `AuthSubjectAttributes`

### [07 - Guard Adapter](./07-guard-adapter.md)

25. [guard() Function](./07-guard-adapter.md#25-guard-function)
26. [Type Transformation](./07-guard-adapter.md#26-type-transformation)
27. [Requires Deduplication](./07-guard-adapter.md#27-requires-deduplication)
28. [Guard Factory Behavior](./07-guard-adapter.md#28-guard-factory-behavior)

### [08 - Port Gate Hook](./08-port-gate-hook.md)

29. [createPortGateHook](./08-port-gate-hook.md#29-createportgatehook)
30. [Coarse vs Fine-Grained Enforcement](./08-port-gate-hook.md#30-coarse-vs-fine-grained-enforcement)

### [09 - Serialization](./09-serialization.md)

31. [serializePolicy](./09-serialization.md#31-serializepolicy)
32. [deserializePolicy](./09-serialization.md#32-deserializepolicy)
33. [explainPolicy](./09-serialization.md#33-explainpolicy)
33a. [Audit Entry Serialization](./09-serialization.md#33a-audit-entry-serialization)
33b. [AuditEntry JSON Schema](./09-serialization.md#33b-auditentry-json-schema)
33c. [Export Manifest](./09-serialization.md#33c-export-manifest)

### [10 - Cross-Library Integration](./10-cross-library.md)

34. [Logger Integration](./10-cross-library.md#34-logger-integration)
35. [Tracing Integration](./10-cross-library.md#35-tracing-integration)
36. [Query/Store Integration](./10-cross-library.md#36-querystore-integration)
37. [Saga/Flow Integration](./10-cross-library.md#37-sagaflow-integration)

### [11 - React Integration](./11-react-integration.md)

38. [SubjectProvider](./11-react-integration.md#38-subjectprovider)
39. [Can/Cannot Components](./11-react-integration.md#39-cancannot-components)
40. [useCan Hook](./11-react-integration.md#40-usecan-hook)
41. [usePolicy Hook](./11-react-integration.md#41-usepolicy-hook)
42. [useSubject Hook](./11-react-integration.md#42-usesubject-hook)
73. [usePolicies / usePoliciesDeferred Hooks](./11-react-integration.md#73-usepolicies-and-usepoliciesdeferred-hooks)

### [12 - Inspection](./12-inspection.md)

43. [GuardInspector](./12-inspection.md#43-guardinspector)
44. [DevTools Integration](./12-inspection.md#44-devtools-integration)
44b. [GuardLibraryInspectorPort — Auto-Discovery](./12-inspection.md#44b-guardlibraryinspectorport-auto-discovery)
44c. [MCP Resource URIs](./12-inspection.md#44c-mcp-resource-uris)
44d. [A2A Skills](./12-inspection.md#44d-a2a-skills)

### [13 - Testing](./13-testing.md)

45. [Memory Adapters](./13-testing.md#45-memory-adapters)
46. [Custom Vitest Matchers](./13-testing.md#46-custom-vitest-matchers)
47. [Subject Fixtures](./13-testing.md#47-subject-fixtures)
48. [testPolicy Utility](./13-testing.md#48-testpolicy-utility)
49. [Anti-Patterns](./13-testing.md#49-anti-patterns)
50. [Policy Change Testing Utilities](./13-testing.md#50-policy-change-testing-utilities)
51. [Test Data Management for GxP](./13-testing.md#51-test-data-management-for-gxp)
51a. [Security Test Plan](./13-testing.md#51a-security-test-plan)

### [14 - API Reference](./14-api-reference.md)

52. [Core Types](./14-api-reference.md#52-core-types)
53. [Factory Functions](./14-api-reference.md#53-factory-functions)
54. [Ports](./14-api-reference.md#54-ports)
55. [Evaluation API](./14-api-reference.md#55-evaluation-api)
56. [Error Types and Codes](./14-api-reference.md#56-error-types-and-codes)
56a. [Audit Entry Serialization API](./14-api-reference.md#56a-audit-entry-serialization-api)
57. [Utility Types](./14-api-reference.md#57-utility-types)
58. [React Integration API](./14-api-reference.md#58-react-integration-api)

### Type System

**[phantom-brands.md](./type-system/phantom-brands.md)** — Phantom-branded scalar types

- [Permission Tokens](./type-system/phantom-brands.md#11-permission-tokens) — `Permission<R,A>` phantom brands, `Symbol.for` cross-module identity
- [Role Tokens](./type-system/phantom-brands.md#12-role-tokens) — `Role<N>` phantom brand, cascading API table
- [Zero-Runtime-Cost Guarantee](./type-system/phantom-brands.md#2-zero-runtime-cost-guarantee-for-branded-types) — `declare const` erasure, `Symbol.for` overhead

**[structural-safety.md](./type-system/structural-safety.md)** — Structural type incompatibility patterns

- [PolicyConstraint Union](./type-system/structural-safety.md#1-policyconstraint--structural-discriminated-union) — Typed leaf nodes, combinator types, exhaustive narrowing
- [PoliciesDecisions&lt;M&gt;](./type-system/structural-safety.md#2-policiesdecisionsm--mapped-type-for-batch-evaluation) — Mapped type preserving input policy key names in batch evaluation
- [GuardedAdapter&lt;A&gt;](./type-system/structural-safety.md#3-guardedadaptera--type-transformation-via-guard) — Type transformation: extends adapter's `requires` tuple at compile time
- [AuthSubjectAttributes](./type-system/structural-safety.md#4-authsubjectattributes--open-interface-for-module-augmentation) — Open interface for typed `subject.attributes` via module augmentation
- [Zero-Runtime-Cost Guarantee](./type-system/structural-safety.md#6-zero-runtime-cost-guarantee) — What is erased vs retained at runtime

### Governance Documents

**Spec Foundation**

- [Overview](./overview.md) — Package metadata, API surface, source file map (Pattern A canonical overview)
- [Glossary](./glossary.md) — Domain terminology
- [Invariants](./invariants.md) — Runtime guarantees (`INV-GD-N` identifiers)
- [Traceability](./traceability.md) — Requirement → source → test → invariant → FMEA → DoD forward/backward matrix
- [Risk Assessment](./risk-assessment.md) — FMEA per-invariant risk analysis
- [Competitive Comparison](./comparisons/competitors.md) — Feature matrix vs. other authorization libraries

**Roadmap**

- [Roadmap](./roadmap.md) — Planned future work with status
  - [18 - Ecosystem Extensions](./roadmap/ecosystem-extensions.md)
  - [19 - Developer Experience](./roadmap/developer-experience.md)

**Process**

- [Change Control](./process/change-control.md) — Change categories and approval workflow
- [Definitions of Done](./process/definitions-of-done.md) — Acceptance checklists per spec section
- [Document Control Policy](./process/document-control-policy.md) — Git-based document versioning
- [Requirement ID Scheme](./process/requirement-id-scheme.md) — `REQ-GUARD-NNN` / `INV-GD-N` / `ADR-GD-NNN` format specification
- [Test Strategy](./process/test-strategy.md) — Test pyramid, coverage targets, IQ/OQ/PQ
- [CI Maintenance](./process/ci-maintenance.md) — CI pipeline, release process, spec maintenance procedures

**Detailed Behavioral Specifications (Pattern A)**

The `behaviors/` directory contains formally structured capability files with GxP document control headers, cross-referenced from `type-system/`. These parallel the numbered chapters above.

- [01 — Permission Types](./behaviors/01-permission-types.md)
- [02 — Role Types](./behaviors/02-role-types.md)
- [03 — Policy Types](./behaviors/03-policy-types.md)
- [04 — Policy Evaluator](./behaviors/04-policy-evaluator.md)
- [05 — Subject](./behaviors/05-subject.md)
- [06 — Guard Adapter](./behaviors/06-guard-adapter.md)
- [07 — Port Gate Hook](./behaviors/07-port-gate-hook.md)
- [08 — Serialization](./behaviors/08-serialization.md)
- [09 — Cross-Library Integration](./behaviors/09-cross-library.md)
- [10 — React Integration](./behaviors/10-react-integration.md)
- [11 — Inspection](./behaviors/11-inspection.md)
- [12 — Testing](./behaviors/12-testing.md)

**Scripts**

- [verify-traceability.sh](./scripts/verify-traceability.sh) — Validates internal consistency of the traceability matrix

---

### [15 - Appendices](./15-appendices.md)

- [Appendix A: Architectural Decisions](./15-appendices.md#appendix-a-architectural-decisions)
- [Appendix B: Competitive Comparison](./15-appendices.md#appendix-b-competitive-comparison)
- [Appendix C: Glossary](./15-appendices.md#appendix-c-glossary)
- [Appendix D: Type Relationship Diagram](./15-appendices.md#appendix-d-type-relationship-diagram)
- [Appendix E: Comparison with Existing hex-di Patterns](./15-appendices.md#appendix-e-comparison-with-existing-hex-di-patterns)
- [Appendix F: Error Code Reference](./15-appendices.md#appendix-f-error-code-reference)
- [Appendix K: Deviation Report Template](./15-appendices.md#appendix-k-deviation-report-template)

### [16 - Definition of Done](./16-definition-of-done.md)

- [DoD 1: Permission Tokens](./16-definition-of-done.md#dod-1-permission-tokens)
- [DoD 2: Role Tokens](./16-definition-of-done.md#dod-2-role-tokens)
- [DoD 3: Policy Data Types](./16-definition-of-done.md#dod-3-policy-data-types)
- [DoD 4: Policy Combinators](./16-definition-of-done.md#dod-4-policy-combinators)
- [DoD 5: Policy Evaluator](./16-definition-of-done.md#dod-5-policy-evaluator)
- [DoD 6: Subject Port](./16-definition-of-done.md#dod-6-subject-port)
- [DoD 7: Guard Adapter](./16-definition-of-done.md#dod-7-guard-adapter)
- [DoD 8: Policy Serialization](./16-definition-of-done.md#dod-8-policy-serialization)
- [DoD 9: React SubjectProvider](./16-definition-of-done.md#dod-9-react-subjectprovider)
- [DoD 10: React Can/Cannot](./16-definition-of-done.md#dod-10-react-cancannot)
- [DoD 11: React Hooks](./16-definition-of-done.md#dod-11-react-hooks)
- [DoD 12: DevTools Integration](./16-definition-of-done.md#dod-12-devtools-integration)
- [DoD 13: GxP Compliance](./16-definition-of-done.md#dod-13-gxp-compliance)
- [DoD 14: Vision Integration](./16-definition-of-done.md#dod-14-vision-integration)
- [DoD 15: Electronic Signatures](./16-definition-of-done.md#dod-15-electronic-signatures)
- [DoD 16: Validation Tooling](./16-definition-of-done.md#dod-16-validation-tooling)
- [DoD 17: Port Gate Hook](./16-definition-of-done.md#dod-17-port-gate-hook)
- [DoD 18: Guard Integration Contracts](./16-definition-of-done.md#dod-18-guard-integration-contracts)
- [DoD 19: Testing Infrastructure](./16-definition-of-done.md#dod-19-testing-infrastructure)
- [DoD 20: Array Matchers](./16-definition-of-done.md#dod-20-array-matchers)
- [DoD 21: API Ergonomics](./16-definition-of-done.md#dod-21-api-ergonomics)
- [DoD 22: Cucumber BDD Acceptance Tests](./16-definition-of-done.md#dod-22-cucumber-bdd-acceptance-tests)
- [DoD 23: Meta-Audit Logging](./16-definition-of-done.md#dod-23-meta-audit-logging)
- [DoD 24: System Decommissioning](./16-definition-of-done.md#dod-24-system-decommissioning)
- [DoD 25: Async Evaluation](./16-definition-of-done.md#dod-25-async-evaluation)
- [DoD 26: Field-Level Union Strategy](./16-definition-of-done.md#dod-26-field-level-union-strategy)
- [DoD 27: ReBAC (Relationship-Based Access Control)](./16-definition-of-done.md#dod-27-rebac-relationship-based-access-control)
- [DoD 28: Ecosystem Extensions](./16-definition-of-done.md#dod-28-ecosystem-extensions)
- [DoD 29: Developer Experience](./16-definition-of-done.md#dod-29-developer-experience)
- [Test Count Summary](./16-definition-of-done.md#test-count-summary)
- [Verification Checklist](./16-definition-of-done.md#verification-checklist)

### [17 - GxP Compliance Guide](./17-gxp-compliance.md)

59. [Regulatory Context](./17-gxp-compliance/01-regulatory-context.md#59-regulatory-context)
60. [ALCOA+ Compliance Mapping](./17-gxp-compliance/01-regulatory-context.md#60-alcoa-compliance-mapping)
61. [AuditTrailPort Implementation Contract](./17-gxp-compliance/02-audit-trail-contract.md#61-audittrailport-implementation-contract)
62. [Clock Synchronization Requirements](./17-gxp-compliance/03-clock-synchronization.md#62-clock-synchronization-requirements)
63. [Data Retention Requirements](./17-gxp-compliance/04-data-retention.md#63-data-retention-requirements)
    - 63a. [Audit Trail Capacity Planning](./17-gxp-compliance/04-data-retention.md#63a-audit-trail-capacity-planning)
    - 63b. [Data Privacy and Audit Trail Retention](./17-gxp-compliance/04-data-retention.md#63b-data-privacy-and-audit-trail-retention)
64. [Audit Trail Review Interface](./17-gxp-compliance/05-audit-trail-review.md#64-audit-trail-review-interface)
    - 64a. [Policy Change Control](./17-gxp-compliance/06-administrative-controls.md#64a-policy-change-control)
    - 64b. [Administrative Activity Monitoring](./17-gxp-compliance/06-administrative-controls.md#64b-administrative-activity-monitoring)
    - 64c. [Training and Competency Requirements](./17-gxp-compliance/06-administrative-controls.md#64c-training-and-competency-requirements)
    - 64e. [Audit Trail Export Formats](./17-gxp-compliance/05-audit-trail-review.md#64e-audit-trail-export-formats)
    - 64f. [Regulatory Update Monitoring](./17-gxp-compliance/06-administrative-controls.md#64f-regulatory-update-monitoring)
65. [Electronic Signatures](./17-gxp-compliance/07-electronic-signatures.md#65-electronic-signatures)
    - 65a. [Signature Capture and Binding (11.50-11.70)](./17-gxp-compliance/07-electronic-signatures.md#65a-signature-capture-and-binding-1150-1170)
    - 65b. [Re-Authentication Enforcement (11.100)](./17-gxp-compliance/07-electronic-signatures.md#65b-re-authentication-enforcement-11100)
    - 65c. [Key Management Behavioral Contract (11.200)](./17-gxp-compliance/07-electronic-signatures.md#65c-key-management-behavioral-contract-11200)
    - 65d. [Signature Meaning Registry](./17-gxp-compliance/07-electronic-signatures.md#65d-signature-meaning-registry)
66. [Compliance Verification Checklist](./17-gxp-compliance/08-compliance-verification.md#66-compliance-verification-checklist)
67. [Validation Plan (IQ/OQ/PQ)](./17-gxp-compliance/09-validation-plan.md#67-validation-plan-iqoqpq)
    - 67a. [Installation Qualification (IQ)](./17-gxp-compliance/09-validation-plan.md#67a-installation-qualification-iq)
    - 67b. [Operational Qualification (OQ)](./17-gxp-compliance/09-validation-plan.md#67b-operational-qualification-oq)
    - 67c. [Performance Qualification (PQ)](./17-gxp-compliance/09-validation-plan.md#67c-performance-qualification-pq)
    - 67d. [Validation Report Template](./17-gxp-compliance/09-validation-plan.md#67d-validation-report-template)
    - 67e. [Programmatic Validation Runners](./17-gxp-compliance/09-validation-plan.md#67e-programmatic-validation-runners)
68. [Risk Assessment (FMEA)](./17-gxp-compliance/10-risk-assessment.md#68-risk-assessment-fmea)
69. [Regulatory Traceability Matrix](./17-gxp-compliance/11-traceability-matrix.md#69-regulatory-traceability-matrix)
    - 69a. [FDA 21 CFR Part 11](./17-gxp-compliance/11-traceability-matrix.md#69a-fda-21-cfr-part-11)
    - 69b. [EU GMP Annex 11](./17-gxp-compliance/11-traceability-matrix.md#69b-eu-gmp-annex-11)
    - 69c. [ALCOA+ Data Integrity Principles](./17-gxp-compliance/11-traceability-matrix.md#69c-alcoa-data-integrity-principles)
    - 69d. [GAMP 5](./17-gxp-compliance/11-traceability-matrix.md#69d-gamp-5)
    - 69e. [ICH Q9 / PIC/S PI 011-3](./17-gxp-compliance/11-traceability-matrix.md#69e-ich-q9--pics-pi-011-3)
    - 69f. [WHO TRS 996 Annex 5](./17-gxp-compliance/11-traceability-matrix.md#69f-who-trs-996-annex-5)
    - 69g. [MHRA Data Integrity Guidance (2018)](./17-gxp-compliance/11-traceability-matrix.md#69g-mhra-data-integrity-guidance-2018)
70. [System Decommissioning](./17-gxp-compliance/12-decommissioning.md#70-system-decommissioning)

> **HTTP Transport Security:** Sections covering HTTP transport security (§84-§103), HTTP audit bridge, and HTTP transport validation have been moved to the [http-client spec](../http-client/README.md). See [http-client GxP compliance](../http-client/compliance/gxp.md) for transport security, audit bridge, and transport validation coverage.

---

## Release Scope

All sections (1-70, Appendices A-U, DoD 1–29) are specified. Task Groups 13 (GxP Compliance), 14 (Vision Integration), 15 (Electronic Signatures), 16 (Validation Tooling), 17 (GxP Validation, Risk, and Traceability), 20 (Array Matchers), 21 (API Ergonomics), 22 (Cucumber BDD), 25 (Async Evaluation), 26 (Field-Level Union), 27 (ReBAC), 28 (Ecosystem Extensions), and 29 (Developer Experience) are all specified. The spec defines 1294 tests across 29 DoD items. FMEA covers 36 failure modes.

---

## Distribution List

| Recipient Group | Distribution Method | Notification Trigger |
|---|---|---|
| **Development Team** | Git repository access (spec/ directory) | Pull request merged to `main` with spec changes |
| **Quality Assurance** | QMS document notification | Suite revision increment (MAJOR or MINOR) |
| **Infrastructure / DevOps** | Git repository access + deployment runbook | MAJOR revision requiring re-qualification |
| **Auditors / Regulatory Inspectors** | QMS controlled copy (PDF export at each approved revision) | Upon request or scheduled audit |

---

## Document History

| Version | Date | CCR | Description |
|---------|------|-----|-------------|
| 0.1.0 | 2026-02-12 | — | Initial draft: sections 1–90, DoD 1–24, 801 tests across 24 DoD items. 23 failure modes (22 Low, 1 Medium). OQ-1–OQ-23, PQ-1–PQ-9, FM-1–FM-23. GxP compliance for FDA 21 CFR Part 11, EU GMP Annex 11, ALCOA+, GAMP 5, ICH Q9, WHO TRS 996, MHRA DI. |
| 0.1.1 | 2026-02-13 | — | Restructure: moved HTTP transport security §71–§90 to http-client spec. Removed DoD 20–22. Guard spec now covers §1–§70 with 707 tests across 21 DoD items. |
| 1.0 | 2026-02-13 | CCR-GUARD-001 | Initial controlled release of 16-definition-of-done.md — DoD 1–29 covering all features in scope. |
| 1.1 | 2026-02-14 | CCR-GUARD-002 | Definition-of-Done: added BEH-GD-NNN identifiers and detailed verification sections. |
| — | 2026-02-14 | CCR-GUARD-003 | behaviors/12-testing.md rev 1.1: added §57 Cucumber BDD Acceptance Tests — runner configuration, World class, step definitions, tag taxonomy, 15 feature files, ~85 scenarios. |
| — | 2026-02-14 | CCR-GUARD-004 | behaviors/12-testing.md rev 1.2: added Cucumber BDD features for ReBAC, async evaluation, field union, cross-enhancement. Total: 23 feature files, 118 scenarios. |
| — | 2026-02-14 | CCR-GUARD-005 | behaviors/11-inspection.md rev 1.1, 14-api-reference.md rev 1.1: added hash chain fields to MetaAuditEntry interface per §48c/§52c REQUIREMENT. |
| — | 2026-02-14 | CCR-GUARD-006 | 14-api-reference.md rev 1.2: aligned PermissionGroupMap type definition. behaviors/10-react-integration.md rev 1.1: added §46 GxP Suitability section. 17-gxp-compliance/04-data-retention.md rev 1.1: elevated quarterly backup verification to REQUIREMENT. traceability.md: added URS-GUARD-019–021 to §69h. |
| — | 2026-02-14 | CCR-GUARD-007 | behaviors/09-cross-library.md rev 1.1: elevated GxP incident event handling to REQUIREMENT when gxp:true. 17-gxp-compliance/04-data-retention.md rev 1.2: elevated operational data migration verification to REQUIREMENT. |
| — | 2026-02-14 | CCR-GUARD-008 | behaviors/09-cross-library.md rev 2.0: decoupled guard from ecosystem libraries; replaced bridge functions with guard-owned sink ports (GuardEventSinkPort, GuardSpanSinkPort). 14-api-reference.md rev 1.3: added sink port types. See ADR #55, #56. |
| — | 2026-02-14 | CCR-GUARD-009 | traceability.md rev 1.8: corrected §69h URS-GUARD-009 verification range; added Regulatory Inspector user group to URS §3; added multi-persona diversity requirement to PQ-4. |
| — | 2026-02-14 | CCR-GUARD-010 | appendices/README.md rev 2.0: replaced Appendix B with comprehensive 11-library rating matrix. roadmap/ecosystem-extensions.md rev 1.0 and roadmap/developer-experience.md rev 1.0: initial drafts. |
| — | 2026-02-14 | CCR-GUARD-011 | urs.md rev 1.2: added GAMP 5 Category 5 classification. traceability.md rev 1.6: added REQ-GUARD-074–085, OQ-44–49, FM-32–36. Roadmap files rev 1.1: added GxP traceability. |
| — | 2026-02-14 | CCR-GUARD-012 | urs.md rev 1.3: added retroactive extraction rationale. traceability.md rev 1.7/1.9: added §58 document approval traceability and §69i ecosystem extension traceability. 17-gxp-compliance/13-test-protocols.md rev 1.2: added OQ-44–49 stubs. |
| — | 2026-02-15 | CCR-GUARD-013 | traceability.md rev 2.0: added URS-to-FS Coverage Verification (21/21 forward, 21/21 backward, 0 orphans). behaviors/10-react-integration.md rev 1.2: added Threat Model Limitation statement. 17-gxp-compliance/13-test-protocols.md rev 1.3: added Execution Scope section. |
| — | 2026-02-15 | CCR-GUARD-014 | urs.md rev 1.4: updated Approved By to dual approver for GxP consistency. |
| — | 2026-02-15 | CCR-GUARD-015 | traceability.md rev 2.1: synchronized version registry. 17-gxp-compliance/04-data-retention.md rev 1.3: strengthened retention period heading from "Recommended" to "Required Minimum". |
| — | 2026-02-15 | CCR-GUARD-016 | urs.md rev 1.5: updated URS-GUARD-009 OQ range to OQ-52. traceability.md rev 2.2: added §69-NUM requirement numbering convention. behaviors/12-testing.md rev 1.3: elevated test data version control to REQUIREMENT. 17-gxp-compliance/13-test-protocols.md rev 1.4: added OQ-50–52 adverse condition test protocols. |
| — | 2026-02-15 | CCR-GUARD-017 | traceability.md rev 2.3. appendices/README.md rev 2.2: split 21 appendices (A–V) into individual files. glossary.md rev 1.0: split from consolidated 15-appendices.md. All individual appendix files rev 1.0. |
| — | 2026-02-17 | CCR-GUARD-018 | Major spec restructure. Extracted process/ files (change-control, document-control-policy, requirement-id-scheme, test-strategy). risk-assessment.md rev 1.1. roadmap.md rev 1.0. invariants.md rev 1.0/2.0: extracted + added INV-GD-013–037. appendices/README.md rev 3.0. All 56 ADR decisions/ files extracted. |
| — | 2026-02-19 | CCR-GUARD-019 | 17-gxp-compliance/13-test-protocols.md rev 1.5: improved OQ-to-REQ traceability — 33→78 of 85 REQ-GUARD IDs covered (91.8%). |
| — | 2026-02-19 | CCR-GUARD-020 | overview.md rev 1.0: initial canonical overview. All behaviors/ files: added BEH-GD-NNN requirement identifiers. process/requirement-id-scheme.md rev 2: added BEH-GD scheme. |
| — | 2026-02-19 | CCR-GUARD-021 | invariants.md rev 3.0: added canonical Source, Implication, and Related fields to all 37 invariants. |
| — | 2026-02-19 | CCR-GUARD-022 | traceability.md rev 3.0: added canonical implementation traceability sections (Capability, Requirement, Invariant, ADR, Test File Map, DoD, Coverage Targets). |
| — | 2026-02-19 | CCR-GUARD-023 | README.md rev 2.0: added canonical governance sections. 10-cross-library.md and 13-testing.md marked superseded. type-system/ files rev 2.0. process/definitions-of-done.md rev 2.0. |
| — | 2026-02-20 | CCR-GUARD-025 | glossary.md rev 1.1: refactored from single table to ## Term sections for deep-linking. |
| — | 2026-02-20 | CCR-GUARD-026 | risk-assessment.md rev 2.0: normalized RPN scale to S×O×D (1–10, max 1000). |
| — | 2026-02-20 | CCR-GUARD-027 | roadmap.md rev 2.0: added per-item Status/Scope/Deliverable structure. comparisons/competitors.md rev 2.0: added scoring dimension definitions. |
| — | 2026-02-20 | CCR-GUARD-028 | risk-assessment.md rev 3.0: added Low-risk Justifications, Residual Risk Summary, Assessment Provenance, Review Schedule. |
| — | 2026-02-20 | CCR-GUARD-029 | traceability.md rev 4.0: added FMEA column to §4, added DoD 20–22/25–29 to §7, updated version registry. |
| — | 2026-02-20 | CCR-GUARD-030 | invariants.md rev 4.0: corrected 3 incorrect FM-N references; added missing FM-N references to 16 invariants. |
| — | 2026-02-20 | CCR-GUARD-031 | glossary.md rev 2.0: added 12 terms. traceability.md rev 4.1: updated version registry. |
| — | 2026-02-20 | CCR-GUARD-032 | overview.md rev 2.0: added 10 spec files to Specification & Process Files table. traceability.md rev 4.2. |
| — | 2026-02-20 | CCR-GUARD-033 | risk-assessment.md rev 4.0: added System Context and Risk Acceptance Criteria sections. traceability.md rev 4.3. |
| — | 2026-02-20 | CCR-GUARD-034 | invariants.md rev 5.0: added missing FM-N references to 7 invariants. traceability.md rev 4.4. |
| — | 2026-02-20 | CCR-GUARD-035 | glossary.md rev 3.0: added 14 terms across 4 new sections (React Integration, Testing Infrastructure, etc.). traceability.md rev 4.5. |
| — | 2026-02-20 | CCR-GUARD-036 | overview.md rev 3.0: added 36 missing spec files; fixed document ID collisions. traceability.md rev 4.6. |
| — | 2026-02-20 | CCR-GUARD-037 | roadmap.md rev 3.0: converted Document Control to blockquote; added @hex-di/guard-validation. traceability.md rev 4.7. |
| — | 2026-02-20 | CCR-GUARD-038 | risk-assessment.md rev 5.0: added Invariant-to-FMEA Cross-Reference table (37 invariants). traceability.md rev 4.8. |
| — | 2026-02-20 | CCR-GUARD-039 | glossary.md rev 3.1: added missing cross-reference links to 12 terms. traceability.md rev 4.9. |
| — | 2026-02-20 | CCR-GUARD-040 | overview.md rev 4.0: removed 9 dangling compliance/*.md rows. traceability.md rev 5.0. |
| — | 2026-02-20 | CCR-GUARD-041 | glossary.md rev 3.2: corrected Document ID from GUARD-15-C to GUARD-GLOSSARY. traceability.md rev 5.1. |
| — | 2026-02-20 | CCR-GUARD-042 | 15-appendices.md rev 2.0: converted to blockquote format. appendices/README.md rev 3.1: assigned GUARD-15-IDX. overview.md rev 4.1. traceability.md rev 5.2. |
| — | 2026-02-20 | CCR-GUARD-043 | overview.md rev 4.2: renamed api-reference.md → 14-api-reference.md. README.md rev 2.1. traceability.md rev 5.3. |
| — | 2026-02-20 | CCR-GUARD-044 | traceability.md rev 5.4: corrected 8 Primary Source Module paths in §2. urs.md rev 2.0 (partial): fixed 4 broken cross-references. |
| 2.5 | 2026-02-21 | CCR-GUARD-045 | Section number collision resolution across entire suite. §72→§84, §73→§85, §74→§86. Updated test counts 1168→1294. Added DoD 20–22/25–29 to ToC. Multiple version registry corrections in traceability.md rev 5.5–6.3. |
| 2.5 | 2026-02-20 | CCR-GUARD-046 | urs.md rev 2.0: added §4.2 URS-to-FMEA cross-reference table; converted §8 to formal Approval Record. |
| 2.5 | 2026-02-20 | CCR-GUARD-047 | urs.md rev 2.0: added glossary entries; added acceptance criteria links; removed gxp:true implementation flag from §4 per URS/FS separation. |

---

_End of Table of Contents_
