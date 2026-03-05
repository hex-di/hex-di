---
id: BEH-SF-416
kind: behavior
title: Compliance Packs
status: active
id_range: 416--423
invariants: [INV-SF-12, INV-SF-40]
adrs: [ADR-008]
types: [hooks, extensibility]
ports: [MarketplacePort, EventBusPort]
---

# 63 — Compliance Packs

**Feature:** [FEAT-SF-036](../features/FEAT-SF-036-compliance-packs.md)

---

## BEH-SF-416: Compliance Pack Contract and SDK — Standard Extension Interface

The compliance pack SDK defines the contract for building compliance domain plugins. Each pack registers hook handlers, finding types, review prompts, and report templates through a declarative manifest.

### Contract

REQUIREMENT (BEH-SF-416): A compliance pack MUST export a manifest object conforming to the `CompliancePackManifest` schema containing: `id` (unique string), `name`, `version` (semver), `domain` (e.g., "soc2", "iso27001", "wcag"), `hooks` (array of hook handler registrations), `findingTypes` (array of domain-specific finding type definitions), `reviewPrompts` (array of agent prompt templates), and `reportTemplates` (array of report format definitions). `MarketplacePort.registerPack(manifest)` MUST validate the manifest against the schema (INV-SF-40) and reject invalid manifests with `ManifestValidationError`. Valid packs MUST have their hooks registered in the pipeline (INV-SF-12).

### Verification

- Registration test: register a valid pack manifest; verify hooks are added to the pipeline.
- Invalid manifest test: submit a manifest missing required fields; verify `ManifestValidationError`.
- Schema test: verify the manifest schema enforces all required fields and correct types.

---

## BEH-SF-417: SOC 2 Compliance Checks — Access Control, Audit Logging, Change Management

The SOC 2 compliance pack provides automated checks for Trust Services Criteria: access control enforcement, audit logging completeness, change management procedures, and logical access monitoring.

### Contract

REQUIREMENT (BEH-SF-417): The SOC 2 compliance pack MUST register hook handlers that check: (1) access control — verify all endpoints require authentication and authorization; (2) audit logging — verify all data mutations generate audit log entries; (3) change management — verify all changes follow the defined change control process with approval records. Each check MUST produce findings of type `Soc2Finding` with fields: `criterion` (CC identifier, e.g., "CC6.1"), `status` ("pass", "fail", "warning"), `evidence` (description of what was checked), and `remediation` (suggested fix for failures).

### Verification

- Access control test: check an endpoint without auth; verify `fail` finding for CC6.1.
- Audit logging test: check a mutation without audit log; verify `fail` finding for CC7.2.
- Pass test: check a fully compliant component; verify `pass` findings for all criteria.

---

## BEH-SF-418: ISO 27001 Compliance Checks — ISMS, Risk Assessment, Controls

The ISO 27001 compliance pack checks information security management system controls: risk assessment documentation, control implementation evidence, and policy compliance.

### Contract

REQUIREMENT (BEH-SF-418): The ISO 27001 compliance pack MUST register hook handlers that check: (1) risk assessment — verify documented risk assessments exist for identified assets; (2) control mapping — verify Annex A controls are mapped to implementations; (3) policy compliance — verify security policies are documented and reviewed. Each check MUST produce findings of type `Iso27001Finding` with fields: `control` (Annex A reference, e.g., "A.8.1"), `status` ("pass", "fail", "warning"), `evidence`, and `remediation`.

### Verification

- Missing risk assessment test: check an asset without risk assessment; verify `fail` finding.
- Control mapping test: check unmapped Annex A controls; verify `warning` finding.
- Compliant test: check a fully documented system; verify `pass` findings.

---

## BEH-SF-419: WCAG Accessibility Compliance Checks — Automated A11y Verification

The WCAG compliance pack checks web accessibility guidelines: contrast ratios, ARIA labels, keyboard navigation, semantic HTML structure, and focus management.

### Contract

REQUIREMENT (BEH-SF-419): The WCAG compliance pack MUST register hook handlers that check: (1) contrast — verify text meets WCAG 2.1 AA contrast ratios (4.5:1 normal, 3:1 large text); (2) ARIA — verify interactive elements have accessible names; (3) keyboard — verify all interactive elements are keyboard-navigable; (4) semantics — verify heading hierarchy and landmark regions. Each check MUST produce findings of type `WcagFinding` with fields: `criterion` (WCAG reference, e.g., "1.4.3"), `level` ("A", "AA", "AAA"), `status`, `element` (affected element identifier), and `remediation`.

