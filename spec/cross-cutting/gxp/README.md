# Cross-Cutting GxP Compliance Framework

This directory contains the shared GxP regulatory framework used by all `@hex-di` packages that support regulated environments. It consolidates generic methodology, templates, and regulatory reference material that would otherwise be duplicated across per-package compliance specifications.

## Scope

The cross-cutting spec contains **generic methodology and frameworks**. It does NOT contain package-specific requirement IDs, failure modes, test protocols, or ALCOA+ mappings for specific library features. Those remain in each package's `compliance/gxp.md`.

## Contents

| File | Description |
|------|-------------|
| [01-regulatory-framework.md](./01-regulatory-framework.md) | Regulatory context: applicable regulations, normative language, system classification |
| [02-gamp5-classification.md](./02-gamp5-classification.md) | GAMP 5 software categorization guidance and validation burden by category |
| [03-alcoa-mapping.md](./03-alcoa-mapping.md) | ALCOA+ data integrity principles: definitions, audit evidence patterns, gap analysis guidance |
| [04-personnel-qualification.md](./04-personnel-qualification.md) | Role definitions, training requirements, re-training frequency, competency assessment |
| [05-fmea-methodology.md](./05-fmea-methodology.md) | FMEA risk assessment methodology: RPN framework, severity/occurrence/detection scales |
| [06-validation-protocol-template.md](./06-validation-protocol-template.md) | IQ/OQ/PQ/DQ protocol templates, execution guidance, deviation handling |
| [07-traceability-matrix-template.md](./07-traceability-matrix-template.md) | RTM framework: structure, bidirectional traceability, completeness validation |
| [08-change-control.md](./08-change-control.md) | Change control procedures, version management, re-qualification triggers, emergency change control |
| [09-data-retention.md](./09-data-retention.md) | Retention periods by domain, archival strategy, format versioning, readability verification |
| [10-supplier-assessment.md](./10-supplier-assessment.md) | Supplier quality documentation template, SQA framework, audit support |
| [11-decommissioning.md](./11-decommissioning.md) | System decommissioning procedures, data export, archive verification, key disposition |
| [12-compliance-checklist-template.md](./12-compliance-checklist-template.md) | Pre-deployment compliance verification checklist template |
| [13-glossary.md](./13-glossary.md) | Technical and regulatory term definitions for non-technical reviewers |

## Usage

Per-package `compliance/gxp.md` files reference this cross-cutting framework for shared methodology and provide package-specific details (requirement IDs, ALCOA+ mappings, FMEA failure modes, test protocols).

## Applicable Regulations

- FDA 21 CFR Part 11 (Electronic Records; Electronic Signatures)
- EU GMP Annex 11 (Computerised Systems)
- GAMP 5 (Good Automated Manufacturing Practice)
- ICH Q9 (Quality Risk Management)
- ICH Q7 (GMP for Active Pharmaceutical Ingredients)
- PIC/S PI 011-3 (GMP Guide)
- WHO TRS 996 Annex 5
- MHRA Data Integrity Guidance (2018)
