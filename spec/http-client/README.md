# HexDI HttpClient Specification

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this specification (all files 01 through 23, inclusive) are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). GxP-specific documents (files 17 through 23) additionally carry the pharmaceutical alignment defined in guard spec section 59.

## Document Control

| Field                     | Value                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Document ID**           | SPEC-HTTP-001                                                                                |
| **Package**               | `@hex-di/http-client`                                                                        |
| **Specification Version** | 0.1.0                                                                                        |
| **Status**                | Approved (architectural; deployment-specific QA sign-off required per Deployment Gate below) |
| **Classification**        | GxP Controlled Document                                                                      |
| **Effective Date**        | 2026-02-13                                                                                   |
| **Document Owner**        | HexDI Architecture Team                                                                      |
| **QA Reviewer**           | — (to be assigned per deployment)                                                            |
| **Distribution**          | Controlled — recipients listed in distribution register                                      |

### Revision History

| Revision    | Date       | Author                  | Description                                                                                                                                                                          | QA Approval |
| ----------- | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 0.1.0-draft | 2026-02-12 | HexDI Architecture Team | Initial specification: sections 1-78 (core HTTP client)                                                                                                                              | —           |
| 0.1.0-rc.1  | 2026-02-12 | HexDI Architecture Team | Added GxP compliance: sections 79-83c (compliance guide), 84-90 (transport security), 91-97 (audit bridge), 98-103 (transport validation)                                            | —           |
| 0.1.0-rc.2  | 2026-02-12 | HexDI Architecture Team | GxP compliance extensions: sections 104-107 (retention, query, revocation, e-sig verification)                                                                                       | —           |
| 0.1.0-rc.3  | 2026-02-12 | HexDI Architecture Team | GxP audit v5.0 remediations: sections 108-118 (GAMP classification, training, IAM, CORS, rate limiting, recovery, change control)                                                    | —           |
| 0.1.0       | 2026-02-13 | HexDI Architecture Team | GxP compliance hardening: elevated default-deny to REQUIRED, added rejectOnMissingReason enforcement, added HttpAuditArchivalPort, added document control, added GxP quick reference | —           |

### Document Control Requirements

```
REQUIREMENT: This specification is a GxP controlled document when used in regulated
             environments. Changes to this document MUST follow the Change Request
             process defined in §116. Each revision MUST be recorded in the Revision
             History table above with: (1) revision identifier, (2) date, (3) author,
             (4) description of changes, and (5) QA approval status. Previous
             revisions MUST NOT be deleted from the history. The effective date
             indicates when this revision becomes the governing specification for
             new deployments and validation activities.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(j), 21 CFR 11.10(k).
```

```
REQUIREMENT: Organizations deploying this specification in GxP environments MUST
             maintain a distribution register documenting: (1) all personnel who
             have received a copy of this specification, (2) the revision they
             received, and (3) the date of distribution. When a new revision is
             issued, all registered recipients MUST be notified and provided with
             the updated specification. Superseded revisions MUST be clearly marked
             as "SUPERSEDED" in the distribution register.
             Reference: EU GMP Annex 11 §10, GAMP 5 §5.5.
```

### QA Approval Deployment Gate

The QA Approval column in the Revision History table above uses "---" to indicate
approval has not yet been recorded for a given revision. This is expected during
specification development. However, QA approval MUST be obtained before any GxP
deployment.

```
REQUIREMENT: Before this specification is used to govern a GxP deployment, the QA
             Approval column in the Revision History table MUST be populated for the
             revision being deployed. The QA Approval entry MUST include: (1) the
             name of the QA approver, (2) the approver's role as defined in the
             Validation Plan (§83a, section 4), and (3) the date of approval in
             ISO 8601 format. A revision with QA Approval of "---" (not yet approved)
             MUST NOT be used as the governing specification for GxP validation
             activities (IQ/OQ/PQ). This serves as a deployment gate: the IQ
             procedure (§99a) MUST verify that the QA Approval cell for the deployed
             revision is populated before IQ-to-OQ progression is permitted.
             Reference: EU GMP Annex 11 §4, 21 CFR 11.10(a), GAMP 5 §D.4.
```