### Verification

- Contrast test: check text with insufficient contrast; verify `fail` finding for criterion 1.4.3.
- ARIA test: check a button without accessible name; verify `fail` finding for criterion 4.1.2.
- Compliant test: check an accessible component; verify `pass` findings.

---

## BEH-SF-420: Compliance Finding Types — Domain-Specific Severity Classification

Each compliance pack defines its own finding types with domain-specific severity levels. Findings are structured for aggregation across packs and for regulatory reporting.

### Contract

REQUIREMENT (BEH-SF-420): Each compliance pack MUST define finding types via `findingTypes` in its manifest. Each finding type MUST specify: `id` (unique within the pack), `name`, `severity` ("critical", "high", "medium", "low", "info"), `category` (domain-specific grouping), and `requiresRemediation` (boolean). Findings produced by hook handlers MUST conform to one of the pack's registered finding types. Unregistered finding types MUST be rejected with `UnknownFindingTypeError`. Finding severity MUST be sortable across packs using the standard severity scale.

### Verification

- Valid finding test: produce a finding matching a registered type; verify acceptance.
- Unknown type test: produce a finding with an unregistered type; verify `UnknownFindingTypeError`.
- Cross-pack sorting test: collect findings from two packs; verify they sort correctly by severity.

---

## BEH-SF-421: Regulatory Report Generation — Pack-Specific Report Templates

Each compliance pack includes report templates that generate regulatory-specific documents. Reports aggregate findings, evidence, and remediation recommendations into the format expected by auditors.

### Contract

REQUIREMENT (BEH-SF-421): Each compliance pack MUST include at least one report template in its manifest. `MarketplacePort.generateReport(packId, templateId, findings)` MUST produce a report document containing: executive summary, findings grouped by category, evidence references, remediation plan, and compliance status (compliant, partially compliant, non-compliant). Reports MUST be generated in the template-specified format (PDF, HTML, or Markdown). The report MUST include the generation timestamp, pack version, and scope of the assessment.

### Verification

- Report generation test: generate a SOC 2 report; verify all required sections are present.
- Format test: generate reports in HTML and Markdown; verify correct formatting.
- Metadata test: verify report includes timestamp, pack version, and assessment scope.

---

## BEH-SF-422: Multi-Pack Composition — Activate Multiple Packs Simultaneously

Projects can activate multiple compliance packs simultaneously. Packs compose without conflict — each pack's hooks run in the pipeline alongside others, and findings from all active packs are aggregated.

### Contract

REQUIREMENT (BEH-SF-422): `MarketplacePort.activatePacks(packIds)` MUST register hooks from all specified packs into the hook pipeline. Hook ordering MUST follow INV-SF-12 (Hook Pipeline Ordering) — hooks from different packs MUST NOT interfere with each other. When multiple packs produce findings for the same artifact, findings MUST be merged into a single findings collection with the `packId` field identifying the source pack. `MarketplacePort.getActivePackIds()` MUST return the list of currently active packs.

### Verification

- Composition test: activate SOC 2 and WCAG packs; run hooks; verify findings from both packs appear.
- Isolation test: verify hooks from one pack do not affect the execution of another pack's hooks.
- Listing test: activate 3 packs; call `getActivePackIds()`; verify all 3 are listed.

---

## BEH-SF-423: Compliance Dashboard — Per-Pack Status Overview

The compliance dashboard provides a unified view of compliance status across all active packs. Each pack shows its overall status, finding counts by severity, and trend over time.

### Contract

REQUIREMENT (BEH-SF-423): `MarketplacePort.getComplianceDashboard()` MUST return a dashboard object containing: `packs` (array of per-pack summaries), each with `packId`, `packName`, `status` ("compliant", "partially-compliant", "non-compliant"), `findingCounts` (object mapping severity to count), `lastRunTimestamp`, and `trend` ("improving", "stable", "degrading" based on last 5 runs). The dashboard MUST aggregate data from all active packs. A pack is `compliant` only if it has zero `critical` or `high` findings.

### Verification

- Dashboard test: activate packs with findings; call `getComplianceDashboard()`; verify per-pack summaries.
- Status logic test: add a critical finding; verify pack status changes to "non-compliant".
- Trend test: run 5 assessments with decreasing findings; verify trend is "improving".
