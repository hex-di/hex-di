# 17 - GxP Compliance: Test Protocols

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-13                              |
| Revision         | 1.7                                      |
| Effective Date   | 2026-02-21                               |
| Status           | Effective                                |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Verification Specification           |
| DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
| Change History   | 1.7 (2026-02-21): §71→§87 (IQ Protocols), §72→§88 (OQ Protocols), §73→§89 (PQ Protocols) — resolve section number collisions with 04-policy-types §71, 06-subject §72, 11-react-integration §73 (CCR-GUARD-045) |
|                  | 1.6 (2026-02-20): Corrected library-level verification counts: 1035/25 → 1176 Vitest tests/29 DoD items (CCR-GUARD-045) |
|                  | 1.5 (2026-02-17): Improved OQ-to-REQ traceability: added missing REQ-GUARD references to 40+ protocols, increasing unique REQ-GUARD coverage from 33 to 78 of 85 IDs (91.8%); remaining 7 are documentation/procedural requirements without OQ applicability (CCR-GUARD-019) |
|                  | 1.4 (2026-02-15): Added OQ-50 through OQ-52 adverse condition test protocols (simultaneous multi-component failure, cascading failure chain, partial state corruption recovery), updated Protocol Summary to 75 total protocols (CCR-GUARD-016) |
|                  | 1.3 (2026-02-15): Added Execution Scope and Library-Level Verification section clarifying protocol template nature, consumer execution REQUIREMENT, and library-level evidence relationship (CCR-GUARD-013) |
|                  | 1.2 (2026-02-14): Added OQ-44 through OQ-49 ecosystem extension test protocol stubs with v0.1.0 scope annotation, updated Protocol Summary (CCR-GUARD-012) |
|                  | 1.1 (2026-02-14): Added multi-persona diversity to PQ-4 test data and step 5 (subjectId diversity verification) per GxP compliance review finding 3 |
|                  | 1.0 (2026-02-14): Initial release — formal step-by-step IQ/OQ/PQ test protocols extracted from 09-validation-plan.md per GxP compliance finding (test protocols require formal structure per GAMP 5) |
-->

_Previous: [Decommissioning](./12-decommissioning.md)_


---

## Purpose