```
REQUIREMENT: When multiple revisions are published on the same calendar date (as
             during rapid specification development), the QA approval process MUST
             verify that each revision received adequate review time. The minimum
             review period for GxP-impacting revisions is 24 hours from the time
             the revision was made available to the QA reviewer. Revisions that
             affect REQUIRED combinators, FMEA mitigations, or regulatory traceability
             matrix entries require independent QA review of each revision — batch
             approval of multiple revisions in a single review session is permitted
             only when the QA reviewer documents that each revision was individually
             assessed and the cumulative impact was evaluated.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(j).
```

---

## Summary

`@hex-di/http-client` brings platform-agnostic HTTP communication into HexDI's hexagonal architecture. The HTTP client is a real `DirectedPort<HttpClient, "HttpClient", "outbound">`. Every platform implementation is a real `Adapter<...>`. Container manages resolution, scoping, and disposal -- there is no global `fetch` wrapper.

The core package defines the contract: request building, response consumption, error types, and client composition. Platform-specific adapters live in separate packages. Programs depend on `HttpClientPort` and never import a concrete transport. Swapping `FetchHttpClientAdapter` for `NodeHttpClientAdapter` (or a mock) requires changing one line in the graph -- zero changes in application code.

Requests are immutable value objects built with constructor functions and pipeable combinators. Responses provide lazy body accessors returning `ResultAsync`. Errors are discriminated unions (`HttpRequestError | HttpResponseError | HttpBodyError`) -- never thrown exceptions. Client-level combinators (`baseUrl`, `filterStatusOk`, `retry`, `timeout`) compose as functions that wrap the client, enabling middleware-like behavior without a middleware stack.

## Packages

| Package                       | Description                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `@hex-di/http-client`         | Core types, request/response, error types, client port, combinators, fetch adapter, inspector |
| `@hex-di/http-client-node`    | Node.js adapters (`node:http`/`node:https`, undici)                                           |
| `@hex-di/http-client-bun`     | Bun-native adapter                                                                            |
| `@hex-di/http-client-testing` | Mock client, recording client, response factories, vitest matchers                            |

## Dependencies

| Package                       | Dependencies                                    | Peer Dependencies |
| ----------------------------- | ----------------------------------------------- | ----------------- |
| `@hex-di/http-client`         | `@hex-di/core`, `@hex-di/result`                | -                 |
| `@hex-di/http-client-node`    | `@hex-di/http-client`                           | `node >= 18`      |
| `@hex-di/http-client-bun`     | `@hex-di/http-client`                           | `bun >= 1.0`      |
| `@hex-di/http-client-testing` | `@hex-di/http-client`, `@hex-di/result-testing` | `vitest >= 3.0`   |

> **Note:** `@hex-di/http-client` does not depend on `@hex-di/graph` at compile time. `GraphBuilder` usage shown in examples is consumer-side -- applications import `@hex-di/graph` directly to compose their dependency graphs. HTTP client adapters are plain `Adapter` objects compatible with any graph builder.

## Table of Contents

### [01 - Overview & Philosophy](./01-overview.md)

