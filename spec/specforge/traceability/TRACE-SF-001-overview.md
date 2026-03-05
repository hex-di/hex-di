---
id: TRACE-SF-001
kind: traceability
title: Traceability Matrix
status: active
scope: dod
---

# Traceability Matrix

Requirement-to-artifact traceability for the SpecForge specification.

---

---

## Traceability Overview

The traceability chain links every requirement to its originating specification artifact, its test coverage, its invariant enforcement, its risk mitigation, and its definition-of-done verification.

```
Requirement (BEH-SF) --> Source Module --> Test File --> Invariant (INV-SF) --> FMEA (FM-SF) --> DoD Item
```

Each node in the chain is independently verifiable:

- **BEH-SF** identifiers are allocated per behavior file (see allocation ranges below).
- **Source modules** map behaviors to architecture and type definitions.
- **Test files** verify behavioral contracts at unit and integration level.
- **INV-SF** invariants constrain system-wide properties enforced across behaviors.
- **FM-SF** failure modes link risks to the behaviors they threaten and the mitigations applied.
- **DoD items** define the completeness criteria for each artifact category.

---

## Requirement Identification Convention

All requirement identifiers follow the format defined in [process/requirement-id-scheme.md](../process/requirement-id-scheme.md). That document specifies the `BEH-SF-NNN`, `INV-SF-N`, `ADR-NNN`, and `FM-SF-NNN` formats, their allocation ranges, and the cross-reference rules that govern traceability integrity.
