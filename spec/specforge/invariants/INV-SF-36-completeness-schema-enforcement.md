---
id: INV-SF-36
kind: invariant
title: Completeness Schema Enforcement
status: active
enforced_by: [CompletenessPort.validate()]
behaviors: [BEH-SF-476, BEH-SF-479]
---

## INV-SF-36: Completeness Schema Enforcement

Every concept type (behavior, invariant, type, ADR, feature) has a completeness schema defining which fields and cross-references are required. `CompletenessPort.validate(conceptId)` checks a single concept against its schema; `CompletenessPort.validateAll()` checks every concept in the graph. Validation is deterministic — the same graph state always produces the same completeness report. Custom schemas loaded from `.specforge/completeness-schema.json` MUST themselves validate against the meta-schema before being applied. An invalid custom schema is rejected at load time, never silently applied.
