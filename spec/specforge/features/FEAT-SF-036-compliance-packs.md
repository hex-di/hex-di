---
id: FEAT-SF-036
kind: feature
title: "Compliance Packs"
status: active
behaviors:
  [BEH-SF-416, BEH-SF-417, BEH-SF-418, BEH-SF-419, BEH-SF-420, BEH-SF-421, BEH-SF-422, BEH-SF-423]
adrs: [ADR-008]
roadmap_phases: [RM-13]
---

# Compliance Packs

## Problem

GxP is one regulatory domain (FEAT-SF-021), but organizations face diverse compliance requirements — SOC 2 for security, ISO 27001 for information security management, WCAG for accessibility, HIPAA for healthcare data. Each domain has distinct audit criteria, review checklists, and reporting templates.

## Solution

Compliance packs are marketplace-installable plugins (FEAT-SF-032) that layer domain-specific controls onto SpecForge's hook pipeline (FEAT-SF-011). Each pack provides: specialized reviewer agent prompts, compliance-specific finding types, audit checklist templates, regulatory report generation, and hook-based enforcement gates. Packs compose — a project can activate GxP + SOC 2 simultaneously. The pack SDK defines the contract for building new compliance domains.

## Constituent Behaviors

| ID         | Summary                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| BEH-SF-416 | Compliance pack contract and SDK                                           |
| BEH-SF-417 | SOC 2 compliance checks (access control, audit logging, change management) |
| BEH-SF-418 | ISO 27001 compliance checks (ISMS, risk assessment, controls)              |
| BEH-SF-419 | WCAG accessibility compliance checks                                       |
| BEH-SF-420 | Compliance-specific finding types and severity                             |
| BEH-SF-421 | Regulatory report template generation                                      |
| BEH-SF-422 | Multi-pack composition (activate multiple packs simultaneously)            |
| BEH-SF-423 | Compliance dashboard with per-pack status                                  |

## Acceptance Criteria

- [ ] Compliance packs install via marketplace or CLI
- [ ] Each pack adds domain-specific review prompts and finding types
- [ ] Multiple packs compose without conflict
- [ ] Regulatory reports generate in pack-specific formats
- [ ] Hook-based enforcement gates block non-compliant artifacts
- [ ] Compliance dashboard shows per-pack status and coverage
