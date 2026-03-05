---
id: FEAT-SF-038
kind: feature
title: "Spec Validation"
status: active
behaviors:
  [BEH-SF-586, BEH-SF-587, BEH-SF-588, BEH-SF-589, BEH-SF-590, BEH-SF-591, BEH-SF-592, BEH-SF-593]
adrs: [ADR-026]
roadmap_phases: [RM-01]
---

# Spec Validation

## Problem

Specification documents accumulate structural inconsistencies over time: orphaned cross-references, missing frontmatter fields, unregistered files, and broken traceability chains. Without automated validation, these issues are only discovered during manual reviews or when downstream tools fail.

## Solution

A structural validation engine scans the entire spec directory and enforces 62 rules (VAL-001 through VAL-062) covering ID integrity, frontmatter schema compliance, forward reference resolution, reverse coverage, index completeness, overview completeness, link integrity, content structure, traceability matrix correctness, and semantic consistency. Validation runs in CI to gate spec changes and locally via `validate-all.sh` for interactive feedback.

## Constituent Behaviors

| ID         | Summary                                                  |
| ---------- | -------------------------------------------------------- |
| BEH-SF-586 | Spec validation rule catalog and severity classification |
| BEH-SF-587 | ID integrity validation (uniqueness, format, range)      |
| BEH-SF-588 | Frontmatter schema validation                            |
| BEH-SF-589 | Forward reference resolution                             |
| BEH-SF-590 | Reverse coverage analysis                                |
| BEH-SF-591 | Index completeness checking                              |
| BEH-SF-592 | Content structure validation                             |
| BEH-SF-593 | Semantic consistency analysis                            |

## Acceptance Criteria

- [ ] All 62 validation rules are implemented and categorized by severity (error, warning, info)
- [ ] Validation produces machine-readable output with file, line, rule ID, and message
- [ ] CI pipeline fails on any error-severity finding
- [ ] `validate-all.sh` completes in under 30 seconds for a 100-file spec
