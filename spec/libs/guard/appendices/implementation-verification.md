# Appendix T: Implementation Verification Requirements

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-T                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix S: Consolidated Error Recovery Runbook](./error-recovery-runbook.md) | Next: [Appendix U: Cross-Enhancement Composition Examples](./composition-examples.md)_

---

This appendix specifies requirements for verifying that the guard library implementation faithfully conforms to this specification, bridging the gap between specification quality and implementation quality.

### Spec-to-Code Traceability

```
REQUIREMENT: Every REQUIREMENT block in this specification (identified by RFC 2119
             MUST/SHALL language) MUST have at least one corresponding test case in
             the OQ test suite. The mapping MUST be documented via test annotations
             that reference the spec section number.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.

REQUIREMENT: Test files MUST use @spec-ref annotations (in test descriptions or
             comments) to link each test to the specification section it verifies.
             Format: @spec-ref §<section-number> or @spec-ref REQ-GUARD-<NNN>.
             Example: it("hash chain covers 14 fields @spec-ref §61.4", ...)
```

### Implementation Conformance Checkpoints

```
REQUIREMENT: The following automated conformance checkpoints MUST pass in CI
             before any release of @hex-di/guard:

             Checkpoint 1 -- Type Conformance: All exported types match the
             TypeScript interfaces defined in this specification. Verified via
             pnpm typecheck and pnpm test:types.

             Checkpoint 2 -- Behavioral Conformance: All four conformance suites
             (AuditTrail: 17 tests, SignatureService: 15 tests, SubjectProvider:
             12 tests, AdminGuard: 14 tests) pass against all shipped adapters.

             Checkpoint 3 -- Coverage Gate: Branch coverage >= 95% for GxP-critical
             paths, line coverage >= 90% for all production code. Coverage
             regression below thresholds blocks merge.

             Checkpoint 4 -- Mutation Gate: Mutation kill rate meets the thresholds
             defined in 16-definition-of-done.md (100% core evaluation, >= 95%
             GxP-critical, >= 85% non-critical).

             Checkpoint 5 -- Spec Completeness: Every DoD item in
             16-definition-of-done.md has at least one test file with a matching
             @spec-ref annotation. Verified by a CI script that cross-references
             DoD items against test annotations.

             Checkpoint 6 -- Error Code Completeness: All 30 error codes
             (ACL001-ACL030) have corresponding error class exports, test
             coverage, and documentation in Appendix F.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(a).
```

### Continuous Conformance Monitoring

```
REQUIREMENT: The CI pipeline MUST include a "spec-conformance" stage that runs
             after unit tests and before integration tests. This stage MUST:
             (1) Verify all conformance suites pass
             (2) Verify coverage thresholds are met
             (3) Verify all @spec-ref annotations resolve to valid spec sections
             (4) Generate a conformance report artifact with timestamp and commit SHA
             A failed spec-conformance stage MUST block the release pipeline.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.

RECOMMENDED: Organizations deploying @hex-di/guard in GxP environments SHOULD
             run the full IQ/OQ/PQ qualification (via @hex-di/guard-validation)
             as part of their release acceptance process, in addition to the
             automated CI conformance checks. The qualification report SHOULD
             be retained as validation evidence alongside the release artifacts.
```

### Specification Drift Detection

```
REQUIREMENT: When specification files in spec/guard/ are modified, the CI pipeline
             MUST flag all test files that reference the modified sections (via
             @spec-ref annotations) for mandatory re-review. This ensures that
             spec changes are accompanied by corresponding test updates.
             Reference: EU GMP Annex 11 §10 (change management).

REQUIREMENT: Maintain a machine-readable spec-section index
             (spec/guard/section-index.json) mapping section numbers to file
             paths and line ranges. This enables automated cross-referencing
             between specification sections and test annotations. The index
             MUST be validated in CI to detect stale entries when spec files
             are renamed, deleted, or have sections renumbered.
             Reference: GAMP 5 Category 5, EU GMP Annex 11 §4.7.
```

### Revision Management

```
REQUIREMENT: The specification document set MUST include a revision management
             script (scripts/spec-revision.ts or equivalent) that automates:
             (1) Revision number incrementing (MAJOR.MINOR) for modified files.
             (2) Effective Date update to the current date.
             (3) Change History entry appending (preserving prior entries).
             (4) Cross-file revision consistency validation: when a file is modified,
                 all files that reference it (via section cross-references) MUST be
                 flagged for review and potential revision bump.
             The script MUST be run as part of the specification change workflow
             and its output committed alongside the spec changes.
             Reference: EU GMP Annex 11 §10 (change management), 21 CFR 11.10(e).

REQUIREMENT: The CI pipeline MUST include a "spec-revision-check" stage that
             validates document control header consistency:
             (1) Every spec file has a valid document control header.
             (2) Document IDs follow the GUARD-NN convention.
             (3) Revision numbers are valid MAJOR.MINOR format.
             (4) Effective Dates are valid ISO 8601 dates.
             (5) Classifications match the Document Classification Taxonomy
                 defined in README.md.
             (6) Approved By fields reference valid role titles from the
                 Approval Authority Matrix in README.md.
             (7) No file has been modified (per git diff) without a corresponding
                 revision increment and Change History entry.
             A failed spec-revision-check MUST block merge to the main branch.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).

REQUIREMENT: The Change History field in each document control header MUST be
             append-only. Previous entries MUST NOT be modified or removed.
             Each entry MUST include: revision number, date (ISO 8601), and a
             brief summary of changes. Example:
             "1.0 (2026-02-13): Initial controlled release;
              1.1 (2026-03-01): Added constant-time evaluation REQUIREMENT (GCR-2026-001)"
             Reference: 21 CFR 11.10(e) (audit trail for record changes).
```

---

_Previous: [Appendix S: Consolidated Error Recovery Runbook](./error-recovery-runbook.md) | Next: [Appendix U: Cross-Enhancement Composition Examples](./composition-examples.md)_
