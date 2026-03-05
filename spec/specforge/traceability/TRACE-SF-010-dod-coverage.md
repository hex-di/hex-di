---
id: TRACE-SF-010
title: "DoD Traceability"
kind: traceability
status: active
scope: dod
---

## DoD Traceability

Mapping from definition-of-done items (defined in [process/definitions-of-done.md](../process/definitions-of-done.md)) to the spec sections they govern and their verification approach.

| DoD Item                          | Spec Section                                                                                                                                                               | Verification Approach                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Behavior file completeness        | [behaviors/\*](../behaviors/)                                                                                                                                              | Automated ID scan: verify every BEH-SF-NNN in allocation range is defined, no duplicates exist |
| Architecture diagram completeness | [architecture/\*](../architecture/)                                                                                                                                        | Visual review + cross-level consistency check (C1/C2/C3 element propagation)                   |
| Type file completeness            | [types/\*](../types/)                                                                                                                                                      | Readonly field audit + `_tag` discriminant audit on all error types                            |
| UI view completeness              | [behaviors/BEH-SF-133-web-dashboard.md](../behaviors/BEH-SF-133-web-dashboard.md), [behaviors/BEH-SF-139-vscode-extension.md](../behaviors/BEH-SF-139-vscode-extension.md) | Behavioral spec review for dashboard views and VS Code panels                                  |
| Governance file completeness      | [traceability/index.md](./index.md), [risk-assessment/index.md](../risk-assessment/index.md), [roadmap/index.md](../roadmap/index.md)                                      | Link validation: all referenced IDs resolve to existing source files                           |

---

## Coverage Targets

Traceability coverage metrics required for specification completeness, following ICH Q9 risk-based approach and GAMP 5 Category 5 testing requirements.

| Coverage Metric         | Target | Description                                                            |
| ----------------------- | ------ | ---------------------------------------------------------------------- |
| BEH-SF -> INV-SF        | 100%   | Every invariant is traced to at least one behavior                     |
| BEH-SF -> ADR           | 100%   | Every ADR is traced to at least one behavior                           |
| BEH-SF -> Type          | 100%   | Every behavior file is linked to at least one type file                |
| FM-SF -> BEH-SF         | 100%   | Every failure mode is linked to at least one behavior                  |
| Architecture -> BEH-SF  | 100%   | Every architecture file is linked to at least one behavior range       |
| Capability -> Spec File | 100%   | Every capability maps to a specification file with assessed risk level |