1. [Overview](./01-overview.md#1-overview)
2. [Philosophy](./01-overview.md#2-philosophy)
3. [Package Structure](./01-overview.md#3-package-structure)
4. [Architecture Diagram](./01-overview.md#4-architecture-diagram)

### [02 - Core Types](./02-core-types.md)

5. [HttpMethod](./02-core-types.md#5-httpmethod)
6. [Headers](./02-core-types.md#6-headers)
7. [UrlParams](./02-core-types.md#7-urlparams)
8. [HttpBody](./02-core-types.md#8-httpbody)

### [03 - HttpRequest](./03-http-request.md)

9. [HttpRequest Interface](./03-http-request.md#9-httprequest-interface)
10. [Request Constructors](./03-http-request.md#10-request-constructors)
11. [Header Combinators](./03-http-request.md#11-header-combinators)
12. [URL Combinators](./03-http-request.md#12-url-combinators)
13. [Body Combinators](./03-http-request.md#13-body-combinators)
14. [Signal & Timeout](./03-http-request.md#14-signal--timeout)

### [04 - HttpResponse](./04-http-response.md)

15. [HttpResponse Interface](./04-http-response.md#15-httpresponse-interface)
16. [Body Accessors](./04-http-response.md#16-body-accessors)
17. [Status Utilities](./04-http-response.md#17-status-utilities)
18. [Header Utilities](./04-http-response.md#18-header-utilities)

### [05 - Error Types](./05-error-types.md)

19. [HttpClientError Union](./05-error-types.md#19-httpclienterror-union)
20. [HttpRequestError](./05-error-types.md#20-httprequesterror)
21. [HttpResponseError](./05-error-types.md#21-httpresponseerror)
22. [HttpBodyError](./05-error-types.md#22-httpbodyerror)
23. [Error Constructors & Guards](./05-error-types.md#23-error-constructors--guards)
24. [Error Codes](./05-error-types.md#24-error-codes)

### [06 - HttpClient Port](./06-http-client-port.md)

25. [HttpClient Interface](./06-http-client-port.md#25-httpclient-interface)
26. [HttpClientPort](./06-http-client-port.md#26-httpclientport)
27. [RequestOptions](./06-http-client-port.md#27-requestoptions)
28. [Type Inference Utilities](./06-http-client-port.md#28-type-inference-utilities)

### [07 - Client Combinators](./07-client-combinators.md)

29. [Combinator Philosophy](./07-client-combinators.md#29-combinator-philosophy)
30. [Request Transformation](./07-client-combinators.md#30-request-transformation)
31. [Response Transformation](./07-client-combinators.md#31-response-transformation)
32. [Status Filtering](./07-client-combinators.md#32-status-filtering)
33. [Base URL & Default Headers](./07-client-combinators.md#33-base-url--default-headers)
34. [Authentication](./07-client-combinators.md#34-authentication)
35. [Side-Effect Tapping](./07-client-combinators.md#35-side-effect-tapping)
36. [Retry](./07-client-combinators.md#36-retry)
37. [Timeout](./07-client-combinators.md#37-timeout)
38. [Error Recovery](./07-client-combinators.md#38-error-recovery)

### [08 - Platform Adapters](./08-platform-adapters.md)

39. [Adapter Architecture](./08-platform-adapters.md#39-adapter-architecture)
40. [Fetch Adapter](./08-platform-adapters.md#40-fetch-adapter)
41. [Node.js Adapter](./08-platform-adapters.md#41-nodejs-adapter)
42. [Undici Adapter](./08-platform-adapters.md#42-undici-adapter)
43. [Bun Adapter](./08-platform-adapters.md#43-bun-adapter)
44. [Custom Adapter](./08-platform-adapters.md#44-custom-adapter)

### [09 - Scoped Clients](./09-scoped-clients.md)

45. [Per-Request Context](./09-scoped-clients.md#45-per-request-context)
46. [Scoped Adapter Pattern](./09-scoped-clients.md#46-scoped-adapter-pattern)
47. [Correlation Propagation](./09-scoped-clients.md#47-correlation-propagation)
48. [Multi-Tenancy](./09-scoped-clients.md#48-multi-tenancy)

### [10 - Integration](./10-integration.md)

49. [DI Ports](./10-integration.md#49-di-ports)
50. [Tracing Integration](./10-integration.md#50-tracing-integration)
51. [Logger Integration](./10-integration.md#51-logger-integration)
52. [Query Integration](./10-integration.md#52-query-integration)
53. [Lifecycle Management](./10-integration.md#53-lifecycle-management)

### [11 - Introspection](./11-introspection.md)

54. [HttpClientInspector](./11-introspection.md#54-httpclientinspector) -- includes health derivation, combinator chain
55. [HttpClientSnapshot](./11-introspection.md#55-httpclientsnapshot) -- includes circuit breaker, rate limiter, cache state
    55a. [Audit Integrity](./11-introspection.md#55a-audit-integrity) -- FNV-1a hash chain, `computeHttpEntryHash`, `verifyHistoryChain`
    55b. [Audit Sink](./11-introspection.md#55b-audit-sink) -- `HttpAuditSink` interface, lifecycle, externalization
    55c. [Audit Recording Warning](./11-introspection.md#55c-audit-recording-warning) -- `HTTP_WARN_001`, monotonic timing mandate
56. [HttpClientInspectorEvent](./11-introspection.md#56-httpclientinspectorevent)
57. [MCP Resource Readiness](./11-introspection.md#57-mcp-resource-readiness) -- includes health, combinator, circuit breaker URIs + A2A skill definitions

### [12 - Testing](./12-testing.md)

58. [Test Utilities](./12-testing.md#58-test-utilities)
59. [Mock HttpClient](./12-testing.md#59-mock-httpclient)
60. [Recording Client](./12-testing.md#60-recording-client)
61. [Response Factories](./12-testing.md#61-response-factories)
62. [Vitest Matchers](./12-testing.md#62-vitest-matchers)
63. [Type-Level Tests](./12-testing.md#63-type-level-tests)

### [13 - Advanced Patterns](./13-advanced.md)

64. [Interceptor Chains](./13-advanced.md#64-interceptor-chains)
65. [Circuit Breaker](./13-advanced.md#65-circuit-breaker)
66. [Rate Limiting](./13-advanced.md#66-rate-limiting)
67. [Response Caching](./13-advanced.md#67-response-caching)
68. [Streaming Responses](./13-advanced.md#68-streaming-responses)
69. [SSR Considerations](./13-advanced.md#69-ssr-considerations)

### [14 - API Reference](./14-api-reference.md)

70. [Request Factories](./14-api-reference.md#70-request-factories)
71. [Request Combinators](./14-api-reference.md#71-request-combinators)
72. [Response API](./14-api-reference.md#72-response-api)
73. [Client Combinators](./14-api-reference.md#73-client-combinators)
74. [Error Types](./14-api-reference.md#74-error-types)
75. [Port & Adapter Factories](./14-api-reference.md#75-port--adapter-factories)
76. [Introspection](./14-api-reference.md#76-introspection)
77. [Testing API](./14-api-reference.md#77-testing-api)
78. [Type Utilities](./14-api-reference.md#78-type-utilities)

### [15 - Appendices](./15-appendices.md)

- [Appendix A: Comparison with HTTP Libraries](./15-appendices.md#appendix-a-comparison-with-http-libraries)
- [Appendix B: Glossary](./15-appendices.md#appendix-b-glossary)
- [Appendix C: Design Decisions](./15-appendices.md#appendix-c-design-decisions)
- [Appendix D: MCP Resource & A2A Skill Inventory](./15-appendices.md#appendix-d-mcp-resource--a2a-skill-inventory)

### [16 - Definition of Done](./16-definition-of-done.md)

- [Test Tables](./16-definition-of-done.md#test-tables)
- [Type-Level Tests](./16-definition-of-done.md#type-level-tests)
- [Integration Tests](./16-definition-of-done.md#integration-tests)
- [E2E Tests](./16-definition-of-done.md#e2e-tests)
- [GxP Regulatory Traceability](./16-definition-of-done.md#gxp-regulatory-traceability)
- [Mutation Testing](./16-definition-of-done.md#mutation-testing)
- [Verification Checklist](./16-definition-of-done.md#verification-checklist)

### [17 - GxP Compliance Guide](./17-gxp-compliance.md)

79. [Regulatory Context (HTTP Transport Scope)](./17-gxp-compliance.md#79-regulatory-context-http-transport-scope)
80. [ALCOA+ Mapping for HTTP Operations](./17-gxp-compliance.md#80-alcoa-mapping-for-http-operations)
81. [Relationship to @hex-di/guard GxP Chapters](./17-gxp-compliance.md#81-relationship-to-hex-diguard-gxp-chapters)
    81a. [GxP Combinator Requirement Levels](./17-gxp-compliance.md#81a-gxp-combinator-requirement-levels)
82. [Cross-Chain Integrity Verification](./17-gxp-compliance.md#82-cross-chain-integrity-verification)
83. [Audit Entry Schema Versioning Strategy](./17-gxp-compliance.md#83-audit-entry-schema-versioning-strategy)

### [18 - HTTP Transport Security](./18-http-transport-security.md)

84. [HTTP Transport Security Overview](./18-http-transport-security.md#84-http-transport-security-overview)
85. [HTTPS Enforcement](./18-http-transport-security.md#85-https-enforcement)
86. [Payload Integrity Verification](./18-http-transport-security.md#86-payload-integrity-verification)
87. [Credential Protection](./18-http-transport-security.md#87-credential-protection)
88. [HTTP Configuration Change Control](./18-http-transport-security.md#88-http-configuration-change-control)
89. [GxP Payload Schema Validation](./18-http-transport-security.md#89-gxp-payload-schema-validation)
90. [Session and Token Lifecycle](./18-http-transport-security.md#90-session-and-token-lifecycle)

### [19 - HTTP Audit Bridge](./19-http-audit-bridge.md)

91. [HTTP Audit Trail Bridge Overview](./19-http-audit-bridge.md#91-http-audit-trail-bridge-overview)
92. [HTTP Operation Audit Entry](./19-http-audit-bridge.md#92-http-operation-audit-entry)
93. [User Attribution for HTTP Operations](./19-http-audit-bridge.md#93-user-attribution-for-http-operations)
94. [RBAC for HTTP Operations](./19-http-audit-bridge.md#94-rbac-for-http-operations)
95. [Authentication Failure Audit](./19-http-audit-bridge.md#95-authentication-failure-audit)
96. [Clock Synchronization for HTTP Timestamps](./19-http-audit-bridge.md#96-clock-synchronization-for-http-timestamps)
97. [Cross-Correlation: Guard to HTTP](./19-http-audit-bridge.md#97-cross-correlation-guard-to-http)

### [20 - HTTP Transport Validation](./20-http-transport-validation.md)

98. [HTTP Transport FMEA](./20-http-transport-validation.md#98-http-transport-fmea)
99. [HTTP Transport IQ/OQ/PQ](./20-http-transport-validation.md#99-http-transport-iqoqpq)
100.  [Regulatory Traceability Matrix](./20-http-transport-validation.md#100-regulatory-traceability-matrix)
101.  [Compliance Verification Checklist](./20-http-transport-validation.md#101-compliance-verification-checklist)
102.  [Definition of Done: HTTP Transport Guards](./20-http-transport-validation.md#102-definition-of-done-http-transport-guards)


    - [DoD 20: Transport Security](./20-http-transport-validation.md#dod-20-transport-security)
    - [DoD 21: Audit Bridge](./20-http-transport-validation.md#dod-21-audit-bridge)
    - [DoD 22: Attribution and RBAC](./20-http-transport-validation.md#dod-22-attribution-and-rbac)

103. [Appendix: GxP Combinator Composition](./20-http-transport-validation.md#103-appendix-gxp-combinator-composition)

### [21 - GxP Compliance Extensions](./21-gxp-compliance-extensions.md)

104. [Audit Trail Retention and Archival Strategy](./21-gxp-compliance-extensions.md#104-audit-trail-retention-and-archival-strategy)
105. [HTTP Audit Trail Query and Retrieval Port](./21-gxp-compliance-extensions.md#105-http-audit-trail-query-and-retrieval-port)
106. [Certificate Revocation Checking Protocol](./21-gxp-compliance-extensions.md#106-certificate-revocation-checking-protocol)
107. [Electronic Signature Verification Protocol](./21-gxp-compliance-extensions.md#107-electronic-signature-verification-protocol)

### [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md)

108. [Software Classification (GAMP 5)](./22-gxp-compliance-audit-v5.md#108-software-classification-gamp-5)
109. [GxP Training Requirements](./22-gxp-compliance-audit-v5.md#109-gxp-training-requirements)
110. [IAM Integration Guidance](./22-gxp-compliance-audit-v5.md#110-iam-integration-guidance)
111. [Transport vs. Business Validation Boundary](./22-gxp-compliance-audit-v5.md#111-transport-vs-business-validation-boundary)
112. [CORS Policy Types and Combinator](./22-gxp-compliance-audit-v5.md#112-cors-policy-types-and-combinator)
113. [Client-Side Rate Limiting for GxP](./22-gxp-compliance-audit-v5.md#113-client-side-rate-limiting-for-gxp)
114. [Electronic Signature Capture UI Workflow Guidance](./22-gxp-compliance-audit-v5.md#114-electronic-signature-capture-ui-workflow-guidance)
115. [Catastrophic Failure Recovery Runbook](./22-gxp-compliance-audit-v5.md#115-catastrophic-failure-recovery-runbook)
116. [Specification Change Control Process](./22-gxp-compliance-audit-v5.md#116-specification-change-control-process)
117. [SemVer-to-Revalidation Mapping](./22-gxp-compliance-audit-v5.md#117-semver-to-revalidation-mapping)
118. [Guard Specification Interface Dependencies](./22-gxp-compliance-audit-v5.md#118-guard-specification-interface-dependencies)

### [23 - GxP Quick Reference](./23-gxp-quick-reference.md)

- [FDA 21 CFR Part 11 Mapping](./23-gxp-quick-reference.md#fda-21-cfr-part-11)
- [EU GMP Annex 11 Mapping](./23-gxp-quick-reference.md#eu-gmp-annex-11)
- [ALCOA+ Mapping](./23-gxp-quick-reference.md#alcoa-data-integrity-principles)
- [GAMP 5 Compliance](./23-gxp-quick-reference.md#gamp-5-compliance)
- [Combinator-to-Regulation Quick Lookup](./23-gxp-quick-reference.md#combinator-to-regulation-quick-lookup)
- [GxP Configuration Options](./23-gxp-quick-reference.md#gxp-configuration-options-quick-lookup)
- [Port Inventory](./23-gxp-quick-reference.md#port-inventory-for-gxp-deployments)
- [Incident Classification](./23-gxp-quick-reference.md#incident-classification-quick-lookup)

---

## Release Scope

All sections (1-118) ship in version 0.1.0. Total: **735 specified tests**, broken down as follows:

| Source                     | Unit    | Type-Level | Integration | E2E    | Chaos/Load/Soak | Total   |
| -------------------------- | ------- | ---------- | ----------- | ------ | --------------- | ------- |
| Core spec (§1-78)          | 226¹    | 12         | 12          | 20     | —               | 270     |
| GxP transport (DoDs 20-27) | 282     | 63         | 102         | —      | —               | 447     |
| Chaos/Load/Soak (§16)      | —       | —          | —           | —      | 18              | 18      |
| **Total**                  | **508** | **75**     | **114**     | **20** | **18**          | **735** |

> **Note:** Core E2E expanded from 5 to 20 for GxP coverage (E2E-001–E2E-020). Chaos/Load/Soak = 10 chaos/fault injection (CF-001–CF-010) + 5 load (LT-001–LT-005) + 3 soak (SK-001–SK-003). See [22 - GxP Compliance Audit v5.0 (DoD 20-27 summary)](./22-gxp-compliance-audit-v5.md#updated-test-count-summary-dod-20-27) for the per-DoD breakdown. See [23 - GxP Quick Reference (test count summary)](./23-gxp-quick-reference.md#test-count-summary) for a section-oriented view.
>
> ¹ **Classification note:** The 226 core unit test count reflects the summary classification. File 16 detail tables enumerate some adapter-boundary tests (e.g., FA-series) under "Integration" labels due to their adapter-crossing nature, but the summary counts these as unit tests because they exercise a single combinator in isolation with a test adapter. The authoritative counts are those in this summary table.

React hooks (`@hex-di/http-client-react`) are deferred to 0.2.0.

---

_End of Table of Contents_
