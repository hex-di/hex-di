# HexDI Guard Specification

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-00                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Quality Assurance Manager                |
| Classification   | GxP Master Specification Index           |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

**Package:** `@hex-di/guard`
**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-10
**Last Updated:** 2026-02-10

---

## Document Classification

| Property             | Value                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GAMP 5 Category**  | Category 5 (Custom Software)                                                                                                                                               |
| **Document Type**    | URS (User Requirements Specification) + FS (Functional Specification) + DS (Design Specification)                                                                          |
| **URS Coverage**     | Sections 1-4 (Overview, Philosophy, Package Structure, Architecture)                                                                                                       |
| **FS Coverage**      | Sections 5-42 (Permission Types, Role Types, Policy Types, Evaluator, Subject, Guard Adapter, Port Gate Hook, Serialization, Cross-Library, React Integration, Inspection) |
| **DS Coverage**      | Sections 43-70 (Testing, API Reference, Appendices, GxP Compliance)                                                                                                        |
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

### [05 - Policy Evaluator](./05-policy-evaluator.md)

18. [evaluate() Function](./05-policy-evaluator.md#18-evaluate-function)
19. [Decision Type](./05-policy-evaluator.md#19-decision-type)
20. [EvaluationTrace](./05-policy-evaluator.md#20-evaluationtrace)
21. [Evaluation Errors](./05-policy-evaluator.md#21-evaluation-errors)

### [06 - Subject](./06-subject.md)

22. [AuthSubject Interface](./06-subject.md#22-authsubject-interface)
23. [SubjectProviderPort](./06-subject.md#23-subjectproviderport)
24. [Scoped Subject Adapter](./06-subject.md#24-scoped-subject-adapter)

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

### [12 - Inspection](./12-inspection.md)

43. [GuardInspector](./12-inspection.md#43-guardinspector)
44. [DevTools Integration](./12-inspection.md#44-devtools-integration)

### [13 - Testing](./13-testing.md)

45. [Memory Adapters](./13-testing.md#45-memory-adapters)
46. [Custom Vitest Matchers](./13-testing.md#46-custom-vitest-matchers)
47. [Subject Fixtures](./13-testing.md#47-subject-fixtures)
48. [testPolicy Utility](./13-testing.md#48-testpolicy-utility)
49. [Anti-Patterns](./13-testing.md#49-anti-patterns)
50. [Policy Change Testing Utilities](./13-testing.md#50-policy-change-testing-utilities)
51. [Test Data Management for GxP](./13-testing.md#51-test-data-management-for-gxp)

### [14 - API Reference](./14-api-reference.md)

52. [Core Types](./14-api-reference.md#52-core-types)
53. [Factory Functions](./14-api-reference.md#53-factory-functions)
54. [Ports](./14-api-reference.md#54-ports)
55. [Evaluation API](./14-api-reference.md#55-evaluation-api)
56. [Error Types and Codes](./14-api-reference.md#56-error-types-and-codes)
57. [Utility Types](./14-api-reference.md#57-utility-types)
58. [React Integration API](./14-api-reference.md#58-react-integration-api)

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
- [DoD 18: Cross-Library Integration](./16-definition-of-done.md#dod-18-cross-library-integration)
- [DoD 19: Testing Infrastructure](./16-definition-of-done.md#dod-19-testing-infrastructure)
- [DoD 23: Meta-Audit Logging](./16-definition-of-done.md#dod-23-meta-audit-logging)
- [DoD 24: System Decommissioning](./16-definition-of-done.md#dod-24-system-decommissioning)
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

> **HTTP Transport Security:** Sections covering HTTP transport security (§84-§103), HTTP audit bridge, and HTTP transport validation have been moved to the [http-client spec](../http-client/README.md). See [18 - HTTP Transport Security](../http-client/18-http-transport-security.md), [19 - HTTP Audit Bridge](../http-client/19-http-audit-bridge.md), [20 - HTTP Transport Validation](../http-client/20-http-transport-validation.md).

---

## Release Scope

All sections (1-70, Appendices A-H, DoD 1-19, 23-24) ship in version 0.1.1. Task Groups 13 (GxP Compliance), 14 (Vision Integration), 15 (Electronic Signatures), 16 (Validation Tooling), 17 (GxP Validation, Risk, and Traceability), 21 (GxP Runtime Utilities), and 22 (System Decommissioning Tooling) are included. The spec defines 713 tests across 21 DoD items. FMEA covers 31 failure modes (all Low post-mitigation).

---

## Document History

| Version | Date       | Author      | Description                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.0   | 2026-02-12 | Initial     | Initial draft: sections 1-90, DoD 1-24, 801 tests across 24 DoD items. 23 failure modes (22 Low, 1 Medium). Includes OQ-1 through OQ-23, PQ-1 through PQ-9, FM-1 through FM-23. GxP compliance coverage for FDA 21 CFR Part 11, EU GMP Annex 11, ALCOA+, GAMP 5, ICH Q9, WHO TRS 996, MHRA DI. Reference adapter CI validation, SignatureService conformance suite, PolicyChangeAuditEntry. |
| 0.1.1   | 2026-02-13 | Restructure | Moved HTTP transport security sections 18-20 (§71-§90) to the http-client spec as §84-§103. Removed DoD 20, 21, 22. Guard spec now covers sections 1-70 with 707 tests across 21 DoD items.                                                                                                                                                                                                 |

---

_End of Table of Contents_