This document provides formal step-by-step test protocols for all IQ, OQ, and PQ test cases defined in the Validation Plan (§67, 09-validation-plan.md). Each protocol includes prerequisites, numbered procedures, specific test data, per-step expected results, and tester/reviewer signature blocks as required by GAMP 5 Category 5 validation. See [ADR #33](../decisions/033-iq-oq-pq-validation-package.md) for the rationale behind shipping IQ/OQ/PQ as the `@hex-di/guard-validation` package.

The Validation Plan (09-validation-plan.md) defines **what** is tested and the pass criteria. This document defines **how** each test is executed.

### Execution Scope and Library-Level Verification

These test protocols are **execution templates** for consumer organizations deploying `@hex-di/guard` in GxP-regulated environments. The blank fields (Actual Result, Pass/Fail, Tester, Reviewer) are intentional — they are filled in by the deploying organization during their site-specific IQ/OQ/PQ execution.

**Library-level verification** is provided separately through the automated test suite defined in [16-definition-of-done.md](../process/definitions-of-done.md):

- **1176 automated Vitest tests** across 29 DoD items (unit tests, type tests, integration tests, conformance suites)
- **118 Cucumber BDD scenarios** across 23 feature files providing acceptance-level coverage
- **100% mutation kill rate** on policy evaluation logic (DoD 5)
- **13 integration test scenarios** (GE-1 through MS-2) validating cross-concern contracts

The automated test suite serves as the library author's verification evidence. Consumer organizations execute the formal protocols below against their specific deployment environment, configuration, and user population. Both layers of evidence — library-level automation and site-level protocol execution — together satisfy the GAMP 5 Category 5 validation requirement.

```
REQUIREMENT: Consumer organizations MUST execute these test protocols in their
             target deployment environment and retain the completed protocols
             (with Actual Results, Pass/Fail determinations, and Tester/Reviewer
             signatures) as formal validation evidence. Library-level automated
             test results (CI reports, mutation testing reports) MAY be referenced
             as supplementary evidence but do NOT substitute for site-level
             protocol execution.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.
```

```
REQUIREMENT: All IQ/OQ/PQ test protocols in this document MUST be executed using
             the step-by-step procedures defined below. Deviations from the
             documented procedure MUST be recorded using the deviation report
             template (Appendix K, [Deviation Report Template](../appendices/deviation-report-template.md)) and assessed for impact
             before the test result is accepted.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.
```

---

## Protocol Execution Instructions

### Who Executes

- **IQ Protocols:** System administrator or qualified deployment engineer
- **OQ Protocols:** QA engineer or qualified test engineer with guard domain knowledge
- **PQ Protocols:** QA engineer with production environment access

### Recording Results

1. Record **Actual Result** in the designated column for each step
2. Mark each step **Pass** or **Fail**
3. If any step fails, stop the protocol and record the failure details
4. Create a deviation report (Appendix K) for any unexpected results
5. Do not proceed to the next protocol until deviations are dispositioned

### Sign-Off Procedures

1. The **Tester** signs and dates upon completion of all steps
2. The **Reviewer** independently verifies the recorded results against expected results
3. The Reviewer MUST NOT be the same person as the Tester
4. Both signatures are required before the protocol is considered complete

---

## 87. IQ Protocols

### Protocol IQ-1: Package Version Verification

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** Target environment provisioned with Node.js >= 18.0.0; @hex-di/guard installed
**Test Data:** Approved version number from change request

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `npm ls @hex-di/guard` | Command succeeds without errors | _________ | ___ / ___ |
| 2 | Compare displayed version against approved version | Exact version match | _________ | ___ / ___ |
| 3 | Verify no duplicate installations in dependency tree | Single installation listed | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-2: Core Peer Dependency Verification

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** @hex-di/guard installed
**Test Data:** Expected @hex-di/core peer version range from package.json

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `npm ls @hex-di/core` | Command succeeds without errors | _________ | ___ / ___ |
| 2 | Compare displayed version against peer dependency range | Version within declared peer range | _________ | ___ / ___ |
| 3 | Verify no peer dependency warnings | No "WARN" messages for @hex-di/core | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-3: Node.js Runtime Version

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** Target environment provisioned
**Test Data:** Minimum Node.js version: 18.0.0

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `node --version` | Version number displayed | _________ | ___ / ___ |
| 2 | Compare major version against minimum (18) | Major version >= 18 | _________ | ___ / ___ |
| 3 | Verify crypto module available: `node -e "require('crypto')"` | No error thrown | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-4: TypeScript Compiler Version

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** TypeScript installed in target environment
**Test Data:** Minimum TypeScript version: 5.0.0

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `npx tsc --version` | Version number displayed | _________ | ___ / ___ |
| 2 | Compare major version against minimum (5) | Major version >= 5 | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-5: TypeScript Compilation

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** @hex-di/guard source and tsconfig.json available
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm typecheck` | Command completes | _________ | ___ / ___ |
| 2 | Verify exit code is 0 | Exit code = 0 | _________ | ___ / ___ |
| 3 | Verify zero errors in output | No "error TS" lines in output | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-6: ESLint Compliance

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** ESLint configured; @hex-di/guard source available
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm lint` | Command completes | _________ | ___ / ___ |
| 2 | Verify zero errors in output | Error count = 0 | _________ | ___ / ___ |
| 3 | Verify zero warnings in output | Warning count = 0 | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-7: No eslint-disable in Production Source

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** @hex-di/guard source available
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `grep -r "eslint-disable" src/ --exclude-dir=tests --exclude-dir=__tests__ --exclude="*.test.ts" --exclude="*.spec.ts"` | Command completes | _________ | ___ / ___ |
| 2 | Verify zero matches | No output lines (zero matches) | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-8: Package Integrity Verification

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** @hex-di/guard installed; lock file available
**Test Data:** Published integrity hash from npm registry

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `npm audit signatures` or inspect integrity hash in pnpm-lock.yaml | Integrity hash retrieved | _________ | ___ / ___ |
| 2 | Compare integrity hash against published registry value | Hash matches published value | _________ | ___ / ___ |
| 3 | Verify no signature verification failures | All signatures valid or "audit signatures" reports success | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-9: Dependency Vulnerability Scan

**Requirement Traceability:** REQ-GUARD-025, REQ-GUARD-038, REQ-GUARD-048, URS-GUARD-009
**Prerequisites:** @hex-di/guard installed with all dependencies
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm audit` (or Snyk, npm audit equivalent) | Audit report generated | _________ | ___ / ___ |
| 2 | Review report for critical severity vulnerabilities in production deps | Zero critical vulnerabilities | _________ | ___ / ___ |
| 3 | Review report for high severity vulnerabilities in production deps | Zero high vulnerabilities | _________ | ___ / ___ |
| 4 | Document any moderate/low findings for risk acceptance | Findings documented (if any) | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-10: No Signing Keys or Secrets in Source

**Requirement Traceability:** REQ-GUARD-032, REQ-GUARD-033, URS-GUARD-013
**Prerequisites:** @hex-di/guard source available
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `grep -rE "PRIVATE KEY\|-----BEGIN\|secret.*=.*[A-Za-z0-9+/]{20}" src/` | Command completes | _________ | ___ / ___ |
| 2 | Verify zero matches | No output lines (zero matches) | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-11: Audit Trail Backing Store Encryption

**Requirement Traceability:** REQ-GUARD-001, REQ-GUARD-005, REQ-GUARD-017, URS-GUARD-002
**Prerequisites:** Audit trail backing store provisioned and configured
**Test Data:** Target storage system encryption settings

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Verify TDE configuration, SSE settings, or FDE status on target storage | Encryption configuration retrieved | _________ | ___ / ___ |
| 2 | Confirm encryption algorithm is AES-256 or equivalent NIST-approved | Algorithm meets NIST standard | _________ | ___ / ___ |
| 3 | Verify encryption key management (key rotation, access controls) | Key management documented | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol IQ-12: SBOM Generation

**Requirement Traceability:** REQ-GUARD-038, REQ-GUARD-040, REQ-GUARD-048, URS-GUARD-009
**Prerequisites:** @hex-di/guard installed; SBOM tool available (CycloneDX, SPDX, or npm sbom)
**Test Data:** N/A (required when gxp: true)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run SBOM generation tool (e.g., `npm sbom --sbom-format cyclonedx`) | SBOM file generated | _________ | ___ / ___ |
| 2 | Verify SBOM format is CycloneDX or SPDX | Format matches recognized standard | _________ | ___ / ___ |
| 3 | Verify SBOM includes all direct dependencies with versions | All direct deps listed with versions | _________ | ___ / ___ |
| 4 | Verify SBOM includes transitive dependencies with integrity hashes | Transitive deps listed with hashes | _________ | ___ / ___ |
| 5 | Archive SBOM alongside IQ report | SBOM archived with document ID | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

## 88. OQ Protocols

### Core Test Suite (OQ-1 through OQ-5)

#### Protocol OQ-1: Unit Test Suite

**Requirement Traceability:** REQ-GUARD-001, REQ-GUARD-002, REQ-GUARD-007, REQ-GUARD-008, REQ-GUARD-009, REQ-GUARD-038, REQ-GUARD-039, URS-GUARD-009
**Prerequisites:** IQ passed; @hex-di/guard installed and compiled
**Test Data:** N/A (uses built-in test fixtures)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm test` | Test runner starts and discovers test files | _________ | ___ / ___ |
| 2 | Wait for test suite completion | All tests execute | _________ | ___ / ___ |
| 3 | Verify 100% pass rate | Zero failures reported | _________ | ___ / ___ |
| 4 | Verify test count >= baseline (281) | Test count >= 281 | _________ | ___ / ___ |
| 5 | Archive test output log | Output log saved with timestamp | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-2: Type Test Suite

**Requirement Traceability:** REQ-GUARD-038, REQ-GUARD-049, URS-GUARD-009
**Prerequisites:** IQ passed; TypeScript >= 5.0.0
**Test Data:** N/A

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm test:types` | Type test runner starts | _________ | ___ / ___ |
| 2 | Verify all type tests pass | Zero type test failures | _________ | ___ / ___ |
| 3 | Verify type test count >= 54 | Count >= 54 | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-3: Integration Test Suite

**Requirement Traceability:** REQ-GUARD-004, REQ-GUARD-037, REQ-GUARD-038, URS-GUARD-001, URS-GUARD-009
**Prerequisites:** IQ passed
**Test Data:** N/A (uses built-in test fixtures)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm test` (integration tests included) | Integration tests execute | _________ | ___ / ___ |
| 2 | Verify integration test count >= 51 | Count >= 51 | _________ | ___ / ___ |
| 3 | Verify 100% pass rate for integration tests | Zero failures | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-4: Mutation Kill Rate — Core Evaluation

**Requirement Traceability:** REQ-GUARD-039, URS-GUARD-009
**Prerequisites:** OQ-1 passed; Stryker Mutator installed and configured
**Test Data:** Core evaluation source files (evaluate.ts, evaluateAsync.ts)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run Stryker mutation testing on core evaluation logic | Mutation report generated | _________ | ___ / ___ |
| 2 | Verify mutation kill rate = 100% | Kill rate = 100% | _________ | ___ / ___ |
| 3 | Archive HTML and JSON mutation reports | Reports archived | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-5: Mutation Kill Rate — Combinators

**Requirement Traceability:** REQ-GUARD-039, URS-GUARD-009
**Prerequisites:** OQ-1 passed; Stryker Mutator installed
**Test Data:** Combinator source files (allOf, anyOf, not, hasPermission, hasRole, hasAttribute, hasSignature, hasRelationship)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run Stryker mutation testing on combinator logic | Mutation report generated | _________ | ___ / ___ |
| 2 | Verify mutation kill rate = 100% | Kill rate = 100% | _________ | ___ / ___ |
| 3 | Archive HTML and JSON mutation reports | Reports archived | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Audit Trail Integrity (OQ-6, OQ-7, OQ-27 through OQ-30)

#### Protocol OQ-6: Hash Chain Validation

**Requirement Traceability:** REQ-GUARD-007, REQ-GUARD-010, REQ-GUARD-013, URS-GUARD-005
**Prerequisites:** OQ-1 passed; audit trail adapter configured with hash chain enabled
**Test Data:** 1000 sequential audit entries across at least 2 scopes

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create 1000 sequential audit entries via evaluate() | All entries recorded successfully | _________ | ___ / ___ |
| 2 | Run `verifyAuditChain()` on the complete chain | Returns true (chain valid) | _________ | ___ / ___ |
| 3 | Trigger scope disposal on at least one scope | Disposal triggers chain verification | _________ | ___ / ___ |
| 4 | Verify chain verification was invoked during disposal | Chain verification log entry present | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-7: AuditEntry Completeness

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-006, REQ-GUARD-008, REQ-GUARD-011, URS-GUARD-002, URS-GUARD-003
**Prerequisites:** OQ-1 passed
**Test Data:** One Allow evaluation and one Deny evaluation

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Execute evaluation resulting in Allow decision | AuditEntry created | _________ | ___ / ___ |
| 2 | Verify Allow entry has all 10 required fields populated | All fields non-null/non-empty: evaluationId, scopeId, subjectId, portName, decision, timestamp, durationMs, integrityHash, previousHash, sequenceNumber | _________ | ___ / ___ |
| 3 | Execute evaluation resulting in Deny decision | AuditEntry created | _________ | ___ / ___ |
| 4 | Verify Deny entry has all 10 required fields plus denial reason | All fields populated; denialReason present | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-27: Mixed Hash Chain Verification

**Requirement Traceability:** REQ-GUARD-010, REQ-GUARD-013, URS-GUARD-005
**Prerequisites:** OQ-6 passed
**Test Data:** Chain containing both AuditEntry and PolicyChangeAuditEntry records

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create audit entries interspersed with policy change entries | Mixed chain created | _________ | ___ / ___ |
| 2 | Run `verifyAuditChain()` on the mixed chain | Chain validates successfully | _________ | ___ / ___ |
| 3 | Tamper with a single AuditEntry field | Entry modified | _________ | ___ / ___ |
| 4 | Run `verifyAuditChain()` on the tampered chain | Chain validation fails; tampered entry identified | _________ | ___ / ___ |
| 5 | Tamper with a PolicyChangeAuditEntry field | Entry modified | _________ | ___ / ___ |
| 6 | Run `verifyAuditChain()` on the tampered chain | Chain validation fails; tampered entry identified | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-28: DataClassification Backfill Meta-Audit

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-019, URS-GUARD-002
**Prerequisites:** OQ-7 passed; gxp: true configured
**Test Data:** Existing audit entry; new dataClassification value

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Add dataClassification to an existing audit entry | Classification applied | _________ | ___ / ___ |
| 2 | Verify DataClassificationChangeEntry written to MetaAuditTrailPort | Meta-audit record present with all required fields | _________ | ___ / ___ |
| 3 | Verify meta-audit record contains original and new classification values | Values match expected | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-29: Archive and Restore with Chain Verification

**Requirement Traceability:** REQ-GUARD-016, REQ-GUARD-018, REQ-GUARD-046, REQ-GUARD-047, REQ-GUARD-050, URS-GUARD-014
**Prerequisites:** OQ-6 passed; audit trail with >= 100 entries
**Test Data:** Existing audit trail with verified hash chain

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run pre-archival `verifyAuditChain()` | Chain valid | _________ | ___ / ___ |
| 2 | Export audit trail to JSON Lines with manifest | Export file and manifest generated | _________ | ___ / ___ |
| 3 | Transfer to separate environment and import | Import completes without errors | _________ | ___ / ___ |
| 4 | Verify entry count matches source | Counts match | _________ | ___ / ___ |
| 5 | Run `verifyAuditChain()` on restored data | Chain valid | _________ | ___ / ___ |
| 6 | Compare sample entries (field-by-field) with source | All fields match | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-30: Background Chain Verification Detects Tampering

**Requirement Traceability:** REQ-GUARD-009, REQ-GUARD-010, REQ-GUARD-051, URS-GUARD-005
**Prerequisites:** OQ-6 passed; gxp: true; background chain verification configured
**Test Data:** Valid audit chain; one entry to tamper

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure daily background chain verification | Verification schedule active | _________ | ___ / ___ |
| 2 | Wait for or trigger verification cycle | Verification completes; chain valid | _________ | ___ / ___ |
| 3 | Tamper with a single entry in the backing store | Entry modified directly | _________ | ___ / ___ |
| 4 | Wait for next verification cycle | Verification runs | _________ | ___ / ___ |
| 5 | Verify chain break detected and Chain Break Response triggered | Alert/event emitted with tampered entry details | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Electronic Signatures (OQ-8, OQ-10, OQ-32, OQ-33, OQ-39, OQ-40)

#### Protocol OQ-8: Electronic Signature Round-Trip

**Requirement Traceability:** REQ-GUARD-028, REQ-GUARD-029, REQ-GUARD-031, REQ-GUARD-032, REQ-GUARD-062, URS-GUARD-006
**Prerequisites:** OQ-1 passed; SignatureService adapter configured
**Test Data:** Valid subject with signing authority; re-authentication credentials

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Authenticate subject and obtain re-authentication token | Token obtained | _________ | ___ / ___ |
| 2 | Execute signature capture with valid token | Signature captured successfully | _________ | ___ / ___ |
| 3 | Validate the captured signature | Validation returns valid | _________ | ___ / ___ |
| 4 | Run createSignatureServiceConformanceSuite (10 core tests) | All 10 core tests pass | _________ | ___ / ___ |
| 5 | Run conformance suite with gxpMode: true (5 additional tests) | All 5 GxP tests pass | _________ | ___ / ___ |
| 6 | Code review: verify crypto.timingSafeEqual() usage | Constant-time comparison confirmed | _________ | ___ / ___ |
| 7 | Document code review evidence (reviewer, date, files) | Evidence documented | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-10: Counter-Signing with Independent Re-Auth

**Requirement Traceability:** REQ-GUARD-035, REQ-GUARD-036, REQ-GUARD-065, URS-GUARD-007
**Prerequisites:** OQ-8 passed; two subjects with signing authority
**Test Data:** Subject A (first signer); Subject B (counter-signer, different from A)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Subject A authenticates and obtains re-auth token | Token A obtained | _________ | ___ / ___ |
| 2 | Subject A captures first signature | First signature captured | _________ | ___ / ___ |
| 3 | Subject B authenticates independently and obtains re-auth token | Token B obtained (different from Token A) | _________ | ___ / ___ |
| 4 | Subject B captures counter-signature | Counter-signature captured | _________ | ___ / ___ |
| 5 | Verify both signatures recorded independently | Two distinct signature records; signerIds differ | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-32: Negative — Forged integrityHash

**Requirement Traceability:** REQ-GUARD-009, REQ-GUARD-010, URS-GUARD-005
**Prerequisites:** OQ-6 passed
**Test Data:** Manually computed integrityHash with wrong field ordering

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Insert audit entry with manually computed integrityHash (non-canonical field ordering) | Entry inserted | _________ | ___ / ___ |
| 2 | Run `verifyAuditChain()` | Chain break detected at forged entry | _________ | ___ / ___ |
| 3 | Verify Chain Break Response triggered | Alert emitted with forged entry details | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-33: Negative — Expired ReauthenticationToken Replay

**Requirement Traceability:** REQ-GUARD-028, REQ-GUARD-030, REQ-GUARD-063, REQ-GUARD-064, URS-GUARD-006
**Prerequisites:** OQ-8 passed; gxp: true
**Test Data:** Expired re-authentication token; valid but previously consumed token

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Attempt capture() with expired token | Rejection with "reauth_expired" category | _________ | ___ / ___ |
| 2 | Obtain valid token and use it for successful capture() | Capture succeeds | _________ | ___ / ___ |
| 3 | Attempt capture() again with the same (now consumed) token | Rejection with "token_replayed" category | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-39: Certificate Chain Validation for Archival

**Requirement Traceability:** REQ-GUARD-033, REQ-GUARD-034, REQ-GUARD-068, URS-GUARD-018
**Prerequisites:** OQ-8 passed; SignatureService with configurable certificate expiry
**Test Data:** Certificate nearing expiry (within 90 days); revoked certificate; self-signed certificate

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure certificate nearing expiry (within 90 days) | Configuration applied | _________ | ___ / ___ |
| 2 | Verify 90-day threshold event emitted | Event received | _________ | ___ / ___ |
| 3 | Advance to 30-day threshold | Threshold reached | _________ | ___ / ___ |
| 4 | Verify 30-day threshold event emitted | Event received | _________ | ___ / ___ |
| 5 | Advance to 7-day threshold | Threshold reached | _________ | ___ / ___ |
| 6 | Verify 7-day threshold event emitted | Event received | _________ | ___ / ___ |
| 7 | Revoke signing certificate; attempt validate() on existing signature | Validation result includes revocation status | _________ | ___ / ___ |
| 8 | Archive certificate chain alongside audit trail; verify chain after expiry | verifyAuditChain() succeeds using archived chain | _________ | ___ / ___ |
| 9 | Attempt GxP production with self-signed certificate | Configuration rejected | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-40: Algorithm Migration Epoch Boundary

**Requirement Traceability:** REQ-GUARD-034, REQ-GUARD-069, URS-GUARD-018
**Prerequisites:** OQ-8 passed; two algorithm epochs defined (e.g., RSA -> ECDSA)
**Test Data:** Entries signed with RSA (epoch 1); entries signed with ECDSA (epoch 2)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create entries signed with RSA (epoch 1) | Entries created and signed | _________ | ___ / ___ |
| 2 | Transition to dual-signing phase | Configuration updated | _________ | ___ / ___ |
| 3 | Create entries signed with ECDSA (epoch 2) | Entries created and signed | _________ | ___ / ___ |
| 4 | Run `verifyAuditChain()` across epoch boundary | Chain validates with multi-algorithm verification | _________ | ___ / ___ |
| 5 | Verify deprecation timeline warning at T-24mo (INFO) | INFO log emitted | _________ | ___ / ___ |
| 6 | Verify deprecation timeline warning at T-12mo (checkGxPReadiness WARNING) | WARNING reported | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Error Handling (OQ-9, OQ-11 through OQ-16)

#### Protocol OQ-9: failOnAuditError Blocks on Write Failure

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-055, URS-GUARD-002
**Prerequisites:** OQ-1 passed; audit trail adapter with simulated failure
**Test Data:** AuditTrailPort adapter that throws on record()

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard graph with failOnAuditError: true | Configuration applied | _________ | ___ / ___ |
| 2 | Configure audit adapter to fail on next record() call | Failure injected | _________ | ___ / ___ |
| 3 | Execute guard evaluation | Evaluation proceeds to audit write | _________ | ___ / ___ |
| 4 | Verify AuditTrailWriteError thrown | Error with correct type thrown | _________ | ___ / ___ |
| 5 | Verify evaluation result is not returned to caller | Caller receives error, not a decision | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-11: NoopAuditTrail GxP Detection

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-037, URS-GUARD-002
**Prerequisites:** OQ-1 passed
**Test Data:** NoopAuditTrailAdapter instance

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Attempt to pass NoopAuditTrailAdapter to createGuardGraph({ gxp: true }) in TypeScript | Compile-time type error | _________ | ___ / ___ |
| 2 | Bypass type system; pass NoopAuditTrailAdapter at runtime | Runtime ConfigurationError (ACL012) thrown | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-12: Policy Evaluation at Maximum Nesting Depth

**Requirement Traceability:** REQ-GUARD-039, REQ-GUARD-043, URS-GUARD-001
**Prerequisites:** OQ-1 passed
**Test Data:** Deeply nested policy tree (allOf(anyOf(not(allOf(...)))))

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Construct policy at maximum documented nesting depth | Policy created | _________ | ___ / ___ |
| 2 | Evaluate the deeply nested policy | Correct result or documented depth limit error; no stack overflow | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-13: SignatureService Failure Handling

**Requirement Traceability:** REQ-GUARD-028, REQ-GUARD-033, REQ-GUARD-055, URS-GUARD-006
**Prerequisites:** OQ-8 passed
**Test Data:** Simulated HSM unavailability; simulated network timeout

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Simulate HSM unavailability | HSM connection fails | _________ | ___ / ___ |
| 2 | Attempt signature capture | Err(SignatureError) returned with appropriate category | _________ | ___ / ___ |
| 3 | Verify no partial state left behind | No orphaned signature records | _________ | ___ / ___ |
| 4 | Simulate network timeout on signature validation | Timeout triggered | _________ | ___ / ___ |
| 5 | Verify Err(SignatureError) returned | Error with timeout category | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-14: SubjectProvider Failure During Guarded Evaluation

**Requirement Traceability:** REQ-GUARD-004, REQ-GUARD-055, URS-GUARD-003
**Prerequisites:** OQ-1 passed
**Test Data:** SubjectProvider that throws (simulating IdP unavailability)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure SubjectProvider to fail | Failure injected | _________ | ___ / ___ |
| 2 | Attempt guarded port resolution | Resolution blocked | _________ | ___ / ___ |
| 3 | Verify PolicyEvaluationError (ACL003) returned with diagnostic | Error with correct code and diagnostic detail | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-15: Audit Entry Field Boundary Conditions

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-011, URS-GUARD-002
**Prerequisites:** OQ-7 passed
**Test Data:** Maximum-length subjectId; maximum-length portName

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create evaluation with maximum-length subjectId | Evaluation completes | _________ | ___ / ___ |
| 2 | Verify documented behavior (truncation with warning OR rejection with error) | Behavior matches documentation | _________ | ___ / ___ |
| 3 | Create evaluation with maximum-length portName | Evaluation completes | _________ | ___ / ___ |
| 4 | Verify documented behavior | Behavior matches documentation | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-16: Session Interruption Detection

**Requirement Traceability:** REQ-GUARD-028, REQ-GUARD-058, URS-GUARD-006
**Prerequisites:** OQ-8 passed
**Test Data:** Valid ReauthenticationToken; session interruption trigger

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Obtain valid ReauthenticationToken | Token obtained | _________ | ___ / ___ |
| 2 | Trigger session interruption mechanism | Interruption triggered | _________ | ___ / ___ |
| 3 | Attempt capture() with the token | Token rejected | _________ | ___ / ___ |
| 4 | Verify re-authentication is required | New authentication required for new token | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Clock and Timestamps (OQ-17, OQ-21)

#### Protocol OQ-17: NTP Clock Drift Tolerance

**Requirement Traceability:** REQ-GUARD-014, REQ-GUARD-015, REQ-GUARD-062, URS-GUARD-004
**Prerequisites:** OQ-1 passed; NTP-synchronized ClockSource configured
**Test Data:** Simulated clock drift values: 500ms (within tolerance), 1500ms (exceeds tolerance)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Compare ClockSource.now() against NTP reference with drift < 1s | Drift measured within tolerance | _________ | ___ / ___ |
| 2 | Verify health check passes | Health check status: ok | _________ | ___ / ___ |
| 3 | Inject simulated drift exceeding 1-second threshold | Drift injected | _________ | ___ / ___ |
| 4 | Verify health check fails | Health check status: fail | _________ | ___ / ___ |
| 5 | Verify operational alert triggered | Alert emitted with drift details | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-21: NTP Service Unavailability Failover

**Requirement Traceability:** REQ-GUARD-014, REQ-GUARD-015, REQ-GUARD-054, URS-GUARD-004
**Prerequisites:** OQ-17 passed
**Test Data:** NTP service that can be disabled/enabled

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Disable NTP source | NTP unavailable | _________ | ___ / ___ |
| 2 | Verify ClockSource falls back to local clock within 1 second | Fallback active | _________ | ___ / ___ |
| 3 | Verify WARNING log emitted with NTP endpoint and failure reason | Log entry present | _________ | ___ / ___ |
| 4 | Execute evaluation and verify fallback metadata in audit entry | Metadata indicates reduced confidence | _________ | ___ / ___ |
| 5 | Restore NTP source | NTP available again | _________ | ___ / ___ |
| 6 | Verify confidence indicator restored to normal | Normal confidence in subsequent entries | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Backup and Recovery (OQ-18, OQ-19, OQ-19a)

#### Protocol OQ-18: Backup Restore and Hash Chain Verification

**Requirement Traceability:** REQ-GUARD-011, REQ-GUARD-016, REQ-GUARD-018, URS-GUARD-014
**Prerequisites:** OQ-6 passed; audit trail with hash chain
**Test Data:** Audit trail with >= 100 entries

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create audit trail with hash chain enabled | Entries created | _________ | ___ / ___ |
| 2 | Backup the audit trail backing store | Backup completed | _________ | ___ / ___ |
| 3 | Restore backup to a separate environment | Restore completed without errors | _________ | ___ / ___ |
| 4 | Run `verifyAuditChain()` on restored data | Chain verification passes | _________ | ___ / ___ |
| 5 | Compare entry counts between source and restored | Counts match | _________ | ___ / ___ |
| 6 | Compare field values for sample entries | All field values match | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-19: WAL Crash Recovery

**Requirement Traceability:** REQ-GUARD-006, REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** OQ-1 passed; WAL store configured
**Test Data:** Simulated process interruption between evaluate() and record()

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Begin evaluation that writes to WAL before audit record | WAL entry created | _________ | ___ / ___ |
| 2 | Simulate process interruption between evaluate() and record() | Process halted | _________ | ___ / ___ |
| 3 | Restart process and invoke WAL recovery scan | Recovery scan runs | _________ | ___ / ___ |
| 4 | Verify getPendingIntents() returns orphaned evaluationId | Orphaned intent found | _________ | ___ / ___ |
| 5 | Verify reconciliation with AuditTrail confirms no matching entry | No matching audit entry | _________ | ___ / ___ |
| 6 | Verify intent flagged for remediation | Intent marked for remediation | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-19a: Periodic WAL Scan Verification

**Requirement Traceability:** REQ-GUARD-006, REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** OQ-19 passed
**Test Data:** Orphaned pending intent (created without process restart)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure shortened WAL scan interval | Interval configured | _________ | ___ / ___ |
| 2 | Create orphaned pending intent without process restart | Orphaned intent exists | _________ | ___ / ___ |
| 3 | Wait for periodic scan cycle | Scan runs | _________ | ___ / ___ |
| 4 | Verify orphaned intent detected by periodic scan | Intent detected | _________ | ___ / ___ |
| 5 | Verify intent flagged for remediation | Intent marked for remediation | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Administrative Controls (OQ-22 through OQ-24, OQ-34, OQ-35)

#### Protocol OQ-22: IdP Password Quality Verification

**Requirement Traceability:** REQ-GUARD-028, REQ-GUARD-030, URS-GUARD-006
**Prerequisites:** Identity Provider configured for the deployment
**Test Data:** IdP security policy documentation

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Review IdP documentation for password complexity rules | Rules documented | _________ | ___ / ___ |
| 2 | Verify minimum password length configured | Length meets 21 CFR 11.300(d) | _________ | ___ / ___ |
| 3 | Verify character class requirements active | Multiple character classes required | _________ | ___ / ___ |
| 4 | Verify password expiration enforced | Expiration policy active | _________ | ___ / ___ |
| 5 | Verify password history prevents reuse | History policy active | _________ | ___ / ___ |
| 6 | Verify account lockout after failed attempts | Lockout policy active | _________ | ___ / ___ |
| 7 | Document evidence in validation plan | Evidence attached | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-23: PolicyChangeAuditEntry Recording

**Requirement Traceability:** REQ-GUARD-020, REQ-GUARD-021, REQ-GUARD-022, REQ-GUARD-023, REQ-GUARD-082, URS-GUARD-012
**Prerequisites:** OQ-1 passed; gxp: true
**Test Data:** Policy modification via deserializePolicy() or configuration reload

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Modify a policy via deserializePolicy() or config reload | Policy change initiated | _________ | ___ / ___ |
| 2 | Verify PolicyChangeAuditEntry recorded before activation | Entry present with correct _tag | _________ | ___ / ___ |
| 3 | Verify previousPolicyHash and newPolicyHash computed via hashPolicy() | Hashes present and correct | _________ | ___ / ___ |
| 4 | Verify entry participates in same hash chain as regular AuditEntry | Chain includes both entry types | _________ | ___ / ___ |
| 5 | Verify approverId differs from actorId (separation of duties) | approverId != actorId | _________ | ___ / ___ |
| 6 | Verify changeRequestId is non-empty when gxp: true | changeRequestId present | _________ | ___ / ___ |
| 7 | Run verifyAuditChain() after policy change | Chain valid | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-24: GxP Regression Test Permanence

**Requirement Traceability:** REQ-GUARD-019, REQ-GUARD-038, REQ-GUARD-041, URS-GUARD-009
**Prerequisites:** OQ-1 passed
**Test Data:** gxp-regression-registry.json manifest

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Scan OQ test suite for @gxp-regression annotations | Annotations discovered | _________ | ___ / ___ |
| 2 | Compare against gxp-regression-registry.json manifest | All registered IDs found | _________ | ___ / ___ |
| 3 | Verify no registered IDs are missing from test suite | Zero missing IDs | _________ | ___ / ___ |
| 4 | Verify registry is append-only (no deletions from previous version) | No removals detected | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-34: Negative — Role Incompatibility Bypass

**Requirement Traceability:** REQ-GUARD-023, REQ-GUARD-026, REQ-GUARD-027, REQ-GUARD-061, URS-GUARD-010
**Prerequisites:** OQ-1 passed; AdminGuardConfig configured
**Test Data:** Subject holding two incompatible roles (e.g., Guard Admin + Audit Reviewer)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create subject with two incompatible administrative roles | Subject created | _________ | ___ / ___ |
| 2 | Attempt administrative operation | Operation denied with ACL017 | _________ | ___ / ___ |
| 3 | Verify audit log entry recorded for the denial | Denial entry present | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-35: Negative — Evaluation During Change Freeze

**Requirement Traceability:** REQ-GUARD-020, REQ-GUARD-023, REQ-GUARD-060, URS-GUARD-012
**Prerequisites:** OQ-23 passed
**Test Data:** Active change freeze period

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Activate change freeze | Freeze active | _________ | ___ / ___ |
| 2 | Attempt guard:config:modify operation | Rejected with ACL018 | _________ | ___ / ___ |
| 3 | Attempt guard:policy:approve operation | Rejected with ACL018 | _________ | ___ / ___ |
| 4 | Verify administrative event log entries for both rejections | Log entries present | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Cross-Library and Compliance (OQ-25, OQ-26, OQ-36 through OQ-43)

#### Protocol OQ-25: Cross-Library Validation Coordination

**Requirement Traceability:** REQ-GUARD-038, REQ-GUARD-040, REQ-GUARD-066, URS-GUARD-009
**Prerequisites:** OQ-1 passed; @hex-di/http-client co-deployed (or mark "skip" if not)
**Test Data:** Guard + http-client deployment configuration

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Deploy guard + http-client together | Both packages installed | _________ | ___ / ___ |
| 2 | Verify shared ClockSource configured | Same ClockSource instance used | _________ | ___ / ___ |
| 3 | Verify shared hash chain | Chain spans both systems | _________ | ___ / ___ |
| 4 | Verify signature delegation | Signatures delegated correctly | _________ | ___ / ___ |
| 5 | Verify version compatibility matrix | Matrix passes | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-26: GxP Anonymous Subject Rejection

**Requirement Traceability:** REQ-GUARD-004, REQ-GUARD-044, URS-GUARD-003
**Prerequisites:** OQ-1 passed; gxp: true
**Test Data:** Anonymous subject (empty subjectId); anonymous authentication method

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create subject with empty subjectId | Subject created | _________ | ___ / ___ |
| 2 | Attempt guarded evaluation with anonymous subject | Rejected BEFORE policy evaluation | _________ | ___ / ___ |
| 3 | Verify ACL014 error code | Error code = ACL014 | _________ | ___ / ___ |
| 4 | Verify audit entry records decision "deny" with ACL014 | Audit entry present | _________ | ___ / ___ |
| 5 | Test with authenticationMethod === "anonymous" | Same rejection behavior | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-31: Policy Rollback Audit Trail

**Requirement Traceability:** REQ-GUARD-020, REQ-GUARD-022, REQ-GUARD-023, URS-GUARD-012
**Prerequisites:** OQ-23 passed
**Test Data:** Previously changed policy; rollback request

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Execute policy rollback | Rollback initiated | _________ | ___ / ___ |
| 2 | Verify new PolicyChangeAuditEntry with reverted content | Entry created with reverted policy | _________ | ___ / ___ |
| 3 | Verify references to original changeId | Original changeId referenced | _________ | ___ / ___ |
| 4 | Verify hash chain passes | verifyAuditChain() returns valid | _________ | ___ / ___ |
| 5 | Verify rollback approver differs from original approver | Different approverIds | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-36: Circuit Breaker State Transitions

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-053, URS-GUARD-002
**Prerequisites:** OQ-9 passed
**Test Data:** Consecutive audit backend failures exceeding threshold

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Simulate consecutive audit backend failures exceeding threshold | Failures injected | _________ | ___ / ___ |
| 2 | Verify circuit breaker transitions to OPEN state | State = OPEN | _________ | ___ / ___ |
| 3 | Wait for reset timeout | Timeout elapsed | _________ | ___ / ___ |
| 4 | Verify HALF-OPEN state probe attempt | Probe executed | _________ | ___ / ___ |
| 5 | Simulate success on probe | Probe succeeds | _________ | ___ / ___ |
| 6 | Verify CLOSED recovery | State = CLOSED | _________ | ___ / ___ |
| 7 | Verify all state transitions logged | Log entries for CLOSED->OPEN, OPEN->HALF-OPEN, HALF-OPEN->CLOSED | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-37: Scheduled Chain Re-Verification

**Requirement Traceability:** REQ-GUARD-010, REQ-GUARD-051, REQ-GUARD-052, URS-GUARD-005
**Prerequisites:** OQ-6 passed
**Test Data:** Shortened verification interval; tampered entry

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure scheduleChainVerification() with shortened interval | Schedule active | _________ | ___ / ___ |
| 2 | Wait for verification cycle | Verification runs | _________ | ___ / ___ |
| 3 | Verify health event emitted (chain valid) | Health event: valid | _________ | ___ / ___ |
| 4 | Inject tampered entry into chain | Entry tampered | _________ | ___ / ___ |
| 5 | Wait for next verification cycle | Verification runs | _________ | ___ / ___ |
| 6 | Verify chain break detected | Chain break event emitted | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-38: Predicate Rule Mapping Runtime Verification

**Requirement Traceability:** REQ-GUARD-002, REQ-GUARD-003, REQ-GUARD-067, URS-GUARD-015
**Prerequisites:** OQ-1 passed
**Test Data:** Guard graph with gxp: true and empty predicateRuleMapping; valid mapping

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard graph with gxp: true and empty predicateRuleMapping | Configuration attempted | _________ | ___ / ___ |
| 2 | Verify ConfigurationError at build time | Error thrown | _________ | ___ / ___ |
| 3 | Configure with valid predicateRuleMapping | Configuration succeeds | _________ | ___ / ___ |
| 4 | Run checkGxPReadiness() | Readiness check runs | _________ | ___ / ___ |
| 5 | Verify item 15 passes | Item 15: PASS | _________ | ___ / ___ |
| 6 | Remove mapping at runtime | Mapping removed | _________ | ___ / ___ |
| 7 | Run checkGxPReadiness() | Reports FAIL: "guard.predicate-rule-mapping-missing" | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-41: Policy Input Schema Validation

**Requirement Traceability:** REQ-GUARD-049, REQ-GUARD-070, URS-GUARD-016
**Prerequisites:** OQ-1 passed; gxp: true
**Test Data:** hasAttribute policy with undeclared attribute; incompatible matcher operand; wrong-type subject attribute

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure hasAttribute policy referencing undeclared attribute (gxp: true) | Configuration attempted | _________ | ___ / ___ |
| 2 | Verify ConfigurationError at build time | Error thrown | _________ | ___ / ___ |
| 3 | Configure incompatible matcher operand (e.g., inArray on boolean) | Configuration attempted | _________ | ___ / ___ |
| 4 | Verify ConfigurationError at build time | Error thrown | _________ | ___ / ___ |
| 5 | Provide subject attributes with wrong type at evaluation time | Evaluation attempted | _________ | ___ / ___ |
| 6 | Verify PolicyEvaluationError (not silent coercion) | Error thrown, no coercion | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-42: Resource Attribute Accuracy Check

**Requirement Traceability:** REQ-GUARD-071, URS-GUARD-017
**Prerequisites:** OQ-1 passed; gxp: true
**Test Data:** Resource attribute with maxAgeMs: 5000; stale attribute; fresh attribute; attribute without provenance

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard with gxp: true and resource attribute maxAgeMs: 5000 | Configuration applied | _________ | ___ / ___ |
| 2 | Provide attribute with timestamp older than 5000ms | Evaluation attempted | _________ | ___ / ___ |
| 3 | Verify deny with "attribute_stale" reason | Decision = deny; reason = attribute_stale | _________ | ___ / ___ |
| 4 | Provide attribute without provenance timestamp | Evaluation attempted | _________ | ___ / ___ |
| 5 | Verify WARNING log "guard.attribute-freshness-unknown" emitted (once per attribute name) | Warning logged | _________ | ___ / ___ |
| 6 | Provide fresh attribute (within maxAgeMs) | Evaluation attempted | _________ | ___ / ___ |
| 7 | Verify allow decision | Decision = allow | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-43: Cucumber BDD Acceptance Tests

**Requirement Traceability:** REQ-GUARD-072, REQ-GUARD-073, URS-GUARD-009
**Prerequisites:** OQ-1 passed; Cucumber configured
**Test Data:** 23 feature files with ~118 scenarios

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Run `pnpm test:cucumber` | Cucumber test runner starts | _________ | ___ / ___ |
| 2 | Verify 100% pass rate across all feature files | Zero failures | _________ | ___ / ___ |
| 3 | Verify JSON report generated at reports/cucumber-report.json | File exists | _________ | ___ / ___ |
| 4 | Verify all @gxp scenarios have @REQ-GUARD-xxx traceability tags | All tagged | _________ | ___ / ___ |
| 5 | Verify no mocks in step definitions (real evaluate(), real memory adapters) | No mock usage found | _________ | ___ / ___ |
| 6 | Archive JSON and HTML reports as OQ evidence | Reports archived | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-20: Capacity Monitoring Threshold Verification

**Requirement Traceability:** REQ-GUARD-005, REQ-GUARD-008, REQ-GUARD-011, URS-GUARD-002
**Prerequisites:** OQ-1 passed; audit trail adapter with capacity monitoring
**Test Data:** Simulated storage utilization at 69%, 70%, 85%, 95%

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Simulate storage utilization at 69% | Utilization set | _________ | ___ / ___ |
| 2 | Verify status "ok" and no event logged | Status: ok; no event | _________ | ___ / ___ |
| 3 | Simulate storage utilization at 70% | Utilization set | _________ | ___ / ___ |
| 4 | Verify status "warning" and structured event logged | Status: warning; event logged | _________ | ___ / ___ |
| 5 | Simulate storage utilization at 85% | Utilization set | _________ | ___ / ___ |
| 6 | Verify status "critical" and structured event logged | Status: critical; event logged | _________ | ___ / ___ |
| 7 | Simulate storage utilization at 95% | Utilization set | _________ | ___ / ___ |
| 8 | Verify status "emergency" and structured event logged | Status: emergency; event logged | _________ | ___ / ___ |
| 9 | Verify createGuardHealthCheck() reports matching values | storageUtilizationPct and capacityStatus match | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Ecosystem Extension Verification (OQ-44 through OQ-49)

> OQ-44 through OQ-49 are REQUIRED only when the corresponding ecosystem package is deployed in a GxP environment; otherwise they may be marked "N/A — package not deployed" with documented justification.

#### Protocol OQ-44: Distributed Policy Sync Verification

**Requirement Traceability:** REQ-GUARD-066, REQ-GUARD-074, REQ-GUARD-075, FM-33
**Prerequisites:** OQ-1 passed; PolicySyncPort configured across ≥2 nodes
**Test Data:** PolicyBundle v1 and v2; simulated sync failure on one node

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Deploy guard with PolicySyncPort across ≥2 nodes | Nodes connected | _________ | ___ / ___ |
| 2 | Register PolicyBundle v1 | Bundle registered; all nodes report v1 contentHash | _________ | ___ / ___ |
| 3 | Update to PolicyBundle v2 | Update propagated | _________ | ___ / ___ |
| 4 | Verify all nodes report v2 contentHash via health check | contentHash matches on all nodes | _________ | ___ / ___ |
| 5 | Verify change control evidence includes per-node activation timestamps | Timestamps documented | _________ | ___ / ___ |
| 6 | Simulate sync failure on one node | Failure injected | _________ | ___ / ___ |
| 7 | Verify health check reports policy version drift | Drift detected | _________ | ___ / ___ |
| 8 | Verify drift alert triggers within maximum propagation window | Alert received | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-45: Framework Middleware Route Coverage

**Requirement Traceability:** REQ-GUARD-066, REQ-GUARD-076, FM-34
**Prerequisites:** OQ-1 passed; guard-express or guard-fastify middleware deployed
**Test Data:** Application with guarded and unguarded routes; subject without valid credentials

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Deploy guard middleware (Express or Fastify) | Middleware active | _________ | ___ / ___ |
| 2 | Enumerate all registered routes | Route list obtained | _________ | ___ / ___ |
| 3 | Verify each guarded route invokes guard() adapter | Guard invocation confirmed per route | _________ | ___ / ___ |
| 4 | Attempt access to guarded route without valid subject | 403 response returned | _________ | ___ / ___ |
| 5 | Attempt access to unguarded route (if any) | Guard not invoked; access granted | _________ | ___ / ___ |
| 6 | Run route coverage test utility | Coverage report generated | _________ | ___ / ___ |
| 7 | Verify 100% coverage of GxP-guarded routes | Coverage = 100% | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-46: Persistence Adapter Integrity

**Requirement Traceability:** REQ-GUARD-066, REQ-GUARD-077, FM-32
**Prerequisites:** OQ-6 passed; Postgres audit trail adapter deployed
**Test Data:** 100 audit entries; test superuser role for direct SQL manipulation

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Insert 100 audit entries via Postgres audit trail adapter | All entries recorded | _________ | ___ / ___ |
| 2 | Run `verifyAuditChain()` | Chain valid | _________ | ___ / ___ |
| 3 | Attempt direct SQL UPDATE on one entry using test superuser role | Entry modified directly | _________ | ___ / ___ |
| 4 | Run `verifyAuditChain()` | Chain break detected at tampered entry | _________ | ___ / ___ |
| 5 | Verify REVOKE constraints prevent UPDATE/DELETE from application role | Operations rejected by database | _________ | ___ / ___ |
| 6 | Verify scheduled chain verification detects the tampering | Tampering detected by scheduled verification | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-47: Query Conversion Cross-Validation

**Requirement Traceability:** REQ-GUARD-066, REQ-GUARD-078, FM-35
**Prerequisites:** OQ-1 passed; policyToFilter() available
**Test Data:** ≥20 subject/resource combinations per supported policy kind; ≥100 random inputs for property test

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | For each supported policy kind, generate ≥20 subject/resource combinations | Test data generated | _________ | ___ / ___ |
| 2 | Run `evaluate()` and `policyToFilter()` for each combination | Both produce results | _________ | ___ / ___ |
| 3 | Verify every record matching the filter would also be allowed by `evaluate()` (filter ⊆ evaluate) | No false positives from filter | _________ | ___ / ___ |
| 4 | Test unsupported policy kinds (hasSignature, hasRelationship) | Produce `{ kind: "false" }` deny-all filter | _________ | ___ / ___ |
| 5 | Run round-trip property test with ≥100 random inputs | All inputs produce consistent results | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-48: WASM Evaluation Cross-Validation

**Requirement Traceability:** REQ-GUARD-066, REQ-GUARD-079, FM-36
**Prerequisites:** OQ-1 passed; WASM compilation toolchain available
**Test Data:** ≥5 policies covering all supported kinds; ≥200 subject/resource combinations per policy

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Compile representative policy set (≥5 policies) to WASM | WASM module generated | _________ | ___ / ___ |
| 2 | For each policy, run TypeScript `evaluate()` and WASM `evaluate()` with ≥200 inputs | Both produce results for all inputs | _________ | ___ / ___ |
| 3 | Verify identical allow/deny decisions for all inputs | Zero divergences | _________ | ___ / ___ |
| 4 | Verify WASM module carries source policy hash | Hash present and matches source | _________ | ___ / ___ |
| 5 | Introduce intentional divergence and verify publication blocked | Divergence blocks WASM module publication | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-49: Playground GxP Data Classification

**Requirement Traceability:** REQ-GUARD-080
**Prerequisites:** OQ-1 passed; policy playground SPA available
**Test Data:** Policy with `gxpMode: true`; policy without gxpMode

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Load policy with `gxpMode: true` in PlaygroundState | Policy loaded | _________ | ___ / ___ |
| 2 | Verify non-dismissible warning banner displayed with required text | Banner visible with GxP warning | _________ | ___ / ___ |
| 3 | Verify banner uses visually distinct styling | Styling differs from standard UI | _________ | ___ / ___ |
| 4 | Verify banner persists for duration of session | Banner remains after navigation | _________ | ___ / ___ |
| 5 | Load policy without gxpMode | Policy loaded | _________ | ___ / ___ |
| 6 | Verify banner is not displayed | No GxP warning banner | _________ | ___ / ___ |
| 7 | Verify Share URL includes gxpMode flag when GxP policy is loaded | gxpMode flag present in URL | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Adverse Condition Verification (OQ-50 through OQ-52)

These protocols verify system behavior under compound failure conditions where multiple components fail simultaneously, failures cascade across subsystems, or the system must recover from partial state corruption. These scenarios go beyond single-failure OQ items (OQ-9, OQ-13, OQ-14, OQ-19, OQ-36) by testing compound failure modes.

#### Protocol OQ-50: Simultaneous Multi-Component Failure

**Requirement Traceability:** REQ-GUARD-004, REQ-GUARD-006, REQ-GUARD-053, REQ-GUARD-055, REQ-GUARD-083, FM-15 (crash window), FM-18 (IdP unavailability)
**Prerequisites:** OQ-9, OQ-14, OQ-19 passed; guard graph configured with `gxp: true`, WAL enabled, circuit breaker enabled
**Test Data:** Valid policy with `allOf(hasPermission("read"), hasRole("operator"))` applied to a guarded port; test subject with correct permissions

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard graph with `gxp: true`, WAL enabled, circuit breaker enabled | Graph configured | _________ | ___ / ___ |
| 2 | Execute a successful evaluation to confirm baseline operation | Allow decision with audit entry persisted | _________ | ___ / ___ |
| 3 | Simulate IdP failure: configure SubjectProvider to return `Err(SubjectProviderError)` | Provider configured to fail | _________ | ___ / ___ |
| 4 | Simultaneously simulate audit backend failure: configure AuditTrailPort.record() to return `Err(AuditTrailWriteError)` | Backend configured to fail | _________ | ___ / ___ |
| 5 | Attempt guard evaluation with both failures active | `PolicyEvaluationError` returned (NOT silent pass); error includes diagnostic information identifying SubjectProvider failure | _________ | ___ / ___ |
| 6 | Verify WAL captured pending intent despite audit backend failure | WAL contains pending intent with evaluationId | _________ | ___ / ___ |
| 7 | Verify circuit breaker activated for audit backend | Circuit breaker state is OPEN; structured log entry records transition | _________ | ___ / ___ |
| 8 | Restore IdP (SubjectProvider returns valid subject) and audit backend (record() returns Ok) | Components restored | _________ | ___ / ___ |
| 9 | Wait for circuit breaker HALF-OPEN probe | Circuit breaker transitions to HALF-OPEN; probe succeeds; transitions to CLOSED | _________ | ___ / ___ |
| 10 | Execute WAL recovery scan | Orphaned intent from step 6 detected and flagged for remediation; health check alert emitted | _________ | ___ / ___ |
| 11 | Execute a new evaluation after recovery | Allow decision with audit entry persisted; no residual errors from previous failures | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-51: Cascading Failure Chain Verification

**Requirement Traceability:** REQ-GUARD-008, REQ-GUARD-010, REQ-GUARD-014, REQ-GUARD-015, REQ-GUARD-084, FM-09 (NTP drift), FM-10 (backward clock jump)
**Prerequisites:** OQ-17, OQ-21 passed; guard graph configured with `gxp: true`
**Test Data:** Valid policy and subject; simulated clock drift > 1 second

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard graph with `gxp: true` and ClockSource from a controllable test clock | Graph configured | _________ | ___ / ___ |
| 2 | Execute 5 evaluations with correctly synchronized clock | 5 allow decisions with sequential audit entries; hash chain valid | _________ | ___ / ___ |
| 3 | Inject clock drift: advance test clock by 2 seconds beyond NTP reference | Clock drift injected | _________ | ___ / ___ |
| 4 | Verify health check reports clock drift failure | `createGuardHealthCheck()` reports clockDriftOk: false; WARNING log includes NTP endpoint and measured drift | _________ | ___ / ___ |
| 5 | Execute 5 evaluations with drifted clock | 5 allow decisions with audit entries containing drifted timestamps; evaluations NOT blocked by clock drift (sequenceNumber remains authoritative) | _________ | ___ / ___ |
| 6 | Correct clock: restore test clock to NTP-synchronized time | Clock corrected | _________ | ___ / ___ |
| 7 | Run `verifyAuditChain()` across all 10 entries (5 pre-drift + 5 drifted) | Chain validates successfully — hash chain integrity is independent of timestamp accuracy; sequenceNumber ordering is authoritative per §62 | _________ | ___ / ___ |
| 8 | Verify completeness monitor detects no gaps | Completeness counter matches: 10 evaluations, 10 audit entries, 0 discrepancies | _________ | ___ / ___ |
| 9 | Verify health check reports clock drift resolved after correction | `createGuardHealthCheck()` reports clockDriftOk: true | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

#### Protocol OQ-52: Recovery from Partial State Corruption

**Requirement Traceability:** REQ-GUARD-006, REQ-GUARD-055, REQ-GUARD-085, FM-15 (crash window), FM-17 (buffer-flush)
**Prerequisites:** OQ-19 passed; guard graph configured with `gxp: true`, WAL enabled
**Test Data:** 10 WAL pending intents in mixed states (completed, orphaned, corrupted)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure guard graph with `gxp: true` and WAL enabled | Graph configured | _________ | ___ / ___ |
| 2 | Create 10 WAL pending intents in the following states: 5 completed (matching audit entries exist), 3 orphaned (no matching audit entries), 2 corrupted (truncated JSON in WAL store) | WAL store contains 10 entries in specified states | _________ | ___ / ___ |
| 3 | Run WAL recovery scan | Recovery scan completes without process crash | _________ | ___ / ___ |
| 4 | Verify 3 orphaned intents flagged for remediation | `getPendingIntents()` returns 3 orphaned evaluationIds; each flagged as "orphaned — no matching audit entry" | _________ | ___ / ___ |
| 5 | Verify 2 corrupted intents reported as unrecoverable | Structured error emitted for each corrupted intent including intent ID and corruption details (e.g., "JSON parse error at position N") | _________ | ___ / ___ |
| 6 | Verify 5 completed intents ignored by recovery scan | Completed intents not flagged; no false positives | _________ | ___ / ___ |
| 7 | Verify health check alert emitted for corrupted intents | Structured health check alert includes count of corrupted intents and their IDs | _________ | ___ / ___ |
| 8 | Execute a new evaluation after recovery scan | New evaluation succeeds with audit entry persisted; WAL captures new intent correctly; no interference from corrupted historical intents | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

## 89. PQ Protocols

### Protocol PQ-1: Evaluation Latency (p50)

**Requirement Traceability:** REQ-GUARD-039, URS-GUARD-009, NFR-PERF-001
**Prerequisites:** OQ passed; production-representative hardware
**Test Data:** 10,000 evaluations with allOf(hasPermission, hasRole) policy

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure benchmark with 10,000 evaluations | Benchmark configured | _________ | ___ / ___ |
| 2 | Execute benchmark | All evaluations complete | _________ | ___ / ___ |
| 3 | Calculate p50 latency | p50 < 1ms | _________ | ___ / ___ |
| 4 | Record measured p50 value | Value: _________ms | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-2: Evaluation Latency (p99)

**Requirement Traceability:** REQ-GUARD-039, URS-GUARD-009, NFR-PERF-002
**Prerequisites:** PQ-1 data available
**Test Data:** Same 10,000 evaluations from PQ-1

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Calculate p99 latency from PQ-1 data | p99 < 5ms | _________ | ___ / ___ |
| 2 | Calculate p99.9 latency from PQ-1 data | p99.9 < 15ms | _________ | ___ / ___ |
| 3 | Record measured values | p99: _________ms; p99.9: _________ms | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-3: Audit Write Throughput

**Requirement Traceability:** REQ-GUARD-005, URS-GUARD-002, NFR-PERF-003
**Prerequisites:** OQ passed; audit trail adapter configured
**Test Data:** Sequential record() calls with hash chain computation

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Execute sequential audit writes for 60 seconds | Writes complete | _________ | ___ / ___ |
| 2 | Calculate throughput (entries/sec) | >= 100 entries/sec | _________ | ___ / ___ |
| 3 | Record measured throughput | Value: _________ entries/sec | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-4: Concurrent Chain Integrity

**Requirement Traceability:** REQ-GUARD-010, URS-GUARD-005
**Prerequisites:** OQ-6 passed
**Test Data:** 10 concurrent scopes, 100 entries each; scopes SHOULD represent at least 3 distinct user personas (e.g., operator with read-only permissions, reviewer with read+approve permissions, administrator with full permissions) to validate concurrent access under realistic authorization diversity

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create 10 concurrent scopes with at least 3 distinct user personas (e.g., 4 operator, 3 reviewer, 3 administrator scopes) | Scopes created with diverse subjects | _________ | ___ / ___ |
| 2 | Write 100 entries to each scope concurrently (mix of allow and deny decisions across personas) | 1,000 total entries written | _________ | ___ / ___ |
| 3 | Run verifyAuditChain() on each scope independently | All 10 chains valid | _________ | ___ / ___ |
| 4 | Verify no cross-contamination between scope chains | Each chain self-contained | _________ | ___ / ___ |
| 5 | Verify subjectId diversity across scopes matches persona assignment | At least 3 distinct subjectIds in entries | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-5: Memory Stability

**Requirement Traceability:** REQ-GUARD-039, URS-GUARD-009
**Prerequisites:** OQ passed
**Test Data:** 10,000 evaluations

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Record baseline heap usage | Baseline: _________MB | _________ | ___ / ___ |
| 2 | Execute 10,000 evaluations | Evaluations complete | _________ | ___ / ___ |
| 3 | Force garbage collection | GC complete | _________ | ___ / ___ |
| 4 | Record post-GC heap usage | Post-GC: _________MB | _________ | ___ / ___ |
| 5 | Calculate heap delta percentage | Delta < 10% | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-6: Timestamp Monotonicity

**Requirement Traceability:** REQ-GUARD-014, URS-GUARD-004
**Prerequisites:** OQ-17 passed
**Test Data:** 1,000 sequential entries

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Create 1,000 sequential audit entries | Entries created | _________ | ___ / ___ |
| 2 | Extract timestamps from all entries | Timestamps collected | _________ | ___ / ___ |
| 3 | Verify each timestamp >= previous timestamp | Strict monotonic ordering | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-7: Sustained Throughput (Soak Test)

**Requirement Traceability:** REQ-GUARD-039, REQ-GUARD-042, URS-GUARD-009
**Prerequisites:** OQ passed; production-representative hardware and load
**Test Data:** Continuous evaluation at peak expected throughput; minimum 4-hour duration when gxp: true

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Record baseline memory and p99 latency | Baseline: heap=_________MB, p99=_________ms | _________ | ___ / ___ |
| 2 | Start soak test at peak throughput | Soak running | _________ | ___ / ___ |
| 3 | Monitor for the configured soak duration | Duration: _________hours | _________ | ___ / ___ |
| 4 | Verify no memory growth > 20% over baseline | Memory growth <= 20% | _________ | ___ / ___ |
| 5 | Verify all hash chains valid at end of soak | All chains valid | _________ | ___ / ___ |
| 6 | Verify no audit trail write failures | Zero write failures | _________ | ___ / ___ |
| 7 | Verify p99 latency does not degrade > 50% from PQ-2 baseline | p99 <= 1.5x baseline | _________ | ___ / ___ |
| 8 | Verify sequenceNumber strictly monotonic within each scope | Monotonic throughout soak | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-8: Audit Trail Query Latency

**Requirement Traceability:** REQ-GUARD-005, URS-GUARD-002
**Prerequisites:** OQ passed; 100,000 production-representative entries loaded
**Test Data:** 100,000 entries with production-representative distribution (see 09-validation-plan.md PQ-8 Data Characteristics)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Verify 100,000 entries loaded with production-representative distribution | Entries loaded; distribution documented | _________ | ___ / ___ |
| 2 | Query by subjectId + date range | Query completes | _________ | ___ / ___ |
| 3 | Verify query latency < 5 seconds | Latency: _________s | _________ | ___ / ___ |
| 4 | Verify filtered result set is correct | Results match expected entries | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-9: WAL Backlog Evaluation Latency

**Requirement Traceability:** REQ-GUARD-038, URS-GUARD-009
**Prerequisites:** OQ-19 passed
**Test Data:** 1,000 pending WAL intents; 1,000 new evaluations

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Populate WAL with 1,000 pending intents | Intents created | _________ | ___ / ___ |
| 2 | Execute 1,000 new evaluations | Evaluations complete | _________ | ___ / ___ |
| 3 | Measure p50 latency | p50 < 2ms | _________ | ___ / ___ |
| 4 | Measure p99 latency | p99 < 10ms | _________ | ___ / ___ |
| 5 | Verify no WAL-related errors during evaluation | Zero errors | _________ | ___ / ___ |
| 6 | Verify pending intent count does not affect evaluation correctness | All decisions correct | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

### Protocol PQ-10: Audit Write Latency (p99)

**Requirement Traceability:** REQ-GUARD-005, URS-GUARD-002, NFR-PERF-005
**Prerequisites:** OQ passed
**Test Data:** 10,000 sequential record() calls with hash chain computation

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Execute 10,000 sequential record() calls | All writes complete | _________ | ___ / ___ |
| 2 | Measure p99 latency | p99 < 50ms | _________ | ___ / ___ |
| 3 | Verify no single write exceeds 200ms | Max latency < 200ms | _________ | ___ / ___ |
| 4 | Record measured values | p99: _________ms; max: _________ms | _________ | ___ / ___ |

**Tester:** _________ Date: _________
**Reviewer:** _________ Date: _________

---

## Protocol Summary

| Phase | Protocol Range | Count | Description |
|-------|---------------|-------|-------------|
| IQ | IQ-1 through IQ-12 | 12 | Installation verification |
| OQ | OQ-1 through OQ-43 + OQ-19a | 44 | Operational verification (core) |
| OQ | OQ-44 through OQ-49 [v0.1.0] | 6 | Operational verification (ecosystem extensions) |
| OQ | OQ-50 through OQ-52 | 3 | Operational verification (adverse conditions) |
| PQ | PQ-1 through PQ-10 | 10 | Performance verification |
| **Total** | | **75** | (66 core + 6 ecosystem + 3 adverse) |

---

_Previous: [Decommissioning](./12-decommissioning.md)_

